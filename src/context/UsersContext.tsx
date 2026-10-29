import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useAuth, hasActiveSessionToken } from "@/lib/auth";
import { withQueryTimeout } from "@/lib/supabaseQuery";
import { STORAGE_KEYS } from "@/utils/localStore";
import {
  getStoredUsers,
  getLocalSalesOfficers,
  fetchManagedUsers,
  buildUserLookupMap,
  type ManagedUser,
  type UserLookupInfo,
} from "@/services/userService";

export interface UsersContextValue {
  usersMap: Record<string, UserLookupInfo>;
  users: ManagedUser[];
  salesOfficers: ManagedUser[];
  loading: boolean;
  getUserName: (userId: string | null | undefined, defaultFallback?: string) => string;
  getUser: (userId: string | null | undefined) => UserLookupInfo | undefined;
  getSalesOfficerById: (userId: string | null | undefined) => ManagedUser | undefined;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

export function UsersProvider({ children }: { children: ReactNode }) {
  const { profile, session, sessionVerified, verifySession } = useAuth();
  const userId = session?.user?.id ?? null;

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const verifySessionRef = useRef(verifySession);
  verifySessionRef.current = verifySession;

  // 1. Initial State: Synchronous resolution for zero-lag UI render across page reloads
  const [usersMap, setUsersMap] = useState<Record<string, UserLookupInfo>>(() => buildUserLookupMap(profile));
  const [users, setUsers] = useState<ManagedUser[]>(() => getStoredUsers());
  const [salesOfficers, setSalesOfficers] = useState<ManagedUser[]>(() => getLocalSalesOfficers());
  const [loading, setLoading] = useState(false);
  const isRefreshingRef = useRef(false);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  // Sync usersMap with profile when authentication state becomes available
  useEffect(() => {
    if (profile?.id) {
      setUsersMap((prev) => {
        if (
          prev[profile.id]?.full_name === profile.full_name &&
          prev[profile.id]?.role_name === profile.role_name
        ) {
          return prev;
        }
        return {
          ...prev,
          [profile.id]: {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role_name: profile.role_name,
          },
        };
      });
    }
  }, [profile?.id, profile?.full_name, profile?.email, profile?.role_name]);

  // Master fetch function with stable identity (uses refs to avoid effect re-trigger loops)
  const refreshUsers = useCallback(async () => {
    const currentSess = sessionRef.current;
    if (!currentSess || isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const verified = hasActiveSessionToken(currentSess)
        ? currentSess
        : await verifySessionRef.current(false);
      if (!verified) {
        setUsers(getStoredUsers());
        setSalesOfficers(getLocalSalesOfficers());
        return;
      }

      setLoading(true);
      const reconciledUsers = await withQueryTimeout(fetchManagedUsers(), 8500, "Users directory sync");

      const nextMap: Record<string, UserLookupInfo> = { ...buildUserLookupMap(profileRef.current) };

      if (Array.isArray(reconciledUsers) && reconciledUsers.length > 0) {
        reconciledUsers.forEach((u) => {
          if (u.id) {
            nextMap[String(u.id)] = {
              id: String(u.id),
              full_name: u.full_name || "",
              email: u.email,
              role_name: u.role_name,
            };
          }
        });
        setUsers(reconciledUsers);

        const derivedOfficers = reconciledUsers.filter((u) => {
          const rawRole = (u.role_name || u.role || "").toLowerCase().replace(/[\s_-]+/g, "");
          return (
            (u.is_active ?? true) &&
            (rawRole === "salesofficer" ||
              rawRole === "salesrep" ||
              rawRole.includes("officer") ||
              rawRole.includes("rep") ||
              (!rawRole.includes("admin") && rawRole !== "accountant"))
          );
        });
        setSalesOfficers(derivedOfficers.length > 0 ? derivedOfficers : getLocalSalesOfficers());
      } else {
        setUsers(getStoredUsers());
        setSalesOfficers(getLocalSalesOfficers());
      }

      setUsersMap(nextMap);
    } catch (err) {
      console.warn("Notice syncing users directory:", err);
      setUsers(getStoredUsers());
      setSalesOfficers(getLocalSalesOfficers());
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Initial fetch on mount: strictly once per verified authenticated userId
  useEffect(() => {
    if (!userId) {
      lastSyncedUserIdRef.current = null;
      return;
    }
    if (!sessionVerified || lastSyncedUserIdRef.current === userId) return;
    lastSyncedUserIdRef.current = userId;
    void refreshUsers();
  }, [userId, sessionVerified, refreshUsers]);

  // Debounced synchronization strictly for user-store updates (ignores unrelated order/product cache writes)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const refreshedMap = buildUserLookupMap(profileRef.current);
        setUsersMap((prev) => ({ ...prev, ...refreshedMap }));
        setUsers(getStoredUsers());
        setSalesOfficers(getLocalSalesOfficers());
      }, 250);
    };

    const handleCustomUpdate = (e: Event) => {
      const detailKey = (e as CustomEvent)?.detail?.key;
      if (detailKey && detailKey !== STORAGE_KEYS.USERS && detailKey !== STORAGE_KEYS.DELETED_USERS) {
        return;
      }
      scheduleRefresh();
    };

    const handleCrossTabStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEYS.USERS && e.key !== STORAGE_KEYS.DELETED_USERS) {
        return;
      }
      scheduleRefresh();
    };

    window.addEventListener("storage", handleCrossTabStorage);
    window.addEventListener("sales_erp_storage_update", handleCustomUpdate);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("storage", handleCrossTabStorage);
      window.removeEventListener("sales_erp_storage_update", handleCustomUpdate);
    };
  }, []);

  // Dynamic Sales Officer lookup by ID
  const getSalesOfficerById = useCallback(
    (userId: string | null | undefined): ManagedUser | undefined => {
      if (!userId || typeof userId !== "string") return undefined;
      const cleanId = userId.trim();
      const inUsers = users.find((u) => String(u.id).trim() === cleanId);
      if (inUsers) return inUsers;
      const inOfficers = salesOfficers.find((so) => String(so.id).trim() === cleanId);
      if (inOfficers) return inOfficers;
      const mapped = usersMap[cleanId];
      if (mapped) {
        return {
          id: mapped.id,
          email: mapped.email || "",
          full_name: mapped.full_name || "",
          role: (mapped.role_name || "").toLowerCase().includes("admin") ? "super_admin" : "sales_officer",
          role_name: mapped.role_name || "Sales Officer",
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }
      return undefined;
    },
    [users, salesOfficers, usersMap]
  );

  // Universal dynamic user name resolver
  const getUserName = useCallback(
    (userId: string | null | undefined, defaultFallback?: string): string => {
      const cleanFallback =
        defaultFallback && defaultFallback.trim() && defaultFallback !== "Unknown Officer"
          ? defaultFallback.trim()
          : "Sales Officer";

      if (!userId || typeof userId !== "string") {
        return cleanFallback;
      }

      const cleanId = userId.trim();

      // 1. Direct lookup from stored/active users (guarantees latest edited name)
      const officer = getSalesOfficerById(cleanId);
      if (officer?.full_name && officer.full_name.trim() && officer.full_name !== "Unknown Officer") {
        return officer.full_name.trim();
      }

      // 2. Lookup map
      const mapped = usersMap[cleanId];
      if (mapped?.full_name && mapped.full_name.trim() && mapped.full_name !== "Unknown Officer") {
        return mapped.full_name.trim();
      }

      // 3. Current authenticated user profile
      if (profile?.id && String(profile.id).trim() === cleanId && profile.full_name) {
        return profile.full_name.trim();
      }

      if (mapped?.email && mapped.email.trim()) {
        return mapped.email.trim();
      }

      return cleanFallback;
    },
    [getSalesOfficerById, usersMap, profile]
  );

  const getUser = useCallback(
    (userId: string | null | undefined): UserLookupInfo | undefined => {
      if (!userId || typeof userId !== "string") return undefined;
      return usersMap[userId.trim()];
    },
    [usersMap]
  );

  const value = useMemo(
    () => ({
      usersMap,
      users,
      salesOfficers,
      loading,
      getUserName,
      getUser,
      getSalesOfficerById,
      refreshUsers,
    }),
    [usersMap, users, salesOfficers, loading, getUserName, getUser, getSalesOfficerById, refreshUsers]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers(): UsersContextValue {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
}

export const useUsersMap = useUsers;

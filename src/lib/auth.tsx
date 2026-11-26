import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_AUTH_STORAGE_KEY,
  capacitorAuthStorage,
  syncCachedAccessToken,
  type UserProfile,
  type Role,
} from "./supabase";
import { withQueryTimeout, classifySupabaseError, type ClassifiedSupabaseError } from "./supabaseQuery";
import {
  getStoredUsers,
  saveStoredUsers,
  DEMO_USER_IDS,
} from "@/services/userService";

/**
 * Authoritative Super Admin account email registered in public.users (EMP-001).
 * Strict exact-match check replaces insecure substring matching (e.g. `.includes("admin")` / `.includes("sabur")`).
 */
export const PRIMARY_SUPER_ADMIN_EMAIL = "mdrabiulislam.sabur.9@gmail.com";

export function normalizeEmail(email?: string | null): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isPrimarySuperAdminEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && normalized === PRIMARY_SUPER_ADMIN_EMAIL);
}

export function normalizeRoleName(rawRole?: string | null, email?: string | null): Role {
  const compact = String(rawRole || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (compact === "superadmin" || compact === "admin") return "Super Admin";
  if (compact === "salesmanager" || compact === "manager") return "Sales Manager";
  if (compact === "accountant") return "Accountant";
  if (compact === "distributor") return "Distributor";
  if (compact === "salesofficer" || compact === "salesrep" || compact === "so" || compact.includes("officer")) {
    return "Sales Officer";
  }
  if (isPrimarySuperAdminEmail(email)) return "Super Admin";
  return "Sales Officer";
}

/**
 * Strictly validates that a UserProfile belongs to the active authenticated Supabase Auth user
 * by verifying both UID equality and (when present) exact lowercase email equality.
 */
export function doesProfileMatchAuthUser(
  profile: UserProfile | null | undefined,
  authUser: User | null | undefined,
): profile is UserProfile {
  if (!profile || !authUser || !profile.id || !authUser.id) return false;
  if (String(profile.id).trim() !== String(authUser.id).trim()) return false;
  const authEmail = normalizeEmail(authUser.email);
  const profileEmail = normalizeEmail(profile.email);
  if (authEmail && profileEmail && authEmail !== profileEmail) {
    return false;
  }
  return true;
}

/**
 * Normalizes a raw `public.users` database row (handling snake_case and camelCase keys)
 * and binds it strictly to the authenticated Supabase user UID & email.
 */
export function normalizeDbUserProfile(rawRow: Record<string, any> | null | undefined, authUser: User): UserProfile | null {
  if (!rawRow || typeof rawRow !== "object") return null;
  const authUid = String(authUser.id || "").trim();
  const authEmail = normalizeEmail(authUser.email);
  const rowId = String(rawRow.id || "").trim();
  const rowEmail = normalizeEmail(rawRow.email);

  // Strict cross-validation: reject any record whose email contradicts the authenticated session email
  if (authEmail && rowEmail && rowEmail !== authEmail) {
    console.warn("[Auth] Rejected mismatched user profile row:", { authUid, authEmail, rowId, rowEmail });
    return null;
  }
  // If no email match and ID does not match authenticated UID, reject
  if (rowId !== authUid && (!authEmail || rowEmail !== authEmail)) {
    return null;
  }

  const resolvedEmail = authEmail || rowEmail;
  const rawName = String(rawRow.full_name ?? rawRow.fullName ?? rawRow.name ?? "").trim();
  const resolvedRole = normalizeRoleName(
    rawRow.role_name ?? rawRow.roleName ?? rawRow.role,
    resolvedEmail,
  );
  const resolvedName =
    rawName ||
    (resolvedRole === "Super Admin" ? "Super Admin" : resolvedEmail ? resolvedEmail.split("@")[0] : "User");

  return {
    id: authUid,
    email: resolvedEmail,
    full_name: resolvedName,
    phone: rawRow.phone ?? authUser.phone ?? null,
    role_name: resolvedRole,
    territory_id: rawRow.territory_id ?? rawRow.territoryId ?? null,
    is_active: (rawRow.is_active ?? rawRow.isActive) !== false,
    created_at: rawRow.created_at ?? rawRow.createdAt ?? authUser.created_at ?? new Date().toISOString(),
    updated_at: rawRow.updated_at ?? rawRow.updatedAt,
    employee_code: rawRow.employee_code ?? rawRow.employeeCode ?? rawRow.employee_id ?? rawRow.employeeId ?? null,
    employee_id: rawRow.employee_id ?? rawRow.employeeId ?? rawRow.employee_code ?? rawRow.employeeCode ?? null,
  };
}

export interface VerifiedRoleInfo {
  roleName: Role;
  normalizedRole: string;
  isSuperAdmin: boolean;
  isSalesOfficer: boolean;
}

/**
 * Centralized, strict RBAC resolver used across App, Sidebar, and protected pages.
 * Trusts ONLY a profile strictly matched to the authenticated Supabase user,
 * server-controlled `app_metadata.role`, or the exact registered Super Admin email.
 */
export function resolveVerifiedRole(
  profile: UserProfile | null | undefined,
  authUser: User | null | undefined,
): VerifiedRoleInfo {
  const verifiedProfile = doesProfileMatchAuthUser(profile, authUser) ? profile : null;
  const authEmail = normalizeEmail(authUser?.email);
  const appMetaRole = String((authUser as any)?.app_metadata?.role || "").trim();
  const userMetaRole = String(
    (authUser as any)?.user_metadata?.role_name || (authUser as any)?.user_metadata?.role || "",
  ).trim();

  let roleName: Role;
  if (verifiedProfile?.role_name) {
    roleName = normalizeRoleName(verifiedProfile.role_name, authEmail);
  } else if (isPrimarySuperAdminEmail(authEmail)) {
    roleName = "Super Admin";
  } else if (appMetaRole) {
    roleName = normalizeRoleName(appMetaRole, authEmail);
  } else if (userMetaRole && !userMetaRole.toLowerCase().includes("admin")) {
    // Non-privileged role hint only; never grant Super Admin solely from user-mutable metadata
    roleName = normalizeRoleName(userMetaRole, authEmail);
  } else {
    roleName = "Sales Officer";
  }

  const normalizedRole = roleName.toLowerCase().replace(/[\s_-]+/g, "");
  const isSuperAdmin = normalizedRole === "superadmin";
  const isSalesOfficer = !isSuperAdmin && (normalizedRole === "salesofficer" || normalizedRole.includes("officer"));

  return {
    roleName,
    normalizedRole,
    isSuperAdmin,
    isSalesOfficer,
  };
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionVerified: boolean;
  authError: string | null;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>;
  signInAsDemo?: (email: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  verifySession: (forceRefresh?: boolean) => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Valid unique UUIDs synchronized from userService
export { DEMO_USER_IDS };

const TOKEN_EXPIRY_BUFFER_MS = 30_000;
const SERVER_USER_VERIFY_TTL_MS = 5 * 60 * 1000; // Re-verify active JWT via auth.getUser() at least every 5 minutes

let lastServerVerifiedToken: string | null = null;
let lastServerVerifiedUser: User | null = null;
let lastServerVerifiedAtMs = 0;

function clearServerUserVerificationCache(): void {
  lastServerVerifiedToken = null;
  lastServerVerifiedUser = null;
  lastServerVerifiedAtMs = 0;
}

/**
 * Checks whether a Supabase session has a non-empty access token that has not expired
 * and belongs to the currently configured Supabase project URL.
 */
export function hasActiveSessionToken(sess: Session | null | undefined): sess is Session {
  if (!sess || !sess.access_token || !sess.user?.id) return false;
  if (typeof sess.expires_at === "number" && sess.expires_at * 1000 <= Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
    return false;
  }
  try {
    const parts = sess.access_token.split(".");
    if (parts.length === 3) {
      let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const payload = JSON.parse(atob(b64));
      if (typeof payload.iss === "string" && SUPABASE_URL) {
        const activeHost = new URL(SUPABASE_URL).hostname;
        if (payload.iss.includes(".supabase.co") && !payload.iss.includes(activeHost)) {
          return false;
        }
      }
      if (typeof payload.sub === "string" && payload.sub && payload.sub !== sess.user.id) {
        return false;
      }
    }
  } catch {
    // Ignore non-JWT or environment without atob
  }
  return true;
}

export interface EnsureSessionResult {
  session: Session | null;
  offline: boolean;
  error: ClassifiedSupabaseError | null;
}

let sharedSessionCheckInFlight: Promise<EnsureSessionResult> | null = null;

/**
 * Verifies the active session against Supabase Auth server (`supabase.auth.getUser()`),
 * returning the live server-validated User or classifying auth/offline failures cleanly.
 */
async function verifyActiveUserWithServer(
  sess: Session,
  forceServerCheck = false,
): Promise<{ user: User | null; authInvalid: boolean; transientError: ClassifiedSupabaseError | null }> {
  const now = Date.now();
  if (
    !forceServerCheck &&
    lastServerVerifiedToken === sess.access_token &&
    lastServerVerifiedUser &&
    lastServerVerifiedUser.id === sess.user?.id &&
    now - lastServerVerifiedAtMs < SERVER_USER_VERIFY_TTL_MS
  ) {
    return { user: lastServerVerifiedUser, authInvalid: false, transientError: null };
  }

  try {
    const { data, error } = await withQueryTimeout(
      supabase.auth.getUser(sess.access_token),
      7000,
      "Auth user verification",
    );

    if (error) {
      const classified = classifySupabaseError(error);
      if (classified.kind === "auth") {
        clearServerUserVerificationCache();
        return { user: null, authInvalid: true, transientError: classified };
      }
      return { user: sess.user ?? null, authInvalid: false, transientError: classified };
    }

    if (!data?.user?.id) {
      clearServerUserVerificationCache();
      return { user: null, authInvalid: true, transientError: null };
    }

    lastServerVerifiedToken = sess.access_token;
    lastServerVerifiedUser = data.user;
    lastServerVerifiedAtMs = Date.now();
    return { user: data.user, authInvalid: false, transientError: null };
  } catch (err) {
    const classified = classifySupabaseError(err);
    return {
      user: sess.user ?? null,
      authInvalid: classified.kind === "auth",
      transientError: classified,
    };
  }
}

/**
 * Standalone, single-flight session verifier & token refresher shared across `cloudSync`,
 * `offlineSync`, `ReportsPage`, `AppLayout`, and `AuthProvider`.
 * - Validates persisted sessions strictly against `supabase.auth.getUser()` when online.
 * - Automatically rotates expired 1-hour JWTs via `supabase.auth.refreshSession()`.
 * - Purges invalid/revoked local auth tokens instead of allowing mismatched cached sessions.
 * - Preserves persisted credentials gracefully while the device is offline.
 */
export async function ensureValidSession(forceRefresh = false): Promise<EnsureSessionResult> {
  if (!forceRefresh && sharedSessionCheckInFlight) {
    return sharedSessionCheckInFlight;
  }

  const run = async (): Promise<EnsureSessionResult> => {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

    try {
      const { data, error } = await withQueryTimeout(
        supabase.auth.getSession(),
        6000,
        "Auth session check",
      );

      if (error) {
        const classified = classifySupabaseError(error);
        return {
          session: null,
          offline: isOffline || classified.kind === "offline",
          error: classified,
        };
      }

      const currentSess = data?.session ?? null;
      if (!currentSess) {
        syncCachedAccessToken(null);
        clearServerUserVerificationCache();
        return { session: null, offline: isOffline, error: null };
      }

      if (!forceRefresh && hasActiveSessionToken(currentSess)) {
        syncCachedAccessToken(currentSess.access_token, currentSess.expires_at);

        if (isOffline) {
          return { session: currentSess, offline: true, error: null };
        }

        const userCheck = await verifyActiveUserWithServer(currentSess, false);
        if (!userCheck.authInvalid && userCheck.user) {
          const verifiedSess: Session =
            userCheck.user !== currentSess.user
              ? { ...currentSess, user: userCheck.user }
              : currentSess;
          return { session: verifiedSess, offline: false, error: null };
        }

        // If getUser rejected the token as invalid/revoked, fall through to refreshSession() below
        if (!userCheck.authInvalid) {
          return {
            session: currentSess,
            offline: userCheck.transientError?.kind === "offline",
            error: null,
          };
        }
      }

      // If offline, do not attempt network token rotation (preserve refresh_token until online)
      if (isOffline) {
        return {
          session: currentSess,
          offline: true,
          error: null,
        };
      }

      if (!currentSess.refresh_token) {
        syncCachedAccessToken(null);
        clearServerUserVerificationCache();
        void capacitorAuthStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
        return { session: null, offline: false, error: null };
      }

      const { data: refreshData, error: refreshErr } = await withQueryTimeout(
        supabase.auth.refreshSession(),
        9000,
        "Auth token refresh",
      );

      if (refreshErr) {
        const classified = classifySupabaseError(refreshErr);
        // Only clear cached token if server explicitly rejected the refresh token (not transient mobile timeout)
        if (classified.kind === "auth") {
          syncCachedAccessToken(null);
          clearServerUserVerificationCache();
          void capacitorAuthStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
          return { session: null, offline: false, error: classified };
        }
        return {
          session: hasActiveSessionToken(currentSess) ? currentSess : null,
          offline: classified.kind === "offline",
          error: classified,
        };
      }

      const nextSess = refreshData?.session ?? currentSess;
      if (nextSess?.access_token) {
        syncCachedAccessToken(nextSess.access_token, nextSess.expires_at);
        const postRefreshCheck = await verifyActiveUserWithServer(nextSess, true);
        if (postRefreshCheck.authInvalid) {
          syncCachedAccessToken(null);
          clearServerUserVerificationCache();
          void capacitorAuthStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
          return { session: null, offline: false, error: postRefreshCheck.transientError };
        }
        const verifiedNext: Session =
          postRefreshCheck.user && postRefreshCheck.user !== nextSess.user
            ? { ...nextSess, user: postRefreshCheck.user }
            : nextSess;
        return { session: verifiedNext, offline: false, error: null };
      }

      return { session: null, offline: false, error: null };
    } catch (err) {
      const classified = classifySupabaseError(err);
      return {
        session: null,
        offline: isOffline || classified.kind === "offline",
        error: classified,
      };
    } finally {
      sharedSessionCheckInFlight = null;
    }
  };

  sharedSessionCheckInFlight = run();
  return sharedSessionCheckInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;
  const activeProfileUidRef = useRef<string | null>(null);
  const profileLoadedFromDbUidRef = useRef<string | null>(null);
  const profileFetchSeqRef = useRef<number>(0);
  const verifyInFlightRef = useRef<Promise<Session | null> | null>(null);
  const lastAuthToastAtRef = useRef<number>(0);

  // Bail out of state updates when session token, user ID & email have not meaningfully changed
  const updateSessionStable = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession((prev) => {
      if (!prev && !next) return prev;
      if (
        prev &&
        next &&
        prev.access_token === next.access_token &&
        prev.user?.id === next.user?.id &&
        normalizeEmail(prev.user?.email) === normalizeEmail(next.user?.email) &&
        prev.expires_at === next.expires_at
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const updateProfileStable = useCallback((next: UserProfile | null) => {
    profileRef.current = next;
    setProfile((prev) => {
      if (!prev && !next) return prev;
      if (
        prev &&
        next &&
        prev.id === next.id &&
        prev.email === next.email &&
        prev.full_name === next.full_name &&
        prev.role_name === next.role_name &&
        prev.phone === next.phone &&
        prev.employee_code === next.employee_code &&
        prev.is_active === next.is_active
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const notifyConnectionIssue = useCallback((message: string, onRetry?: () => void) => {
    const now = Date.now();
    if (now - lastAuthToastAtRef.current < 12_000) return;
    lastAuthToastAtRef.current = now;
    toast.warning(message, {
      duration: 6000,
      ...(onRetry
        ? {
            action: {
              label: "Retry",
              onClick: onRetry,
            },
          }
        : {}),
    });
  }, []);

  const loadProfile = useCallback(async (uid: string, authUser?: User | null, force = false) => {
    if (!uid) return;
    const candidateUser = authUser || sessionRef.current?.user || null;

    // Only short-circuit when an AUTHORITATIVE public.users DB record is already loaded for this exact UID + email
    if (
      !force &&
      (activeProfileUidRef.current === uid ||
        (profileLoadedFromDbUidRef.current === uid && doesProfileMatchAuthUser(profileRef.current, candidateUser)))
    ) {
      return;
    }

    const requestSeq = ++profileFetchSeqRef.current;
    activeProfileUidRef.current = uid;

    // Immediately clear any stale profile belonging to a different UID or email before loading
    if (profileRef.current && !doesProfileMatchAuthUser(profileRef.current, candidateUser)) {
      updateProfileStable(null);
      profileLoadedFromDbUidRef.current = null;
    }

    try {
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

      // 1. Obtain live server-verified auth user via supabase.auth.getUser() when online
      let verifiedAuthUser: User | null = candidateUser;
      if (!isOffline && (force || !verifiedAuthUser?.email || lastServerVerifiedUser?.id !== uid)) {
        try {
          const { data: liveUserData, error: liveUserErr } = await withQueryTimeout(
            supabase.auth.getUser(),
            7000,
            "Strict auth user lookup",
          );
          if (liveUserErr) {
            const classified = classifySupabaseError(liveUserErr);
            if (classified.kind === "auth") {
              if (profileFetchSeqRef.current === requestSeq) {
                syncCachedAccessToken(null);
                clearServerUserVerificationCache();
                profileLoadedFromDbUidRef.current = null;
                updateProfileStable(null);
                updateSessionStable(null);
              }
              return;
            }
          } else if (liveUserData?.user?.id) {
            verifiedAuthUser = liveUserData.user;
            lastServerVerifiedUser = liveUserData.user;
            lastServerVerifiedAtMs = Date.now();
            // If server user ID differs from requested stale UID, align strictly to server UID
            if (verifiedAuthUser.id !== uid) {
              uid = verifiedAuthUser.id;
            }
          }
        } catch (userErr) {
          console.warn("[Auth] Strict getUser notice:", userErr);
        }
      }

      if (profileFetchSeqRef.current !== requestSeq) return;
      if (!verifiedAuthUser) {
        updateProfileStable(null);
        return;
      }

      const verifiedEmail = normalizeEmail(verifiedAuthUser.email);
      let dbRow: Record<string, any> | null = null;

      // 2. Authoritative database lookup in public.users — strict UID query first
      if (!isOffline) {
        const { data: byIdData, error: byIdError } = await withQueryTimeout(
          supabase.from("users").select("*").eq("id", uid).maybeSingle(),
          8000,
          "User profile fetch by UID",
        ).catch((err) => {
          console.warn("Profile fetch by UID timed out or network error:", err?.message || err);
          return { data: null, error: err };
        });

        if (profileFetchSeqRef.current !== requestSeq) return;

        if (byIdData) {
          const rowEmail = normalizeEmail((byIdData as any).email);
          if (!verifiedEmail || !rowEmail || rowEmail === verifiedEmail) {
            dbRow = byIdData as Record<string, any>;
          } else {
            console.warn("[Auth] Ignored public.users row with mismatched email for UID:", uid);
          }
        } else if (byIdError) {
          console.warn("Profile fetch by UID note:", byIdError.message || byIdError);
        }

        // 3. Secondary strict exact-email lookup if public.users row exists under a legacy/migrated UUID
        if (!dbRow && verifiedEmail) {
          const { data: byEmailData, error: byEmailError } = await withQueryTimeout(
            supabase.from("users").select("*").ilike("email", verifiedEmail).maybeSingle(),
            8000,
            "User profile fetch by verified email",
          ).catch((err) => {
            console.warn("Profile fetch by email timed out or network error:", err?.message || err);
            return { data: null, error: err };
          });

          if (profileFetchSeqRef.current !== requestSeq) return;

          if (byEmailData && normalizeEmail((byEmailData as any).email) === verifiedEmail) {
            dbRow = byEmailData as Record<string, any>;
          } else if (byEmailError) {
            console.warn("Profile fetch by email note:", byEmailError.message || byEmailError);
          }
        }
      }

      if (profileFetchSeqRef.current !== requestSeq) return;

      if (dbRow) {
        const verifiedProfile = normalizeDbUserProfile(dbRow, verifiedAuthUser);
        if (verifiedProfile) {
          // Enforce active status from database
          if (verifiedProfile.is_active === false) {
            toast.error("Your account has been deactivated. Please contact Super Admin.");
            syncCachedAccessToken(null);
            clearServerUserVerificationCache();
            profileLoadedFromDbUidRef.current = null;
            updateProfileStable(null);
            updateSessionStable(null);
            void supabase.auth.signOut().catch(() => {});
            return;
          }

          profileLoadedFromDbUidRef.current = verifiedProfile.id;
          updateProfileStable(verifiedProfile);

          // Reconcile local users cache cleanly: replace any stale entry matching UID or email
          try {
            const currentStored = getStoredUsers();
            const normalizedSystemRole =
              verifiedProfile.role_name.toLowerCase().includes("admin") ? "super_admin" : "sales_officer";
            const authoritativeRecord = {
              id: verifiedProfile.id,
              email: verifiedProfile.email,
              full_name: verifiedProfile.full_name,
              phone: verifiedProfile.phone || null,
              role: normalizedSystemRole,
              role_name: verifiedProfile.role_name,
              territory_id: verifiedProfile.territory_id || null,
              is_active: verifiedProfile.is_active,
              created_at: verifiedProfile.created_at,
              updated_at: verifiedProfile.updated_at || new Date().toISOString(),
              _unsynced: false,
              is_offline: false,
            };

            const filteredOthers = currentStored.filter(
              (u) =>
                String(u.id).trim() !== verifiedProfile.id &&
                (!verifiedProfile.email || normalizeEmail(u.email) !== verifiedProfile.email),
            );
            saveStoredUsers([authoritativeRecord, ...filteredOthers], true);
          } catch (e) {
            console.warn("Notice syncing authoritative profile into stored users:", e);
          }
          return;
        }
      }

      // 4. Offline / transient DB fallback:
      //    First check locally cached directory ONLY if BOTH UID and email strictly match the authenticated user.
      //    Do NOT mark `profileLoadedFromDbUidRef` so connectivity restoration immediately re-fetches DB truth!
      profileLoadedFromDbUidRef.current = null;

      try {
        const storedUsers = getStoredUsers();
        const strictLocalMatch = storedUsers.find(
          (u) =>
            String(u.id).trim() === verifiedAuthUser!.id &&
            (!verifiedEmail || normalizeEmail(u.email) === verifiedEmail),
        );
        if (strictLocalMatch) {
          const cachedProfile = normalizeDbUserProfile(strictLocalMatch, verifiedAuthUser);
          if (cachedProfile) {
            updateProfileStable(cachedProfile);
            return;
          }
        }
      } catch (localErr) {
        console.warn("Notice checking strict local user match:", localErr);
      }

      // 5. Final strictly scoped fallback from server-verified Auth user (never uses loose substring matching)
      const meta = verifiedAuthUser.user_metadata || {};
      const appMeta = (verifiedAuthUser as any).app_metadata || {};
      const resolvedRole = resolveVerifiedRole(null, verifiedAuthUser).roleName;
      const resolvedName =
        String(meta.full_name || meta.fullName || meta.name || "").trim() ||
        (resolvedRole === "Super Admin" ? "Super Admin" : verifiedEmail ? verifiedEmail.split("@")[0] : "User");

      const fallbackProfile: UserProfile = {
        id: verifiedAuthUser.id,
        email: verifiedEmail,
        full_name: resolvedName,
        phone: verifiedAuthUser.phone || null,
        role_name: appMeta.role ? normalizeRoleName(appMeta.role, verifiedEmail) : resolvedRole,
        territory_id: null,
        is_active: true,
        created_at: verifiedAuthUser.created_at || new Date().toISOString(),
      };

      updateProfileStable(fallbackProfile);
    } catch (err) {
      console.error("loadProfile exception:", err);
      if (profileFetchSeqRef.current === requestSeq) {
        profileLoadedFromDbUidRef.current = null;
        updateProfileStable(null);
      }
    } finally {
      if (activeProfileUidRef.current === uid) {
        activeProfileUidRef.current = null;
      }
    }
  }, [updateProfileStable, updateSessionStable]);

  /**
   * Verifies that an active, non-expired Supabase session token exists before heavy background queries run.
   * Automatically refreshes near-expiry tokens and surfaces clear diagnostics on network/CORS failures.
   */
  const verifySession = useCallback(
    async (forceRefresh = false): Promise<Session | null> => {
      if (
        !forceRefresh &&
        hasActiveSessionToken(sessionRef.current) &&
        lastServerVerifiedToken === sessionRef.current.access_token &&
        Date.now() - lastServerVerifiedAtMs < SERVER_USER_VERIFY_TTL_MS
      ) {
        setSessionVerified(true);
        setAuthError(null);
        return sessionRef.current;
      }

      if (verifyInFlightRef.current) {
        return verifyInFlightRef.current;
      }

      const task = (async (): Promise<Session | null> => {
        try {
          const result = await ensureValidSession(forceRefresh);

          if (result.offline) {
            const fallbackSess = result.session ?? sessionRef.current;
            if (fallbackSess) {
              updateSessionStable(fallbackSess);
            }
            setAuthError(null);
            return fallbackSess;
          }

          if (result.error) {
            if (result.error.kind === "auth") {
              profileLoadedFromDbUidRef.current = null;
              updateSessionStable(null);
              updateProfileStable(null);
              setAuthError(result.error.userMessage);
              toast.error("Your session expired. Please sign in again.");
              return null;
            }
            setAuthError(result.error.userMessage);
            notifyConnectionIssue(result.error.userMessage, () => {
              void verifySession(true);
            });
            return hasActiveSessionToken(sessionRef.current) ? sessionRef.current : null;
          }

          if (!result.session) {
            profileLoadedFromDbUidRef.current = null;
            updateSessionStable(null);
            updateProfileStable(null);
            setAuthError(null);
            return null;
          }

          updateSessionStable(result.session);
          setAuthError(null);
          return result.session;
        } catch (err) {
          const classified = classifySupabaseError(err);
          setAuthError(classified.userMessage);
          notifyConnectionIssue(classified.userMessage, () => {
            void verifySession(true);
          });
          return hasActiveSessionToken(sessionRef.current) ? sessionRef.current : null;
        } finally {
          setSessionVerified(true);
          verifyInFlightRef.current = null;
        }
      })();

      verifyInFlightRef.current = task;
      return task;
    },
    [notifyConnectionIssue, updateSessionStable, updateProfileStable],
  );

  useEffect(() => {
    let mounted = true;

    // Hard 6-second fallback timeout: Guaranteed UI unlock even if mobile network or locks stall
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("[Auth] Hard fallback timeout reached (6s). Forcing loading to false.");
        setSessionVerified(true);
        setLoading(false);
      }
    }, 6000);

    async function initAuth() {
      try {
        const verified = await verifySession(false);
        if (!mounted) return;
        if (verified?.user) {
          // Force authoritative DB lookup on initial mount
          loadProfile(verified.user.id, verified.user, true).catch((err) => {
            console.warn("Background profile load notice:", err);
          });
        } else {
          updateProfileStable(null);
        }
      } catch (err) {
        console.warn("Supabase initAuth notice:", err);
      } finally {
        if (mounted) {
          setSessionVerified(true);
          setLoading(false);
        }
        clearTimeout(safetyTimeout);
      }
    }

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;
      updateSessionStable(sess);
      setSessionVerified(true);
      if (!sess) {
        clearServerUserVerificationCache();
        profileLoadedFromDbUidRef.current = null;
        activeProfileUidRef.current = null;
        updateProfileStable(null);
        setLoading(false);
        return;
      }

      // Immediately purge any stale profile from a previously signed-in account
      if (profileRef.current && !doesProfileMatchAuthUser(profileRef.current, sess.user)) {
        profileLoadedFromDbUidRef.current = null;
        updateProfileStable(null);
      }

      if (sess.access_token && supabase?.realtime?.setAuth) {
        try {
          supabase.realtime.setAuth(sess.access_token);
        } catch {
          // ignore
        }
      }

      const shouldForceProfileFetch =
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        profileLoadedFromDbUidRef.current !== sess.user.id;

      // Defer Supabase table queries outside the synchronous GoTrue lock callback
      setTimeout(() => {
        if (!mounted) return;
        loadProfile(sess.user.id, sess.user, shouldForceProfileFetch)
          .catch((authChangeErr) => {
            console.warn("[Auth] onAuthStateChange loadProfile notice:", authChangeErr);
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }, 0);
    });

    const handleAppResumeOrOnline = () => {
      if (!mounted) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const currentSess = sessionRef.current;
      if (!currentSess) return;
      // Re-verify & auto-refresh expired mobile tokens when returning from background or reconnecting
      if (!hasActiveSessionToken(currentSess)) {
        void verifySession(true);
      } else if (profileLoadedFromDbUidRef.current !== currentSess.user?.id && currentSess.user?.id) {
        // Re-fetch authoritative DB profile if startup ran while offline / used temporary fallback
        void loadProfile(currentSess.user.id, currentSess.user, true);
      }
    };

    document.addEventListener("visibilitychange", handleAppResumeOrOnline);
    window.addEventListener("online", handleAppResumeOrOnline);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      document.removeEventListener("visibilitychange", handleAppResumeOrOnline);
      window.removeEventListener("online", handleAppResumeOrOnline);
      sub.subscription.unsubscribe();
    };
  }, [verifySession, loadProfile, updateSessionStable, updateProfileStable]);

  const signIn = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Clear any stale profile or verification state before initiating a fresh login
    clearServerUserVerificationCache();
    profileLoadedFromDbUidRef.current = null;
    activeProfileUidRef.current = null;
    updateProfileStable(null);

    try {
      const { data, error } = await withQueryTimeout(
        supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        }),
        10000,
        "Sign in",
      );

      if (error) {
        const classified = classifySupabaseError(error);
        if (classified.kind === "cors_or_network" || classified.kind === "offline" || classified.kind === "timeout") {
          return { error: classified.userMessage };
        }
        return { error: error.message };
      }

      if (data.session) {
        syncCachedAccessToken(data.session.access_token, data.session.expires_at);
        lastServerVerifiedToken = data.session.access_token;
        lastServerVerifiedUser = data.session.user;
        lastServerVerifiedAtMs = Date.now();
        updateSessionStable(data.session);
        setSessionVerified(true);
        setAuthError(null);
        await loadProfile(data.session.user.id, data.session.user, true).catch((err) => {
          console.warn("Post-login profile load notice:", err);
        });
        return { error: null };
      }

      return { error: "Authentication failed. No session created." };
    } catch (err: any) {
      const classified = classifySupabaseError(err);
      return { error: classified.userMessage || err?.message || "Sign in failed. Please check your connection." };
    }
  }, [loadProfile, updateSessionStable, updateProfileStable]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role_name: role,
      });
      if (profileError) return { error: profileError.message };
    }
    return { error: null };
  }, []);

  const signInAsDemo = useCallback((_email: string) => {
    // Deprecated: Demo login disabled for production readiness
  }, []);

  const signOut = useCallback(async () => {
    // Increment fetch sequence to discard any in-flight profile loads
    profileFetchSeqRef.current += 1;
    clearServerUserVerificationCache();
    profileLoadedFromDbUidRef.current = null;
    activeProfileUidRef.current = null;
    syncCachedAccessToken(null);

    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sales_erp_demo_session");
        localStorage.removeItem("sales_erp_demo_session");
      }
      await withQueryTimeout(supabase.auth.signOut(), 5000, "Sign out");
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      try {
        await Promise.resolve(capacitorAuthStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY));
      } catch {
        // ignore storage cleanup errors
      }
      updateProfileStable(null);
      updateSessionStable(null);
      setAuthError(null);
      setSessionVerified(true);
    }
  }, [updateProfileStable, updateSessionStable]);

  const refreshProfile = useCallback(async () => {
    const currentSess = sessionRef.current;
    if (currentSess?.user) {
      profileLoadedFromDbUidRef.current = null;
      await loadProfile(currentSess.user.id, currentSess.user, true);
    }
  }, [loadProfile]);

  // Strictly gate exposed profile so UI/permissions NEVER receive a profile mismatched with the active session user
  const verifiedProfile = useMemo<UserProfile | null>(() => {
    const activeUser = session?.user ?? null;
    if (!activeUser || !profile) return null;
    return doesProfileMatchAuthUser(profile, activeUser) ? profile : null;
  }, [session?.user, profile]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: verifiedProfile,
      loading,
      sessionVerified,
      authError,
      isDemo: false,
      signIn,
      signUp,
      signInAsDemo,
      signOut,
      refreshProfile,
      verifySession,
    }),
    [session, verifiedProfile, loading, sessionVerified, authError, signIn, signUp, signInAsDemo, signOut, refreshProfile, verifySession],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

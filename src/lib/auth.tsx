import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase, SUPABASE_URL, type UserProfile, type Role } from "./supabase";
import { withQueryTimeout, classifySupabaseError } from "./supabaseQuery";
import {
  getStoredUsers,
  saveStoredUsers,
  DEMO_USER_IDS,
} from "@/services/userService";

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
    }
  } catch {
    // Ignore non-JWT or environment without atob
  }
  return true;
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
  const verifyInFlightRef = useRef<Promise<Session | null> | null>(null);
  const lastAuthToastAtRef = useRef<number>(0);

  // Bail out of state updates when session token & user ID have not meaningfully changed
  const updateSessionStable = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession((prev) => {
      if (!prev && !next) return prev;
      if (
        prev &&
        next &&
        prev.access_token === next.access_token &&
        prev.user?.id === next.user?.id &&
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
    // Skip duplicate or already-loaded profile fetches unless forced
    if (!force && (activeProfileUidRef.current === uid || profileRef.current?.id === uid)) return;
    activeProfileUidRef.current = uid;

    try {
      const { data, error } = await withQueryTimeout(
        supabase.from("users").select("*").eq("id", uid).maybeSingle(),
        8000,
        "User profile fetch",
      ).catch((err) => {
        console.warn("Profile fetch timed out or network error:", err?.message || err);
        return { data: null, error: err };
      });

      if (data) {
        updateProfileStable(data as UserProfile);
        try {
          const currentStored = getStoredUsers();
          const exists = currentStored.some((u) => u.id === data.id);
          if (!exists) {
            saveStoredUsers([
              {
                id: data.id,
                email: data.email || "",
                full_name: data.full_name || "",
                phone: data.phone || null,
                role: (data.role_name || "").toLowerCase().includes("admin") ? "super_admin" : "sales_officer",
                role_name: data.role_name || "Sales Officer",
                is_active: data.is_active ?? true,
                created_at: data.created_at || new Date().toISOString(),
              },
              ...currentStored,
            ], true);
          } else {
            const updated = currentStored.map((u) =>
              u.id === data.id
                ? {
                    ...u,
                    full_name: data.full_name || u.full_name,
                    email: data.email || u.email,
                    role_name: data.role_name || u.role_name,
                  }
                : u
            );
            saveStoredUsers(updated, true);
          }
        } catch (e) {
          console.warn("Notice syncing profile into stored users:", e);
        }
        return;
      }

      if (error) {
        console.warn("Profile fetch note:", error.message || error);
      }

      // If user profile is not yet in public.users, construct verified profile from authenticated user metadata
      const activeUser = authUser || sessionRef.current?.user;
      if (activeUser) {
        const meta = activeUser.user_metadata || {};
        const metaRole = String(meta.role || "").trim();
        const isSuperAdmin =
          metaRole.toLowerCase().includes("admin") ||
          activeUser.email?.toLowerCase().includes("sabur") ||
          activeUser.email?.toLowerCase().includes("admin");

        const fallbackRole: Role = isSuperAdmin ? "Super Admin" : (metaRole as Role) || "Sales Officer";

        const fallbackProfile: UserProfile = {
          id: activeUser.id,
          email: activeUser.email || "",
          full_name: meta.full_name || meta.name || (isSuperAdmin ? "Super Admin" : "User"),
          phone: activeUser.phone || null,
          role_name: fallbackRole,
          territory_id: null,
          is_active: true,
          created_at: activeUser.created_at || new Date().toISOString(),
        };

        updateProfileStable(fallbackProfile);

        try {
          const currentStored = getStoredUsers();
          const exists = currentStored.some(
            (u) => u.id === activeUser.id || u.email.toLowerCase() === activeUser.email?.toLowerCase()
          );
          if (!exists) {
            saveStoredUsers([
              {
                id: fallbackProfile.id,
                email: fallbackProfile.email,
                full_name: fallbackProfile.full_name,
                phone: fallbackProfile.phone,
                role: isSuperAdmin ? "super_admin" : "sales_officer",
                role_name: fallbackProfile.role_name,
                is_active: true,
                created_at: fallbackProfile.created_at,
              },
              ...currentStored,
            ], true);
          }
        } catch (e) {
          console.warn("Notice syncing fallback profile into stored users:", e);
        }
        return;
      }

      updateProfileStable(null);
    } catch (err) {
      console.error("loadProfile exception:", err);
      updateProfileStable(null);
    } finally {
      activeProfileUidRef.current = null;
    }
  }, [updateProfileStable]);

  /**
   * Verifies that an active, non-expired Supabase session token exists before heavy background queries run.
   * Automatically refreshes near-expiry tokens and surfaces clear diagnostics on network/CORS failures.
   */
  const verifySession = useCallback(
    async (forceRefresh = false): Promise<Session | null> => {
      if (!forceRefresh && hasActiveSessionToken(sessionRef.current)) {
        setSessionVerified(true);
        setAuthError(null);
        return sessionRef.current;
      }

      if (verifyInFlightRef.current) {
        return verifyInFlightRef.current;
      }

      const task = (async (): Promise<Session | null> => {
        try {
          const { data, error } = await withQueryTimeout(
            supabase.auth.getSession(),
            6000,
            "Auth session check",
          );

          if (error) {
            const classified = classifySupabaseError(error);
            if (classified.kind === "auth") {
              updateSessionStable(null);
              updateProfileStable(null);
              setAuthError(classified.userMessage);
              toast.error("Session expired. Please sign in again.");
              return null;
            }
            setAuthError(classified.userMessage);
            notifyConnectionIssue(classified.userMessage, () => {
              void verifySession(true);
            });
            return hasActiveSessionToken(sessionRef.current) ? sessionRef.current : null;
          }

          const currentSess = data?.session ?? null;
          if (!currentSess) {
            updateSessionStable(null);
            setAuthError(null);
            return null;
          }

          // If token is active and not forced to refresh, accept immediately
          if (!forceRefresh && hasActiveSessionToken(currentSess)) {
            updateSessionStable(currentSess);
            setAuthError(null);
            return currentSess;
          }

          // Token is expired or nearing expiry — attempt controlled refresh
          const { data: refreshData, error: refreshError } = await withQueryTimeout(
            supabase.auth.refreshSession(),
            8000,
            "Auth token refresh",
          );

          if (refreshError) {
            const classified = classifySupabaseError(refreshError);
            if (classified.kind === "auth") {
              updateSessionStable(null);
              updateProfileStable(null);
              setAuthError(classified.userMessage);
              toast.error("Your session expired. Please sign in again.");
              return null;
            }
            setAuthError(classified.userMessage);
            notifyConnectionIssue(classified.userMessage, () => {
              void verifySession(true);
            });
            return hasActiveSessionToken(currentSess) ? currentSess : null;
          }

          const nextSession = refreshData?.session ?? currentSess;
          if (nextSession?.access_token) {
            updateSessionStable(nextSession);
            setAuthError(null);
            return nextSession;
          }

          return null;
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
          // Load profile non-blockingly so UI renders immediately
          loadProfile(verified.user.id, verified.user).catch((err) => {
            console.warn("Background profile load notice:", err);
          });
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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      updateSessionStable(sess);
      setSessionVerified(true);
      if (!sess) {
        updateProfileStable(null);
        setLoading(false);
        return;
      }

      // Defer Supabase table queries outside the synchronous GoTrue lock callback
      setTimeout(() => {
        if (!mounted) return;
        loadProfile(sess.user.id, sess.user)
          .catch((authChangeErr) => {
            console.warn("[Auth] onAuthStateChange loadProfile notice:", authChangeErr);
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      sub.subscription.unsubscribe();
    };
  }, [verifySession, loadProfile, updateSessionStable, updateProfileStable]);

  const signIn = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

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
        updateSessionStable(data.session);
        setSessionVerified(true);
        setAuthError(null);
        loadProfile(data.session.user.id, data.session.user, true).catch((err) => {
          console.warn("Post-login profile load notice:", err);
        });
        return { error: null };
      }

      return { error: "Authentication failed. No session created." };
    } catch (err: any) {
      const classified = classifySupabaseError(err);
      return { error: classified.userMessage || err?.message || "Sign in failed. Please check your connection." };
    }
  }, [loadProfile, updateSessionStable]);

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
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sales_erp_demo_session");
        localStorage.removeItem("sales_erp_demo_session");
      }
      await withQueryTimeout(supabase.auth.signOut(), 5000, "Sign out");
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      updateProfileStable(null);
      updateSessionStable(null);
      setAuthError(null);
      setSessionVerified(true);
    }
  }, [updateProfileStable, updateSessionStable]);

  const refreshProfile = useCallback(async () => {
    if (sessionRef.current?.user) {
      await loadProfile(sessionRef.current.user.id, sessionRef.current.user, true);
    }
  }, [loadProfile]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
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
    [session, profile, loading, sessionVerified, authError, signIn, signUp, signInAsDemo, signOut, refreshProfile, verifySession],
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

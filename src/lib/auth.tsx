import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase, type UserProfile, type Role } from "./supabase";
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
 * Checks whether a Supabase session has a non-empty access token that has not expired.
 */
export function hasActiveSessionToken(sess: Session | null | undefined): sess is Session {
  if (!sess || !sess.access_token || !sess.user?.id) return false;
  if (typeof sess.expires_at === "number") {
    return sess.expires_at * 1000 > Date.now() + TOKEN_EXPIRY_BUFFER_MS;
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
  const activeProfileUidRef = useRef<string | null>(null);
  const verifyInFlightRef = useRef<Promise<Session | null> | null>(null);
  const lastAuthToastAtRef = useRef<number>(0);

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

  async function loadProfile(uid: string, authUser?: User | null) {
    if (!uid) return;
    // Guard against concurrent duplicate profile requests for same user ID
    if (activeProfileUidRef.current === uid && profile?.id === uid) return;
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
        setProfile(data as UserProfile);
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

        setProfile(fallbackProfile);

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

      setProfile(null);
    } catch (err) {
      console.error("loadProfile exception:", err);
      setProfile(null);
    } finally {
      activeProfileUidRef.current = null;
    }
  }

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
              setSession(null);
              setProfile(null);
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
            setSession(null);
            setAuthError(null);
            return null;
          }

          // If token is active and not forced to refresh, accept immediately
          if (!forceRefresh && hasActiveSessionToken(currentSess)) {
            setSession(currentSess);
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
              setSession(null);
              setProfile(null);
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
            setSession(nextSession);
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
    [notifyConnectionIssue],
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
      setSession(sess);
      setSessionVerified(true);
      if (!sess) {
        setProfile(null);
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
  }, [verifySession]);

  async function signIn(email: string, password: string) {
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
        setSession(data.session);
        setSessionVerified(true);
        setAuthError(null);
        loadProfile(data.session.user.id, data.session.user).catch((err) => {
          console.warn("Post-login profile load notice:", err);
        });
        return { error: null };
      }

      return { error: "Authentication failed. No session created." };
    } catch (err: any) {
      const classified = classifySupabaseError(err);
      return { error: classified.userMessage || err?.message || "Sign in failed. Please check your connection." };
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: Role) {
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
  }

  function signInAsDemo(_email: string) {
    // Deprecated: Demo login disabled for production readiness
  }

  async function signOut() {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sales_erp_demo_session");
        localStorage.removeItem("sales_erp_demo_session");
      }
      await withQueryTimeout(supabase.auth.signOut(), 5000, "Sign out");
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      setProfile(null);
      setSession(null);
      setAuthError(null);
      setSessionVerified(true);
    }
  }

  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

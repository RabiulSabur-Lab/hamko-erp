import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type UserProfile, type Role } from "./supabase";
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
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>;
  signInAsDemo?: (email: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Valid unique UUIDs synchronized from userService
export { DEMO_USER_IDS };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfileUidRef = useRef<string | null>(null);

  async function loadProfile(uid: string, authUser?: User | null) {
    if (!uid) return;
    // Guard against concurrent duplicate profile requests for same user ID
    if (activeProfileUidRef.current === uid && profile?.id === uid) return;
    activeProfileUidRef.current = uid;

    try {
      // 5-second timeout protection for profile query
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Profile query timeout")), 5000)
      );

      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]).catch((err) => {
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
      const activeUser = authUser || session?.user;
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

  useEffect(() => {
    let mounted = true;

    // Safety timeout: If Supabase auth network drops, ensure UI unlocks after 5s
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 5000);

    async function initAuth() {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: any } }>((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 4500)
        );

        const { data } = await Promise.race([sessionPromise, timeoutPromise]).catch(() => ({
          data: { session: null },
        }));

        if (!mounted) return;
        if (data.session?.user) {
          setSession(data.session);
          try {
            await loadProfile(data.session.user.id, data.session.user);
          } catch (profileErr) {
            console.warn("Profile load notice:", profileErr);
          }
        }
      } catch (err) {
        console.warn("Supabase getSession notice:", err);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimeout);
      }
    }

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      (async () => {
        setSession(sess);
        if (sess?.user) {
          await loadProfile(sess.user.id, sess.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        await loadProfile(data.session.user.id, data.session.user);
        return { error: null };
      }

      return { error: "Authentication failed. No session created." };
    } catch (err: any) {
      return { error: err?.message || "Sign in failed. Please check your connection." };
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
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      setProfile(null);
      setSession(null);
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
        isDemo: false,
        signIn,
        signUp,
        signInAsDemo,
        signOut,
        refreshProfile,
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

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type UserProfile, type Role } from "./supabase";
import {
  findAuthCredentialByEmail,
  verifyLocalCredential,
  getStoredUsers,
  saveStoredUsers,
  DEMO_USER_IDS,
  type StoredAuthCredential,
} from "@/services/userService";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>;
  signInAsDemo: (email: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_SESSION_KEY = "sales_erp_demo_session";

// Valid unique UUIDs synchronized from userService
export { DEMO_USER_IDS };

const DEMO_USERS: Record<string, { profile: UserProfile }> = {
  "admin@saleserppro.com": {
    profile: {
      id: DEMO_USER_IDS.admin,
      email: "admin@saleserppro.com",
      full_name: "Super Admin",
      phone: null,
      role_name: "Super Admin",
      territory_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  "officer@saleserppro.com": {
    profile: {
      id: DEMO_USER_IDS.officer,
      email: "officer@saleserppro.com",
      full_name: "Sales Officer",
      phone: null,
      role_name: "Sales Officer",
      territory_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
};

function createMockSessionFromCredential(cred: StoredAuthCredential): Session {
  const roleName = (cred.role_name || (cred.role === "super_admin" ? "Super Admin" : "Sales Officer")) as Role;
  return {
    access_token: "demo-" + cred.id,
    refresh_token: "demo-refresh-" + cred.id,
    expires_in: 9999999,
    expires_at: 9999999999,
    token_type: "bearer",
    user: {
      id: cred.id,
      aud: "authenticated",
      role: "authenticated",
      email: cred.email,
      app_metadata: { provider: "email" },
      user_metadata: { name: cred.full_name, role: roleName },
      created_at: cred.updated_at || new Date().toISOString(),
    } as unknown as User,
  } as unknown as Session;
}

function getProfileForEmail(email: string): UserProfile | null {
  const cleanEmail = email.trim().toLowerCase();
  const cred = findAuthCredentialByEmail(cleanEmail);
  if (cred) {
    return {
      id: cred.id,
      email: cred.email,
      full_name: cred.full_name,
      phone: null,
      role_name: (cred.role_name || (cred.role === "super_admin" ? "Super Admin" : "Sales Officer")) as Role,
      territory_id: null,
      is_active: cred.is_active,
      created_at: cred.updated_at || new Date().toISOString(),
    };
  }
  const demo = DEMO_USERS[cleanEmail];
  return demo ? demo.profile : null;
}

function createMockSession(email: string): Session {
  const cleanEmail = email.trim().toLowerCase();
  const cred = findAuthCredentialByEmail(cleanEmail);
  if (cred) {
    return createMockSessionFromCredential(cred);
  }
  const demo = DEMO_USERS[cleanEmail];
  const fallbackId = demo ? demo.profile.id : DEMO_USER_IDS.admin;
  return {
    access_token: "demo-" + fallbackId,
    refresh_token: "demo-refresh-" + fallbackId,
    expires_in: 9999999,
    expires_at: 9999999999,
    token_type: "bearer",
    user: {
      id: fallbackId,
      aud: "authenticated",
      role: "authenticated",
      email: cleanEmail,
      app_metadata: { provider: "email" },
      user_metadata: { name: demo ? demo.profile.full_name : "User", role: demo ? demo.profile.role_name : "Super Admin" },
      created_at: new Date().toISOString(),
    } as unknown as User,
  } as unknown as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const isDemoRef = useRef(false);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      console.error("Profile load error:", error);
      setProfile(null);
    } else {
      setProfile(data as UserProfile | null);
      if (data) {
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
            ]);
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
            saveStoredUsers(updated);
          }
        } catch (e) {
          console.warn("Notice syncing profile into stored users:", e);
        }
      }
    }
  }

  function restoreDemoSession(): boolean {
    try {
      // Check sessionStorage first for session states, then fallback to localStorage
      const stored =
        (typeof window !== "undefined" && window.sessionStorage ? sessionStorage.getItem(DEMO_SESSION_KEY) : null) ||
        (typeof window !== "undefined" && window.localStorage ? localStorage.getItem(DEMO_SESSION_KEY) : null);
      if (!stored) return false;
      const profileObj = getProfileForEmail(stored);
      if (!profileObj) {
        if (typeof window !== "undefined" && window.sessionStorage) sessionStorage.removeItem(DEMO_SESSION_KEY);
        if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(DEMO_SESSION_KEY);
        return false;
      }
      setSession(createMockSession(stored));
      setProfile(profileObj);
      setIsDemo(true);
      isDemoRef.current = true;
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          setSession(data.session);
          setIsDemo(false);
          isDemoRef.current = false;
          // Clear any conflicting demo session key
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(DEMO_SESSION_KEY);
            localStorage.removeItem(DEMO_SESSION_KEY);
          }
          try {
            await loadProfile(data.session.user.id);
          } catch (profileErr) {
            console.warn("Profile load notice:", profileErr);
          }
          if (mounted) setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Supabase getSession notice:", err);
      }

      // No Supabase session found: check for offline/demo fallback
      if (mounted) {
        if (restoreDemoSession()) {
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (isDemoRef.current) return;
      (async () => {
        setSession(sess);
        if (sess?.user) {
          await loadProfile(sess.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Live Supabase Auth sign-in attempt
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!error && data.session) {
        setSession(data.session);
        await loadProfile(data.session.user.id);
        setIsDemo(false);
        isDemoRef.current = false;
        return { error: null };
      }
    } catch (err) {
      console.warn("Supabase live signIn notice, falling back to local credentials:", err);
    }

    // 2. Synchronized Local/Mock Credentials Fallback
    const localResult = verifyLocalCredential(cleanEmail, cleanPassword);
    if (localResult.valid && localResult.user) {
      const u = localResult.user;
      const userProfile: UserProfile = {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        phone: null,
        role_name: (u.role_name || (u.role === "super_admin" ? "Super Admin" : "Sales Officer")) as Role,
        territory_id: null,
        is_active: u.is_active,
        created_at: u.updated_at || new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        if (window.sessionStorage) sessionStorage.setItem(DEMO_SESSION_KEY, u.email);
        if (window.localStorage) localStorage.setItem(DEMO_SESSION_KEY, u.email);
      }

      setSession(createMockSessionFromCredential(u));
      setProfile(userProfile);
      setIsDemo(true);
      isDemoRef.current = true;
      setLoading(false);

      return { error: null };
    }

    if (localResult.error) {
      return { error: localResult.error };
    }

    return { error: "Invalid login credentials" };
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

  function signInAsDemo(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const profileObj = getProfileForEmail(cleanEmail);
    if (!profileObj) return;

    if (typeof window !== "undefined") {
      if (window.sessionStorage) sessionStorage.setItem(DEMO_SESSION_KEY, cleanEmail);
      if (window.localStorage) localStorage.removeItem(DEMO_SESSION_KEY);
    }
    setSession(createMockSession(cleanEmail));
    setProfile(profileObj);
    setIsDemo(true);
    isDemoRef.current = true;
    setLoading(false);
  }

  async function signOut() {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
      isDemoRef.current = false;
      setIsDemo(false);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out notice:", err);
    } finally {
      setProfile(null);
      setSession(null);
    }
  }

  async function refreshProfile() {
    if (isDemoRef.current) {
      if (profile?.email) {
        const refreshed = getProfileForEmail(profile.email);
        if (refreshed) setProfile(refreshed);
      }
      return;
    }
    if (session?.user) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isDemo,
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

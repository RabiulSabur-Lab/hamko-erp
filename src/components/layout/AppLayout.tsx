import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Menu, X, Moon, Sun, Globe, Bell, LogOut, ChevronDown,
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Warehouse,
  Wallet, MapPin, BarChart3, UserCog, Download, BookOpen, Plus, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { withQueryTimeout } from "@/lib/supabaseQuery";
import { useAuth, hasActiveSessionToken, ensureValidSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "@/router";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STORAGE_KEYS, getLocalData, ensureCrossPlatformCacheConsistency } from "@/utils/localStore";
import { pullFreshCloudStateToLocalStore } from "@/utils/cloudSync";
import { initRealtimeSync } from "@/services/realtimeSync";

import { Sidebar, navItems, type NavItem } from "@/components/Sidebar";
export type { NavItem };

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, user, session, sessionVerified, signOut } = useAuth();
  const userId = session?.user?.id ?? null;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { path, navigate } = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const list = getLocalData<any>(STORAGE_KEYS.NOTIFICATIONS, []);
    return list.filter((n: any) => !n.is_read).length;
  });

  useEffect(() => {
    if (!sessionVerified || !userId) return;
    let isMounted = true;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchUnread = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const list = getLocalData<any>(STORAGE_KEYS.NOTIFICATIONS, []);
        if (isMounted) {
          const nextCount = list.filter((n: any) => !n.is_read).length;
          setUnreadCount((prev) => (prev === nextCount ? prev : nextCount));
        }
        return;
      }
      try {
        if (!hasActiveSessionToken(sessionRef.current)) {
          const refreshed = await ensureValidSession();
          if (!refreshed.session || refreshed.offline) return;
        }
        if (supabase?.from) {
          const { count, error } = await withQueryTimeout(
            supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("is_read", false),
            8500,
            "Notifications unread count",
          );
          if (!error && count !== null && isMounted) {
            setUnreadCount((prev) => (prev === count ? prev : count));
            return;
          }
        }
      } catch {
        // Fallback to local storage if network dropped or supabase unavailable
      }
      const list = getLocalData<any>(STORAGE_KEYS.NOTIFICATIONS, []);
      if (isMounted) {
        const nextCount = list.filter((n: any) => !n.is_read).length;
        setUnreadCount((prev) => (prev === nextCount ? prev : nextCount));
      }
    };

    const scheduleUnreadFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) void fetchUnread();
      }, 300);
    };

    void fetchUnread();

    let notifChannel: any = null;
    try {
      if (supabase?.channel) {
        notifChannel = supabase
          .channel("app-layout-notifications")
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
            scheduleUnreadFetch();
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("Notifications realtime subscription notice:", err);
    }

    const handleCustomUpdate = (e: Event) => {
      const detailKey = (e as CustomEvent)?.detail?.key;
      const detailTable = (e as CustomEvent)?.detail?.table;
      if (
        detailKey &&
        detailKey !== STORAGE_KEYS.NOTIFICATIONS &&
        detailKey !== STORAGE_KEYS.DELETED_NOTIFICATIONS &&
        detailTable !== "notifications"
      ) {
        return;
      }
      scheduleUnreadFetch();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEYS.NOTIFICATIONS && e.key !== STORAGE_KEYS.DELETED_NOTIFICATIONS) {
        return;
      }
      scheduleUnreadFetch();
    };

    // Mobile foreground resume hooks: immediately re-fetch unread count upon unlocking or tab switch
    const handleResumeOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      scheduleUnreadFetch();
    };

    document.addEventListener("visibilitychange", handleResumeOrFocus);
    window.addEventListener("focus", handleResumeOrFocus);
    window.addEventListener("pageshow", handleResumeOrFocus);
    window.addEventListener("online", handleResumeOrFocus);
    document.addEventListener("resume", handleResumeOrFocus as EventListener);
    window.addEventListener("resume", handleResumeOrFocus as EventListener);

    // Native Capacitor App Plugin resume hook
    let capHandle: any = null;
    try {
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.App?.addListener) {
        cap.Plugins.App.addListener("appStateChange", (state: { isActive: boolean }) => {
          if (state.isActive) {
            handleResumeOrFocus();
          }
        }).then((h: any) => {
          capHandle = h;
        }).catch(() => null);
      }
    } catch {
      // Safe fallback
    }

    // Periodic background poll every 15 seconds to ensure badge consistency even if WebSockets throttle
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      scheduleUnreadFetch();
    }, 15000);

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleCustomUpdate);
    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      if (capHandle?.remove) {
        capHandle.remove();
      }
      try {
        if (notifChannel && supabase?.removeChannel) {
          supabase.removeChannel(notifChannel);
        }
      } catch {
        // Safe fallback
      }
      document.removeEventListener("visibilitychange", handleResumeOrFocus);
      window.removeEventListener("focus", handleResumeOrFocus);
      window.removeEventListener("pageshow", handleResumeOrFocus);
      window.removeEventListener("online", handleResumeOrFocus);
      document.removeEventListener("resume", handleResumeOrFocus as EventListener);
      window.removeEventListener("resume", handleResumeOrFocus as EventListener);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleCustomUpdate);
    };
  }, [userId, sessionVerified]);

  // Global Cross-Platform Synchronization (Web <-> Mobile):
  // 1. Validates cache consistency & flushes queued offline field entries on startup.
  // 2. Pulls fresh authoritative Supabase state on app initialization and background reconnect.
  // 3. Initializes singleton RealtimeSyncManager for instant Postgres CDC updates & cross-device broadcast.
  useEffect(() => {
    let isMounted = true;

    ensureCrossPlatformCacheConsistency();
    void initRealtimeSync();

    const runStartupSync = async (force = true) => {
      if (!isMounted || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      const sessionCheck = await ensureValidSession();
      if (!isMounted || sessionCheck.offline) return;
      if (isMounted) {
        await pullFreshCloudStateToLocalStore({ force, silent: false });
      }
    };

    void runStartupSync(true);

    return () => {
      isMounted = false;
    };
  }, [userId, sessionVerified]);

  const activeRoute = path === "/" ? "dashboard" : path.replace(/^\//, "").split("/")[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top Header: Official Hamko Corporate Deep Blue/Navy on Mobile (<768px), Classic Enterprise Bar on Desktop (>=768px) */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2.5 border-b border-blue-950/20 md:border-border bg-gradient-to-r from-[#0a2540] via-[#0f3460] to-[#1e3a8a] text-white md:bg-none md:bg-background/90 md:text-foreground px-3.5 backdrop-blur-md lg:px-6 shadow-xs md:shadow-none">
          {/* Mobile Back Arrow (when on inner pages) + Hamburger Drawer Toggle */}
          {activeRoute !== "dashboard" && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-white hover:bg-white/15 hover:text-white shrink-0"
              onClick={() => navigate("dashboard")}
              title={lang === "bn" ? "ড্যাশবোর্ডে ফিরুন" : "Back to Dashboard"}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-white md:text-foreground hover:bg-white/15 md:hover:bg-accent shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold lg:text-lg truncate text-white md:text-foreground">
              {t(navItems.find((n) => String(n.path) === String(activeRoute))?.key ?? "dashboard")}
            </h1>
            <p className="text-[10px] text-blue-200 md:hidden truncate leading-tight">
              HAMKO Group • Cookware Sales ERP
            </p>
          </div>

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "bn" : "en")}
            className="gap-1 h-8 px-2 text-white md:text-foreground hover:bg-white/15 md:hover:bg-accent"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "en" ? "EN" : "বাং"}</span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-white md:text-foreground hover:bg-white/15 md:hover:bg-accent"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("notifications")}
            className="relative h-8 w-8 text-white md:text-foreground hover:bg-white/15 md:hover:bg-accent"
          >
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 md:bg-destructive ring-2 ring-[#0f3460] md:ring-0" />
            )}
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-white/15 md:hover:bg-accent transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 md:bg-primary text-xs font-bold text-white md:text-primary-foreground border border-white/30 md:border-0">
                {initials(profile?.full_name ?? "U")}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-tight text-white md:text-foreground">{profile?.full_name ?? "User"}</p>
                <p className="text-[10px] text-blue-200 md:text-muted-foreground">
                  {profile?.role_name ? t(profile.role_name.toLowerCase().replace(/\s+/g, "")) : "Sales Staff"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-blue-200 md:text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border bg-popover text-popover-foreground p-1 shadow-lg">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium">{profile?.full_name ?? "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email ?? user?.email ?? ""}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{profile?.role_name ?? "Staff"}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("hamko_check_app_update", { detail: { manual: true } }));
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    <span>{lang === "bn" ? "অ্যাপ আপডেট চেক করুন" : "Check for Updates"}</span>
                  </button>
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOut();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content — extra bottom clearance on mobile (<768px) for fixed corporate bottom navigation bar */}
        <main className="p-3.5 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (< 768px) — Hamko Corporate Deep Blue / Navy Palette */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(10,37,64,0.08)] print:hidden"
      >
        <div className="grid grid-cols-5 items-center h-16 px-2 max-w-md mx-auto">
          {/* 1. Home / Dashboard */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate("dashboard");
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors",
              activeRoute === "dashboard"
                ? "text-[#0f3460] dark:text-sky-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{lang === "bn" ? "হোম" : "Home"}</span>
          </button>

          {/* 2. Orders */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate("orders");
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors",
              activeRoute === "orders" && path !== "/orders/create"
                ? "text-[#0f3460] dark:text-sky-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-foreground",
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{lang === "bn" ? "অর্ডার" : "Orders"}</span>
          </button>

          {/* 3. Center Floating Corporate Brand Action: + New Order */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                navigate("orders/create");
              }}
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0a2540] via-[#0f3460] to-[#1e3a8a] text-white shadow-lg ring-4 ring-white dark:ring-slate-900 active:scale-95 transition-transform"
              title={lang === "bn" ? "+ নতুন অর্ডার" : "+ New Order"}
            >
              <Plus className="h-6 w-6" />
            </button>
            <span className="text-[10px] font-bold text-[#0f3460] dark:text-sky-400 leading-tight mt-0.5">
              {lang === "bn" ? "+ নতুন" : "+ New"}
            </span>
          </div>

          {/* 4. Customers (CRM) */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate("customers");
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors",
              activeRoute === "customers"
                ? "text-[#0f3460] dark:text-sky-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-foreground",
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{lang === "bn" ? "কাস্টমার" : "Customers"}</span>
          </button>

          {/* 5. Menu / More Drawer */}
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors",
              sidebarOpen
                ? "text-[#0f3460] dark:text-sky-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-foreground",
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{lang === "bn" ? "মেনু" : "Menu"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

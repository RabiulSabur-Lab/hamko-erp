import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Menu, X, Moon, Sun, Globe, Bell, LogOut, ChevronDown,
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Warehouse,
  Wallet, MapPin, BarChart3, UserCog,
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
import { syncOfflineDataToBackend } from "@/utils/offlineSync";

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
      if (detailKey && detailKey !== STORAGE_KEYS.NOTIFICATIONS && detailKey !== STORAGE_KEYS.DELETED_NOTIFICATIONS) {
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

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleCustomUpdate);
    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      try {
        if (notifChannel && supabase?.removeChannel) {
          supabase.removeChannel(notifChannel);
        }
      } catch {
        // Safe fallback
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleCustomUpdate);
    };
  }, [userId, sessionVerified]);

  // Global Cross-Platform Synchronization (Web <-> Mobile):
  // 1. Validates cache consistency & flushes queued offline field entries on startup.
  // 2. Pulls fresh authoritative Supabase state on app initialization, foreground resume, and reconnect.
  // 3. Subscribes a single multiplexed Realtime channel so changes on Web appear live on Mobile (and vice versa).
  useEffect(() => {
    if (!sessionVerified || !userId) return;
    let isMounted = true;
    let realtimeDebounce: ReturnType<typeof setTimeout> | undefined;
    let lastResumeSyncAt = 0;

    ensureCrossPlatformCacheConsistency();

    const runFullBidirectionalSync = async (force = true) => {
      if (!isMounted || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      const sessionCheck = await ensureValidSession();
      if (!isMounted || sessionCheck.offline || !sessionCheck.session) return;
      await syncOfflineDataToBackend();
      if (isMounted) {
        await pullFreshCloudStateToLocalStore({ force, silent: false });
      }
    };

    void runFullBidirectionalSync(true);

    const scheduleRealtimePull = () => {
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      realtimeDebounce = setTimeout(() => {
        if (isMounted) {
          void pullFreshCloudStateToLocalStore({ force: true, silent: false });
        }
      }, 900);
    };

    let syncChannel: any = null;
    let crossDeviceBroadcastChannel: any = null;
    try {
      if (supabase?.channel) {
        syncChannel = supabase
          .channel("app-global-cloud-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "stock_transactions" }, scheduleRealtimePull)
          .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, scheduleRealtimePull)
          .subscribe();

        crossDeviceBroadcastChannel = supabase
          .channel("hamko-cross-device-sync", {
            config: { broadcast: { self: false } },
          })
          .on("broadcast", { event: "erp_mutation" }, () => {
            scheduleRealtimePull();
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("Global cloud realtime subscription notice:", err);
    }

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastResumeSyncAt < 1500) return;
      lastResumeSyncAt = now;
      void runFullBidirectionalSync(true);
    };

    const handleOnline = () => {
      lastResumeSyncAt = Date.now();
      void runFullBidirectionalSync(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    document.addEventListener("resume", handleVisibilityOrFocus as EventListener);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);
    window.addEventListener("resume", handleVisibilityOrFocus as EventListener);
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      try {
        if (syncChannel && supabase?.removeChannel) {
          supabase.removeChannel(syncChannel);
        }
        if (crossDeviceBroadcastChannel && supabase?.removeChannel) {
          supabase.removeChannel(crossDeviceBroadcastChannel);
        }
      } catch {
        // ignore
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      document.removeEventListener("resume", handleVisibilityOrFocus as EventListener);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
      window.removeEventListener("resume", handleVisibilityOrFocus as EventListener);
      window.removeEventListener("online", handleOnline);
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
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <h1 className="text-base font-semibold lg:text-lg">
              {t(navItems.find((n) => String(n.path) === String(activeRoute))?.key ?? "dashboard")}
            </h1>
          </div>

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "bn" : "en")}
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "en" ? "EN" : "বাং"}</span>
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" onClick={() => navigate("notifications")} className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(profile?.full_name ?? "U")}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-tight">{profile?.full_name ?? "User"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {profile?.role_name ? t(profile.role_name.toLowerCase().replace(/\s+/g, "")) : "Sales Staff"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium">{profile?.full_name ?? "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email ?? user?.email ?? ""}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{profile?.role_name ?? "Staff"}</Badge>
                  </div>
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

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

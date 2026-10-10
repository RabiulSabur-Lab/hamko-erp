import { useState, useEffect, type ReactNode } from "react";
import {
  Menu, X, Moon, Sun, Globe, Bell, LogOut, ChevronDown,
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Warehouse,
  Wallet, MapPin, BarChart3, UserCog,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "@/router";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STORAGE_KEYS, getLocalData } from "@/utils/localStore";

import { Sidebar, navItems, type NavItem } from "@/components/Sidebar";
export type { NavItem };

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
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
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        if (supabase?.from) {
          const { count, error } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("is_read", false);
          if (!error && count !== null && isMounted) {
            setUnreadCount(count);
            return;
          }
        }
      } catch (e) {
        // Fallback to local storage if network dropped or supabase unavailable
      }
      const list = getLocalData<any>(STORAGE_KEYS.NOTIFICATIONS, []);
      if (isMounted) setUnreadCount(list.filter((n: any) => !n.is_read).length);
    };

    fetchUnread();

    let notifChannel: any = null;
    try {
      if (supabase?.channel) {
        notifChannel = supabase
          .channel("app-layout-notifications")
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
            fetchUnread();
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("Notifications realtime subscription notice:", err);
    }

    const updateUnread = () => {
      fetchUnread();
    };
    window.addEventListener("storage", updateUnread);
    window.addEventListener("sales_erp_storage_update", updateUnread);
    return () => {
      isMounted = false;
      try {
        if (notifChannel && supabase?.removeChannel) {
          supabase.removeChannel(notifChannel);
        }
      } catch (e) {
        // Safe fallback
      }
      window.removeEventListener("storage", updateUnread);
      window.removeEventListener("sales_erp_storage_update", updateUnread);
    };
  }, []);

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
                    <p className="text-xs text-muted-foreground truncate">{profile?.email ?? "user@saleserppro.com"}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{profile?.role_name ?? "Staff"}</Badge>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
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

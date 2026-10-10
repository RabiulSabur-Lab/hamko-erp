import { type FC } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Warehouse,
  Wallet, MapPin, BarChart3, UserCog, Bell, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "@/router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  key: string;
  icon: any;
  path: string;
}

export const navItems: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, path: "dashboard" },
  { key: "crm", icon: Users, path: "customers" },
  { key: "products", icon: Package, path: "products" },
  { key: "orders", icon: ShoppingCart, path: "orders" },
  { key: "procurement", icon: Truck, path: "procurement" },
  { key: "inventory", icon: Warehouse, path: "inventory" },
  { key: "accounts", icon: Wallet, path: "accounts" },
  { key: "sfa", icon: MapPin, path: "sfa" },
  { key: "reports", icon: BarChart3, path: "reports" },
  { key: "users", icon: UserCog, path: "users" },
  { key: "notifications", icon: Bell, path: "notifications" },
];

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export const Sidebar: FC<SidebarProps> = ({ open, onClose, unreadCount = 0 }) => {
  const { profile, user } = useAuth();
  const { t } = useI18n();
  const { path, navigate } = useRouter();

  const userRole = (
    profile?.role_name ||
    ((user as any)?.role && (user as any).role !== "authenticated" ? (user as any).role : "") ||
    (user as any)?.user_metadata?.role ||
    (user as any)?.profile?.role ||
    ((user as any)?.email?.toLowerCase().includes("officer") ? "sales_officer" : "") ||
    ""
  ).toLowerCase();

  const isSalesOfficer =
    userRole === "sales_officer" ||
    userRole === "salesofficer" ||
    userRole === "so" ||
    userRole.includes("officer") ||
    (user as any)?.role === "sales_officer" ||
    (user as any)?.user_metadata?.role === "sales_officer" ||
    (user as any)?.email?.toLowerCase().includes("officer");

  const normalizedRole = userRole.replace(/[\s_-]+/g, "");
  const isSuperAdmin =
    userRole === "super_admin" ||
    userRole === "superadmin" ||
    normalizedRole === "superadmin" ||
    normalizedRole.includes("admin") ||
    String(profile?.role_name || "").toLowerCase().includes("admin") ||
    (user as any)?.role === "super_admin" ||
    String((user as any)?.user_metadata?.role || "").toLowerCase().includes("admin") ||
    (Boolean(user?.email?.toLowerCase().includes("admin")) && !normalizedRole.includes("officer"));

  const visibleNavItems = navItems.filter((item) => {
    const itemPath = String(item.path).toLowerCase();
    const itemKey = String(item.key).toLowerCase();
    if (isSalesOfficer && (itemPath === "procurement" || itemKey === "procurement")) {
      return false;
    }
    // Accounts & Finance / Cash Collections is accessible to Super Admin, Sales Officers, Accountants, and Managers
    if (itemPath === "accounts" || itemKey === "accounts") {
      return isSuperAdmin || isSalesOfficer || normalizedRole.includes("accountant") || normalizedRole.includes("manager");
    }
    if (
      (itemPath === "reports" || itemKey === "reports" || itemPath === "users" || itemKey === "users" || itemKey === "usermanagement") &&
      !isSuperAdmin
    ) {
      return false;
    }
    return true;
  });

  const activeRoute = path === "/" ? "dashboard" : path.replace(/^\//, "").split("/")[0];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center justify-between px-6 border-b select-none">
        <img src="/Hamko.png" alt="Hamko Cookware" className="h-10 w-auto object-contain shrink-0" />
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-3 overflow-y-auto h-[calc(100vh-4rem)]">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = String(activeRoute) === String(item.path);
          return (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">{t(item.key)}</span>
              {item.key === "notifications" && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                  {unreadCount}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

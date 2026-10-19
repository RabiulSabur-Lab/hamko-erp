import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./lib/auth";
import { useRouter } from "./router";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderCreate } from "./pages/OrderCreate";
import { SupplierLedger } from "./pages/SupplierLedger";
import { PurchaseInvoice } from "./pages/PurchaseInvoice";
import { InventoryPage } from "./pages/InventoryPage";
import { AccountsPage } from "./pages/AccountsPage";
import { SfaPage } from "./pages/SfaPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { UserManagement } from "./pages/UserManagement";
import { ResetPassword } from "./pages/ResetPassword";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";

function ProtectedRoute({
  allowed,
  requireAdmin,
  redirectTo = "/",
  message = "Access Denied: Restricted Page",
  children,
}: {
  allowed?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  message?: string;
  children: ReactNode;
}) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();

  const rawRole = (
    profile?.role_name ||
    (user as any)?.user_metadata?.role ||
    (user as any)?.profile?.role ||
    (user as any)?.role_name ||
    ((user as any)?.role && (user as any).role !== "authenticated" ? (user as any).role : "") ||
    ((user as any)?.email?.toLowerCase().includes("officer") ? "sales_officer" : "") ||
    user?.role ||
    ""
  );
  const userRole = (rawRole || "").toLowerCase().replace(/[\s_-]+/g, "");

  const isAdmin =
    userRole === "super_admin" ||
    userRole === "superadmin" ||
    userRole === "admin" ||
    userRole.includes("admin") ||
    String(profile?.role_name || "").toLowerCase().includes("admin") ||
    (user as any)?.role === "super_admin" ||
    (Boolean(user?.email?.toLowerCase().includes("admin")) && !userRole.includes("officer"));

  const isAllowed = requireAdmin !== undefined ? (requireAdmin ? isAdmin : true) : (allowed ?? true);

  useEffect(() => {
    if (!isAllowed) {
      toast.error(message);
      navigate(redirectTo);
    }
  }, [isAllowed, navigate, redirectTo, message]);

  if (!isAllowed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  const { session, user, profile, loading } = useAuth();
  const { path, navigate } = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cleanPath = (path || "/").split("?")[0].split("#")[0];
  const route = cleanPath === "/" || cleanPath === "" ? "dashboard" : cleanPath.replace(/^\//, "").split("/")[0];

  // Restrict public sign up route - internal ERP accounts are strictly created by Super Admin
  useEffect(() => {
    if (cleanPath === "/signup" || route === "signup" || cleanPath.startsWith("/signup")) {
      toast.info("Registration is managed by system administrator");
      navigate(session ? "/dashboard" : "/login");
    }
  }, [cleanPath, route, session, navigate]);

  // If already authenticated and visiting auth pages, navigate to dashboard
  useEffect(() => {
    if (session && (route === "login" || route === "signin" || route === "auth" || cleanPath === "/login" || cleanPath === "/signin")) {
      navigate("/dashboard");
    }
  }, [session, route, cleanPath, navigate]);

  // Protected Route enforcement (Facebook / Gmail style):
  // When unauthenticated, visiting internal ERP routes (Dashboard, Orders, CRM/Customers, Products, etc.)
  // immediately navigates to /login so protected modules cannot be accessed without logging in.
  useEffect(() => {
    if (!session && !loading) {
      const publicRoutes = ["login", "signin", "auth", "signup", "reset-password", "landing", "about", "welcome"];
      if (!publicRoutes.includes(route) && cleanPath !== "/" && cleanPath !== "") {
        toast.info("Please sign in to access Hamko ERP");
        navigate("/login");
      }
    }
  }, [session, loading, route, cleanPath, navigate]);

  if (cleanPath === "/reset-password" || cleanPath.startsWith("/reset-password") || route === "reset-password") {
    return (
      <ErrorBoundary name="ResetPassword">
        <ResetPassword />
      </ErrorBoundary>
    );
  }

  if (!session) {
    if (route === "signup" || cleanPath === "/signup" || cleanPath.startsWith("/signup")) {
      return (
        <ErrorBoundary name="AuthPage:SignUp">
          <AuthPage />
        </ErrorBoundary>
      );
    }
    if (route === "signin" || route === "auth" || route === "login" || cleanPath === "/login" || cleanPath === "/signin") {
      return (
        <ErrorBoundary name="AuthPage:SignIn">
          <AuthPage />
        </ErrorBoundary>
      );
    }
    if (route === "landing" || cleanPath === "/landing" || route === "about" || cleanPath === "/about" || route === "welcome" || cleanPath === "/welcome") {
      return (
        <ErrorBoundary name="LandingPage">
          <LandingPage />
        </ErrorBoundary>
      );
    }
    // Protected routes fallback: Unauthenticated users visiting root or any internal route
    // see the Auth Login Page (Facebook/Gmail style)
    return (
      <ErrorBoundary name="AuthPage:ProtectedLogin">
        <AuthPage />
      </ErrorBoundary>
    );
  }

  // Role-based access control (RBAC): inspect exact user role structure
  const rawRole = (
    profile?.role_name ||
    (user as any)?.user_metadata?.role ||
    (user as any)?.profile?.role ||
    (user as any)?.role_name ||
    ((user as any)?.role && (user as any).role !== "authenticated" ? (user as any).role : "") ||
    ((user as any)?.email?.toLowerCase().includes("officer") ? "sales_officer" : "") ||
    user?.role ||
    ""
  );
  const userRole = (rawRole || "").toLowerCase().replace(/[\s_-]+/g, "");
  const isSalesOfficer =
    userRole === "sales_officer" ||
    userRole === "salesofficer" ||
    userRole === "so" ||
    userRole.includes("officer") ||
    (user as any)?.role === "sales_officer" ||
    (user as any)?.user_metadata?.role === "sales_officer" ||
    (user as any)?.email?.toLowerCase().includes("officer");

  const isSuperAdmin =
    userRole === "super_admin" ||
    userRole === "superadmin" ||
    userRole === "admin" ||
    userRole.includes("admin") ||
    String(profile?.role_name || "").toLowerCase().includes("admin") ||
    (user as any)?.role === "super_admin" ||
    (Boolean(user?.email?.toLowerCase().includes("admin")) && !userRole.includes("officer"));

  const page = (() => {
    if (
      cleanPath === "/orders/create" ||
      cleanPath.startsWith("/orders/create") ||
      cleanPath === "/sales/entry" ||
      cleanPath === "/sales-entry" ||
      cleanPath === "/sales/new" ||
      cleanPath === "/sales-order"
    ) {
      return <OrderCreate />;
    }
    if (cleanPath === "/procurement/new" || cleanPath === "/procurement/entry" || cleanPath === "/procurement-entry" || cleanPath === "/purchases/new" || cleanPath === "/purchase-invoice") {
      return (
        <ProtectedRoute allowed={!isSalesOfficer} redirectTo="/">
          <PurchaseInvoice />
        </ProtectedRoute>
      );
    }

    switch (route) {
      case "dashboard": return <DashboardPage />;
      case "customers": return <CustomersPage />;
      case "products": return <ProductsPage />;
      case "orders": return <OrdersPage />;
      case "order-create":
      case "create-order": return <OrderCreate />;
      case "procurement":
      case "supplier-ledger":
      case "suppliers":
        return (
          <ProtectedRoute allowed={!isSalesOfficer} redirectTo="/">
            <SupplierLedger />
          </ProtectedRoute>
        );
      case "inventory": return <InventoryPage />;
      case "accounts":
      case "collections":
      case "cash-collection":
      case "cash-collections":
      case "cashbook":
        return (
          <ProtectedRoute
            allowed={isSuperAdmin || isSalesOfficer || userRole.includes("accountant") || userRole.includes("manager")}
            redirectTo="/"
            message="Access Denied: Restricted Page"
          >
            <AccountsPage />
          </ProtectedRoute>
        );
      case "sfa": return <SfaPage />;
      case "reports":
        return (
          <ProtectedRoute
            requireAdmin
            allowed={isSuperAdmin}
            redirectTo="/"
            message="Access Denied: Financial reports are restricted to administrators"
          >
            <ReportsPage />
          </ProtectedRoute>
        );
      case "users":
      case "user-management":
        return (
          <ProtectedRoute allowed={isSuperAdmin} requireAdmin redirectTo="/" message="Access Denied: Restricted Page">
            <UserManagement />
          </ProtectedRoute>
        );
      case "notifications": return <NotificationsPage />;
      case "reset-password": return <ResetPassword />;
      default: return <DashboardPage />;
    }
  })();

  return (
    <ErrorBoundary name="AppLayout">
      <AppLayout>
        <ErrorBoundary name={`Page:${route}`}>
          {page}
        </ErrorBoundary>
      </AppLayout>
    </ErrorBoundary>
  );
}

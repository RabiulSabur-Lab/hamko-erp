import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBDT, toBnDigit } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Users, ArrowUpRight, RefreshCw, ShoppingCart, Wallet,
  Truck, Warehouse, MapPin, BookOpen, PlusCircle, Sparkles,
  Package, Calendar, Clock, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useRouter } from "@/router";
import { AIInsightsWidget } from "@/components/AIInsightsWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  r2,
  deduplicateCollections,
  deduplicateOrders,
  calculateCustomerDues,
  getDeletedIds,
  STORAGE_KEYS,
} from "@/utils/localStore";

interface KpiData {
  todaySales: number;
  monthSales: number;
  totalRevenue: number;
  collection: number;
  totalCollections: number;
  outstandingDue: number;
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  lowStockCount: number;
}

interface KpiTrends {
  todaySales: number | null;
  monthSales: number | null;
  collection: number | null;
  outstandingDue: number | null;
  totalCustomers: number | null;
  activeCustomers: number | null;
}

const EMPTY_KPI: KpiData = {
  todaySales: 0,
  monthSales: 0,
  totalRevenue: 0,
  collection: 0,
  totalCollections: 0,
  outstandingDue: 0,
  totalCustomers: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  lowStockCount: 0,
};

const EMPTY_TRENDS: KpiTrends = {
  todaySales: null,
  monthSales: null,
  collection: null,
  outstandingDue: null,
  totalCustomers: null,
  activeCustomers: null,
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Pending: "#f59e0b",
  Approved: "#3b82f6",
  Delivered: "#10b981",
  Cancelled: "#ef4444",
};

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

function calcGrowth(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) {
    return Number.isFinite(current) && current > 0 ? 100 : null;
  }
  if (!Number.isFinite(current)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatTrend(val: number | null): string {
  if (val === null) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function WidgetErrorCard({
  title,
  onRetry,
  lang,
}: {
  title: string;
  onRetry: () => void;
  lang: string;
}) {
  return (
    <Card className="border-amber-200/80 dark:border-amber-800/60">
      <CardContent className="flex flex-col items-center justify-center gap-2.5 py-8 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {lang === "bn"
            ? "এই অংশটি লোড করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।"
            : "Unable to display this widget right now. Please try refreshing."}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="h-7 text-xs gap-1.5 mt-1">
          <RefreshCw className="h-3 w-3" />
          {lang === "bn" ? "পুনরায় চেষ্টা" : "Retry"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton loader for KPI cards ───────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-lg border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
              <div className="h-5 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-24 rounded bg-muted animate-pulse mt-3" />
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t, lang } = useI18n();
  const { navigate } = useRouter();
  const [mobileTab, setMobileTab] = useState<"dashboard" | "timeline">("dashboard");

  const {
    orders,
    collections,
    customers,
    products,
    prevMetrics,
    loading,
    refreshing,
    lastSynced,
    refresh,
  } = useDashboardData(lang === "bn" ? "bn" : "en");

  // ── High-Performance KPI & Growth calculations (Single-Pass, Safe Fallback) ──
  const { kpi, trends } = useMemo(() => {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
      const currentMonthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthPrefix = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}`;

      const validOrders = deduplicateOrders(orders, { excludeDrafts: true, excludeCancelled: true });

      let todaySales = 0;
      let yesterdaySales = 0;
      let monthSales = 0;
      let prevMonthSales = 0;
      let totalRevenue = 0;

      for (let i = 0; i < validOrders.length; i++) {
        const o = validOrders[i];
        const amt = Number(o.total_amount || 0);
        totalRevenue += amt;
        const dStr = String(o.order_date || o.created_at || "").slice(0, 10);
        if (dStr === todayStr) todaySales += amt;
        else if (dStr === yesterdayStr) yesterdaySales += amt;
        if (dStr.startsWith(currentMonthPrefix)) monthSales += amt;
        else if (dStr.startsWith(prevMonthPrefix)) prevMonthSales += amt;
      }
      todaySales = r2(todaySales);
      yesterdaySales = r2(yesterdaySales);
      monthSales = r2(monthSales);
      prevMonthSales = r2(prevMonthSales);
      totalRevenue = r2(totalRevenue);

      const uniqueCollections = deduplicateCollections(collections);
      let monthCollections = 0;
      let totalCollections = 0;
      let calculatedPrevMonthCollections = 0;

      for (let i = 0; i < uniqueCollections.length; i++) {
        const c = uniqueCollections[i];
        const amt = Number(c.amount || 0);
        totalCollections += amt;
        const cDate = String(c.collection_date || c.created_at || "").slice(0, 10);
        if (cDate.startsWith(currentMonthPrefix)) monthCollections += amt;
        else if (cDate.startsWith(prevMonthPrefix)) calculatedPrevMonthCollections += amt;
      }
      monthCollections = r2(monthCollections);
      totalCollections = r2(totalCollections);
      const collection = monthCollections;

      const prevMonthCollections =
        prevMetrics.prevCollection || r2(calculatedPrevMonthCollections);

      const { totalDue: outstandingDue } = calculateCustomerDues(customers, orders, uniqueCollections);

      let activeCount = 0;
      let inactiveCount = 0;
      const custList = Array.isArray(customers) ? customers : [];
      for (let i = 0; i < custList.length; i++) {
        const c = custList[i];
        if (!c) continue;
        if ((c.status === "Active" || !c.status) && c.status !== "Inactive" && c.is_active !== false) {
          activeCount++;
        } else {
          inactiveCount++;
        }
      }
      const totalCustomers = custList.length;

      let lowStockCount = 0;
      const prodList = Array.isArray(products) ? products : [];
      for (let i = 0; i < prodList.length; i++) {
        const p = prodList[i];
        if (!p) continue;
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        const minStock = Number(p.reorder_level ?? p.minStockThreshold ?? 5);
        if (stock <= minStock) lowStockCount++;
      }

      const k: KpiData = {
        todaySales, monthSales, totalRevenue, collection, totalCollections,
        outstandingDue, totalCustomers, activeCustomers: activeCount,
        inactiveCustomers: inactiveCount, lowStockCount,
      };

      const tr: KpiTrends = {
        todaySales: calcGrowth(todaySales, yesterdaySales),
        monthSales: calcGrowth(monthSales, prevMonthSales),
        collection: calcGrowth(collection, prevMonthCollections),
        outstandingDue: calcGrowth(outstandingDue, prevMetrics.prevDue),
        totalCustomers: calcGrowth(totalCustomers, prevMetrics.prevCustCount),
        activeCustomers: calcGrowth(activeCount, prevMetrics.prevCustCount),
      };

      return { kpi: k, trends: tr };
    } catch (err) {
      console.warn("[Dashboard] KPI calculation fallback triggered:", err);
      return { kpi: EMPTY_KPI, trends: EMPTY_TRENDS };
    }
  }, [orders, collections, customers, products, prevMetrics]);

  // ── 7-day Sales Trend (Optimized single pass) ──────────────────────────────
  const trend = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_AGO = todayMidnight - 6 * ONE_DAY_MS;

    const days: { date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayMidnight - i * ONE_DAY_MS);
      const label = d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en", { weekday: "short" });
      days.push({ date: label, sales: 0 });
    }

    if (!Array.isArray(orders) || orders.length === 0) return days;

    try {
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (!o || o.status === "Cancelled" || o.status === "Draft") continue;
        const rawDate = o.order_date || o.created_at;
        if (!rawDate) continue;
        const od = new Date(rawDate);
        if (isNaN(od.getTime())) continue;
        const orderMidnight = new Date(od.getFullYear(), od.getMonth(), od.getDate()).getTime();
        if (orderMidnight < SEVEN_DAYS_AGO || orderMidnight > todayMidnight) continue;

        const diffDays = Math.round((todayMidnight - orderMidnight) / ONE_DAY_MS);
        const idx = 6 - diffDays;
        if (idx >= 0 && idx < 7) {
          days[idx].sales = r2(days[idx].sales + Number(o.total_amount || 0));
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Sales trend calculation fallback triggered:", err);
    }

    return days;
  }, [orders, lang]);

  // ── Top 5 Products (Optimized O(1) Catalog Map) ────────────────────────────
  const topProducts = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];

    try {
      const productMap = new Map<string, any>();
      if (Array.isArray(products)) {
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          if (p?.id) productMap.set(String(p.id), p);
        }
      }
      const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
      const salesMap = new Map<string, { id: string; name: string; category: string; soldQty: number; totalSales: number }>();

      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (!o || o.status === "Cancelled" || o.status === "Draft") continue;
        const items = o.order_items || o.items;
        if (!Array.isArray(items)) continue;

        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          if (!it) continue;
          const prodId = it.product_id ? String(it.product_id) : "";
          if (prodId && deletedProdIds.has(prodId)) continue;

          const matchedProd = prodId ? productMap.get(prodId) : null;
          const name = it.product?.name || matchedProd?.name || (prodId ? "Product" : "[Deleted Product]");
          const key = prodId || name;
          const qty = Number(it.quantity || 0);
          const unitPrice = Number(it.unit_price || matchedProd?.unit_price || 0);
          const revenue = Number(it.subtotal ?? it.total_price ?? qty * unitPrice) || 0;
          const rawCategory = matchedProd?.category || it.product?.category;
          const category =
            typeof rawCategory === "object"
              ? rawCategory?.name || "General"
              : rawCategory || matchedProd?.category_name || "General";

          const existing = salesMap.get(key);
          if (existing) {
            existing.soldQty += qty;
            existing.totalSales = r2(existing.totalSales + revenue);
          } else {
            salesMap.set(key, { id: key, name, category, soldQty: qty, totalSales: r2(revenue) });
          }
        }
      }

      return Array.from(salesMap.values())
        .filter((p) => p.soldQty > 0 || p.totalSales > 0)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);
    } catch (err) {
      console.warn("[Dashboard] Top products fallback triggered:", err);
      return [];
    }
  }, [orders, products]);

  // ── Recent Orders ───────────────────────────────────────────────────────────
  const recentOrders = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    try {
      return [...orders]
        .filter((o: any) => o && o.status !== "Cancelled")
        .sort(
          (a: any, b: any) =>
            (new Date(b.order_date || b.created_at || 0).getTime() || 0) -
            (new Date(a.order_date || a.created_at || 0).getTime() || 0),
        )
        .slice(0, 5);
    } catch {
      return [];
    }
  }, [orders]);

  // ── Sales by Status ─────────────────────────────────────────────────────────
  const salesByStatus = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    try {
      const statusMap: Record<string, number> = {};
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (!o || !o.status) continue;
        const amt = Number(o.total_amount || 0);
        if (amt <= 0) continue;
        statusMap[o.status] = r2((statusMap[o.status] ?? 0) + amt);
      }
      return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    } catch {
      return [];
    }
  }, [orders]);

  // ── KPI Card definitions ────────────────────────────────────────────────────
  const kpiCards = useMemo(
    () => [
      {
        label: t("todaysSales"), value: formatBDT(kpi.todaySales),
        icon: DollarSign, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30",
        trend: formatTrend(trends.todaySales), up: (trends.todaySales ?? 0) >= 0, route: "orders",
      },
      {
        label: t("monthlySales"), value: formatBDT(kpi.monthSales),
        icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30",
        trend: formatTrend(trends.monthSales), up: (trends.monthSales ?? 0) >= 0, route: "orders",
      },
      {
        label: t("monthlyCollection") || (lang === "bn" ? "চলতি মাসের কালেকশন" : "Current Month Collection"),
        subtitle: lang === "bn" ? `সর্বমোট: ${formatBDT(kpi.totalCollections)}` : `Lifetime: ${formatBDT(kpi.totalCollections)}`,
        value: formatBDT(kpi.collection),
        icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30",
        trend: formatTrend(trends.collection), up: (trends.collection ?? 0) >= 0, route: "accounts",
      },
      {
        label: t("outstandingDue"), value: formatBDT(kpi.outstandingDue),
        icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30",
        trend: formatTrend(trends.outstandingDue), up: (trends.outstandingDue ?? 0) < 0, route: "accounts",
      },
      {
        label: t("totalCustomers") || "Total Customers",
        value: String(kpi.totalCustomers),
        icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30",
        trend: formatTrend(trends.totalCustomers), up: (trends.totalCustomers ?? 0) >= 0, route: "customers",
        breakdown: { active: kpi.activeCustomers, inactive: kpi.inactiveCustomers },
      },
      {
        label: t("lowStockProducts"), value: String(kpi.lowStockCount),
        icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30",
        trend: kpi.lowStockCount > 0 ? "Alert" : "OK", up: false, route: "inventory",
      },
    ],
    [kpi, trends, t, lang]
  );

  const formatXAxisTick = useCallback(
    (v: unknown) => (lang === "bn" ? toBnDigit(String(v ?? "")) : String(v ?? "")),
    [lang],
  );

  const formatYAxisTick = useCallback(
    (v: unknown) => {
      const rawK = `${(Number(v || 0) / 1000).toFixed(0)}k`;
      return lang === "bn" ? toBnDigit(rawK) : rawK;
    },
    [lang],
  );

  const formatAreaTooltip = useCallback(
    (v: number) => [formatBDT(Number(v || 0), lang), t("totalSales")],
    [lang, t],
  );

  const formatPieTooltip = useCallback(
    (v: number) => formatBDT(Number(v || 0), lang),
    [lang],
  );

  // ── Fintech-Style Quick Action Hub Tiles ────────────────────────────────────
  const quickActions = useMemo(
    () => [
      {
        key: "new-order",
        label: lang === "bn" ? "+ নতুন অর্ডার" : "+ New Order",
        sub: lang === "bn" ? "ইনভয়েস তৈরি" : "Create Invoice",
        icon: ShoppingCart,
        iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        onClick: () => navigate("orders/create"),
      },
      {
        key: "cash-collection",
        label: lang === "bn" ? "$ ক্যাশ কালেকশন" : "$ Cash Collection",
        sub: lang === "bn" ? "বকেয়া আদায়" : "Receive Payment",
        icon: Wallet,
        iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25",
        onClick: () => navigate("accounts"),
      },
      {
        key: "purchase-chalan",
        label: lang === "bn" ? "+ পারচেজ চালান" : "+ Purchase Chalan",
        sub: lang === "bn" ? "সাপ্লায়ার লেজার" : "Stock & Payable",
        icon: Truck,
        iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25",
        onClick: () => navigate("procurement"),
      },
      {
        key: "add-customer",
        label: lang === "bn" ? "+ কাস্টমার" : "+ Customers",
        sub: lang === "bn" ? "ডিলার ও রিটেইলার" : "CRM Directory",
        icon: Users,
        iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25",
        onClick: () => navigate("customers"),
      },
      {
        key: "inventory-stock",
        label: lang === "bn" ? "ইনভেন্টরি স্টক" : "Inventory Stock",
        sub: lang === "bn" ? "মজুদ ও অ্যালার্ট" : "Warehouse SKUs",
        icon: Warehouse,
        iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
        onClick: () => navigate("inventory"),
      },
      {
        key: "field-sfa",
        label: lang === "bn" ? "ফিল্ড ভিজিট" : "Field Visit (SFA)",
        sub: lang === "bn" ? "রুট ও হ্যান্ডওভার" : "Route & Handover",
        icon: MapPin,
        iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
        onClick: () => navigate("sfa"),
      },
      {
        key: "user-manual",
        label: lang === "bn" ? "ব্যবহারবিধি" : "User Manual",
        sub: lang === "bn" ? "সচিত্র গাইড PDF" : "A-Z Guide & PDF",
        icon: BookOpen,
        iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
        onClick: () => navigate("manual"),
      },
      {
        key: "live-sync",
        label: refreshing
          ? lang === "bn"
            ? "সিঙ্ক হচ্ছে..."
            : "Syncing..."
          : lang === "bn"
            ? "লাইভ সিঙ্ক"
            : "Live Sync",
        sub: lang === "bn" ? "ক্লাউড আপডেট" : "Cloud Refresh",
        icon: RefreshCw,
        iconBg: "bg-primary/15 text-primary border-primary/25",
        spin: refreshing,
        onClick: () => void refresh(true),
      },
    ],
    [lang, navigate, refresh, refreshing],
  );

  // ── 9-Tile Mobile Corporate 3-Column Utility Grid (3x3) ────────────────────
  const mobileUtilityModules = useMemo(
    () => [
      {
        key: "order-entry",
        label: lang === "bn" ? "অর্ডার এন্ট্রি" : "Order Entry",
        sub: lang === "bn" ? "+ নতুন ইনভয়েস" : "+ New Invoice",
        icon: ShoppingCart,
        iconStyle: "bg-[#0f3460]/10 text-[#0f3460] dark:bg-sky-500/15 dark:text-sky-300 border-[#0f3460]/20",
        onClick: () => navigate("orders/create"),
      },
      {
        key: "cash-collection",
        label: lang === "bn" ? "কালেকশন" : "Collections",
        sub: lang === "bn" ? "নগদ ও বকেয়া" : "Receive Due",
        icon: Wallet,
        iconStyle: "bg-teal-700/10 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300 border-teal-700/20",
        onClick: () => navigate("accounts"),
      },
      {
        key: "products-stock",
        label: lang === "bn" ? "পণ্য ও স্টক" : "Products & SKU",
        sub: lang === "bn" ? "দর ও ক্যাটালগ" : "Price Catalog",
        icon: Package,
        iconStyle: "bg-blue-700/10 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border-blue-700/20",
        onClick: () => navigate("products"),
      },
      {
        key: "crm-dealers",
        label: lang === "bn" ? "CRM ডিলার" : "CRM Dealers",
        sub: lang === "bn" ? "দোকান তালিকা" : "Outlets & Due",
        icon: Users,
        iconStyle: "bg-indigo-700/10 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-700/20",
        onClick: () => navigate("customers"),
      },
      {
        key: "warehouse-inv",
        label: lang === "bn" ? "গোডাউন মজুদ" : "Warehouse",
        sub: lang === "bn" ? "লাইভ ইনভেন্টরি" : "Stock Status",
        icon: Warehouse,
        iconStyle: "bg-sky-700/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 border-sky-700/20",
        onClick: () => navigate("inventory"),
      },
      {
        key: "field-visit",
        label: lang === "bn" ? "ফিল্ড ভিজিট" : "Field Visit",
        sub: lang === "bn" ? "ভিজিট ও পিন" : "SFA & PIN",
        icon: MapPin,
        iconStyle: "bg-emerald-700/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-700/20",
        onClick: () => navigate("sfa"),
      },
      {
        key: "time-table",
        label: lang === "bn" ? "রুট টাইমটেবিল" : "Time Table",
        sub: lang === "bn" ? "সাপ্তাহিক রুট" : "Route Plan",
        icon: Calendar,
        iconStyle: "bg-slate-700/10 text-slate-800 dark:bg-slate-500/15 dark:text-slate-300 border-slate-700/20",
        onClick: () => navigate("sfa"),
      },
      {
        key: "purchase-chalan",
        label: lang === "bn" ? "পারচেজ চালান" : "Procurement",
        sub: lang === "bn" ? "ফ্যাক্টরি চালান" : "Chalan & Ledger",
        icon: Truck,
        iconStyle: "bg-cyan-700/10 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border-cyan-700/20",
        onClick: () => navigate("procurement"),
      },
      {
        key: "info-desk",
        label: lang === "bn" ? "Info Desk গাইড" : "Info Desk",
        sub: lang === "bn" ? "সচিত্র ম্যানুয়াল" : "User Manual",
        icon: BookOpen,
        iconStyle: "bg-blue-900/10 text-blue-900 dark:bg-blue-400/15 dark:text-blue-300 border-blue-900/20",
        onClick: () => navigate("manual"),
      },
    ],
    [lang, navigate],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 md:space-y-6">
      {/* =====================================================================
          MOBILE-FIRST NATIVE CORPORATE APP INTERFACE (< 768px / md:hidden)
          Official Hamko Deep Corporate Blue / Navy Blue Palette
         ===================================================================== */}
      <div className="block md:hidden max-w-md mx-auto space-y-4">
        {/* 1. Official Hamko Corporate Brand Header Card & Segmented Toggle Tabs */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0a2540] via-[#0f3460] to-[#1e3a8a] text-white p-4 shadow-md space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {lang === "bn" ? "হামকো কর্পোরেট ইআরপি" : "HAMKO CORPORATE ERP"}
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight text-white mt-1.5">
                {lang === "bn" ? "সেলস ও অপারেশনস ড্যাশবোর্ড" : "Sales & Operations Hub"}
              </h2>
              {lastSynced && (
                <p className="text-[10.5px] text-blue-200 mt-0.5">
                  {lang === "bn" ? "লাইভ সিঙ্ক: " : "Last synced: "}
                  {lastSynced.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? (lang === "bn" ? "সিঙ্ক..." : "Sync...") : (lang === "bn" ? "সিঙ্ক" : "Sync")}</span>
            </button>
          </div>

          {/* Compact Corporate KPI Summary Strip inside Deep Blue Header */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div
              onClick={() => navigate("orders")}
              className="rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 cursor-pointer"
            >
              <p className="text-[10px] text-blue-200 truncate">
                {lang === "bn" ? "আজকের বিক্রি" : "Today's Sales"}
              </p>
              <p className="text-xs font-extrabold text-white mt-0.5 truncate">
                {formatBDT(kpi.todaySales, lang)}
              </p>
            </div>
            <div
              onClick={() => navigate("accounts")}
              className="rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 cursor-pointer"
            >
              <p className="text-[10px] text-blue-200 truncate">
                {lang === "bn" ? "মাসের আদায়" : "Collection"}
              </p>
              <p className="text-xs font-extrabold text-emerald-300 mt-0.5 truncate">
                {formatBDT(kpi.collection, lang)}
              </p>
            </div>
            <div
              onClick={() => navigate("customers")}
              className="rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 cursor-pointer"
            >
              <p className="text-[10px] text-blue-200 truncate">
                {lang === "bn" ? "মার্কেট বকেয়া" : "Market Due"}
              </p>
              <p className="text-xs font-extrabold text-amber-300 mt-0.5 truncate">
                {formatBDT(kpi.outstandingDue, lang)}
              </p>
            </div>
          </div>

          {/* Segmented Toggle Tabs (ড্যাশবোর্ড / টাইমলাইন) */}
          <div className="grid grid-cols-2 rounded-xl bg-[#07192e]/70 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => setMobileTab("dashboard")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileTab === "dashboard"
                  ? "bg-white text-[#0a2540] shadow-xs"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              {lang === "bn" ? "ড্যাশবোর্ড (Modules)" : "Dashboard"}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("timeline")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileTab === "timeline"
                  ? "bg-white text-[#0a2540] shadow-xs"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              {lang === "bn" ? "টাইমলাইন (Timeline)" : "Timeline"}
            </button>
          </div>
        </div>

        {/* 2A. Mobile Tab 1: 3-Column Rounded Icon Card Grid + Corporate Summary Cards */}
        {mobileTab === "dashboard" ? (
          <>
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0a2540] dark:text-sky-300 uppercase tracking-wide">
                  {lang === "bn" ? "কর্পোরেট মডিউল ও সেবা (Quick Modules)" : "Enterprise Modules"}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {lang === "bn" ? "ট্যাপ করে খুলুন" : "Tap to open"}
                </span>
              </div>

              {/* 3-Column Rounded Icon Grid (grid-cols-3 gap-3) */}
              <div className="grid grid-cols-3 gap-3">
                {mobileUtilityModules.map((mod) => {
                  const ModIcon = mod.icon;
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={mod.onClick}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 p-3 text-center shadow-2xs transition-all active:scale-95 focus:outline-none"
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-2xs ${mod.iconStyle}`}
                      >
                        <ModIcon className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-bold text-foreground leading-tight line-clamp-1">
                        {mod.label}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight line-clamp-1">
                        {mod.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary 2-Column Mobile KPI Status Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {kpiCards.map((card: any) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    onClick={() => navigate(card.route)}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-3.5 shadow-2xs cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0f3460]/10 dark:bg-sky-500/15 text-[#0f3460] dark:text-sky-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant={card.up ? "success" : "secondary"} className="text-[9.5px] px-1.5 py-0">
                        {card.trend}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground mt-2 truncate">{card.label}</p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5 truncate">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* 2B. Mobile Tab 2: Timeline & Card-Based List Modules (Recent Orders & Top Products) */
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#0f3460] dark:text-sky-400" />
                  <span className="text-xs font-extrabold text-foreground">
                    {lang === "bn" ? "সাম্প্রতিক অর্ডার টাইমলাইন" : "Recent Order Activity"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("orders")}
                  className="text-[11px] font-bold text-[#0f3460] dark:text-sky-400"
                >
                  {t("viewAll")} →
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">{t("noData")}</div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((o, idx) => {
                    const statusLabel = String(o?.status || "Pending");
                    const isComplete = statusLabel === "Delivered";
                    return (
                      <div
                        key={o?.id || o?.order_number || idx}
                        onClick={() => navigate("orders")}
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-3 cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0f3460]/10 dark:bg-sky-500/15 text-[#0f3460] dark:text-sky-300 mt-0.5">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">
                              {o?.customer?.name ?? "Retail Outlet"}
                            </p>
                            <p className="text-[10.5px] font-mono text-muted-foreground truncate">
                              {o?.order_number || "—"} • {o?.order_date ? String(o.order_date).slice(0, 10) : "Today"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className="text-xs font-extrabold text-foreground">
                            {formatBDT(Number(o?.total_amount || 0), lang)}
                          </p>
                          <span
                            className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                              isComplete
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {isComplete ? (lang === "bn" ? "Complete" : "Complete") : statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          DESKTOP ENTERPRISE WEB ERP INTERFACE (>= 768px)
         ===================================================================== */}
      {/* 1. Desktop Enterprise Web ERP Header */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">{t("dashboard") || "Dashboard"}</h1>
            <Badge variant="outline" className="text-[11px] font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
              {lang === "bn" ? "লাইভ ইআরপি" : "Enterprise Live"}
            </Badge>
          </div>
          {lastSynced && (
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "bn" ? "সর্বশেষ আপডেট: " : "Last synced: "}
              {lastSynced.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate("orders/create")}
            className="gap-1.5 text-xs h-8 rounded-lg"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {lang === "bn" ? "+ নতুন অর্ডার" : "+ New Order"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("accounts")}
            className="gap-1.5 text-xs h-8 rounded-lg"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            {lang === "bn" ? "ক্যাশ কালেকশন" : "Cash Collection"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => void refresh(true)}
            className="gap-1.5 text-xs h-8 rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing
              ? lang === "bn"
                ? "লোড হচ্ছে..."
                : "Syncing..."
              : lang === "bn"
                ? "রিফ্রেশ"
                : "Refresh"}
          </Button>
        </div>
      </div>

      {/* 2. Desktop Corporate Enterprise Quick Operations Bar */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {quickActions.map((act) => {
          const ActIcon = act.icon;
          return (
            <button
              key={act.key}
              type="button"
              onClick={act.onClick}
              disabled={act.key === "live-sync" && refreshing}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left shadow-2xs transition-colors hover:bg-accent/60 hover:border-primary/40 focus:outline-none"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${act.iconBg}`}
              >
                <ActIcon className={`h-4 w-4 ${act.spin ? "animate-spin" : ""}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{act.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{act.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Desktop Enterprise KPI Summary Cards */}
      <div className="hidden md:block">
      <ErrorBoundary
        name="Widget:KpiCards"
        fallbackRender={({ resetErrorBoundary }) => (
          <WidgetErrorCard
            title="KPI Summary Unavailable"
            onRetry={() => {
              resetErrorBoundary();
              void refresh(true);
            }}
            lang={lang}
          />
        )}
      >
        {loading ? (
          <KpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {kpiCards.map((card: any) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.label}
                  className="overflow-hidden rounded-lg border-border cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm flex flex-col justify-between"
                  onClick={() => navigate(card.route)}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                          <Icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                        <Badge variant={card.up ? "success" : "secondary"} className="text-[10px]">
                          {card.up ? (
                            <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {card.trend}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">{card.label}</p>
                      <p className="text-base md:text-lg font-bold mt-0.5 truncate">{card.value}</p>
                      {card.subtitle && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium truncate">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    {card.breakdown && (
                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-border/40 text-[10px] font-semibold">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active: {card.breakdown.active}
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Inactive: {card.breakdown.inactive}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ErrorBoundary>
      </div>

      {/* AI Executive Insights Widget */}
      <ErrorBoundary
        name="Widget:AIInsights"
        fallbackRender={({ resetErrorBoundary }) => (
          <WidgetErrorCard
            title="AI Insights Unavailable"
            onRetry={() => {
              resetErrorBoundary();
              void refresh(true);
            }}
            lang={lang}
          />
        )}
      >
        <AIInsightsWidget
          orders={orders}
          products={products}
          collections={collections}
          customers={customers}
          onSyncCloud={() => refresh(false)}
        />
      </ErrorBoundary>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales trend */}
        <ErrorBoundary
          name="Widget:SalesTrendChart"
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="lg:col-span-2">
              <WidgetErrorCard
                title={t("salesTrend") || "Sales Trend"}
                onRetry={() => {
                  resetErrorBoundary();
                  void refresh(true);
                }}
                lang={lang}
              />
            </div>
          )}
        >
          <Card className="lg:col-span-2 min-w-0 min-h-[320px] overflow-hidden rounded-lg border-border shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">{t("salesTrend")}</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <div className="flex h-[260px] items-center justify-center">
                  <div className="h-40 w-full rounded-lg bg-muted/40 animate-pulse" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260} minWidth={0} debounce={100}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={formatXAxisTick}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={formatYAxisTick}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={formatAreaTooltip}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} fill="url(#salesGradient)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* Sales by status */}
        <ErrorBoundary
          name="Widget:SalesByStatusChart"
          fallbackRender={({ resetErrorBoundary }) => (
            <WidgetErrorCard
              title={t("salesByStatus") || "Sales by Status"}
              onRetry={() => {
                resetErrorBoundary();
                void refresh(true);
              }}
              lang={lang}
            />
          )}
        >
          <Card className="min-w-0 min-h-[320px] overflow-hidden rounded-lg border-border shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">{t("salesByStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <div className="flex h-[260px] items-center justify-center">
                  <div className="h-40 w-40 rounded-full bg-muted/40 animate-pulse" />
                </div>
              ) : salesByStatus.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{t("noData")}</div>
              ) : (
                <ResponsiveContainer width="100%" height={260} minWidth={0} debounce={100}>
                  <PieChart>
                    <Pie data={salesByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                      {salesByStatus.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatPieTooltip} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <ErrorBoundary
          name="Widget:TopProducts"
          fallbackRender={({ resetErrorBoundary }) => (
            <WidgetErrorCard
              title={t("topSellingProducts") || "Top Products"}
              onRetry={() => {
                resetErrorBoundary();
                void refresh(true);
              }}
              lang={lang}
            />
          )}
        >
          <Card className="overflow-hidden rounded-lg border-border shadow-2xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">{t("topSellingProducts")}</CardTitle>
              <Badge variant="outline" className="rounded-md px-2 text-[11px] font-medium text-muted-foreground">Top 5</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 w-full rounded-lg bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{t("noData")}</div>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, idx) => (
                    <div key={p.id || p.name} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatBDT(p.totalSales)}</p>
                        <p className="text-xs text-muted-foreground">{p.soldQty} pcs sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* Recent orders */}
        <ErrorBoundary
          name="Widget:RecentOrders"
          fallbackRender={({ resetErrorBoundary }) => (
            <WidgetErrorCard
              title={t("recentOrders") || "Recent Orders"}
              onRetry={() => {
                resetErrorBoundary();
                void refresh(true);
              }}
              lang={lang}
            />
          )}
        >
          <Card className="overflow-hidden rounded-lg border-border shadow-2xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">{t("recentOrders")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("orders")} className="rounded-md text-xs gap-1">
                {t("viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 w-full rounded-lg bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{t("noData")}</div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((o, idx) => {
                    const statusLabel = String(o?.status || "Pending");
                    return (
                      <div key={o?.id || o?.order_number || idx} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{o?.order_number || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{o?.customer?.name ?? "—"}</p>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className="text-sm font-bold">{formatBDT(Number(o?.total_amount || 0))}</p>
                          <Badge
                            variant={statusLabel === "Delivered" ? "success" : statusLabel === "Cancelled" ? "destructive" : "secondary"}
                            className="rounded-md px-2 text-[10px]"
                          >
                            {t(statusLabel.toLowerCase()) || statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>
    </div>
  );
}

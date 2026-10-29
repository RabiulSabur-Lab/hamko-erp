import { useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBDT, toBnDigit } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Users, ArrowUpRight, RefreshCw, WifiOff,
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
        <Card key={i} className="overflow-hidden">
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

  const {
    orders,
    collections,
    customers,
    products,
    prevMetrics,
    loading,
    refreshing,
    isFallbackData,
    lastSynced,
    connectionIssue,
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header row: title + sync indicator + refresh button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{t("dashboard") || "Dashboard"}</h1>
            {!loading && isFallbackData && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                {lang === "bn" ? "ক্যাশড মোড" : "Cached Fallback"}
              </Badge>
            )}
          </div>
          {lastSynced && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "bn" ? "সর্বশেষ আপডেট: " : "Last synced: "}
              {lastSynced.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void refresh(true)}
          className="gap-2 text-xs h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing
            ? (lang === "bn" ? "লোড হচ্ছে..." : "Syncing...")
            : (lang === "bn" ? "রিফ্রেশ" : "Refresh")}
        </Button>
      </div>

      {/* Connection / Network / CORS fallback banner with Retry action */}
      {connectionIssue && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            {connectionIssue.kind === "offline" || connectionIssue.kind === "cors_or_network" ? (
              <WifiOff className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-xs sm:text-sm leading-snug">
              {lang === "bn" ? connectionIssue.messageBn : connectionIssue.message}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => void refresh(true)}
            className="h-7 text-xs gap-1.5 shrink-0 border-amber-300 dark:border-amber-700 bg-background/80 hover:bg-background self-end sm:self-auto"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {lang === "bn" ? "পুনরায় চেষ্টা করুন" : "Retry Connection"}
          </Button>
        </div>
      )}

      {/* KPI cards — skeleton while initial load, data thereafter */}
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
                  className="overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
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
                      <p className="text-lg font-bold mt-0.5 truncate">{card.value}</p>
                      {card.subtitle && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium truncate">{card.subtitle}</p>
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
        <AIInsightsWidget orders={orders} products={products} />
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
          <Card className="lg:col-span-2 min-w-0 min-h-[320px] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("salesTrend")}</CardTitle>
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
          <Card className="min-w-0 min-h-[320px] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("salesByStatus")}</CardTitle>
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
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">{t("topSellingProducts")}</CardTitle>
              <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">Top 5</Badge>
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
                    <div key={p.id || p.name} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-foreground">{formatBDT(p.totalSales)}</p>
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
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("recentOrders")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("orders")}>
                {t("viewAll")} <ArrowUpRight className="h-3 w-3" />
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
                      <div key={o?.id || o?.order_number || idx} className="flex items-center justify-between rounded-lg border p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{o?.order_number || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{o?.customer?.name ?? "—"}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-semibold">{formatBDT(Number(o?.total_amount || 0))}</p>
                          <Badge
                            variant={statusLabel === "Delivered" ? "success" : statusLabel === "Cancelled" ? "destructive" : "secondary"}
                            className="text-[10px]"
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

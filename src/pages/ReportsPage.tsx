import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase, SUPABASE_TABLE_SELECTS } from "@/lib/supabase";
import { withQueryTimeout } from "@/lib/supabaseQuery";
import { hasActiveSessionToken, ensureValidSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, formatDate, toBnDigit } from "@/lib/utils";
import { exportToExcel, exportToPdf, printElementOrDocument } from "@/lib/export";
import { Download, FileText, Printer, Loader2, BarChart3, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { useAutoSync } from "@/hooks/useAutoSync";
import { resolveOrderProduct } from "@/utils/productUtils";
import {
  fetchActiveSalesOfficers,
  getLocalSalesOfficers,
  type ManagedUser,
} from "@/services/userService";
import { useUsers } from "@/context/UsersContext";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  r2,
  getOrders,
  getCollections,
  getExpenses,
  getCustomers,
  getProducts,
  getSuppliers,
  getDeletedIds,
  calculateInventoryStockValue,
  calculateCustomerDues,
  deduplicateCollections,
  calculateOrdersCogs,
  getItemPurchaseCost,
  getProductPurchasePrice,
  isSupplierPaymentExpense,
  calculateOfficerCommissions,
  calculateSupplierPayablesUpToDate,
  mergeAndEnrichCustomers,
  parseCustomerNotes,
  isPendingOfflineRecord,
  type Customer,
} from "@/utils/localStore";

type ReportType =
  | "daily"
  | "monthly"
  | "product"
  | "customer"
  | "territory"
  | "profit_loss"
  | "balance_sheet"
  | "due"
  | "commission";

function getDateOnly(val: any): string {
  if (!val) return "";
  const s = String(val).trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return "";
  }
}

export function ReportsPage() {
  const { t, lang } = useI18n();
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { salesOfficers: contextOfficers } = useUsers();
  const [salesOfficers, setSalesOfficers] = useState<ManagedUser[]>(() => getLocalSalesOfficers());
  const [officerFilter, setOfficerFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Date Range Inversion Auto-Swap & Notification Validation
  const handleStartDateChange = (val: string) => {
    if (val && endDate && val > endDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      setStartDate(endDate);
      setEndDate(val);
    } else {
      setStartDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    if (startDate && val && startDate > val) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      setStartDate(val);
      setEndDate(startDate);
    } else {
      setEndDate(val);
    }
  };

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      const temp = startDate;
      setStartDate(endDate);
      setEndDate(temp);
    }
  }, [startDate, endDate]);

  // 1. Initial State loaded synchronously from active LocalStore with zero delay
  const [orders, setOrders] = useState<any[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
    return getOrders().filter((o: any) => !deletedIds.has(o.id));
  });

  const [collections, setCollections] = useState<any[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
    return getCollections().filter((c: any) => !deletedIds.has(c.id));
  });

  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());

  const [expenses, setExpenses] = useState<any[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
    return getExpenses().filter((e: any) => !deletedIds.has(e.id));
  });

  const [products, setProducts] = useState<any[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    return getProducts().filter((p: any) => !deletedIds.has(p.id));
  });

  // 2. Read-only remote sync function: NEVER mutates LocalStore or emits storage events (prevents infinite loop)
  const syncRemoteData = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    try {
      const sessionCheck = await ensureValidSession();
      if (sessionCheck.offline || !sessionCheck.session || !hasActiveSessionToken(sessionCheck.session)) {
        return;
      }

      const fetchProductsSafe = async () => {
        const fullRes = await withQueryTimeout(
          supabase
            .from("products")
            .select(SUPABASE_TABLE_SELECTS.productsFull)
            .order("name", { ascending: true }),
          9000,
          "Reports products query",
        );
        if (!fullRes.error) return fullRes;
        return withQueryTimeout(
          supabase
            .from("products")
            .select(SUPABASE_TABLE_SELECTS.productsCoreFallback)
            .order("name", { ascending: true }),
          9000,
          "Reports products fallback query",
        );
      };

      const [oSettled, cSettled, custSettled, eSettled, pSettled, officersSettled] = await Promise.allSettled([
        withQueryTimeout(
          supabase
            .from("orders")
            .select(
              "id, order_number, customer_id, sales_rep_id, order_date, delivery_date, status, subtotal, discount, total_amount, paid_amount, due_amount, payment_status, notes, created_at, updated_at, customer:customers(id, name, city, notes, territory:territories(id, name)), order_items(id, order_id, product_id, quantity, unit_price, discount, subtotal, product:products(id, sku_code, name, unit_price, dealer_price, distributor_price, unit, category_id))",
            )
            .order("order_date", { ascending: false }),
          9000,
          "Reports orders query",
        ),
        withQueryTimeout(
          supabase
            .from("collections")
            .select(
              "id, collection_number, customer_id, order_id, amount, payment_method, collection_date, collected_by, notes, created_at, customer:customers(id, name, city, notes)",
            )
            .order("collection_date", { ascending: false }),
          9000,
          "Reports collections query",
        ),
        withQueryTimeout(
          supabase
            .from("customers")
            .select(`${SUPABASE_TABLE_SELECTS.customers}, territory:territories(id, name)`)
            .order("name", { ascending: true }),
          9000,
          "Reports customers query",
        ),
        withQueryTimeout(
          supabase
            .from("expenses")
            .select("id, category, description, amount, expense_date, recorded_by, notes, created_at")
            .order("expense_date", { ascending: false }),
          9000,
          "Reports expenses query",
        ),
        fetchProductsSafe(),
        fetchActiveSalesOfficers(),
      ]);

      if (officersSettled.status === "fulfilled" && Array.isArray(officersSettled.value) && officersSettled.value.length > 0) {
        setSalesOfficers(officersSettled.value);
      }

      const enrichEmbeddedCustomer = (cust: any) => {
        if (!cust || typeof cust !== "object") return cust;
        const parsed = parseCustomerNotes(cust.notes);
        return {
          ...cust,
          outlet_name: cust.outlet_name || cust.name,
          party_code: cust.party_code || parsed.party_code || null,
          area: cust.area || parsed.area || cust.city || cust.territory?.name || null,
        };
      };

      // Merge remote and pending local orders and persist silently
      if (oSettled.status === "fulfilled" && !oSettled.value.error && Array.isArray(oSettled.value.data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
        const validRemote = oSettled.value.data
          .filter((o: any) => !deletedIds.has(o.id))
          .map((o: any) => ({
            ...o,
            customer: enrichEmbeddedCustomer(o.customer),
          }));
        const remoteIdSet = new Set(validRemote.map((o: any) => String(o.id)));
        const currentLocal = getOrders().filter((o: any) => !deletedIds.has(o.id));
        const pendingLocal = currentLocal.filter(
          (lo: any) => !remoteIdSet.has(String(lo.id)) && isPendingOfflineRecord(lo),
        );
        const mergedOrders = [...pendingLocal, ...validRemote];
        setOrders(mergedOrders);
        setLocalData(STORAGE_KEYS.ORDERS, mergedOrders.slice(0, 500), null, true);
      }

      // Merge remote and pending local collections and persist silently
      if (cSettled.status === "fulfilled" && !cSettled.value.error && Array.isArray(cSettled.value.data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
        const validRemote = cSettled.value.data
          .filter((c: any) => !deletedIds.has(c.id))
          .map((c: any) => ({
            ...c,
            customer: enrichEmbeddedCustomer(c.customer),
          }));
        const remoteIdSet = new Set(validRemote.map((c: any) => String(c.id)));
        const remoteColNumSet = new Set(
          validRemote.map((c: any) => String(c.collection_number || "").trim().toUpperCase()).filter(Boolean),
        );
        const currentLocal = getCollections().filter((c: any) => !deletedIds.has(c.id));
        const pendingLocal = currentLocal.filter(
          (lc: any) =>
            !remoteIdSet.has(String(lc.id)) &&
            (!lc.collection_number || !remoteColNumSet.has(String(lc.collection_number).trim().toUpperCase())) &&
            isPendingOfflineRecord(lc),
        );
        const mergedCols = deduplicateCollections([...pendingLocal, ...validRemote]);
        setCollections(mergedCols);
        setLocalData(STORAGE_KEYS.COLLECTIONS, mergedCols.slice(0, 1000), null, true);
      }

      // Merge remote customers and persist silently so local store stays cloud-authoritative
      if (custSettled.status === "fulfilled" && !custSettled.value.error && Array.isArray(custSettled.value.data)) {
        const mergedCusts = mergeAndEnrichCustomers(custSettled.value.data as unknown as Customer[], { persist: true });
        setCustomers(mergedCusts);
      }

      // Merge remote expenses without firing recursive storage events
      if (eSettled.status === "fulfilled" && !eSettled.value.error && Array.isArray(eSettled.value.data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
        const validRemote = eSettled.value.data.filter((e: any) => !deletedIds.has(e.id));
        const remoteIdSet = new Set(validRemote.map((e: any) => String(e.id)));
        const currentLocal = getExpenses().filter((e: any) => !deletedIds.has(e.id));
        const pendingLocal = currentLocal.filter(
          (le: any) => !remoteIdSet.has(String(le.id)) && isPendingOfflineRecord(le),
        );
        const mergedExps = [...pendingLocal, ...validRemote];
        setExpenses(mergedExps);
        setLocalData(STORAGE_KEYS.EXPENSES, mergedExps, null, true);
      }

      // Merge remote products without firing recursive storage events
      if (pSettled.status === "fulfilled" && !pSettled.value.error && Array.isArray(pSettled.value.data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
        const validRemote = pSettled.value.data.filter((p: any) => !deletedIds.has(p.id));
        const remoteIdSet = new Set(validRemote.map((p: any) => String(p.id)));
        const currentLocal = getProducts().filter((p: any) => !deletedIds.has(p.id));
        const pendingLocal = currentLocal.filter(
          (lp: any) => !remoteIdSet.has(String(lp.id)) && isPendingOfflineRecord(lp),
        );
        const mergedProds = [...pendingLocal, ...validRemote];
        setProducts(mergedProds);
        setLocalData(STORAGE_KEYS.PRODUCTS, mergedProds, null, true);
      }
    } catch (err) {
      console.warn("Reports remote sync notice:", err);
    }
  }, []);

  // Cloud-First re-validation on window focus, visibility change, and mobile app resume
  useAutoSync(() => {
    void syncRemoteData();
  });

  // 3. Stable lifecycle: fetch once on mount, and listen to localStore updates reactively (read-only)
  useEffect(() => {
    let mounted = true;
    syncRemoteData();

    const handleStorageUpdate = () => {
      if (!mounted) return;
      const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
      setOrders(getOrders().filter((o: any) => !deletedOrderIds.has(o.id)));

      const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
      setCollections(getCollections().filter((c: any) => !deletedColIds.has(c.id)));

      setCustomers(getCustomers());

      const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
      setExpenses(getExpenses().filter((e: any) => !deletedExpIds.has(e.id)));

      const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
      setProducts(getProducts().filter((p: any) => !deletedProdIds.has(p.id)));
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);
    window.addEventListener("customer_ledger_updated", handleStorageUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
      window.removeEventListener("customer_ledger_updated", handleStorageUpdate);
    };
  }, [syncRemoteData]);

  // 4. Stable Memoized Calculations: Zero infinite loops, recalculates only on filter or data array change
  const { data, chartData, summaryMetrics, balanceSheetAudit } = useMemo(() => {
    const effStart = (startDate && endDate && startDate > endDate) ? endDate : startDate;
    const effEnd = (startDate && endDate && startDate > endDate) ? startDate : endDate;

    const inDateRange = (dateVal: any) => {
      const d = getDateOnly(dateVal);
      if (!d) return false;
      return d >= effStart && d <= effEnd;
    };

    const effectiveOrders = officerFilter
      ? orders.filter((o: any) => String(o.sales_rep_id) === String(officerFilter))
      : orders;

    const effectiveCollections = officerFilter
      ? collections.filter((c: any) => String(c.collected_by) === String(officerFilter))
      : collections;

    let tableRows: any[] = [];
    let chartRows: any[] = [];
    let metrics = {
      title1: "Total Records", val1: "0",
      title2: "Total Amount", val2: formatBDT(0),
      title3: "Average Metric", val3: formatBDT(0),
    };
    let bsAudit = {
      isBalanced: true,
      mismatch: 0,
      totalAssets: 0,
      totalLiabilitiesAndEquity: 0,
      totalEquity: 0,
      totalLiabilities: 0,
      isOverdrawn: false,
      netCashAndBank: 0,
      bankOverdraft: 0,
    };

    if (reportType === "daily") {
      const filtered = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );

      const map = new Map<string, { date: string; rawDate: string; sales: number; orders: number; avgTicket: number }>();
      filtered.forEach((o: any) => {
        const raw = getDateOnly(o.order_date || o.created_at);
        const amt = Number(o.total_amount || 0);
        const curr = map.get(raw) || {
          date: formatDate(raw),
          rawDate: raw,
          sales: 0,
          orders: 0,
          avgTicket: 0,
        };
        curr.sales = r2(curr.sales + amt);
        curr.orders += 1;
        curr.avgTicket = r2(curr.sales / curr.orders);
        map.set(raw, curr);
      });

      const sorted = Array.from(map.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      const totalSales = r2(sorted.reduce((s, r) => s + r.sales, 0));
      const totalCount = sorted.reduce((s, r) => s + r.orders, 0);

      tableRows = sorted.map(({ rawDate, ...rest }) => rest);
      chartRows = sorted.map((r) => ({ date: r.date, sales: r.sales, orders: r.orders }));
      metrics = {
        title1: "Total Invoices", val1: String(totalCount),
        title2: "Total Daily Sales", val2: formatBDT(totalSales),
        title3: "Average / Day", val3: formatBDT(sorted.length > 0 ? r2(totalSales / sorted.length) : 0),
      };

    } else if (reportType === "monthly") {
      const filtered = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );

      const map = new Map<string, { month: string; rawMonth: string; sales: number; orders: number; avgOrder: number }>();
      filtered.forEach((o: any) => {
        const raw = getDateOnly(o.order_date || o.created_at).slice(0, 7);
        if (!raw) return;
        const [y, m] = raw.split("-");
        const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
        const amt = Number(o.total_amount || 0);
        const curr = map.get(raw) || { month: monthLabel, rawMonth: raw, sales: 0, orders: 0, avgOrder: 0 };
        curr.sales = r2(curr.sales + amt);
        curr.orders += 1;
        curr.avgOrder = r2(curr.sales / curr.orders);
        map.set(raw, curr);
      });

      const sorted = Array.from(map.values()).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
      const totalSales = r2(sorted.reduce((s, r) => s + r.sales, 0));
      const totalCount = sorted.reduce((s, r) => s + r.orders, 0);

      tableRows = sorted.map(({ rawMonth, ...rest }) => rest);
      chartRows = sorted.map((r) => ({ month: r.month, sales: r.sales, orders: r.orders }));
      metrics = {
        title1: "Total Invoices", val1: String(totalCount),
        title2: "Total Sales", val2: formatBDT(totalSales),
        title3: "Average / Month", val3: formatBDT(sorted.length > 0 ? r2(totalSales / sorted.length) : 0),
      };

    } else if (reportType === "product") {
      const filtered = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );

      const map = new Map<string, { product: string; qty: number; revenue: number; avgPrice: number }>();
      filtered.forEach((o: any) => {
        const items = o.order_items || (o as any).items || [];
        items.forEach((it: any) => {
          const prodInfo = resolveOrderProduct(it.product, it.product_id, products);
          const pName = prodInfo.exists ? prodInfo.name : "[Deleted Product]";
          const qty = Math.max(1, Number(it.quantity || 1));
          const sub = Number(it.subtotal || (qty * Number(it.unit_price || 0)));
          const curr = map.get(pName) || { product: pName, qty: 0, revenue: 0, avgPrice: 0 };
          curr.qty += qty;
          curr.revenue = r2(curr.revenue + sub);
          curr.avgPrice = r2(curr.revenue / curr.qty);
          map.set(pName, curr);
        });
      });

      const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      const totalRevenue = r2(sorted.reduce((s, r) => s + r.revenue, 0));
      const totalQuantity = sorted.reduce((s, r) => s + r.qty, 0);

      tableRows = sorted;
      chartRows = sorted.slice(0, 10);
      metrics = {
        title1: "Products Sold", val1: String(sorted.length),
        title2: "Total Revenue", val2: formatBDT(totalRevenue),
        title3: "Total Units Sold", val3: `${totalQuantity} pcs`,
      };

    } else if (reportType === "customer") {
      const filtered = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );

      const map = new Map<string, { customer: string; area: string; revenue: number; orders: number; avgOrder: number }>();
      filtered.forEach((o: any) => {
        const cId = String(o.customer_id || o.customer?.id || "").trim();
        const partyCode = (o.customer?.party_code || (o.customer as any)?.code || "").trim();
        const rawName = o.customer?.outlet_name || o.customer?.name || o.customer_name || "Outlet";
        const cDisplayName = partyCode ? `${rawName} (${partyCode})` : rawName;
        const key = cId || cDisplayName;
        const area = o.customer?.area || o.customer?.city || (o.customer?.territory as any)?.name || "—";
        const amt = Number(o.total_amount || 0);
        const curr = map.get(key) || { customer: cDisplayName, area, revenue: 0, orders: 0, avgOrder: 0 };
        curr.revenue = r2(curr.revenue + amt);
        curr.orders += 1;
        curr.avgOrder = r2(curr.revenue / curr.orders);
        map.set(key, curr);
      });

      const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      const totalSales = r2(sorted.reduce((s, r) => s + r.revenue, 0));
      const totalOrders = sorted.reduce((s, r) => s + r.orders, 0);

      tableRows = sorted;
      chartRows = sorted.slice(0, 10);
      metrics = {
        title1: "Purchasing Outlets", val1: String(sorted.length),
        title2: "Total Sales", val2: formatBDT(totalSales),
        title3: "Average / Outlet", val3: formatBDT(sorted.length > 0 ? r2(totalSales / sorted.length) : 0),
      };

    } else if (reportType === "territory") {
      const filtered = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );

      const map = new Map<string, { territory: string; revenue: number; orders: number }>();
      filtered.forEach((o: any) => {
        const tName = o.customer?.area || o.customer?.city || (o.customer?.territory as any)?.name || "General Area";
        const amt = Number(o.total_amount || 0);
        const curr = map.get(tName) || { territory: tName, revenue: 0, orders: 0 };
        curr.revenue = r2(curr.revenue + amt);
        curr.orders += 1;
        map.set(tName, curr);
      });

      const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      const totalSales = r2(sorted.reduce((s, r) => s + r.revenue, 0));

      tableRows = sorted;
      chartRows = sorted;
      metrics = {
        title1: "Active Markets / Areas", val1: String(sorted.length),
        title2: "Total Market Sales", val2: formatBDT(totalSales),
        title3: "Top Market", val3: sorted[0]?.territory || "—",
      };

    } else if (reportType === "due") {
      const { dueMap, totalDue } = calculateCustomerDues(customers, effectiveOrders, deduplicateCollections(effectiveCollections));

      tableRows = customers
        .map((c: Customer) => {
          const info = dueMap.get(c.id) || {
            due: r2(Number(c.current_due !== undefined ? c.current_due : (c.opening_balance || 0))),
            status: (c.due_status as any) || "Clear",
            opening: r2(Number(c.opening_balance || 0)),
            billed: 0,
            collected: 0,
          };

          return {
            partyCode: c.party_code || "—",
            customer: c.outlet_name || c.name,
            area: c.area || c.city || (c.territory as any)?.name || "—",
            phone: c.phone || "—",
            openingBalance: info.opening,
            totalBilled: info.billed,
            totalCollected: info.collected,
            currentDue: info.due,
            status: info.status,
          };
        })
        .filter((r) => r.currentDue > 0)
        .sort((a, b) => b.currentDue - a.currentDue);

      chartRows = tableRows.slice(0, 10).map((r) => ({ customer: r.customer, due: r.currentDue }));
      metrics = {
        title1: "Outlets with Due", val1: String(tableRows.length),
        title2: "Total Outstanding Due", val2: formatBDT(totalDue),
        title3: "Average Due / Outlet", val3: formatBDT(tableRows.length > 0 ? r2(totalDue / tableRows.length) : 0),
      };

    } else if (reportType === "profit_loss") {
      const filteredOrders = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );
      const filteredExps = expenses.filter((e: any) => inDateRange(e.expense_date || e.created_at));

      const netSalesRevenue = r2(filteredOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0));
      const totalDiscounts = r2(filteredOrders.reduce((s: number, o: any) => s + Number(o.discount || 0), 0));
      const grossRevenue = r2(netSalesRevenue + totalDiscounts);

      // Dynamic COGS: Sum of (item.quantity * item.unitCost) across sales orders
      const { totalCogs: dynamicCogs, totalItemsSold } = calculateOrdersCogs(filteredOrders, products);
      const grossProfit = r2(netSalesRevenue - dynamicCogs);
      // Segregate non-supplier Operating Expenses (OPEX) from Supplier Payments to prevent double-counting inventory procurement cost
      const operationalExps = filteredExps.filter((e: any) => !isSupplierPaymentExpense(e));
      const supplierPaymentExps = filteredExps.filter((e: any) => isSupplierPaymentExpense(e));

      const operatingExpenses = r2(operationalExps.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      const supplierPaymentsTotal = r2(supplierPaymentExps.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      const netOperatingProfit = r2(grossProfit - operatingExpenses);

      tableRows = [
        { metric: "1. Gross Sales Revenue", amount: grossRevenue, ratio: "100.0%", notes: `${filteredOrders.length} orders recorded` },
        { metric: "2. Trade Discounts Given", amount: totalDiscounts, ratio: grossRevenue > 0 ? `${r2((totalDiscounts / grossRevenue) * 100)}%` : "0.0%", notes: "Volume and special tier discounts" },
        { metric: "3. Net Recognized Sales", amount: netSalesRevenue, ratio: grossRevenue > 0 ? `${r2((netSalesRevenue / grossRevenue) * 100)}%` : "0.0%", notes: "Actual invoiced revenue" },
        { metric: "4. Cost of Goods Sold (COGS)", amount: dynamicCogs, ratio: netSalesRevenue > 0 ? `${r2((dynamicCogs / netSalesRevenue) * 100)}%` : "0.0%", notes: totalItemsSold > 0 ? `Dynamic purchase cost (${totalItemsSold} items)` : "Item purchase costs" },
        { metric: "5. Gross Operating Margin", amount: grossProfit, ratio: netSalesRevenue > 0 ? `${r2((grossProfit / netSalesRevenue) * 100)}%` : "0.0%", notes: "Revenue minus dynamic production/purchase cost" },
        { metric: "6. Operating Expenses (OPEX)", amount: operatingExpenses, ratio: netSalesRevenue > 0 ? `${r2((operatingExpenses / netSalesRevenue) * 100)}%` : "0.0%", notes: `${operationalExps.length} operational overhead vouchers (Rent, Salaries, Utilities, Transport, etc.)` },
        { metric: "7. Net Operating Profit / (Loss)", amount: netOperatingProfit, ratio: netSalesRevenue > 0 ? `${r2((netOperatingProfit / netSalesRevenue) * 100)}%` : "0.0%", notes: netOperatingProfit >= 0 ? "Operating Surplus" : "Operating Deficit" },
      ];

      if (supplierPaymentsTotal > 0) {
        tableRows.push({
          metric: "— Memo: Supplier Payments (Settlement)",
          amount: supplierPaymentsTotal,
          ratio: "N/A",
          notes: `${supplierPaymentExps.length} supplier payments (cash outflows reducing payables; inventory cost already recognized in COGS)`,
        });
      }

      chartRows = [
        { name: "Net Sales", amount: netSalesRevenue },
        { name: "COGS", amount: dynamicCogs },
        { name: "Gross Profit", amount: grossProfit },
        { name: "OPEX", amount: operatingExpenses },
        { name: "Net Profit", amount: Math.max(0, netOperatingProfit) },
      ];
      metrics = {
        title1: "Net Revenue", val1: formatBDT(netSalesRevenue),
        title2: "Operating Expenses (OPEX)", val2: formatBDT(operatingExpenses),
        title3: "Net Operating Profit", val3: formatBDT(netOperatingProfit),
      };

    } else if (reportType === "balance_sheet") {
      const uniqueCols = deduplicateCollections(effectiveCollections);

      // Balance Sheet as-of endDate filter
      const colsUpToDate = uniqueCols.filter((c: any) => {
        const d = getDateOnly(c.collection_date || c.created_at);
        return !endDate || !d || d <= endDate;
      });
      const expsUpToDate = expenses.filter((e: any) => {
        const d = getDateOnly(e.expense_date || e.created_at);
        return !endDate || !d || d <= endDate;
      });
      const ordersUpToDate = effectiveOrders.filter((o: any) => {
        const d = getDateOnly(o.order_date || o.created_at);
        return (!endDate || !d || d <= endDate) && o.status !== "Cancelled" && o.status !== "Draft";
      });

      // 1. Assets Calculation (as of report endDate)
      // MED-001: Prevent overdraft masking and compute un-clamped net liquid cash/bank balance
      const totalCol = r2(colsUpToDate.reduce((s: number, c: any) => s + Number(c.amount || 0), 0));
      const totalExp = r2(expsUpToDate.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      const netCashAndBank = r2(totalCol - totalExp);

      // Option B (Enterprise Accounting Standard):
      // If net liquid balance is negative (overdrawn / deficit), report 0 under Current Assets (Cash & Bank)
      // and reclassify the absolute overdrawn amount into Current Liabilities as Bank Overdraft / Cash Deficit.
      const isOverdrawn = netCashAndBank < 0;
      const bankOverdraft = isOverdrawn ? Math.abs(netCashAndBank) : 0;
      const cashAndBankAsset = isOverdrawn ? 0 : netCashAndBank;

      const { totalDue: accountsReceivable } = calculateCustomerDues(customers, ordersUpToDate, colsUpToDate);
      const inventoryValuation = calculateInventoryStockValue(products);
      const totalAssets = r2(cashAndBankAsset + accountsReceivable + inventoryValuation);

      // 2. Liabilities Calculation (CRIT-002: Historical supplier payables as of report endDate)
      const { totalPayable: supplierPayablesUpToDate } = calculateSupplierPayablesUpToDate(effEnd);
      const currentLiabilities = r2(supplierPayablesUpToDate + bankOverdraft);
      const longTermLiabilities = 0;
      const totalLiabilities = r2(currentLiabilities + longTermLiabilities);

      // 3. Equity & Retained Earnings Calculation (CRIT-004: Cumulative from ledger)
      const openingCapital = r2(Number(getLocalData("sales_erp_opening_capital", 0)) || 0);

      // Cumulative Prior Retained Earnings (transactions strictly prior to startDate):
      const priorOrders = effectiveOrders.filter((o: any) => {
        const d = getDateOnly(o.order_date || o.created_at);
        return d && d < effStart && o.status !== "Cancelled" && o.status !== "Draft";
      });
      const priorNetSales = r2(priorOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0));
      const priorCogs = calculateOrdersCogs(priorOrders, products).totalCogs;
      const priorGrossProfit = r2(priorNetSales - priorCogs);
      const priorExps = expenses.filter((e: any) => {
        const d = getDateOnly(e.expense_date || e.created_at);
        return d && d < effStart && !isSupplierPaymentExpense(e);
      });
      const priorOperatingExpenses = r2(priorExps.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      const cumulativeRetainedEarnings = r2(priorGrossProfit - priorOperatingExpenses);

      // Current Period Net Profit [startDate, endDate]:
      const plOrders = effectiveOrders.filter(
        (o: any) => o.status !== "Cancelled" && o.status !== "Draft" && inDateRange(o.order_date || o.created_at)
      );
      const plExps = expenses.filter((e: any) => inDateRange(e.expense_date || e.created_at) && !isSupplierPaymentExpense(e));
      const plNetSalesRevenue = r2(plOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0));
      const { totalCogs: plDynamicCogs } = calculateOrdersCogs(plOrders, products);
      const plGrossProfit = r2(plNetSalesRevenue - plDynamicCogs);
      const plOperatingExpenses = r2(plExps.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      const currentPeriodNetProfit = r2(plGrossProfit - plOperatingExpenses);

      // True Total Equity derived strictly from capital + retained earnings + current net profit
      const totalEquity = r2(openingCapital + cumulativeRetainedEarnings + currentPeriodNetProfit);
      const totalLiabilitiesAndEquity = r2(totalLiabilities + totalEquity);

      // Detect and expose real reconciliation discrepancy (CRIT-004)
      const reconciliationMismatch = r2(totalAssets - totalLiabilitiesAndEquity);
      const isBalanced = Math.abs(reconciliationMismatch) < 0.01;

      bsAudit = {
        isBalanced,
        mismatch: reconciliationMismatch,
        totalAssets,
        totalLiabilitiesAndEquity,
        totalEquity,
        totalLiabilities,
        isOverdrawn,
        netCashAndBank,
        bankOverdraft,
      };

      tableRows = [
        { classification: "1. Assets (সম্পদ)", item: "Cash & Bank Balance (নগদ ও ব্যাংক উদ্বৃত্ত)", balance: cashAndBankAsset, share: totalAssets > 0 ? `${r2((cashAndBankAsset / totalAssets) * 100)}%` : "0.0%" },
        { classification: "1. Assets (সম্পদ)", item: "Customer Receivables / Dues (কাস্টমার বাকি / দেনাদার)", balance: accountsReceivable, share: totalAssets > 0 ? `${r2((accountsReceivable / totalAssets) * 100)}%` : "0.0%" },
        { classification: "1. Assets (সম্পদ)", item: "Warehouse Inventory Stock Value (স্টক মজুদ মূল্য)", balance: inventoryValuation, share: totalAssets > 0 ? `${r2((inventoryValuation / totalAssets) * 100)}%` : "0.0%" },
        { classification: "1. Assets (সম্পদ)", item: "TOTAL ASSETS (মোট সম্পদ)", balance: totalAssets, share: "100.0%" },
        { classification: "2. Liabilities (মোট দেনা)", item: "Supplier Payables (সাপ্লায়ার পাওনাদার)", balance: supplierPayablesUpToDate, share: totalAssets > 0 ? `${r2((supplierPayablesUpToDate / totalAssets) * 100)}%` : "0.0%" },
        ...(bankOverdraft > 0 ? [{ classification: "2. Liabilities (মোট দেনা)", item: "Bank Overdraft / Cash Deficit (ব্যাংক ওভারড্রাফট / নগদ ঘাটতি)", balance: bankOverdraft, share: totalAssets > 0 ? `${r2((bankOverdraft / totalAssets) * 100)}%` : "0.0%" }] : []),
        ...(longTermLiabilities > 0 ? [{ classification: "2. Liabilities (মোট দেনা)", item: "Long-Term Debt / Liabilities", balance: longTermLiabilities, share: `${r2((longTermLiabilities / totalAssets) * 100)}%` }] : []),
        { classification: "2. Liabilities (মোট দেনা)", item: "TOTAL LIABILITIES (মোট দেনা)", balance: totalLiabilities, share: totalAssets > 0 ? `${r2((totalLiabilities / totalAssets) * 100)}%` : "0.0%" },
        { classification: "3. Equity / Capital (মালিকের নিট পুঁজি)", item: "Initial Opening Capital / Equity (প্রারম্ভিক মূলধন)", balance: openingCapital, share: totalAssets > 0 ? `${r2((openingCapital / totalAssets) * 100)}%` : "0.0%" },
        { classification: "3. Equity / Capital (মালিকের নিট পুঁজি)", item: "Prior Cumulative Retained Earnings (পূর্ববর্তী পুঞ্জীভূত মুনাফা)", balance: cumulativeRetainedEarnings, share: totalAssets > 0 ? `${r2((cumulativeRetainedEarnings / totalAssets) * 100)}%` : "0.0%" },
        { classification: "3. Equity / Capital (মালিকের নিট পুঁজি)", item: "Current Period Net Profit / P&L (চলতি মেয়াদের নিট লাভ)", balance: currentPeriodNetProfit, share: totalAssets > 0 ? `${r2((currentPeriodNetProfit / totalAssets) * 100)}%` : "0.0%" },
        { classification: "3. Equity / Capital (মালিকের নিট পুঁজি)", item: "TOTAL EQUITY (মোট মালিকানা স্বত্ব)", balance: totalEquity, share: totalAssets > 0 ? `${r2((totalEquity / totalAssets) * 100)}%` : "0.0%" },
        { classification: "4. Total Liabilities & Equity", item: "TOTAL LIABILITIES & EQUITY (মোট দেনা ও নিট পুঁজি)", balance: totalLiabilitiesAndEquity, share: "100.0%" },
      ];

      if (!isBalanced) {
        tableRows.push({
          classification: "5. Audit Reconciliation (হিসাব নিরীক্ষা)",
          item: "Unreconciled Variance / Discrepancy (অমীমাংসিত পার্থক্য)",
          balance: reconciliationMismatch,
          share: "Audit Alert",
        });
      }

      chartRows = [
        { name: "Cash & Bank", amount: cashAndBankAsset },
        { name: "Receivables", amount: accountsReceivable },
        { name: "Inventory", amount: inventoryValuation },
        { name: "Supplier Payables", amount: supplierPayablesUpToDate },
        ...(bankOverdraft > 0 ? [{ name: "Bank Overdraft", amount: bankOverdraft }] : []),
        { name: "Prior Retained Earnings", amount: Math.max(0, cumulativeRetainedEarnings) },
        { name: "Current Net Profit", amount: Math.max(0, currentPeriodNetProfit) },
        { name: "Total Equity", amount: Math.max(0, totalEquity) },
      ];

      metrics = {
        title1: "Total Assets (মোট সম্পদ)", val1: formatBDT(totalAssets),
        title2: "Total Liabilities & Equity", val2: formatBDT(totalLiabilitiesAndEquity),
        title3: isBalanced ? "Reconciliation Status" : "Unreconciled Variance",
        val3: isBalanced ? "Balanced ✓" : formatBDT(reconciliationMismatch),
      };
    } else if (reportType === "commission") {
      // BUG-020: Net Sales = Gross Delivered Sales - Product Returns (Sales Returns) - Cancelled Invoices
      const rawCommissions = calculateOfficerCommissions(effectiveOrders, salesOfficers, { startDate, endDate });
      const filteredCommissions = officerFilter
        ? rawCommissions.filter((c) => String(c.officerId) === String(officerFilter))
        : rawCommissions;

      tableRows = filteredCommissions.map((c) => ({
        salesOfficer: c.officerName,
        deliveredInvoices: c.deliveredOrdersCount,
        grossDelivered: c.grossDeliveredSales,
        returned: c.returnedSales,
        cancelledOrders: c.cancelledInvoicesCount,
        netSales: c.netSales,
        commissionRate: `${(c.commissionRate * 100).toFixed(1)}%`,
        commissionAmount: c.commissionAmount,
      }));

      chartRows = filteredCommissions.map((c) => ({
        officer: c.officerName,
        netSales: c.netSales,
        commission: c.commissionAmount,
      }));

      const totalNet = r2(filteredCommissions.reduce((sum, c) => sum + c.netSales, 0));
      const totalRet = r2(filteredCommissions.reduce((sum, c) => sum + c.returnedSales, 0));
      const totalComm = r2(filteredCommissions.reduce((sum, c) => sum + c.commissionAmount, 0));

      metrics = {
        title1: "Net Commissionable Sales", val1: formatBDT(totalNet),
        title2: "Total Returns Deducted", val2: formatBDT(totalRet),
        title3: "Total Commission Payable", val3: formatBDT(totalComm),
      };
    }

    return { data: tableRows, chartData: chartRows, summaryMetrics: metrics, balanceSheetAudit: bsAudit };
  }, [reportType, startDate, endDate, orders, collections, customers, expenses, products, officerFilter]);

  // Handle Manual Click on Generate Button
  const handleGenerate = async () => {
    setRefreshing(true);
    await syncRemoteData();
    setRefreshing(false);
    toast.success("Report updated with latest live records");
  };

  const handleExcel = async () => {
    const filename = `Sales_ERP_${reportType}_${startDate}_to_${endDate}`;
    await exportToExcel(filename, data);
    toast.success(`Exported ${data.length} records to Excel`);
  };

  const handlePdf = async () => {
    const el = document.getElementById("report-content");
    if (!el) return;
    await exportToPdf("report-content", `Sales_ERP_${reportType}_${startDate}_to_${endDate}`);
    toast.success("PDF generated successfully");
  };

  const handlePrintReport = () => {
    void printElementOrDocument({
      elementId: "report-content",
      filename: `Sales_ERP_${reportType}_${startDate}_to_${endDate}`,
      orientation: "landscape",
      title: `Sales ERP Report (${reportType})`,
    });
  };

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: "daily", label: t("dailySalesReport") || "Daily Sales Report" },
    { value: "monthly", label: t("monthlySalesReport") || "Monthly Sales Report" },
    { value: "product", label: t("productWiseSales") || "Product Wise Sales" },
    { value: "customer", label: t("customerWiseSales") || "Customer Wise Sales" },
    { value: "territory", label: t("territoryWiseSales") || "Territory / Market Sales" },
    { value: "profit_loss", label: t("profitLoss") || "Profit & Loss Statement" },
    { value: "balance_sheet", label: t("balanceSheet") || "Balance Sheet" },
    { value: "due", label: t("dueReport") || "Customer Due Report" },
    { value: "commission", label: t("commissionReport" as string) || "Sales Officer Commission & Incentive" },
  ];

  const pieColors = ["#0ea5e9", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label>{t("filter" as string) || "Report Type"}</Label>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
                {reportTypes.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("salesOfficer" as string) || "Sales Officer"}</Label>
              <Select value={officerFilter} onChange={(e) => setOfficerFilter(e.target.value)}>
                <option value="">All Officers</option>
                {(contextOfficers && contextOfficers.length > 0 ? contextOfficers : salesOfficers).map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.full_name || so.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("startDate") || "Start Date"}</Label>
              <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("endDate") || "End Date"}</Label>
              <Input type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={handleGenerate} disabled={refreshing} className="flex-1">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {t("generate") || "Generate"}
              </Button>
            </div>
          </div>
          {startDate && endDate && startDate > endDate && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleExcel()} disabled={data.length === 0}>
                <Download className="h-4 w-4" /> {t("exportExcel") || "Export Excel"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handlePdf()} disabled={data.length === 0}>
                <FileText className="h-4 w-4" /> {t("exportPdf") || "Export PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={data.length === 0}>
                <Printer className="h-4 w-4" /> {t("print" as string) || "Print"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Date Filter: {formatDate(startDate)} – {formatDate(endDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{summaryMetrics.title1}</p>
            <p className="text-xl font-bold mt-1 text-sky-600">{summaryMetrics.val1}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{summaryMetrics.title2}</p>
            <p className="text-xl font-bold mt-1 text-emerald-600">{summaryMetrics.val2}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{summaryMetrics.title3}</p>
            <p className="text-xl font-bold mt-1 text-amber-600">{summaryMetrics.val3}</p>
          </CardContent>
        </Card>
      </div>

      <div id="report-content" className="space-y-4">
        {/* Balance Sheet Overdraft / Cash Deficit Notice Banner (MED-001) */}
        {reportType === "balance_sheet" && balanceSheetAudit.isOverdrawn && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-red-900 dark:text-red-200 shadow-xs">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="font-semibold text-base text-red-900 dark:text-red-100">
                  Bank Overdraft / Cash Deficit Detected: {formatBDT(balanceSheetAudit.bankOverdraft)}
                </p>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-red-200/80 dark:bg-red-900/60 text-red-900 dark:text-red-200 self-start sm:self-auto">
                  Overdrawn: {formatBDT(balanceSheetAudit.bankOverdraft)}
                </span>
              </div>
              <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90 leading-relaxed">
                Total liquid cash outflows exceed collections resulting in a net negative balance ({formatBDT(balanceSheetAudit.netCashAndBank)}).
                In accordance with enterprise accounting standards, this overdrawn balance is reported as <strong>{formatBDT(0)}</strong> under Current Assets and reclassified as a <strong>Current Liability (Bank Overdraft / Cash Deficit)</strong> to prevent asset distortion and accurately reflect short-term obligations.
              </p>
            </div>
          </div>
        )}

        {/* Balance Sheet Reconciliation Audit Alert Banner */}
        {reportType === "balance_sheet" && !balanceSheetAudit.isBalanced && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="font-semibold text-base text-amber-900 dark:text-amber-100">
                  Unreconciled Balance Sheet Discrepancy: {formatBDT(balanceSheetAudit.mismatch)}
                </p>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 self-start sm:self-auto">
                  Variance: {formatBDT(balanceSheetAudit.mismatch)}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Total Assets ({formatBDT(balanceSheetAudit.totalAssets)}) does not equal Total Liabilities & Equity ({formatBDT(balanceSheetAudit.totalLiabilitiesAndEquity)}).
                This discrepancy occurs because Retained Equity is calculated authentically from cumulative ledger transactions rather than forced by an artificial balancing plug.
                A variance indicates unrecorded opening balances (such as initial owner capital or bank cash balance) or timing differences in historical ledger journals.
              </p>
            </div>
          </div>
        )}

        {reportType === "balance_sheet" && balanceSheetAudit.isBalanced && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Balance Sheet fully reconciled: Total Assets ({formatBDT(balanceSheetAudit.totalAssets)}) perfectly balances with Total Liabilities & Equity ({formatBDT(balanceSheetAudit.totalLiabilitiesAndEquity)}).</span>
          </div>
        )}

        {/* Dynamic Stable Chart Display */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{reportTypes.find((r) => r.value === reportType)?.label}</span>
                <span className="text-xs font-normal text-muted-foreground">Live Data Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                  {reportType === "territory" ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey={chartData[0]?.amount ? "amount" : chartData[0]?.revenue ? "revenue" : "value"}
                        nameKey={Object.keys(chartData[0])[0]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatBDT(v, lang)}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey={Object.keys(chartData[0])[0]}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => (lang === "bn" ? toBnDigit(String(v)) : String(v))}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => {
                          const rawK = `${(v / 1000).toFixed(0)}k`;
                          return lang === "bn" ? toBnDigit(rawK) : rawK;
                        }}
                      />
                      <Tooltip
                        formatter={(v: number) => formatBDT(v, lang)}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey={
                          chartData[0]?.netSales !== undefined
                            ? "netSales"
                            : chartData[0]?.sales !== undefined
                            ? "sales"
                            : chartData[0]?.revenue !== undefined
                            ? "revenue"
                            : chartData[0]?.due !== undefined
                            ? "due"
                            : chartData[0]?.value !== undefined
                            ? "value"
                            : "amount"
                        }
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Table Display */}
        <Card>
          <CardContent className="p-0">
            {data.length === 0 ? (
              <EmptyState icon={<FileText className="h-10 w-10" />} title={t("noData")} description={t("noResults")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(data[0]).map((k) => (
                      <TableHead key={k} className="capitalize">
                        {k.replace(/([A-Z])/g, " $1")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).map(([k, v]: any) => (
                        <TableCell key={k} className="text-sm">
                          {typeof v === "number" &&
                          (k === "sales" ||
                            k === "revenue" ||
                            k === "amount" ||
                            k === "due" ||
                            k === "currentDue" ||
                            k === "value" ||
                            k === "totalValue" ||
                            k === "unitPrice" ||
                            k === "openingBalance" ||
                            k === "totalBilled" ||
                            k === "totalCollected" ||
                            k === "avgOrder" ||
                            k === "avgTicket" ||
                            k === "avgPrice" ||
                            k === "balance" ||
                            k === "grossDelivered" ||
                            k === "returned" ||
                            k === "cancelledSales" ||
                            k === "netSales" ||
                            k === "commissionAmount")
                            ? formatBDT(v)
                            : String(v ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

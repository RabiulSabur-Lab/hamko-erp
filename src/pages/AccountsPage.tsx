import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase, SUPABASE_TABLE_SELECTS, type Collection, type Expense, type Customer, type Order } from "@/lib/supabase";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRouter } from "@/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, formatDate, cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import { Plus, Download, Wallet, Loader2, DollarSign, TrendingDown, BookOpen, CreditCard, Trash2, Calendar, X, User, AlertCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  fetchActiveSalesOfficers,
  getLocalSalesOfficers,
  resolveOfficerName,
  buildUserLookupMap,
  fetchAllUsersMap,
  type ManagedUser,
  type UserLookupInfo,
} from "@/services/userService";
import { useUsers } from "@/context/UsersContext";

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  saveCollections,
  saveExpenses,
  saveOrders,
  optimisticAdd,
  optimisticDelete,
  getCollections,
  getExpenses,
  getCustomers,
  getOrders,
  deleteCollection,
  deleteExpense,
  getDeletedIds,
  mergeAndEnrichCustomers,
  reconcileOrdersWithRemote,
  reconcileCollectionsWithRemote,
  calculateCustomerDues,
  getCustomerLedgerDetails,
  recalculateCustomerLedger,
  updateCustomerBalance,
  refreshCustomers,
  dispatchGlobalStateUpdate,
  r2,
  deduplicateCollections,
  syncSupplierPaymentsToExpenses,
  generateCollectionNumber,
  isSupplierPaymentExpense,
  isPendingOfflineRecord,
} from "@/utils/localStore";
import { normalizePaymentMethod } from "@/utils/cloudSync";
import { CustomerLedgerModal } from "@/components/CustomerLedgerModal";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { CollectionDetailsModal } from "@/components/CollectionDetailsModal";

const paymentMethods = ["Cash", "Bank Transfer", "Cheque / Check", "Mobile Banking"] as const;
const expenseCategories = ["Salary", "Rent", "Utilities", "Transport", "Marketing", "Supplier Payment", "Miscellaneous"] as const;

export const BANGLADESH_BANKS = [
  "Dutch-Bangla Bank (DBBL)",
  "Islami Bank Bangladesh (IBBL)",
  "BRAC Bank",
  "The City Bank",
  "Eastern Bank (EBL)",
  "Sonali Bank",
  "Pubali Bank",
  "United Commercial Bank (UCB)",
  "Mutual Trust Bank (MTB)",
  "Prime Bank",
  "Southeast Bank",
  "Dhaka Bank",
  "Al-Arafah Islami Bank",
  "Janata Bank",
  "Agrani Bank",
  "Rupali Bank",
  "Standard Chartered Bank",
  "HSBC",
] as const;

interface TableDateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
}

function TableDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: TableDateRangePickerProps) {
  const isInverted = Boolean(startDate && endDate && startDate > endDate);

  const handleStartChange = (val: string) => {
    if (val && endDate && val > endDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      onStartDateChange(endDate);
      onEndDateChange(val);
    } else {
      onStartDateChange(val);
    }
  };

  const handleEndChange = (val: string) => {
    if (startDate && val && startDate > val) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      onStartDateChange(val);
      onEndDateChange(startDate);
    } else {
      onEndDateChange(val);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
      <div className={cn(
        "flex items-center gap-1.5 bg-background border rounded-md px-2 py-1 shadow-sm text-xs transition-colors",
        isInverted ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-border/80"
      )}>
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartChange(e.target.value)}
          className="h-6 w-28 bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          title="Start Date"
        />
        <span className="text-muted-foreground text-xs font-normal">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndChange(e.target.value)}
          className="h-6 w-28 bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          title="End Date"
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={onClear}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted ml-0.5 transition-colors"
            title="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isInverted && (
        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          তারিখ ক্রমানুসারে সংশোধন করা হয়েছে
        </span>
      )}
    </div>
  );
}

export function AccountsPage() {
  const { t } = useI18n();
  const { profile, user } = useAuth();

  const isManagerOrAdmin = useMemo(() => {
    const role = (
      profile?.role_name ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      ""
    ).toLowerCase().trim();
    return role.includes("admin") || role.includes("manager") || role.includes("accountant");
  }, [profile, user]);

  const currentUserId = profile?.id || user?.id;

  // Strict Edit-Own Permission Rule:
  // - All authenticated Sales Officers can VIEW all collections across the system (Read Access).
  // - Sales Officers can ONLY delete/modify collections recorded by themselves (collected_by = auth.uid()).
  // - Admins, Managers, and Accountants retain full modification permissions.
  const canModifyCollection = (c?: Collection | null): boolean => {
    if (isManagerOrAdmin) return true;
    if (!c) return false;
    const ownerId = c.collected_by || (c as any).user_id;
    return Boolean(currentUserId && ownerId && ownerId === currentUserId);
  };
  const { query, path } = useRouter();
  const [tab, setTab] = useState("collections");

  // Sync active tab or open collection dialog based on URL parameters
  useEffect(() => {
    if (query?.tab) {
      setTab(query.tab);
    } else if (path?.includes("cashbook")) {
      setTab("cashbook");
    } else if (path?.includes("collection")) {
      setTab("collections");
    } else if (path?.includes("due")) {
      setTab("dues");
    }
    if (query?.action === "new" || query?.action === "collection") {
      openCollection();
    }
  }, [query?.tab, query?.action, path]);

  // Ensure Sales Officers / non-admin roles default to collections if expenses tab is requested
  useEffect(() => {
    if (!isManagerOrAdmin && tab === "expenses") {
      setTab("collections");
    }
  }, [isManagerOrAdmin, tab]);

  const [loading, setLoading] = useState(() => getCollections().length === 0);
  const [collections, setCollections] = useState<Collection[]>(() => getCollections());
  const [expenses, setExpenses] = useState<Expense[]>(() => syncSupplierPaymentsToExpenses(getExpenses()));
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionDetailsOpen, setCollectionDetailsOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"collection" | "expense">("collection");
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Tab-level date range filter states
  const [colStartDate, setColStartDate] = useState("");
  const [colEndDate, setColEndDate] = useState("");
  const { getUserName, getSalesOfficerById, salesOfficers: contextOfficers } = useUsers();
  const [salesOfficers, setSalesOfficers] = useState<ManagedUser[]>(() => getLocalSalesOfficers());
  const [colOfficerFilter, setColOfficerFilter] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("");
  const [cashbookStartDate, setCashbookStartDate] = useState("");
  const [cashbookEndDate, setCashbookEndDate] = useState("");
  const [dueStartDate, setDueStartDate] = useState("");
  const [dueEndDate, setDueEndDate] = useState("");

  // Date Range Inversion Auto-Swap & Notification Validation
  useEffect(() => {
    if (colStartDate && colEndDate && colStartDate > colEndDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      const temp = colStartDate;
      setColStartDate(colEndDate);
      setColEndDate(temp);
    }
  }, [colStartDate, colEndDate]);

  useEffect(() => {
    if (expStartDate && expEndDate && expStartDate > expEndDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      const temp = expStartDate;
      setExpStartDate(expEndDate);
      setExpEndDate(temp);
    }
  }, [expStartDate, expEndDate]);

  useEffect(() => {
    if (cashbookStartDate && cashbookEndDate && cashbookStartDate > cashbookEndDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      const temp = cashbookStartDate;
      setCashbookStartDate(cashbookEndDate);
      setCashbookEndDate(temp);
    }
  }, [cashbookStartDate, cashbookEndDate]);

  useEffect(() => {
    if (dueStartDate && dueEndDate && dueStartDate > dueEndDate) {
      toast.warning("শুরুর তারিখ শেষের তারিখের চেয়ে পরে হতে পারে না। তারিখ স্বয়ংক্রিয়ভাবে সংশোধন করা হয়েছে।");
      const temp = dueStartDate;
      setDueStartDate(dueEndDate);
      setDueEndDate(temp);
    }
  }, [dueStartDate, dueEndDate]);

  // Globally accessible User Lookup Map in state, populated synchronously on mount
  const [usersMap, setUsersMap] = useState<Record<string, UserLookupInfo>>(() => buildUserLookupMap(profile));

  // Sync usersMap whenever authenticated user profile changes
  useEffect(() => {
    if (profile?.id) {
      setUsersMap((prev) => {
        if (prev[profile.id]?.full_name === profile.full_name) return prev;
        return {
          ...prev,
          [profile.id]: {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role_name: profile.role_name,
          },
        };
      });
    }
  }, [profile]);

  const officersMap = useMemo(() => {
    const map = new Map<string, ManagedUser>();
    salesOfficers.forEach((so) => map.set(String(so.id), so));
    Object.values(usersMap).forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          email: u.email || "",
          full_name: u.full_name || "",
          role: "sales_officer",
          role_name: u.role_name || "Sales Officer",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    });
    return map;
  }, [salesOfficers, usersMap]);

  const mountedRef = useRef(true);

  const loadAccountsData = useCallback(async () => {
    try {
      const [usersRes, colRes, expRes, cRes, oRes, officersData] = await Promise.all([
        supabase.from("users").select("id, full_name, email, role_name"),
        supabase.from("collections").select("*, customer:customers(name), order:orders(order_number), collector:users(id, full_name, email)").order("collection_date", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("customers").select("*").order("name"),
        supabase.from("orders").select(SUPABASE_TABLE_SELECTS.ordersWithItemsAndCustomer).order("order_date", { ascending: false }).limit(1000),
        fetchActiveSalesOfficers(),
      ]);
      if (!mountedRef.current) return;

      // Build enriched user lookup map from database query, officers list, and collections
      const updatedUsersMap: Record<string, UserLookupInfo> = { ...buildUserLookupMap(profile) };

      if (!usersRes.error && Array.isArray(usersRes.data)) {
        usersRes.data.forEach((u: any) => {
          if (u.id) {
            updatedUsersMap[String(u.id)] = {
              id: String(u.id),
              full_name: u.full_name || u.name || "",
              email: u.email,
              role_name: u.role_name,
            };
          }
        });
      }

      if (Array.isArray(officersData) && officersData.length > 0) {
        officersData.forEach((so) => {
          if (so.id) {
            updatedUsersMap[String(so.id)] = {
              id: String(so.id),
              full_name: so.full_name || updatedUsersMap[String(so.id)]?.full_name || "",
              email: so.email || updatedUsersMap[String(so.id)]?.email,
              role_name: so.role_name || updatedUsersMap[String(so.id)]?.role_name,
            };
          }
        });
        setSalesOfficers(officersData);
      }

      if (!colRes.error && Array.isArray(colRes.data)) {
        (colRes.data as any[]).forEach((col) => {
          if (col.collected_by && col.collector?.full_name) {
            updatedUsersMap[String(col.collected_by)] = {
              id: String(col.collected_by),
              full_name: col.collector.full_name,
              email: col.collector.email || updatedUsersMap[String(col.collected_by)]?.email,
            };
          }
        });
      }

      setUsersMap(updatedUsersMap);

      const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
      let remoteCols: Collection[] | null = null;

      if (!colRes.error && Array.isArray(colRes.data)) {
        remoteCols = (colRes.data as Collection[]).filter((c: any) => !deletedColIds.has(c.id));
      } else {
        try {
          const fallbackRes = await supabase.from("collections").select("*").order("collection_date", { ascending: false });
          if (!fallbackRes.error && Array.isArray(fallbackRes.data)) {
            remoteCols = (fallbackRes.data as Collection[]).filter((c: any) => !deletedColIds.has(c.id));
          }
        } catch (fbErr) {
          console.warn("Fallback collections fetch notice:", fbErr);
        }
      }

      const allCustomers: Customer[] = (!cRes.error && Array.isArray(cRes.data))
        ? mergeAndEnrichCustomers(cRes.data as Customer[], { persist: true })
        : getCustomers();
      const allOrders: Order[] = (!oRes.error && Array.isArray(oRes.data))
        ? reconcileOrdersWithRemote(oRes.data as unknown as Order[], { persist: true, maxCache: 500 })
        : getOrders();

      if (remoteCols !== null) {
        const reconciledCols = reconcileCollectionsWithRemote(remoteCols, { persist: false });
        const enrichedCols: Collection[] = reconciledCols.map((c: Collection) => {
          const resolvedCollectorName = getUserName(
            c.collected_by,
            c.collector?.full_name || (c as any).collector_name || (c as any).collected_by_name || (c as any).sales_rep_name || "Sales Officer"
          );
          return {
            ...c,
            customer: c.customer || allCustomers.find((cust: Customer) => cust.id === c.customer_id),
            order: c.order || allOrders.find((ord: Order) => ord.id === c.order_id),
            collector_name: resolvedCollectorName || (c as any).collector_name || null,
            collected_by_name: resolvedCollectorName || (c as any).collected_by_name || null,
          };
        }).sort(
          (a, b) => new Date(b.collection_date || b.created_at || 0).getTime() - new Date(a.collection_date || a.created_at || 0).getTime()
        );
        setCollections(enrichedCols);
        setLocalData(STORAGE_KEYS.COLLECTIONS, enrichedCols, null, true);
      } else {
        setCollections(getCollections().filter((c: Collection) => !deletedColIds.has(c.id)));
      }

      const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
      let finalExps: Expense[] = [];
      if (!expRes.error && Array.isArray(expRes.data)) {
        const remoteExps = (expRes.data as Expense[]).filter((e: any) => !deletedExpIds.has(e.id));
        const localExps = getExpenses().filter((e: Expense) => !deletedExpIds.has(e.id));
        const remoteExpIds = new Set(remoteExps.map((e) => String(e.id)));
        const pendingLocalExps = localExps.filter(
          (le) => !remoteExpIds.has(String(le.id)) && isPendingOfflineRecord(le)
        );
        finalExps = syncSupplierPaymentsToExpenses([...pendingLocalExps, ...remoteExps]);
      } else {
        const localExps = getExpenses().filter((e: Expense) => !deletedExpIds.has(e.id));
        finalExps = syncSupplierPaymentsToExpenses(localExps);
      }
      setExpenses(finalExps);
      setLocalData(STORAGE_KEYS.EXPENSES, finalExps, null, true);

      if (!cRes.error && Array.isArray(cRes.data)) {
        setCustomers(allCustomers);
      }
      if (!oRes.error && Array.isArray(oRes.data)) {
        setOrders(allOrders);
      }
    } catch (err) {
      console.warn("Using cached accounts data due to network error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [profile, getUserName]);

  useAutoSync(() => {
    void loadAccountsData();
  });

  useEffect(() => {
    mountedRef.current = true;
    void loadAccountsData();

    const accChannel = supabase
      .channel("accounts-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, () => {
        if (mountedRef.current) void loadAccountsData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        if (mountedRef.current) void loadAccountsData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        if (mountedRef.current) void loadAccountsData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        if (mountedRef.current) void loadAccountsData();
      })
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(accChannel);
    };
  }, [loadAccountsData]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const currentMap = buildUserLookupMap(profile);
      setUsersMap((prev) => ({ ...prev, ...currentMap }));
      setSalesOfficers(getLocalSalesOfficers());
      const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
      const updatedCols = getCollections().filter((c) => !deletedColIds.has(c.id));
      setCollections([...updatedCols]);

      const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
      const updatedExps = syncSupplierPaymentsToExpenses(getExpenses().filter((e) => !deletedExpIds.has(e.id)));
      setExpenses([...updatedExps]);

      const updatedCusts: Customer[] = getCustomers();
      setCustomers([...updatedCusts]);

      const updatedOrds: Order[] = getOrders();
      setOrders([...updatedOrds]);
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);
    window.addEventListener("customer_ledger_updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
      window.removeEventListener("customer_ledger_updated", handleStorageUpdate);
    };
  }, []);

  const { dueMap, totalDue } = useMemo(() => {
    const uniqueCols = deduplicateCollections(collections);
    const nonCancelledOrders = orders.filter((o: any) => o && o.status !== "Cancelled");
    return calculateCustomerDues(customers, nonCancelledOrders, uniqueCols);
  }, [customers, orders, collections]);

  // BUG-023: Liquid account balance derived strictly from actual Cash Book entries
  // (COLLECTIONS cash inflows and EXPENSES cash outflows).
  // Raw order.paid_amount fields are NEVER added into liquid cash, preventing double-counting of collection receipts.
  const { totalCollection, totalExpense, opexExpense, supplierExpense, netCash, myCollectionTotal } = useMemo(() => {
    const uniqueCols = deduplicateCollections(collections);
    const tc = r2(uniqueCols.reduce((s, c) => s + Number(c.amount || 0), 0));
    const te = r2(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));
    const se = r2(
      expenses
        .filter((e: any) => isSupplierPaymentExpense(e))
        .reduce((s, e) => s + Number(e.amount || 0), 0)
    );
    const oe = r2(Math.max(0, te - se));
    const myCols = currentUserId
      ? uniqueCols.filter((c) => c.collected_by === currentUserId || (c as any).user_id === currentUserId)
      : [];
    const myTotal = r2(myCols.reduce((s, c) => s + Number(c.amount || 0), 0));
    return {
      totalCollection: tc,
      totalExpense: te,
      opexExpense: oe,
      supplierExpense: se,
      netCash: r2(tc - te),
      myCollectionTotal: myTotal,
    };
  }, [collections, expenses, currentUserId]);

  const customersWithDue = useMemo(() => {
    return customers
      .map((c) => {
        const info = dueMap.get(c.id);
        const due = info ? info.due : Number(c.current_due || 0);
        const status = info ? info.status : (c.due_status || "Clear");
        return { customer: c, due, status, opening: info ? info.opening : (c.opening_balance || 0) };
      })
      .filter((item) => item.due > 0)
      .sort((a, b) => b.due - a.due);
  }, [customers, dueMap]);

  const cashbookEntries = useMemo(() => {
    const uniqueCols = deduplicateCollections(collections);
    const entries: any[] = [
      ...uniqueCols.map((c) => ({
        date: c.collection_date,
        type: "Collection",
        ref: c.collection_number || `COL-${String(c.id).slice(0, 8)}`,
        in: Number(c.amount || 0),
        out: 0,
        collection: c,
      })),
      ...expenses.map((e) => ({
        date: e.expense_date,
        type: e.category,
        ref: e.description ?? "",
        in: 0,
        out: Number(e.amount || 0),
        collection: null,
      })),
    ];
    const chronological = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    const withBalance = chronological.map((e) => {
      running = r2(running + e.in - e.out);
      return { ...e, balance: running };
    });
    return withBalance.reverse();
  }, [collections, expenses]);

  const filteredCollections = useMemo(() => {
    const uniqueCols = deduplicateCollections(collections);
    const effStart = (colStartDate && colEndDate && colStartDate > colEndDate) ? colEndDate : colStartDate;
    const effEnd = (colStartDate && colEndDate && colStartDate > colEndDate) ? colStartDate : colEndDate;
    return uniqueCols.filter((c) => {
      const dateVal = c.collection_date || c.created_at;
      if (dateVal) {
        const d = dateVal.slice(0, 10);
        if (effStart && d < effStart) return false;
        if (effEnd && d > effEnd) return false;
      }
      if (colOfficerFilter && String(c.collected_by) !== String(colOfficerFilter)) return false;
      return true;
    });
  }, [collections, colStartDate, colEndDate, colOfficerFilter]);

  const filteredExpenses = useMemo(() => {
    const effStart = (expStartDate && expEndDate && expStartDate > expEndDate) ? expEndDate : expStartDate;
    const effEnd = (expStartDate && expEndDate && expStartDate > expEndDate) ? expStartDate : expEndDate;
    return expenses.filter((e) => {
      const dateVal = e.expense_date || e.created_at;
      if (!dateVal) return true;
      const d = dateVal.slice(0, 10);
      if (effStart && d < effStart) return false;
      if (effEnd && d > effEnd) return false;
      return true;
    });
  }, [expenses, expStartDate, expEndDate]);

  const filteredCashbookEntries = useMemo(() => {
    const effStart = (cashbookStartDate && cashbookEndDate && cashbookStartDate > cashbookEndDate) ? cashbookEndDate : cashbookStartDate;
    const effEnd = (cashbookStartDate && cashbookEndDate && cashbookStartDate > cashbookEndDate) ? cashbookStartDate : cashbookEndDate;
    return cashbookEntries.filter((e) => {
      if (!e.date) return true;
      const d = e.date.slice(0, 10);
      if (effStart && d < effStart) return false;
      if (effEnd && d > effEnd) return false;
      return true;
    });
  }, [cashbookEntries, cashbookStartDate, cashbookEndDate]);

  const filteredCustomersWithDue = useMemo(() => {
    const effStart = (dueStartDate && dueEndDate && dueStartDate > dueEndDate) ? dueEndDate : dueStartDate;
    const effEnd = (dueStartDate && dueEndDate && dueStartDate > dueEndDate) ? dueStartDate : dueEndDate;
    if (!effStart && !effEnd) return customersWithDue;
    return customersWithDue.filter(({ customer: c }) => {
      const custOrders = orders.filter((o) => (o.customer_id === c.id || (o as any).customerId === c.id));
      const hasOrderInRange = custOrders.some((o) => {
        const d = (o.order_date || o.created_at || "").slice(0, 10);
        if (!d) return false;
        if (effStart && d < effStart) return false;
        if (effEnd && d > effEnd) return false;
        return true;
      });
      if (hasOrderInRange) return true;

      const custCols = collections.filter((col) => (col.customer_id === c.id || (col as any).customerId === c.id));
      const hasColInRange = custCols.some((col) => {
        const d = (col.collection_date || col.created_at || "").slice(0, 10);
        if (!d) return false;
        if (effStart && d < effStart) return false;
        if (effEnd && d > effEnd) return false;
        return true;
      });
      if (hasColInRange) return true;

      const cDate = (c.created_at || c.updated_at || "").slice(0, 10);
      if (cDate) {
        if (effStart && cDate < effStart) return false;
        if (effEnd && cDate > effEnd) return false;
        return true;
      }
      return false;
    });
  }, [customersWithDue, orders, collections, dueStartDate, dueEndDate]);

  function openCollection() {
    setCustomers(getCustomers());
    setDialogType("collection");
    setForm({
      customer_id: "",
      order_id: "",
      amount: 0,
      payment_method: "Cash",
      bank_name: "",
      branch_name: "",
      cheque_number: "",
      cheque_date: "",
      notes: "",
      collection_date: new Date().toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  }

  function openExpense() {
    setDialogType("expense");
    setForm({ category: "Miscellaneous", description: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10), notes: "" });
    setDialogOpen(true);
  }

  async function save() {
    if (dialogType === "collection") {
      if (!form.customer_id || !form.amount) { toast.error("Customer and amount required"); return; }
      const amt = r2(Number(form.amount));
      if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }

      const isCheque = form.payment_method === "Cheque / Check" || form.payment_method === "Cheque";
      const bankName = isCheque ? (form.bank_name?.trim() || null) : null;
      const branchName = isCheque ? (form.branch_name?.trim() || null) : null;
      const chequeNumber = isCheque ? (form.cheque_number?.trim() || null) : null;
      const chequeDate = isCheque ? (form.cheque_date || null) : null;

      if (isCheque && !chequeNumber) {
        toast.error("Cheque Number is required for Cheque collections");
        return;
      }

      setSaving(true);
      try {
        const colNum = generateCollectionNumber(collections);
        const customer = customers.find((c: Customer) => c.id === form.customer_id);
        const order = orders.find((o: Order) => o.id === form.order_id);
        const tempId = crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}`;

        // Format note with cheque details
        let finalNotes = form.notes?.trim() || "";
        if (isCheque && chequeNumber) {
          const bankStr = [bankName, branchName ? `${branchName} Br.` : ""].filter(Boolean).join(" - ");
          const chequeTag = `Cheque: #${chequeNumber}${bankStr ? ` (${bankStr})` : ""}`;
          finalNotes = finalNotes ? `${chequeTag} · ${finalNotes}` : chequeTag;
        }

        // 1. Instant local mutation (BUG-019 snapshot)
        let prevDueCalc = 0;
        let remDueCalc = 0;
        if (form.customer_id) {
          const details = getCustomerLedgerDetails(form.customer_id, undefined, undefined, { persist: false });
          prevDueCalc = details.currentDue;
          remDueCalc = Math.max(0, r2(prevDueCalc - amt));
        }

        const currentOfficerName = getUserName(profile?.id || user?.id, "Sales Officer");
        const newCollection: Collection = {
          id: tempId,
          collection_number: colNum,
          customer_id: form.customer_id,
          order_id: form.order_id || null,
          amount: amt,
          payment_method: form.payment_method || "Cash",
          collection_date: form.collection_date || new Date().toISOString(),
          collected_by: profile?.id || user?.id || null,
          collector_name: currentOfficerName,
          collected_by_name: currentOfficerName,
          collector: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
          notes: finalNotes || null,
          created_at: new Date().toISOString(),
          bank_name: bankName,
          branch_name: branchName,
          cheque_number: chequeNumber,
          cheque_date: chequeDate,
          previous_due: prevDueCalc,
          remaining_due: remDueCalc,
          previousDue: prevDueCalc,
          remainingDue: remDueCalc,
          customer,
          order,
        };

        setCollections((prev) => optimisticAdd(prev, newCollection, STORAGE_KEYS.COLLECTIONS));

        // Update customer balance dynamically via master updateCustomerBalance
        let updatedCustDue = 0;
        let updatedCustStatus: 'Clear' | 'Partial' | 'Overdue' = 'Clear';
        if (form.customer_id) {
          const res = updateCustomerBalance(form.customer_id, orders, undefined);
          updatedCustDue = res.currentDue;
          updatedCustStatus = res.dueStatus as any;
          setCustomers(getCustomers());
        }

        // If order linked, update order paid and due locally and persist
        let updatedOrderPaid = 0;
        let updatedOrderDue = 0;
        let updatedOrderStatus = "Unpaid";
        if (order) {
          const newPaid = r2((order.paid_amount || 0) + amt);
          const newDue = Math.max(0, r2((order.total_amount || 0) - newPaid));
          const newStatus = newDue <= 0 ? "Paid" : "Partial";
          updatedOrderPaid = newPaid;
          updatedOrderDue = newDue;
          updatedOrderStatus = newStatus;
          setOrders((prev: Order[]) => {
            const next = prev.map((o: Order) => {
              if (o.id !== order.id) return o;
              return { ...o, paid_amount: newPaid, due_amount: newDue, payment_status: newStatus as any };
            });
            saveOrders(next);
            return next;
          });
        }

        toast.success(t("created"));
        setDialogOpen(false);
        // Trigger Real-Time Sync & Storage Event immediately after saving
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        dispatchGlobalStateUpdate({ customerId: form.customer_id, type: "collection_created" });

        // 2. Requirement 1: Background Supabase persistence (strictly aligned with physical collections schema)
        try {
          const normalizedMethod = normalizePaymentMethod(form.payment_method || "Cash");
          const collectionPayload: Record<string, any> = {
            collection_number: colNum,
            customer_id: form.customer_id,
            order_id: form.order_id || null,
            amount: amt,
            payment_method: normalizedMethod,
            collection_date: form.collection_date ? new Date(form.collection_date).toISOString() : new Date().toISOString(),
            collected_by: profile?.id || null,
            notes: finalNotes || null,
          };

          let savedId: string | null = null;

          // A. Attempt RPC first
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc("record_collection", {
              p_collection_number: colNum,
              p_customer_id: form.customer_id,
              p_order_id: form.order_id || null,
              p_amount: amt,
              p_payment_method: normalizedMethod,
              p_collection_date: form.collection_date || new Date().toISOString(),
              p_collected_by: profile?.id || null,
              p_notes: finalNotes || form.notes?.trim() || "",
            });
            if (!rpcError && rpcData?.id) {
              savedId = rpcData.id;
            } else if (rpcError) {
              console.warn("RPC record_collection notice, falling back to direct table insert:", rpcError.message);
            }
          } catch (rpcEx) {
            console.warn("RPC record_collection exception, falling back to direct table insert:", rpcEx);
          }

          // B. Direct table insert fallback if RPC did not save or is not configured
          if (!savedId) {
            const { data: insertData, error: insertError } = await supabase
              .from("collections")
              .insert(collectionPayload)
              .select()
              .single();

            if (insertError) {
              console.warn("Direct collections insert error (queued offline):", insertError.message);
            } else if (insertData?.id) {
              savedId = insertData.id;
            }
          }

          // C. Reconcile temporary ID with persisted Supabase ID or mark offline for retry
          if (savedId) {
            setCollections((prev) => {
              const reconciled = prev.map((item) =>
                item.id === tempId ? ({ ...item, id: savedId!, is_offline: false } as Collection) : item
              );
              saveCollections(reconciled);
              return reconciled;
            });
          } else {
            setCollections((prev) => {
              const queued = prev.map((item) =>
                item.id === tempId ? ({ ...item, is_offline: true } as Collection) : item
              );
              saveCollections(queued);
              return queued;
            });
          }

          // D. Requirement 1: Automatically update the corresponding customer's current_due in Supabase
          if (customer) {
            try {
              const { error: custErr } = await supabase
                .from("customers")
                .update({
                  current_due: updatedCustDue,
                  due_status: updatedCustStatus,
                })
                .eq("id", customer.id);
              if (custErr) console.warn("Supabase customer due update notice:", custErr.message);
            } catch (custEx) {
              console.warn("Supabase customer update exception:", custEx);
            }
          }

          // E. Update order in Supabase if linked
          if (order) {
            try {
              const { error: ordErr } = await supabase
                .from("orders")
                .update({
                  paid_amount: updatedOrderPaid,
                  due_amount: updatedOrderDue,
                  payment_status: updatedOrderStatus,
                })
                .eq("id", order.id);
              if (ordErr) console.warn("Supabase order paid/due update notice:", ordErr.message);
            } catch (ordEx) {
              console.warn("Supabase order update exception:", ordEx);
            }
          }

          window.dispatchEvent(new Event("sales_erp_storage_update"));
        } catch (syncErr: any) {
          console.warn("Supabase collection persistence exception (persisted locally):", syncErr?.message || syncErr);
        }
      } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
    } else {
      if (!form.category || !form.amount) { toast.error("Category and amount required"); return; }
      const amt = r2(Number(form.amount));
      if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }
      setSaving(true);
      try {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`;
        const newExpense: Expense = {
          id: tempId,
          category: form.category,
          description: form.description?.trim() || null,
          amount: amt,
          expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
          recorded_by: profile?.id ?? null,
          recorded_by_name: getUserName(profile?.id) || null,
          notes: form.notes?.trim() || null,
          created_at: new Date().toISOString(),
        };

        // 1. Instant local mutation
        setExpenses((prev) => optimisticAdd(prev, newExpense, STORAGE_KEYS.EXPENSES));
        toast.success(t("created"));
        setDialogOpen(false);
        window.dispatchEvent(new Event("sales_erp_storage_update"));

        // 2. Background persistence
        supabase.from("expenses").insert({
          category: form.category,
          description: form.description,
          amount: amt,
          expense_date: form.expense_date,
          recorded_by: profile?.id,
          notes: form.notes,
        }).select().single().then(({ data, error }) => {
          if (!error && data) {
            setExpenses((prev) => {
              const reconciled = prev.map((item) =>
                item.id === tempId ? (data as Expense) : item
              );
              saveExpenses(reconciled);
              return reconciled;
            });
          } else if (error) {
            console.warn("Supabase expense insert error:", error.message);
          }
        });
      } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
    }
  }

  const handleDeleteCollection = (id: string) => {
    const target = collections.find((c) => String(c.id) === String(id));

    if (target && !canModifyCollection(target)) {
      toast.error("Permission denied: You can only delete collections recorded by yourself.");
      return;
    }

    if (target?.order_id) {
      let nextOrderPaid = 0;
      let nextOrderDue = 0;
      let nextOrderStatus: "Unpaid" | "Partial" | "Paid" = "Unpaid";
      setOrders((prev) => {
        const updated = prev.map((ord) => {
          if (ord.id !== target.order_id) return ord;
          const newPaid = Math.max(0, r2((ord.paid_amount || 0) - Number(target.amount || 0)));
          const newDue = Math.max(0, r2(ord.total_amount - newPaid));
          const newStatus = newPaid <= 0 ? "Unpaid" : newDue <= 0 ? "Paid" : "Partial";
          nextOrderPaid = newPaid;
          nextOrderDue = newDue;
          nextOrderStatus = newStatus;
          return { ...ord, paid_amount: newPaid, due_amount: newDue, payment_status: newStatus as any };
        });
        saveOrders(updated);
        return updated;
      });
      supabase
        .from("orders")
        .update({
          paid_amount: nextOrderPaid,
          due_amount: nextOrderDue,
          payment_status: nextOrderStatus,
        })
        .eq("id", target.order_id)
        .then(undefined, (err) => console.warn("Supabase order paid/due revert notice:", err));
    }

    const updated = deleteCollection(id);
    setCollections([...updated]); // Spread operator creates a new array reference to force immediate React re-render

    if (target?.customer_id) {
      recalculateCustomerLedger(target.customer_id, undefined, updated, { persist: true });
      setCustomers(getCustomers());
    }
    toast.success(t("deleted"));
  };

  const removeCollection = (c: Collection) => handleDeleteCollection(c.id);

  const handleDeleteExpense = (id: string) => {
    const updated = deleteExpense(id);
    setExpenses([...updated]); // Spread operator creates a new array reference to force immediate React re-render
    toast.success(t("deleted"));
  };

  const removeExpense = (e: Expense) => handleDeleteExpense(e.id);

  function handleExportCollections() {
    exportToExcel("collections", filteredCollections.map((c) => ({
      CollectionNo: c.collection_number, Customer: c.customer?.name ?? "",
      Date: formatDate(c.collection_date), Amount: c.amount,
      Method: c.payment_method, Order: c.order?.order_number ?? "",
    })));
  }

  function handleExportExpenses() {
    exportToExcel("expenses", filteredExpenses.map((e) => ({
      Category: e.category, Description: e.description ?? "",
      Date: formatDate(e.expense_date), Amount: e.amount, Notes: e.notes ?? "",
    })));
  }

  function handleExportCashbook() {
    exportToExcel("daily_cash_book", filteredCashbookEntries.map((e) => ({
      Date: formatDate(e.date), Type: e.type, Reference: e.ref ?? "",
      In: e.in > 0 ? e.in : 0, Out: e.out > 0 ? e.out : 0, Balance: e.balance,
    })));
  }

  function handleExportCustomerDues() {
    exportToExcel("customer_dues", filteredCustomersWithDue.map(({ customer: c, due, status }) => ({
      Customer: c.outlet_name || c.name,
      Type: c.customer_type,
      Phone: c.phone ?? "",
      Due: due,
      Status: status,
    })));
  }
  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-600" /><p className="text-xs text-muted-foreground">{t("totalCollection")}</p></div>
          <p className="text-xl font-bold mt-2 text-emerald-600">{formatBDT(totalCollection)}</p>
        </CardContent></Card>
        {isManagerOrAdmin ? (
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" /><p className="text-xs text-muted-foreground">{t("totalExpenses")}</p></div>
            <p className="text-xl font-bold mt-2 text-rose-600">{formatBDT(totalExpense)}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span>OPEX: {formatBDT(opexExpense)}</span>
              <span>•</span>
              <span>Supplier: {formatBDT(supplierExpense)}</span>
            </div>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-700" /><p className="text-xs text-muted-foreground">{t("myTotalCollections")}</p></div>
            <p className="text-xl font-bold mt-2 text-emerald-700">{formatBDT(myCollectionTotal)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{t("loggedByYou")}</p>
          </CardContent></Card>
        )}
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-600" /><p className="text-xs text-muted-foreground">{t("netCashFlow")}</p></div>
          <p className={`text-xl font-bold mt-2 ${netCash >= 0 ? "text-blue-600" : "text-rose-600"}`}>{formatBDT(netCash)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t("collectionsMinusOutflows")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-600" /><p className="text-xs text-muted-foreground">{t("totalDue")}</p></div>
          <p className="text-xl font-bold mt-2 text-amber-600">{formatBDT(totalDue)}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {isManagerOrAdmin && (
          <Button size="sm" variant="outline" onClick={openExpense}><Plus className="h-4 w-4" /> {t("expenseEntry")}</Button>
        )}
        <Button size="sm" onClick={openCollection}><Plus className="h-4 w-4" /> {t("cashCollection")}</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="collections">{t("cashCollection")}</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="expenses">{t("expenseEntry")}</TabsTrigger>}
          <TabsTrigger value="cashbook">{t("cashBook")}</TabsTrigger>
          <TabsTrigger value="dues">{t("customerDue")}</TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <CardTitle className="text-base">{t("collectionReport")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <TableDateRangePicker
                  startDate={colStartDate}
                  endDate={colEndDate}
                  onStartDateChange={setColStartDate}
                  onEndDateChange={setColEndDate}
                  onClear={() => { setColStartDate(""); setColEndDate(""); }}
                />
                <Select
                  value={colOfficerFilter}
                  onChange={(e) => setColOfficerFilter(e.target.value)}
                  className="h-8 text-xs w-44"
                >
                  <option value="">{t("allOfficers")}</option>
                  {(contextOfficers && contextOfficers.length > 0 ? contextOfficers : salesOfficers).map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.full_name || so.email}
                    </option>
                  ))}
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportCollections}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative max-w-full">
              {loading ? (
                <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredCollections.length === 0 ? (
                <EmptyState icon={<DollarSign className="h-10 w-10" />} title={t("noData")} description={colStartDate || colEndDate ? "No collections found in selected date range" : undefined} />
              ) : (
                <div>
                  {/* Mobile Collections Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {filteredCollections.map((c) => {
                      const displayColNo = c.collection_number || `COL-${String(c.id).slice(0, 8)}`;
                      return (
                        <div key={c.id} className="p-4 space-y-2.5 bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCollection(c);
                                  setCollectionDetailsOpen(true);
                                }}
                                className="font-mono text-sm font-bold text-primary hover:underline transition-colors text-left"
                              >
                                {displayColNo}
                              </button>
                              <p className="text-xs font-semibold text-foreground mt-0.5">
                                {(c.customer?.outlet_name || c.customer?.name) ?? "—"}
                              </p>
                            </div>
                            <span className="font-mono text-base font-bold text-emerald-600">
                              {formatBDT(c.amount)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground pt-1">
                            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                              <User className="h-3 w-3" />
                              {getUserName(
                                c.collected_by,
                                c.collector?.full_name || (c as any).collector_name || (c as any).collected_by_name || (c as any).sales_rep_name
                              )}
                            </span>
                            <span>{formatDate(c.collection_date)}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{c.payment_method}</Badge>
                              {(c.cheque_number || c.bank_name) && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {c.bank_name ? `${c.bank_name}` : ""}{c.cheque_number ? ` #${c.cheque_number}` : ""}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  setSelectedCollection(c);
                                  setCollectionDetailsOpen(true);
                                }}
                              >
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span>Receipt</span>
                              </Button>
                              {canModifyCollection(c) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteCollection(c.id)}
                                  title={t("delete")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("collectionNumber")}</TableHead>
                          <TableHead>{t("customer")}</TableHead>
                          <TableHead>{t("salesOfficer")}</TableHead>
                          <TableHead>{t("date")}</TableHead>
                          <TableHead className="text-right">{t("amount")}</TableHead>
                          <TableHead>{t("paymentMethod")}</TableHead>
                          <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCollections.map((c) => {
                          const displayColNo = c.collection_number || `COL-${String(c.id).slice(0, 8)}`;

                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCollection(c);
                                    setCollectionDetailsOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer text-left transition-colors"
                                  title={`View Collection Receipt for ${displayColNo}`}
                                >
                                  {displayColNo}
                                </button>
                              </TableCell>
                              <TableCell className="font-medium">
                                <p>{(c.customer?.outlet_name || c.customer?.name) ?? "—"}</p>
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60 whitespace-nowrap">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {getUserName(
                                    c.collected_by,
                                    c.collector?.full_name || (c as any).collector_name || (c as any).collected_by_name || (c as any).sales_rep_name
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(c.collection_date)}</TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">{formatBDT(c.amount)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="secondary" className="text-[10px] w-fit">{c.payment_method}</Badge>
                                  {(c.cheque_number || c.bank_name) && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {c.bank_name ? `${c.bank_name}` : ""}{c.cheque_number ? ` #${c.cheque_number}` : ""}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                <div className="whitespace-nowrap flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedCollection(c);
                                      setCollectionDetailsOpen(true);
                                    }}
                                    title="View Collection Receipt & Details"
                                  >
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  </Button>
                                  {canModifyCollection(c) ? (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCollection(c.id)} title={t("delete")}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled
                                      className="opacity-30 cursor-not-allowed"
                                      title="Only the collector or finance team can delete this collection"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManagerOrAdmin && (
          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                <CardTitle className="text-base">{t("expenseReport")}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <TableDateRangePicker
                    startDate={expStartDate}
                    endDate={expEndDate}
                    onStartDateChange={setExpStartDate}
                    onEndDateChange={setExpEndDate}
                    onClear={() => { setExpStartDate(""); setExpEndDate(""); }}
                  />
                  <Button variant="outline" size="sm" onClick={handleExportExpenses}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative max-w-full">
                {filteredExpenses.length === 0 ? (
                  <EmptyState icon={<TrendingDown className="h-10 w-10" />} title={t("noData")} description={expStartDate || expEndDate ? "No expenses found in selected date range" : undefined} />
                ) : (
                  <div>
                    {/* Mobile Cards (screens < 768px) */}
                    <div className="block md:hidden divide-y divide-border/60">
                      {filteredExpenses.map((e) => (
                        <div key={e.id} className="p-3.5 space-y-2 bg-card/50 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] font-semibold">{e.category}</Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(e.expense_date)}</span>
                              </div>
                              <p className="text-sm font-medium text-foreground line-clamp-2">{e.description ?? "—"}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-bold text-rose-600">{formatBDT(e.amount)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              {getUserName(e.recorded_by, (e as any).recorded_by_name || "Admin")}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteExpense(e.id)}
                              title={t("delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (screens md+ >= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("expenseCategory")}</TableHead>
                            <TableHead>{t("description")}</TableHead>
                            <TableHead>Recorded By</TableHead>
                            <TableHead>{t("date")}</TableHead>
                            <TableHead className="text-right">{t("amount")}</TableHead>
                            <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell><Badge variant="secondary" className="text-[10px]">{e.category}</Badge></TableCell>
                              <TableCell className="text-sm">{e.description ?? "—"}</TableCell>
                              <TableCell className="text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60 whitespace-nowrap">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {getUserName(e.recorded_by, (e as any).recorded_by_name || "Admin")}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(e.expense_date)}</TableCell>
                              <TableCell className="text-right font-semibold text-rose-600">{formatBDT(e.amount)}</TableCell>
                              <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                <div className="whitespace-nowrap flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(e.id)} title={t("delete")}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="cashbook">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <CardTitle className="text-base">{t("cashBook")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <TableDateRangePicker
                  startDate={cashbookStartDate}
                  endDate={cashbookEndDate}
                  onStartDateChange={setCashbookStartDate}
                  onEndDateChange={setCashbookEndDate}
                  onClear={() => { setCashbookStartDate(""); setCashbookEndDate(""); }}
                />
                <Button variant="outline" size="sm" onClick={handleExportCashbook}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative max-w-full">
              {filteredCashbookEntries.length === 0 ? (
                <EmptyState icon={<BookOpen className="h-10 w-10" />} title={t("noData")} description={cashbookStartDate || cashbookEndDate ? "No cash book entries found in selected date range" : undefined} />
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {filteredCashbookEntries.map((e, i) => (
                      <div key={i} className="p-3.5 space-y-2 bg-card/50 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">{formatDate(e.date)}</span>
                            <p className="text-sm font-semibold text-foreground">{e.type}</p>
                            <div className="text-xs font-mono mt-0.5">
                              {e.collection ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCollection(e.collection);
                                    setCollectionDetailsOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer text-left transition-colors"
                                  title={`View Collection Receipt for ${e.ref}`}
                                >
                                  {e.ref}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">{e.ref}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-0.5">
                            {e.in > 0 && (
                              <div className="text-xs font-semibold text-emerald-600">
                                In: +{formatBDT(e.in)}
                              </div>
                            )}
                            {e.out > 0 && (
                              <div className="text-xs font-semibold text-rose-600">
                                Out: -{formatBDT(e.out)}
                              </div>
                            )}
                            <div className="text-sm font-bold text-foreground pt-1 border-t border-border/40">
                              Bal: {formatBDT(e.balance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("date")}</TableHead>
                          <TableHead>{t("description" as string) || "Type"}</TableHead>
                          <TableHead>{t("reference" as string) || "Reference"}</TableHead>
                          <TableHead className="text-right">{t("cash" as string) || "In"}</TableHead>
                          <TableHead className="text-right">{t("expenseEntry" as string) || "Out"}</TableHead>
                          <TableHead className="text-right">{t("total" as string) || "Balance"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCashbookEntries.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                            <TableCell className="text-sm">{e.type}</TableCell>
                            <TableCell className="text-xs">
                              {e.collection ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCollection(e.collection);
                                    setCollectionDetailsOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-semibold cursor-pointer text-left transition-colors"
                                  title={`View Collection Receipt for ${e.ref}`}
                                >
                                  {e.ref}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">{e.ref}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600">{e.in > 0 ? formatBDT(e.in) : "—"}</TableCell>
                            <TableCell className="text-right text-rose-600">{e.out > 0 ? formatBDT(e.out) : "—"}</TableCell>
                            <TableCell className="text-right font-medium">{formatBDT(e.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <CardTitle className="text-base">{t("customerDue")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <TableDateRangePicker
                  startDate={dueStartDate}
                  endDate={dueEndDate}
                  onStartDateChange={setDueStartDate}
                  onEndDateChange={setDueEndDate}
                  onClear={() => { setDueStartDate(""); setDueEndDate(""); }}
                />
                <Button variant="outline" size="sm" onClick={handleExportCustomerDues}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative max-w-full">
              {filteredCustomersWithDue.length === 0 ? (
                <EmptyState icon={<Wallet className="h-10 w-10" />} title={t("noData")} description={dueStartDate || dueEndDate ? "No customer dues found in selected date range" : "No outstanding dues"} />
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {filteredCustomersWithDue.map(({ customer: c, due, status, opening }) => (
                      <div key={c.id} className="p-3.5 space-y-2.5 bg-card/50 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground leading-tight truncate">{c.outlet_name || c.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{t(c.customer_type.toLowerCase())}</Badge>
                              <Badge variant={status === "Overdue" ? "destructive" : "warning"} className="text-[10px]">
                                {t(status.toLowerCase())}
                              </Badge>
                            </div>
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Phone className="h-3 w-3 text-emerald-500" />
                                {c.phone}
                              </a>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground block">{t("currentDue" as string) || "Due"}</span>
                            <span className="text-base font-bold text-amber-600">{formatBDT(due)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end pt-1 border-t border-border/40">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                            onClick={() => {
                              setSelectedLedgerCustomer({
                                ...c,
                                current_due: due,
                                due_status: status,
                                opening_balance: opening,
                              });
                              setLedgerOpen(true);
                            }}
                          >
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span>View Ledger</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("customer")}</TableHead>
                          <TableHead>{t("customerType")}</TableHead>
                          <TableHead>{t("phone")}</TableHead>
                          <TableHead className="text-right">{t("currentDue" as string) || "Due"}</TableHead>
                          <TableHead>{t("dueStatus")}</TableHead>
                          <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomersWithDue.map(({ customer: c, due, status, opening }) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              <p>{c.outlet_name || c.name}</p>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{t(c.customer_type.toLowerCase())}</Badge></TableCell>
                            <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold text-amber-600">{formatBDT(due)}</TableCell>
                            <TableCell><Badge variant={status === "Overdue" ? "destructive" : "warning"} className="text-[10px]">{t(status.toLowerCase())}</Badge></TableCell>
                            <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                              <div className="whitespace-nowrap flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1.5"
                                  onClick={() => {
                                    setSelectedLedgerCustomer({
                                      ...c,
                                      current_due: due,
                                      due_status: status,
                                      opening_balance: opening,
                                    });
                                    setLedgerOpen(true);
                                  }}
                                >
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  <span>View Ledger</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={dialogType === "collection" ? t("cashCollection") : t("expenseEntry")} size="md">
        <div className="space-y-4">
          {dialogType === "collection" ? (
            <>
              <div className="space-y-1.5">
                <Label>{t("selectCustomer")}</Label>
                <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">— Select Outlet / Customer —</option>
                  {customers.map((c) => {
                    const partyCode = (c.party_code || (c as any).partyCode || (c as any).code || "").trim();
                    const outletName = (c.outlet_name || (c as any).outletName || c.name || "").trim();
                    const area = (c.area || c.city || (c.territory as any)?.name || "").trim();
                    const phone = (c.phone || "").trim();
                    const details = [partyCode, area || phone].filter(Boolean).join(" - ");
                    const label = details ? `${outletName} (${details})` : outletName;
                    return (
                      <option key={c.id} value={c.id}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
                {(() => {
                  const selectedCustomer = customers.find((c) => c.id === form.customer_id);
                  if (!selectedCustomer) return null;
                  const dueInfo = dueMap.get(form.customer_id);
                  const selectedCustomerDue =
                    dueInfo?.due !== undefined
                      ? dueInfo.due
                      : getCustomerLedgerDetails(form.customer_id, orders, collections, { persist: false }).currentDue;
                  return (
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground font-medium">
                        {t("currentDue" as string) || "Current Due"}
                      </span>
                      <Badge
                        variant={selectedCustomerDue > 0 ? "destructive" : "secondary"}
                        className="font-semibold text-xs px-2 py-0.5"
                      >
                        {formatBDT(selectedCustomerDue)}
                      </Badge>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label>{t("orderNumber" as string) || "Order (optional)"}</Label>
                <Select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
                  <option value="">— Link to specific order (optional) —</option>
                  {orders.filter((o: Order) => o.customer_id === form.customer_id).map((o: Order) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} (Due: ৳ {Number(o.due_amount ?? 0).toLocaleString()})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("amount")}</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5">
                  <Label>{t("paymentMethod")}</Label>
                  <Select value={form.payment_method || "Cash"} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Dynamic Cheque Details Section */}
              {(form.payment_method === "Cheque / Check" || form.payment_method === "Cheque") && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Cheque / Check Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Bank Name *</Label>
                      <Input
                        list="accounts-bank-options"
                        value={form.bank_name || ""}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        placeholder="Select or enter Bank"
                      />
                      <datalist id="accounts-bank-options">
                        {BANGLADESH_BANKS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Branch Name</Label>
                      <Input
                        value={form.branch_name || ""}
                        onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                        placeholder="e.g. Mathbaria Branch"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cheque Number *</Label>
                      <Input
                        value={form.cheque_number || ""}
                        onChange={(e) => setForm({ ...form, cheque_number: e.target.value })}
                        placeholder="e.g. 1234567"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cheque Date</Label>
                      <Input
                        type="date"
                        value={form.cheque_date || ""}
                        onChange={(e) => setForm({ ...form, cheque_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5"><Label>{t("date")}</Label><Input type="datetime-local" value={form.collection_date} onChange={(e) => setForm({ ...form, collection_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </>
          ) : (
            <>
              <div className="space-y-1.5"><Label>{t("expenseCategory")}</Label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{expenseCategories.map((c) => <option key={c} value={c}>{t(c.toLowerCase())}</option>)}</Select></div>
              <div className="space-y-1.5"><Label>{t("description")}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("amount")}</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>{t("date")}</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t("save")}</Button>
        </div>
      </Dialog>

      {/* Customer Ledger Statement Modal */}
      <CustomerLedgerModal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        customer={selectedLedgerCustomer}
      />

      {/* Order Details & Print Invoice Modal */}
      <OrderDetailsModal
        open={orderDetailsOpen}
        onClose={() => {
          setOrderDetailsOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      {/* Collection Details & Print Receipt Modal */}
      <CollectionDetailsModal
        open={collectionDetailsOpen}
        onClose={() => {
          setCollectionDetailsOpen(false);
          setSelectedCollection(null);
        }}
        collection={selectedCollection}
      />
    </div>
  );
}



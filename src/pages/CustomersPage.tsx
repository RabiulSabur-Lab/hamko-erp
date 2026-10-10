import { useEffect, useState, useMemo } from "react";
import { supabase, type Customer, type Territory, type Order, type Collection } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, formatDate, toBnDigit } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import { Plus, Search, Pencil, Trash2, Download, Users, Phone, Loader2, BookOpen, ShieldCheck, Sparkles, User, X, RefreshCw } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { toast } from "sonner";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useRouter } from "@/router";
import { CustomerLedgerModal } from "@/components/CustomerLedgerModal";
import { AddCustomerModal, parseCustomerNotes } from "@/components/AddCustomerModal";
import { PaymentReminderModal } from "@/components/PaymentReminderModal";

const customerTypes = ["Dealer", "Retailer", "Wholesale"] as const;
const dueStatuses = ["Clear", "Overdue", "Partial"] as const;

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  deleteCustomer,
  updateCustomer,
  saveCustomer,
  getOrders,
  getCollections,
  getDeletedIds,
  getCustomers,
  getAreas,
  type Area,
  mergeAndEnrichCustomers,
  calculateCustomerDues,
  r2,
  deduplicateCollections,
} from "@/utils/localStore";

export function CustomersPage() {
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();
  const { query, navigate } = useRouter();

  const isManagerOrAdmin = useMemo(() => {
    const role = (
      profile?.role_name ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      ""
    ).toLowerCase().trim();
    return role.includes("admin") || role.includes("manager");
  }, [profile, user]);

  const currentUserId = profile?.id || user?.id;

  // Strict Edit-Own Permission Rule:
  // - All authenticated Sales Officers can VIEW all customer lists across the system (Read Access).
  // - Sales Officers can ONLY edit, update, or delete customers created by or assigned to themselves.
  // - Admins and Managers retain full modification permissions.
  const canModifyCustomer = (c?: Customer | null): boolean => {
    if (isManagerOrAdmin) return true;
    if (!c) return false;
    const ownerId = c.assigned_to || (c as any).created_by || (c as any).sales_rep_id;
    return Boolean(currentUserId && ownerId && ownerId === currentUserId);
  };
  const [loading, setLoading] = useState(() => getCustomers().length === 0);
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [collections, setCollections] = useState<Collection[]>(() => getCollections());
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [search, setSearch] = useState(() => query.search || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [dueFilter, setDueFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedReminderCustomer, setSelectedReminderCustomer] = useState<Customer | null>(null);
  const [selectedReminderDue, setSelectedReminderDue] = useState(0);
  const [editing, setEditing] = useState<Customer | null>(null);
  const { getUserName, salesOfficers } = useUsers();
  const [areas, setAreas] = useState<Area[]>(() => getAreas());
  const [areaFilter, setAreaFilter] = useState("");
  const [officerFilter, setOfficerFilter] = useState("");

  useEffect(() => {
    loadData();

    const handleStorage = () => {
      setCustomers(getCustomers());
      setOrders(getOrders());
      setCollections(getCollections());
      setAreas(getAreas());
    };

    const custChannel = supabase
      .channel("customers-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, () => loadData())
      .subscribe();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleStorage);
    window.addEventListener("customer_ledger_updated", handleStorage);
    return () => {
      supabase.removeChannel(custChannel);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleStorage);
      window.removeEventListener("customer_ledger_updated", handleStorage);
    };
  }, []);

  // Anti-stale data: auto re-fetch on window focus, visibility change, and mobile app resume
  useAutoSync(() => {
    loadData(false);
  });

  async function loadData(isManual = false) {
    if (isManual) setLoading(true);
    try {
      const [cRes, tRes, oRes, colRes] = await Promise.all([
        supabase.from("customers").select("*, territory:territories(*)").order("name", { ascending: true }),
        supabase.from("territories").select("*").order("name"),
        supabase.from("orders").select("id, customer_id, total_amount, status, created_at, order_date, customer:customers(name)").order("order_date", { ascending: false }),
        supabase.from("collections").select("id, customer_id, amount, collection_date, customer:customers(name)").order("collection_date", { ascending: false }),
      ]);
      if (!cRes.error && Array.isArray(cRes.data)) {
        const merged = mergeAndEnrichCustomers(cRes.data as Customer[]);
        setCustomers(Array.isArray(merged) ? merged : []);
        if (isManual) {
          toast.success(`Live sync: ${merged.length} customers/outlets synchronized`);
        }
      }
      if (tRes.data) {
        setTerritories(tRes.data);
      }
      if (!oRes.error && Array.isArray(oRes.data)) {
        const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
        const remoteOrders = (oRes.data as unknown as Order[]).filter((o: any) => !deletedOrderIds.has(o.id));
        const remoteIdSet = new Set(remoteOrders.map((o) => String(o.id)));
        const currentLocal = getOrders().filter((o: any) => !deletedOrderIds.has(o.id));
        const pendingLocal = currentLocal.filter((lo) => !remoteIdSet.has(String(lo.id)));
        const merged = [...pendingLocal, ...remoteOrders];
        setOrders(merged);
        setLocalData(STORAGE_KEYS.ORDERS, merged);
      }
      if (!colRes.error && Array.isArray(colRes.data)) {
        const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
        const remoteCols = (colRes.data as unknown as Collection[]).filter((c: any) => !deletedColIds.has(c.id));
        const remoteIdSet = new Set(remoteCols.map((c) => String(c.id)));
        const remoteColNumSet = new Set(
          remoteCols.map((c: any) => String(c.collection_number || "").trim().toUpperCase()).filter(Boolean)
        );
        const currentLocal = getCollections().filter((c: any) => !deletedColIds.has(c.id));
        const pendingLocal = currentLocal.filter(
          (lc) =>
            !remoteIdSet.has(String(lc.id)) &&
            (!lc.collection_number || !remoteColNumSet.has(String(lc.collection_number).trim().toUpperCase()))
        );
        const merged = deduplicateCollections([...pendingLocal, ...remoteCols]);
        setCollections(merged);
        setLocalData(STORAGE_KEYS.COLLECTIONS, merged);
      }
    } catch (err) {
      console.warn("Using local customer cache due to fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Dynamic ledger calculation matching unified calculateCustomerDues
  const { dueMap: customerDueMap } = useMemo(() => {
    return calculateCustomerDues(customers, orders, deduplicateCollections(collections));
  }, [customers, orders, collections]);

  const filtered = useMemo(() => {
    return [...customers]
      .filter((c) => {
        const s = search.trim().toLowerCase();
        const sNorm = s.replace(/[-_\s]/g, "");
        const dueInfo = customerDueMap.get(c.id);
        const dueStatus = dueInfo?.status || c.due_status || "Clear";

        // Party code matching (handles "SAD-0001", "sad0001", "SAD", etc.)
        const rawPartyCode = c.party_code || (c as any).partyCode || (c as any).code || "";
        const partyCode = rawPartyCode.toLowerCase();
        const partyCodeNorm = partyCode.replace(/[-_\s]/g, "");

        const outletName = (c.outlet_name || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        const contactPerson = (c.contact_person || "").toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        const altPhone = (c.alt_phone ?? "").toLowerCase();
        const phoneNorm = phone.replace(/[-_\s]/g, "");
        const altPhoneNorm = altPhone.replace(/[-_\s]/g, "");
        const license = (c.trade_license_number ?? "").toLowerCase();

        const matchSearch =
          !s ||
          outletName.includes(s) ||
          name.includes(s) ||
          contactPerson.includes(s) ||
          phone.includes(s) ||
          altPhone.includes(s) ||
          (sNorm.length > 0 && phoneNorm.includes(sNorm)) ||
          (sNorm.length > 0 && altPhoneNorm.includes(sNorm)) ||
          license.includes(s) ||
          partyCode.includes(s) ||
          (sNorm.length > 0 && partyCodeNorm.includes(sNorm));

        const matchType = !typeFilter || c.customer_type === typeFilter;
        const matchDue = !dueFilter || dueStatus === dueFilter;
        const matchArea =
          !areaFilter ||
          (c.area && c.area.trim().toLowerCase() === areaFilter.trim().toLowerCase()) ||
          (c.city && c.city.trim().toLowerCase() === areaFilter.trim().toLowerCase());
        const matchStatus =
          !statusFilter ||
          (statusFilter === "Inactive"
            ? c.status === "Inactive" || c.is_active === false
            : c.status !== "Inactive" && c.is_active !== false);
        const matchOfficer =
          !officerFilter ||
          String(c.assigned_to || (c as any).sales_rep_id || (c as any).created_by) === String(officerFilter);
        return matchSearch && matchType && matchDue && matchArea && matchStatus && matchOfficer;
      })
      .sort((a, b) => (a.outlet_name || a.name || "").localeCompare(b.outlet_name || b.name || ""));
  }, [customers, search, typeFilter, dueFilter, areaFilter, statusFilter, officerFilter, customerDueMap]);

  useEffect(() => {
    if (query.search && query.search !== search) {
      setSearch(query.search);
    }
    if (query.ledger && (query.id || query.customer || query.search)) {
      let target: Customer | undefined;
      if (query.id) {
        target = customers.find((c) => String(c.id).trim() === String(query.id).trim());
      }
      if (!target) {
        const targetQuery = (query.customer || query.search || "").trim().toLowerCase();
        const targetQueryNorm = targetQuery.replace(/[-_\s]/g, "");
        target = customers.find((c) => {
          const rawPartyCode = c.party_code || (c as any).partyCode || (c as any).code || "";
          const partyCode = rawPartyCode.toLowerCase();
          const partyCodeNorm = partyCode.replace(/[-_\s]/g, "");
          return (
            c.id === targetQuery ||
            (partyCode && (partyCode === targetQuery || partyCode.includes(targetQuery))) ||
            (targetQueryNorm.length > 0 && partyCodeNorm.includes(targetQueryNorm)) ||
            (c.outlet_name && c.outlet_name.toLowerCase().includes(targetQuery)) ||
            (c.name && c.name.toLowerCase().includes(targetQuery))
          );
        });
      }
      if (target) {
        const dueInfo = customerDueMap.get(target.id);
        setSelectedLedgerCustomer({
          ...target,
          current_due: dueInfo ? dueInfo.due : Number(target.current_due || 0),
          due_status: dueInfo ? dueInfo.status : (target.due_status || "Clear"),
          opening_balance: target.opening_balance ?? 0,
        });
        setLedgerOpen(true);
      }
    }
  }, [query.search, query.ledger, query.id, query.customer, customers, customerDueMap]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    if (!canModifyCustomer(c)) {
      toast.error("Permission denied: You can only edit customers created by or assigned to yourself.");
      return;
    }
    const dueInfo = customerDueMap.get(c.id);
    setEditing({
      ...c,
      current_due: dueInfo ? dueInfo.due : Number(c.current_due || 0),
      due_status: dueInfo ? dueInfo.status : (c.due_status || "Clear"),
    });
    setDialogOpen(true);
  }

  async function handleStatusChange(c: Customer, newStatus: "Active" | "Inactive") {
    if (!canModifyCustomer(c)) {
      toast.error("Permission denied: You can only edit customers created by or assigned to yourself.");
      return;
    }
    const is_active = newStatus === "Active";
    const updatedCustomer: Customer = {
      ...c,
      status: newStatus,
      is_active,
      updated_at: new Date().toISOString(),
    };

    // 1. Immediately update store & write full array to localStorage & dispatch storage update
    updateCustomer(updatedCustomer);

    // 2. Instant local UI state update
    setCustomers((prev) =>
      prev.map((item) => (item.id === c.id ? updatedCustomer : item))
    );

    toast.success(`Customer "${c.outlet_name || c.name}" marked as ${newStatus}`);

    // 3. Sync to Supabase in background
    try {
      await supabase
        .from("customers")
        .update({ is_active })
        .eq("id", c.id);
    } catch (err) {
      console.warn("Supabase customer status sync exception (persisted locally):", err);
    }
  }

  async function handleDeleteCustomer(c: Customer) {
    if (!canModifyCustomer(c)) {
      toast.error("Permission denied: You can only delete customers created by or assigned to yourself.");
      return;
    }
    if (!confirm(t("confirmDelete"))) return;

    // 1. Check local state & localStorage for linked records in orders or collections
    const activeOrders = orders.length > 0 ? orders : getOrders();
    const activeCollections = collections.length > 0 ? collections : getCollections();

    const hasLinkedLocalOrders = activeOrders.some(
      (o) => String(o?.customer_id) === String(c.id) || String((o as any)?.customer?.id) === String(c.id)
    );
    const hasLinkedLocalCollections = activeCollections.some(
      (col) => String(col?.customer_id) === String(c.id) || String((col as any)?.customer?.id) === String(c.id)
    );

    if (hasLinkedLocalOrders || hasLinkedLocalCollections) {
      toast.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
      return;
    }

    // 2. Query whether the customer has linked records in Supabase (orders, collections)
    try {
      const [remoteOrdersRes, remoteColsRes] = await Promise.all([
        supabase.from("orders").select("id").eq("customer_id", c.id).limit(1),
        supabase.from("collections").select("id").eq("customer_id", c.id).limit(1),
      ]);

      const hasLinkedRemoteOrders = Boolean(remoteOrdersRes.data && remoteOrdersRes.data.length > 0);
      const hasLinkedRemoteCols = Boolean(remoteColsRes.data && remoteColsRes.data.length > 0);

      if (hasLinkedRemoteOrders || hasLinkedRemoteCols) {
        toast.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
        return;
      }
    } catch (checkErr) {
      console.warn("Pre-delete relational check query skipped or failed:", checkErr);
    }

    const prevCustomers = customers;

    // 3. Instant local state removal
    setCustomers((prev) => prev.filter((item) => item.id !== c.id));

    // 4. Delegate to database deletion wrapped in try-catch to catch FK constraints gracefully
    try {
      const res = await deleteCustomer(c.id);
      if (!res.success) {
        setCustomers(prevCustomers);
        const isFkError =
          res.error &&
          (res.error.includes("foreign key") ||
            res.error.includes("violates") ||
            res.error.includes("23503") ||
            res.error.includes("orders") ||
            res.error.includes("collections") ||
            res.error.includes("financial history"));

        if (isFkError) {
          toast.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
        } else {
          toast.error(`Delete failed: ${res.error || "Failed to delete customer"}`);
        }
      } else {
        toast.success(t("deleted"));
      }
    } catch (err: any) {
      setCustomers(prevCustomers);
      console.error("deleteCustomer exception caught:", err);
      const isFkError =
        err?.code === "23503" ||
        (err?.message &&
          (err.message.includes("foreign key") ||
            err.message.includes("violates") ||
            err.message.includes("orders") ||
            err.message.includes("collections")));

      if (isFkError) {
        toast.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
      } else {
        toast.error(`Delete failed: ${err?.message || "Failed to delete customer"}`);
      }
    }
  }

  // Alias for backward compatibility
  const remove = handleDeleteCustomer;

  function handleExport() {
    exportToExcel("customers", filtered.map((c) => {
      const dueInfo = customerDueMap.get(c.id);
      return {
        PartyCode: c.party_code ?? "",
        OutletName: c.outlet_name || c.name,
        AreaMarket: c.area ?? c.city ?? c.territory?.name ?? "",
        Type: c.customer_type,
        Contact: c.contact_person ?? "",
        Phone: c.phone ?? "",
        AltPhone: c.alt_phone ?? "",
        Address: c.address ?? "",
        TradeLicense: c.trade_license_number ?? "",
        OpeningBalance: c.opening_balance,
        CurrentDue: dueInfo ? dueInfo.due : Number(c.current_due || 0),
        DueStatus: dueInfo ? dueInfo.status : (c.due_status || "Clear"),
        SecurityChequeNo: c.securityChequeNo || (c as any).security_cheque_no || "",
        SecurityBank: c.securityBankName || (c as any).security_bank_name || "",
        SecurityBranch: c.securityBranchName || (c as any).security_branch_name || "",
        SecurityChequeDate: c.securityChequeDate || (c as any).security_cheque_date || "",
        SecurityNotes: c.securityNotes || (c as any).security_notes || "",
      };
    }));
  }

  const totalDue = useMemo(() => {
    return r2(filtered.reduce((s, c) => {
      const dueInfo = customerDueMap.get(c.id);
      return s + Number(dueInfo ? dueInfo.due : (c.current_due || 0));
    }, 0));
  }, [filtered, customerDueMap]);

  const totalCustomersCount = useMemo(() => {
    const source = (search || statusFilter || typeFilter || dueFilter || areaFilter) ? filtered : customers;
    return source.length;
  }, [filtered, customers, search, statusFilter, typeFilter, dueFilter, areaFilter]);

  const activeCustomersCount = useMemo(() => {
    const source = (search || statusFilter || typeFilter || dueFilter || areaFilter) ? filtered : customers;
    return source.filter(
      (c) => (c.status === "Active" || !c.status) && c.status !== "Inactive" && c.is_active !== false
    ).length;
  }, [filtered, customers, search, statusFilter, typeFilter, dueFilter, areaFilter]);

  const inactiveCustomersCount = useMemo(() => {
    const source = (search || statusFilter || typeFilter || dueFilter || areaFilter) ? filtered : customers;
    return source.filter(
      (c) => c.status === "Inactive" || c.is_active === false
    ).length;
  }, [filtered, customers, search, statusFilter, typeFilter, dueFilter, areaFilter]);

  const dealersCount = useMemo(() => {
    return filtered.filter((c) => c.customer_type === "Dealer").length;
  }, [filtered]);

  const overdueCount = useMemo(() => {
    return filtered.filter(
      (c) => (customerDueMap.get(c.id)?.status || c.due_status || "Clear") === "Overdue"
    ).length;
  }, [filtered, customerDueMap]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Outlet, Party Code, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-36">
            <option value="">{t("allTypes")}</option>
            {customerTypes.map((ty) => <option key={ty} value={ty}>{t(ty.toLowerCase())}</option>)}
          </Select>
          <Select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className="w-full sm:w-36">
            <option value="">{t("selectStatus")}</option>
            {dueStatuses.map((d) => <option key={d} value={d}>{t(d.toLowerCase())}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-32">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
          <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="w-full sm:w-40">
            <option value="">All Areas</option>
            {areas.map((ar) => (
              <option key={ar.id} value={ar.name}>
                {ar.name}
              </option>
            ))}
          </Select>
          <Select value={officerFilter} onChange={(e) => setOfficerFilter(e.target.value)} className="w-full sm:w-40">
            <option value="">All Officers</option>
            {salesOfficers.map((so) => (
              <option key={so.id} value={so.id}>
                {so.full_name || so.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading} title="Live cloud sync" className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">{loading ? "Syncing..." : "Live Sync"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> {t("exportExcel")}
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Outlet
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t("totalCustomers") || "Total Customers"}</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold mt-1 text-foreground">{lang === "bn" ? toBnDigit(totalCustomersCount) : totalCustomersCount}</p>
            <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-border/40 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {lang === "bn" ? `সক্রিয়: ${toBnDigit(activeCustomersCount)}` : `Active: ${activeCustomersCount}`}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                {lang === "bn" ? `নিষ্ক্রিয়: ${toBnDigit(inactiveCustomersCount)}` : `Inactive: ${inactiveCustomersCount}`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalDue")}</p>
            <p className="text-xl font-bold mt-1 text-amber-600">{formatBDT(totalDue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("dealer")}</p>
            <p className="text-xl font-bold mt-1">{lang === "bn" ? toBnDigit(dealersCount) : dealersCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("overdue")}</p>
            <p className="text-xl font-bold mt-1 text-rose-600">{lang === "bn" ? toBnDigit(overdueCount) : overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List: Mobile Cards + Desktop Table */}
      <Card>
        <CardContent className="p-0 relative max-w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title={t("noData")} description={t("noResults")} />
          ) : (
            <div>
              {/* Mobile Card List (shown on small screens < 768px) */}
              <div className="block md:hidden divide-y divide-border/60">
                {filtered.map((c) => {
                  const dueInfo = customerDueMap.get(c.id);
                  const currentDue = dueInfo ? dueInfo.due : Number(c.current_due || 0);
                  const dueStatus = dueInfo ? dueInfo.status : (c.due_status || "Clear");

                  const secStatus = ((c as any).security_cheque_status || (c as any).securityChequeStatus || "").toLowerCase();
                  const isPendingOrUnpaid = secStatus === "pending" || secStatus === "unpaid" || secStatus === "missing" || (c as any).hasSecurityCheque === false;
                  const hasSecCheque = !isPendingOrUnpaid && Boolean(
                    (c as any).hasSecurityCheque === true ||
                    secStatus === "received" ||
                    secStatus === "active" ||
                    secStatus === "valid" ||
                    c.securityChequeNo ||
                    (c as any).security_cheque_no ||
                    c.securityBankName ||
                    (c as any).security_bank_name
                  );

                  return (
                    <div key={c.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                      {/* Card Header: Outlet Name + Status + Security Cheque */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-base text-foreground">{c.outlet_name || c.name}</span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1 font-semibold border ${
                                hasSecCheque
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                              }`}
                            >
                              <span>🛡️ Sec. Cheque</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.contact_person ? `${c.contact_person} • ` : ""}{c.party_code || "No Party Code"}
                          </p>
                        </div>

                        <select
                          value={c.status === "Inactive" || c.is_active === false ? "Inactive" : "Active"}
                          onChange={(e) => handleStatusChange(c, e.target.value as "Active" | "Inactive")}
                          disabled={!canModifyCustomer(c)}
                          className={`text-xs font-semibold rounded-md border px-2 py-1 outline-none transition-colors ${
                            (c.status === "Inactive" || c.is_active === false)
                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          } ${!canModifyCustomer(c) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      {/* Meta Tags: Type, Area, Assigned Officer */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {t(c.customer_type.toLowerCase())}
                        </Badge>
                        <span className="text-muted-foreground bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                          📍 {c.area || c.city || c.territory?.name || "No Area"}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          {getUserName(
                            c.assigned_to || (c as any).sales_rep_id,
                            c.assigned_to_name || (c as any).created_by_name || "Sales Officer"
                          )}
                        </span>
                      </div>

                      {/* Due Info & Quick Phone Call */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Due</p>
                            <p className="text-sm font-bold text-foreground">{formatBDT(currentDue)}</p>
                          </div>
                          <Badge variant={dueStatus === "Overdue" ? "destructive" : dueStatus === "Partial" ? "warning" : "success"} className="text-[10px] h-5">
                            {t(dueStatus.toLowerCase())}
                          </Badge>
                        </div>

                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{c.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex-1 gap-1.5"
                          onClick={() => {
                            const freshCust: Customer = {
                              ...c,
                              current_due: currentDue,
                              due_status: dueStatus,
                              opening_balance: c.opening_balance ?? 0,
                            };
                            setSelectedLedgerCustomer(freshCust);
                            setLedgerOpen(true);
                          }}
                        >
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          <span>Ledger</span>
                        </Button>

                        {currentDue > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40"
                            onClick={() => {
                              setSelectedReminderCustomer({ ...c, current_due: currentDue, currentDue } as any);
                              setSelectedReminderDue(currentDue);
                              setReminderModalOpen(true);
                            }}
                            title="Send Reminder"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Reminder</span>
                          </Button>
                        )}

                        {canModifyCustomer(c) && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCustomer(c)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (shown on screens md+ >= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet Name</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead>{t("customerType")}</TableHead>
                      <TableHead>Area / Market</TableHead>
                      <TableHead>Sales Officer</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead className="text-right">{t("currentDue" as string) || "Due"}</TableHead>
                      <TableHead>{t("dueStatus")}</TableHead>
                      <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const dueInfo = customerDueMap.get(c.id);
                      const currentDue = dueInfo ? dueInfo.due : Number(c.current_due || 0);
                      const dueStatus = dueInfo ? dueInfo.status : (c.due_status || "Clear");

                      const secStatus = ((c as any).security_cheque_status || (c as any).securityChequeStatus || "").toLowerCase();
                      const isPendingOrUnpaid = secStatus === "pending" || secStatus === "unpaid" || secStatus === "missing" || (c as any).hasSecurityCheque === false;
                      const hasSecCheque = !isPendingOrUnpaid && Boolean(
                        (c as any).hasSecurityCheque === true ||
                        secStatus === "received" ||
                        secStatus === "active" ||
                        secStatus === "valid" ||
                        c.securityChequeNo ||
                        (c as any).security_cheque_no ||
                        c.securityBankName ||
                        (c as any).security_bank_name
                      );

                      const secChequeBank = c.securityBankName || (c as any).security_bank_name || "";
                      const secChequeNo = c.securityChequeNo || (c as any).security_cheque_no || "";
                      const secChequeBranch = c.securityBranchName || (c as any).security_branch_name || "";
                      const secChequeDate = c.securityChequeDate || (c as any).security_cheque_date || "";
                      const secChequeNotes = c.securityNotes || (c as any).security_notes || "";

                      const secChequeTitle = hasSecCheque
                        ? `Security Cheque: ${secChequeBank ? `${secChequeBank} ` : ""}#${secChequeNo || "—"}${secChequeBranch ? ` (${secChequeBranch})` : ""}${secChequeDate ? ` | Received: ${secChequeDate}` : ""}${secChequeNotes ? ` | Note: ${secChequeNotes}` : ""}`.trim()
                        : "No Security Cheque / Pending";

                      return (
                        <TableRow key={c.id}>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground whitespace-nowrap">{c.outlet_name || c.name}</span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[11px] inline-flex items-center gap-1 font-semibold whitespace-nowrap border cursor-help ${
                                  hasSecCheque
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                    : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                                }`}
                                title={secChequeTitle}
                              >
                                <span>🛡️ Sec. Cheque</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 whitespace-nowrap">
                            <select
                              value={c.status === "Inactive" || c.is_active === false ? "Inactive" : "Active"}
                              onChange={(e) => handleStatusChange(c, e.target.value as "Active" | "Inactive")}
                              disabled={!canModifyCustomer(c)}
                              className={`text-xs font-semibold rounded-md border px-2 py-0.5 outline-none transition-colors ${
                                (c.status === "Inactive" || c.is_active === false)
                                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              } ${!canModifyCustomer(c) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                              title={canModifyCustomer(c) ? "Change customer status" : "Only assigned officer/admin can change status"}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </TableCell>
                          <TableCell className="py-2.5 whitespace-nowrap"><Badge variant="secondary" className="text-[10px]">{t(c.customer_type.toLowerCase())}</Badge></TableCell>
                          <TableCell className="text-sm font-medium py-2.5 whitespace-nowrap">
                            {c.area || c.city || c.territory?.name || "—"}
                          </TableCell>
                          <TableCell className="text-sm py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60 whitespace-nowrap">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {getUserName(
                                c.assigned_to || (c as any).sales_rep_id,
                                c.assigned_to_name || (c as any).created_by_name || "Sales Officer"
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm py-2.5 whitespace-nowrap">
                            <span>{c.phone ?? "—"}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium py-2.5 whitespace-nowrap">{formatBDT(currentDue)}</TableCell>
                          <TableCell className="py-2.5 whitespace-nowrap">
                            <Badge variant={dueStatus === "Overdue" ? "destructive" : dueStatus === "Partial" ? "warning" : "success"} className="text-[10px]">
                              {t(dueStatus.toLowerCase())}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2.5 whitespace-nowrap sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                            <div className="whitespace-nowrap flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const freshCust: Customer = {
                                    ...c,
                                    current_due: currentDue,
                                    due_status: dueStatus,
                                    opening_balance: c.opening_balance ?? 0,
                                  };
                                  setSelectedLedgerCustomer(freshCust);
                                  setLedgerOpen(true);
                                }}
                                title="View Ledger Statement"
                              >
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              {currentDue > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const freshCust: Customer = {
                                      ...c,
                                      current_due: currentDue,
                                      currentDue: currentDue,
                                    } as any;
                                    setSelectedReminderCustomer(freshCust);
                                    setSelectedReminderDue(currentDue);
                                    setReminderModalOpen(true);
                                  }}
                                  title="Generate AI Payment Reminder (SMS/WhatsApp)"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canModifyCustomer(c) ? (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit Outlet"><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomer(c)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    className="opacity-30 cursor-not-allowed"
                                    title="Only the assigned Sales Officer or Manager can edit this customer"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    className="opacity-30 cursor-not-allowed"
                                    title="Only the assigned Sales Officer or Manager can delete this customer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
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

      {/* Add / Edit Customer Modal */}
      <AddCustomerModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customer={editing}
        existingCustomers={customers}
        onSaved={(savedCustomer) => {
          setCustomers(() => {
            const list = getCustomers();
            if (savedCustomer) {
              const idx = list.findIndex((c) => c.id === savedCustomer.id);
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...savedCustomer };
              } else {
                list.unshift(savedCustomer);
              }
            }
            return [...list];
          });
          try {
            window.dispatchEvent(new CustomEvent("sales_erp_storage_update"));
          } catch {}
        }}
      />

      {/* Customer Ledger Statement Modal */}
      <CustomerLedgerModal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        customer={selectedLedgerCustomer}
      />

      {/* AI Payment Reminder Modal */}
      <PaymentReminderModal
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        customer={selectedReminderCustomer}
        dueAmount={selectedReminderDue}
      />
    </div>
  );
}

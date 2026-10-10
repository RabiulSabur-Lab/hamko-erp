import { useEffect, useState, useMemo } from "react";
import { supabase, type Visit, type Customer, type SalesTarget, type UserProfile, type Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
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
import { formatBDT, formatDateTime, timeAgo, toBnDigit, isBengaliMode, cn } from "@/lib/utils";
import {
  Plus,
  MapPin,
  Loader2,
  CheckCircle2,
  Circle,
  Target,
  TrendingUp,
  Route,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Search,
  Receipt,
  QrCode,
  Wifi,
  WifiOff,
  User,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { SalesTargetModal } from "@/components/SalesTargetModal";
import { LogVisitModal } from "@/components/LogVisitModal";
import { EveningHandoverModal } from "@/components/EveningHandoverModal";
import { useOfflineFieldSync } from "@/utils/offlineSync";
import { useUsers } from "@/context/UsersContext";

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  saveVisits,
  saveRoutePlan,
  optimisticAdd,
  optimisticUpdate,
  optimisticDelete,
  getOrders,
  getCustomers,
  getDeletedIds,
  saveDeletedId,
  mergeAndEnrichCustomers,
  getAreas,
  type Area,
  r2,
  getOrderReturnedAmount,
} from "@/utils/localStore";
import { AreaManagementModal } from "@/components/AreaManagementModal";
export { LogVisitModal } from "@/components/LogVisitModal";

const periods = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const;
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface RouteItem {
  id: string;
  customer_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  territory?: string | null;
  customer_type?: string;
  phone?: string | null;
  notes?: string;
  day_of_week?: string;
}

export function SfaPage() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { getUserName } = useUsers();
  const [tab, setTab] = useState("visits");
  const [loading, setLoading] = useState<boolean>(() => {
    const list = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    return Array.isArray(list) ? list.length === 0 : true;
  });
  const [visits, setVisits] = useState<Visit[]>(() => {
    const list = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    return Array.isArray(list) ? list : [];
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const list = getCustomers();
    return Array.isArray(list) ? list : [];
  });
  const [targets, setTargets] = useState<SalesTarget[]>(() => {
    const list = getLocalData<SalesTarget[]>(STORAGE_KEYS.TARGETS, []);
    return Array.isArray(list) ? list : [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const list = getOrders();
    return Array.isArray(list) ? list : [];
  });
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Route Plan State
  const [routes, setRoutes] = useState<RouteItem[]>(() => {
    const saved = getLocalData<RouteItem[]>(STORAGE_KEYS.ROUTE_PLAN, []);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    const custs = getCustomers();
    const safeCusts: Customer[] = Array.isArray(custs) ? custs : [];
    return safeCusts
      .filter((c: Customer) => c.is_active !== false)
      .sort((a: Customer, b: Customer) => (a.name || "").localeCompare(b.name || ""))
      .map((c: Customer, i: number): RouteItem => ({
        id: `route-${c.id}`,
        customer_id: c.id,
        name: c.name,
        address: c.address,
        city: c.city,
        territory: c.area || c.territory?.name || null,
        customer_type: c.customer_type,
        phone: c.phone,
        notes: "",
        day_of_week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"][i % 5],
      }));
  });
  const [routeSearch, setRouteSearch] = useState("");
  const [routeDayFilter, setRouteDayFilter] = useState("");
  const [routeAreaFilter, setRouteAreaFilter] = useState("");
  const [areas, setAreas] = useState<Area[]>(() => getAreas());
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [routeForm, setRouteForm] = useState<{ day_of_week: string; notes: string; customer_id?: string }>({
    day_of_week: "Monday",
    notes: "",
  });
  const [addRouteOpen, setAddRouteOpen] = useState(false);

  // Target Editing State
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);

  // Visit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);
  const [deletingVisitLoading, setDeletingVisitLoading] = useState(false);

  // Evening Handover Modal & Offline Sync
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const { isOnline, pendingVisitsCount, pendingCollectionsCount, isSyncing, syncNow } = useOfflineFieldSync();

  useEffect(() => {
    loadData();

    const handleStorage = () => {
      const tgts = getLocalData<SalesTarget[]>(STORAGE_KEYS.TARGETS, []);
      setTargets(Array.isArray(tgts) ? [...tgts] : []);
      const custs = getCustomers();
      setCustomers(Array.isArray(custs) ? [...custs] : []);
      const rts = getLocalData<RouteItem[]>(STORAGE_KEYS.ROUTE_PLAN, []);
      setRoutes(Array.isArray(rts) ? [...rts] : []);
      const ords = getOrders();
      setOrders(Array.isArray(ords) ? [...ords] : []);
      const vsts = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
      const deletedVisitIds = getDeletedIds(STORAGE_KEYS.DELETED_VISITS);
      setVisits(Array.isArray(vsts) ? vsts.filter((v: Visit) => !deletedVisitIds.has(String(v.id))) : []);
      const ars = getAreas();
      setAreas(Array.isArray(ars) ? [...ars] : []);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleStorage);

    // Supabase Realtime Channel
    const sfaChannel = supabase
      .channel("sfa-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_targets" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sfaChannel);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleStorage);
    };
  }, []);

  async function loadData() {
    try {
      const [vRes, cRes, tRes, uRes, oRes] = await Promise.all([
        supabase.from("visits").select("*, customer:customers(name, address)").order("visit_date", { ascending: false }).limit(100),
        supabase.from("customers").select("*").eq("is_active", true).order("name"),
        supabase.from("sales_targets").select("*").order("period_start", { ascending: false }),
        supabase.from("users").select("*").order("full_name"),
        supabase.from("orders").select("*, customer:customers(name, current_due), sales_rep:users(full_name), order_items(*, product:products(name, sku_code, unit_price))").order("order_date", { ascending: false }),
      ]);
      if (!vRes.error && Array.isArray(vRes.data)) {
        const deletedVisitIds = getDeletedIds(STORAGE_KEYS.DELETED_VISITS);
        const remoteVisits = (vRes.data as Visit[]).filter((v: Visit) => !deletedVisitIds.has(String(v.id)));
        const currentLocal = (getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []) || []).filter((v: Visit) => !deletedVisitIds.has(String(v.id)));
        const remoteIdSet = new Set(remoteVisits.map((v) => String(v.id).trim()));
        const pendingLocalVisits = currentLocal.filter((lv) => !remoteIdSet.has(String(lv.id).trim()));
        const mergedVisits = [...pendingLocalVisits, ...remoteVisits].sort(
          (a, b) => new Date(b.visit_date || b.created_at || 0).getTime() - new Date(a.visit_date || a.created_at || 0).getTime()
        );
        setVisits(mergedVisits);
        saveVisits(mergedVisits);
      } else {
        const deletedVisitIds = getDeletedIds(STORAGE_KEYS.DELETED_VISITS);
        const localVisits = (getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []) || []).filter((v: Visit) => !deletedVisitIds.has(String(v.id)));
        setVisits(localVisits);
      }
      if (!cRes.error && Array.isArray(cRes.data)) {
        const mergedCusts = mergeAndEnrichCustomers(cRes.data as Customer[]);
        setCustomers(mergedCusts);
      }
      if (!tRes.error && Array.isArray(tRes.data)) {
        const deletedTargetIds = getDeletedIds(STORAGE_KEYS.DELETED_TARGETS);
        const remoteTargets = (tRes.data as SalesTarget[]).filter((tg: SalesTarget) => !deletedTargetIds.has(String(tg.id)));
        const currentLocalRaw = getLocalData<SalesTarget[]>(STORAGE_KEYS.TARGETS, []);
        const currentLocal = (Array.isArray(currentLocalRaw) ? currentLocalRaw : []).filter((tg: SalesTarget) => !deletedTargetIds.has(String(tg.id)));
        
        const localMap = new Map<string, SalesTarget>(
          currentLocal.map((t: SalesTarget) => [String(t.id).trim(), t])
        );

        // Process remote targets: if local target has been edited, preserve the local edit over stale remote data
        const processedRemoteTargets = remoteTargets.map((rt: SalesTarget): SalesTarget => {
          const local = localMap.get(String(rt.id).trim());
          if (!local) return rt;
          if (local.updated_at) {
            const localTime = new Date(local.updated_at).getTime();
            const remoteTime = new Date((rt as any).updated_at || rt.created_at || 0).getTime();
            if (localTime >= remoteTime) {
              return { ...rt, ...local };
            }
          }
          return rt;
        });

        const remoteIdSet = new Set(remoteTargets.map((tg: SalesTarget) => String(tg.id).trim()));
        const pendingLocalTargets = currentLocal.filter((lt: SalesTarget) => !remoteIdSet.has(String(lt.id).trim()));
        const mergedTargets: SalesTarget[] = [...pendingLocalTargets, ...processedRemoteTargets];
        setTargets(mergedTargets);
        setLocalData(STORAGE_KEYS.TARGETS, mergedTargets);
      }
      if (uRes.data) setUsers(uRes.data as UserProfile[]);

      if (!oRes.error && Array.isArray(oRes.data)) {
        const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
        const remoteOrders = (oRes.data as Order[]).filter((o: any) => !deletedOrderIds.has(o.id));
        const remoteIdSet = new Set(remoteOrders.map((o) => String(o.id)));
        const currentLocal = getOrders().filter((o: any) => !deletedOrderIds.has(o.id));
        const pendingLocalOrders = currentLocal.filter((lo) => !remoteIdSet.has(String(lo.id)));
        const mergedOrders = [...pendingLocalOrders, ...remoteOrders].sort(
          (a, b) => new Date(b.order_date || b.created_at || 0).getTime() - new Date(a.order_date || a.created_at || 0).getTime()
        );
        setOrders(mergedOrders);
        setLocalData(STORAGE_KEYS.ORDERS, mergedOrders);
      }
    } catch (err) {
      console.warn("Using local SFA cache:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate dynamic achievement from delivered orders in getOrders() and remote state
  function computeTargetMetrics(tg: SalesTarget) {
    const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
    const orderPool = (orders && orders.length > 0) ? orders : getOrders();
    const validOrders = (Array.isArray(orderPool) ? orderPool : []).filter(
      (o: any) => !deletedOrderIds.has(o.id)
    );

    const startDate = tg.period_start ? tg.period_start.slice(0, 10) : "";
    const endDate = tg.period_end ? tg.period_end.slice(0, 10) : "";

    const matchingOrders = validOrders.filter((o: any) => {
      // Must be delivered orders
      const status = String(o.status || "").trim().toLowerCase();
      if (status !== "delivered") return false;

      // Date matching
      const orderDate = String(o.order_date || o.created_at || "").slice(0, 10);
      if (startDate && orderDate && orderDate < startDate) return false;
      if (endDate && orderDate && orderDate > endDate) return false;

      // Sales rep if target is for specific user
      if (tg.user_id && tg.user_id !== "all") {
        const repId = o.sales_rep_id || o.user_id;
        if (repId && String(repId) !== String(tg.user_id)) return false;
      }

      return true;
    });

    // BUG-020: Net Sales = Gross Delivered Sales - Product Returns (Sales Returns) - Cancelled Invoices
    const grossDelivered = matchingOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
    const totalReturns = matchingOrders.reduce((sum: number, o: any) => sum + getOrderReturnedAmount(o), 0);
    const achieved = Math.max(0, r2(grossDelivered - totalReturns));
    const targetAmt = Number(tg.target_amount) || 0;
    // BUG-018: Allow target achievement percentage to exceed 100%
    const targetPercentage = targetAmt > 0 ? Math.round((achieved / targetAmt) * 100) : 0;
    const progressPct = targetPercentage;

    return { achieved, progressPct, targetPercentage };
  }

  function openVisit() {
    setDialogOpen(true);
  }

  function openNewTarget() {
    setEditingTarget(null);
    setTargetModalOpen(true);
  }

  function handleEditTarget(tg: SalesTarget) {
    setEditingTarget(tg);
    setTargetModalOpen(true);
  }

  const openEditTarget = handleEditTarget;

  async function handleDeleteTarget(target: string | SalesTarget) {
    const targetId = typeof target === "string" ? target : target.id;
    if (!window.confirm(t("confirmDelete") || "Are you sure you want to delete this sales target?")) return;

    // 1. Instant local mutation & storage update
    setTargets((prev) => {
      const updated = prev.filter((item) => String(item.id).trim() !== String(targetId).trim());
      setLocalData(STORAGE_KEYS.TARGETS, updated);
      return updated;
    });

    // 2. Prevent resurrection on refetch
    saveDeletedId(STORAGE_KEYS.DELETED_TARGETS, targetId);

    // 3. Dispatch storage update event
    setTimeout(() => {
      window.dispatchEvent(new Event("sales_erp_storage_update"));
    }, 0);

    toast.success(t("deleted"));

    // 4. Supabase deletion
    try {
      const { error } = await supabase
        .from("sales_targets")
        .delete()
        .eq("id", targetId);
      if (error) console.warn("Supabase sales target delete notice (persisted locally):", error.message);
    } catch (err: any) {
      console.warn("Supabase sales target delete exception:", err?.message || err);
    }
  }

  const removeTarget = handleDeleteTarget;

  async function handleSaveTarget(payload: {
    period: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
    period_start: string;
    period_end: string;
    start_date?: string;
    end_date?: string;
    target_amount: number;
    user_id: string | null;
  }) {
    setSavingTarget(true);
    try {
      const amt = r2(Number(payload.target_amount) || 0);
      const sDate = payload.period_start || payload.start_date || new Date().toISOString().slice(0, 10);
      const eDate = payload.period_end || payload.end_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      if (editingTarget?.id) {
        const targetId = String(editingTarget.id).trim();
        const dbPayload = {
          period: payload.period || "Monthly",
          period_start: sDate,
          period_end: eDate,
          target_amount: amt,
          user_id: payload.user_id || null,
        };

        const updatedRecord: SalesTarget = {
          ...editingTarget,
          ...dbPayload,
          updated_at: new Date().toISOString(),
        };

        // 1. Immediately update React state and local storage with fresh record
        setTargets((prev) => {
          const updated = prev.map((item) =>
            String(item.id).trim() === targetId ? updatedRecord : item
          );
          setLocalData(STORAGE_KEYS.TARGETS, updated);
          return updated;
        });

        // 2. Dispatch storage update event
        window.dispatchEvent(new Event("sales_erp_storage_update"));

        toast.success(t("updated") || "Sales target updated");
        setTargetModalOpen(false);
        setEditingTarget(null);

        // 3. Explicitly await Supabase update query with .select()
        try {
          const { data, error } = await supabase
            .from("sales_targets")
            .update(dbPayload)
            .eq("id", targetId)
            .select();

          if (error) {
            console.error("Supabase sales target update error:", error.message || error);
          } else if (data && data.length > 0) {
            const serverUpdated = { ...(data[0] as SalesTarget), updated_at: updatedRecord.updated_at };
            setTargets((prev) => {
              const reconciled = prev.map((item) =>
                String(item.id).trim() === targetId ? serverUpdated : item
              );
              setLocalData(STORAGE_KEYS.TARGETS, reconciled);
              return reconciled;
            });
            window.dispatchEvent(new Event("sales_erp_storage_update"));
          } else {
            console.warn(`Supabase update matched 0 rows for target id: ${targetId}`);
          }
        } catch (err: any) {
          console.error("Supabase sales target update exception:", err?.message || err);
        }
      } else {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : `target-${Date.now()}`;
        const newRecord: SalesTarget = {
          id: tempId,
          user_id: payload.user_id || null,
          territory_id: null,
          period: payload.period || "Monthly",
          period_start: sDate,
          period_end: eDate,
          target_amount: amt,
          achieved_amount: 0,
          created_at: new Date().toISOString(),
        };

        // 1. Instant local state & storage update
        setTargets((prev) => {
          const updated = [newRecord, ...prev];
          setLocalData(STORAGE_KEYS.TARGETS, updated);
          return updated;
        });

        // 2. Dispatch storage update event
        setTimeout(() => {
          window.dispatchEvent(new Event("sales_erp_storage_update"));
        }, 0);

        toast.success(t("created") || "Sales target created");
        setTargetModalOpen(false);

        // 3. Supabase insert
        try {
          const { data, error } = await supabase
            .from("sales_targets")
            .insert({
              user_id: payload.user_id || null,
              period: payload.period || "Monthly",
              period_start: sDate,
              period_end: eDate,
              target_amount: amt,
            })
            .select()
            .single();

          if (!error && data) {
            setTargets((prev) => {
              const reconciled = prev.map((t) => (t.id === tempId ? (data as SalesTarget) : t));
              setLocalData(STORAGE_KEYS.TARGETS, reconciled);
              return reconciled;
            });
          } else if (error) {
            console.warn("Supabase sales target insert note:", error.message);
          }
        } catch (err: any) {
          console.warn("Supabase sales target insert exception:", err?.message || err);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save sales target");
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSaveVisit(payload: {
    customer_id: string;
    visit_date: string;
    purpose?: string;
    outcome?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    setSaving(true);
    try {
      const parsedDate = new Date(payload.visit_date);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (parsedDate.getTime() < startOfToday.getTime()) {
        toast.error("Backdated visit logs are strictly prohibited. Visits must be recorded in real-time.");
        setSaving(false);
        return;
      }

      const targetCustomer = customers.find((c) => c.id === payload.customer_id);
      const tempId = crypto.randomUUID ? crypto.randomUUID() : `visit-${Date.now()}`;
      const newVisit: Visit = {
        id: tempId,
        customer_id: payload.customer_id,
        visited_by: profile?.id ?? null,
        visited_by_name: profile?.full_name || null,
        officer_name: profile?.full_name || null,
        visit_date: payload.visit_date,
        check_in: payload.visit_date,
        check_out: null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        purpose: payload.purpose?.trim() || null,
        outcome: payload.outcome?.trim() || null,
        notes: payload.notes?.trim() || null,
        created_at: new Date().toISOString(),
        customer: targetCustomer,
      };

      // 1. Instant local mutation
      setVisits((prev) => {
        const updated = optimisticAdd(prev, newVisit, STORAGE_KEYS.VISITS);
        saveVisits(updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
      }
      toast.success(t("created"));
      setDialogOpen(false);

      // 2. Background persistence
      supabase.from("visits").insert({
        customer_id: payload.customer_id,
        visited_by: profile?.id,
        visit_date: payload.visit_date,
        check_in: payload.visit_date,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        purpose: payload.purpose,
        outcome: payload.outcome,
        notes: payload.notes,
      }).select().single().then(({ data, error }) => {
        if (!error && data) {
          setVisits((prev) => {
            const reconciled = prev.map((v) => (v.id === tempId ? (data as Visit) : v));
            saveVisits(reconciled);
            return reconciled;
          });
        }
      });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDeleteVisit(target?: string | Visit | null) {
    const itemToDelete = target || deletingVisit;
    if (!itemToDelete) return;
    const visitId = typeof itemToDelete === "string" ? itemToDelete : itemToDelete.id;
    if (!visitId) return;

    setDeletingVisitLoading(true);
    try {
      // 1. Instant local mutation & storage update
      setVisits((prev) => {
        const updated = prev.filter((item) => String(item.id).trim() !== String(visitId).trim());
        saveVisits(updated);
        return updated;
      });

      // 2. Prevent resurrection on refetch
      saveDeletedId(STORAGE_KEYS.DELETED_VISITS, visitId);

      // 3. Dispatch storage update event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
      }

      toast.success(t("deleted") || "Visit log deleted successfully");
      setDeletingVisit(null);

      // 4. Supabase deletion
      try {
        const { error } = await supabase
          .from("visits")
          .delete()
          .eq("id", visitId);
        if (error) console.warn("Supabase visit delete notice (persisted locally):", error.message);
      } catch (err: any) {
        console.warn("Supabase visit delete exception:", err?.message || err);
      }
    } finally {
      setDeletingVisitLoading(false);
    }
  }

  // Route Plan operations & Real-Time Sync Broadcast (MED-005)
  function persistRoutePlan(next: RouteItem[]) {
    saveRoutePlan(next);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail: { type: "route_plan_updated" } }));
      } catch {
        window.dispatchEvent(new Event("sales_erp_storage_update"));
      }
      window.dispatchEvent(new Event("storage"));
    }
  }

  function moveRouteUp(index: number) {
    if (index <= 0) return;
    setRoutes((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      persistRoutePlan(next);
      return next;
    });
  }

  function moveRouteDown(index: number) {
    setRoutes((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      persistRoutePlan(next);
      return next;
    });
  }

  function removeRoute(id: string) {
    if (!confirm("Remove this customer stop from the route plan?")) return;
    setRoutes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRoutePlan(next);
      return next;
    });
    toast.success("Route stop removed");
  }

  function saveRouteEdit() {
    if (!editingRoute) return;
    setRoutes((prev) => {
      const next = prev.map((r) =>
        r.id === editingRoute.id
          ? { ...r, day_of_week: routeForm.day_of_week, notes: routeForm.notes.trim() }
          : r
      );
      persistRoutePlan(next);
      return next;
    });
    setRouteModalOpen(false);
    toast.success("Route stop updated");
  }

  function addCustomerToRoute(customerId: string) {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const newRoute: RouteItem = {
      id: `route-${cust.id}-${Date.now()}`,
      customer_id: cust.id,
      name: cust.name,
      address: cust.address,
      city: cust.city,
      territory: cust.territory?.name || null,
      customer_type: cust.customer_type,
      phone: cust.phone,
      notes: routeForm.notes.trim(),
      day_of_week: routeForm.day_of_week || "Monday",
    };
    setRoutes((prev) => {
      const next = [...prev, newRoute];
      persistRoutePlan(next);
      return next;
    });
    setAddRouteOpen(false);
    toast.success("Customer added to route plan");
  }

  function syncRoutesWithCrm() {
    const crmCusts = getCustomers();
    const activeCusts = Array.isArray(crmCusts) && crmCusts.length > 0 ? crmCusts : (Array.isArray(customers) ? customers : []);
    const sortedCusts = [...activeCusts]
      .filter((c: Customer) => c.is_active !== false)
      .sort((a: Customer, b: Customer) => (a.name || "").localeCompare(b.name || ""));

    setRoutes((prev: RouteItem[]) => {
      const existingCustIds = new Set((Array.isArray(prev) ? prev : []).map((r: RouteItem) => r.customer_id));
      const newStops: RouteItem[] = [];

      sortedCusts.forEach((c: Customer, idx: number) => {
        if (!existingCustIds.has(c.id)) {
          newStops.push({
            id: `route-${c.id}`,
            customer_id: c.id,
            name: c.name,
            address: c.address,
            city: c.city,
            territory: c.area || c.territory?.name || null,
            customer_type: c.customer_type,
            phone: c.phone,
            notes: "",
            day_of_week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"][(prev.length + idx) % 5],
          });
        }
      });

      const merged: RouteItem[] = [...(Array.isArray(prev) ? prev : []), ...newStops];
      persistRoutePlan(merged);
      toast.success(`Synced with CRM (${newStops.length} new stops added, total ${merged.length})`);
      return merged;
    });
  }

  const syncRoutesWithCustomers = syncRoutesWithCrm;

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const q = routeSearch.toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").includes(q);
      const matchDay = !routeDayFilter || r.day_of_week === routeDayFilter;
      const matchArea =
        !routeAreaFilter ||
        (r.territory && r.territory.trim().toLowerCase() === routeAreaFilter.trim().toLowerCase()) ||
        (r.city && r.city.trim().toLowerCase() === routeAreaFilter.trim().toLowerCase());
      return matchSearch && matchDay && matchArea;
    });
  }, [routes, routeSearch, routeDayFilter, routeAreaFilter]);

  const todayVisits = visits.filter((v) => new Date(v.visit_date).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              <p className="text-xs text-muted-foreground">{t("today")} {t("visitLog" as string) || "Visits"}</p>
            </div>
            <p className="text-xl font-bold mt-2">{todayVisits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">{t("routePlan") || "Planned Routes"}</p>
            </div>
            <p className="text-xl font-bold mt-2">{routes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">{t("salesTarget")}</p>
            </div>
            <p className="text-xl font-bold mt-2">{targets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">{t("activeCustomers")}</p>
            </div>
            <p className="text-xl font-bold mt-2">
              {customers.filter((c: any) => (c.status === "Active" || !c.status) && c.status !== "Inactive" && c.is_active !== false).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons & Offline Status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 gap-1.5 py-1 px-2.5">
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              <span>Offline Field Mode Active ({pendingVisitsCount + pendingCollectionsCount} queued)</span>
            </Badge>
          ) : (pendingVisitsCount > 0 || pendingCollectionsCount > 0) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="gap-1.5 h-8 text-xs border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync Queued Data ({pendingVisitsCount + pendingCollectionsCount})
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHandoverModalOpen(true)}
            className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 font-medium"
          >
            <Receipt className="h-4 w-4" /> Day-End Handover & Cash Slip
          </Button>
          <Button size="sm" variant="outline" onClick={openNewTarget} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("salesTarget")}
          </Button>
          <Button size="sm" onClick={openVisit} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newVisit")}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visits">{t("visitLog")}</TabsTrigger>
          <TabsTrigger value="targets">{t("salesTarget")}</TabsTrigger>
          <TabsTrigger value="route">{t("routePlan")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Visits */}
        <TabsContent value="visits">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : visits.length === 0 ? (
                <EmptyState icon={<MapPin className="h-10 w-10" />} title={t("noData")} />
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {visits.map((v: Visit) => (
                      <div key={v.id} className="p-3.5 space-y-2.5 bg-card/50 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground leading-tight truncate">{v.customer?.name ?? "—"}</p>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {getUserName(v.visited_by, v.visited_by_name || (v as any).officer_name)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground block">{formatDateTime(v.visit_date)}</span>
                            <span className="text-xs font-medium text-primary">{timeAgo(v.visit_date)}</span>
                          </div>
                        </div>

                        {(v.purpose || v.outcome) && (
                          <div className="text-xs space-y-1 bg-muted/30 p-2 rounded-md border border-border/40">
                            {v.purpose && <div><span className="font-semibold text-muted-foreground">Purpose:</span> {v.purpose}</div>}
                            {v.outcome && <div><span className="font-semibold text-muted-foreground">Outcome:</span> {v.outcome}</div>}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div>
                            {v.latitude && v.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center hover:opacity-80 transition-opacity"
                              >
                                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer">
                                  <MapPin className="h-2.5 w-2.5 text-sky-600" /> {v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}
                                </Badge>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">No GPS</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingVisit(v)}
                            title={t("delete") || "Delete Visit"}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto relative rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("customer")}</TableHead>
                          <TableHead>Sales Officer</TableHead>
                          <TableHead>{t("date")}</TableHead>
                          <TableHead>{t("purpose" as string) || "Purpose"}</TableHead>
                          <TableHead>{t("outcome" as string) || "Outcome"}</TableHead>
                          <TableHead>{t("warehouse" as string) || "Location"}</TableHead>
                          <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visits.map((v: Visit) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.customer?.name ?? "—"}</TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60 whitespace-nowrap">
                                <User className="h-3 w-3 text-muted-foreground" />
                                {getUserName(v.visited_by, v.visited_by_name || (v as any).officer_name)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{formatDateTime(v.visit_date)}</TableCell>
                            <TableCell className="text-sm">{v.purpose ?? "—"}</TableCell>
                            <TableCell className="text-sm">{v.outcome ?? "—"}</TableCell>
                            <TableCell>
                              {v.latitude && v.longitude ? (
                                <a
                                  href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center hover:opacity-80 transition-opacity"
                                  title="Open location in Google Maps"
                                >
                                  <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer">
                                    <MapPin className="h-2.5 w-2.5" /> {v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}
                                  </Badge>
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingVisit(v)}
                                title={t("delete") || "Delete Visit"}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

        {/* Tab 2: Sales Targets */}
        <TabsContent value="targets">
          <Card>
            <CardContent className="p-0">
              {targets.length === 0 ? (
                <EmptyState
                  icon={<Target className="h-10 w-10" />}
                  title={t("noData")}
                  description="No sales targets set. Click 'Sales Target' above to add one."
                />
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {targets.map((tg: SalesTarget) => {
                      const { achieved, targetPercentage } = computeTargetMetrics(tg);
                      return (
                        <div key={tg.id} className="p-3.5 space-y-2.5 bg-card/50 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge variant="secondary" className="text-[10px] mb-1 font-semibold">
                                {t(tg.period.toLowerCase())}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{tg.period_start} → {tg.period_end}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">Target</span>
                              <span className="text-sm font-bold text-foreground">{formatBDT(tg.target_amount)}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Achieved: <strong className="text-emerald-600 font-semibold">{formatBDT(achieved)}</strong></span>
                              <span className="font-bold text-foreground">{targetPercentage}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  targetPercentage >= 100 ? "bg-emerald-500" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, targetPercentage))}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleEditTarget(tg)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTarget(tg)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto relative rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("period")}</TableHead>
                          <TableHead>{t("startDate")}</TableHead>
                          <TableHead>{t("endDate")}</TableHead>
                          <TableHead className="text-right">{t("targetAmount")}</TableHead>
                          <TableHead className="text-right">{t("achieved")}</TableHead>
                          <TableHead>{t("progress")}</TableHead>
                          <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {targets.map((tg: SalesTarget) => {
                          const { achieved, targetPercentage } = computeTargetMetrics(tg);
                          return (
                            <TableRow key={tg.id}>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px]">
                                  {t(tg.period.toLowerCase())}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{tg.period_start}</TableCell>
                              <TableCell className="text-sm">{tg.period_end}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatBDT(tg.target_amount)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">
                                {formatBDT(achieved)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full transition-all",
                                        targetPercentage >= 100 ? "bg-emerald-500" : "bg-primary"
                                      )}
                                      style={{ width: `${Math.min(100, Math.max(0, targetPercentage))}%` }}
                                    />
                                  </div>
                                  {targetPercentage >= 100 ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0.5 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 whitespace-nowrap font-semibold"
                                    >
                                      {isBengaliMode()
                                        ? `${toBnDigit(targetPercentage)}% অর্জিত`
                                        : `${targetPercentage}% Target Achieved`}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs font-medium">
                                      {isBengaliMode() ? `${toBnDigit(targetPercentage)}%` : `${targetPercentage}%`}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditTarget(tg)}
                                    title={t("edit") || "Edit Target"}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTarget(tg)}
                                    title={t("delete") || "Delete Target"}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
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

        {/* Tab 3: Route Plan */}
        <TabsContent value="route">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t("routePlan")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sequence and manage sales visit stops, re-order sequence, or sync dynamically with CRM customers.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAreaModalOpen(true)}
                    className="gap-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Manage Areas</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncRoutesWithCustomers}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sync with CRM</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRouteForm({
                        day_of_week: "Monday",
                        notes: "",
                        customer_id: customers[0]?.id || "",
                      });
                      setAddRouteOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Stop</span>
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t mt-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search route stops..."
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Select
                  value={routeDayFilter}
                  onChange={(e) => setRouteDayFilter(e.target.value)}
                  className="h-8 text-xs w-36"
                >
                  <option value="">All Days</option>
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
                <Select
                  value={routeAreaFilter}
                  onChange={(e) => setRouteAreaFilter(e.target.value)}
                  className="h-8 text-xs w-40"
                >
                  <option value="">All Areas</option>
                  {areas.map((ar) => (
                    <option key={ar.id} value={ar.name}>
                      {ar.name}
                    </option>
                  ))}
                </Select>
                {(routeSearch || routeDayFilter || routeAreaFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRouteSearch("");
                      setRouteDayFilter("");
                      setRouteAreaFilter("");
                    }}
                    className="h-8 text-xs px-2"
                  >
                    Clear Filter
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {lang === "bn"
                    ? `${toBnDigit(routes.length)} টি স্টপের মধ্যে ${toBnDigit(filteredRoutes.length)} টি প্রদর্শিত`
                    : `${filteredRoutes.length} of ${routes.length} stops`}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              {filteredRoutes.length === 0 ? (
                <EmptyState
                  icon={<Route className="h-10 w-10" />}
                  title="No route stops found"
                  description={
                    routeSearch || routeDayFilter
                      ? "Try adjusting your search filters."
                      : "Click 'Sync with CRM' or 'Add Stop' to populate the route plan."
                  }
                />
              ) : (
                <div>
                  {/* Mobile Cards (screens < 768px) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {filteredRoutes.map((r: RouteItem) => {
                      const originalIndex = routes.findIndex((item: RouteItem) => item.id === r.id);
                      return (
                        <div key={r.id} className="p-3.5 space-y-2.5 bg-card/50 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                                {originalIndex + 1}
                              </span>
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-semibold text-sm text-foreground leading-tight truncate">{r.name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {r.customer_type && (
                                    <Badge variant="secondary" className="text-[10px]">{r.customer_type}</Badge>
                                  )}
                                  {r.day_of_week && (
                                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800">
                                      {r.day_of_week}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Move Up/Down Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={originalIndex <= 0}
                                onClick={() => moveRouteUp(originalIndex)}
                                className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                                title="Move Stop Up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={originalIndex >= routes.length - 1}
                                onClick={() => moveRouteDown(originalIndex)}
                                className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                                title="Move Stop Down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1">
                            {[r.address, r.city, r.territory].filter(Boolean).length > 0 && (
                              <p className="truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-sky-500" />
                                <span>{[r.address, r.city, r.territory].filter(Boolean).join(", ")}</span>
                              </p>
                            )}
                            {r.phone && (
                              <p>
                                <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                                  <Phone className="h-3 w-3 text-emerald-500" />
                                  <span>{r.phone}</span>
                                </a>
                              </p>
                            )}
                            {r.notes && (
                              <p className="text-amber-600 dark:text-amber-400 italic text-[11px] truncate">
                                Note: {r.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setEditingRoute(r);
                                setRouteForm({
                                  day_of_week: r.day_of_week || "Monday",
                                  notes: r.notes || "",
                                });
                                setRouteModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                              onClick={() => removeRoute(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (screens md+ >= 768px) */}
                  <div className="hidden md:block overflow-x-auto relative rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead className="w-16 text-center">Order</TableHead>
                          <TableHead>{t("customer")}</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoutes.map((r: RouteItem) => {
                          const originalIndex = routes.findIndex((item: RouteItem) => item.id === r.id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-center font-bold text-primary">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs mx-auto">
                                  {originalIndex + 1}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={originalIndex <= 0}
                                    onClick={() => moveRouteUp(originalIndex)}
                                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground transition-opacity"
                                    title="Move Stop Up"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={originalIndex >= routes.length - 1}
                                    onClick={() => moveRouteDown(originalIndex)}
                                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground transition-opacity"
                                    title="Move Stop Down"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold whitespace-nowrap">{r.name}</span>
                                  {r.customer_type && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {r.customer_type}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {r.day_of_week ? (
                                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                    {r.day_of_week}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {[r.address, r.city, r.territory].filter(Boolean).join(", ") || "—"}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {r.phone || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-amber-600 dark:text-amber-400 max-w-xs truncate">
                                {r.notes || "—"}
                              </TableCell>
                              <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingRoute(r);
                                      setRouteForm({
                                        day_of_week: r.day_of_week || "Monday",
                                        notes: r.notes || "",
                                      });
                                      setRouteModalOpen(true);
                                    }}
                                    title="Edit Stop Details"
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRoute(r.id)}
                                    title="Remove Stop"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
      </Tabs>

      {/* Visit Modal */}
      <LogVisitModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customers={customers}
        onSave={handleSaveVisit}
        saving={saving}
      />

      {/* Evening Handover & Reconciliation Modal */}
      <EveningHandoverModal
        open={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
      />

      {/* Delete Visit Confirmation Dialog */}
      <Dialog
        open={!!deletingVisit}
        onClose={() => !deletingVisitLoading && setDeletingVisit(null)}
        title={t("confirmDelete") || "Delete Visit Log"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete this visit log entry?
          </p>
          {deletingVisit && (
            <div className="rounded-lg bg-muted/60 border p-3 text-xs space-y-1">
              <p><span className="font-semibold text-foreground">Customer:</span> {deletingVisit.customer?.name ?? "—"}</p>
              <p><span className="font-semibold text-foreground">Date:</span> {formatDateTime(deletingVisit.visit_date)}</p>
              {deletingVisit.purpose && (
                <p><span className="font-semibold text-foreground">Purpose:</span> {deletingVisit.purpose}</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingVisit(null)}
              disabled={deletingVisitLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteVisit(deletingVisit)}
              disabled={deletingVisitLoading}
              className="gap-1.5"
            >
              {deletingVisitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("delete")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Sales Target Modal (Create & Edit) */}
      <SalesTargetModal
        open={targetModalOpen}
        onClose={() => {
          setTargetModalOpen(false);
          setEditingTarget(null);
        }}
        target={editingTarget}
        users={users}
        onSave={handleSaveTarget}
        saving={savingTarget}
      />

      {/* Edit Route Stop Modal */}
      <Dialog
        open={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        title={`Edit Route Stop — ${editingRoute?.name ?? ""}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Scheduled Day</Label>
            <Select
              value={routeForm.day_of_week}
              onChange={(e) => setRouteForm({ ...routeForm, day_of_week: e.target.value })}
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes / Route Instructions</Label>
            <Textarea
              value={routeForm.notes}
              onChange={(e) => setRouteForm({ ...routeForm, notes: e.target.value })}
              placeholder="e.g. Morning delivery, collect payment, etc."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setRouteModalOpen(false)}>{t("cancel")}</Button>
          <Button onClick={saveRouteEdit}>{t("save")}</Button>
        </div>
      </Dialog>

      {/* Add Customer to Route Modal */}
      <Dialog
        open={addRouteOpen}
        onClose={() => setAddRouteOpen(false)}
        title="Add Customer Stop to Route Plan"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("selectCustomer")}</Label>
            <Select
              value={routeForm.customer_id}
              onChange={(e) => setRouteForm({ ...routeForm, customer_id: e.target.value })}
            >
              <option value="">— Select Customer —</option>
              {customers.map((c: Customer) => {
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
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled Day</Label>
            <Select
              value={routeForm.day_of_week}
              onChange={(e) => setRouteForm({ ...routeForm, day_of_week: e.target.value })}
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes / Route Instructions</Label>
            <Textarea
              value={routeForm.notes}
              onChange={(e) => setRouteForm({ ...routeForm, notes: e.target.value })}
              placeholder="e.g. Morning delivery, collect payment, etc."
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setAddRouteOpen(false)}>{t("cancel")}</Button>
          <Button
            onClick={() => {
              if (!routeForm.customer_id) {
                toast.error(t("selectCustomer"));
                return;
              }
              addCustomerToRoute(routeForm.customer_id);
            }}
          >
            {t("addCustomer") || "Add Stop"}
          </Button>
        </div>
      </Dialog>

      {/* Dynamic Area Management Modal */}
      <AreaManagementModal
        open={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
      />
    </div>
  );
}

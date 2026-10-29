import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { withQueryTimeout, classifySupabaseError } from "@/lib/supabaseQuery";
import { hasActiveSessionToken, ensureValidSession } from "@/lib/auth";
import { toast } from "sonner";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getCustomers,
  getOrders,
  getCollections,
  isPendingOfflineRecord,
  dispatchGlobalStateUpdate,
  type Customer,
  type Visit,
  type Order,
  type Collection,
} from "./localStore";
import {
  encodeCustomerNotes,
  normalizeDueStatus,
  normalizeOrderStatus,
  normalizePaymentMethod,
  normalizePaymentStatus,
  pullFreshCloudStateToLocalStore,
} from "./cloudSync";

let isSyncing = false;

function isValidUuid(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

function generateClientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Auto-syncs all offline queued field records (customers, visits, orders, collections)
 * to Supabase upon network reconnection, then pulls authoritative cloud state so Web & Mobile stay identical.
 */
export async function syncOfflineDataToBackend(): Promise<{
  syncedCustomers: number;
  syncedVisits: number;
  syncedOrders: number;
  syncedCollections: number;
}> {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { syncedCustomers: 0, syncedVisits: 0, syncedOrders: 0, syncedCollections: 0 };
  }

  isSyncing = true;
  let syncedCustomers = 0;
  let syncedVisits = 0;
  let syncedOrders = 0;
  let syncedCollections = 0;
  let failedRecords = 0;
  let firstFailureReason: string | null = null;

  try {
    // Verify or refresh active Supabase session before firing offline sync writes
    const sessionCheck = await ensureValidSession();
    if (sessionCheck.offline || !sessionCheck.session || !hasActiveSessionToken(sessionCheck.session)) {
      if (sessionCheck.error && !sessionCheck.offline) {
        console.warn("[OfflineSync] Session verification issue:", sessionCheck.error.rawMessage);
      }
      return { syncedCustomers: 0, syncedVisits: 0, syncedOrders: 0, syncedCollections: 0 };
    }

    const tempCustomerIdMap = new Map<string, string>();

    // 0. Sync pending offline customers first so FK references from offline orders/collections resolve cleanly
    const customers = getCustomers();
    const localPendingCustomers = customers.filter((c) => isPendingOfflineRecord(c));

    for (const c of localPendingCustomers) {
      if (!c || !(c.outlet_name || c.name)) continue;
      try {
        const targetId = isValidUuid(c.id) ? c.id : generateClientUuid();
        const custType = ["Dealer", "Retailer", "Wholesale"].includes(c.customer_type)
          ? c.customer_type
          : "Retailer";
        const currentDue = Number(c.current_due) || 0;

        const custPayload = {
          id: targetId,
          name: (c.outlet_name || c.name).trim(),
          customer_type: custType,
          contact_person: c.contact_person || c.name || null,
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
          city: c.city || c.area || null,
          territory_id: isValidUuid(c.territory_id) ? c.territory_id : null,
          trade_license_number: c.trade_license_number || null,
          latitude: c.latitude !== undefined && c.latitude !== null && !isNaN(Number(c.latitude)) ? Number(c.latitude) : null,
          longitude: c.longitude !== undefined && c.longitude !== null && !isNaN(Number(c.longitude)) ? Number(c.longitude) : null,
          opening_balance: Number(c.opening_balance) || 0,
          current_due: currentDue,
          due_status: normalizeDueStatus(c.due_status, currentDue),
          notes: encodeCustomerNotes(c),
          assigned_to: isValidUuid(c.assigned_to) ? c.assigned_to : null,
          is_active: c.is_active !== false && c.status !== "Inactive",
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await withQueryTimeout(
          supabase
            .from("customers")
            .upsert(custPayload, { onConflict: "id" })
            .select()
            .single(),
          9000,
          "Offline customer upsert",
        );

        if (!error && data) {
          syncedCustomers++;
          if (c.id !== data.id) {
            tempCustomerIdMap.set(String(c.id), String(data.id));
          }
          const currentCusts = getCustomers();
          const reconciledCusts = currentCusts.map((item: Customer) =>
            item.id === c.id
              ? { ...item, id: data.id, is_offline: false, _unsynced: false, _localPendingUntil: undefined }
              : item,
          );
          setLocalData(STORAGE_KEYS.CUSTOMERS, reconciledCusts, null, true);
        } else if (error) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
        }
      } catch (e) {
        failedRecords++;
        firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        console.warn("Offline customer sync note:", e);
      }
    }

    // 1. Sync pending local visits
    const visits = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    const localPendingVisits = visits.filter(
      (v) => v && (isPendingOfflineRecord(v) || v.id.startsWith("visit-") || !v.id.includes("-")),
    );

    for (const v of localPendingVisits) {
      const resolvedCustId = tempCustomerIdMap.get(String(v.customer_id)) || v.customer_id;
      if (!isValidUuid(resolvedCustId)) continue;
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("visits")
            .insert({
              customer_id: resolvedCustId,
              visited_by: isValidUuid(v.visited_by) ? v.visited_by : null,
              visit_date: v.visit_date,
              check_in: v.check_in,
              check_out: v.check_out,
              latitude: v.latitude,
              longitude: v.longitude,
              purpose: v.purpose,
              outcome: v.outcome,
              notes: v.notes,
            })
            .select()
            .single(),
          9000,
          "Offline visit insert",
        );

        if (!error && data) {
          syncedVisits++;
          const currentVisits = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
          const reconciled = currentVisits.map((item) =>
            item.id === v.id
              ? ({ ...item, id: data.id, customer_id: resolvedCustId, is_offline: false } as Visit)
              : item,
          );
          setLocalData(STORAGE_KEYS.VISITS, reconciled, null, true);
        }
      } catch (e) {
        console.warn("Offline visit sync note:", e);
      }
    }

    // 2. Sync pending orders (before collections so order_id FK exists if linked)
    const orders = getOrders();
    const localPendingOrders = orders.filter((o) => o && isPendingOfflineRecord(o));
    const tempOrderIdMap = new Map<string, string>();

    for (const o of localPendingOrders) {
      const resolvedCustId = tempCustomerIdMap.get(String(o.customer_id)) || o.customer_id;
      if (!isValidUuid(resolvedCustId) || !o.order_number) continue;
      try {
        const totalAmount = Number(o.total_amount) || 0;
        const paidAmount = Number(o.paid_amount) || 0;
        const targetOrderId = isValidUuid(o.id) ? o.id : generateClientUuid();

        const { data, error } = await withQueryTimeout(
          supabase
            .from("orders")
            .upsert(
              {
                id: targetOrderId,
                order_number: o.order_number.trim(),
                customer_id: resolvedCustId,
                sales_rep_id: isValidUuid(o.sales_rep_id) ? o.sales_rep_id : null,
                order_date: o.order_date,
                delivery_date: o.delivery_date || null,
                status: normalizeOrderStatus(o.status),
                subtotal: Number(o.subtotal) || totalAmount,
                discount: Number(o.discount) || 0,
                total_amount: totalAmount,
                due_amount: Number(o.due_amount) || 0,
                paid_amount: paidAmount,
                payment_status: normalizePaymentStatus(o.payment_status, paidAmount, totalAmount),
                notes: o.notes || null,
              },
              { onConflict: "order_number" },
            )
            .select()
            .single(),
          9000,
          "Offline order upsert",
        );

        if (!error && data) {
          syncedOrders++;
          if (o.id !== data.id) {
            tempOrderIdMap.set(String(o.id), String(data.id));
          }
          const items = (o.order_items || (o as any).items || []).filter((it: any) =>
            isValidUuid(it?.product_id),
          );
          if (items.length > 0) {
            await withQueryTimeout(
              supabase.from("order_items").upsert(
                items.map((it: any) => ({
                  id: isValidUuid(it.id) ? it.id : generateClientUuid(),
                  order_id: data.id,
                  product_id: it.product_id,
                  quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
                  unit_price: Number(it.unit_price) || 0,
                  discount: Number(it.discount) || 0,
                  subtotal:
                    Number(it.subtotal) ||
                    Math.max(1, Math.round(Number(it.quantity) || 1)) * (Number(it.unit_price) || 0),
                })),
                { onConflict: "id" },
              ),
              9000,
              "Offline order items upsert",
            );
          }
          const currentOrders = getOrders();
          const reconciled = currentOrders.map((item) =>
            item.id === o.id
              ? ({
                  ...item,
                  id: data.id,
                  customer_id: resolvedCustId,
                  is_offline: false,
                  _unsynced: false,
                  _localPendingUntil: undefined,
                } as Order)
              : item,
          );
          setLocalData(STORAGE_KEYS.ORDERS, reconciled, null, true);
        } else if (error) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
        }
      } catch (e) {
        failedRecords++;
        firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        console.warn("Offline order sync note:", e);
      }
    }

    // 3. Sync pending collections
    const collections = getCollections();
    const localPendingCols = collections.filter((c) => c && isPendingOfflineRecord(c));

    for (const c of localPendingCols) {
      const colAmount = Number(c.amount) || 0;
      const resolvedCustId = tempCustomerIdMap.get(String(c.customer_id)) || c.customer_id;
      const resolvedOrdId = c.order_id
        ? tempOrderIdMap.get(String(c.order_id)) || c.order_id
        : null;
      if (!isValidUuid(resolvedCustId) || colAmount <= 0 || !c.collection_number) continue;
      try {
        const targetColId = isValidUuid(c.id) ? c.id : generateClientUuid();
        const { data, error } = await withQueryTimeout(
          supabase
            .from("collections")
            .upsert(
              {
                id: targetColId,
                collection_number: c.collection_number.trim(),
                customer_id: resolvedCustId,
                order_id: isValidUuid(resolvedOrdId) ? resolvedOrdId : null,
                amount: colAmount,
                payment_method: normalizePaymentMethod(c.payment_method),
                collection_date: c.collection_date,
                collected_by: isValidUuid((c as any).collected_by) ? (c as any).collected_by : null,
                notes: c.notes || null,
              },
              { onConflict: "collection_number" },
            )
            .select()
            .single(),
          9000,
          "Offline collection upsert",
        );

        if (!error && data) {
          syncedCollections++;
          const currentCols = getCollections();
          const reconciled = currentCols.map((item) =>
            item.id === c.id
              ? ({
                  ...item,
                  id: data.id,
                  customer_id: resolvedCustId,
                  order_id: isValidUuid(resolvedOrdId) ? resolvedOrdId : null,
                  is_offline: false,
                  _unsynced: false,
                  _localPendingUntil: undefined,
                } as Collection)
              : item,
          );
          setLocalData(STORAGE_KEYS.COLLECTIONS, reconciled, null, true);
        } else if (error) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
        }
      } catch (e) {
        failedRecords++;
        firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        console.warn("Offline collection sync note:", e);
      }
    }

    if (syncedCustomers > 0 || syncedVisits > 0 || syncedOrders > 0 || syncedCollections > 0) {
      await pullFreshCloudStateToLocalStore({ force: true, silent: true });
      dispatchGlobalStateUpdate({ type: "offline_sync_completed" });
      toast.success(
        `Field Mode Auto-Sync: ${syncedCustomers} outlets, ${syncedOrders} orders, ${syncedCollections} collections, and ${syncedVisits} visits synced to cloud.`,
      );
    } else if (failedRecords > 0 && firstFailureReason) {
      toast.warning(`Offline sync could not upload ${failedRecords} queued record(s): ${firstFailureReason}`);
    }
  } catch (err: any) {
    const classified = classifySupabaseError(err);
    console.warn("Offline synchronization error:", classified.rawMessage);
    if (classified.kind !== "offline") {
      toast.warning(classified.userMessage);
    }
  } finally {
    isSyncing = false;
  }

  return { syncedCustomers, syncedVisits, syncedOrders, syncedCollections };
}

/**
 * Reactive hook to provide real-time connection status and offline sync indicators to headers / banners.
 */
export function useOfflineFieldSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [syncingState, setSyncingState] = useState<boolean>(false);

  useEffect(() => {
    const runReconnectSync = async () => {
      setSyncingState(true);
      try {
        await syncOfflineDataToBackend();
        await pullFreshCloudStateToLocalStore({ force: true, silent: true });
      } finally {
        setSyncingState(false);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Network connected: Synchronizing latest cloud data...");
      void runReconnectSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are in Offline Field Mode. All entries are safely saved locally.");
    };

    const handleVisibilityResume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const onlineNow = typeof navigator !== "undefined" ? navigator.onLine : true;
        setIsOnline(onlineNow);
        if (onlineNow) {
          void runReconnectSync();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityResume);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityResume);
    };
  }, []);

  const pendingVisitsCount = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []).filter(
    (v) => v && (isPendingOfflineRecord(v) || v.id.startsWith("visit-") || !v.id.includes("-")),
  ).length;
  const pendingCollectionsCount = getCollections().filter((c) => c && isPendingOfflineRecord(c)).length;

  return {
    isOnline,
    pendingVisitsCount,
    pendingCollectionsCount,
    isSyncing: syncingState || isSyncing,
    syncNow: syncOfflineDataToBackend,
    triggerSync: syncOfflineDataToBackend,
  };
}

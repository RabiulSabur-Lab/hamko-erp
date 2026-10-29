import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { withQueryTimeout } from "@/lib/supabaseQuery";
import { hasActiveSessionToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getOrders,
  getCollections,
  dispatchGlobalStateUpdate,
  type Visit,
  type Order,
  type Collection,
} from "./localStore";

let isSyncing = false;

function isValidUuid(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

function normalizeOfflinePaymentMethod(rawMethod: unknown): "Cash" | "Cheque" | "Bank Transfer" | "Mobile Banking" {
  const clean = String(rawMethod || "").trim();
  if (clean === "Cash" || clean === "Cheque" || clean === "Bank Transfer" || clean === "Mobile Banking") {
    return clean;
  }
  const lower = clean.toLowerCase();
  if (lower.includes("cheque") || lower.includes("check")) return "Cheque";
  if (lower.includes("bank")) return "Bank Transfer";
  if (lower.includes("mobile") || lower.includes("bkash") || lower.includes("nagad") || lower.includes("rocket")) {
    return "Mobile Banking";
  }
  return "Cash";
}

function normalizeOfflineOrderStatus(rawStatus: unknown): "Draft" | "Pending" | "Approved" | "Delivered" | "Cancelled" {
  if (
    rawStatus === "Draft" ||
    rawStatus === "Pending" ||
    rawStatus === "Approved" ||
    rawStatus === "Delivered" ||
    rawStatus === "Cancelled"
  ) {
    return rawStatus;
  }
  return "Delivered";
}

function normalizeOfflinePaymentStatus(rawStatus: unknown, paidAmount: number, totalAmount: number): "Unpaid" | "Partial" | "Paid" {
  if (rawStatus === "Unpaid" || rawStatus === "Partial" || rawStatus === "Paid") {
    return rawStatus;
  }
  if (totalAmount > 0 && paidAmount >= totalAmount) return "Paid";
  if (paidAmount > 0) return "Partial";
  return "Unpaid";
}

/**
 * Auto-syncs all offline queued field records (visits, orders, collections) to Supabase upon network reconnection.
 */
export async function syncOfflineDataToBackend(): Promise<{ syncedVisits: number; syncedOrders: number; syncedCollections: number }> {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { syncedVisits: 0, syncedOrders: 0, syncedCollections: 0 };
  }

  isSyncing = true;
  let syncedVisits = 0;
  let syncedOrders = 0;
  let syncedCollections = 0;

  try {
    // Verify active Supabase session before firing offline sync inserts
    const { data: sessionData, error: sessionErr } = await withQueryTimeout(
      supabase.auth.getSession(),
      6000,
      "Offline sync session check",
    );
    if (sessionErr || !hasActiveSessionToken(sessionData?.session)) {
      return { syncedVisits: 0, syncedOrders: 0, syncedCollections: 0 };
    }

    // 1. Sync pending local visits
    const visits = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    const localPendingVisits = visits.filter((v) => v.id.startsWith("visit-") || !v.id.includes("-"));

    for (const v of localPendingVisits) {
      if (!isValidUuid(v.customer_id)) continue;
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("visits")
            .insert({
              customer_id: v.customer_id,
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
          const reconciled = currentVisits.map((item) => (item.id === v.id ? { ...item, id: data.id } : item));
          setLocalData(STORAGE_KEYS.VISITS, reconciled, null, true);
        }
      } catch (e) {
        console.warn("Offline visit sync note:", e);
      }
    }

    // 2. Sync pending collections
    const collections = getCollections();
    const localPendingCols = collections.filter((c) => c.id.startsWith("col-") || (c as any).is_offline);

    for (const c of localPendingCols) {
      const colAmount = Number(c.amount) || 0;
      if (!isValidUuid(c.customer_id) || colAmount <= 0) continue;
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("collections")
            .insert({
              collection_number: c.collection_number,
              customer_id: c.customer_id,
              order_id: isValidUuid(c.order_id) ? c.order_id : null,
              amount: colAmount,
              payment_method: normalizeOfflinePaymentMethod(c.payment_method),
              collection_date: c.collection_date,
              notes: c.notes || null,
            })
            .select()
            .single(),
          9000,
          "Offline collection insert",
        );

        if (!error && data) {
          syncedCollections++;
          const currentCols = getCollections();
          const reconciled = currentCols.map((item) => (item.id === c.id ? { ...item, id: data.id, is_offline: false } : item));
          setLocalData(STORAGE_KEYS.COLLECTIONS, reconciled, null, true);
        }
      } catch (e) {
        console.warn("Offline collection sync note:", e);
      }
    }

    // 3. Sync pending orders
    const orders = getOrders();
    const localPendingOrders = orders.filter((o) => o.id.startsWith("ord-") || (o as any).is_offline);

    for (const o of localPendingOrders) {
      if (!isValidUuid(o.customer_id)) continue;
      try {
        const totalAmount = Number(o.total_amount) || 0;
        const paidAmount = Number(o.paid_amount) || 0;
        const { data, error } = await withQueryTimeout(
          supabase
            .from("orders")
            .insert({
              order_number: o.order_number,
              customer_id: o.customer_id,
              sales_rep_id: isValidUuid(o.sales_rep_id) ? o.sales_rep_id : null,
              order_date: o.order_date,
              delivery_date: o.delivery_date || null,
              status: normalizeOfflineOrderStatus(o.status),
              subtotal: Number(o.subtotal) || totalAmount,
              discount: Number(o.discount) || 0,
              total_amount: totalAmount,
              due_amount: Number(o.due_amount) || 0,
              paid_amount: paidAmount,
              payment_status: normalizeOfflinePaymentStatus(o.payment_status, paidAmount, totalAmount),
              notes: o.notes || null,
            })
            .select()
            .single(),
          9000,
          "Offline order insert",
        );

        if (!error && data) {
          syncedOrders++;
          const items = (o.order_items || (o as any).items || []).filter((it: any) => isValidUuid(it?.product_id));
          if (items.length > 0) {
            await withQueryTimeout(
              supabase.from("order_items").insert(
                items.map((it: any) => ({
                  order_id: data.id,
                  product_id: it.product_id,
                  quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
                  unit_price: Number(it.unit_price) || 0,
                  discount: Number(it.discount) || 0,
                  subtotal: Number(it.subtotal) || (Math.max(1, Math.round(Number(it.quantity) || 1)) * (Number(it.unit_price) || 0)),
                })),
              ),
              9000,
              "Offline order items insert",
            );
          }
          const currentOrders = getOrders();
          const reconciled = currentOrders.map((item) => (item.id === o.id ? { ...item, id: data.id, is_offline: false } : item));
          setLocalData(STORAGE_KEYS.ORDERS, reconciled, null, true);
        }
      } catch (e) {
        console.warn("Offline order sync note:", e);
      }
    }

    if (syncedVisits > 0 || syncedOrders > 0 || syncedCollections > 0) {
      dispatchGlobalStateUpdate({ type: "offline_sync_completed" });
      toast.success(
        `Field Mode Auto-Sync: ${syncedVisits} visits, ${syncedOrders} orders, and ${syncedCollections} collections synced to cloud.`
      );
    }
  } catch (err: any) {
    console.warn("Offline synchronization error:", err?.message || err);
  } finally {
    isSyncing = false;
  }

  return { syncedVisits, syncedOrders, syncedCollections };
}

/**
 * Reactive hook to provide real-time connection status and offline sync indicators to headers / banners.
 */
export function useOfflineFieldSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Network connected: Initializing Field Mode cloud sync...");
      syncOfflineDataToBackend();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are in Offline Field Mode. All entries are safely saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    pendingVisitsCount: 0,
    pendingCollectionsCount: 0,
    isSyncing: false,
    syncNow: syncOfflineDataToBackend,
    triggerSync: syncOfflineDataToBackend,
  };
}

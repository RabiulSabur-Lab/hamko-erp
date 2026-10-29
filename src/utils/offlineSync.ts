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
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("visits")
            .insert({
              customer_id: v.customer_id,
              visited_by: v.visited_by,
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
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("collections")
            .insert({
              collection_number: c.collection_number,
              customer_id: c.customer_id,
              order_id: c.order_id,
              amount: c.amount,
              payment_method: c.payment_method,
              collection_date: c.collection_date,
              notes: c.notes,
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
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from("orders")
            .insert({
              order_number: o.order_number,
              customer_id: o.customer_id,
              sales_rep_id: o.sales_rep_id,
              order_date: o.order_date,
              delivery_date: o.delivery_date,
              status: o.status,
              subtotal: o.subtotal,
              discount: o.discount,
              total_amount: o.total_amount,
              due_amount: o.due_amount,
              paid_amount: o.paid_amount,
              payment_status: o.payment_status,
              notes: o.notes,
            })
            .select()
            .single(),
          9000,
          "Offline order insert",
        );

        if (!error && data) {
          syncedOrders++;
          const items = o.order_items || (o as any).items || [];
          if (items.length > 0) {
            await withQueryTimeout(
              supabase.from("order_items").insert(
                items.map((it: any) => ({
                  order_id: data.id,
                  product_id: it.product_id,
                  quantity: it.quantity,
                  unit_price: it.unit_price,
                  discount: it.discount,
                  subtotal: it.subtotal,
                  price_tier: it.price_tier,
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

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
const MAX_OFFLINE_SYNC_ATTEMPTS = 3;

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

function isForeignKeyError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  const details = String(err.details || "").toLowerCase();
  return code === "23503" || msg.includes("foreign key") || details.includes("foreign key");
}

function isPermanentError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  if (code === "23502" || code === "22P02" || code === "42703" || code === "42P01") return true;
  if (msg.includes("violates not-null") || msg.includes("invalid input syntax")) return true;
  return false;
}

/**
 * Safely updates sync attempts or marks permanently broken records as safe-cleared
 * so they cannot cause an infinite failing sync loop or spam warning toasts.
 */
function recordOrSafeClearFailure<T extends { id: string | number; [key: string]: any }>(
  storageKey: string,
  item: T,
  errorMsg: string,
  isPermanent = false,
): { safeCleared: boolean; attempts: number } {
  const currentAttempts = (Number(item._syncAttempts) || 0) + 1;
  const shouldSafeClear = isPermanent || currentAttempts >= MAX_OFFLINE_SYNC_ATTEMPTS;

  const currentList = getLocalData<T[]>(storageKey, []);
  const updatedList = currentList.map((entry) => {
    if (entry && entry.id === item.id) {
      if (shouldSafeClear) {
        return {
          ...entry,
          is_offline: false,
          _unsynced: false,
          _localPendingUntil: undefined,
          _syncAttempts: currentAttempts,
          _syncStripped: true,
          _syncStrippedReason: errorMsg,
          _syncStrippedAt: new Date().toISOString(),
        };
      } else {
        return {
          ...entry,
          _syncAttempts: currentAttempts,
          _lastSyncError: errorMsg,
          _lastSyncAttemptAt: new Date().toISOString(),
        };
      }
    }
    return entry;
  });

  setLocalData(storageKey, updatedList, null, true);

  if (shouldSafeClear) {
    console.warn(
      `[OfflineSync] Safe-cleared un-uploadable record from ${storageKey} (id: ${item.id}) after ${currentAttempts} attempt(s): ${errorMsg}`,
    );
  }

  return { safeCleared: shouldSafeClear, attempts: currentAttempts };
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

    // Pre-fetch valid reference keys from Supabase so FK relationships resolve without database constraint errors
    const [usersRes, territoriesRes, custsRes, prodsRes, ordersRes] = await Promise.allSettled([
      withQueryTimeout(supabase.from("users").select("id, full_name, email"), 7000, "Fetch users"),
      withQueryTimeout(supabase.from("territories").select("id, name"), 7000, "Fetch territories"),
      withQueryTimeout(supabase.from("customers").select("id, name"), 7000, "Fetch customers"),
      withQueryTimeout(supabase.from("products").select("id, name, sku_code"), 7000, "Fetch products"),
      withQueryTimeout(supabase.from("orders").select("id, order_number"), 7000, "Fetch orders"),
    ]);

    const validUserIds = new Set<string>();
    const userNameToId = new Map<string, string>();
    let firstAdminUserId: string | null = null;
    if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
      usersRes.value.data.forEach((u: any) => {
        if (u?.id) {
          validUserIds.add(u.id);
          if (!firstAdminUserId && (String(u.full_name).toLowerCase().includes("admin") || u.id.startsWith("00000000"))) {
            firstAdminUserId = u.id;
          }
          if (u.full_name) userNameToId.set(String(u.full_name).trim().toLowerCase(), u.id);
          if (u.email) userNameToId.set(String(u.email).trim().toLowerCase(), u.id);
        }
      });
    }

    const validTerritoryIds = new Set<string>();
    const territoryNameToId = new Map<string, string>();
    if (territoriesRes.status === "fulfilled" && Array.isArray(territoriesRes.value.data)) {
      territoriesRes.value.data.forEach((t: any) => {
        if (t?.id) {
          validTerritoryIds.add(t.id);
          if (t.name) territoryNameToId.set(String(t.name).trim().toLowerCase(), t.id);
        }
      });
    }

    const validCustomerIds = new Set<string>();
    const customerNameToId = new Map<string, string>();
    let firstValidCustomerId: string | null = null;
    if (custsRes.status === "fulfilled" && Array.isArray(custsRes.value.data)) {
      custsRes.value.data.forEach((c: any) => {
        if (c?.id) {
          validCustomerIds.add(c.id);
          if (!firstValidCustomerId) firstValidCustomerId = c.id;
          if (c.name) customerNameToId.set(String(c.name).trim().toLowerCase(), c.id);
        }
      });
    }

    const validProductIds = new Set<string>();
    if (prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value.data)) {
      prodsRes.value.data.forEach((p: any) => {
        if (p?.id) validProductIds.add(p.id);
      });
    }

    const validOrderIds = new Set<string>();
    if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value.data)) {
      ordersRes.value.data.forEach((o: any) => {
        if (o?.id) validOrderIds.add(o.id);
      });
    }

    const tempCustomerIdMap = new Map<string, string>();

    // 0. Sync pending offline customers first so FK references from offline orders/collections resolve cleanly
    const customers = getCustomers();
    const localPendingCustomers = customers.filter((c) => isPendingOfflineRecord(c));

    for (const c of localPendingCustomers) {
      if (!c) continue;
      const custName = (c.outlet_name || c.name || "").trim();
      if (!custName) {
        recordOrSafeClearFailure(STORAGE_KEYS.CUSTOMERS, c, "Missing customer or outlet name", true);
        continue;
      }

      try {
        const targetId = isValidUuid(c.id) ? c.id : generateClientUuid();
        const custType = ["Dealer", "Retailer", "Wholesale"].includes(c.customer_type)
          ? c.customer_type
          : "Retailer";
        const currentDue = Number(c.current_due) || 0;

        // Resolve assigned_to safely against database users
        let resolvedAssignedTo: string | null = null;
        if (isValidUuid(c.assigned_to) && validUserIds.has(c.assigned_to!)) {
          resolvedAssignedTo = c.assigned_to!;
        } else if ((c as any).assigned_to_name && userNameToId.has(String((c as any).assigned_to_name).trim().toLowerCase())) {
          resolvedAssignedTo = userNameToId.get(String((c as any).assigned_to_name).trim().toLowerCase())!;
        } else if ((c as any).created_by_name && userNameToId.has(String((c as any).created_by_name).trim().toLowerCase())) {
          resolvedAssignedTo = userNameToId.get(String((c as any).created_by_name).trim().toLowerCase())!;
        } else if (firstAdminUserId) {
          resolvedAssignedTo = firstAdminUserId;
        }

        // Resolve territory_id safely against database territories
        let resolvedTerritoryId: string | null = null;
        if (isValidUuid(c.territory_id) && validTerritoryIds.has(c.territory_id!)) {
          resolvedTerritoryId = c.territory_id!;
        } else {
          const areaKey = String(c.area || c.city || "").trim().toLowerCase();
          if (areaKey && territoryNameToId.has(areaKey)) {
            resolvedTerritoryId = territoryNameToId.get(areaKey)!;
          }
        }

        let custPayload: Record<string, any> = {
          id: targetId,
          name: custName,
          customer_type: custType,
          contact_person: c.contact_person || c.name || null,
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
          city: c.city || c.area || null,
          territory_id: resolvedTerritoryId,
          trade_license_number: c.trade_license_number || null,
          latitude: c.latitude !== undefined && c.latitude !== null && !isNaN(Number(c.latitude)) ? Number(c.latitude) : null,
          longitude: c.longitude !== undefined && c.longitude !== null && !isNaN(Number(c.longitude)) ? Number(c.longitude) : null,
          opening_balance: Number(c.opening_balance) || 0,
          current_due: currentDue,
          due_status: normalizeDueStatus(c.due_status, currentDue),
          notes: encodeCustomerNotes(c),
          assigned_to: resolvedAssignedTo,
          is_active: c.is_active !== false && c.status !== "Inactive",
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await withQueryTimeout(
          supabase
            .from("customers")
            .upsert(custPayload, { onConflict: "id" })
            .select()
            .single(),
          9000,
          "Offline customer upsert",
        );

        // Immediate retry with nullified FK relationships if Foreign Key violation occurs
        if (error && isForeignKeyError(error)) {
          console.warn("[OfflineSync] Customer FK constraint mismatch; retrying with nullified assigned_to & territory_id:", error.message);
          custPayload = {
            ...custPayload,
            assigned_to: null,
            territory_id: null,
          };
          const retryRes = await withQueryTimeout(
            supabase
              .from("customers")
              .upsert(custPayload, { onConflict: "id" })
              .select()
              .single(),
            9000,
            "Offline customer upsert retry",
          );
          data = retryRes.data;
          error = retryRes.error;
        }

        if (!error && data) {
          syncedCustomers++;
          validCustomerIds.add(data.id);
          customerNameToId.set(data.name.trim().toLowerCase(), data.id);
          if (c.id !== data.id) {
            tempCustomerIdMap.set(String(c.id), String(data.id));
          }
          const currentCusts = getCustomers();
          const reconciledCusts = currentCusts.map((item: Customer) =>
            item.id === c.id
              ? {
                  ...item,
                  id: data.id,
                  is_offline: false,
                  _unsynced: false,
                  _localPendingUntil: undefined,
                  _syncAttempts: undefined,
                  _syncStripped: undefined,
                }
              : item,
          );
          setLocalData(STORAGE_KEYS.CUSTOMERS, reconciledCusts, null, true);
        } else if (error) {
          const { safeCleared } = recordOrSafeClearFailure(
            STORAGE_KEYS.CUSTOMERS,
            c,
            error.message,
            isPermanentError(error),
          );
          if (!safeCleared) {
            failedRecords++;
            firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
          }
        }
      } catch (e: any) {
        const { safeCleared } = recordOrSafeClearFailure(
          STORAGE_KEYS.CUSTOMERS,
          c,
          e?.message || String(e),
          false,
        );
        if (!safeCleared) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        }
        console.warn("Offline customer sync note:", e);
      }
    }

    // 1. Sync pending local visits
    const visits = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    const localPendingVisits = visits.filter((v) => v && isPendingOfflineRecord(v));

    for (const v of localPendingVisits) {
      if (!v) continue;
      let resolvedCustId = tempCustomerIdMap.get(String(v.customer_id)) || v.customer_id;
      if (!validCustomerIds.has(String(resolvedCustId))) {
        const cName = (v as any).customer_name;
        if (cName && customerNameToId.has(String(cName).trim().toLowerCase())) {
          resolvedCustId = customerNameToId.get(String(cName).trim().toLowerCase())!;
        } else if (firstValidCustomerId) {
          resolvedCustId = firstValidCustomerId;
        }
      }

      if (!isValidUuid(resolvedCustId)) {
        recordOrSafeClearFailure(STORAGE_KEYS.VISITS, v, "Unresolvable visit customer FK", true);
        continue;
      }

      try {
        let resolvedVisitorId = isValidUuid(v.visited_by) && validUserIds.has(v.visited_by!) ? v.visited_by : null;
        let visitPayload: Record<string, any> = {
          customer_id: resolvedCustId,
          visited_by: resolvedVisitorId,
          visit_date: v.visit_date || new Date().toISOString(),
          check_in: v.check_in || null,
          check_out: v.check_out || null,
          latitude: v.latitude !== undefined && v.latitude !== null && !isNaN(Number(v.latitude)) ? Number(v.latitude) : null,
          longitude: v.longitude !== undefined && v.longitude !== null && !isNaN(Number(v.longitude)) ? Number(v.longitude) : null,
          purpose: v.purpose || null,
          outcome: v.outcome || null,
          notes: v.notes || null,
        };

        let { data, error } = await withQueryTimeout(
          supabase
            .from("visits")
            .insert(visitPayload)
            .select()
            .single(),
          9000,
          "Offline visit insert",
        );

        if (error && isForeignKeyError(error)) {
          visitPayload.visited_by = null;
          const retryRes = await withQueryTimeout(
            supabase
              .from("visits")
              .insert(visitPayload)
              .select()
              .single(),
            9000,
            "Offline visit insert retry",
          );
          data = retryRes.data;
          error = retryRes.error;
        }

        if (!error && data) {
          syncedVisits++;
          const currentVisits = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
          const reconciled = currentVisits.map((item) =>
            item.id === v.id
              ? ({
                  ...item,
                  id: data.id,
                  customer_id: resolvedCustId,
                  is_offline: false,
                  _unsynced: false,
                  _localPendingUntil: undefined,
                  _syncAttempts: undefined,
                  _syncStripped: undefined,
                } as Visit)
              : item,
          );
          setLocalData(STORAGE_KEYS.VISITS, reconciled, null, true);
        } else if (error) {
          recordOrSafeClearFailure(STORAGE_KEYS.VISITS, v, error.message, isPermanentError(error));
        }
      } catch (e: any) {
        recordOrSafeClearFailure(STORAGE_KEYS.VISITS, v, e?.message || String(e), false);
        console.warn("Offline visit sync note:", e);
      }
    }

    // 2. Sync pending orders (before collections so order_id FK exists if linked)
    const orders = getOrders();
    const localPendingOrders = orders.filter((o) => o && isPendingOfflineRecord(o));
    const tempOrderIdMap = new Map<string, string>();

    for (const o of localPendingOrders) {
      if (!o) continue;
      const orderNum = String(o.order_number || "").trim();
      if (!orderNum) {
        recordOrSafeClearFailure(STORAGE_KEYS.ORDERS, o, "Missing order number", true);
        continue;
      }

      let resolvedCustId = tempCustomerIdMap.get(String(o.customer_id)) || o.customer_id;
      if (!validCustomerIds.has(String(resolvedCustId))) {
        const cName = o.customer?.name || o.customer?.outlet_name;
        if (cName && customerNameToId.has(String(cName).trim().toLowerCase())) {
          resolvedCustId = customerNameToId.get(String(cName).trim().toLowerCase())!;
        } else if (firstValidCustomerId) {
          resolvedCustId = firstValidCustomerId;
        }
      }

      if (!isValidUuid(resolvedCustId)) {
        recordOrSafeClearFailure(STORAGE_KEYS.ORDERS, o, "Unresolvable order customer FK", true);
        continue;
      }

      try {
        const totalAmount = Number(o.total_amount) || 0;
        const paidAmount = Number(o.paid_amount) || 0;
        const targetOrderId = isValidUuid(o.id) ? o.id : generateClientUuid();

        let resolvedSalesRepId: string | null = null;
        if (isValidUuid(o.sales_rep_id) && validUserIds.has(o.sales_rep_id!)) {
          resolvedSalesRepId = o.sales_rep_id!;
        } else {
          const repName = (o as any).sales_rep?.full_name || (o as any).sales_rep_name;
          if (repName && userNameToId.has(String(repName).trim().toLowerCase())) {
            resolvedSalesRepId = userNameToId.get(String(repName).trim().toLowerCase())!;
          }
        }

        let orderPayload: Record<string, any> = {
          id: targetOrderId,
          order_number: orderNum,
          customer_id: resolvedCustId,
          sales_rep_id: resolvedSalesRepId,
          order_date: o.order_date || new Date().toISOString(),
          delivery_date: o.delivery_date || null,
          status: normalizeOrderStatus(o.status),
          subtotal: Number(o.subtotal) || totalAmount,
          discount: Number(o.discount) || 0,
          total_amount: totalAmount,
          due_amount: Number(o.due_amount) || 0,
          paid_amount: paidAmount,
          payment_status: normalizePaymentStatus(o.payment_status, paidAmount, totalAmount),
          notes: o.notes || null,
        };

        let { data, error } = await withQueryTimeout(
          supabase
            .from("orders")
            .upsert(orderPayload, { onConflict: "order_number" })
            .select()
            .single(),
          9000,
          "Offline order upsert",
        );

        if (error && isForeignKeyError(error)) {
          console.warn("[OfflineSync] Order sales_rep_id FK constraint mismatch; retrying with sales_rep_id: null:", error.message);
          orderPayload.sales_rep_id = null;
          const retryRes = await withQueryTimeout(
            supabase
              .from("orders")
              .upsert(orderPayload, { onConflict: "order_number" })
              .select()
              .single(),
            9000,
            "Offline order upsert retry",
          );
          data = retryRes.data;
          error = retryRes.error;
        }

        if (!error && data) {
          syncedOrders++;
          validOrderIds.add(data.id);
          if (o.id !== data.id) {
            tempOrderIdMap.set(String(o.id), String(data.id));
          }
          const rawItems = (o.order_items || (o as any).items || []);
          const items = rawItems.filter((it: any) =>
            isValidUuid(it?.product_id) && (validProductIds.size === 0 || validProductIds.has(it.product_id)),
          );
          if (items.length > 0) {
            try {
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
            } catch (itemErr) {
              console.warn("[OfflineSync] Order items upsert notice:", itemErr);
            }
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
                  _syncAttempts: undefined,
                  _syncStripped: undefined,
                } as Order)
              : item,
          );
          setLocalData(STORAGE_KEYS.ORDERS, reconciled, null, true);
        } else if (error) {
          const { safeCleared } = recordOrSafeClearFailure(
            STORAGE_KEYS.ORDERS,
            o,
            error.message,
            isPermanentError(error),
          );
          if (!safeCleared) {
            failedRecords++;
            firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
          }
        }
      } catch (e: any) {
        const { safeCleared } = recordOrSafeClearFailure(
          STORAGE_KEYS.ORDERS,
          o,
          e?.message || String(e),
          false,
        );
        if (!safeCleared) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        }
        console.warn("Offline order sync note:", e);
      }
    }

    // 3. Sync pending collections
    const collections = getCollections();
    const localPendingCols = collections.filter((c) => c && isPendingOfflineRecord(c));

    for (const c of localPendingCols) {
      if (!c) continue;
      const colAmount = Number(c.amount) || 0;
      const colNum = String(c.collection_number || "").trim();
      if (colAmount <= 0 || !colNum) {
        recordOrSafeClearFailure(STORAGE_KEYS.COLLECTIONS, c, "Invalid amount or collection number", true);
        continue;
      }

      let resolvedCustId = tempCustomerIdMap.get(String(c.customer_id)) || c.customer_id;
      if (!validCustomerIds.has(String(resolvedCustId))) {
        const cName = (c as any).customer?.name;
        if (cName && customerNameToId.has(String(cName).trim().toLowerCase())) {
          resolvedCustId = customerNameToId.get(String(cName).trim().toLowerCase())!;
        } else if (firstValidCustomerId) {
          resolvedCustId = firstValidCustomerId;
        }
      }

      if (!isValidUuid(resolvedCustId)) {
        recordOrSafeClearFailure(STORAGE_KEYS.COLLECTIONS, c, "Unresolvable collection customer FK", true);
        continue;
      }

      let resolvedOrdId = c.order_id
        ? tempOrderIdMap.get(String(c.order_id)) || c.order_id
        : null;
      if (resolvedOrdId && !validOrderIds.has(String(resolvedOrdId))) {
        resolvedOrdId = null;
      }

      let resolvedCollectorId: string | null = null;
      if (isValidUuid((c as any).collected_by) && validUserIds.has((c as any).collected_by!)) {
        resolvedCollectorId = (c as any).collected_by!;
      }

      try {
        const targetColId = isValidUuid(c.id) ? c.id : generateClientUuid();
        let colPayload: Record<string, any> = {
          id: targetColId,
          collection_number: colNum,
          customer_id: resolvedCustId,
          order_id: isValidUuid(resolvedOrdId) ? resolvedOrdId : null,
          amount: colAmount,
          payment_method: normalizePaymentMethod(c.payment_method),
          collection_date: c.collection_date || new Date().toISOString(),
          collected_by: resolvedCollectorId,
          notes: c.notes || null,
        };

        let { data, error } = await withQueryTimeout(
          supabase
            .from("collections")
            .upsert(colPayload, { onConflict: "collection_number" })
            .select()
            .single(),
          9000,
          "Offline collection upsert",
        );

        if (error && isForeignKeyError(error)) {
          console.warn("[OfflineSync] Collection FK constraint mismatch; retrying with nullified order_id & collected_by:", error.message);
          colPayload.order_id = null;
          colPayload.collected_by = null;
          const retryRes = await withQueryTimeout(
            supabase
              .from("collections")
              .upsert(colPayload, { onConflict: "collection_number" })
              .select()
              .single(),
            9000,
            "Offline collection upsert retry",
          );
          data = retryRes.data;
          error = retryRes.error;
        }

        if (!error && data) {
          syncedCollections++;
          const currentCols = getCollections();
          const reconciled = currentCols.map((item) =>
            item.id === c.id
              ? ({
                  ...item,
                  id: data.id,
                  customer_id: resolvedCustId,
                  order_id: colPayload.order_id,
                  is_offline: false,
                  _unsynced: false,
                  _localPendingUntil: undefined,
                  _syncAttempts: undefined,
                  _syncStripped: undefined,
                } as Collection)
              : item,
          );
          setLocalData(STORAGE_KEYS.COLLECTIONS, reconciled, null, true);
        } else if (error) {
          const { safeCleared } = recordOrSafeClearFailure(
            STORAGE_KEYS.COLLECTIONS,
            c,
            error.message,
            isPermanentError(error),
          );
          if (!safeCleared) {
            failedRecords++;
            firstFailureReason = firstFailureReason || classifySupabaseError(error).userMessage;
          }
        }
      } catch (e: any) {
        const { safeCleared } = recordOrSafeClearFailure(
          STORAGE_KEYS.COLLECTIONS,
          c,
          e?.message || String(e),
          false,
        );
        if (!safeCleared) {
          failedRecords++;
          firstFailureReason = firstFailureReason || classifySupabaseError(e).userMessage;
        }
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
    (v) => v && isPendingOfflineRecord(v),
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

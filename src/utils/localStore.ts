import type {
  Order,
  Notification,
  Collection,
  Expense,
  Product,
  Area,
  Supplier,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  SupplierPayment,
  SupplierLedgerEntry,
  ProcurementAuditLog,
} from '../types';
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export type {
  Product,
  Order,
  Notification,
  Collection,
  Expense,
  Area,
  Supplier,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  SupplierPayment,
  SupplierLedgerEntry,
  ProcurementAuditLog,
};

import type { HandoverRecord, Visit, Category } from '@/lib/supabase';
export type { HandoverRecord, Visit, Category };

export type InvoiceStatus = 'Partial' | 'Paid' | 'Pending' | 'Received' | 'Partially Paid';

import {
  getItemWithTTL,
  setItemWithTTL,
  removeItem,
  TTL,
  isStorageEnvelope,
  cleanupLocalStorage,
  getSessionItem,
  setSessionItem,
  removeSessionItem,
} from "@/lib/storageManager";

export {
  getItemWithTTL,
  setItemWithTTL,
  removeItem,
  TTL,
  isStorageEnvelope,
  cleanupLocalStorage,
  getSessionItem,
  setSessionItem,
  removeSessionItem,
};

/**
 * 100% precision 2-decimal financial rounding helper
 */
export function r2(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface Customer {
  id: string;
  name: string;
  outlet_name?: string | null;
  party_code?: string | null;
  area?: string | null;
  alt_phone?: string | null;
  contact_person?: string | null;
  phone: string | null;
  address?: string | null;
  customer_type: "Dealer" | "Retailer" | "Wholesale" | string;
  email?: string | null;
  city?: string | null;
  territory_id?: string | null;
  trade_license_number?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_balance?: number;
  current_due?: number;
  due_status?: "Clear" | "Overdue" | "Partial" | string;
  notes?: string | null;
  assigned_to?: string | null;
  status?: "Active" | "Inactive" | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  territory?: any | null;
  // Security Deposit / Guarantee Cheque Details
  securityChequeNo?: string | null;
  securityBankName?: string | null;
  securityBranchName?: string | null;
  securityChequeDate?: string | null;
  securityNotes?: string | null;
  security_cheque_no?: string | null;
  security_bank_name?: string | null;
  security_branch_name?: string | null;
  security_cheque_date?: string | null;
  security_notes?: string | null;
  hasSecurityCheque?: boolean | null;
  security_cheque_status?: string | null;
  is_offline?: boolean;
  _unsynced?: boolean;
  _localPendingUntil?: number;
  _syncAttempts?: number;
  _lastSyncError?: string;
  _lastSyncAttemptAt?: string;
  _syncStripped?: boolean;
  _syncStrippedReason?: string;
  _syncStrippedAt?: string;
}

export const STORAGE_KEYS = {
  ORDERS: 'sales_erp_local_orders',
  NOTIFICATIONS: 'sales_erp_local_notifications',
  COLLECTIONS: 'sales_erp_local_collections',
  EXPENSES: 'sales_erp_local_expenses',
  CUSTOMERS: 'sales_erp_local_customers',
  PRODUCTS: 'sales_erp_local_products',
  CATEGORIES: 'sales_erp_local_categories',
  INVENTORY: 'sales_erp_local_inventory',
  TRANSACTIONS: 'sales_erp_local_transactions',
  VISITS: 'sales_erp_local_visits',
  TARGETS: 'sales_erp_local_targets',
  ROUTE_PLAN: 'sales_erp_local_route_plan',
  ROUTE_VISITS: 'sales_erp_local_route_plan',
  DISMISSED_NOTIFICATIONS: 'sales_erp_local_dismissed_notifications',
  DELETED_ORDERS: 'sales_erp_local_deleted_orders',
  DELETED_PRODUCTS: 'sales_erp_local_deleted_products',
  DELETED_NOTIFICATIONS: 'sales_erp_local_deleted_notifications',
  DELETED_COLLECTIONS: 'sales_erp_local_deleted_collections',
  DELETED_EXPENSES: 'sales_erp_local_deleted_expenses',
  DELETED_TARGETS: 'sales_erp_local_deleted_targets',
  DELETED_CUSTOMERS: 'sales_erp_local_deleted_customers',
  DELETED_VISITS: 'sales_erp_local_deleted_visits',
  AREAS: 'sales_erp_local_areas',
  DELETED_AREAS: 'sales_erp_local_deleted_areas',
  SUPPLIERS: 'sales_erp_local_suppliers',
  PURCHASE_INVOICES: 'sales_erp_local_purchase_invoices',
  SUPPLIER_PAYMENTS: 'sales_erp_local_supplier_payments',
  PROCUREMENT_AUDIT_LOGS: 'sales_erp_procurement_audit_logs',
  HANDOVERS: 'sales_erp_local_handovers',
  USERS: 'sales_erp_local_users',
  DELETED_USERS: 'sales_erp_local_deleted_users',
  AUTH_CREDENTIALS: 'sales_erp_auth_credentials',
} as const;

export const CACHE_SYNC_VERSION = "hamko-cloud-sync-v4";
const CACHE_SYNC_META_KEY = "sales_erp_cloud_cache_meta_v4";
const CROSS_TAB_CHANNEL_NAME = "hamko_erp_cross_tab_sync";

/**
 * Determines whether a local record represents a genuinely unsynced offline/optimistic mutation.
 * Already-synced cloud UUID records return `false` so records deleted on another device
 * are cleanly evicted instead of resurrected from stale localStorage caches.
 */
export function isPendingOfflineRecord(record: any): boolean {
  if (!record || typeof record !== "object") return false;
  if (record._syncStripped === true) return false;
  if (record.is_offline === false && record._unsynced === false && !record._localPendingUntil) {
    return false;
  }
  if (record.is_offline === true || record._unsynced === true) return true;
  if (typeof record._localPendingUntil === "number" && record._localPendingUntil > Date.now()) {
    return true;
  }
  const rawId = String(record.id || "").trim();
  if (!rawId) return false;
  if (/^(?:ord|col|cust|visit|temp|prod|exp|cat|inv)-/i.test(rawId)) {
    return true;
  }
  return false;
}

/**
 * Extracts a numeric epoch millisecond timestamp from any record's timestamp candidates.
 */
export function parseRecordTimestamp(record: any): number {
  if (!record || typeof record !== "object") return 0;
  const candidates = [
    record.updated_at,
    record.updatedAt,
    record._queuedAt,
    record._modifiedAt,
    record.created_at,
    record.createdAt,
    record.order_date,
    record.collection_date,
    record.expense_date,
    record.visit_date,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && !isNaN(c) && c > 0) return c;
    if (typeof c === "string" && c.trim()) {
      const parsed = Date.parse(c);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

/**
 * Server-Authoritative / Last-Modified-Wins conflict resolver.
 * 1. If the local record is NOT a pending offline mutation, remote is always authoritative.
 * 2. If the local record IS a pending offline mutation:
 *    - If remote has a strictly newer timestamp, remote overrides the stale local change.
 *    - Otherwise, local pending mutation is retained until offlineSync completes.
 */
export function isRemoteAuthoritative(remoteRecord: any, localRecord: any): boolean {
  if (!localRecord) return true;
  if (!remoteRecord) return false;
  if (!isPendingOfflineRecord(localRecord)) return true;

  const remoteTs = parseRecordTimestamp(remoteRecord);
  const localTs = parseRecordTimestamp(localRecord);

  if (remoteTs > 0 && localTs > 0 && remoteTs > localTs) {
    return true;
  }
  return false;
}

/**
 * Purges stale cloud-mirror arrays and outdated tombstones when upgrading cache schema
 * or switching Supabase project URLs, while strictly preserving unsynced offline field entries.
 */
export function ensureCrossPlatformCacheConsistency(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const rawMeta = window.localStorage.getItem(CACHE_SYNC_META_KEY);
    if (rawMeta) {
      try {
        const parsedMeta = JSON.parse(rawMeta);
        if (parsedMeta?.version === CACHE_SYNC_VERSION && parsedMeta?.projectUrl === SUPABASE_URL) {
          return false;
        }
      } catch {
        // Malformed metadata — proceed with cache normalization
      }
    }

    const mirroredCollectionKeys = [
      STORAGE_KEYS.ORDERS,
      STORAGE_KEYS.COLLECTIONS,
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.VISITS,
    ];

    for (const key of mirroredCollectionKeys) {
      const existing = getItemWithTTL<any[]>(key, []);
      if (Array.isArray(existing) && existing.length > 0) {
        const pendingOnly = existing.filter((item) => isPendingOfflineRecord(item));
        if (pendingOnly.length > 0) {
          setItemWithTTL(key, pendingOnly, null);
        } else {
          removeItem(key);
        }
      }
    }

    const staleTombstoneKeys = [
      STORAGE_KEYS.DELETED_ORDERS,
      STORAGE_KEYS.DELETED_PRODUCTS,
      STORAGE_KEYS.DELETED_COLLECTIONS,
      STORAGE_KEYS.DELETED_EXPENSES,
      STORAGE_KEYS.DELETED_CUSTOMERS,
      STORAGE_KEYS.DELETED_VISITS,
    ];
    for (const delKey of staleTombstoneKeys) {
      removeItem(delKey);
    }

    window.localStorage.setItem(
      CACHE_SYNC_META_KEY,
      JSON.stringify({
        version: CACHE_SYNC_VERSION,
        projectUrl: SUPABASE_URL,
        invalidatedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch (err) {
    console.warn("[LocalStore] Cross-platform cache consistency check warning:", err);
    return false;
  }
}

let crossTabChannel: BroadcastChannel | null = null;
let isDispatchingStorageEvent = false;

function initCrossTabChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (crossTabChannel) return crossTabChannel;
  try {
    crossTabChannel = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
    crossTabChannel.onmessage = (event) => {
      if (isDispatchingStorageEvent) return;
      const payload = event?.data;
      if (!payload || typeof payload !== "object") return;
      isDispatchingStorageEvent = true;
      try {
        window.dispatchEvent(
          new CustomEvent("sales_erp_storage_update", {
            detail: payload.detail || { key: payload.key, fromBroadcast: true },
          }),
        );
      } catch {
        // ignore
      } finally {
        isDispatchingStorageEvent = false;
      }
    };
  } catch {
    crossTabChannel = null;
  }
  return crossTabChannel;
}

// Run cache consistency check and attach cross-tab channel once on client startup
if (typeof window !== "undefined") {
  ensureCrossPlatformCacheConsistency();
  initCrossTabChannel();
}

export function broadcastCrossTabSync(payload: { key?: string; detail?: any }): void {
  const ch = initCrossTabChannel();
  if (!ch) return;
  try {
    ch.postMessage({ ...payload, ts: Date.now() });
  } catch {
    // ignore closed/unsupported channel errors
  }
}

export function getLocalData<T = any>(key: string, defaultValue?: T): T {
  const fallback = (defaultValue !== undefined ? defaultValue : ([] as unknown)) as T;
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const parsed = getItemWithTTL<T>(key, fallback);
    if (key === STORAGE_KEYS.COLLECTIONS && Array.isArray(parsed)) {
      return deduplicateCollections(parsed as any) as unknown as T;
    }
    // CRIT-001: Sanitize users data so no passwords ever leak through local storage retrieval
    if (key === STORAGE_KEYS.USERS && Array.isArray(parsed)) {
      return parsed.map((u: any) => {
        if (u && typeof u === "object" && "password" in u) {
          const { password, ...rest } = u;
          return rest;
        }
        return u;
      }) as unknown as T;
    }
    return parsed;
  } catch (e) {
    console.warn(`Error reading localStorage key ${key}:`, e);
    return fallback;
  }
}

export function setLocalData<T = any>(key: string, value: T, ttlMs?: number | null, silent = false): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    let sanitizedValue = value;
    // CRIT-001: Strip sensitive password properties from users array before storage
    if (key === STORAGE_KEYS.USERS && Array.isArray(value)) {
      sanitizedValue = value.map((u: any) => {
        if (u && typeof u === "object" && "password" in u) {
          const { password, ...rest } = u;
          return rest;
        }
        return u;
      }) as unknown as T;
    }
    setItemWithTTL(key, sanitizedValue, ttlMs);
    if (!silent && !isDispatchingStorageEvent) {
      isDispatchingStorageEvent = true;
      try {
        window.dispatchEvent(new CustomEvent('sales_erp_storage_update', { detail: { key } }));
        broadcastCrossTabSync({ key, detail: { key } });
        broadcastCrossDeviceRealtimeMutation({ type: key });
      } catch {
        // ignore
      } finally {
        isDispatchingStorageEvent = false;
      }
    }
  } catch (e) {
    console.warn(`Error saving to localStorage key ${key}:`, e);
  }
}

export const getDeletedIds = (key: string): Set<string> => {
  try {
    if (typeof window === "undefined") return new Set<string>();
    const parsed = getItemWithTTL<string[]>(key, []);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

export const saveDeletedId = (key: string, id: string): void => {
  try {
    if (typeof window === "undefined") return;
    const set = getDeletedIds(key);
    set.add(id);
    const arr = Array.from(set);
    // Keep tombstones bounded to max 200 items to prevent unbounded storage bloat
    const bounded = arr.length > 200 ? arr.slice(arr.length - 200) : arr;
    setItemWithTTL(key, bounded, TTL.LONG);
  } catch {}
};

export const removeDeletedId = (key: string, id: string): void => {
  try {
    if (typeof window === "undefined") return;
    const set = getDeletedIds(key);
    set.delete(id);
    const arr = Array.from(set);
    setItemWithTTL(key, arr, TTL.LONG);
  } catch {}
};

/**
 * Deduplicates collection records strictly by:
 * 1. Filtering out deleted IDs from STORAGE_KEYS.DELETED_COLLECTIONS
 * 2. Deduplicating by ID and Collection Number (e.g., COL-29412173)
 * If both a temporary client ID and a Supabase UUID exist with the same collection_number,
 * the record is merged preserving the permanent Supabase ID and richer fields.
 */
export function deduplicateCollections<T extends { id?: string; collection_number?: string; amount?: number; customer?: any }>(
  collections: T[]
): T[] {
  if (!Array.isArray(collections)) return [];
  const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const idMap = new Map<string, T>();
  const colNumMap = new Map<string, T>();

  for (const col of collections) {
    if (!col) continue;
    const colId = col.id ? String(col.id).trim() : "";
    if (colId && deletedIds.has(colId)) continue;

    const colNum = col.collection_number ? String(col.collection_number).trim().toUpperCase() : "";

    const existingByNum = colNum ? colNumMap.get(colNum) : undefined;
    const existingById = colId ? idMap.get(colId) : undefined;
    const existing = existingByNum || existingById;

    if (existing) {
      const isNewRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(colId);
      const isExistingTemp = existing.id && (String(existing.id).startsWith("col-") || String(existing.id).startsWith("temp-"));
      if ((isNewRealUuid && isExistingTemp) || (!existing.customer && col.customer)) {
        Object.assign(existing, col);
      }
      continue;
    }

    if (colId) idMap.set(colId, col);
    if (colNum) colNumMap.set(colNum, col);
  }

  const seen = new Set<T>();
  const result: T[] = [];
  for (const col of collections) {
    if (!col) continue;
    const colNum = col.collection_number ? String(col.collection_number).trim().toUpperCase() : "";
    const colId = col.id ? String(col.id).trim() : "";
    const item = (colNum && colNumMap.get(colNum)) || (colId && idMap.get(colId));
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Optimistically appends a new item to state and persists to localStorage.
 */
export function optimisticAdd<T extends { id?: string }>(
  prevList: T[],
  newItem: T,
  storageKey: string
): T[] {
  let updated = [newItem, ...prevList];
  if (storageKey === STORAGE_KEYS.COLLECTIONS) {
    updated = deduplicateCollections(updated as any) as unknown as T[];
  }
  setLocalData(storageKey, updated);
  return updated;
}

/**
 * Optimistically updates an existing item in state and persists to localStorage.
 */
export function optimisticUpdate<T extends { id: string }>(
  prevList: T[],
  id: string,
  changes: Partial<T>,
  storageKey: string
): T[] {
  const updated = prevList.map((item) =>
    item.id === id ? { ...item, ...changes, updated_at: new Date().toISOString() } : item
  );
  setLocalData(storageKey, updated);
  return updated;
}

/**
 * Optimistically removes an item by ID from state and persists to localStorage.
 */
export function optimisticDelete<T extends { id: string }>(
  prevList: T[],
  id: string,
  storageKey: string
): T[] {
  const updated = prevList.filter((item) => item.id !== id);
  setLocalData(storageKey, updated);
  return updated;
}

/**
 * Adjusts product's stock_quantity and stock by delta (positive increases stock, negative decreases stock)
 */
export function adjustProductStock(
  productId: string,
  deltaQty: number,
  warehouseName?: string
): void {
  const products = getLocalData<any>(STORAGE_KEYS.PRODUCTS, []);
  let updatedStock = 0;
  const now = new Date().toISOString();

  const updated = products.map((p: any) => {
    if (String(p.id) !== String(productId)) return p;
    const currentStock = Math.max(0, Math.round(Number(p.stock_quantity ?? p.stock ?? 0)));
    const newStock = Math.max(0, Math.round(currentStock + deltaQty));
    updatedStock = newStock;
    return {
      ...p,
      stock_quantity: newStock,
      stock: newStock,
      updated_at: now,
    };
  });
  setLocalData(STORAGE_KEYS.PRODUCTS, updated);

  // Sync warehouse inventory tracking if present
  try {
    const wh = warehouseName || "Main Warehouse";
    const inventoryList = getLocalData<any>(STORAGE_KEYS.INVENTORY, []);
    const invIdx = inventoryList.findIndex(
      (inv: any) =>
        String(inv.product_id) === String(productId) &&
        (inv.warehouse === wh || inv.warehouse === "Main" || !inv.warehouse)
    );
    if (invIdx >= 0) {
      const curInvQty = Number(inventoryList[invIdx].quantity) || 0;
      inventoryList[invIdx] = {
        ...inventoryList[invIdx],
        quantity: Math.max(0, Math.round(curInvQty + deltaQty)),
        updated_at: now,
      };
    } else {
      inventoryList.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: productId,
        warehouse: wh,
        quantity: updatedStock,
        updated_at: now,
      });
    }
    setLocalData(STORAGE_KEYS.INVENTORY, inventoryList);

    // Sync remote Supabase products table & inventory table
    supabase
      .from("products")
      .update({ stock_quantity: updatedStock })
      .eq("id", productId)
      .then(undefined, (err) => console.warn("Supabase product stock sync notice:", err));

    supabase
      .from("inventory")
      .upsert(
        {
          product_id: productId,
          warehouse: wh === "Main Warehouse" ? "Main" : wh,
          quantity: updatedStock,
        },
        { onConflict: "product_id,warehouse" }
      )
      .then(undefined, (err) => console.warn("Supabase inventory sync notice:", err));
  } catch (e) {
    console.warn("Stock sync notice:", e);
  }
}

/**
 * Permanently deletes a Customer from localStorage and Supabase.
 * Checks for linked records and handles FK constraints gracefully.
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  const orders = getLocalData<any>(STORAGE_KEYS.ORDERS, []);
  const collections = getLocalData<any>(STORAGE_KEYS.COLLECTIONS, []);
  const hasOrders = orders.some((o: any) => String(o?.customer_id) === String(id) || String(o?.customer?.id) === String(id));
  const hasCollections = collections.some((c: any) => String(c?.customer_id) === String(id) || String(c?.customer?.id) === String(id));

  if (hasOrders || hasCollections) {
    return {
      success: false,
      error: "Cannot delete customer with existing orders or financial history. Mark as Inactive instead.",
    };
  }

  const prevCustomers = getLocalData<any>(STORAGE_KEYS.CUSTOMERS, []);
  const updated = prevCustomers.filter((c: any) => c.id !== id);
  setLocalData(STORAGE_KEYS.CUSTOMERS, updated);

  saveDeletedId(STORAGE_KEYS.DELETED_CUSTOMERS, id);

  try {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("deleteCustomer failed, reverting local storage:", err);
    setLocalData(STORAGE_KEYS.CUSTOMERS, prevCustomers);
    try {
      const set = getDeletedIds(STORAGE_KEYS.DELETED_CUSTOMERS);
      set.delete(id);
      setItemWithTTL(STORAGE_KEYS.DELETED_CUSTOMERS, Array.from(set), TTL.LONG);
    } catch {}

    const isFkError =
      err?.code === "23503" ||
      (err?.message &&
        (err.message.includes("foreign key") ||
          err.message.includes("violates") ||
          err.message.includes("23503") ||
          err.message.includes("orders") ||
          err.message.includes("collections")));

    const message = isFkError
      ? "Cannot delete customer with existing orders or financial history. Mark as Inactive instead."
      : (err.message || "Failed to delete customer");

    return { success: false, error: message };
  }
}

/**
 * Internal order deletion helper handling cascades, unlinking, and stock adjustments.
 */
function internalDeleteOrder(id: string, currentItems?: any[]): any[] & { success: boolean; error?: string } {
  const prevOrders = getLocalData<any>(STORAGE_KEYS.ORDERS, []);
  const source = currentItems && currentItems.length > 0 ? currentItems : (prevOrders.length > 0 ? prevOrders : []);
  const targetOrder = prevOrders.find((o: any) => String(o.id) === String(id)) || source.find((o: any) => String(o.id) === String(id));

  const isCancelled = targetOrder?.status === "Cancelled";
  const orderNumber = targetOrder?.order_number || id;
  const paidAmount = Number(targetOrder?.paid_amount ?? targetOrder?.paidAmount ?? 0);
  const collections = getLocalData<any>(STORAGE_KEYS.COLLECTIONS, []);
  const hasLinkedCollection = collections.some(
    (c: any) =>
      String(c.order_id) === String(id) ||
      (targetOrder?.order_number && String(c.reference) === String(targetOrder.order_number))
  );

  if (!isCancelled && (paidAmount > 0 || hasLinkedCollection)) {
    const errorMsg = `Cannot delete order ${orderNumber} because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.`;
    const res: any = [...source];
    res.success = false;
    res.error = errorMsg;
    return res;
  }

  if (isCancelled && hasLinkedCollection) {
    const updatedCollections = collections.map((c: any) => {
      const isMatch =
        String(c.order_id) === String(id) ||
        (targetOrder?.order_number && String(c.reference) === String(targetOrder.order_number));
      if (isMatch) {
        const existingNote = c.notes && String(c.notes).trim() ? String(c.notes).trim() : "";
        const advanceNote = `Advance Credit from cancelled order ${orderNumber}`;
        const newNote = existingNote
          ? (existingNote.includes("Advance Credit") ? existingNote : `${existingNote} · ${advanceNote}`)
          : advanceNote;
        return {
          ...c,
          order_id: null,
          orderId: null,
          reference: c.reference === targetOrder?.order_number ? null : c.reference,
          notes: newNote,
          updated_at: new Date().toISOString(),
        };
      }
      return c;
    });
    setLocalData(STORAGE_KEYS.COLLECTIONS, updatedCollections);

    supabase
      .from("collections")
      .update({ order_id: null })
      .eq("order_id", id)
      .then(undefined, (err) => console.warn("Unlink collections notice:", err));
  }

  const updatedOrders = source.filter((o: any) => String(o.id) !== String(id));
  setLocalData(STORAGE_KEYS.ORDERS, updatedOrders);
  saveDeletedId(STORAGE_KEYS.DELETED_ORDERS, id);

  if (targetOrder && targetOrder.status === "Delivered") {
    if (targetOrder.customer_id && Number(targetOrder.due_amount || 0) > 0) {
      const dueToRevert = Number(targetOrder.due_amount || 0);
      adjustCustomerDue(targetOrder.customer_id, -dueToRevert);
      supabase
        .from("customers")
        .select("current_due")
        .eq("id", targetOrder.customer_id)
        .single()
        .then(({ data }) => {
          if (data) {
            const newDue = Math.max(0, r2(Number(data.current_due || 0) - dueToRevert));
            const newStatus = newDue <= 0 ? "Clear" : "Partial";
            supabase
              .from("customers")
              .update({ current_due: newDue, due_status: newStatus })
              .eq("id", targetOrder.customer_id)
              .then(undefined, (err) => console.warn("Customer due revert notice:", err));
          }
        });
    }

    const orderItems = targetOrder.order_items || [];
    if (targetOrder.status === "Delivered" && orderItems.length > 0) {
      orderItems.forEach((it: any) => {
        if (it.product_id && Number(it.quantity || 0) > 0) {
          const qty = Number(it.quantity);
          adjustProductStock(it.product_id, qty);
        }
      });

      const reverseTx = orderItems.map((it: any, idx: number) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `tx-del-${Date.now()}-${idx}`,
        product_id: it.product_id,
        transaction_type: "Stock In",
        quantity: Number(it.quantity) || 1,
        from_warehouse: "Main",
        to_warehouse: "Main",
        reference: targetOrder.order_number || `Order-${id}`,
        notes: `Order ${targetOrder.order_number || id} deleted (stock restored)`,
        transaction_date: new Date().toISOString(),
      }));

      const existingTx = getLocalData<any>(STORAGE_KEYS.TRANSACTIONS, []);
      setLocalData(STORAGE_KEYS.TRANSACTIONS, [...reverseTx, ...existingTx]);

      const dbTxPayload = reverseTx.map((tx: any) => ({
        product_id: tx.product_id,
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        from_warehouse: tx.from_warehouse,
        to_warehouse: tx.to_warehouse,
        reference: tx.reference,
        notes: tx.notes,
        transaction_date: tx.transaction_date,
      }));
      supabase
        .from("stock_transactions")
        .insert(dbTxPayload)
        .then(undefined, (err) => console.warn("Reverse stock tx insert notice:", err));
    }
  }

  supabase
    .from("collections")
    .update({ order_id: null })
    .eq("order_id", id)
    .then(undefined, (err) => console.warn("Unlink collections notice:", err));

  supabase
    .from("order_items")
    .delete()
    .eq("order_id", id)
    .then(undefined, (err) => console.warn("Delete order items notice:", err));

  supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .then(undefined, (err) => console.warn("Delete order notice:", err));

  (updatedOrders as any).success = true;
  return updatedOrders as any;
}

export const DEFAULT_AREA_NAMES: string[] = [
  "Mathbaria",
  "Bhandaria",
  "Pirojpur Sadar",
  "Kawkhali",
  "Nazirpur",
  "Nesarabad (Swarupkathi)",
  "Zianagar (Indurkani)",
  "Barishal Sadar",
  "Bakerganj",
  "Babuganj",
  "Wazirpur",
  "Banaripara",
  "Gournadi",
  "Agailjhara",
  "Mehendiganj",
  "Muladi",
  "Hizla",
  "Jhalokathi Sadar",
  "Nalchity",
  "Rajapur",
  "Kathalia",
  "Patuakhali Sadar",
  "Galachipa",
  "Bauphal",
  "Dumki",
  "Mirzaganj",
  "Kalapara",
  "Barguna Sadar",
  "Amtali",
  "Patharghata",
  "Betagi",
  "Bamna",
  "Taltali",
  "Dhaka Central",
  "Chattogram",
];

export function deriveCodePrefix(name: string): string {
  if (!name || !name.trim()) return "GEN";
  const clean = name.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (clean.length >= 3 ? clean.slice(0, 3) : clean.padEnd(3, "X")).toUpperCase().slice(0, 3);
}

/**
 * Retrieves the live dynamic list of areas from local storage.
 * If unseeded, populates defaults and harvests any existing custom customer areas.
 */
export function getAreas(): Area[] {
  try {
    const rawList = getLocalData<Area[]>(STORAGE_KEYS.AREAS, []);
    let list: Area[] = Array.isArray(rawList) ? rawList : [];

    // Seed defaults if empty
    if (list.length === 0) {
      const initial: Area[] = DEFAULT_AREA_NAMES.map((name, idx) => ({
        id: `area-init-${idx + 1}`,
        name,
        code_prefix: deriveCodePrefix(name),
        created_at: new Date().toISOString(),
      }));

      // Harvest any unique areas already present in existing customers
      const existingCustomers = getCustomers();
      existingCustomers.forEach((c) => {
        const cArea = (c.area || c.city || "").trim();
        if (cArea && !initial.some((a) => a.name.toLowerCase() === cArea.toLowerCase())) {
          initial.push({
            id: `area-cust-${initial.length + 1}`,
            name: cArea,
            code_prefix: deriveCodePrefix(cArea),
            created_at: new Date().toISOString(),
          });
        }
      });

      list = initial;
      if (typeof window !== "undefined") {
        setLocalData(STORAGE_KEYS.AREAS, list);
      }
    }

    const deletedAreaIds = getDeletedIds(STORAGE_KEYS.DELETED_AREAS);
    return list
      .filter((a) => Boolean(a && a.id && a.name) && !deletedAreaIds.has(String(a.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.warn("Error getting areas:", e);
    return [];
  }
}

/**
 * Adds a new area to the centralized store with a unique name and auto-derived code prefix.
 */
export function addArea(
  name: string,
  codePrefix?: string
): { success: boolean; error?: string; area?: Area; areas: Area[] } {
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    return { success: false, error: "Area name cannot be empty", areas: getAreas() };
  }

  const currentAreas = getAreas();
  const duplicate = currentAreas.find(
    (a) => a.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: `Area "${trimmedName}" already exists`, areas: currentAreas };
  }

  const prefix = (codePrefix?.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() || deriveCodePrefix(trimmedName)).slice(0, 3);
  const newArea: Area = {
    id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: trimmedName,
    code_prefix: prefix,
    created_at: new Date().toISOString(),
  };

  const updated = [...currentAreas, newArea].sort((a, b) => a.name.localeCompare(b.name));
  setLocalData(STORAGE_KEYS.AREAS, updated);

  // Persist to Supabase in background
  supabase
    .from("territories")
    .insert({
      name: newArea.name,
      code: newArea.code_prefix,
    })
    .then(undefined, (err) => {
      console.warn("Supabase territories insert notice:", err);
    });

  return { success: true, area: newArea, areas: updated };
}

/**
 * Updates an existing Area name and code prefix.
 * Cascades the new name across all linked customer, order, and route records.
 */
export function updateArea(
  id: string,
  newName: string,
  newCodePrefix?: string
): { success: boolean; error?: string; area?: Area; areas: Area[] } {
  const trimmedName = (newName || "").trim();
  if (!trimmedName) {
    return { success: false, error: "Area name cannot be empty", areas: getAreas() };
  }

  const currentAreas = getAreas();
  const existing = currentAreas.find((a) => a.id === id);
  if (!existing) {
    return { success: false, error: "Area not found", areas: currentAreas };
  }

  const duplicate = currentAreas.find(
    (a) => a.id !== id && a.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: `Another area with the name "${trimmedName}" already exists`,
      areas: currentAreas,
    };
  }

  const oldName = existing.name;
  const prefix = (newCodePrefix?.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() || existing.code_prefix || deriveCodePrefix(trimmedName)).slice(0, 3);
  const updatedArea: Area = {
    ...existing,
    name: trimmedName,
    code_prefix: prefix,
    updated_at: new Date().toISOString(),
  };

  const updatedList = currentAreas
    .map((a) => (a.id === id ? updatedArea : a))
    .sort((a, b) => a.name.localeCompare(b.name));

  setLocalData(STORAGE_KEYS.AREAS, updatedList);

  // Cascade update to linked customers, orders, and routes if name changed
  if (oldName.toLowerCase() !== trimmedName.toLowerCase()) {
    try {
      const customers = getCustomers();
      let customerChanged = false;
      const updatedCustomers = customers.map((c) => {
        const isMatch =
          (c.area && c.area.trim().toLowerCase() === oldName.trim().toLowerCase()) ||
          (c.city && c.city.trim().toLowerCase() === oldName.trim().toLowerCase());
        if (isMatch) {
          customerChanged = true;
          return {
            ...c,
            area: trimmedName,
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      });

      if (customerChanged) {
        setLocalData(STORAGE_KEYS.CUSTOMERS, updatedCustomers);
        supabase.from("customers").update({ city: trimmedName }).eq("city", oldName).then(undefined, () => {});
      }

      // Cascade update to orders in local storage
      const orders = getOrders();
      let orderChanged = false;
      const updatedOrders = orders.map((o: any) => {
        if (
          o.customer &&
          ((o.customer.area && o.customer.area.trim().toLowerCase() === oldName.trim().toLowerCase()) ||
            (o.customer.city && o.customer.city.trim().toLowerCase() === oldName.trim().toLowerCase()))
        ) {
          orderChanged = true;
          return {
            ...o,
            customer: {
              ...o.customer,
              area: trimmedName,
            },
          };
        }
        return o;
      });

      if (orderChanged) {
        setLocalData(STORAGE_KEYS.ORDERS, updatedOrders);
      }

      // Cascade update to routes
      const routes = getLocalData<any>(STORAGE_KEYS.ROUTE_PLAN, []);
      let routeChanged = false;
      const updatedRoutes = routes.map((r: any) => {
        if (
          (r.territory && r.territory.trim().toLowerCase() === oldName.trim().toLowerCase()) ||
          (r.city && r.city.trim().toLowerCase() === oldName.trim().toLowerCase())
        ) {
          routeChanged = true;
          return { ...r, territory: trimmedName };
        }
        return r;
      });
      if (routeChanged) {
        setLocalData(STORAGE_KEYS.ROUTE_PLAN, updatedRoutes);
      }
    } catch (err) {
      console.warn("Cascade area update notice:", err);
    }
  }

  // Supabase territory update
  supabase.from("territories").update({ name: trimmedName, code: prefix }).eq("id", id).then(undefined, () => {});

  if (typeof window !== "undefined") {
    setTimeout(() => {
      window.dispatchEvent(new Event("sales_erp_storage_update"));
    }, 0);
  }

  return { success: true, area: updatedArea, areas: updatedList };
}

/**
 * Deletes an area from the store.
 * Prevents deletion if any active customer is currently assigned to this area.
 */
export function deleteArea(id: string): { success: boolean; error?: string; areas: Area[] } {
  const currentAreas = getAreas();
  const existing = currentAreas.find((a) => a.id === id);
  if (!existing) {
    return { success: false, error: "Area not found", areas: currentAreas };
  }

  // Validate dependencies: active customers assigned
  const customers = getCustomers();
  const linkedCustomers = customers.filter(
    (c) =>
      (c.area && c.area.trim().toLowerCase() === existing.name.trim().toLowerCase()) ||
      (c.city && c.city.trim().toLowerCase() === existing.name.trim().toLowerCase())
  );

  if (linkedCustomers.length > 0) {
    return {
      success: false,
      error: `Cannot delete area "${existing.name}": Assigned to ${linkedCustomers.length} active customer(s). Please reassign them to another area first.`,
      areas: currentAreas,
    };
  }

  const remaining = currentAreas.filter((a) => a.id !== id);
  setLocalData(STORAGE_KEYS.AREAS, remaining);
  saveDeletedId(STORAGE_KEYS.DELETED_AREAS, id);

  supabase.from("territories").delete().eq("id", id).then(undefined, () => {});

  return { success: true, areas: remaining };
}

/**
 * Returns the count of customers currently linked to an area.
 */
export function getAreaCustomerCount(areaName: string): number {
  if (!areaName) return 0;
  const target = areaName.trim().toLowerCase();
  const customers = getCustomers();
  return customers.filter(
    (c) =>
      (c.area && c.area.trim().toLowerCase() === target) ||
      (c.city && c.city.trim().toLowerCase() === target)
  ).length;
}

/**
 * Generates the next sequential Party Code for a given Area or Prefix.
 * Format: strictly `${prefix}-${String(nextNumber).padStart(4, '0')}` (e.g., SDR-0001, SDR-0123).
 * Counts existing customers/outlets in that area and examines existing party codes to find the next sequential number.
 */
export function generatePartyCode(
  areaNameOrPrefix: string,
  existingCustomers?: Customer[],
  excludeCustomerId?: string
): string {
  if (!areaNameOrPrefix || !areaNameOrPrefix.trim()) return "";
  const cleanInput = areaNameOrPrefix.trim();
  const areas = getAreas();

  // Determine prefix: match Area name or code_prefix directly
  const matched = areas.find(
    (a) =>
      a.name.toLowerCase() === cleanInput.toLowerCase() ||
      (a.code_prefix && a.code_prefix.toLowerCase() === cleanInput.toLowerCase())
  );

  const prefix = (
    matched?.code_prefix?.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() ||
    cleanInput.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3) ||
    "GEN"
  ).toUpperCase().slice(0, 3);

  const customersList =
    existingCustomers && existingCustomers.length > 0 ? existingCustomers : getCustomers();

  // Pattern to match existing code formats for this prefix: SDR-0001, SDR-0123, or SDR0001
  const regex = new RegExp(`^${prefix}-?(\\d+)$`, "i");
  let maxNum = 0;
  let matchingCount = 0;

  for (const c of customersList) {
    if (excludeCustomerId && c.id === excludeCustomerId) continue;

    const code = (c.party_code || "").trim().toUpperCase();
    const isSameArea =
      (matched && c.area && c.area.trim().toLowerCase() === matched.name.toLowerCase()) ||
      (matched && c.city && c.city.trim().toLowerCase() === matched.name.toLowerCase()) ||
      (c.area && c.area.trim().toLowerCase() === cleanInput.toLowerCase());

    if (isSameArea) {
      matchingCount++;
    }

    const match = code.match(regex);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  // Next sequential number: at least maxNum + 1, or matchingCount + 1 if un-coded records exist, min 1
  const nextNum = Math.max(maxNum + 1, matchingCount + 1, 1);
  return `${prefix}-${String(nextNum).padStart(4, "0")}`;
}

// ==========================================
// GUARANTEED UNIQUE REFERENCE ID GENERATION
// ==========================================

export type ReferenceEntityType = "order" | "collection" | "voucher" | "invoice" | "debit_note";

export interface ReferenceIdOptions {
  prefix?: string;
  padLength?: number;
  useDatePrefix?: boolean; // e.g. YYYYMMDD -> ORD-20261002-0001
  useYearPrefix?: boolean; // e.g. YYYY -> CH-2026-0001
  existingList?: any[];
}

/**
 * In-memory set of reserved reference IDs to prevent collisions in high-frequency
 * consecutive synchronous generations before state or localStorage persistence flushes.
 */
const reservedReferenceIds = new Set<string>();

/**
 * Helper to clear session-reserved reference IDs (useful in testing/resets)
 */
export function clearReservedReferenceIds(): void {
  reservedReferenceIds.clear();
}

/**
 * Guaranteed unique, collision-free Reference ID generator for Orders, Collections,
 * Supplier Payment Vouchers, Purchase Invoices, and Debit Notes.
 * 
 * Algorithm:
 * 1. Checks existing records across active memory state, local storage, and deleted item sets.
 * 2. Scans for existing sequence numbers matching the prefix format and extracts maxSeq.
 * 3. Builds next candidate reference ID (e.g. ORD-0001, COL-0001, PAY-0001, CH-YYYY-0001).
 * 4. Guards with a collision detection loop checking all existing and session-reserved IDs.
 * 5. Immediately reserves candidate in memory to guarantee zero collisions even across rapid consecutive calls.
 */
export function generateReferenceId(
  type: ReferenceEntityType | string,
  options?: ReferenceIdOptions
): string {
  const existingSet = new Set<string>();
  const normalizedType = String(type).toLowerCase();

  // Determine entity-specific defaults
  let defaultPrefix = "REF";
  let defaultPadLength = 4;
  let defaultUseDatePrefix = false;
  let defaultUseYearPrefix = false;

  if (normalizedType === "order") {
    defaultPrefix = "ORD";
    defaultPadLength = 4;
  } else if (normalizedType === "collection") {
    defaultPrefix = "COL";
    defaultPadLength = 4;
  } else if (normalizedType === "voucher") {
    defaultPrefix = "PAY";
    defaultPadLength = 4;
  } else if (normalizedType === "invoice") {
    defaultPrefix = "CH";
    defaultPadLength = 4;
    defaultUseYearPrefix = true;
  } else if (normalizedType === "debit_note") {
    defaultPrefix = "DN";
    defaultPadLength = 3;
    defaultUseYearPrefix = true;
  }

  const prefix = (options?.prefix || defaultPrefix).trim().toUpperCase();
  const padLength = Math.max(1, options?.padLength ?? defaultPadLength);
  const useDatePrefix = options?.useDatePrefix ?? defaultUseDatePrefix;
  const useYearPrefix = options?.useYearPrefix ?? defaultUseYearPrefix;

  // 1. Gather all existing IDs into existingSet
  if (normalizedType === "order") {
    const list = Array.isArray(options?.existingList) && options.existingList.length > 0
      ? options.existingList
      : getOrders();
    list.forEach((o: any) => {
      if (!o) return;
      if (o.order_number) existingSet.add(String(o.order_number).trim().toUpperCase());
      if (o.id) existingSet.add(String(o.id).trim().toUpperCase());
    });
    const rawOrders = getLocalData<any>(STORAGE_KEYS.ORDERS, []);
    rawOrders.forEach((o: any) => {
      if (o?.order_number) existingSet.add(String(o.order_number).trim().toUpperCase());
      if (o?.id) existingSet.add(String(o.id).trim().toUpperCase());
    });
    const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
    deletedOrderIds.forEach((id) => existingSet.add(String(id).trim().toUpperCase()));
  } else if (normalizedType === "collection") {
    const list = Array.isArray(options?.existingList) && options.existingList.length > 0
      ? options.existingList
      : getCollections();
    list.forEach((c: any) => {
      if (!c) return;
      if (c.collection_number) existingSet.add(String(c.collection_number).trim().toUpperCase());
      if (c.id) existingSet.add(String(c.id).trim().toUpperCase());
    });
    const rawCols = getLocalData<any>(STORAGE_KEYS.COLLECTIONS, []);
    rawCols.forEach((c: any) => {
      if (c?.collection_number) existingSet.add(String(c.collection_number).trim().toUpperCase());
      if (c?.id) existingSet.add(String(c.id).trim().toUpperCase());
    });
    const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
    deletedColIds.forEach((id) => existingSet.add(String(id).trim().toUpperCase()));
  } else if (normalizedType === "voucher" || normalizedType === "debit_note") {
    const list = Array.isArray(options?.existingList) && options.existingList.length > 0
      ? options.existingList
      : getSupplierPayments();
    list.forEach((p: any) => {
      if (!p) return;
      if (p.payment_number) existingSet.add(String(p.payment_number).trim().toUpperCase());
      if (p.reference_no) existingSet.add(String(p.reference_no).trim().toUpperCase());
      if (p.id) existingSet.add(String(p.id).trim().toUpperCase());
    });
    const rawPayments = getLocalData<any>(STORAGE_KEYS.SUPPLIER_PAYMENTS, []);
    rawPayments.forEach((p: any) => {
      if (p?.payment_number) existingSet.add(String(p.payment_number).trim().toUpperCase());
      if (p?.reference_no) existingSet.add(String(p.reference_no).trim().toUpperCase());
      if (p?.id) existingSet.add(String(p.id).trim().toUpperCase());
    });
  } else if (normalizedType === "invoice") {
    const list = Array.isArray(options?.existingList) && options.existingList.length > 0
      ? options.existingList
      : getPurchaseInvoices();
    list.forEach((i: any) => {
      if (!i) return;
      if (i.invoice_number) existingSet.add(String(i.invoice_number).trim().toUpperCase());
      if (i.id) existingSet.add(String(i.id).trim().toUpperCase());
    });
    const rawInvoices = getLocalData<any>(STORAGE_KEYS.PURCHASE_INVOICES, []);
    rawInvoices.forEach((i: any) => {
      if (i?.invoice_number) existingSet.add(String(i.invoice_number).trim().toUpperCase());
      if (i?.id) existingSet.add(String(i.id).trim().toUpperCase());
    });
  } else if (Array.isArray(options?.existingList)) {
    options.existingList.forEach((item: any) => {
      if (typeof item === "string") {
        existingSet.add(item.trim().toUpperCase());
      } else if (item && typeof item === "object") {
        Object.values(item).forEach((val) => {
          if (typeof val === "string") existingSet.add(val.trim().toUpperCase());
        });
      }
    });
  }

  // 2. Build prefix segment
  const now = new Date();
  const yearStr = String(now.getFullYear());
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const dayStr = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yearStr}${monthStr}${dayStr}`;

  let prefixSegment = prefix;
  if (useDatePrefix) {
    prefixSegment = `${prefix}-${dateStr}`;
  } else if (useYearPrefix) {
    prefixSegment = `${prefix}-${yearStr}`;
  }

  // 3. Scan existing records for maximum sequence number under this prefix segment
  const regex = new RegExp(`^${prefixSegment}-?0*([1-9]\\d*)$`, "i");
  let maxSeq = 0;

  existingSet.forEach((val) => {
    const match = val.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      // Ignore legacy timestamp-like numbers (>= 1,000,000) when running pure sequential mode
      // to prevent random legacy Date.now() fragments from inflating the sequence index
      if (!isNaN(num) && (useDatePrefix || useYearPrefix || num < 1000000)) {
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  // Also check session reserved IDs
  reservedReferenceIds.forEach((val) => {
    const match = val.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && (useDatePrefix || useYearPrefix || num < 1000000)) {
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  // 4. Guaranteed Collision-Free Assignment Loop
  let nextSeq = maxSeq + 1;
  let candidate = "";

  while (true) {
    const formattedSeq = String(nextSeq).padStart(padLength, "0");
    candidate = `${prefixSegment}-${formattedSeq}`;
    const upperCandidate = candidate.toUpperCase();

    if (!existingSet.has(upperCandidate) && !reservedReferenceIds.has(upperCandidate)) {
      reservedReferenceIds.add(upperCandidate);
      break;
    }
    nextSeq++;
  }

  return candidate;
}

export function generateOrderNumber(
  existingOrders?: Order[],
  options?: ReferenceIdOptions
): string {
  return generateReferenceId("order", {
    existingList: existingOrders,
    ...options,
  });
}

export function generateCollectionNumber(
  existingCollections?: Collection[],
  options?: ReferenceIdOptions
): string {
  return generateReferenceId("collection", {
    existingList: existingCollections,
    ...options,
  });
}

export function generateSupplierVoucherNumber(
  existingPayments?: SupplierPayment[],
  options?: ReferenceIdOptions
): string {
  return generateReferenceId("voucher", {
    existingList: existingPayments,
    ...options,
  });
}

export function generatePurchaseInvoiceNumber(
  existingInvoices?: PurchaseInvoice[],
  options?: ReferenceIdOptions
): string {
  return generateReferenceId("invoice", {
    existingList: existingInvoices,
    ...options,
  });
}

export function generateDebitNoteNumber(
  existingPayments?: SupplierPayment[],
  options?: ReferenceIdOptions
): string {
  return generateReferenceId("debit_note", {
    existingList: existingPayments,
    ...options,
  });
}


/**
 * Parses party_code, area, alt_phone metadata tags from customer notes string.
 */
export function parseCustomerNotes(rawNotes?: string | null): {
  party_code?: string;
  area?: string;
  alt_phone?: string;
  securityChequeNo?: string;
  securityBankName?: string;
  securityBranchName?: string;
  securityChequeDate?: string;
  securityNotes?: string;
  status?: "Active" | "Inactive";
  cleanNotes?: string;
} {
  if (!rawNotes || typeof rawNotes !== "string") {
    return { cleanNotes: rawNotes || "" };
  }
  let party_code: string | undefined;
  let area: string | undefined;
  let alt_phone: string | undefined;
  let securityChequeNo: string | undefined;
  let securityBankName: string | undefined;
  let securityBranchName: string | undefined;
  let securityChequeDate: string | undefined;
  let securityNotes: string | undefined;
  let status: "Active" | "Inactive" | undefined;

  const statusMatch = rawNotes.match(/\[STATUS:([^\]]+)\]/i);
  if (statusMatch) {
    const rawSt = statusMatch[1].trim().toLowerCase();
    if (rawSt === "inactive") status = "Inactive";
    else if (rawSt === "active") status = "Active";
  }

  const partyMatch = rawNotes.match(/\[(?:PARTY|party_code):([^\]]+)\]/i);
  if (partyMatch) party_code = partyMatch[1].trim();

  const areaMatch = rawNotes.match(/\[(?:AREA|area):([^\]]+)\]/i);
  if (areaMatch) area = areaMatch[1].trim();

  const altMatch = rawNotes.match(/\[(?:ALT|alt_phone):([^\]]+)\]/i);
  if (altMatch) alt_phone = altMatch[1].trim();

  const secChequeMatch = rawNotes.match(/\[SEC_CHEQUE:([^\]]+)\]/i);
  if (secChequeMatch) securityChequeNo = secChequeMatch[1].trim();

  const secBankMatch = rawNotes.match(/\[SEC_BANK:([^\]]+)\]/i);
  if (secBankMatch) securityBankName = secBankMatch[1].trim();

  const legacySecCombined = rawNotes.match(/\[security_cheque:([^\]]+)\]/i);
  if (legacySecCombined) {
    const [chkPart, bnkPart] = legacySecCombined[1].split("|");
    if (!securityChequeNo && chkPart?.trim()) securityChequeNo = chkPart.trim();
    if (!securityBankName && bnkPart?.trim()) securityBankName = bnkPart.trim();
  }

  const secBranchMatch = rawNotes.match(/\[SEC_BRANCH:([^\]]+)\]/i);
  if (secBranchMatch) securityBranchName = secBranchMatch[1].trim();

  const secDateMatch = rawNotes.match(/\[SEC_DATE:([^\]]+)\]/i);
  if (secDateMatch) securityChequeDate = secDateMatch[1].trim();

  const secNotesMatch = rawNotes.match(/\[SEC_NOTES:([^\]]+)\]/i);
  if (secNotesMatch) securityNotes = secNotesMatch[1].trim();

  const cleanNotes = rawNotes
    .replace(/\[STATUS:[^\]]+\]/gi, "")
    .replace(/\[(?:PARTY|party_code):[^\]]+\]/gi, "")
    .replace(/\[(?:AREA|area):[^\]]+\]/gi, "")
    .replace(/\[(?:ALT|alt_phone):[^\]]+\]/gi, "")
    .replace(/\[SEC_CHEQUE:[^\]]+\]/gi, "")
    .replace(/\[SEC_BANK:[^\]]+\]/gi, "")
    .replace(/\[SEC_BRANCH:[^\]]+\]/gi, "")
    .replace(/\[SEC_DATE:[^\]]+\]/gi, "")
    .replace(/\[SEC_NOTES:[^\]]+\]/gi, "")
    .replace(/\[security_cheque:[^\]]*\]/gi, "")
    .trim();

  return {
    party_code,
    area,
    alt_phone,
    securityChequeNo,
    securityBankName,
    securityBranchName,
    securityChequeDate,
    securityNotes,
    status,
    cleanNotes: cleanNotes || undefined,
  };
}

/**
 * Merges remote customers from Supabase (Cloud-Authoritative) with genuinely unsynced
 * offline local customers. Ensures web and mobile always converge to the exact same state,
 * evicting cloud-deleted records while preserving offline field entries.
 */
export function mergeAndEnrichCustomers(
  remoteCustomers: Customer[],
  options?: { persist?: boolean; incremental?: boolean },
): Customer[] {
  const deletedCustomerIds = getDeletedIds(STORAGE_KEYS.DELETED_CUSTOMERS);
  const validRemote: Customer[] = (Array.isArray(remoteCustomers) ? remoteCustomers : []).filter(
    (c: Customer) => Boolean(c && c.id) && !deletedCustomerIds.has(c.id)
  );
  const remoteIdSet = new Set<string>(validRemote.map((c: Customer) => String(c.id)));
  const currentLocal: Customer[] = getCustomers();
  const pendingLocal: Customer[] = currentLocal.filter(
    (lc: Customer) =>
      Boolean(lc && lc.id) &&
      !deletedCustomerIds.has(lc.id) &&
      !remoteIdSet.has(String(lc.id)) &&
      isPendingOfflineRecord(lc),
  );

  const localMap = new Map<string, Customer>(currentLocal.map((c: Customer) => [String(c.id), c]));
  const enrichedRemote: Customer[] = validRemote.map((rc: Customer) => {
    const loc = localMap.get(String(rc.id));
    const locIsPending = Boolean(loc && isPendingOfflineRecord(loc));
    const remoteWins = !locIsPending || isRemoteAuthoritative(rc, loc);
    const parsed = parseCustomerNotes(rc.notes);

    // Cloud-Authoritative status resolution (only defer to local if local has an unsynced offline mutation with newer timestamp)
    let resolvedStatus: string = "Active";
    if (!remoteWins && loc?.status !== undefined && loc.status !== null) {
      resolvedStatus = loc.status;
    } else if (!remoteWins && loc?.is_active !== undefined && loc.is_active !== null) {
      resolvedStatus = loc.is_active ? "Active" : "Inactive";
    } else if (parsed.status) {
      resolvedStatus = parsed.status;
    } else if (rc.is_active === false || (rc as any).status === "Inactive") {
      resolvedStatus = "Inactive";
    } else if ((rc as any).status) {
      resolvedStatus = (rc as any).status;
    } else {
      resolvedStatus = "Active";
    }
    const resolvedIsActive = resolvedStatus === "Active";

    const resolvedAddress = (!remoteWins ? loc?.address : undefined) ?? rc.address ?? null;
    const resolvedPostalCode = rc.postal_code || loc?.postal_code || null;
    const resolvedLatitude =
      !remoteWins && loc?.latitude !== undefined && loc?.latitude !== null && !isNaN(Number(loc.latitude))
        ? Number(loc.latitude)
        : rc.latitude !== undefined && rc.latitude !== null && !isNaN(Number(rc.latitude))
        ? Number(rc.latitude)
        : null;
    const resolvedLongitude =
      !remoteWins && loc?.longitude !== undefined && loc?.longitude !== null && !isNaN(Number(loc.longitude))
        ? Number(loc.longitude)
        : rc.longitude !== undefined && rc.longitude !== null && !isNaN(Number(rc.longitude))
        ? Number(rc.longitude)
        : null;

    const remoteOpening = Number(rc.opening_balance ?? 0);
    const remoteDue = Number(rc.current_due ?? 0);
    const resolvedOpening =
      !remoteWins && loc?.opening_balance !== undefined ? Number(loc.opening_balance) : remoteOpening;
    const resolvedDue =
      !remoteWins && loc?.current_due !== undefined ? Number(loc.current_due) : remoteDue;
    const resolvedDueStatus =
      (!remoteWins ? loc?.due_status : undefined) ||
      rc.due_status ||
      (resolvedDue > 0 ? "Partial" : "Clear");

    return {
      ...rc,
      outlet_name: rc.outlet_name || rc.name || loc?.outlet_name || "",
      name: (!remoteWins && loc?.name ? loc.name : rc.name) || "",
      party_code: rc.party_code || parsed.party_code || loc?.party_code || null,
      area: rc.area || parsed.area || rc.city || loc?.area || null,
      city: (!remoteWins ? loc?.city : undefined) ?? rc.city ?? parsed.area ?? null,
      alt_phone: rc.alt_phone || parsed.alt_phone || loc?.alt_phone || null,
      phone: (!remoteWins ? loc?.phone : undefined) ?? rc.phone ?? null,
      contact_person: (!remoteWins ? loc?.contact_person : undefined) ?? rc.contact_person ?? null,
      customer_type: (!remoteWins ? loc?.customer_type : undefined) || rc.customer_type || "Retailer",
      trade_license_number:
        (!remoteWins ? loc?.trade_license_number : undefined) ?? rc.trade_license_number ?? null,
      address: resolvedAddress,
      postal_code: resolvedPostalCode,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      status: resolvedStatus,
      is_active: resolvedIsActive,
      securityChequeNo:
        rc.securityChequeNo ||
        (rc as any).security_cheque_no ||
        parsed.securityChequeNo ||
        loc?.securityChequeNo ||
        (loc as any)?.security_cheque_no ||
        null,
      securityBankName:
        rc.securityBankName ||
        (rc as any).security_bank_name ||
        parsed.securityBankName ||
        loc?.securityBankName ||
        (loc as any)?.security_bank_name ||
        null,
      securityBranchName:
        rc.securityBranchName ||
        (rc as any).security_branch_name ||
        parsed.securityBranchName ||
        loc?.securityBranchName ||
        (loc as any)?.security_branch_name ||
        null,
      securityChequeDate:
        rc.securityChequeDate ||
        (rc as any).security_cheque_date ||
        parsed.securityChequeDate ||
        loc?.securityChequeDate ||
        (loc as any)?.security_cheque_date ||
        null,
      securityNotes:
        rc.securityNotes ||
        (rc as any).security_notes ||
        parsed.securityNotes ||
        loc?.securityNotes ||
        (loc as any)?.security_notes ||
        null,
      notes: parsed.cleanNotes !== undefined ? parsed.cleanNotes : rc.notes,
      opening_balance: resolvedOpening,
      opening_due: resolvedOpening,
      current_due: resolvedDue,
      currentDue: resolvedDue,
      due_status: resolvedDueStatus,
      updated_at: (!remoteWins ? loc?.updated_at : undefined) || rc.updated_at || new Date().toISOString(),
      is_offline: remoteWins ? false : Boolean(loc?.is_offline),
    } as Customer;
  });

  if (options?.incremental) {
    const map = new Map<string, Customer>();
    currentLocal.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
    });
    enrichedRemote.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
    });
    const result = Array.from(map.values()).sort((a: Customer, b: Customer) =>
      (a.outlet_name || a.name || "").localeCompare(b.outlet_name || b.name || "")
    );
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.CUSTOMERS, result, null, true);
    }
    return result;
  }

  const merged: Customer[] = [...pendingLocal, ...enrichedRemote].sort((a: Customer, b: Customer) =>
    (a.outlet_name || a.name || "").localeCompare(b.outlet_name || b.name || "")
  );

  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.CUSTOMERS, merged, null, true);
  }
  return merged;
}

/**
 * Cloud-Authoritative reconciler for Orders.
 * Remote Supabase state wins for synced records; deleted cloud records are evicted;
 * only genuinely unsynced offline orders (`isPendingOfflineRecord`) are retained locally.
 */
export function reconcileOrdersWithRemote(
  remoteOrders: Order[],
  options?: { persist?: boolean; maxCache?: number; incremental?: boolean },
): Order[] {
  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const currentLocal = getOrders().filter((o) => Boolean(o && o.id) && !deletedOrderIds.has(o.id));
  const localById = new Map<string, Order>();
  const localByNum = new Map<string, Order>();
  for (let i = 0; i < currentLocal.length; i++) {
    const lo = currentLocal[i];
    if (lo.id) localById.set(String(lo.id), lo);
    if (lo.order_number) localByNum.set(String(lo.order_number).trim().toUpperCase(), lo);
  }

  const validRemote = (Array.isArray(remoteOrders) ? remoteOrders : [])
    .filter((ro) => Boolean(ro && ro.id) && !deletedOrderIds.has(ro.id))
    .map((ro) => {
      const matchLocal =
        localById.get(String(ro.id)) ||
        (ro.order_number ? localByNum.get(String(ro.order_number).trim().toUpperCase()) : undefined);
      const locIsPending = Boolean(matchLocal && isPendingOfflineRecord(matchLocal));
      const remoteWins = !locIsPending || isRemoteAuthoritative(ro, matchLocal);

      const remoteItems = Array.isArray((ro as any).order_items) ? (ro as any).order_items : undefined;
      const hasRemoteItems = Boolean(remoteItems && remoteItems.length > 0);
      const fallbackItems = !hasRemoteItems && matchLocal ? (matchLocal as any).order_items : undefined;
      const resolvedItems = hasRemoteItems
        ? remoteItems
        : fallbackItems !== undefined
        ? fallbackItems
        : remoteItems;
      const resolvedTotal = Number(ro.total_amount ?? (matchLocal as any)?.total_amount ?? 0);
      const resolvedPaid = Number(ro.paid_amount ?? (matchLocal as any)?.paid_amount ?? 0);
      const resolvedDue = Number(ro.due_amount ?? Math.max(0, r2(resolvedTotal - resolvedPaid)));
      return {
        ...(matchLocal || {}),
        ...ro,
        ...(remoteWins ? {} : (matchLocal || {})),
        subtotal: Number(ro.subtotal ?? (matchLocal as any)?.subtotal ?? resolvedTotal),
        total_amount: resolvedTotal,
        paid_amount: resolvedPaid,
        paidAmount: resolvedPaid,
        due_amount: resolvedDue,
        dueAmount: resolvedDue,
        ...(resolvedItems !== undefined ? { order_items: resolvedItems, items: resolvedItems } : {}),
        customer: (ro as any).customer || (matchLocal as any)?.customer || undefined,
        is_offline: remoteWins ? false : Boolean((matchLocal as any)?.is_offline),
      } as Order;
    });

  if (options?.incremental) {
    const map = new Map<string, Order>();
    currentLocal.forEach((o) => {
      if (o && o.id) map.set(String(o.id), o);
    });
    validRemote.forEach((o) => {
      if (o && o.id) map.set(String(o.id), o);
    });
    const result = deduplicateOrders(Array.from(map.values()), {
      excludeDrafts: false,
      excludeCancelled: false,
    }) as Order[];
    if (options?.persist !== false) {
      const toStore = options?.maxCache ? result.slice(0, options.maxCache) : result;
      setLocalData(STORAGE_KEYS.ORDERS, toStore, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((o) => String(o.id)));
  const remoteNumSet = new Set(
    validRemote.map((o) => String(o.order_number || "").trim().toUpperCase()).filter(Boolean),
  );

  const pendingLocal = currentLocal.filter(
    (lo) =>
      !remoteIdSet.has(String(lo.id)) &&
      (!lo.order_number || !remoteNumSet.has(String(lo.order_number).trim().toUpperCase())) &&
      isPendingOfflineRecord(lo),
  );

  const reconciled = deduplicateOrders([...pendingLocal, ...validRemote], {
    excludeDrafts: false,
    excludeCancelled: false,
  }) as Order[];

  if (options?.persist !== false) {
    const toStore = options?.maxCache ? reconciled.slice(0, options.maxCache) : reconciled;
    setLocalData(STORAGE_KEYS.ORDERS, toStore, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Collections.
 * Remote Supabase state wins for synced records; deleted cloud collections are evicted;
 * only genuinely unsynced offline collections (`isPendingOfflineRecord`) are retained locally.
 */
export function reconcileCollectionsWithRemote(
  remoteCols: Collection[],
  options?: { persist?: boolean; maxCache?: number; incremental?: boolean },
): Collection[] {
  const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const currentLocal = getCollections().filter((c) => Boolean(c && c.id) && !deletedColIds.has(c.id));
  const localById = new Map<string, Collection>();
  const localByNum = new Map<string, Collection>();
  for (let i = 0; i < currentLocal.length; i++) {
    const lc = currentLocal[i];
    if (lc.id) localById.set(String(lc.id), lc);
    if (lc.collection_number) localByNum.set(String(lc.collection_number).trim().toUpperCase(), lc);
  }

  const validRemote = (Array.isArray(remoteCols) ? remoteCols : [])
    .filter((rc) => Boolean(rc && rc.id) && !deletedColIds.has(rc.id))
    .map((rc) => {
      const matchLocal =
        localById.get(String(rc.id)) ||
        (rc.collection_number ? localByNum.get(String(rc.collection_number).trim().toUpperCase()) : undefined);
      if (!matchLocal) {
        return { ...rc, is_offline: false } as Collection;
      }
      const locIsPending = isPendingOfflineRecord(matchLocal);
      const remoteWins = !locIsPending || isRemoteAuthoritative(rc, matchLocal);
      return {
        ...matchLocal,
        ...rc,
        ...(remoteWins ? {} : matchLocal),
        settlement_discount: (rc as any).settlement_discount ?? matchLocal.settlement_discount ?? null,
        previous_due: (rc as any).previous_due ?? matchLocal.previous_due ?? null,
        remaining_due: (rc as any).remaining_due ?? matchLocal.remaining_due ?? null,
        is_offline: remoteWins ? false : Boolean((matchLocal as any)?.is_offline),
      } as Collection;
    });

  if (options?.incremental) {
    const map = new Map<string, Collection>();
    currentLocal.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
    });
    validRemote.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
    });
    const result = deduplicateCollections(Array.from(map.values()));
    if (options?.persist !== false) {
      const toStore = options?.maxCache ? result.slice(0, options.maxCache) : result;
      setLocalData(STORAGE_KEYS.COLLECTIONS, toStore, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((c) => String(c.id)));
  const remoteColNumSet = new Set(
    validRemote.map((c) => String(c.collection_number || "").trim().toUpperCase()).filter(Boolean),
  );

  const pendingLocal = currentLocal.filter(
    (lc) =>
      !remoteIdSet.has(String(lc.id)) &&
      (!lc.collection_number || !remoteColNumSet.has(String(lc.collection_number).trim().toUpperCase())) &&
      isPendingOfflineRecord(lc),
  );

  const reconciled = deduplicateCollections([...pendingLocal, ...validRemote]);

  if (options?.persist !== false) {
    const toStore = options?.maxCache ? reconciled.slice(0, options.maxCache) : reconciled;
    setLocalData(STORAGE_KEYS.COLLECTIONS, toStore, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Products.
 * Remote Supabase stock_quantity, pricing, and active status strictly override stale local caches.
 */
export function reconcileProductsWithRemote(
  remoteProducts: Product[],
  options?: { persist?: boolean; incremental?: boolean },
): Product[] {
  const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
  const localProds = getProducts().filter((p) => Boolean(p && p.id) && !deletedProdIds.has(String(p.id)));
  const localProdMap = new Map<string, Product>();
  const localSkuMap = new Map<string, Product>();
  for (let i = 0; i < localProds.length; i++) {
    const lp = localProds[i];
    if (lp.id) localProdMap.set(String(lp.id), lp);
    if (lp.sku_code) localSkuMap.set(String(lp.sku_code).trim().toUpperCase(), lp);
  }

  const validRemote = (Array.isArray(remoteProducts) ? remoteProducts : [])
    .filter((rp) => Boolean(rp && rp.id) && !deletedProdIds.has(String(rp.id)))
    .map((rp) => {
      const lp =
        localProdMap.get(String(rp.id)) ||
        (rp.sku_code ? localSkuMap.get(String(rp.sku_code).trim().toUpperCase()) : undefined);
      const remoteStock = Math.max(0, Math.round(Number(rp.stock_quantity ?? (rp as any).stock ?? 0)));
      if (!lp) {
        return {
          ...rp,
          stock_quantity: remoteStock,
          stock: remoteStock,
          is_offline: false,
        } as Product;
      }
      const lpPending = isPendingOfflineRecord(lp);
      const remoteWins = !lpPending || isRemoteAuthoritative(rp, lp);
      const resolvedStock = remoteWins
        ? remoteStock
        : Math.max(0, Math.round(Number(lp.stock_quantity ?? (lp as any).stock ?? remoteStock)));
      return {
        ...lp,
        ...rp,
        ...(remoteWins ? {} : lp),
        stock_quantity: resolvedStock,
        stock: resolvedStock,
        purchase_price: rp.purchase_price ?? lp.purchase_price ?? null,
        purchase_cost: rp.purchase_cost ?? lp.purchase_cost ?? null,
        cost_price: rp.cost_price ?? lp.cost_price ?? null,
        is_offline: remoteWins ? false : Boolean((lp as any).is_offline),
      } as Product;
    });

  if (options?.incremental) {
    const map = new Map<string, Product>();
    localProds.forEach((p) => {
      if (p && p.id) map.set(String(p.id), p);
    });
    validRemote.forEach((p) => {
      if (p && p.id) map.set(String(p.id), p);
    });
    const result = Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.PRODUCTS, result, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((p) => String(p.id)));
  const remoteSkuSet = new Set(
    validRemote.map((p) => String(p.sku_code || "").trim().toUpperCase()).filter(Boolean),
  );

  const pendingLocal = localProds.filter(
    (lp) =>
      !remoteIdSet.has(String(lp.id)) &&
      (!lp.sku_code || !remoteSkuSet.has(String(lp.sku_code).trim().toUpperCase())) &&
      isPendingOfflineRecord(lp),
  );

  const reconciled = [...pendingLocal, ...validRemote];
  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.PRODUCTS, reconciled, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Categories.
 */
export function reconcileCategoriesWithRemote(
  remoteCats: Category[],
  options?: { persist?: boolean; incremental?: boolean },
): Category[] {
  const currentLocal = getLocalData<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  const validRemote = (Array.isArray(remoteCats) ? remoteCats : []).filter((c) => Boolean(c && c.id));

  if (options?.incremental) {
    const map = new Map<string, Category>();
    (Array.isArray(currentLocal) ? currentLocal : []).forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
    });
    for (const rc of validRemote) {
      const existing = map.get(String(rc.id));
      if (!existing || isRemoteAuthoritative(rc, existing)) {
        map.set(String(rc.id), { ...(existing || {}), ...rc });
      }
    }
    const result = Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.CATEGORIES, result, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((c) => String(c.id)));
  const pendingCats = (Array.isArray(currentLocal) ? currentLocal : []).filter(
    (lc) => lc && !remoteIdSet.has(String(lc.id)) && isPendingOfflineRecord(lc),
  );
  const reconciled = [...pendingCats, ...validRemote].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.CATEGORIES, reconciled, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Expenses.
 */
export function reconcileExpensesWithRemote(
  remoteExp: Expense[],
  options?: { persist?: boolean; incremental?: boolean },
): Expense[] {
  const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
  const currentLocal = getLocalData<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(
    (e) => Boolean(e && e.id) && !deletedExpIds.has(String(e.id)),
  );
  const validRemote = (Array.isArray(remoteExp) ? remoteExp : []).filter(
    (e) => Boolean(e && e.id) && !deletedExpIds.has(String(e.id)),
  );

  if (options?.incremental) {
    const map = new Map<string, Expense>();
    currentLocal.forEach((e) => {
      if (e && e.id) map.set(String(e.id), e);
    });
    for (const re of validRemote) {
      const existing = map.get(String(re.id));
      if (!existing || isRemoteAuthoritative(re, existing)) {
        map.set(String(re.id), { ...(existing || {}), ...re });
      }
    }
    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.expense_date || b.created_at || 0).getTime() - new Date(a.expense_date || a.created_at || 0).getTime(),
    );
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.EXPENSES, result, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((e) => String(e.id)));
  const pendingExp = currentLocal.filter(
    (le) => le && !remoteIdSet.has(String(le.id)) && isPendingOfflineRecord(le),
  );
  const reconciled = [...pendingExp, ...validRemote].sort(
    (a, b) => new Date(b.expense_date || b.created_at || 0).getTime() - new Date(a.expense_date || a.created_at || 0).getTime(),
  );
  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.EXPENSES, reconciled, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Visits.
 */
export function reconcileVisitsWithRemote(
  remoteVisits: Visit[],
  options?: { persist?: boolean; incremental?: boolean },
): Visit[] {
  const deletedVisitIds = getDeletedIds(STORAGE_KEYS.DELETED_VISITS);
  const currentLocal = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []).filter(
    (v) => Boolean(v && v.id) && !deletedVisitIds.has(String(v.id)),
  );
  const validRemote = (Array.isArray(remoteVisits) ? remoteVisits : []).filter(
    (v) => Boolean(v && v.id) && !deletedVisitIds.has(String(v.id)),
  );

  if (options?.incremental) {
    const map = new Map<string, Visit>();
    currentLocal.forEach((v) => {
      if (v && v.id) map.set(String(v.id), v);
    });
    for (const rv of validRemote) {
      const existing = map.get(String(rv.id));
      if (!existing || isRemoteAuthoritative(rv, existing)) {
        map.set(String(rv.id), { ...(existing || {}), ...rv });
      }
    }
    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.visit_date || b.created_at || 0).getTime() - new Date(a.visit_date || a.created_at || 0).getTime(),
    );
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.VISITS, result, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((v) => String(v.id)));
  const pendingVisits = currentLocal.filter(
    (lv) => lv && !remoteIdSet.has(String(lv.id)) && isPendingOfflineRecord(lv),
  );
  const reconciled = [...pendingVisits, ...validRemote].sort(
    (a, b) => new Date(b.visit_date || b.created_at || 0).getTime() - new Date(a.visit_date || a.created_at || 0).getTime(),
  );
  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.VISITS, reconciled, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Areas / Territories.
 */
export function reconcileAreasWithRemote(
  remoteTerritories: any[],
  options?: { persist?: boolean; incremental?: boolean },
): Area[] {
  const deletedAreaIds = getDeletedIds(STORAGE_KEYS.DELETED_AREAS);
  const currentLocal = getLocalData<Area[]>(STORAGE_KEYS.AREAS, []).filter(
    (a) => Boolean(a && a.id) && !deletedAreaIds.has(String(a.id)),
  );
  const validRemote: Area[] = (Array.isArray(remoteTerritories) ? remoteTerritories : [])
    .filter((t) => Boolean(t && t.id) && !deletedAreaIds.has(String(t.id)))
    .map((t) => ({
      id: String(t.id),
      name: t.name,
      code_prefix: t.code || t.code_prefix || deriveCodePrefix(t.name),
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

  if (options?.incremental) {
    const map = new Map<string, Area>();
    currentLocal.forEach((a) => {
      if (a && a.id) map.set(String(a.id), a);
    });
    for (const ra of validRemote) {
      const existing = map.get(String(ra.id));
      if (!existing || isRemoteAuthoritative(ra, existing)) {
        map.set(String(ra.id), { ...(existing || {}), ...ra });
      }
    }
    const result = Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.AREAS, result, null, true);
    }
    return result;
  }

  const remoteIdSet = new Set(validRemote.map((a) => String(a.id)));
  const pendingAreas = currentLocal.filter(
    (la) => la && !remoteIdSet.has(String(la.id)) && isPendingOfflineRecord(la),
  );
  const reconciled = [...pendingAreas, ...validRemote].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.AREAS, reconciled, null, true);
  }
  return reconciled;
}

/**
 * Cloud-Authoritative reconciler for Inventory.
 */
export function reconcileInventoryWithRemote(
  remoteInv: any[],
  options?: { persist?: boolean; incremental?: boolean },
): any[] {
  const currentLocal = getLocalData<any[]>(STORAGE_KEYS.INVENTORY, []);
  const validRemote = (Array.isArray(remoteInv) ? remoteInv : []).filter((i) => Boolean(i && (i.id || i.product_id)));

  if (options?.incremental) {
    const map = new Map<string, any>();
    (Array.isArray(currentLocal) ? currentLocal : []).forEach((item) => {
      const key = String(item.product_id || item.id);
      if (key) map.set(key, item);
    });
    for (const ri of validRemote) {
      const key = String(ri.product_id || ri.id);
      const existing = map.get(key);
      if (!existing || isRemoteAuthoritative(ri, existing)) {
        map.set(key, { ...(existing || {}), ...ri });
      }
    }
    const result = Array.from(map.values());
    if (options?.persist !== false) {
      setLocalData(STORAGE_KEYS.INVENTORY, result, null, true);
    }
    return result;
  }

  if (options?.persist !== false) {
    setLocalData(STORAGE_KEYS.INVENTORY, validRemote, null, true);
  }
  return validRemote;
}

/**
 * Applies a granular zero-lag Realtime table patch directly into the local state.
 */
export function applyRealtimeTablePatch(
  table: string,
  eventType: "INSERT" | "UPDATE" | "DELETE",
  payloadRecord: any,
): boolean {
  if (!table || !payloadRecord) return false;
  const id = String(payloadRecord.id || "").trim();

  if (eventType === "DELETE") {
    switch (table) {
      case "orders": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_ORDERS, id);
        const current = getOrders().filter((o) => String(o.id) !== id);
        setLocalData(STORAGE_KEYS.ORDERS, current, null, true);
        break;
      }
      case "customers": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_CUSTOMERS, id);
        const current = getCustomers().filter((c) => String(c.id) !== id);
        setLocalData(STORAGE_KEYS.CUSTOMERS, current, null, true);
        break;
      }
      case "products": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_PRODUCTS, id);
        const current = getProducts().filter((p) => String(p.id) !== id);
        setLocalData(STORAGE_KEYS.PRODUCTS, current, null, true);
        break;
      }
      case "collections": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_COLLECTIONS, id);
        const current = getCollections().filter((c) => String(c.id) !== id);
        setLocalData(STORAGE_KEYS.COLLECTIONS, current, null, true);
        break;
      }
      case "expenses": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_EXPENSES, id);
        const current = getExpenses().filter((e) => String(e.id) !== id);
        setLocalData(STORAGE_KEYS.EXPENSES, current, null, true);
        break;
      }
      case "categories": {
        const current = getLocalData<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter((c) => String(c.id) !== id);
        setLocalData(STORAGE_KEYS.CATEGORIES, current, null, true);
        break;
      }
      case "visits": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_VISITS, id);
        const current = getVisits().filter((v) => String(v.id) !== id);
        setLocalData(STORAGE_KEYS.VISITS, current, null, true);
        break;
      }
      case "territories": {
        if (id) saveDeletedId(STORAGE_KEYS.DELETED_AREAS, id);
        const current = getAreas().filter((a) => String(a.id) !== id);
        setLocalData(STORAGE_KEYS.AREAS, current, null, true);
        break;
      }
      case "inventory": {
        const current = getLocalData<any[]>(STORAGE_KEYS.INVENTORY, []).filter(
          (inv) => String(inv.id) !== id && String(inv.product_id) !== String(payloadRecord.product_id),
        );
        setLocalData(STORAGE_KEYS.INVENTORY, current, null, true);
        break;
      }
      default:
        return false;
    }
    return true;
  }

  // INSERT or UPDATE
  switch (table) {
    case "orders": {
      reconcileOrdersWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "customers": {
      mergeAndEnrichCustomers([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "products": {
      reconcileProductsWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "collections": {
      reconcileCollectionsWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "expenses": {
      reconcileExpensesWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "categories": {
      reconcileCategoriesWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "visits": {
      reconcileVisitsWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "territories": {
      reconcileAreasWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    case "inventory": {
      reconcileInventoryWithRemote([payloadRecord], { incremental: true, persist: true });
      break;
    }
    default:
      return false;
  }
  return true;
}

export const getCustomers = (): Customer[] => {
  try {
    const list = getLocalData<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const deletedCustomerIds = getDeletedIds(STORAGE_KEYS.DELETED_CUSTOMERS);
    return (Array.isArray(list) ? list : [])
      .filter((c: Customer) => Boolean(c && c.id) && !deletedCustomerIds.has(c.id))
      .sort((a: Customer, b: Customer) => (a.outlet_name || a.name || "").localeCompare(b.outlet_name || b.name || ""));
  } catch {
    return [];
  }
};

/**
 * Saves or updates an outlet / customer in the persistent local storage array (STORAGE_KEYS.CUSTOMERS).
 * Immediately updates localStorage and dispatches storage update event so all components stay in sync.
 */
export function saveCustomer(customer: Customer | (Partial<Customer> & { id: string })): Customer[] {
  const current: Customer[] = getCustomers();
  const index = current.findIndex((c: Customer) => String(c.id) === String(customer.id));
  const existing = index >= 0 ? current[index] : null;

  // Derive status and is_active with full support for Active / Inactive / Pending / custom statuses
  const rawStatus = customer.status !== undefined ? customer.status : existing?.status;
  const rawIsActive = customer.is_active !== undefined ? customer.is_active : existing?.is_active;

  let status: string = "Active";
  if (rawStatus === "Inactive" || rawIsActive === false) {
    status = "Inactive";
  } else if (rawStatus) {
    status = rawStatus;
  } else if (rawIsActive === true) {
    status = "Active";
  }
  const is_active = status === "Active";

  const customerToSave: Customer = {
    ...(existing || {}),
    ...customer,
    status,
    is_active,
    updated_at: new Date().toISOString(),
  } as Customer;

  let updated: Customer[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = customerToSave;
  } else {
    updated = [customerToSave, ...current];
  }
  setLocalData(STORAGE_KEYS.CUSTOMERS, updated);
  return updated;
}

export const updateCustomer = (customerOrPartial: Customer | (Partial<Customer> & { id: string })): Customer[] => {
  return saveCustomer(customerOrPartial);
};

/**
 * Updates the complete list of customers in persistent storage.
 */
export function updateCustomersList(customers: Customer[]): void {
  setLocalData(STORAGE_KEYS.CUSTOMERS, Array.isArray(customers) ? customers : []);
}

export const saveCustomers = updateCustomersList;

export const getProducts = (): Product[] => {
  try {
    const list = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    return Array.isArray(list) ? (list as Product[]) : [];
  } catch {
    return [];
  }
};

/**
 * Saves or updates a product in persistent local storage and dispatches sync events.
 */
export function saveProduct(product: Product | (Partial<Product> & { id: string })): Product[] {
  const current = getProducts();
  const index = current.findIndex((p: Product) => String(p.id) === String(product.id));
  const existing = index >= 0 ? current[index] : null;
  const productToSave: Product = {
    ...(existing || {}),
    ...product,
    updated_at: new Date().toISOString(),
  } as Product;

  let updated: Product[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = productToSave;
  } else {
    updated = [productToSave, ...current];
  }
  setLocalData(STORAGE_KEYS.PRODUCTS, updated);
  return updated;
}

export const updateProduct = saveProduct;

export const getOrders = (): Order[] => {
  try {
    const list = getLocalData<Order[]>(STORAGE_KEYS.ORDERS, []);
    return Array.isArray(list) ? (list as Order[]) : [];
  } catch {
    return [];
  }
};

/**
 * Saves orders array to persistent localStore and triggers global storage synchronization.
 */
export const saveOrders = (orders: Order[]): void => {
  setLocalData(STORAGE_KEYS.ORDERS, orders);
};

export const getNotifications = (): Notification[] => {
  try {
    const list = getLocalData<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return Array.isArray(list) ? (list as Notification[]) : [];
  } catch {
    return [];
  }
};

export const deleteNotification = (id: string, currentItems?: Notification[]): Notification[] => {
  const current = getNotifications();
  const source = (currentItems && currentItems.length > 0) ? currentItems : (current.length > 0 ? current : []);
  const items = source.filter((n: Notification) => String(n.id) !== String(id));
  setLocalData(STORAGE_KEYS.NOTIFICATIONS, items);
  saveDeletedId(STORAGE_KEYS.DELETED_NOTIFICATIONS, id);
  supabase.from("notifications").delete().eq("id", id).then(undefined, (err) => {
    console.warn("Failed to delete notification remotely:", err);
  });
  (items as any).success = true;
  return [...items];
};

export const getCollections = (): Collection[] => {
  try {
    const list = getLocalData<Collection[]>(STORAGE_KEYS.COLLECTIONS, []);
    return deduplicateCollections(Array.isArray(list) ? list : []);
  } catch {
    return [];
  }
};

/**
 * Saves collections array to persistent localStore and triggers global storage synchronization.
 */
export const saveCollections = (collections: Collection[]): void => {
  const deduped = deduplicateCollections(collections);
  setLocalData(STORAGE_KEYS.COLLECTIONS, deduped);
};

export const getVisits = (): Visit[] => {
  try {
    const list = getLocalData<Visit[]>(STORAGE_KEYS.VISITS, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveVisits = (visits: Visit[]): void => {
  setLocalData(STORAGE_KEYS.VISITS, visits);
};

export const getRoutePlan = (): any[] => {
  try {
    const list = getLocalData<any[]>(STORAGE_KEYS.ROUTE_PLAN, []) || getLocalData<any[]>(STORAGE_KEYS.ROUTE_VISITS, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveRoutePlan = (routes: any[]): void => {
  setLocalData(STORAGE_KEYS.ROUTE_PLAN, routes);
  setLocalData(STORAGE_KEYS.ROUTE_VISITS, routes);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail: { type: "route_plan_updated" } }));
    } catch {
      window.dispatchEvent(new Event("sales_erp_storage_update"));
    }
    window.dispatchEvent(new Event("storage"));
  }
};

export const saveRouteVisits = saveRoutePlan;

/**
 * Saves a new or updated Collection record, automatically snapshotting
 * previous_due and remaining_due at the moment of payment (BUG-019).
 */
export const saveCollection = (
  collectionData: Partial<Collection> & { customer_id: string; amount: number }
): Collection => {
  const collections = getCollections();
  const customerId = collectionData.customer_id;
  const amt = r2(Number(collectionData.amount) || 0);

  let prevDueCalc = 0;
  if (collectionData.previous_due !== undefined && collectionData.previous_due !== null) {
    prevDueCalc = Number(collectionData.previous_due);
  } else if (collectionData.previousDue !== undefined && collectionData.previousDue !== null) {
    prevDueCalc = Number(collectionData.previousDue);
  } else if (customerId) {
    const details = getCustomerLedgerDetails(customerId);
    prevDueCalc = details.currentDue;
  }

  let remDueCalc = 0;
  if (collectionData.remaining_due !== undefined && collectionData.remaining_due !== null) {
    remDueCalc = Number(collectionData.remaining_due);
  } else if (collectionData.remainingDue !== undefined && collectionData.remainingDue !== null) {
    remDueCalc = Number(collectionData.remainingDue);
  } else {
    remDueCalc = Math.max(0, r2(prevDueCalc - amt));
  }

  const colId =
    collectionData.id ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}`);
  const colNumber = collectionData.collection_number || generateCollectionNumber(collections);
  const now = new Date().toISOString();

  const record: Collection = {
    ...collectionData,
    id: colId,
    collection_number: colNumber,
    customer_id: customerId,
    order_id: collectionData.order_id ?? null,
    amount: amt,
    payment_method: collectionData.payment_method || "Cash",
    collection_date: collectionData.collection_date || now,
    collected_by: collectionData.collected_by ?? null,
    notes: collectionData.notes ?? null,
    previous_due: prevDueCalc,
    remaining_due: remDueCalc,
    previousDue: prevDueCalc,
    remainingDue: remDueCalc,
    created_at: collectionData.created_at || now,
  };

  const isExisting = collections.some((c) => c.id === colId);
  const updatedList = isExisting
    ? collections.map((c) => (c.id === colId ? record : c))
    : deduplicateCollections([record, ...collections]);

  setLocalData(STORAGE_KEYS.COLLECTIONS, updatedList);
  if (customerId) {
    recalculateCustomerLedger(customerId, undefined, updatedList, { persist: true });
  }
  return record;
};

export const deleteCollection = (id: string, currentItems?: Collection[]): Collection[] => {
  const current = getCollections();
  const source = (currentItems && currentItems.length > 0) ? currentItems : (current.length > 0 ? current : []);
  const targetCol = current.find((c: Collection) => String(c.id) === String(id)) || source.find((c: Collection) => String(c.id) === String(id));
  const items = source.filter((c: Collection) => String(c.id) !== String(id));
  setLocalData(STORAGE_KEYS.COLLECTIONS, items);
  saveDeletedId(STORAGE_KEYS.DELETED_COLLECTIONS, id);
  supabase.from("collections").delete().eq("id", id).then(undefined, (err) => {
    console.warn("Failed to delete collection remotely:", err);
  });
  if (targetCol?.customer_id) {
    recalculateCustomerLedger(targetCol.customer_id, undefined, items, { persist: true });
  }
  (items as any).success = true;
  return [...items];
};

/**
 * CRIT-002: Voids and removes any upfront collections linked to a cancelled order.
 * Prevents orphaned collection credits in the daily cash book and customer ledger.
 */
export function voidOrderCollections(
  orderId: string,
  orderNumber?: string
): { voidedCount: number; voidedAmount: number; collections: Collection[] } {
  if (!orderId) return { voidedCount: 0, voidedAmount: 0, collections: getCollections() };

  const allCols = getCollections();
  const linked = allCols.filter((c: any) => {
    if (!c) return false;
    const cOrdId = String(c.order_id || c.orderId || "").trim();
    if (cOrdId && cOrdId === String(orderId).trim()) return true;
    if (orderNumber && c.reference && String(c.reference).trim().toUpperCase() === String(orderNumber).trim().toUpperCase()) return true;
    if (orderNumber && c.notes && c.notes.includes(orderNumber)) return true;
    return false;
  });

  if (linked.length === 0) {
    return { voidedCount: 0, voidedAmount: 0, collections: allCols };
  }

  const linkedIds = new Set(linked.map((c) => String(c.id)));
  const remaining = allCols.filter((c) => !linkedIds.has(String(c.id)));
  saveCollections(remaining);

  // Tombstone each voided collection so remote sync will not bring it back
  linked.forEach((c) => {
    if (c.id) saveDeletedId(STORAGE_KEYS.DELETED_COLLECTIONS, String(c.id));
  });

  // Background remote deletion (collections link to orders physically via order_id FK)
  supabase
    .from("collections")
    .delete()
    .eq("order_id", orderId)
    .then(undefined, (err) => console.warn("Notice deleting linked collections remotely:", err));

  const voidedAmount = r2(linked.reduce((sum, c) => sum + Number(c.amount || 0), 0));

  dispatchGlobalStateUpdate({ orderId, type: "collection_voided" });

  return {
    voidedCount: linked.length,
    voidedAmount,
    collections: remaining,
  };
}

export const deleteOrder = (id: string, currentItems?: any[]): any[] & { success: boolean; error?: string } => {
  const current = getOrders();
  const targetOrder = current.find((o) => String(o.id) === String(id)) || (currentItems ? currentItems.find((o: any) => String(o.id) === String(id)) : undefined);
  const orderNumber = targetOrder?.order_number || id;
  const paidAmount = Number(targetOrder?.paid_amount ?? (targetOrder as any)?.paidAmount ?? 0);
  const collections = getCollections();
  const hasLinkedCollection = collections.some(
    (c: any) =>
      String(c.order_id) === String(id) ||
      (targetOrder?.order_number && String(c.reference) === String(targetOrder.order_number))
  );

  const isCancelled = targetOrder?.status === "Cancelled";

  if (!isCancelled && (paidAmount > 0 || hasLinkedCollection)) {
    const errorMsg = `Cannot delete order ${orderNumber} because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.`;
    const res: any = [...(currentItems && currentItems.length > 0 ? currentItems : current)];
    res.success = false;
    res.error = errorMsg;
    return res;
  }

  // If order was cancelled and has linked collections, internalDeleteOrder unlinks them
  // (order_id = null) so they convert cleanly into Customer Advance Credit Balance.
  const result = internalDeleteOrder(id, currentItems);
  if (result.success !== false) {
    if (targetOrder?.customer_id) {
      recalculateCustomerLedger(targetOrder.customer_id, result, undefined, { persist: true });
    }
    dispatchGlobalStateUpdate({ customerId: targetOrder?.customer_id, type: "order_deleted" });
  }
  return result;
};

export const adjustCustomerDue = (customerId: string, _deltaAmount?: number): void => {
  recalculateCustomerLedger(customerId, undefined, undefined, { persist: true });
};

export const getExpenses = (): Expense[] => {
  try {
    const list = getLocalData<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveExpenses = (expenses: Expense[]): void => {
  setLocalData(STORAGE_KEYS.EXPENSES, expenses);
};

export const deleteExpense = (id: string, currentItems?: Expense[]): Expense[] => {
  const current = getExpenses();
  const source = (currentItems && currentItems.length > 0) ? currentItems : (current.length > 0 ? current : []);
  const items = source.filter((e: Expense) => String(e.id) !== String(id));
  setLocalData(STORAGE_KEYS.EXPENSES, items);
  saveDeletedId(STORAGE_KEYS.DELETED_EXPENSES, id);
  supabase.from("expenses").delete().eq("id", id).then(undefined, (err) => {
    console.warn("Failed to delete expense remotely:", err);
  });
  (items as any).success = true;
  return [...items];
};

export const clearReadNotifications = (currentItems?: Notification[]): Notification[] => {
  const current = getNotifications();
  const source = (currentItems && currentItems.length > 0) ? currentItems : (current.length > 0 ? current : []);
  const readItems = source.filter((n: Notification) => n.is_read);
  readItems.forEach((n: Notification) => saveDeletedId(STORAGE_KEYS.DELETED_NOTIFICATIONS, n.id));
  const remaining = source.filter((n: Notification) => !n.is_read);
  setLocalData(STORAGE_KEYS.NOTIFICATIONS, remaining);
  if (readItems.length > 0) {
    supabase.from("notifications").delete().in("id", readItems.map((n: Notification) => n.id)).then(undefined, (err) => {
      console.warn("Failed to clear read notifications remotely:", err);
    });
  }
  (remaining as any).success = true;
  return [...remaining];
};

/**
 * Standardized purchase price / supplier purchase cost per product unit across inventory and reports.
 * Prioritizes actual company purchase cost (purchase_cost, distributor_price, purchase_price) over selling DP rate.
 */
export function getProductPurchasePrice(p: any): number {
  if (!p) return 0;

  // 1. Explicit purchase_cost property
  if (p.purchase_cost !== undefined && p.purchase_cost !== null && !isNaN(Number(p.purchase_cost)) && Number(p.purchase_cost) > 0) {
    return Number(p.purchase_cost);
  }
  if (p.purchaseCost !== undefined && p.purchaseCost !== null && !isNaN(Number(p.purchaseCost)) && Number(p.purchaseCost) > 0) {
    return Number(p.purchaseCost);
  }

  // 2. Company Purchase Price / Cost (distributor_price in HAMKO schema)
  if (p.distributor_price !== undefined && p.distributor_price !== null && !isNaN(Number(p.distributor_price)) && Number(p.distributor_price) > 0) {
    return Number(p.distributor_price);
  }
  if (p.distributorPrice !== undefined && p.distributorPrice !== null && !isNaN(Number(p.distributorPrice)) && Number(p.distributorPrice) > 0) {
    return Number(p.distributorPrice);
  }

  // 3. purchase_price property
  if (p.purchase_price !== undefined && p.purchase_price !== null && !isNaN(Number(p.purchase_price)) && Number(p.purchase_price) > 0) {
    return Number(p.purchase_price);
  }
  if (p.purchasePrice !== undefined && p.purchasePrice !== null && !isNaN(Number(p.purchasePrice)) && Number(p.purchasePrice) > 0) {
    return Number(p.purchasePrice);
  }

  // 4. cost_price property
  if (p.cost_price !== undefined && p.cost_price !== null && !isNaN(Number(p.cost_price)) && Number(p.cost_price) > 0) {
    return Number(p.cost_price);
  }
  if (p.costPrice !== undefined && p.costPrice !== null && !isNaN(Number(p.costPrice)) && Number(p.costPrice) > 0) {
    return Number(p.costPrice);
  }

  // 5. buying_price / unit_cost / tp_price / trade_price / purchase_rate
  const otherCost = [
    p.buying_price,
    p.buyingPrice,
    p.unit_cost,
    p.unitCost,
    p.tp_price,
    p.tpPrice,
    p.trade_price,
    p.tradePrice,
    p.purchase_rate,
    p.purchaseRate,
  ].find((v) => v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) > 0);

  if (otherCost !== undefined) {
    return Number(otherCost);
  }

  // CRITICAL SAFEGUARD (BUG-003):
  // NEVER fall back to customer-facing selling prices (unit_price, dealer_price, selling_price, dp_price).
  // If procurement cost is missing, return 0 to prevent distorting gross profit margins or inflating COGS to 100% of revenue.
  return 0;
}

/**
 * Standardized live inventory valuation across Inventory Page, Reports Page, and Balance Sheet:
 * SUM(quantity * purchase_cost)
 */
export function calculateInventoryStockValue(products: any[]): number {
  if (!Array.isArray(products) || products.length === 0) return 0;
  return r2(
    products.reduce((sum, p) => {
      const qty = Math.max(0, Number(p.stock_quantity ?? (p as any).stock ?? 0));
      const cost = getProductPurchasePrice(p);
      return sum + r2(qty * cost);
    }, 0)
  );
}

/**
 * Resolves the unit purchasing / buying cost of an order line item.
 * Checks item's direct cost fields first, then attached product, then matched product from catalogue.
 * Strict safeguard: NEVER falls back to customer-facing selling price (unit_price or dealer_price).
 */
export function getItemPurchaseCost(item: any, productMap?: Map<string, any>): number {
  if (!item) return 0;

  // 1. Direct explicit procurement / buying / cost fields on the item itself
  const direct = [
    item.purchase_cost,
    item.purchaseCost,
    item.distributor_price,
    item.distributorPrice,
    item.purchase_price,
    item.purchasePrice,
    item.cost_price,
    item.costPrice,
    item.buying_price,
    item.buyingPrice,
    item.unit_cost,
    item.unitCost,
    item.tp_price,
    item.trade_price,
    item.purchase_rate,
  ].find((v) => v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) > 0);

  if (direct !== undefined) {
    return Number(direct);
  }

  // 2. Attached product object on the item
  if (item.product) {
    const prodCost = getProductPurchasePrice(item.product);
    if (prodCost > 0) return prodCost;
  }

  // 3. Lookup in productMap by product_id or id or sku or name
  const prodId = String(item.product_id || item.productId || item.id || "");
  const sku = item.sku_code || item.sku;
  const name = item.name || item.product_name;

  if (productMap) {
    const prod =
      (prodId && productMap.get(prodId)) ||
      (sku && productMap.get(String(sku).toLowerCase())) ||
      (name && productMap.get(String(name).trim().toLowerCase()));

    if (prod) {
      const prodCost = getProductPurchasePrice(prod);
      if (prodCost > 0) return prodCost;
    }
  }

  // 4. Fallback lookup from central product catalog if not found in productMap
  try {
    const catalog = getProducts();
    if (Array.isArray(catalog) && catalog.length > 0) {
      const matched = catalog.find((p: any) =>
        (prodId && String(p.id) === prodId) ||
        (sku && p.sku_code && String(p.sku_code).toLowerCase() === String(sku).toLowerCase()) ||
        (name && p.name && String(p.name).trim().toLowerCase() === String(name).trim().toLowerCase())
      );
      if (matched) {
        const prodCost = getProductPurchasePrice(matched);
        if (prodCost > 0) return prodCost;
      }
    }
  } catch {
    // Storage access safeguard
  }

  // 5. CRITICAL SAFEGUARD (BUG-003):
  // If procurement cost is genuinely unrecorded/0, return 0.
  // NEVER fall back to customer-facing selling prices (item.dealer_price, item.unit_price, etc.)
  // which falsely equates COGS to revenue and reports ৳0 gross margin.
  return 0;
}

/**
 * Calculates dynamic Cost of Goods Sold (COGS) for a list of sales orders:
 * SUM(item.quantity * item.unitCost) across all non-cancelled orders.
 */
export function calculateOrdersCogs(
  ordersList: any[],
  productsList?: any[]
): { totalCogs: number; totalItemsSold: number } {
  if (!Array.isArray(ordersList) || ordersList.length === 0) {
    return { totalCogs: 0, totalItemsSold: 0 };
  }

  const productMap = new Map<string, any>();
  const prods = Array.isArray(productsList) && productsList.length > 0 ? productsList : getProducts();
  if (Array.isArray(prods)) {
    prods.forEach((p) => {
      if (p.id) productMap.set(String(p.id), p);
      if (p.sku_code) productMap.set(String(p.sku_code).toLowerCase(), p);
      if (p.name) productMap.set(String(p.name).trim().toLowerCase(), p);
    });
  }

  let totalCogs = 0;
  let totalItemsSold = 0;

  ordersList.forEach((order) => {
    if (order.status === "Cancelled" || order.status === "Draft") return;

    const items = (Array.isArray(order.order_items) && order.order_items.length > 0)
      ? order.order_items
      : (Array.isArray(order.items) && order.items.length > 0)
      ? order.items
      : [];

    items.forEach((item: any) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      if (qty <= 0) return;
      totalItemsSold += qty;
      const unitCost = getItemPurchaseCost(item, productMap);
      totalCogs += qty * unitCost;
    });
  });

  return {
    totalCogs: r2(totalCogs),
    totalItemsSold,
  };
}

/**
 * Deduplicates orders by ID and order_number, excluding deleted orders.
 * By default, excludes 'Draft' and 'Cancelled' orders for revenue and ledger consistency (CRIT-001).
 */
export function deduplicateOrders(
  orders: any[],
  options?: { excludeDrafts?: boolean; excludeCancelled?: boolean }
): any[] {
  if (!Array.isArray(orders)) return [];
  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const result: any[] = [];

  const shouldExcludeDrafts = options?.excludeDrafts !== false; // default true
  const shouldExcludeCancelled = options?.excludeCancelled !== false; // default true

  for (const o of orders) {
    if (!o || deletedOrderIds.has(o.id)) continue;
    const st = String(o.status || "").trim();
    if (shouldExcludeCancelled && st === "Cancelled") continue;
    if (shouldExcludeDrafts && st === "Draft") continue;

    const oId = o.id ? String(o.id).trim() : "";
    const oNum = o.order_number ? String(o.order_number).trim().toUpperCase() : "";
    if (oId && seenIds.has(oId)) continue;
    if (oNum && seenNumbers.has(oNum)) continue;

    if (oId) seenIds.add(oId);
    if (oNum) seenNumbers.add(oNum);
    result.push(o);
  }

  return result;
}

/**
 * Calculates total recognized sales revenue across non-cancelled, non-draft deduplicated orders (CRIT-001).
 */
export function calculateTotalRevenue(orders: any[]): number {
  if (!Array.isArray(orders)) return 0;
  const validOrders = deduplicateOrders(orders, { excludeDrafts: true, excludeCancelled: true });
  return r2(
    validOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0)
  );
}

/**
 * Calculates monthly sales revenue for non-cancelled, non-draft deduplicated orders (CRIT-001).
 */
export function calculateMonthlySales(orders: any[], monthPrefix?: string): number {
  if (!Array.isArray(orders)) return 0;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = monthPrefix || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const validOrders = deduplicateOrders(orders, { excludeDrafts: true, excludeCancelled: true });
  return r2(
    validOrders
      .filter(
        (o: any) => (o.order_date || o.created_at || "").slice(0, 7) === prefix
      )
      .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0)
  );
}

/**
 * Calculates daily sales revenue for non-cancelled, non-draft deduplicated orders (CRIT-001).
 */
export function calculateDailySales(orders: any[], dateStr?: string): number {
  if (!Array.isArray(orders)) return 0;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const target = dateStr || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const validOrders = deduplicateOrders(orders, { excludeDrafts: true, excludeCancelled: true });
  return r2(
    validOrders
      .filter(
        (o: any) => (o.order_date || o.created_at || "").slice(0, 10) === target
      )
      .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0)
  );
}

/**
 * BUG-020: Calculates dynamic sales return amount for an order.
 * Inspects explicit return amounts, credit notes, return flags, negative quantities, or return status.
 */
export function getOrderReturnedAmount(order: any): number {
  if (!order) return 0;
  let returned = 0;

  // 1. Explicit return / credit note fields on order
  if (order.return_amount) returned += Number(order.return_amount) || 0;
  if (order.returned_amount) returned += Number(order.returned_amount) || 0;
  if (order.credit_note_amount) returned += Number(order.credit_note_amount) || 0;

  // 2. Order items with return flags or negative quantities
  const items = order.order_items || order.items || [];
  if (Array.isArray(items)) {
    items.forEach((it: any) => {
      if (it.return_quantity && Number(it.return_quantity) > 0) {
        const uPrice = Number(it.unit_price) || 0;
        const disc = Number(it.discount) || 0;
        returned += Math.max(0, (uPrice - disc) * Number(it.return_quantity));
      } else if (it.is_return || (it.notes && it.notes.toLowerCase().includes("return"))) {
        returned += Math.abs(Number(it.subtotal) || 0);
      } else if (Number(it.quantity) < 0) {
        returned += Math.abs(Number(it.subtotal) || 0);
      }
    });
  }

  // 3. Order status is explicitly "Returned" or "Sales Return"
  const st = String(order.status || "").toLowerCase().trim();
  if (st === "returned" || st === "sales return") {
    returned = Math.max(returned, Number(order.total_amount || 0));
  }

  return r2(returned);
}

export interface OfficerCommissionDetail {
  officerId: string;
  officerName: string;
  deliveredOrdersCount: number;
  grossDeliveredSales: number;
  returnedSales: number;
  cancelledInvoicesCount: number;
  cancelledSales: number;
  netSales: number; // Gross Delivered Sales - Product Returns
  commissionRate: number; // e.g. 0.02 (2%)
  commissionAmount: number; // netSales * commissionRate
}

/**
 * BUG-020: Calculates Net Sales and Commission / Incentive per Sales Officer:
 * Net Sales = Gross Delivered Sales - Product Returns (Sales Returns) - Cancelled Invoices
 * Excludes cancelled orders from gross delivered sales and deducts all return items dynamically.
 */
export function calculateOfficerCommissions(
  ordersList: any[],
  officersList?: any[],
  options?: {
    startDate?: string;
    endDate?: string;
    commissionRate?: number; // Default 2% (0.02)
  }
): OfficerCommissionDetail[] {
  const allOrders = Array.isArray(ordersList) ? ordersList : getOrders();
  const rate = options?.commissionRate !== undefined ? options.commissionRate : 0.02;
  const sDate = options?.startDate || "";
  const eDate = options?.endDate || "";

  const inRange = (dStr: any) => {
    if (!dStr) return false;
    const d = String(dStr).slice(0, 10);
    if (sDate && d < sDate) return false;
    if (eDate && d > eDate) return false;
    return true;
  };

  const officerMap = new Map<string, {
    officerId: string;
    officerName: string;
    deliveredCount: number;
    grossDelivered: number;
    returned: number;
    cancelledCount: number;
    cancelledSales: number;
  }>();

  if (Array.isArray(officersList)) {
    officersList.forEach((o: any) => {
      const id = String(o?.id || "").trim();
      if (id) {
        officerMap.set(id, {
          officerId: id,
          officerName: o.full_name || o.name || "Sales Officer",
          deliveredCount: 0,
          grossDelivered: 0,
          returned: 0,
          cancelledCount: 0,
          cancelledSales: 0,
        });
      }
    });
  }

  allOrders.forEach((o: any) => {
    const oDate = o.order_date || o.created_at;
    if (sDate || eDate) {
      if (!inRange(oDate)) return;
    }

    const repId = String(o.sales_rep_id || o.user_id || "").trim();
    if (!repId) return;

    if (!officerMap.has(repId)) {
      const repName = o.sales_rep?.full_name || o.sales_rep_name || (o as any).created_by_name || "Sales Officer";
      officerMap.set(repId, {
        officerId: repId,
        officerName: repName,
        deliveredCount: 0,
        grossDelivered: 0,
        returned: 0,
        cancelledCount: 0,
        cancelledSales: 0,
      });
    }

    const data = officerMap.get(repId)!;
    const status = String(o.status || "").toLowerCase().trim();
    const totalAmt = Number(o.total_amount || 0);

    if (status === "cancelled") {
      data.cancelledCount += 1;
      data.cancelledSales = r2(data.cancelledSales + totalAmt);
    } else if (status === "delivered") {
      data.deliveredCount += 1;
      data.grossDelivered = r2(data.grossDelivered + totalAmt);

      const retAmt = getOrderReturnedAmount(o);
      data.returned = r2(data.returned + retAmt);
    }
  });

  return Array.from(officerMap.values())
    .map((item) => {
      const netSales = Math.max(0, r2(item.grossDelivered - item.returned));
      const commissionAmount = r2(netSales * rate);
      return {
        officerId: item.officerId,
        officerName: item.officerName,
        deliveredOrdersCount: item.deliveredCount,
        grossDeliveredSales: item.grossDelivered,
        returnedSales: item.returned,
        cancelledInvoicesCount: item.cancelledCount,
        cancelledSales: item.cancelledSales,
        netSales,
        commissionRate: rate,
        commissionAmount,
      };
    })
    .sort((a, b) => b.netSales - a.netSales);
}

export interface TransactionLedgerDetail {
  customerId?: string;
  supplierId?: string;
  orderId?: string;
  invoiceId?: string;
  paymentId?: string;
  logId?: string;
  type?: string;
}

export type GlobalStateUpdateDetail = TransactionLedgerDetail;

let crossDeviceRealtimeChannel: any = null;

function broadcastCrossDeviceRealtimeMutation(detail?: TransactionLedgerDetail) {
  try {
    if (typeof window !== "undefined" && typeof (window as any).__hamkoRealtimeBroadcast === "function") {
      void (window as any).__hamkoRealtimeBroadcast(detail);
      return;
    }
    if (!supabase?.channel) return;
    if (!crossDeviceRealtimeChannel) {
      crossDeviceRealtimeChannel = supabase.channel("hamko-cross-device-sync", {
        config: { broadcast: { self: false } },
      });
      crossDeviceRealtimeChannel.subscribe();
    }
    void crossDeviceRealtimeChannel.send({
      type: "broadcast",
      event: "erp_mutation",
      payload: { detail: detail || { type: "mutation" }, ts: Date.now() },
    });
  } catch {
    // Ignore transient websocket broadcast errors when offline
  }
}

export const dispatchGlobalStateUpdate = (detail?: TransactionLedgerDetail) => {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail }));
    if (detail?.customerId) {
      window.dispatchEvent(new CustomEvent("customer_ledger_updated", { detail }));
    }
    broadcastCrossTabSync({ detail });
    broadcastCrossDeviceRealtimeMutation(detail);
  }, 0);
};

export interface CustomerDueInfo {
  due: number;
  status: "Clear" | "Partial" | "Overdue";
  opening: number;
  billed: number;
  collected: number;
}

/**
 * Single source of truth for Customer Dues calculation across CRM, Dashboard, Accounts, and Reports.
 * Accurately tracks Opening Balance + Total Invoiced - Total Collections.
 */
export function calculateCustomerDues(
  customers: Customer[],
  orders?: any[],
  collections?: any[]
): {
  dueMap: Map<string, CustomerDueInfo>;
  totalDue: number;
} {
  const allOrders = orders !== undefined ? orders : getOrders();
  const allCols = collections !== undefined ? collections : getCollections();

  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const seenOrderIds = new Set<string>();
  const seenOrderNumbers = new Set<string>();
  const validOrders: any[] = [];
  for (const o of (Array.isArray(allOrders) ? allOrders : [])) {
    // Active confirmed orders (Pending, Approved, Delivered) debit customer dues; Draft and Cancelled are excluded
    if (!o || deletedOrderIds.has(o.id) || o.status === "Cancelled" || o.status === "Draft") continue;
    const oId = o.id ? String(o.id).trim() : "";
    const oNum = o.order_number ? String(o.order_number).trim().toUpperCase() : "";
    if (oId && seenOrderIds.has(oId)) continue;
    if (oNum && seenOrderNumbers.has(oNum)) continue;
    if (oId) seenOrderIds.add(oId);
    if (oNum) seenOrderNumbers.add(oNum);
    validOrders.push(o);
  }

  // CRIT-003: Collect Draft order IDs so unconfirmed draft order collections do not offset customer dues asymmetrically
  const draftOrderIds = new Set<string>();
  for (const o of (Array.isArray(allOrders) ? allOrders : [])) {
    if (o && o.status === "Draft" && o.id) {
      draftOrderIds.add(String(o.id).trim());
    }
  }

  const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const validCols = deduplicateCollections(
    (Array.isArray(allCols) ? allCols : []).filter((c: any) => !deletedColIds.has(c.id))
  );

  const colTotalsByCustId = new Map<string, number>();
  validCols.forEach((c: any) => {
    // Guard CRIT-003: Do not credit collections tied to an unconfirmed Draft order against customer dues
    if (c.order_id && draftOrderIds.has(String(c.order_id).trim())) {
      return;
    }
    // Exact cash amount collected plus any audited authorized settlement discount
    const amt = Number(c.amount || 0) + Number(c.settlement_discount || 0);
    const cId = String(c.customer_id || c.customer?.id || "").trim();
    if (cId) {
      colTotalsByCustId.set(cId, (colTotalsByCustId.get(cId) || 0) + amt);
    }
  });

  const orderTotalsByCustId = new Map<string, number>();
  validOrders.forEach((o: any) => {
    const amt = Number(o.total_amount || 0);
    const cId = String(o.customer_id || o.customer?.id || "").trim();
    if (cId) {
      orderTotalsByCustId.set(cId, (orderTotalsByCustId.get(cId) || 0) + amt);
    }
  });

  const dueMap = new Map<string, CustomerDueInfo>();
  let totalDue = 0;

  (Array.isArray(customers) ? customers : []).forEach((c) => {
    const opening = r2(Number((c as any)?.opening_due ?? c?.opening_balance ?? 0) || 0);
    const cId = String(c.id || "").trim();

    // Total Invoiced Amount = Sum of all Orders created for the specific customer ID (strict ID separation)
    const billed = r2(cId ? (orderTotalsByCustId.get(cId) || 0) : 0);

    // Total Collections = Sum of all Collections (amount) received from the specific customer ID (strict ID separation)
    const collected = r2(cId ? (colTotalsByCustId.get(cId) || 0) : 0);

    // Dynamic Current Due = (Opening Balance + Total Invoiced) - Total Collections
    const computedDue = Math.max(0, r2((opening + billed) - collected));

    const status: "Clear" | "Partial" | "Overdue" =
      computedDue <= 0
        ? "Clear"
        : c.due_status === "Overdue" || computedDue >= 100000
        ? "Overdue"
        : "Partial";

    dueMap.set(c.id, { due: computedDue, status, opening, billed, collected });
    totalDue = r2(totalDue + computedDue);
  });

  return { dueMap, totalDue };
}

export interface RecalculatedLedgerEntry {
  id: string;
  date: string;
  formattedDate: string;
  ref: string;
  type: "Opening" | "Order" | "Collection" | "Return" | "Payment";
  invoiceAmount: number | null;
  paymentAmount: number | null;
  runningBalance: number;
  running_balance: number;
  amount?: number;
  note: string;
  isCheque?: boolean;
  chequeInfo?: string;
  supplierId?: string;
  invoiceId?: string;
  paymentId?: string;
}

export function formatLedgerDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * User-friendly balance formatting for retailers:
 * - balance < 0: "Advance Deposit: ৳ 90,000"
 * - balance > 0: "Due: ৳ 45,221"
 * - balance === 0: "Clear / ৳ 0"
 */
export function formatLedgerBalance(balance: number, lang: "en" | "bn" = "en", pureEnglish: boolean = true): {
  text: string;
  label: string;
  type: "advance" | "due" | "clear";
  variant: "success" | "warning" | "secondary";
} {
  const rounded = r2(balance);
  if (rounded < 0) {
    const amt = formatCurrency(Math.abs(rounded));
    const text = pureEnglish || lang === "en"
      ? `Advance Deposit: ৳ ${amt}`
      : `অগ্রিম জমা: ৳ ${amt} (পাবেন)`;
    return {
      text,
      label: lang === "bn" && !pureEnglish ? "অগ্রিম জমা" : "Advance Deposit",
      type: "advance",
      variant: "success",
    };
  }
  if (rounded > 0) {
    const amt = formatCurrency(rounded);
    const text = pureEnglish || lang === "en"
      ? `Due: ৳ ${amt}`
      : `বাকি: ৳ ${amt} (দেবেন)`;
    return {
      text,
      label: lang === "bn" && !pureEnglish ? "বাকি" : "Due",
      type: "due",
      variant: "warning",
    };
  }
  return {
    text: lang === "bn" && !pureEnglish ? "পরিশোধিত / ৳ ০" : "Paid / ৳0",
    label: lang === "bn" && !pureEnglish ? "পরিশোধিত" : "Paid",
    type: "clear",
    variant: "secondary",
  };
}

export interface CustomerLedgerDetails {
  customerId: string;
  customerName: string;
  openingBalance: number;
  totalInvoiced: number; // Sum of all Orders created for the customer
  totalCollected: number; // Sum of all Collections (amount) received from the customer
  currentDue: number; // (Opening Balance + Total Invoiced) - Total Collections
  closingBalance: number;
  dueStatus: "Clear" | "Partial" | "Overdue";
  entries: RecalculatedLedgerEntry[];
  summary: {
    openingBalance: number;
    totalInvoiced: number;
    totalCollected: number;
    closingBalance: number;
    currentDue?: number;
    advanceDeposit?: number;
    totalInvoices: number;
  };
}

/**
 * Single centralized function to derive customer balance across the entire ERP:
 * - Total Invoiced Amount = Sum of all Orders created for the customer.
 * - Total Collections = Sum of all Collections (amount) received from the customer.
 * - Dynamic Current Due = (Opening Balance + Total Invoiced) - Total Collections.
 */
export function getCustomerLedgerDetails(
  customerIdOrCustomer: string | Customer | null | undefined,
  orders?: any[],
  collections?: any[],
  options?: { persist?: boolean; customers?: Customer[] }
): CustomerLedgerDetails {
  if (!customerIdOrCustomer) {
    return {
      customerId: "",
      customerName: "",
      openingBalance: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      currentDue: 0,
      closingBalance: 0,
      dueStatus: "Clear",
      entries: [],
      summary: {
        openingBalance: 0,
        totalInvoiced: 0,
        totalCollected: 0,
        closingBalance: 0,
        currentDue: 0,
        advanceDeposit: 0,
        totalInvoices: 0,
      },
    };
  }

  let customer: Customer | null = null;
  let targetId = "";
  let targetName = "";

  if (typeof customerIdOrCustomer === "string") {
    targetId = customerIdOrCustomer.trim();
    const custs = options?.customers || getCustomers();
    customer = custs.find((c: Customer) => String(c.id) === targetId || String(c.party_code || "").toLowerCase() === targetId.toLowerCase()) || null;
    if (customer) {
      targetId = String(customer.id || targetId).trim();
      targetName = String(customer.name || "").trim().toLowerCase();
    }
  } else {
    customer = customerIdOrCustomer;
    targetId = String(customer.id || "").trim();
    targetName = String(customer.name || "").trim().toLowerCase();
  }

  const allOrders = orders !== undefined ? orders : getOrders();
  const allCollections = collections !== undefined ? collections : getCollections();

  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const customerOrders = (Array.isArray(allOrders) ? allOrders : [])
    // Active confirmed orders (Pending, Approved, Delivered) debit customer ledger statements; Draft and Cancelled are excluded
    .filter((o: any) => !deletedOrderIds.has(o.id) && o.status !== "Cancelled" && o.status !== "Draft")
    .filter((o: any) => {
      const oId = String(o.customer_id || o.customer?.id || "").trim();
      if (targetId) return oId === targetId;
      const oName = String(o.customer?.name || o.customer_name || "").trim().toLowerCase();
      return Boolean(targetName && oName && oName === targetName);
    });

  const draftLedgerOrderIds = new Set<string>();
  (Array.isArray(allOrders) ? allOrders : []).forEach((o: any) => {
    if (o && o.status === "Draft" && o.id) {
      draftLedgerOrderIds.add(String(o.id).trim());
    }
  });

  const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const rawCustomerCollections = (Array.isArray(allCollections) ? allCollections : [])
    .filter((c: any) => !deletedColIds.has(c.id))
    .filter((c: any) => !c.order_id || !draftLedgerOrderIds.has(String(c.order_id).trim()))
    .filter((c: any) => {
      const cId = String(c.customer_id || c.customer?.id || "").trim();
      if (targetId) return cId === targetId;
      const cName = String(c.customer?.name || c.customer_name || "").trim().toLowerCase();
      return Boolean(targetName && cName && cName === targetName);
    });
  const customerCollections = deduplicateCollections(rawCustomerCollections);

  type RawItem = {
    id: string;
    orderId?: string;
    date: string;
    dateTimestamp: number;
    createdAt: string;
    createdAtTimestamp: number;
    ref: string;
    type: "INVOICE" | "COLLECTION" | "PAYMENT" | "RETURN";
    amount: number;
    note: string;
    isCheque?: boolean;
    chequeInfo?: string;
  };

  const rawItems: RawItem[] = [];

  customerOrders.forEach((o) => {
    const orderDateStr = o.order_date || o.created_at || new Date().toISOString();
    const orderDateObj = new Date(orderDateStr);
    const dateTimestamp = isNaN(orderDateObj.getTime()) ? 0 : orderDateObj.getTime();

    const createdAtStr = o.created_at || orderDateStr;
    const createdAtObj = new Date(createdAtStr);
    const createdAtTimestamp = isNaN(createdAtObj.getTime()) ? dateTimestamp : createdAtObj.getTime();

    let orderNote =
      o.notes && String(o.notes).trim() && String(o.notes).trim() !== "undefined"
        ? String(o.notes).trim()
        : "";

    if (!orderNote) {
      const items = o.order_items || (o as any).items;
      if (Array.isArray(items) && items.length > 0) {
        const summaries = items
          .map((it: any) => {
            const pName = it.product?.name || it.product_name || "";
            const qty = it.quantity ? `${it.quantity}P` : "";
            return pName ? (qty ? `${pName}-${qty}` : pName) : "";
          })
          .filter(Boolean);
        if (summaries.length > 0) orderNote = summaries.slice(0, 3).join(", ");
      }
    }
    if (!orderNote) orderNote = o.order_number || "Invoice";

    rawItems.push({
      id: o.id,
      orderId: String(o.id || ""),
      date: orderDateStr,
      dateTimestamp,
      createdAt: createdAtStr,
      createdAtTimestamp,
      ref: o.order_number || `ORD-${String(o.id).slice(0, 8)}`,
      type: "INVOICE",
      amount: Number(o.total_amount || 0),
      note: orderNote,
    });
  });

  customerCollections.forEach((c) => {
    const colDateStr = c.collection_date || c.created_at || new Date().toISOString();
    const colDateObj = new Date(colDateStr);
    const dateTimestamp = isNaN(colDateObj.getTime()) ? 0 : colDateObj.getTime();

    const createdAtStr = c.created_at || colDateStr;
    const createdAtObj = new Date(createdAtStr);
    const createdAtTimestamp = isNaN(createdAtObj.getTime()) ? dateTimestamp : createdAtObj.getTime();

    const chequeNo = (c.cheque_no || c.cheque_number || (c as any).chequeNo || "").trim();
    const bank = (c.bank_name || (c as any).bankName || "").trim();
    const branch = (c.branch_name || (c as any).branchName || "").trim();

    const isCheque =
      c.payment_method === "Cheque / Check" ||
      c.payment_method === "Cheque" ||
      c.payment_method === "Bank Cheque" ||
      Boolean(chequeNo || bank);

    let chequeDesc = "";
    if (isCheque && (chequeNo || bank)) {
      const bankDetails = [bank, branch ? `${branch} Br.` : ""].filter(Boolean).join(", ");
      chequeDesc = chequeNo
        ? (bankDetails ? `Cheque No: #${chequeNo}, ${bankDetails}` : `Cheque No: #${chequeNo}`)
        : bankDetails;
    }

    let colNote =
      c.notes && String(c.notes).trim() && String(c.notes).trim() !== "undefined"
        ? String(c.notes).trim()
        : "";

    if (chequeDesc) {
      if (!colNote) {
        colNote = chequeDesc;
      } else if (!colNote.includes(chequeDesc) && !colNote.includes(chequeNo)) {
        colNote = `${chequeDesc} · ${colNote}`;
      }
    } else if (c.payment_method) {
      if (!colNote.toLowerCase().includes(c.payment_method.toLowerCase())) {
        colNote = colNote
          ? `${c.payment_method} - ${colNote}`
          : `${c.payment_method} Collection`;
      }
    }
    if (!colNote || colNote === "undefined") colNote = "Cash Collection";

    rawItems.push({
      id: c.id,
      orderId: c.order_id ? String(c.order_id) : undefined,
      date: colDateStr,
      dateTimestamp,
      createdAt: createdAtStr,
      createdAtTimestamp,
      ref: c.collection_number || `COL-${String(c.id).slice(0, 8)}`,
      type: "COLLECTION",
      amount: Number(c.amount || 0) + Number(c.settlement_discount || 0),
      note: colNote,
      isCheque,
      chequeInfo: chequeDesc || undefined,
    });
  });

  // BUG-014: Multi-tier deterministic sort order:
  // 1. Linked Order & Collection: Linked Invoice always precedes its linked payment
  // 2. Primary: Date/Timestamp ascending (normalized to Unix epoch ms via new Date(x.date).getTime())
  // 3. Secondary (if dates match): Explicit entry type order (Opening -> INVOICE -> PAYMENT/COLLECTION/RETURN)
  // 4. Tertiary: Created Timestamp ascending
  // 5. Stable tiebreaker: ID ascending
  const getTypeRank = (t: string) => {
    const upper = (t || "").toUpperCase();
    if (upper === "OPENING" || upper === "OPENING BALANCE") return 0;
    if (upper === "INVOICE" || upper === "ORDER") return 1;
    if (upper === "PAYMENT" || upper === "COLLECTION" || upper === "RETURN") return 2;
    return 3;
  };

  rawItems.sort((a, b) => {
    // 0. If an Invoice and Collection share the same order ID or reference, INVOICE ALWAYS GOES FIRST
    const isOrderAndPaymentForSameOrderAtoB =
      a.type === "INVOICE" &&
      (b.type === "COLLECTION" || b.type === "PAYMENT") &&
      Boolean(b.orderId && (b.orderId === a.id || b.orderId === a.orderId || b.orderId === a.ref));
    if (isOrderAndPaymentForSameOrderAtoB) return -1;

    const isOrderAndPaymentForSameOrderBtoA =
      (a.type === "COLLECTION" || a.type === "PAYMENT") &&
      b.type === "INVOICE" &&
      Boolean(a.orderId && (a.orderId === b.id || a.orderId === b.orderId || a.orderId === b.ref));
    if (isOrderAndPaymentForSameOrderBtoA) return 1;

    // 1. Primary sort: Date/Timestamp ascending (Unix epoch ms)
    const timeA = new Date(a.date).getTime() || a.dateTimestamp || 0;
    const timeB = new Date(b.date).getTime() || b.dateTimestamp || 0;
    const dayA = a.date ? a.date.slice(0, 10) : "";
    const dayB = b.date ? b.date.slice(0, 10) : "";

    // If different calendar days, sort strictly by date
    if (dayA && dayB && dayA !== dayB) {
      return timeA - timeB || dayA.localeCompare(dayB);
    }

    // 2. Secondary sort (if dates match): explicit entry type order (Invoice before Payment)
    const rankDiff = getTypeRank(a.type) - getTypeRank(b.type);
    if (rankDiff !== 0) return rankDiff;

    // 3. Within same day and same type: Creation timestamp ascending
    const createTimeA = a.createdAtTimestamp || timeA;
    const createTimeB = b.createdAtTimestamp || timeB;
    if (createTimeA !== createTimeB) {
      return createTimeA - createTimeB;
    }

    // 4. Stable tiebreaker: ID ascending
    return (a.id || "").localeCompare(b.id || "");
  });

  const openingBalance = r2(
    Number(
      (customer as any)?.opening_due ??
      customer?.opening_balance ??
      0
    ) || 0
  );

  let balance = openingBalance;
  let totalInvoiced = 0;
  let totalCollected = 0;

  const entries: RecalculatedLedgerEntry[] = [];

  if (openingBalance !== 0) {
    entries.push({
      id: "opening-entry",
      date: customer?.created_at || new Date().toISOString(),
      formattedDate: formatLedgerDate(customer?.created_at || new Date().toISOString()),
      ref: "OPENING BALANCE",
      type: "Opening",
      invoiceAmount: openingBalance > 0 ? openingBalance : null,
      paymentAmount: openingBalance < 0 ? Math.abs(openingBalance) : null,
      runningBalance: balance,
      running_balance: balance,
      amount: Math.abs(openingBalance),
      note: openingBalance > 0 ? "Opening Due Balance" : "Opening Advance Balance",
    });
  }

  // BUG-014: Sequentially calculate running_balance AFTER sorting the consolidated timeline
  for (const item of rawItems) {
    if (item.type === "INVOICE") {
      const invAmt = r2(item.amount);
      balance = r2(balance + invAmt);
      totalInvoiced = r2(totalInvoiced + invAmt);

      entries.push({
        id: item.id,
        date: item.date,
        formattedDate: formatLedgerDate(item.date),
        ref: item.ref,
        type: "Order",
        invoiceAmount: invAmt,
        paymentAmount: null,
        amount: invAmt,
        runningBalance: balance,
        running_balance: balance,
        note: item.note,
      });
    } else {
      const payAmt = r2(item.amount);
      balance = r2(balance - payAmt);
      totalCollected = r2(totalCollected + payAmt);

      entries.push({
        id: item.id,
        date: item.date,
        formattedDate: formatLedgerDate(item.date),
        ref: item.ref,
        type: item.type === "RETURN" ? "Return" : "Collection",
        invoiceAmount: null,
        paymentAmount: payAmt,
        amount: payAmt,
        runningBalance: balance,
        running_balance: balance,
        note: item.note,
        isCheque: item.isCheque,
        chequeInfo: item.chequeInfo,
      });
    }
  }

  // Dynamic Current Due = (Opening Balance + Total Invoiced) - Total Collections
  const closingBalance = r2((openingBalance + totalInvoiced) - totalCollected);
  const currentDue = Math.max(0, closingBalance);
  const dueStatus: "Clear" | "Partial" | "Overdue" =
    currentDue <= 0
      ? "Clear"
      : currentDue >= 100000 || (customer as any)?.due_status === "Overdue"
      ? "Overdue"
      : "Partial";

  // Auto-persist to localStorage and dispatch global state event ONLY when explicitly requested
  if (options?.persist === true && typeof window !== "undefined" && targetId) {
    try {
      const parsed = getLocalData<any[]>(STORAGE_KEYS.CUSTOMERS, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        const next = parsed.map((c: any) => {
          if (String(c.id) === targetId || (targetName && String(c.name || "").trim().toLowerCase() === targetName)) {
            modified = true;
            return {
              ...c,
              current_due: currentDue,
              currentDue: currentDue,
              due_status: dueStatus,
              updated_at: new Date().toISOString(),
            };
          }
          return c;
        });
        if (modified) {
          setLocalData(STORAGE_KEYS.CUSTOMERS, next);
          dispatchGlobalStateUpdate({ customerId: targetId, type: "customer_ledger_updated" });
        }
      }
      // Background Supabase sync
      supabase
        .from("customers")
        .update({ current_due: currentDue, due_status: dueStatus })
        .eq("id", targetId)
        .then(undefined, (err) => console.warn("Customer due sync notice:", err));
    } catch (e) {
      console.warn("Error updating customer due in storage:", e);
    }
  }

  return {
    customerId: targetId,
    customerName: customer?.name || "",
    openingBalance,
    totalInvoiced,
    totalCollected,
    currentDue,
    closingBalance,
    dueStatus,
    entries,
    summary: {
      openingBalance,
      totalInvoiced,
      totalCollected,
      closingBalance,
      currentDue,
      advanceDeposit: closingBalance < 0 ? Math.abs(closingBalance) : 0,
      totalInvoices: customerOrders.length,
    },
  };
}

export const recalculateCustomerLedger = getCustomerLedgerDetails;

/**
 * BUG-014: Deterministic multi-tier chronological sorting and sequential running balance calculation.
 * Normalizes all timestamps to Unix epoch milliseconds (new Date(entry.date).getTime()), sorts entries
 * stably (Date ASC -> Explicit Entry Type Order -> ID ASC), and recalculates running balance sequentially.
 */
export function sortAndCalculateCustomerLedger<T extends {
  id: string;
  date: string;
  type?: string;
  amount?: number;
  invoiceAmount?: number | null;
  paymentAmount?: number | null;
  [key: string]: any;
}>(
  openingBalance: number,
  combinedEntries: T[]
): (T & { running_balance: number; runningBalance: number })[] {
  let balance = r2(Number(openingBalance) || 0);

  const getTypeRank = (t?: string) => {
    const upper = (t || "").toUpperCase();
    if (upper === "OPENING" || upper === "OPENING BALANCE") return 0;
    if (upper === "INVOICE" || upper === "ORDER") return 1;
    if (upper === "PAYMENT" || upper === "COLLECTION" || upper === "RETURN") return 2;
    return 3;
  };

  const sorted = [...combinedEntries].sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    const dayA = a.date ? String(a.date).slice(0, 10) : "";
    const dayB = b.date ? String(b.date).slice(0, 10) : "";

    if (dayA && dayB && dayA !== dayB) {
      return timeA - timeB || dayA.localeCompare(dayB);
    }

    const rankDiff = getTypeRank(a.type) - getTypeRank(b.type);
    if (rankDiff !== 0) return rankDiff;

    return (timeA - timeB) || (String(a.id || "")).localeCompare(String(b.id || ""));
  });

  return sorted.map((entry) => {
    const upper = (entry.type || "").toUpperCase();
    const invAmt = entry.invoiceAmount !== undefined && entry.invoiceAmount !== null
      ? Number(entry.invoiceAmount)
      : (upper === "INVOICE" || upper === "ORDER" ? Number(entry.amount || 0) : 0);
    const payAmt = entry.paymentAmount !== undefined && entry.paymentAmount !== null
      ? Number(entry.paymentAmount)
      : (upper === "PAYMENT" || upper === "COLLECTION" || upper === "RETURN" ? Number(entry.amount || 0) : 0);

    if (upper === "INVOICE" || upper === "ORDER") {
      balance = r2(balance + invAmt);
    } else if (upper === "PAYMENT" || upper === "COLLECTION" || upper === "RETURN") {
      balance = r2(balance - payAmt);
    } else if (upper === "OPENING") {
      // Opening balance already set as baseline
    } else if (invAmt > 0) {
      balance = r2(balance + invAmt);
    } else if (payAmt > 0) {
      balance = r2(balance - payAmt);
    }

    return {
      ...entry,
      running_balance: balance,
      runningBalance: balance,
    };
  });
}

/**
 * Updates a customer's live balance in local store, dispatches global sync events,
 * and syncs to Supabase. Returns the recalculated balance and fresh customer object.
 */
export function updateCustomerBalance(
  customerId: string,
  orders?: any[],
  collections?: any[]
): { currentDue: number; dueStatus: string; customer?: Customer } {
  const result = recalculateCustomerLedger(customerId, orders, collections, { persist: true });
  const customers = getCustomers();
  const updatedCust = customers.find((c) => String(c.id) === String(customerId));
  dispatchGlobalStateUpdate({ customerId, type: "customer_ledger_updated" });
  return { currentDue: result.currentDue, dueStatus: result.dueStatus, customer: updatedCust };
}

/**
 * Returns latest fresh customers from storage and triggers customer synchronization.
 */
export function refreshCustomers(): Customer[] {
  const custs = getCustomers();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sales_erp_storage_update"));
    window.dispatchEvent(new Event("storage"));
  }
  return custs;
}

// ==========================================
// SUPPLIER PROCUREMENT & SUPPLIER LEDGER
// ==========================================

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: "sup-hamko-01",
    name: "HAMKO Industries Ltd.",
    company_name: "HAMKO Industries Ltd. (Cookware Unit)",
    phone: "01711-555666",
    email: "procurement@hamko.com.bd",
    address: "HAMKO Tower, Banglamotor, Dhaka - 1000",
    contact_person: "Engr. Rafiqul Islam (Senior AGM - Supply)",
    opening_balance: 0,
    current_payable: 0,
    notes: "Primary supplier for Aluminum & Non-stick Cookware, Pressure Cookers, and Kitchenware",
    created_at: new Date().toISOString(),
  }
];

/**
 * Retrieves all registered suppliers. Filters strictly for valid active suppliers
 * (defaults strictly to HAMKO Industries Ltd., removing blank entries and obsolete test suppliers).
 */
export function getSuppliers(): Supplier[] {
  const list = getLocalData<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  const safeList: Supplier[] = Array.isArray(list) ? list : [];
  // Filter out any blank, invalid, or legacy test suppliers (e.g. Swarna Metal)
  const valid = safeList.filter(
    (s: Supplier) =>
      s &&
      s.name &&
      s.name.trim().length > 0 &&
      !s.name.toLowerCase().includes("swarna metal") &&
      s.name.toLowerCase().includes("hamko")
  );
  if (valid.length === 0) {
    setLocalData(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    return DEFAULT_SUPPLIERS;
  }
  // If corrupted or test suppliers were present, sync cleaned list back to local storage
  if (valid.length !== safeList.length) {
    setLocalData(STORAGE_KEYS.SUPPLIERS, valid);
  }
  return valid;
}

/**
 * Maps supplier payments against purchase invoices:
 * 1. Matches payments specifically linked to invoice_id, chalan_id, or invoice reference number.
 * 2. Sequential FIFO allocation for general/account-level payments to the oldest unpaid invoices.
 * 3. Accurately updates Paid (৳), Due / Payable (৳), and status badge (Paid, Partially Paid, Received).
 */
export function calculateInvoicesWithPayments(
  invoices: PurchaseInvoice[],
  payments: SupplierPayment[]
): PurchaseInvoice[] {
  if (!Array.isArray(invoices) || invoices.length === 0) return [];
  const safePayments = Array.isArray(payments) ? payments : [];

  // Group invoices by supplier
  const supplierGroups = new Map<string, PurchaseInvoice[]>();
  invoices.forEach((inv) => {
    const sId = inv.supplier_id || "default";
    if (!supplierGroups.has(sId)) supplierGroups.set(sId, []);
    supplierGroups.get(sId)!.push(inv);
  });

  const updatedInvoiceMap = new Map<string, PurchaseInvoice>();

  supplierGroups.forEach((supInvoices, supplierId) => {
    const supPayments = safePayments.filter(
      (p) => p && p.supplier_id === supplierId && Number(p.amount) > 0
    );

    // Track allocated paid amounts per invoice ID
    const allocatedPaidMap = new Map<string, number>();
    supInvoices.forEach((inv) => allocatedPaidMap.set(inv.id, 0));

    const generalPayments: SupplierPayment[] = [];

    // Step 1: Specifically linked payments (by invoice_id, chalan_id, or reference_no)
    supPayments.forEach((pay) => {
      const targetInvoice = supInvoices.find((inv) => {
        if (pay.invoice_id && (pay.invoice_id === inv.id || pay.invoice_id === inv.invoice_number)) return true;
        if (pay.chalan_id && (pay.chalan_id === inv.id || pay.chalan_id === inv.invoice_number)) return true;
        if (
          pay.reference_no &&
          pay.reference_no.trim() !== "" &&
          (pay.reference_no.trim() === inv.invoice_number.trim() || pay.reference_no.trim() === inv.id)
        ) {
          return true;
        }
        return false;
      });

      if (targetInvoice) {
        const prev = allocatedPaidMap.get(targetInvoice.id) || 0;
        allocatedPaidMap.set(targetInvoice.id, r2(prev + Number(pay.amount || 0)));
      } else {
        generalPayments.push(pay);
      }
    });

    // Baseline fallback: if invoice has paid_amount > 0 recorded at creation and no linked payments matched it
    supInvoices.forEach((inv) => {
      const currentAllocated = allocatedPaidMap.get(inv.id) || 0;
      if (currentAllocated === 0 && Number(inv.paid_amount) > 0) {
        allocatedPaidMap.set(inv.id, r2(Math.min(Number(inv.total_amount || 0), Number(inv.paid_amount || 0))));
      }
    });

    // Step 2: Sort general payments chronologically (FIFO by payment_date, then created_at)
    generalPayments.sort((a, b) => {
      const dateA = new Date(a.payment_date || a.created_at).getTime();
      const dateB = new Date(b.payment_date || b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    // Step 3: Sort invoices chronologically (FIFO: oldest invoice first)
    const fifoInvoices = [...supInvoices].sort((a, b) => {
      const dateA = new Date(a.invoice_date || a.created_at).getTime();
      const dateB = new Date(b.invoice_date || b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    // Step 4: Auto-allocate general payments sequentially (FIFO) to oldest unpaid purchase invoices
    generalPayments.forEach((pay) => {
      let unallocated = Number(pay.amount) || 0;
      for (const inv of fifoInvoices) {
        if (unallocated <= 0) break;
        const total = r2(Number(inv.total_amount) || 0);
        const currentPaid = allocatedPaidMap.get(inv.id) || 0;
        const due = r2(Math.max(0, total - currentPaid));

        if (due > 0) {
          const applied = r2(Math.min(unallocated, due));
          allocatedPaidMap.set(inv.id, r2(currentPaid + applied));
          unallocated = r2(unallocated - applied);
        }
      }
    });

    // Step 5: Construct updated invoice structures
    supInvoices.forEach((inv) => {
      const total = r2(Number(inv.total_amount) || 0);
      const paid = r2(allocatedPaidMap.get(inv.id) || 0);
      const due = r2(Math.max(0, total - paid));
      let status: InvoiceStatus = inv.status;

      if (due <= 0 && total > 0) {
        status = "Paid";
      } else if (paid > 0 && due > 0) {
        status = "Partially Paid";
      } else if (total > 0 && paid === 0) {
        status = "Received";
      }

      updatedInvoiceMap.set(inv.id, {
        ...inv,
        paid_amount: paid,
        due_amount: due,
        status,
      });
    });
  });

  return invoices.map((inv) => updatedInvoiceMap.get(inv.id) || inv);
}

/**
 * Retrieves all purchase invoices with auto-calculated paid and due amounts reflecting all supplier payments.
 */
export function getPurchaseInvoices(): PurchaseInvoice[] {
  const list = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const safeList = Array.isArray(list) ? list : [];
  const payments = getSupplierPayments();
  return calculateInvoicesWithPayments(safeList, payments);
}

/**
 * Calculates the next sequential payment voucher number in PAY-XXXX format (e.g., PAY-0001, PAY-0002).
 * Utilizes the collision-free generateSupplierVoucherNumber helper.
 */
export function getNextSupplierPaymentNumber(): string {
  return generateSupplierVoucherNumber();
}

/**
 * Retrieves all supplier payment records.
 * Automatically normalizes legacy payment references to standard PAY-XXXX sequence
 * while preserving Cheque No and Bank Txn ID in dedicated fields.
 */
export function getSupplierPayments(): SupplierPayment[] {
  const list = getLocalData<SupplierPayment[]>(STORAGE_KEYS.SUPPLIER_PAYMENTS, []);
  if (!Array.isArray(list)) return [];

  let needsSync = false;
  const nonDebit = list.filter(
    (p) => p && p.payment_type !== "Debit Note" && !p.reference_no?.startsWith("DN-")
  );

  // Check if normalization is needed (e.g. random timestamps like PAY-790875 or missing PAY-XXXX)
  nonDebit.forEach((p) => {
    const match = (p.payment_number || "").match(/^PAY-\d{4}$/i);
    if (!match) {
      needsSync = true;
    }
  });

  if (needsSync && typeof window !== "undefined" && window.localStorage) {
    // Re-index non-debit payments chronologically so historical entries get stable PAY-0001, PAY-0002...
    const sortedNonDebit = [...nonDebit].sort((a, b) => {
      const tA = new Date(a.payment_date || a.created_at).getTime();
      const tB = new Date(b.payment_date || b.created_at).getTime();
      if (tA !== tB) return tA - tB;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    const normalizedMap = new Map<string, SupplierPayment>();
    sortedNonDebit.forEach((p, idx) => {
      const seqStr = `PAY-${String(idx + 1).padStart(4, "0")}`;
      let finalTxnId = p.transaction_id;
      let finalChequeNo = p.cheque_no;

      if (p.reference_no && !p.reference_no.startsWith("PAY-") && !p.reference_no.startsWith("DN-")) {
        if (p.payment_mode === "Cheque" && !finalChequeNo) {
          finalChequeNo = p.reference_no;
        } else if (!finalTxnId) {
          finalTxnId = p.reference_no;
        }
      }

      normalizedMap.set(p.id, {
        ...p,
        payment_number: seqStr,
        reference_no: seqStr,
        transaction_id: finalTxnId || p.transaction_id || null,
        cheque_no: finalChequeNo || p.cheque_no || null,
      });
    });

    const updatedList = list.map((p) => normalizedMap.get(p.id) || p);
    setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, updatedList);
    return updatedList;
  }

  return list;
}

/**
 * Retrieves all procurement and payment audit logs.
 */
export function getProcurementAuditLogs(): ProcurementAuditLog[] {
  const logs = getLocalData<ProcurementAuditLog[]>(STORAGE_KEYS.PROCUREMENT_AUDIT_LOGS, []);
  return Array.isArray(logs) ? logs : [];
}

/**
 * Appends a new audit record for tracking changes in procurement/supplier ledger.
 */
export function logProcurementAudit(
  entry: Omit<ProcurementAuditLog, "id" | "timestamp"> & { id?: string; timestamp?: string }
): ProcurementAuditLog {
  const logs = getProcurementAuditLogs();
  const newLog: ProcurementAuditLog = {
    id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    reference: entry.reference ?? "N/A",
    supplier_name: entry.supplier_name,
    user: entry.user || "Admin / User",
    details: entry.details,
    amount: entry.amount,
    metadata: entry.metadata,
  };

  // Keep most recent 500 audit logs
  setLocalData(STORAGE_KEYS.PROCUREMENT_AUDIT_LOGS, [newLog, ...logs].slice(0, 500));
  dispatchGlobalStateUpdate({ type: "audit_log_created", logId: newLog.id });
  return newLog;
}

/**
 * Clears procurement audit logs.
 */
export function clearProcurementAuditLogs(): void {
  setLocalData(STORAGE_KEYS.PROCUREMENT_AUDIT_LOGS, []);
  dispatchGlobalStateUpdate({ type: "audit_logs_cleared" });
}

/**
 * Adds or updates a Supplier.
 */
export function saveSupplier(supplierData: Partial<Supplier> & { name: string }): Supplier {
  const suppliers = getSuppliers();
  const now = new Date().toISOString();
  let savedSupplier: Supplier;
  const isUpdate = Boolean(supplierData.id);

  if (supplierData.id) {
    savedSupplier = {
      ...suppliers.find((s) => s.id === supplierData.id)!,
      ...supplierData,
      updated_at: now,
    };
    const updated = suppliers.map((s) => (s.id === savedSupplier.id ? savedSupplier : s));
    setLocalData(STORAGE_KEYS.SUPPLIERS, updated);
  } else {
    const newId = crypto.randomUUID ? crypto.randomUUID() : `sup-${Date.now()}`;
    savedSupplier = {
      id: newId,
      name: supplierData.name.trim(),
      company_name: supplierData.company_name?.trim() || null,
      phone: supplierData.phone?.trim() || null,
      email: supplierData.email?.trim() || null,
      address: supplierData.address?.trim() || null,
      contact_person: supplierData.contact_person?.trim() || null,
      opening_balance: Number(supplierData.opening_balance) || 0,
      current_payable: Number(supplierData.current_payable ?? supplierData.opening_balance) || 0,
      notes: supplierData.notes?.trim() || null,
      created_at: now,
      updated_at: now,
    };
    setLocalData(STORAGE_KEYS.SUPPLIERS, [savedSupplier, ...suppliers]);
  }

  // Audit Log
  logProcurementAudit({
    action: isUpdate ? "UPDATE_SUPPLIER" : "CREATE_SUPPLIER",
    entity_type: "Supplier",
    entity_id: savedSupplier.id,
    reference: savedSupplier.name,
    supplier_name: savedSupplier.name,
    user: "Admin",
    details: isUpdate
      ? `Updated supplier details for ${savedSupplier.name}${savedSupplier.phone ? ` (Phone: ${savedSupplier.phone})` : ""}`
      : `Created new supplier ${savedSupplier.name} with initial opening balance ৳${savedSupplier.opening_balance || 0}`,
    amount: savedSupplier.opening_balance,
  });

  dispatchGlobalStateUpdate({ type: "supplier_updated", supplierId: savedSupplier.id });
  return savedSupplier;
}

/**
 * Saves a new Purchase Invoice:
 * 1. Inserts the Purchase Invoice with frozen immutable line-item rates.
 * 2. Increments inventory stock for each product.
 * 3. Logs "Stock In" warehouse transactions for traceability.
 * 4. Adds to Supplier's current payable balance.
 */
export function savePurchaseInvoice(
  invoiceData: Omit<PurchaseInvoice, "id" | "created_at" | "updated_at"> & { id?: string }
): PurchaseInvoice {
  const invoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const now = new Date().toISOString();
  const invoiceId = invoiceData.id || (crypto.randomUUID ? crypto.randomUUID() : `pi-${Date.now()}`);
  const invoiceNumber = invoiceData.invoice_number?.trim() || generatePurchaseInvoiceNumber(invoices);

  // Idempotency guard: prevent duplicate purchase invoice entries and double stock increments
  const existingInvoice = invoices.find(
    (i) => (invoiceId && i.id === invoiceId) || (invoiceNumber && i.invoice_number?.trim().toUpperCase() === invoiceNumber.toUpperCase())
  );
  if (existingInvoice) {
    console.warn(`Idempotency guard: Purchase invoice ${invoiceNumber} already recorded.`);
    return existingInvoice;
  }

  const totalAmount = r2(invoiceData.total_amount || 0);
  const paidAmount = r2(invoiceData.paid_amount || 0);
  const dueAmount = r2(Math.max(0, totalAmount - paidAmount));

  const newInvoice: PurchaseInvoice = {
    ...invoiceData,
    id: invoiceId,
    invoice_number: invoiceNumber,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    status: dueAmount <= 0 && totalAmount > 0 ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Received",
    created_at: now,
    updated_at: now,
  };

  // 1. Save invoice
  setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, [newInvoice, ...invoices]);

  // 2. Increment stock quantity for each line item in Product Inventory & Warehouse (Single source of truth)
  if (Array.isArray(newInvoice.items) && newInvoice.items.length > 0) {
    const existingTransactions = getLocalData<any>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTransactions: any[] = [];
    const whName = (newInvoice as any).warehouse || "Main Warehouse";

    newInvoice.items.forEach((item) => {
      const qty = Math.max(1, Math.round(Number(item.quantity) || 1));

      // Single source of truth: adjustProductStock updates products, warehouse inventory, and Supabase
      adjustProductStock(item.product_id, qty, whName);

      newTransactions.push({
        id: `stx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: item.product_id,
        transaction_type: "Stock In",
        quantity: qty,
        from_warehouse: `Supplier: ${newInvoice.supplier_name}`,
        to_warehouse: whName,
        reference: newInvoice.invoice_number,
        notes: `Procurement Chalan ${newInvoice.invoice_number} - ${item.product_name} (${qty} pcs @ ${formatCurrency(item.purchase_rate)})`,
        transaction_date: newInvoice.invoice_date || now,
        created_at: now,
      });
    });

    setLocalData(STORAGE_KEYS.TRANSACTIONS, [...newTransactions, ...existingTransactions]);

    // Background sync stock transactions to Supabase
    try {
      const dbTxPayload = newTransactions.map((tx: any) => ({
        product_id: tx.product_id,
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        from_warehouse: tx.from_warehouse,
        to_warehouse: tx.to_warehouse,
        reference: tx.reference,
        notes: tx.notes,
        transaction_date: tx.transaction_date,
      }));
      supabase
        .from("stock_transactions")
        .insert(dbTxPayload)
        .then(undefined, (err) => console.warn("Supabase stock_transactions insert notice:", err));
    } catch (err) {
      console.warn("Supabase stock tx error:", err);
    }
  }

  // 3. Add to Supplier's current payable balance
  const suppliers = getSuppliers();
  const supplierIndex = suppliers.findIndex((s) => s.id === newInvoice.supplier_id);
  if (supplierIndex >= 0) {
    const sup = suppliers[supplierIndex];
    const prevPayable = Number(sup.current_payable || 0);
    // Net payable increase is the invoice amount minus any immediate payment made upon purchase
    const newPayable = r2(prevPayable + dueAmount);
    suppliers[supplierIndex] = {
      ...sup,
      current_payable: newPayable,
      updated_at: now,
    };
    setLocalData(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  // If immediate payment was made with invoice, record supplier payment as well
  if (paidAmount > 0) {
    const paymentId = crypto.randomUUID ? crypto.randomUUID() : `spay-${Date.now()}`;
    const nextPayNum = getNextSupplierPaymentNumber();
    const paymentRecord: SupplierPayment = {
      id: paymentId,
      payment_number: nextPayNum,
      supplier_id: newInvoice.supplier_id,
      supplier_name: newInvoice.supplier_name,
      amount: paidAmount,
      payment_mode: "Cash",
      reference_no: nextPayNum,
      payment_date: newInvoice.invoice_date || now,
      notes: `Advance/Initial payment on Chalan ${newInvoice.invoice_number}`,
      created_at: now,
      invoice_id: invoiceId,
      chalan_id: invoiceId,
    };
    const payments = getSupplierPayments();
    setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, [paymentRecord, ...payments]);
    recordSupplierPaymentExpense(paymentRecord);
  }

  // Audit Log
  logProcurementAudit({
    action: "CREATE_INVOICE",
    entity_type: "Invoice",
    entity_id: newInvoice.id,
    reference: newInvoice.invoice_number,
    supplier_name: newInvoice.supplier_name,
    user: "Admin",
    details: `Created Purchase Chalan ${newInvoice.invoice_number} (${newInvoice.items?.length || 0} line items) for ৳${newInvoice.total_amount}. Due: ৳${newInvoice.due_amount}`,
    amount: newInvoice.total_amount,
    metadata: {
      itemsCount: newInvoice.items?.length || 0,
      paidAmount: newInvoice.paid_amount,
      dueAmount: newInvoice.due_amount,
    },
  });

  dispatchGlobalStateUpdate({ type: "purchase_invoice_created", invoiceId });
  return newInvoice;
}

/**
 * Records a Cash Outflow / Expense entry in central Cash Book & Expenses for a Supplier Payment.
 */
export function recordSupplierPaymentExpense(payment: SupplierPayment): Expense | null {
  const isDebitNote =
    payment.payment_type === "Debit Note" ||
    payment.payment_mode === "Debit Note" ||
    (payment.reference_no && payment.reference_no.startsWith("DN-"));

  if (isDebitNote) return null;

  const amount = r2(Number(payment.amount) || 0);
  if (amount <= 0) return null;

  const expenseId = `exp-spay-${payment.id}`;
  const now = new Date().toISOString();
  const dateVal = payment.payment_date || (payment.created_at ? payment.created_at.slice(0, 10) : now.slice(0, 10));
  const voucherRef = payment.payment_number || payment.reference_no || `PAY-${String(payment.id).slice(0, 6)}`;
  const supplierName = payment.supplier_name || "Supplier";
  const desc = `Supplier Payment - ${supplierName} (${voucherRef})`;
  const notes = payment.notes
    ? `${payment.notes} (Mode: ${payment.payment_mode || "Cash"})`
    : `Payment via ${payment.payment_mode || "Cash"}${payment.bank_name ? ` - ${payment.bank_name}` : ""}${payment.cheque_no ? ` [Chq: ${payment.cheque_no}]` : ""}`;

  const expenseRecord: Expense = {
    id: expenseId,
    category: "Supplier Payment",
    description: desc,
    amount: amount,
    expense_date: dateVal,
    recorded_by: "Admin",
    notes: notes,
    created_at: payment.created_at || now,
  };

  const existingExpenses = getExpenses();
  const filtered = existingExpenses.filter(
    (e) => e.id !== expenseId && e.description !== desc
  );
  const updatedExpenses = [expenseRecord, ...filtered];
  setLocalData(STORAGE_KEYS.EXPENSES, updatedExpenses);

  // Background persistence to Supabase
  try {
    supabase
      .from("expenses")
      .upsert(
        {
          id: expenseId,
          category: expenseRecord.category,
          description: expenseRecord.description,
          amount: expenseRecord.amount,
          expense_date: expenseRecord.expense_date,
          notes: expenseRecord.notes,
          created_at: expenseRecord.created_at,
        },
        { onConflict: "id" }
      )
      .then(undefined, (err) => console.warn("Notice syncing supplier payment expense to Supabase:", err));
  } catch (err) {
    console.warn("Notice: Exception syncing supplier payment expense to Supabase:", err);
  }

  return expenseRecord;
}

/**
 * Checks whether an expense record represents a supplier procurement payment.
 */
export function isSupplierPaymentExpense(expense?: any | null): boolean {
  if (!expense) return false;
  const cat = String(expense.category || "").trim().toLowerCase();
  const idStr = String(expense.id || "");
  const desc = String(expense.description || "").toLowerCase();
  return (
    cat === "supplier payment" ||
    cat === "supplier payments" ||
    cat.includes("supplier payment") ||
    idStr.startsWith("exp-spay-") ||
    desc.startsWith("supplier payment")
  );
}

/**
 * Ensures all non-debit-note supplier payments have a corresponding cash outflow entry in Expenses.
 */
export function syncSupplierPaymentsToExpenses(currentExpenses?: Expense[]): Expense[] {
  const exps = currentExpenses && currentExpenses.length > 0 ? [...currentExpenses] : getExpenses();
  const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
  const supplierPayments = getSupplierPayments();

  let hasChanges = false;
  const expMap = new Map<string, Expense>();
  exps.forEach((e) => {
    if (!deletedExpIds.has(e.id)) {
      expMap.set(String(e.id), e);
    }
  });

  supplierPayments.forEach((sp) => {
    const isDebitNote =
      sp.payment_type === "Debit Note" ||
      sp.payment_mode === "Debit Note" ||
      (sp.reference_no && sp.reference_no.startsWith("DN-"));

    if (isDebitNote) return;

    const amount = r2(Number(sp.amount) || 0);
    if (amount <= 0) return;

    const expId = `exp-spay-${sp.id}`;
    if (deletedExpIds.has(expId)) return;

    const voucherRef = sp.payment_number || sp.reference_no || `PAY-${String(sp.id).slice(0, 6)}`;
    const supplierName = sp.supplier_name || "Supplier";
    const expectedDesc = `Supplier Payment - ${supplierName} (${voucherRef})`;

    // Check if already in expMap by expId or by voucher reference in description
    const alreadyExists = expMap.has(expId) || Array.from(expMap.values()).some((e) =>
      e.id === expId || (e.category === "Supplier Payment" && e.description && e.description.includes(voucherRef))
    );

    if (!alreadyExists) {
      const now = new Date().toISOString();
      const newExp: Expense = {
        id: expId,
        category: "Supplier Payment",
        description: expectedDesc,
        amount: amount,
        expense_date: sp.payment_date || (sp.created_at ? sp.created_at.slice(0, 10) : now.slice(0, 10)),
        recorded_by: "Admin",
        notes: sp.notes || `Supplier payment via ${sp.payment_mode || "Cash"}`,
        created_at: sp.created_at || now,
      };
      expMap.set(expId, newExp);
      hasChanges = true;

      // Sync to Supabase
      try {
        supabase
          .from("expenses")
          .upsert({
            id: newExp.id,
            category: newExp.category,
            description: newExp.description,
            amount: newExp.amount,
            expense_date: newExp.expense_date,
            notes: newExp.notes,
            created_at: newExp.created_at,
          })
          .then(undefined, (err) => console.warn("Supabase expense sync notice:", err));
      } catch (err) {
        console.warn("Expense sync exception:", err);
      }
    }
  });

  const result = Array.from(expMap.values()).sort(
    (a, b) => new Date(b.expense_date || b.created_at || 0).getTime() - new Date(a.expense_date || a.created_at || 0).getTime()
  );

  if (hasChanges) {
    setLocalData(STORAGE_KEYS.EXPENSES, result);
  }

  return result;
}

/**
 * Saves a Supplier Payment:
 * 1. Inserts the payment transaction.
 * 2. Deducts payable balance from the supplier.
 * 3. Auto-allocates payments to purchase invoices and updates them.
 * 4. Records Cash Outflow / Expense entry in Cash Book.
 * 5. Dispatches global state update.
 */
export function saveSupplierPayment(
  paymentData: Omit<SupplierPayment, "id" | "created_at"> & { id?: string }
): SupplierPayment {
  const payments = getSupplierPayments();
  const now = new Date().toISOString();
  const paymentId = paymentData.id || (crypto.randomUUID ? crypto.randomUUID() : `spay-${Date.now()}`);
  const amount = r2(Number(paymentData.amount) || 0);

  const isDebitNote =
    paymentData.payment_type === "Debit Note" ||
    paymentData.payment_mode === "Debit Note" ||
    (paymentData.reference_no && paymentData.reference_no.startsWith("DN-"));

  // Ensure standardized sequential PAY-XXXX voucher number for payments
  let finalPaymentNumber = paymentData.payment_number;
  if (!isDebitNote) {
    if (!finalPaymentNumber || !/^PAY-\d{4,}$/i.test(finalPaymentNumber)) {
      finalPaymentNumber = generateSupplierVoucherNumber(payments);
    }
  }

  const finalReferenceNo = isDebitNote
    ? paymentData.reference_no || generateDebitNoteNumber(payments)
    : finalPaymentNumber;

  // Idempotency guard: prevent duplicate supplier payment entries and double payable deductions
  const existingPayment = payments.find(
    (p) => (paymentId && p.id === paymentId) || (finalPaymentNumber && p.payment_number === finalPaymentNumber)
  );
  if (existingPayment) {
    console.warn(`Idempotency guard: Supplier payment ${finalPaymentNumber} already recorded.`);
    return existingPayment;
  }

  const newPayment: SupplierPayment = {
    ...paymentData,
    id: paymentId,
    payment_number: finalPaymentNumber,
    reference_no: finalReferenceNo,
    amount,
    created_at: now,
  };

  // 1. Save payment
  const allPayments = [newPayment, ...payments];
  setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, allPayments);

  // 2. Deduct from Supplier's current payable balance
  const suppliers = getSuppliers();
  const supplierIndex = suppliers.findIndex((s) => s.id === newPayment.supplier_id);
  if (supplierIndex >= 0) {
    const sup = suppliers[supplierIndex];
    const prevPayable = Number(sup.current_payable || 0);
    const newPayable = r2(Math.max(0, prevPayable - amount));
    suppliers[supplierIndex] = {
      ...sup,
      current_payable: newPayable,
      updated_at: now,
    };
    setLocalData(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  // 3. Update all purchase invoices in storage with updated paid_amount, due_amount, status
  const rawInvoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  if (Array.isArray(rawInvoices) && rawInvoices.length > 0) {
    const updatedInvoices = calculateInvoicesWithPayments(rawInvoices, allPayments);
    setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, updatedInvoices);
  }

  // Audit Log
  logProcurementAudit({
    action: isDebitNote ? "RECORD_DEBIT_NOTE" : "RECORD_PAYMENT",
    entity_type: isDebitNote ? "Debit Note" : "Payment",
    entity_id: newPayment.id,
    reference: newPayment.payment_number || newPayment.reference_no || "",
    supplier_name: newPayment.supplier_name,
    user: "Admin",
    details: isDebitNote
      ? `Recorded Purchase Return / Debit Note ${newPayment.reference_no} for ৳${newPayment.amount}. Reason: ${newPayment.notes || newPayment.reason || "Damaged goods return"}`
      : `Recorded voucher ${newPayment.payment_number} for ৳${newPayment.amount} via ${newPayment.payment_mode}${newPayment.bank_name ? ` (${newPayment.bank_name})` : ""}${newPayment.cheque_no ? ` [Chq #${newPayment.cheque_no}]` : ""}${newPayment.transaction_id ? ` [Txn ID: ${newPayment.transaction_id}]` : ""}`,
    amount: newPayment.amount,
    metadata: {
      payment_mode: newPayment.payment_mode,
      bank_name: newPayment.bank_name,
      cheque_no: newPayment.cheque_no,
      transaction_id: newPayment.transaction_id,
    },
  });

  // 4. Record Cash Outflow/Expense entry in Cash Book & Accounts
  if (!isDebitNote && amount > 0) {
    recordSupplierPaymentExpense(newPayment);
  }

  dispatchGlobalStateUpdate({ type: "supplier_payment_recorded", paymentId });
  return newPayment;
}

/**
 * Saves a Supplier Debit Note (Purchase Return for damaged goods):
 * 1. Inserts the debit note as a supplier payment with payment_type="Debit Note" and reference "DN-YYYY-XXX".
 * 2. Deducts the amount from the supplier's payable balance.
 * 3. Auto-allocates to invoices and updates global state.
 */
export function saveSupplierDebitNote(data: {
  supplier_id: string;
  supplier_name: string;
  amount: number;
  reference_no?: string;
  payment_date?: string;
  reason?: string;
  notes?: string;
  invoice_id?: string;
}): SupplierPayment {
  const existingPayments = getSupplierPayments();
  const dnNumber = data.reference_no?.trim() || generateDebitNoteNumber(existingPayments);
  const now = new Date().toISOString();

  const debitNotePayment = saveSupplierPayment({
    payment_number: dnNumber,
    supplier_id: data.supplier_id,
    supplier_name: data.supplier_name,
    amount: data.amount,
    payment_mode: "Cash",
    payment_type: "Debit Note",
    reference_no: dnNumber,
    payment_date: data.payment_date || now.slice(0, 10),
    reason: data.reason || "Damaged goods return",
    notes: data.notes || data.reason || "Purchase Return / Debit Note",
    invoice_id: data.invoice_id,
  });

  return debitNotePayment;
}

/**
 * Fully synchronizes and recalculates suppliers' current_payable balances and purchase invoices.
 */
export function recalculateSupplierBalances(): void {
  const suppliers = getSuppliers();
  const rawInvoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const payments = getSupplierPayments();

  const updatedInvoices = calculateInvoicesWithPayments(rawInvoices, payments);
  setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, updatedInvoices);

  const recalculatedSuppliers = suppliers.map((sup) => {
    const supInvoices = updatedInvoices.filter((i) => i.supplier_id === sup.id);
    const supPayments = payments.filter((p) => p.supplier_id === sup.id);
    const opening = Number(sup.opening_balance || 0);
    const totalPurchased = supInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const totalPaid = supPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const netPayable = r2(Math.max(0, opening + totalPurchased - totalPaid));
    return {
      ...sup,
      current_payable: netPayable,
    };
  });

  setLocalData(STORAGE_KEYS.SUPPLIERS, recalculatedSuppliers);
  dispatchGlobalStateUpdate({ type: "supplier_balances_recalculated" });
}

/**
 * CRIT-002: Calculates historical supplier payables up to a given date (asOfDate / endDate).
 * Bounded strictly by purchase invoices and supplier payments recorded up to that date,
 * plus initial opening payable balance.
 */
export function calculateSupplierPayablesUpToDate(asOfDate?: string): {
  totalPayable: number;
  payableBySupplierId: Map<string, number>;
} {
  const suppliers = getSuppliers();
  const allInvoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const allPayments = getSupplierPayments();

  const targetDate = asOfDate ? asOfDate.slice(0, 10) : "";
  const payableBySupplierId = new Map<string, number>();
  let totalPayable = 0;

  for (const sup of suppliers) {
    const opening = Number(sup.opening_balance || 0);

    const supInvoices = (Array.isArray(allInvoices) ? allInvoices : []).filter((inv) => {
      if (inv.supplier_id !== sup.id) return false;
      if (!targetDate) return true;
      const d = (inv.invoice_date || inv.created_at || "").slice(0, 10);
      return !d || d <= targetDate;
    });

    const supPayments = (Array.isArray(allPayments) ? allPayments : []).filter((pay) => {
      if (pay.supplier_id !== sup.id) return false;
      if (!targetDate) return true;
      const d = (pay.payment_date || pay.created_at || "").slice(0, 10);
      return !d || d <= targetDate;
    });

    const totalPurchased = supInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const totalPaid = supPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const payable = r2(Math.max(0, opening + totalPurchased - totalPaid));

    payableBySupplierId.set(sup.id, payable);
    totalPayable = r2(totalPayable + payable);
  }

  return { totalPayable, payableBySupplierId };
}

/**
 * Updates an existing Purchase Chalan (Invoice) and recalculates running balances.
 */
export function updatePurchaseInvoice(
  invoiceId: string,
  updates: Partial<PurchaseInvoice>
): PurchaseInvoice | null {
  const invoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const index = invoices.findIndex((i) => i.id === invoiceId);
  if (index === -1) return null;

  const existing = invoices[index];
  const now = new Date().toISOString();

  let totalAmount = existing.total_amount;
  if (updates.total_amount !== undefined) {
    totalAmount = r2(Number(updates.total_amount) || 0);
  } else if (updates.items && Array.isArray(updates.items)) {
    totalAmount = r2(
      updates.items.reduce(
        (s, it) =>
          s +
          (Number(it.subtotal || it.total_amount) ||
            (Number(it.quantity) || 0) * (Number(it.purchase_rate) || 0)),
        0
      )
    );
  }

  const updated: PurchaseInvoice = {
    ...existing,
    ...updates,
    total_amount: totalAmount,
    updated_at: now,
  };

  invoices[index] = updated;
  setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, invoices);

  // Recalculate allocations and balances
  recalculateSupplierBalances();

  logProcurementAudit({
    action: "UPDATE_INVOICE",
    entity_type: "Invoice",
    entity_id: updated.id,
    reference: updated.invoice_number,
    supplier_name: updated.supplier_name,
    user: "Admin",
    details: `Updated Purchase Chalan ${updated.invoice_number} (New Total: ৳${updated.total_amount}).`,
    amount: updated.total_amount,
  });

  dispatchGlobalStateUpdate({ type: "purchase_invoice_updated", invoiceId });
  return updated;
}

/**
 * Deletes a Purchase Chalan (Invoice), reverts inventory stock, purges linked cash book expenses, and recalculates running balances.
 */
export function deletePurchaseInvoice(invoiceId: string): boolean {
  const purchaseId = invoiceId;
  const invoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) return false;

  // 1. Remove invoice
  const filtered = invoices.filter((i) => i.id !== invoiceId);
  setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, filtered);

  // 2. Revert inventory stock (Single source of truth)
  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    const whName = (invoice as any).warehouse || "Main Warehouse";

    invoice.items.forEach((item) => {
      const qty = Math.max(1, Math.round(Number(item.quantity) || 1));

      // Single source of truth: adjustProductStock reverts products, warehouse inventory, and Supabase
      adjustProductStock(item.product_id, -qty, whName);
    });
  }

  // 3. Remove all payments directly linked to this invoice
  const payments = getSupplierPayments();
  const linkedPayments = payments.filter(
    (p) => p.invoice_id === invoiceId || p.chalan_id === invoiceId
  );
  const linkedPaymentIds = new Set(linkedPayments.map((p) => p.id));
  if (linkedPayments.length > 0) {
    const remainingPayments = payments.filter((p) => !linkedPaymentIds.has(p.id));
    setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, remainingPayments);
  }

  // 4. Purge corresponding expense cash-out entry from Cash Book / Expenses
  const expenses = getExpenses();
  const expIdsToDelete: string[] = [];
  const updatedExpenses = expenses.filter((exp: any) => {
    const isDirectMatch =
      exp.id === `exp-spay-${purchaseId}` ||
      exp.purchase_id === purchaseId ||
      exp.reference_id === purchaseId;

    const isLinkedPaymentMatch =
      (exp.payment_id && linkedPaymentIds.has(exp.payment_id)) ||
      (typeof exp.id === "string" && Array.from(linkedPaymentIds).some((pId) => exp.id === `exp-spay-${pId}`));

    const isVoucherMatch =
      Boolean(invoice.invoice_number && typeof exp.description === "string" && exp.description.includes(invoice.invoice_number));

    if (isDirectMatch || isLinkedPaymentMatch || isVoucherMatch) {
      if (exp.id) {
        expIdsToDelete.push(String(exp.id));
        saveDeletedId(STORAGE_KEYS.DELETED_EXPENSES, String(exp.id));
      }
      return false;
    }
    return true;
  });
  saveExpenses(updatedExpenses);

  // Remote cascade delete on Supabase expenses table
  try {
    supabase
      .from("expenses")
      .delete()
      .eq("id", `exp-spay-${purchaseId}`)
      .then(undefined, () => {});

    supabase
      .from("expenses")
      .delete()
      .eq("reference_id", purchaseId)
      .then(undefined, () => {});

    if (expIdsToDelete.length > 0) {
      supabase
        .from("expenses")
        .delete()
        .in("id", expIdsToDelete)
        .then(undefined, () => {});
    }
  } catch (err) {
    console.warn("Notice: Remote cascade delete of linked expenses:", err);
  }

  // 5. Recalculate balances
  recalculateSupplierBalances();

  logProcurementAudit({
    action: "DELETE_INVOICE",
    entity_type: "Invoice",
    entity_id: invoice.id,
    reference: invoice.invoice_number,
    supplier_name: invoice.supplier_name,
    user: "Admin",
    details: `Deleted Purchase Chalan ${invoice.invoice_number} (৳${invoice.total_amount}). Purged linked cash outflow records.`,
    amount: invoice.total_amount,
  });

  dispatchGlobalStateUpdate({ type: "purchase_invoice_deleted", invoiceId });
  return true;
}

export const deletePurchase = deletePurchaseInvoice;

/**
 * Updates a Supplier Payment or Debit Note and recalculates running balances.
 */
export function updateSupplierPayment(
  paymentId: string,
  updates: Partial<SupplierPayment>
): SupplierPayment | null {
  const payments = getSupplierPayments();
  const index = payments.findIndex((p) => p.id === paymentId);
  if (index === -1) return null;

  const existing = payments[index];
  const isDebitNote =
    existing.payment_type === "Debit Note" ||
    existing.payment_mode === "Debit Note" ||
    (existing.reference_no && existing.reference_no.startsWith("DN-"));

  const updatedAmount =
    updates.amount !== undefined ? r2(Number(updates.amount) || 0) : existing.amount;

  const updated: SupplierPayment = {
    ...existing,
    ...updates,
    amount: updatedAmount,
  };

  payments[index] = updated;
  setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, payments);

  // Recalculate allocations and balances
  recalculateSupplierBalances();

  // Also update corresponding expense in Cash Book if present
  const expId = `exp-spay-${paymentId}`;
  const exps = getExpenses();
  const voucherRef = updated.payment_number || updated.reference_no;
  const expIdx = exps.findIndex((e) => e.id === expId || (e.category === "Supplier Payment" && voucherRef && e.description?.includes(voucherRef)));
  if (expIdx >= 0) {
    const updatedDesc = `Supplier Payment - ${updated.supplier_name || "Supplier"} (${voucherRef || "PAY"})`;
    exps[expIdx] = {
      ...exps[expIdx],
      description: updatedDesc,
      amount: updated.amount,
      expense_date: updated.payment_date || exps[expIdx].expense_date,
      notes: updated.notes || exps[expIdx].notes,
    };
    setLocalData(STORAGE_KEYS.EXPENSES, exps);
    supabase.from("expenses").update({
      description: updatedDesc,
      amount: updated.amount,
      expense_date: exps[expIdx].expense_date,
      notes: exps[expIdx].notes,
    }).eq("id", exps[expIdx].id).then(undefined, () => {});
  }

  logProcurementAudit({
    action: isDebitNote ? "UPDATE_DEBIT_NOTE" : "UPDATE_PAYMENT",
    entity_type: isDebitNote ? "Debit Note" : "Payment",
    entity_id: updated.id,
    reference: updated.payment_number || updated.reference_no || "",
    supplier_name: updated.supplier_name,
    user: "Admin",
    details: `Updated ${isDebitNote ? "Debit Note" : "Payment Voucher"} ${updated.payment_number || updated.reference_no} to ৳${updated.amount}.`,
    amount: updated.amount,
  });

  dispatchGlobalStateUpdate({ type: "supplier_payment_updated", paymentId });
  return updated;
}

/**
 * Deletes a Supplier Payment or Debit Note and recalculates running balances.
 */
export function deleteSupplierPayment(paymentId: string): boolean {
  const payments = getSupplierPayments();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return false;

  const isDebitNote =
    payment.payment_type === "Debit Note" ||
    payment.payment_mode === "Debit Note" ||
    (payment.reference_no && payment.reference_no.startsWith("DN-"));

  const filtered = payments.filter((p) => p.id !== paymentId);
  setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, filtered);

  // Recalculate allocations and balances
  recalculateSupplierBalances();

  // Also delete corresponding expense from Cash Book if present
  const expId = `exp-spay-${paymentId}`;
  const exps = getExpenses();
  const voucherRef = payment.payment_number || payment.reference_no;
  const filteredExps = exps.filter((e) => e.id !== expId && (!voucherRef || !e.description?.includes(voucherRef)));
  if (filteredExps.length !== exps.length) {
    setLocalData(STORAGE_KEYS.EXPENSES, filteredExps);
    supabase.from("expenses").delete().eq("id", expId).then(undefined, () => {});
  }

  logProcurementAudit({
    action: isDebitNote ? "DELETE_DEBIT_NOTE" : "DELETE_PAYMENT",
    entity_type: isDebitNote ? "Debit Note" : "Payment",
    entity_id: payment.id,
    reference: payment.payment_number || payment.reference_no || "",
    supplier_name: payment.supplier_name,
    user: "Admin",
    details: `Deleted ${isDebitNote ? "Debit Note" : "Payment Voucher"} ${payment.payment_number || payment.reference_no} (৳${payment.amount}).`,
    amount: payment.amount,
  });

  dispatchGlobalStateUpdate({ type: "supplier_payment_deleted", paymentId });
  return true;
}

/**
 * Calculates isolated Supplier Ledger Statement details with chronological running balance.
 */
export function getSupplierLedgerDetails(
  supplierId: string,
  options?: { startDate?: string; endDate?: string }
): {
  supplier: Supplier | null;
  openingBalance: number;
  totalPurchases: number;
  totalPaid: number;
  closingPayable: number;
  entries: SupplierLedgerEntry[];
} {
  const suppliers = getSuppliers();
  const supplier = suppliers.find((s) => s.id === supplierId) || null;

  if (!supplier) {
    return {
      supplier: null,
      openingBalance: 0,
      totalPurchases: 0,
      totalPaid: 0,
      closingPayable: 0,
      entries: [],
    };
  }

  const baseOpening = r2(Number(supplier.opening_balance || 0));
  const invoices = getPurchaseInvoices().filter((inv) => inv.supplier_id === supplierId);
  const payments = getSupplierPayments().filter((pay) => pay.supplier_id === supplierId);

  // Combine invoices and payments into a chronological sequence
  type RawEvent = {
    id: string;
    date: string;
    createdAt: string;
    type: "Purchase" | "Payment" | "Debit Note";
    reference: string;
    particulars: string;
    purchaseAmount: number;
    paidAmount: number;
    notes?: string;
    paymentMode?: string;
    paymentType?: string;
    bankName?: string;
    chequeNo?: string;
    transactionId?: string;
  };

  const rawEvents: RawEvent[] = [];

  invoices.forEach((inv) => {
    rawEvents.push({
      id: inv.id,
      date: inv.invoice_date || inv.created_at.slice(0, 10),
      createdAt: inv.created_at,
      type: "Purchase",
      reference: inv.invoice_number,
      particulars: `Purchase Chalan (${inv.items?.length || 0} items)`,
      purchaseAmount: r2(inv.total_amount || 0),
      paidAmount: 0,
      notes: inv.notes || undefined,
    });
  });

  payments.forEach((pay) => {
    const isDebitNote =
      pay.payment_type === "Debit Note" ||
      pay.payment_mode === "Debit Note" ||
      (pay.reference_no && pay.reference_no.startsWith("DN-"));

    let desc = "";
    if (isDebitNote) {
      const dnRef = pay.reference_no || pay.payment_number;
      desc = `${dnRef} - Purchase Return${pay.notes ? `: ${pay.notes}` : pay.reason ? `: ${pay.reason}` : ""}`;
    } else {
      desc = `Payment (${pay.payment_mode || "Cash"})`;
      if (pay.bank_name) desc += ` - ${pay.bank_name}`;
      if (pay.notes) desc += ` - ${pay.notes}`;
    }

    const voucherRef = isDebitNote
      ? (pay.reference_no || pay.payment_number || "DN")
      : (pay.payment_number || pay.reference_no || "PAY-0001");

    rawEvents.push({
      id: pay.id,
      date: pay.payment_date || pay.created_at.slice(0, 10),
      createdAt: pay.created_at,
      type: isDebitNote ? "Debit Note" : "Payment",
      reference: voucherRef,
      particulars: desc,
      purchaseAmount: 0,
      paidAmount: r2(pay.amount || 0),
      notes: pay.notes || undefined,
      paymentMode: pay.payment_mode,
      paymentType: pay.payment_type,
      bankName: pay.bank_name || undefined,
      chequeNo: pay.cheque_no || undefined,
      transactionId: pay.transaction_id || undefined,
    });
  });

  // Sort chronologically ascending
  rawEvents.sort((a, b) => {
    const dDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dDiff !== 0) return dDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const startDate = options?.startDate?.trim();
  const endDate = options?.endDate?.trim();

  // Dynamic Opening Balance calculation:
  // If startDate is set, Opening Balance = baseOpening + all purchases prior to startDate - all payments prior to startDate
  let priorPurchases = 0;
  let priorPaid = 0;

  if (startDate) {
    rawEvents.forEach((ev) => {
      if (ev.date && ev.date < startDate) {
        if (ev.type === "Purchase") {
          priorPurchases = r2(priorPurchases + ev.purchaseAmount);
        } else {
          priorPaid = r2(priorPaid + ev.paidAmount);
        }
      }
    });
  }

  const openingBalance = startDate
    ? r2(baseOpening + priorPurchases - priorPaid)
    : baseOpening;

  let runningBalance = openingBalance;
  let periodPurchases = 0;
  let periodPaid = 0;

  const entries: SupplierLedgerEntry[] = [];

  // Initial opening balance row if startDate is specified OR openingBalance !== 0
  if (startDate || openingBalance !== 0) {
    entries.push({
      id: `open-${supplier.id}-${startDate || "init"}`,
      date: startDate || supplier.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      type: "Opening Balance",
      reference: "OPENING",
      particulars: startDate
        ? `Opening Balance (as of ${startDate})`
        : "Opening Payable Balance Brought Forward",
      purchaseAmount: 0,
      paidAmount: 0,
      balance: openingBalance,
      notes: startDate ? `Calculated cumulative balance prior to ${startDate}` : "Initial balance brought forward",
    });
  }

  rawEvents.forEach((ev) => {
    if (startDate && ev.date && ev.date < startDate) return;
    if (endDate && ev.date && ev.date > endDate) return;

    periodPurchases = r2(periodPurchases + ev.purchaseAmount);
    periodPaid = r2(periodPaid + ev.paidAmount);
    runningBalance = r2(runningBalance + ev.purchaseAmount - ev.paidAmount);

    entries.push({
      id: ev.id,
      date: ev.date,
      type: ev.type,
      reference: ev.reference,
      particulars: ev.particulars,
      purchaseAmount: ev.purchaseAmount,
      paidAmount: ev.paidAmount,
      balance: runningBalance,
      notes: ev.notes,
      paymentMode: ev.paymentMode,
      paymentType: ev.paymentType,
      bankName: ev.bankName,
      chequeNo: ev.chequeNo,
      transactionId: ev.transactionId,
    });
  });

  return {
    supplier,
    openingBalance,
    totalPurchases: periodPurchases,
    totalPaid: periodPaid,
    closingPayable: runningBalance,
    entries,
  };
}

export interface ProcurementBackupData {
  backup_version: "1.0";
  exported_at: string;
  system: string;
  suppliers: Supplier[];
  purchase_invoices: PurchaseInvoice[];
  supplier_payments: SupplierPayment[];
  procurement_audit_logs: ProcurementAuditLog[];
  stats: {
    suppliersCount: number;
    invoicesCount: number;
    paymentsCount: number;
    auditLogsCount: number;
    totalPurchasesAmount: number;
    totalPaymentsAmount: number;
  };
}

/**
 * Bundles the entire procurement and supplier accounting dataset into a clean JSON object for backup.
 */
export function exportProcurementBackupData(): ProcurementBackupData {
  const suppliers = getSuppliers();
  const purchase_invoices = getLocalData<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASE_INVOICES, []);
  const supplier_payments = getSupplierPayments();
  const procurement_audit_logs = getProcurementAuditLogs();

  const totalPurchasesAmount = purchase_invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalPaymentsAmount = supplier_payments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

  return {
    backup_version: "1.0",
    exported_at: new Date().toISOString(),
    system: "Sales ERP Pro - Procurement Module",
    suppliers,
    purchase_invoices,
    supplier_payments,
    procurement_audit_logs,
    stats: {
      suppliersCount: suppliers.length,
      invoicesCount: purchase_invoices.length,
      paymentsCount: supplier_payments.length,
      auditLogsCount: procurement_audit_logs.length,
      totalPurchasesAmount: r2(totalPurchasesAmount),
      totalPaymentsAmount: r2(totalPaymentsAmount),
    },
  };
}

/**
 * Restores procurement dataset from a validated JSON backup object.
 */
export function restoreProcurementBackupData(backup: any): { success: boolean; message: string; stats?: any } {
  if (!backup || typeof backup !== "object") {
    return { success: false, message: "Invalid backup file: Not a valid JSON object." };
  }

  // Verify at least one of the core arrays is present
  if (!Array.isArray(backup.suppliers) && !Array.isArray(backup.purchase_invoices) && !Array.isArray(backup.supplier_payments)) {
    return { success: false, message: "Invalid backup file: Missing suppliers, invoices, or payment records." };
  }

  const suppliers: Supplier[] = Array.isArray(backup.suppliers) ? backup.suppliers : getSuppliers();
  const invoices: PurchaseInvoice[] = Array.isArray(backup.purchase_invoices) ? backup.purchase_invoices : [];
  const payments: SupplierPayment[] = Array.isArray(backup.supplier_payments) ? backup.supplier_payments : [];
  const incomingLogs: ProcurementAuditLog[] = Array.isArray(backup.procurement_audit_logs) ? backup.procurement_audit_logs : [];

  // Update purchase invoices with payments
  const updatedInvoices = calculateInvoicesWithPayments(invoices, payments);

  // Recalculate suppliers' current_payable balances
  const recalculatedSuppliers = suppliers.map((sup) => {
    const supInvoices = updatedInvoices.filter((i) => i.supplier_id === sup.id);
    const supPayments = payments.filter((p) => p.supplier_id === sup.id);
    const opening = Number(sup.opening_balance || 0);
    const totalPurchased = supInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const totalPaid = supPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const netPayable = r2(Math.max(0, opening + totalPurchased - totalPaid));
    return {
      ...sup,
      current_payable: netPayable,
    };
  });

  setLocalData(STORAGE_KEYS.SUPPLIERS, recalculatedSuppliers);
  setLocalData(STORAGE_KEYS.PURCHASE_INVOICES, updatedInvoices);
  setLocalData(STORAGE_KEYS.SUPPLIER_PAYMENTS, payments);

  const existingLogs = getProcurementAuditLogs();
  const mergedLogs = [...incomingLogs, ...existingLogs];
  const uniqueLogsMap = new Map<string, ProcurementAuditLog>();
  mergedLogs.forEach((l) => {
    if (l && l.id) uniqueLogsMap.set(l.id, l);
  });
  setLocalData(STORAGE_KEYS.PROCUREMENT_AUDIT_LOGS, Array.from(uniqueLogsMap.values()).slice(0, 500));

  logProcurementAudit({
    action: "RESTORE_BACKUP",
    entity_type: "System",
    entity_id: `rst-${Date.now()}`,
    reference: `RESTORE-${new Date().toISOString().slice(0, 10)}`,
    user: "Admin",
    details: `System restored from JSON backup. Restored ${recalculatedSuppliers.length} suppliers, ${updatedInvoices.length} invoices, and ${payments.length} payment/return vouchers.`,
  });

  dispatchGlobalStateUpdate({ type: "backup_restored" });

  return {
    success: true,
    message: `Successfully restored ${recalculatedSuppliers.length} suppliers, ${updatedInvoices.length} chalans, and ${payments.length} payments!`,
    stats: {
      suppliers: recalculatedSuppliers.length,
      invoices: updatedInvoices.length,
      payments: payments.length,
    },
  };
}


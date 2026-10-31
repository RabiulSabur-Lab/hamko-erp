import { supabase, SUPABASE_TABLE_SELECTS } from "@/lib/supabase";
import { hasActiveSessionToken, ensureValidSession } from "@/lib/auth";
import { classifySupabaseError, isRlsOrPermissionError } from "@/lib/supabaseQuery";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getDeletedIds,
  isPendingOfflineRecord,
  mergeAndEnrichCustomers,
  reconcileOrdersWithRemote,
  reconcileCollectionsWithRemote,
  reconcileProductsWithRemote,
  reconcileCategoriesWithRemote,
  reconcileExpensesWithRemote,
  reconcileVisitsWithRemote,
  reconcileAreasWithRemote,
  reconcileInventoryWithRemote,
  broadcastCrossTabSync,
  getProducts,
  getCustomers,
  getOrders,
  getCollections,
  getAreas,
} from "./localStore";
import { toast } from "sonner";
import { exportJsonBackup } from "./export";
import {
  sanitizeCustomerPayload,
  sanitizeOrderPayload,
  sanitizeOrderItemPayload,
  sanitizeCollectionPayload,
  sanitizeExpensePayload,
  sanitizeInventoryPayload,
  sanitizeProductPayload,
} from "@/lib/payloadSanitizer";

export interface SyncProgress {
  phase: string;
  total: number;
  completed: number;
  errorCount: number;
  details: string[];
}

export interface SyncSummary {
  categories: number;
  products: number;
  customers: number;
  orders: number;
  orderItems: number;
  collections: number;
  expenses: number;
  inventory: number;
  errors: string[];
}

/**
 * Validates if a string is a standard RFC 4122 UUID
 */
function isValidUUID(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Generates an RFC 4122 compliant UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Encodes extra customer metadata into the notes string using standardized tags
 * recognized identically across Web and Mobile (`parseCustomerNotes`).
 */
export function encodeCustomerNotes(cust: any): string {
  const parts: string[] = [];
  const rawStatus =
    cust?.status === "Inactive" || cust?.is_active === false ? "Inactive" : "Active";
  parts.push(`[STATUS:${rawStatus}]`);

  if (cust?.party_code) parts.push(`[PARTY:${String(cust.party_code).trim()}]`);
  if (cust?.area) parts.push(`[AREA:${String(cust.area).trim()}]`);
  if (cust?.alt_phone) parts.push(`[ALT:${String(cust.alt_phone).trim()}]`);

  const chk = cust?.securityChequeNo || cust?.security_cheque_no;
  const bnk = cust?.securityBankName || cust?.security_bank_name;
  const brn = cust?.securityBranchName || cust?.security_branch_name;
  const dt = cust?.securityChequeDate || cust?.security_cheque_date;
  const sNotes = cust?.securityNotes || cust?.security_notes;

  if (chk) parts.push(`[SEC_CHEQUE:${String(chk).trim()}]`);
  if (bnk) parts.push(`[SEC_BANK:${String(bnk).trim()}]`);
  if (brn) parts.push(`[SEC_BRANCH:${String(brn).trim()}]`);
  if (dt) parts.push(`[SEC_DATE:${String(dt).trim()}]`);
  if (sNotes) parts.push(`[SEC_NOTES:${String(sNotes).trim()}]`);

  if (cust?.notes && typeof cust.notes === "string") {
    const clean = cust.notes
      .replace(/\[(?:STATUS|PARTY|party_code|AREA|area|ALT|alt_phone|SEC_CHEQUE|SEC_BANK|SEC_BRANCH|SEC_DATE|SEC_NOTES|security_cheque):[^\]]*\]/gi, "")
      .trim();
    if (clean) parts.push(clean);
  }
  return parts.join(" ").trim();
}

/**
 * Concurrency execution guard to prevent overlapping or infinite recursive synchronization calls.
 */
let isCloudSyncing = false;
let inFlightCloudPull: Promise<CloudPullResult> | null = null;
let lastCloudPullAt = 0;
let lastCloudErrorToastAt = 0;

export interface CloudPullResult {
  synced: boolean;
  updatedTables: string[];
  offline?: boolean;
  error?: string | null;
}

export function getIsCloudSyncing(): boolean {
  return isCloudSyncing;
}

/**
 * Yields control back to the browser's event loop to prevent "Page Unresponsive" freezing
 */
const yieldToUI = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Wraps asynchronous Supabase operations with a timeout to prevent network dropouts from hanging the thread
 */
async function withTimeout<T>(promise: PromiseLike<T>, ms = 25000, label = "Operation"): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s (network dropped or server unresponsive)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function isRetryableNetworkFailure(err: any): boolean {
  if (!err) return false;
  const msg = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""}`.toLowerCase();
  return (
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

async function safeTimedQuery<TRes extends { data: any; error: any }>(
  promiseOrFactory: PromiseLike<TRes> | (() => PromiseLike<TRes>),
  ms = 10000,
  label = "Database operation",
  maxRetries = 1,
): Promise<{ data: TRes["data"] | null; error: any }> {
  const isFactory = typeof promiseOrFactory === "function";
  const attempts = isFactory ? Math.max(1, maxRetries + 1) : 1;
  let lastError: any = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const targetPromise = isFactory
        ? (promiseOrFactory as () => PromiseLike<TRes>)()
        : promiseOrFactory;
      const res = await withTimeout(targetPromise, ms, label);
      if (!res?.error) {
        return { data: res?.data ?? null, error: null };
      }
      lastError = res.error;
      // If RLS or permission issue, silently return empty array without triggering an error state
      if (isRlsOrPermissionError(lastError)) {
        console.warn(`[CloudSync] ${label} restricted by RLS/permissions — returning empty dataset silently.`);
        return { data: [] as any, error: null };
      }
      if (attempt < attempts - 1 && isRetryableNetworkFailure(lastError)) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return { data: null, error: lastError };
    } catch (err: any) {
      lastError = { message: err?.message || `${label} failed` };
      if (isRlsOrPermissionError(lastError) || isRlsOrPermissionError(err)) {
        console.warn(`[CloudSync] ${label} exception (RLS/permissions) — returning empty dataset silently.`);
        return { data: [] as any, error: null };
      }
      if (attempt < attempts - 1 && isRetryableNetworkFailure(lastError)) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return { data: null, error: lastError };
    }
  }
  return { data: null, error: lastError };
}

export function normalizeDueStatus(rawStatus: unknown, currentDue: number): "Clear" | "Overdue" | "Partial" {
  if (rawStatus === "Clear" || rawStatus === "Overdue" || rawStatus === "Partial") {
    return rawStatus;
  }
  return currentDue > 0 ? "Partial" : "Clear";
}

export function normalizeOrderStatus(rawStatus: unknown): "Draft" | "Pending" | "Approved" | "Delivered" | "Cancelled" {
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

export function normalizePaymentStatus(rawStatus: unknown, paidAmount: number, totalAmount: number): "Unpaid" | "Partial" | "Paid" {
  if (rawStatus === "Unpaid" || rawStatus === "Partial" || rawStatus === "Paid") {
    return rawStatus;
  }
  if (totalAmount > 0 && paidAmount >= totalAmount) return "Paid";
  if (paidAmount > 0) return "Partial";
  return "Unpaid";
}

export function normalizePaymentMethod(rawMethod: unknown): "Cash" | "Cheque" | "Bank Transfer" | "Mobile Banking" {
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

/**
 * Performs a 100% comprehensive push of all local ERP data from browser localStorage to Supabase.
 * Respects table foreign-key hierarchies and sanitizes all physical PostgreSQL schema columns.
 */
export async function pushAllLocalDataToSupabase(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    categories: 0,
    products: 0,
    customers: 0,
    orders: 0,
    orderItems: 0,
    collections: 0,
    expenses: 0,
    inventory: 0,
    errors: [],
  };

  // Execution guard: Reject duplicate or recursive synchronization calls
  if (isCloudSyncing) {
    console.warn("[CloudSync] Duplicate synchronization call blocked by isCloudSyncing execution guard.");
    toast.warning("Cloud synchronization is already in progress. Please wait...");
    summary.errors.push("Synchronization already in progress");
    return summary;
  }

  // Offline guard: surface explicit offline state immediately instead of timing out sockets
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const offlineMsg = "Device is currently offline. Connect to the internet to synchronize with cloud.";
    toast.warning(offlineMsg);
    summary.errors.push(offlineMsg);
    return summary;
  }

  // Authentication & auto-refresh guard: verify or refresh mobile JWT before pushing data
  try {
    const sessionCheck = await ensureValidSession();
    if (sessionCheck.offline) {
      const offlineMsg = "Network disconnected before cloud sync could start.";
      toast.warning(offlineMsg);
      summary.errors.push(offlineMsg);
      return summary;
    }
    if (!sessionCheck.session || !hasActiveSessionToken(sessionCheck.session)) {
      const errMsg = sessionCheck.error?.userMessage || "User session is missing or expired. Please sign in again.";
      console.warn("[CloudSync] Cloud sync skipped:", errMsg);
      toast.error(errMsg);
      summary.errors.push(errMsg);
      return summary;
    }
  } catch (authErr: any) {
    const classified = classifySupabaseError(authErr);
    console.warn("[CloudSync] Cloud sync aborted: Unable to verify auth session:", authErr);
    toast.error(classified.userMessage);
    summary.errors.push(classified.userMessage);
    return summary;
  }

  isCloudSyncing = true;

  const report = (phase: string, completed: number, total: number, msg?: string) => {
    if (msg) summary.errors.push(msg);
    if (onProgress) {
      onProgress({
        phase,
        completed,
        total,
        errorCount: summary.errors.length,
        details: [msg || `${phase}: ${completed}/${total}`],
      });
    }
  };

  try {
    // ---------------------------------------------------------
    // 1. SYNC CATEGORIES
    // ---------------------------------------------------------
    report("Synchronizing Categories", 0, 1);
    const localCategories = getLocalData<any[]>(STORAGE_KEYS.CATEGORIES, []);
    const { data: remoteCategories } = await safeTimedQuery(
      () => supabase.from("categories").select("id, name"),
      12000,
      "Categories fetch",
    );
    const categoryMap = new Map<string, string>(); // name.toLowerCase() -> id

    (remoteCategories || []).forEach((rc: any) => {
      if (rc.name && rc.id) categoryMap.set(rc.name.trim().toLowerCase(), rc.id);
    });

    for (const cat of localCategories) {
      if (!cat || !cat.name) continue;
      const cleanName = cat.name.trim();
      const lowerName = cleanName.toLowerCase();
      if (!categoryMap.has(lowerName)) {
        const catPayload = {
          id: isValidUUID(cat.id) ? cat.id : generateUUID(),
          name: cleanName,
          description: cat.description || null,
        };
        let { data, error } = await safeTimedQuery(
          supabase
            .from("categories")
            .upsert(catPayload, { onConflict: "name" })
            .select("id, name")
            .single(),
          10000,
          `Category upsert (${cleanName})`,
        );

        if (error) {
          // If upsert fails due to policy or conflict, attempt to select existing by name
          const { data: existing } = await safeTimedQuery(
            supabase
              .from("categories")
              .select("id, name")
              .ilike("name", cleanName)
              .maybeSingle(),
            10000,
            `Category lookup (${cleanName})`,
          );

          if (existing) {
            categoryMap.set(lowerName, existing.id);
            summary.categories++;
            error = null;
          }
        }

        if (error) {
          summary.errors.push(`Category "${cleanName}": ${error.message}`);
        } else if (data) {
          categoryMap.set(lowerName, data.id);
          summary.categories++;
        }
      }
    }

    // ---------------------------------------------------------
    // 2. SYNC PRODUCTS
    // ---------------------------------------------------------
    const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const localProducts = getProducts().filter((p) => p && !deletedProdIds.has(String(p.id)));
    report("Synchronizing Products", 0, localProducts.length);

    for (let i = 0; i < localProducts.length; i++) {
      const p = localProducts[i];
      if (!p || !p.name) continue;

      let categoryId = p.category_id || (p.category && p.category.id) || null;
      if (!categoryId && p.category) {
        const catName = typeof p.category === "string" ? p.category : p.category.name;
        if (catName && categoryMap.has(catName.trim().toLowerCase())) {
          categoryId = categoryMap.get(catName.trim().toLowerCase());
        }
      }

      const skuCode = (p.sku_code || (p as any).sku || `PRD-${Date.now()}-${i}`).trim();
      const productId = isValidUUID(p.id) ? p.id : generateUUID();

      const prodPayload: Record<string, any> = {
        id: productId,
        sku_code: skuCode,
        name: p.name.trim(),
        category_id: isValidUUID(categoryId) ? categoryId : null,
        unit_price: Number(p.unit_price) || Number(p.dealer_price) || 0,
        dealer_price: Number(p.dealer_price) || Number(p.unit_price) || 0,
        distributor_price: Number(p.distributor_price) || Number(p.dealer_price) || 0,
        d10_price: Number(p.d10_price) || null,
        b12_price: Number(p.b12_price) || null,
        stock_quantity: Math.max(0, Math.round(Number(p.stock_quantity ?? p.stock ?? 100))),
        reorder_level: Math.max(0, Math.round(Number(p.reorder_level ?? 10))),
        unit: p.unit || "pcs",
        image_url: p.image_url || null,
        is_active: p.is_active !== false,
        updated_at: new Date().toISOString(),
      };

      if (p.brand && typeof p.brand === "string" && p.brand.trim().length > 0) {
        prodPayload.brand = p.brand.trim();
      }

      const currentPayload: Record<string, any> = { ...prodPayload };
      let lastError: any = null;
      let syncSuccess = false;

      for (let attempt = 0; attempt < 6; attempt++) {
        const { error } = await safeTimedQuery(
          supabase.from("products").upsert(currentPayload, { onConflict: "sku_code" }),
          10000,
          `Product upsert (${p.name})`,
        );

        if (!error) {
          syncSuccess = true;
          lastError = null;
          break;
        }

        lastError = error;
        const match = error.message?.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && match[1] in currentPayload) {
          delete currentPayload[match[1]];
          continue;
        }

        if (error.message?.includes("distributor_price") && "distributor_price" in currentPayload) {
          delete currentPayload.distributor_price;
          continue;
        }
        if (error.message?.includes("brand") && "brand" in currentPayload) {
          delete currentPayload.brand;
          continue;
        }
        if (error.message?.includes("price_tiers") && "price_tiers" in currentPayload) {
          delete currentPayload.price_tiers;
          continue;
        }
        if (error.message?.includes("d10_price") && "d10_price" in currentPayload) {
          delete currentPayload.d10_price;
          continue;
        }
        if (error.message?.includes("b12_price") && "b12_price" in currentPayload) {
          delete currentPayload.b12_price;
          continue;
        }

        break;
      }

      if (!syncSuccess && lastError) {
        summary.errors.push(`Product "${p.name}": ${lastError.message}`);
      } else {
        summary.products++;
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Products", i + 1, localProducts.length);
    }

    // ---------------------------------------------------------
    // 3. SYNC CUSTOMERS
    // ---------------------------------------------------------
    const deletedCustIds = getDeletedIds(STORAGE_KEYS.DELETED_CUSTOMERS);
    const localCustomers = getCustomers().filter((c) => c && !deletedCustIds.has(String(c.id)));
    report("Synchronizing Customers", 0, localCustomers.length);

    const { data: remoteTerritories } = await safeTimedQuery(
      () => supabase.from("territories").select("id, name"),
      12000,
      "Territories fetch",
    );
    const territoryMap = new Map<string, string>();
    (remoteTerritories || []).forEach((t: any) => {
      if (t.name && t.id) territoryMap.set(t.name.trim().toLowerCase(), t.id);
    });

    for (let i = 0; i < localCustomers.length; i++) {
      const c = localCustomers[i];
      if (!c || !c.name) continue;

      let territoryId = c.territory_id || (c.territory && c.territory.id) || null;
      if (!territoryId && (c.city || c.area)) {
        const areaName = (c.city || c.area || "").trim().toLowerCase();
        if (territoryMap.has(areaName)) territoryId = territoryMap.get(areaName);
      }

      const custType = ["Dealer", "Retailer", "Wholesale"].includes(c.customer_type)
        ? c.customer_type
        : "Retailer";

      const customerId = isValidUUID(c.id) ? c.id : generateUUID();

      const custPayload = sanitizeCustomerPayload({
        id: customerId,
        name: (c.outlet_name || c.name).trim(),
        customer_type: custType,
        contact_person: c.contact_person || c.name || null,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || c.area || null,
        territory_id: isValidUUID(territoryId) ? territoryId : null,
        trade_license_number: c.trade_license_number || null,
        latitude: c.latitude !== null && !isNaN(Number(c.latitude)) ? Number(c.latitude) : null,
        longitude: c.longitude !== null && !isNaN(Number(c.longitude)) ? Number(c.longitude) : null,
        opening_balance: Number(c.opening_balance) || 0,
        current_due: Number(c.current_due) || 0,
        due_status: normalizeDueStatus(c.due_status, Number(c.current_due) || 0),
        notes: encodeCustomerNotes(c),
        assigned_to: isValidUUID(c.assigned_to) ? c.assigned_to : null,
        is_active: c.is_active !== false,
        updated_at: new Date().toISOString(),
      });

      let { error } = await safeTimedQuery(
        supabase.from("customers").upsert(custPayload, { onConflict: "id" }),
        10000,
        `Customer upsert (${c.name})`,
      );

      if (error && (error.code === "23503" || error.message?.includes("foreign key"))) {
        console.warn(`Customer "${c.name}" FK mismatch; retrying with nullified assigned_to & territory_id:`, error.message);
        const fallbackPayload = sanitizeCustomerPayload({
          ...custPayload,
          assigned_to: null,
          territory_id: null,
        });
        const retryRes = await safeTimedQuery(
          supabase.from("customers").upsert(fallbackPayload, { onConflict: "id" }),
          10000,
          `Customer upsert retry (${c.name})`,
        );
        error = retryRes.error;
      }

      if (error) {
        summary.errors.push(`Customer "${c.name}": ${error.message}`);
      } else {
        summary.customers++;
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Customers", i + 1, localCustomers.length);
    }

    // ---------------------------------------------------------
    // 4. SYNC ORDERS & ORDER ITEMS
    // ---------------------------------------------------------
    const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
    const localOrders = getOrders().filter((o) => o && !deletedOrderIds.has(String(o.id)));
    report("Synchronizing Orders", 0, localOrders.length);

    // Fetch existing customer IDs to avoid foreign-key violations
    const { data: dbCustomers } = await safeTimedQuery(
      () => supabase.from("customers").select("id, name"),
      12000,
      "Customers fetch",
    );
    const validCustIds = new Set<string>((dbCustomers || []).map((dc: any) => dc.id));
    const custNameToId = new Map<string, string>();
    (dbCustomers || []).forEach((dc: any) => {
      if (dc?.name && dc?.id) custNameToId.set(dc.name.trim().toLowerCase(), dc.id);
    });

    // Fetch products to map order product IDs
    const { data: dbProducts } = await safeTimedQuery(
      () => supabase.from("products").select("id, name, sku_code"),
      12000,
      "Products fetch",
    );
    const validProdIds = new Set<string>((dbProducts || []).map((dp: any) => dp.id));
    const prodNameToId = new Map<string, string>();
    (dbProducts || []).forEach((dp: any) => {
      if (dp?.name && dp?.id) prodNameToId.set(dp.name.trim().toLowerCase(), dp.id);
      if (dp?.sku_code && dp?.id) prodNameToId.set(dp.sku_code.trim().toLowerCase(), dp.id);
    });

    for (let i = 0; i < localOrders.length; i++) {
      const o = localOrders[i];
      if (!o || !o.order_number) continue;

      let targetCustId: string | null = o.customer_id || (o.customer && o.customer.id) || null;
      if (!targetCustId || !validCustIds.has(targetCustId)) {
        const cName = o.customer?.name || o.customer?.outlet_name;
        if (cName && custNameToId.has(cName.trim().toLowerCase())) {
          targetCustId = custNameToId.get(cName.trim().toLowerCase()) || null;
        }
      }

      if (!targetCustId || !validCustIds.has(targetCustId)) {
        // Fallback to first available customer so order is preserved
        targetCustId = dbCustomers?.[0]?.id || null;
      }

      if (!targetCustId) {
        summary.errors.push(`Order ${o.order_number} skipped: No valid customer linked.`);
        continue;
      }

      const orderId = isValidUUID(o.id) ? o.id : generateUUID();

      const orderTotal = Number(o.total_amount) || 0;
      const orderPaid = Number(o.paid_amount) || 0;
      const orderPayload = sanitizeOrderPayload({
        id: orderId,
        order_number: o.order_number.trim(),
        customer_id: targetCustId,
        sales_rep_id: isValidUUID(o.sales_rep_id) ? o.sales_rep_id : null,
        order_date: o.order_date || new Date().toISOString().slice(0, 10),
        delivery_date: o.delivery_date || null,
        status: normalizeOrderStatus(o.status),
        subtotal: Number(o.subtotal) || orderTotal,
        discount: Number(o.discount) || 0,
        total_amount: orderTotal,
        paid_amount: orderPaid,
        due_amount: Number(o.due_amount) || 0,
        payment_status: normalizePaymentStatus(o.payment_status, orderPaid, orderTotal),
        notes: o.notes || null,
        updated_at: new Date().toISOString(),
      });

      const { error: orderError } = await safeTimedQuery(
        supabase.from("orders").upsert(orderPayload, { onConflict: "order_number" }),
        10000,
        `Order upsert (${o.order_number})`,
      );

      if (orderError) {
        summary.errors.push(`Order ${o.order_number}: ${orderError.message}`);
      } else {
        summary.orders++;

        // Sync order items
        const rawItems = (o as any).items || (o as any).order_items || [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          for (const item of rawItems) {
            let prodId: string | null = item.product_id || (item.product && item.product.id) || null;
            if (!prodId || !validProdIds.has(prodId)) {
              const pName = item.product?.name || item.name;
              if (pName && prodNameToId.has(pName.trim().toLowerCase())) {
                prodId = prodNameToId.get(pName.trim().toLowerCase()) || null;
              }
            }

            if (prodId && validProdIds.has(prodId)) {
              const itemPayload = sanitizeOrderItemPayload({
                id: isValidUUID(item.id) ? item.id : generateUUID(),
                order_id: orderId,
                product_id: prodId,
                quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
                unit_price: Number(item.unit_price) || 0,
                discount: Number(item.discount) || 0,
                subtotal: Number(item.subtotal) || (Number(item.quantity || 1) * Number(item.unit_price || 0)),
                price_tier: item.price_tier || "DP",
              });

              // Attempt insert first to avoid PostgREST RLS UPDATE policy violations on existing items
              const { error: itemError } = await safeTimedQuery(
                supabase.from("order_items").insert(itemPayload),
                10000,
                `Order item insert (${itemPayload.id})`,
              );

              if (!itemError) {
                summary.orderItems++;
              } else if (itemError.code === "23505" || itemError.message?.includes("duplicate") || itemError.message?.includes("unique")) {
                // Item already exists in cloud database
                summary.orderItems++;
              } else {
                // Fallback attempt with upsert
                const { error: retryError } = await safeTimedQuery(
                  supabase.from("order_items").upsert(itemPayload, { onConflict: "id" }),
                  10000,
                  `Order item upsert (${itemPayload.id})`,
                );
                if (!retryError) {
                  summary.orderItems++;
                } else {
                  console.warn(`Order item sync notice (${itemPayload.id}):`, retryError.message);
                  summary.errors.push(`Order item (${o.order_number}): ${retryError.message}`);
                }
              }
            }
          }
        }
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Orders", i + 1, localOrders.length);
    }

    // ---------------------------------------------------------
    // 5. SYNC COLLECTIONS
    // ---------------------------------------------------------
    const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
    const localCollections = getCollections().filter((c) => c && !deletedColIds.has(String(c.id)));
    report("Synchronizing Collections", 0, localCollections.length);

    for (let i = 0; i < localCollections.length; i++) {
      const col = localCollections[i];
      if (!col || !col.collection_number) continue;

      let custId: string | null = col.customer_id || (col.customer && col.customer.id) || null;
      if (!custId || !validCustIds.has(custId)) {
        const cName = col.customer?.name;
        if (cName && custNameToId.has(cName.trim().toLowerCase())) {
          custId = custNameToId.get(cName.trim().toLowerCase()) || null;
        }
      }

      if (!custId || !validCustIds.has(custId)) {
        custId = dbCustomers?.[0]?.id || null;
      }

      if (!custId) continue;

      const colAmount = Number(col.amount) || 0;
      if (colAmount <= 0) continue;

      const colPayload = sanitizeCollectionPayload({
        id: isValidUUID(col.id) ? col.id : generateUUID(),
        collection_number: col.collection_number.trim(),
        customer_id: custId,
        order_id: isValidUUID(col.order_id) ? col.order_id : null,
        amount: colAmount,
        payment_method: normalizePaymentMethod(col.payment_method),
        collection_date: col.collection_date || new Date().toISOString().slice(0, 10),
        collected_by: isValidUUID((col as any).collected_by) ? (col as any).collected_by : null,
        notes: col.notes || null,
      });

      const { error: colError } = await safeTimedQuery(
        supabase.from("collections").upsert(colPayload, { onConflict: "collection_number" }),
        10000,
        `Collection upsert (${col.collection_number})`,
      );

      if (colError) {
        summary.errors.push(`Collection ${col.collection_number}: ${colError.message}`);
      } else {
        summary.collections++;
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Collections", i + 1, localCollections.length);
    }

    // ---------------------------------------------------------
    // 6. SYNC EXPENSES
    // ---------------------------------------------------------
    const deletedExpIds = getDeletedIds(STORAGE_KEYS.DELETED_EXPENSES);
    const localExpenses = getLocalData<any[]>(STORAGE_KEYS.EXPENSES, []).filter(
      (e) => e && !deletedExpIds.has(String(e.id)),
    );
    report("Synchronizing Expenses", 0, localExpenses.length);

    for (let i = 0; i < localExpenses.length; i++) {
      const exp = localExpenses[i];
      if (!exp || !exp.category) continue;

      const expAmount = Number(exp.amount) || 0;
      if (expAmount <= 0) continue;

      const expPayload = sanitizeExpensePayload({
        id: isValidUUID(exp.id) ? exp.id : generateUUID(),
        category: exp.category,
        description: exp.description || exp.category,
        amount: expAmount,
        expense_date: exp.expense_date || exp.date || new Date().toISOString().slice(0, 10),
        recorded_by: isValidUUID(exp.recorded_by) ? exp.recorded_by : null,
        notes: exp.notes || null,
      });

      const { error: expError } = await safeTimedQuery(
        supabase.from("expenses").upsert(expPayload, { onConflict: "id" }),
        10000,
        `Expense upsert (${exp.category})`,
      );

      if (expError) {
        summary.errors.push(`Expense "${exp.category}": ${expError.message}`);
      } else {
        summary.expenses++;
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Expenses", i + 1, localExpenses.length);
    }

    // ---------------------------------------------------------
    // 7. SYNC INVENTORY
    // ---------------------------------------------------------
    const localInventory = getLocalData<any[]>(STORAGE_KEYS.INVENTORY, []);
    report("Synchronizing Inventory", 0, localInventory.length);

    for (let i = 0; i < localInventory.length; i++) {
      const inv = localInventory[i];
      if (!inv || !inv.product_id) continue;

      if (inv.product_id && validProdIds.has(String(inv.product_id))) {
        const invPayload = sanitizeInventoryPayload({
          product_id: inv.product_id,
          warehouse: inv.warehouse === "Main Warehouse" ? "Main" : (inv.warehouse || "Main"),
          quantity: Math.max(0, Math.round(Number(inv.quantity) || 0)),
          updated_at: new Date().toISOString(),
        });

        const { error: invError } = await safeTimedQuery(
          supabase.from("inventory").upsert(invPayload, { onConflict: "product_id,warehouse" }),
          10000,
          `Inventory upsert (${inv.product_id})`,
        );

        if (!invError) {
          summary.inventory++;
        } else {
          summary.errors.push(`Inventory (${inv.product_id}): ${invError.message}`);
        }
      }
      if (i % 5 === 0) await yieldToUI();
      report("Synchronizing Inventory", i + 1, localInventory.length);
    }

    // Pull authoritative cloud state back so local IDs/flags converge 100% with Supabase
    await pullFreshCloudStateToLocalStore({ force: true, silent: true });

    // Final Storage update dispatch (single CustomEvent + BroadcastChannel)
    if (typeof window !== "undefined") {
      const detail = { type: "cloud_sync_completed" };
      window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail }));
      broadcastCrossTabSync({ detail });
    }

    if (summary.errors.length > 0) {
      toast.warning(
        `Cloud sync completed with ${summary.errors.length} issue(s): ${summary.errors[0]}`,
      );
    } else {
      toast.success(
        `Cloud Migration Complete: ${summary.products} products, ${summary.customers} customers, ${summary.orders} orders synchronized to Supabase!`
      );
    }
  } catch (err: any) {
    const classified = classifySupabaseError(err);
    const errorMsg = classified.userMessage || err?.message || String(err);
    summary.errors.push(errorMsg);
    toast.error(`Sync error: ${errorMsg}`);
  } finally {
    isCloudSyncing = false;
  }

  return summary;
}

/**
 * Pulls authoritative cloud data from Supabase and reconciles localStorage mirrors
 * so Web and Mobile platforms always render identical state on startup, reconnect, or Realtime updates.
 */
export async function pullFreshCloudStateToLocalStore(options?: {
  force?: boolean;
  silent?: boolean;
  notifyOnError?: boolean;
}): Promise<CloudPullResult> {
  if (typeof window === "undefined") {
    return { synced: false, updatedTables: [], error: null };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: false, updatedTables: [], offline: true, error: null };
  }

  const now = Date.now();
  if (!options?.force && now - lastCloudPullAt < 1500) {
    return inFlightCloudPull ?? { synced: false, updatedTables: [], error: null };
  }
  if (inFlightCloudPull) {
    if (options?.force && now - lastCloudPullAt > 400) {
      await inFlightCloudPull.catch(() => null);
    } else {
      return inFlightCloudPull;
    }
  }

  const task = (async (): Promise<CloudPullResult> => {
    try {
      const sessionCheck = await ensureValidSession();
      if (sessionCheck.offline) {
        return { synced: false, updatedTables: [], offline: true, error: null };
      }
      // If user session is absent or refreshing, log diagnostic notice but proceed with read queries
      // since primary tables have read permissions open to anon & authenticated roles.
      if (!sessionCheck.session || !hasActiveSessionToken(sessionCheck.session)) {
        if (sessionCheck.error) {
          console.warn("[CloudSync] Session verification note; proceeding with cloud read queries:", sessionCheck.error.rawMessage);
        }
      }

      lastCloudPullAt = Date.now();

      const isSchemaOrRelationError = (err: any): boolean => {
        if (!err) return false;
        const code = String(err.code || "");
        const msg = String(err.message || "").toLowerCase();
        return (
          code === "42703" ||
          code === "PGRST200" ||
          code === "PGRST204" ||
          code === "PGRST201" ||
          msg.includes("column") ||
          msg.includes("relationship") ||
          msg.includes("schema cache")
        );
      };

      const fetchProductsSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("products")
              .select(SUPABASE_TABLE_SELECTS.productsFull)
              .order("name", { ascending: true })
              .limit(1000),
          10000,
          "Cloud pull products",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          const core = await safeTimedQuery(
            () =>
              supabase
                .from("products")
                .select(SUPABASE_TABLE_SELECTS.productsCoreFallback)
                .order("name", { ascending: true })
                .limit(1000),
            10000,
            "Cloud pull products fallback",
            1,
          );
          if (!core.error) return core;
          if (isSchemaOrRelationError(core.error)) {
            return safeTimedQuery(
              () =>
                supabase
                  .from("products")
                  .select(SUPABASE_TABLE_SELECTS.productsFlatFallback)
                  .order("name", { ascending: true })
                  .limit(1000),
              10000,
              "Cloud pull products flat fallback",
              1,
            );
          }
          return core;
        }
        return full;
      };

      const fetchOrdersSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("orders")
              .select(SUPABASE_TABLE_SELECTS.ordersWithItemsAndCustomer)
              .order("order_date", { ascending: false })
              .limit(1000),
          10000,
          "Cloud pull orders",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          const core = await safeTimedQuery(
            () =>
              supabase
                .from("orders")
                .select(SUPABASE_TABLE_SELECTS.ordersCoreFallback)
                .order("order_date", { ascending: false })
                .limit(1000),
            10000,
            "Cloud pull orders fallback",
            1,
          );
          if (!core.error) return core;
          if (isSchemaOrRelationError(core.error)) {
            return safeTimedQuery(
              () =>
                supabase
                  .from("orders")
                  .select(SUPABASE_TABLE_SELECTS.ordersFlatFallback)
                  .order("order_date", { ascending: false })
                  .limit(1000),
              10000,
              "Cloud pull orders flat fallback",
              1,
            );
          }
          return core;
        }
        return full;
      };

      const fetchCollectionsSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("collections")
              .select(SUPABASE_TABLE_SELECTS.collections)
              .order("collection_date", { ascending: false })
              .limit(2000),
          10000,
          "Cloud pull collections",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          return safeTimedQuery(
            () =>
              supabase
                .from("collections")
                .select(SUPABASE_TABLE_SELECTS.collectionsCoreFallback)
                .order("collection_date", { ascending: false })
                .limit(2000),
            10000,
            "Cloud pull collections fallback",
            1,
          );
        }
        return full;
      };

      const fetchCustomersSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("customers")
              .select(SUPABASE_TABLE_SELECTS.customers)
              .order("name", { ascending: true })
              .limit(2000),
          10000,
          "Cloud pull customers",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          return safeTimedQuery(
            () =>
              supabase
                .from("customers")
                .select(SUPABASE_TABLE_SELECTS.customersCoreFallback)
                .order("name", { ascending: true })
                .limit(2000),
            10000,
            "Cloud pull customers fallback",
            1,
          );
        }
        return full;
      };

      const fetchCategoriesSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("categories")
              .select("id, name, description, created_at")
              .order("name", { ascending: true })
              .limit(500),
          10000,
          "Cloud pull categories",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          return safeTimedQuery(
            () =>
              supabase
                .from("categories")
                .select("id, name")
                .order("name", { ascending: true })
                .limit(500),
            10000,
            "Cloud pull categories fallback",
            1,
          );
        }
        return full;
      };

      const fetchExpensesSafe = async () => {
        const full = await safeTimedQuery(
          () =>
            supabase
              .from("expenses")
              .select("id, category, description, amount, expense_date, recorded_by, notes, created_at")
              .order("expense_date", { ascending: false })
              .limit(1000),
          10000,
          "Cloud pull expenses",
          1,
        );
        if (!full.error) return full;
        if (isSchemaOrRelationError(full.error)) {
          return safeTimedQuery(
            () =>
              supabase
                .from("expenses")
                .select("id, category, amount, expense_date, created_at")
                .order("expense_date", { ascending: false })
                .limit(1000),
            10000,
            "Cloud pull expenses fallback",
            1,
          );
        }
        return full;
      };

      const fetchVisitsSafe = async () => {
        return safeTimedQuery(
          () =>
            supabase
              .from("visits")
              .select(SUPABASE_TABLE_SELECTS.visits)
              .order("visit_date", { ascending: false })
              .limit(1000),
          10000,
          "Cloud pull visits",
          1,
        );
      };

      const fetchTerritoriesSafe = async () => {
        return safeTimedQuery(
          () =>
            supabase
              .from("territories")
              .select(SUPABASE_TABLE_SELECTS.territories)
              .order("name", { ascending: true })
              .limit(500),
          10000,
          "Cloud pull territories",
          1,
        );
      };

      const fetchInventorySafe = async () => {
        return safeTimedQuery(
          () =>
            supabase
              .from("inventory")
              .select(SUPABASE_TABLE_SELECTS.inventory)
              .limit(1000),
          10000,
          "Cloud pull inventory",
          1,
        );
      };

      const [ordersRes, colsRes, custRes, prodRes, catRes, expRes, visitsRes, terrRes, invRes] = await Promise.allSettled([
        fetchOrdersSafe(),
        fetchCollectionsSafe(),
        fetchCustomersSafe(),
        fetchProductsSafe(),
        fetchCategoriesSafe(),
        fetchExpensesSafe(),
        fetchVisitsSafe(),
        fetchTerritoriesSafe(),
        fetchInventorySafe(),
      ]);

      await yieldToUI();
      const updatedTables: string[] = [];
      const tableErrors: Array<{ table: string; error: any }> = [];

      // 1. ORDERS
      try {
        const res = ordersRes.status === "fulfilled" ? ordersRes.value : { data: null, error: ordersRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileOrdersWithRemote(res.data as any, { persist: true, maxCache: 500 });
          updatedTables.push("orders");
        } else if (res.error) {
          tableErrors.push({ table: "orders", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "orders", error: e });
        console.warn("[CloudSync] Orders reconcile notice:", e);
      }

      // 2. COLLECTIONS
      try {
        const res = colsRes.status === "fulfilled" ? colsRes.value : { data: null, error: colsRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileCollectionsWithRemote(res.data as any, { persist: true, maxCache: 1000 });
          updatedTables.push("collections");
        } else if (res.error) {
          tableErrors.push({ table: "collections", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "collections", error: e });
        console.warn("[CloudSync] Collections reconcile notice:", e);
      }

      // 3. CUSTOMERS
      try {
        const res = custRes.status === "fulfilled" ? custRes.value : { data: null, error: custRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          mergeAndEnrichCustomers(res.data as any, { persist: true });
          updatedTables.push("customers");
        } else if (res.error) {
          tableErrors.push({ table: "customers", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "customers", error: e });
        console.warn("[CloudSync] Customers reconcile notice:", e);
      }

      // 4. PRODUCTS
      try {
        const res = prodRes.status === "fulfilled" ? prodRes.value : { data: null, error: prodRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileProductsWithRemote(res.data as any, { persist: true });
          updatedTables.push("products");
        } else if (res.error) {
          tableErrors.push({ table: "products", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "products", error: e });
        console.warn("[CloudSync] Products reconcile notice:", e);
      }

      // 5. CATEGORIES
      try {
        const res = catRes.status === "fulfilled" ? catRes.value : { data: null, error: catRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileCategoriesWithRemote(res.data as any, { persist: true });
          updatedTables.push("categories");
        } else if (res.error) {
          tableErrors.push({ table: "categories", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "categories", error: e });
        console.warn("[CloudSync] Categories reconcile notice:", e);
      }

      // 6. EXPENSES
      try {
        const res = expRes.status === "fulfilled" ? expRes.value : { data: null, error: expRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileExpensesWithRemote(res.data as any, { persist: true });
          updatedTables.push("expenses");
        } else if (res.error) {
          tableErrors.push({ table: "expenses", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "expenses", error: e });
        console.warn("[CloudSync] Expenses reconcile notice:", e);
      }

      // 7. VISITS
      try {
        const res = visitsRes.status === "fulfilled" ? visitsRes.value : { data: null, error: visitsRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileVisitsWithRemote(res.data as any, { persist: true });
          updatedTables.push("visits");
        } else if (res.error) {
          tableErrors.push({ table: "visits", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "visits", error: e });
        console.warn("[CloudSync] Visits reconcile notice:", e);
      }

      // 8. TERRITORIES
      try {
        const res = terrRes.status === "fulfilled" ? terrRes.value : { data: null, error: terrRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileAreasWithRemote(res.data as any, { persist: true });
          updatedTables.push("territories");
        } else if (res.error) {
          tableErrors.push({ table: "territories", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "territories", error: e });
        console.warn("[CloudSync] Territories reconcile notice:", e);
      }

      // 9. INVENTORY
      try {
        const res = invRes.status === "fulfilled" ? invRes.value : { data: null, error: invRes.reason };
        if (!res.error && Array.isArray(res.data)) {
          reconcileInventoryWithRemote(res.data as any, { persist: true });
          updatedTables.push("inventory");
        } else if (res.error) {
          tableErrors.push({ table: "inventory", error: res.error });
        }
      } catch (e) {
        tableErrors.push({ table: "inventory", error: e });
        console.warn("[CloudSync] Inventory reconcile notice:", e);
      }

      if (updatedTables.length > 0) {
        const detail = { type: "cloud_pull_completed", updatedTables };
        window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail }));
        broadcastCrossTabSync({ detail });
      }

      if (tableErrors.length > 0) {
        const classified = classifySupabaseError(tableErrors[0].error);
        if (classified.kind === "auth") {
          void ensureValidSession(true);
        }
        console.warn(
          `[CloudSync] Background cloud pull notice (${tableErrors.map((t) => t.table).join(", ")}): maintaining available local state without error banner.`,
        );
        // Suppress intrusive toasts and fallback banner
        return {
          synced: updatedTables.length > 0,
          updatedTables,
          offline: false,
          error: null,
        };
      }

      return { synced: updatedTables.length > 0, updatedTables, error: null };
    } catch (err) {
      lastCloudPullAt = 0;
      console.warn("[CloudSync] Background cloud pull notice:", err);
      // Suppress intrusive toasts and fallback banner
      return {
        synced: false,
        updatedTables: [],
        offline: false,
        error: null,
      };
    } finally {
      inFlightCloudPull = null;
    }
  })();

  inFlightCloudPull = task;
  return task;
}

/**
 * Downloads a complete full-fidelity JSON dump of all local ERP stores
 */
export function exportAllLocalData(): void {
  const exportData = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    categories: getLocalData(STORAGE_KEYS.CATEGORIES, []),
    products: getProducts(),
    customers: getCustomers(),
    orders: getOrders(),
    collections: getCollections(),
    expenses: getLocalData(STORAGE_KEYS.EXPENSES, []),
    inventory: getLocalData(STORAGE_KEYS.INVENTORY, []),
    areas: getAreas(),
    users: getLocalData(STORAGE_KEYS.USERS, []),
    suppliers: getLocalData(STORAGE_KEYS.SUPPLIERS, []),
    purchase_invoices: getLocalData(STORAGE_KEYS.PURCHASE_INVOICES, []),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  void exportJsonBackup(`hamko_erp_full_backup_${dateStr}.json`, jsonStr);
}

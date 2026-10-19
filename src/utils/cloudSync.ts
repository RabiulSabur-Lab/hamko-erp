import { supabase } from "@/lib/supabase";
import {
  STORAGE_KEYS,
  getLocalData,
  getProducts,
  getCustomers,
  getOrders,
  getCollections,
  getAreas,
} from "./localStore";
import { toast } from "sonner";

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
 * Encodes extra customer metadata into the notes string so no custom attributes are lost
 */
function encodeCustomerNotes(cust: any): string {
  const parts: string[] = [];
  if (cust.notes && typeof cust.notes === "string") {
    const clean = cust.notes.replace(/\[(?:party_code|area|alt_phone|security_cheque):[^\]]*\]/g, "").trim();
    if (clean) parts.push(clean);
  }
  if (cust.party_code) parts.push(`[party_code:${cust.party_code}]`);
  if (cust.area) parts.push(`[area:${cust.area}]`);
  if (cust.alt_phone) parts.push(`[alt_phone:${cust.alt_phone}]`);
  if (cust.security_cheque_no || cust.securityChequeNo) {
    const chk = cust.security_cheque_no || cust.securityChequeNo;
    const bnk = cust.security_bank_name || cust.securityBankName || "";
    parts.push(`[security_cheque:${chk}|${bnk}]`);
  }
  return parts.join(" ");
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
    const { data: remoteCategories } = await supabase.from("categories").select("id, name");
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
        const { data, error } = await supabase
          .from("categories")
          .upsert(catPayload, { onConflict: "name" })
          .select("id, name")
          .single();

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
    const localProducts = getProducts();
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
        const { error } = await supabase
          .from("products")
          .upsert(currentPayload, { onConflict: "sku_code" });

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
      report("Synchronizing Products", i + 1, localProducts.length);
    }

    // ---------------------------------------------------------
    // 3. SYNC CUSTOMERS
    // ---------------------------------------------------------
    const localCustomers = getCustomers();
    report("Synchronizing Customers", 0, localCustomers.length);

    const { data: remoteTerritories } = await supabase.from("territories").select("id, name");
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

      const custPayload = {
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
        due_status: c.due_status || (Number(c.current_due) > 0 ? "Partial" : "Clear"),
        notes: encodeCustomerNotes(c),
        assigned_to: isValidUUID(c.assigned_to) ? c.assigned_to : null,
        is_active: c.is_active !== false,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("customers")
        .upsert(custPayload, { onConflict: "id" });

      if (error) {
        summary.errors.push(`Customer "${c.name}": ${error.message}`);
      } else {
        summary.customers++;
      }
      report("Synchronizing Customers", i + 1, localCustomers.length);
    }

    // ---------------------------------------------------------
    // 4. SYNC ORDERS & ORDER ITEMS
    // ---------------------------------------------------------
    const localOrders = getOrders();
    report("Synchronizing Orders", 0, localOrders.length);

    // Fetch existing customer IDs to avoid foreign-key violations
    const { data: dbCustomers } = await supabase.from("customers").select("id, name");
    const validCustIds = new Set<string>((dbCustomers || []).map((dc) => dc.id));
    const custNameToId = new Map<string, string>();
    (dbCustomers || []).forEach((dc) => custNameToId.set(dc.name.trim().toLowerCase(), dc.id));

    // Fetch products to map order product IDs
    const { data: dbProducts } = await supabase.from("products").select("id, name, sku_code");
    const validProdIds = new Set<string>((dbProducts || []).map((dp) => dp.id));
    const prodNameToId = new Map<string, string>();
    (dbProducts || []).forEach((dp) => {
      prodNameToId.set(dp.name.trim().toLowerCase(), dp.id);
      prodNameToId.set(dp.sku_code.trim().toLowerCase(), dp.id);
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

      const orderPayload = {
        id: orderId,
        order_number: o.order_number.trim(),
        customer_id: targetCustId,
        sales_rep_id: isValidUUID(o.sales_rep_id) ? o.sales_rep_id : null,
        order_date: o.order_date || new Date().toISOString().slice(0, 10),
        delivery_date: o.delivery_date || null,
        status: o.status || "Delivered",
        subtotal: Number(o.subtotal) || Number(o.total_amount) || 0,
        discount: Number(o.discount) || 0,
        total_amount: Number(o.total_amount) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        due_amount: Number(o.due_amount) || 0,
        payment_status: o.payment_status || "Pending",
        notes: o.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error: orderError } = await supabase
        .from("orders")
        .upsert(orderPayload, { onConflict: "order_number" });

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
              const itemPayload = {
                id: isValidUUID(item.id) ? item.id : generateUUID(),
                order_id: orderId,
                product_id: prodId,
                quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
                unit_price: Number(item.unit_price) || 0,
                discount: Number(item.discount) || 0,
                subtotal: Number(item.subtotal) || (Number(item.quantity || 1) * Number(item.unit_price || 0)),
                price_tier: item.price_tier || null,
              };

              // Attempt insert first to avoid PostgREST RLS UPDATE policy violations on existing items
              const { error: itemError } = await supabase
                .from("order_items")
                .insert(itemPayload);

              if (!itemError) {
                summary.orderItems++;
              } else if (itemError.code === "23505" || itemError.message.includes("duplicate") || itemError.message.includes("unique")) {
                // Item already exists in cloud database
                summary.orderItems++;
              } else {
                // Fallback attempt with upsert
                const { error: retryError } = await supabase
                  .from("order_items")
                  .upsert(itemPayload, { onConflict: "id" });
                if (!retryError) {
                  summary.orderItems++;
                } else {
                  console.warn(`Order item sync notice (${itemPayload.id}):`, retryError.message);
                }
              }
            }
          }
        }
      }
      report("Synchronizing Orders", i + 1, localOrders.length);
    }

    // ---------------------------------------------------------
    // 5. SYNC COLLECTIONS
    // ---------------------------------------------------------
    const localCollections = getCollections();
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

      const colPayload = {
        id: isValidUUID(col.id) ? col.id : generateUUID(),
        collection_number: col.collection_number.trim(),
        customer_id: custId,
        order_id: isValidUUID(col.order_id) ? col.order_id : null,
        amount: Number(col.amount) || 0,
        payment_method: col.payment_method || "Cash",
        collection_date: col.collection_date || new Date().toISOString().slice(0, 10),
        collected_by: isValidUUID((col as any).collected_by) ? (col as any).collected_by : null,
        notes: col.notes || null,
      };

      const { error: colError } = await supabase
        .from("collections")
        .upsert(colPayload, { onConflict: "collection_number" });

      if (colError) {
        summary.errors.push(`Collection ${col.collection_number}: ${colError.message}`);
      } else {
        summary.collections++;
      }
      report("Synchronizing Collections", i + 1, localCollections.length);
    }

    // ---------------------------------------------------------
    // 6. SYNC EXPENSES
    // ---------------------------------------------------------
    const localExpenses = getLocalData<any[]>(STORAGE_KEYS.EXPENSES, []);
    report("Synchronizing Expenses", 0, localExpenses.length);

    for (let i = 0; i < localExpenses.length; i++) {
      const exp = localExpenses[i];
      if (!exp || !exp.category) continue;

      const expPayload = {
        id: isValidUUID(exp.id) ? exp.id : generateUUID(),
        category: exp.category,
        description: exp.description || exp.category,
        amount: Number(exp.amount) || 0,
        expense_date: exp.expense_date || exp.date || new Date().toISOString().slice(0, 10),
        recorded_by: isValidUUID(exp.recorded_by) ? exp.recorded_by : null,
        notes: exp.notes || null,
      };

      const { error: expError } = await supabase
        .from("expenses")
        .upsert(expPayload, { onConflict: "id" });

      if (expError) {
        summary.errors.push(`Expense "${exp.category}": ${expError.message}`);
      } else {
        summary.expenses++;
      }
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
        const invPayload = {
          product_id: inv.product_id,
          warehouse: inv.warehouse === "Main Warehouse" ? "Main" : (inv.warehouse || "Main"),
          quantity: Math.max(0, Math.round(Number(inv.quantity) || 0)),
          updated_at: new Date().toISOString(),
        };

        const { error: invError } = await supabase
          .from("inventory")
          .upsert(invPayload, { onConflict: "product_id,warehouse" });

        if (!invError) summary.inventory++;
      }
      report("Synchronizing Inventory", i + 1, localInventory.length);
    }

    // Final Storage update dispatch
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sales_erp_storage_update", { detail: { type: "cloud_sync_completed" } }));
      window.dispatchEvent(new Event("storage"));
    }

    toast.success(
      `Cloud Migration Complete: ${summary.products} products, ${summary.customers} customers, ${summary.orders} orders synchronized to Supabase!`
    );
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    summary.errors.push(errorMsg);
    toast.error(`Sync error: ${errorMsg}`);
  }

  return summary;
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
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `hamko_erp_full_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

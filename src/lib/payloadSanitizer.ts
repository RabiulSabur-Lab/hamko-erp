/**
 * Schema Resilience & Database Payload Sanitizer
 *
 * Guarantees that all payloads sent to Supabase strictly match the physical
 * PostgreSQL table columns, preventing PostgREST PGRST204 errors:
 * "Could not find the 'column_name' column of 'table_name' in the schema cache".
 */

export const ALLOWED_TABLE_COLUMNS = {
  customers: new Set([
    "id",
    "name",
    "customer_type",
    "contact_person",
    "phone",
    "email",
    "address",
    "city",
    "territory_id",
    "trade_license_number",
    "latitude",
    "longitude",
    "opening_balance",
    "current_due",
    "due_status",
    "notes",
    "assigned_to",
    "is_active",
    "created_at",
    "updated_at",
  ]),

  orders: new Set([
    "id",
    "order_number",
    "customer_id",
    "sales_rep_id",
    "order_date",
    "delivery_date",
    "status",
    "subtotal",
    "discount",
    "total_amount",
    "paid_amount",
    "due_amount",
    "payment_status",
    "notes",
    "created_at",
    "updated_at",
  ]),

  order_items: new Set([
    "id",
    "order_id",
    "product_id",
    "quantity",
    "unit_price",
    "discount",
    "subtotal",
    "price_tier",
    "created_at",
  ]),

  collections: new Set([
    "id",
    "collection_number",
    "customer_id",
    "order_id",
    "amount",
    "payment_method",
    "collection_date",
    "collected_by",
    "notes",
    "created_at",
  ]),

  products: new Set([
    "id",
    "sku_code",
    "name",
    "brand",
    "category_id",
    "unit_price",
    "dealer_price",
    "distributor_price",
    "mrp",
    "d10_price",
    "b12_price",
    "price_tiers",
    "stock_quantity",
    "reorder_level",
    "unit",
    "image_url",
    "is_active",
    "created_at",
    "updated_at",
  ]),

  categories: new Set([
    "id",
    "name",
    "description",
    "created_at",
  ]),

  inventory: new Set([
    "id",
    "product_id",
    "warehouse",
    "quantity",
    "updated_at",
  ]),

  stock_transactions: new Set([
    "id",
    "product_id",
    "transaction_type",
    "quantity",
    "from_warehouse",
    "to_warehouse",
    "reference",
    "notes",
    "performed_by",
    "transaction_date",
  ]),

  expenses: new Set([
    "id",
    "category",
    "description",
    "amount",
    "expense_date",
    "recorded_by",
    "notes",
    "created_at",
  ]),

  visits: new Set([
    "id",
    "customer_id",
    "visited_by",
    "visit_date",
    "check_in",
    "check_out",
    "latitude",
    "longitude",
    "purpose",
    "outcome",
    "notes",
    "created_at",
  ]),

  territories: new Set([
    "id",
    "name",
    "code",
    "manager_id",
    "region",
    "created_at",
  ]),

  sales_targets: new Set([
    "id",
    "user_id",
    "territory_id",
    "period",
    "period_start",
    "period_end",
    "target_amount",
    "achieved_amount",
    "created_at",
  ]),

  notifications: new Set([
    "id",
    "user_id",
    "type",
    "title",
    "message",
    "is_read",
    "link",
    "created_at",
  ]),

  users: new Set([
    "id",
    "email",
    "full_name",
    "phone",
    "role_name",
    "territory_id",
    "is_active",
    "created_at",
    "updated_at",
  ]),

  suppliers: new Set([
    "id",
    "name",
    "contact_person",
    "phone",
    "email",
    "address",
    "opening_balance",
    "created_at",
    "updated_at",
  ]),

  purchase_invoices: new Set([
    "id",
    "invoice_number",
    "supplier_id",
    "supplier_name",
    "chalan_number",
    "invoice_date",
    "total_amount",
    "paid_amount",
    "due_amount",
    "payment_status",
    "items",
    "notes",
    "created_at",
    "updated_at",
  ]),

  supplier_payments: new Set([
    "id",
    "payment_number",
    "supplier_id",
    "supplier_name",
    "payment_date",
    "amount",
    "payment_method",
    "reference_no",
    "notes",
    "created_at",
  ]),

  handovers: new Set([
    "id",
    "handover_number",
    "officer_id",
    "officer_name",
    "session_date",
    "total_amount",
    "cash_amount",
    "bkash_amount",
    "cheque_amount",
    "verification_pin",
    "status",
    "collection_ids",
    "created_at",
    "verified_at",
    "verified_by",
  ]),

  route_plan: new Set([
    "id",
    "customer_id",
    "day_of_week",
    "notes",
    "created_at",
  ]),
} as const;

export type SupabaseTableName = keyof typeof ALLOWED_TABLE_COLUMNS;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function isValidUuid(str: unknown): boolean {
  if (typeof str !== "string") return false;
  const trimmed = str.trim().toLowerCase();
  if (!trimmed || trimmed === NIL_UUID || /^0+$/.test(trimmed.replace(/-/g, ""))) {
    return false;
  }
  return UUID_REGEX.test(trimmed);
}

export function generateUuid(): string {
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
 * Common frontend alias mappings per table
 */
const TABLE_KEY_ALIASES: Record<string, Record<string, string>> = {
  customers: {
    outlet_name: "name",
    outletName: "name",
    customer_name: "name",
    customerName: "name",
    currentDue: "current_due",
    openingBalance: "opening_balance",
    territoryId: "territory_id",
    tradeLicenseNumber: "trade_license_number",
    contactPerson: "contact_person",
    customerType: "customer_type",
    assignedTo: "assigned_to",
    isActive: "is_active",
  },
  orders: {
    orderNumber: "order_number",
    customerId: "customer_id",
    salesRepId: "sales_rep_id",
    orderDate: "order_date",
    deliveryDate: "delivery_date",
    total: "total_amount",
    totalAmount: "total_amount",
    paidAmount: "paid_amount",
    dueAmount: "due_amount",
    paymentStatus: "payment_status",
  },
  order_items: {
    orderId: "order_id",
    productId: "product_id",
    unitPrice: "unit_price",
    priceTier: "price_tier",
  },
  collections: {
    collectionNumber: "collection_number",
    customerId: "customer_id",
    orderId: "order_id",
    paymentMethod: "payment_method",
    collectionDate: "collection_date",
    collectedBy: "collected_by",
  },
  products: {
    sku: "sku_code",
    skuCode: "sku_code",
    categoryId: "category_id",
    unitPrice: "unit_price",
    dealerPrice: "dealer_price",
    distributorPrice: "distributor_price",
    stockQuantity: "stock_quantity",
    stock: "stock_quantity",
    reorderLevel: "reorder_level",
    imageUrl: "image_url",
    priceTiers: "price_tiers",
    isActive: "is_active",
  },
  stock_transactions: {
    productId: "product_id",
    transactionType: "transaction_type",
    fromWarehouse: "from_warehouse",
    toWarehouse: "to_warehouse",
    performedBy: "performed_by",
    transactionDate: "transaction_date",
  },
  visits: {
    customerId: "customer_id",
    visitedBy: "visited_by",
    visitDate: "visit_date",
    checkIn: "check_in",
    checkOut: "check_out",
  },
  expenses: {
    expenseDate: "expense_date",
    recordedBy: "recorded_by",
  },
  sales_targets: {
    userId: "user_id",
    territoryId: "territory_id",
    periodStart: "period_start",
    periodEnd: "period_end",
    targetAmount: "target_amount",
    achievedAmount: "achieved_amount",
  },
  notifications: {
    userId: "user_id",
    isRead: "is_read",
  },
  users: {
    fullName: "full_name",
    name: "full_name",
    roleName: "role_name",
    role: "role_name",
    territoryId: "territory_id",
    isActive: "is_active",
  },
  territories: {
    code_prefix: "code",
    codePrefix: "code",
    managerId: "manager_id",
  },
  purchase_invoices: {
    status: "payment_status",
    paymentStatus: "payment_status",
    invoiceNumber: "invoice_number",
    chalanNumber: "chalan_number",
    supplierId: "supplier_id",
    supplierName: "supplier_name",
    invoiceDate: "invoice_date",
    totalAmount: "total_amount",
    paidAmount: "paid_amount",
    dueAmount: "due_amount",
  },
  supplier_payments: {
    payment_mode: "payment_method",
    paymentMode: "payment_method",
    paymentMethod: "payment_method",
    paymentNumber: "payment_number",
    referenceNo: "reference_no",
    supplierId: "supplier_id",
    supplierName: "supplier_name",
    paymentDate: "payment_date",
  },
};

/**
 * UUID foreign-key columns that should be nullified if given an empty or non-UUID value.
 */
const FOREIGN_KEY_COLUMNS = new Set([
  "customer_id",
  "order_id",
  "product_id",
  "sales_rep_id",
  "territory_id",
  "assigned_to",
  "collected_by",
  "recorded_by",
  "visited_by",
  "manager_id",
  "user_id",
  "category_id",
  "supplier_id",
  "officer_id",
]);

/**
 * Universal Database Payload Sanitizer
 * - Filters strictly against the physical PostgreSQL table schema whitelist.
 * - Safely maps known camelCase / frontend aliases to real columns.
 * - Strips any undefined values.
 * - Normalizes empty strings on nullable foreign keys to null.
 * - Ensures valid UUID for `id` (or generates one if invalid).
 * - Strips all frontend-only metadata (`is_offline`, `_unsynced`, `items`, `customer`, `party_code`, etc.).
 */
export function sanitizePayload<T extends Record<string, any> = Record<string, any>>(
  tableName: SupabaseTableName,
  rawPayload: Record<string, any> | null | undefined,
  options?: {
    generateIdIfMissing?: boolean;
    keepNulls?: boolean;
  },
): T {
  if (!rawPayload || typeof rawPayload !== "object") {
    return {} as T;
  }

  const allowedColumns = ALLOWED_TABLE_COLUMNS[tableName];
  if (!allowedColumns) {
    console.warn(`[PayloadSanitizer] No schema definition found for table "${tableName}". Returning raw payload.`);
    return { ...rawPayload } as T;
  }

  const aliases = TABLE_KEY_ALIASES[tableName] || {};
  const sanitized: Record<string, any> = {};

  // First pass: map aliases and identify candidate entries
  const candidateEntries: Array<[string, any]> = [];
  for (const [key, val] of Object.entries(rawPayload)) {
    if (val === undefined) continue;

    // Direct match with schema column
    if (allowedColumns.has(key as any)) {
      candidateEntries.push([key, val]);
      continue;
    }

    // Check alias mapping
    const mappedKey = aliases[key];
    if (mappedKey && allowedColumns.has(mappedKey as any)) {
      if (rawPayload[mappedKey] === undefined) {
        candidateEntries.push([mappedKey, val]);
      }
      continue;
    }

    // Unmapped frontend-only key is safely excluded
  }

  // Second pass: sanitize values
  for (const [colName, val] of candidateEntries) {
    // 1. Primary key `id` validation
    if (colName === "id") {
      if (typeof val === "string" && isValidUuid(val)) {
        sanitized.id = val.trim();
      } else if (options?.generateIdIfMissing) {
        sanitized.id = generateUuid();
      }
      continue;
    }

    // 2. Foreign key UUID columns
    if (FOREIGN_KEY_COLUMNS.has(colName)) {
      if (typeof val === "string" && isValidUuid(val)) {
        sanitized[colName] = val.trim();
      } else {
        // Non-UUID or empty string foreign keys must be null
        sanitized[colName] = null;
      }
      continue;
    }

    // 3. String trimming / empty string handling
    if (typeof val === "string") {
      const trimmed = val.trim();
      sanitized[colName] = trimmed === "" && !options?.keepNulls ? (colName === "name" || colName === "order_number" || colName === "sku_code" ? trimmed : null) : trimmed;
      continue;
    }

    // 4. Numeric handling
    if (typeof val === "number") {
      sanitized[colName] = isNaN(val) ? null : val;
      continue;
    }

    // 5. Default assignment
    sanitized[colName] = val;
  }

  if (options?.generateIdIfMissing && !sanitized.id && allowedColumns.has("id" as any)) {
    sanitized.id = generateUuid();
  }

  return sanitized as T;
}

/**
 * Specialized Sanitizer Helpers
 */
export function sanitizeCustomerPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("customers", raw, { generateIdIfMissing: isInsert });
  // Ensure valid customer_type
  if (sanitized.customer_type && !["Dealer", "Retailer", "Wholesale"].includes(sanitized.customer_type)) {
    sanitized.customer_type = "Retailer";
  }
  // Ensure valid due_status
  if (sanitized.due_status && !["Clear", "Overdue", "Partial"].includes(sanitized.due_status)) {
    sanitized.due_status = Number(sanitized.current_due || 0) > 0 ? "Partial" : "Clear";
  }
  return sanitized;
}

export function sanitizeOrderPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("orders", raw, { generateIdIfMissing: isInsert });
  // Ensure valid status
  if (sanitized.status && !["Draft", "Pending", "Approved", "Delivered", "Cancelled"].includes(sanitized.status)) {
    sanitized.status = "Draft";
  }
  // Ensure valid payment_status
  if (sanitized.payment_status && !["Unpaid", "Partial", "Paid"].includes(sanitized.payment_status)) {
    sanitized.payment_status = "Unpaid";
  }
  // Enforce strictly formatted YYYY-MM-DD or null for delivery_date
  if (sanitized.delivery_date) {
    const dStr = String(sanitized.delivery_date).trim();
    if (dStr === "" || dStr === "null" || dStr === "undefined") {
      sanitized.delivery_date = null;
    } else {
      const match = dStr.match(/^(\d{4}-\d{2}-\d{2})/);
      sanitized.delivery_date = match ? match[1] : null;
    }
  } else {
    sanitized.delivery_date = null;
  }
  return sanitized;
}

export function sanitizeOrderItemPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("order_items", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeSupplierPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("suppliers", raw, { generateIdIfMissing: isInsert });
}

export function sanitizePurchaseInvoicePayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("purchase_invoices", raw, { generateIdIfMissing: isInsert });
  if (!sanitized.chalan_number && sanitized.invoice_number) {
    sanitized.chalan_number = sanitized.invoice_number;
  }
  const rawStatus = String(raw?.payment_status ?? raw?.status ?? "").trim().toLowerCase();
  if (rawStatus === "paid") {
    sanitized.payment_status = "paid";
  } else if (rawStatus === "partial" || rawStatus === "partially paid") {
    sanitized.payment_status = "partial";
  } else if (rawStatus === "unpaid" || rawStatus === "received" || rawStatus === "pending") {
    const total = Number(sanitized.total_amount ?? raw?.total_amount ?? 0);
    const paid = Number(sanitized.paid_amount ?? raw?.paid_amount ?? 0);
    const due = Number(sanitized.due_amount ?? raw?.due_amount ?? Math.max(0, total - paid));
    sanitized.payment_status = due <= 0 && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  }
  return sanitized;
}

export function sanitizeSupplierPaymentPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("supplier_payments", raw, { generateIdIfMissing: isInsert });
  const rawMethod = String(raw?.payment_method ?? raw?.payment_mode ?? "cash").trim().toLowerCase();
  if (rawMethod.includes("bank")) {
    sanitized.payment_method = "bank";
  } else if (rawMethod.includes("cheque") || rawMethod.includes("check")) {
    sanitized.payment_method = "cheque";
  } else if (rawMethod.includes("mfs") || rawMethod.includes("bkash") || rawMethod.includes("nagad") || rawMethod.includes("mobile")) {
    sanitized.payment_method = "mfs";
  } else {
    sanitized.payment_method = "cash";
  }
  if (!sanitized.reference_no && sanitized.payment_number) {
    sanitized.reference_no = sanitized.payment_number;
  }
  return sanitized;
}

export function sanitizeTerritoryPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("territories", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeHandoverPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("handovers", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeRoutePlanPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("route_plan", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeCollectionPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("collections", raw, { generateIdIfMissing: isInsert });
  // Normalize payment method to accepted DB enum check
  if (sanitized.payment_method) {
    const pm = String(sanitized.payment_method).toLowerCase();
    if (pm.includes("bank")) sanitized.payment_method = "Bank Transfer";
    else if (pm.includes("mobile") || pm.includes("bkash") || pm.includes("nagad")) sanitized.payment_method = "Mobile Banking";
    else if (pm.includes("cheque") || pm.includes("check")) sanitized.payment_method = "Cheque";
    else sanitized.payment_method = "Cash";
  }
  return sanitized;
}

export function sanitizeProductPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("products", raw, { generateIdIfMissing: isInsert });
  if (sanitized.brand !== undefined) {
    const b = sanitized.brand;
    if (b === null || (typeof b === "string" && b.trim() === "")) {
      delete sanitized.brand; // Allow DB default 'Hamko'
    }
  }
  return sanitized;
}

export function sanitizeStockTxPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("stock_transactions", raw, { generateIdIfMissing: isInsert });
  if (sanitized.transaction_type && !["Stock In", "Stock Out", "Transfer", "Adjustment", "Damage"].includes(sanitized.transaction_type)) {
    sanitized.transaction_type = "Adjustment";
  }
  return sanitized;
}

export function sanitizeExpensePayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("expenses", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeVisitPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("visits", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeInventoryPayload<T extends Record<string, any>>(raw: T): Record<string, any> {
  return sanitizePayload("inventory", raw);
}

export function sanitizeSalesTargetPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("sales_targets", raw, { generateIdIfMissing: isInsert });
}

export function sanitizeUserPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  const sanitized = sanitizePayload("users", raw, { generateIdIfMissing: isInsert });
  if (sanitized.email) {
    sanitized.email = String(sanitized.email).trim().toLowerCase();
  }
  if (!sanitized.full_name) {
    const fallbackName = String(raw?.full_name || raw?.fullName || raw?.name || "").trim();
    sanitized.full_name = fallbackName || (sanitized.email ? String(sanitized.email).split("@")[0] : "User");
  }
  const rawRole = String(raw?.role_name || raw?.roleName || raw?.role || sanitized.role_name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (rawRole.includes("superadmin") || rawRole === "admin") {
    sanitized.role_name = "Super Admin";
  } else if (rawRole.includes("manager")) {
    sanitized.role_name = "Sales Manager";
  } else if (rawRole.includes("accountant")) {
    sanitized.role_name = "Accountant";
  } else if (rawRole.includes("distributor")) {
    sanitized.role_name = "Distributor";
  } else {
    sanitized.role_name = "Sales Officer";
  }
  if (sanitized.is_active === undefined) {
    sanitized.is_active = raw?.is_active !== false;
  }
  return sanitized;
}

/**
 * Dynamic Schema Resilience Executor:
 * Executes a Supabase query factory. If PostgREST returns PGRST204 ("Could not find column... in schema cache"),
 * it automatically identifies and strips the missing column from the payload and retries up to 4 times.
 */
export async function executeWithSchemaResilience<R = any>(
  tableName: SupabaseTableName,
  payload: Record<string, any>,
  operation: (cleanPayload: Record<string, any>) => PromiseLike<any>,
  maxRetries = 4,
): Promise<{ data: any; error: any }> {
  let currentPayload = sanitizePayload(tableName, payload);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await operation(currentPayload);

    if (!result.error) {
      return result;
    }

    const errorMsg = String(result.error.message || "");
    const missingColMatch = errorMsg.match(/Could not find the '([^']+)' column/i) ||
                            errorMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      if (missingCol in currentPayload) {
        console.warn(
          `[SchemaResilience] PostgREST schema cache missing column '${missingCol}' on '${tableName}'. Retrying without it:`,
          errorMsg,
        );
        delete currentPayload[missingCol];
        continue;
      }
    }

    // Return result if not a missing column error or if column was already removed
    return result;
  }

  return operation(currentPayload);
}


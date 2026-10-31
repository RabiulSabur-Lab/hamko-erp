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
} as const;

export type SupabaseTableName = keyof typeof ALLOWED_TABLE_COLUMNS;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(str: unknown): boolean {
  if (typeof str !== "string") return false;
  return UUID_REGEX.test(str.trim());
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
    roleName: "role_name",
    territoryId: "territory_id",
    isActive: "is_active",
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
  return sanitized;
}

export function sanitizeOrderItemPayload<T extends Record<string, any>>(raw: T, isInsert = false): Record<string, any> {
  return sanitizePayload("order_items", raw, { generateIdIfMissing: isInsert });
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

/**
 * Dynamic Schema Resilience Executor:
 * Executes a Supabase query factory. If PostgREST returns PGRST204 ("Could not find column... in schema cache"),
 * it automatically identifies and strips the missing column from the payload and retries up to 4 times.
 */
export async function executeWithSchemaResilience<R>(
  tableName: SupabaseTableName,
  payload: Record<string, any>,
  operation: (cleanPayload: Record<string, any>) => PromiseLike<{ data: R | null; error: any }>,
  maxRetries = 4,
): Promise<{ data: R | null; error: any }> {
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


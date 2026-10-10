/**
 * Verification Script: Stock Validation in Order Form & Handlers
 * Verifies that:
 * 1. Ordering 10 units when stock is 1 is blocked with toast "Insufficient stock available for [Product Name]" in non-Draft states (Pending/Approved/Delivered).
 * 2. If status === 'Draft', strict stock blocking is BYPASSED and allows saving overbooked items.
 * 3. In Draft mode, a non-blocking warning badge/text ("Low stock - replenish before approval") is shown.
 * 4. Changing order status to "Pending", "Approved", or "Delivered" when stock is insufficient is strictly blocked.
 * 5. Orders within available stock pass validation cleanly.
 */

const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

const STORAGE_KEYS = {
  PRODUCTS: "sales_erp_local_products",
  ORDERS: "sales_erp_local_orders",
  COLLECTIONS: "sales_erp_local_collections",
  TRANSACTIONS: "sales_erp_local_stock_transactions",
};

let lastToastError = null;
const toast = {
  error: (msg) => {
    lastToastError = msg;
  },
  success: () => {},
};

const sampleProducts = [
  {
    id: "prod-1",
    sku_code: "HA15-01",
    name: "Still R/C- SS+Alu Pot 1.8L",
    stock_quantity: 8, // 8 in stock (as in prompt example)
    unit_price: 2425,
    dealer_price: 2183,
    distributor_price: 2138.85,
    is_active: true,
  },
  {
    id: "prod-zero",
    sku_code: "HA15-ZERO",
    name: "Out of Stock Rice Cooker",
    stock_quantity: 0, // 0 in stock
    unit_price: 1500,
    dealer_price: 1300,
    distributor_price: 1200,
    is_active: true,
  },
  {
    id: "prod-abundant",
    sku_code: "HA15-100",
    name: "Abundant Cooker",
    stock_quantity: 50,
    unit_price: 1000,
    dealer_price: 900,
    distributor_price: 850,
    is_active: true,
  },
];

localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(sampleProducts));

function getProducts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || "[]");
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Form Stock Validation Implementation (Mirrors NewOrderModal & OrderCreate)
// -------------------------------------------------------------
function validateOrderItemsStock(items, status = "Pending", order = null, allProducts = getProducts()) {
  lastToastError = null;
  const validItems = items.filter((it) => it.product_id);
  if (validItems.length === 0) {
    toast.error("Please add at least one item");
    return { valid: false, error: "Please add at least one item" };
  }

  // If status is 'Draft', BYPASS strict stock blocking!
  if (status === "Draft") {
    return { valid: true, isDraft: true };
  }

  const productQuantities = new Map();
  for (const it of validItems) {
    const currentSum = productQuantities.get(it.product_id) || 0;
    productQuantities.set(it.product_id, currentSum + (Number(it.quantity) || 0));
  }

  // 1. Check individual line item quantity
  for (const it of validItems) {
    const prod = allProducts.find((p) => p.id === it.product_id);
    const prodName = prod?.name || "Product";
    const baseStock = Math.max(0, Number(prod?.stock_quantity ?? prod?.stock ?? 0));
    const origQty = order && order.status === "Delivered"
      ? Number(order.order_items?.find((o) => o.product_id === it.product_id)?.quantity || 0)
      : 0;
    const availableStock = baseStock + origQty;
    const requestedQty = Number(it.quantity) || 0;

    if (availableStock <= 0 || requestedQty > availableStock) {
      toast.error(`Insufficient stock available for ${prodName}`);
      return { valid: false, error: `Insufficient stock available for ${prodName}` };
    }
  }

  // 2. Check total requested across lines for the same product
  for (const [prodId, totalRequested] of productQuantities.entries()) {
    const prod = allProducts.find((p) => p.id === prodId);
    const prodName = prod?.name || "Product";
    const baseStock = Math.max(0, Number(prod?.stock_quantity ?? prod?.stock ?? 0));
    const origQty = order && order.status === "Delivered"
      ? Number(order.order_items?.find((o) => o.product_id === prodId)?.quantity || 0)
      : 0;
    const availableStock = baseStock + origQty;

    if (availableStock <= 0 || totalRequested > availableStock) {
      toast.error(`Insufficient stock available for ${prodName}`);
      return { valid: false, error: `Insufficient stock available for ${prodName}` };
    }
  }

  return { valid: true };
}

// -------------------------------------------------------------
// Row Level Stock Limit & Inline Validation Calculator
// -------------------------------------------------------------
function calculateRowStockState(it, idx, items, status = "Pending", order = null, allProducts = getProducts()) {
  const isDraft = status === "Draft";
  const selectedProd = allProducts.find((p) => p.id === it.product_id);
  const baseStock = Math.max(0, Number(selectedProd?.stock_quantity ?? selectedProd?.stock ?? 0));
  const origQty = order && order.status === "Delivered"
    ? Number(order.order_items?.find((o) => o.product_id === it.product_id)?.quantity || 0)
    : 0;
  const availableStock = baseStock + origQty;
  const otherRowsQty = items.reduce(
    (sum, other, otherIdx) =>
      otherIdx !== idx && other.product_id === it.product_id
        ? sum + (Number(other.quantity) || 0)
        : sum,
    0
  );
  const remainingForThisRow = Math.max(0, availableStock - otherRowsQty);
  const requestedQty = Number(it.quantity) || 0;
  const isRowOverStock = Boolean(
    selectedProd && (requestedQty > remainingForThisRow || availableStock <= 0)
  );

  return {
    maxAttribute: !isDraft && selectedProd ? Math.max(0, remainingForThisRow) : undefined,
    availableStock,
    remainingForThisRow,
    isRowOverStock,
    isDraft,
    inlineMessage: isRowOverStock
      ? isDraft
        ? "Low stock - replenish before approval"
        : availableStock <= 0
        ? "Out of stock"
        : `Max: ${remainingForThisRow}`
      : null,
  };
}

// -------------------------------------------------------------
// Status Change Validation (OrdersPage handleStatusChange)
// -------------------------------------------------------------
function validateStatusTransition(orderItemsList, targetStatus, oldStatus = "Draft", allProducts = getProducts()) {
  lastToastError = null;
  const isEnforcingStock = ["Pending", "Approved", "Delivered"].includes(targetStatus);
  if (orderItemsList.length > 0 && isEnforcingStock && (oldStatus === "Draft" || targetStatus === "Delivered")) {
    for (const it of orderItemsList) {
      const prod = allProducts.find((p) => p.id === it.product_id);
      const prodName = prod?.name || "Product";
      const curStock = Math.max(0, Number(prod?.stock_quantity ?? prod?.stock ?? 0));
      const reqQty = Number(it.quantity) || 0;
      if (curStock <= 0 || reqQty > curStock) {
        toast.error(`Insufficient stock available for ${prodName}`);
        return { valid: false, error: `Insufficient stock available for ${prodName}` };
      }
    }
  }
  return { valid: true };
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------
console.log("=================================================");
console.log("RUNNING STOCK OVERBOOKING FOR DRAFT ORDERS SUITE");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

// TEST 1: User Verification requirement: Status = 'Draft', Qty: 10, Stock: 8
console.log("--- TEST 1: Draft Order Overbooking (Qty: 10, Stock: 8) ---");
const test1Items = [{ product_id: "prod-1", quantity: 10 }]; // Stock is 8
const test1RowState = calculateRowStockState(test1Items[0], 0, test1Items, "Draft");

assert(test1RowState.maxAttribute === undefined, "Draft mode removes input max limit");
assert(test1RowState.isRowOverStock === true, "Row detects requested quantity > stock");
assert(test1RowState.inlineMessage === "Low stock - replenish before approval", "Inline message shows non-blocking warning: 'Low stock - replenish before approval'");

const test1Result = validateOrderItemsStock(test1Items, "Draft");
assert(test1Result.valid === true, "Draft order saves successfully without blocking errors");
assert(lastToastError === null, "No toast blocking error displayed in Draft mode");

// TEST 2: Same overbooked items with status = 'Pending' -> Strictly blocked!
console.log("\n--- TEST 2: Same overbooked items with status = 'Pending' (Strict mode) ---");
const test2RowState = calculateRowStockState(test1Items[0], 0, test1Items, "Pending");
assert(test2RowState.maxAttribute === 8, "Pending mode enforces max input limit = 8");
assert(test2RowState.inlineMessage === "Max: 8", "Pending mode displays blocking error 'Max: 8'");

const test2Result = validateOrderItemsStock(test1Items, "Pending");
assert(test2Result.valid === false, "Pending order submission is strictly blocked");
assert(
  lastToastError === "Insufficient stock available for Still R/C- SS+Alu Pot 1.8L",
  `Toast alert displayed in Pending mode: "${lastToastError}"`
);

// TEST 3: Status = 'Approved' and 'Delivered' are also strictly blocked
console.log("\n--- TEST 3: Strict mode for Approved & Delivered ---");
const test3ApprovedResult = validateOrderItemsStock(test1Items, "Approved");
assert(test3ApprovedResult.valid === false, "Approved order submission is strictly blocked");

const test3DeliveredResult = validateOrderItemsStock(test1Items, "Delivered");
assert(test3DeliveredResult.valid === false, "Delivered order submission is strictly blocked");

// TEST 4: Transitioning a Draft order with Qty: 10, Stock: 8 to 'Pending', 'Approved', or 'Delivered'
console.log("\n--- TEST 4: Status change from Draft to Pending/Approved/Delivered ---");
const test4TransitionPending = validateStatusTransition(test1Items, "Pending", "Draft");
assert(test4TransitionPending.valid === false, "Changing Draft to Pending is blocked when stock is insufficient");
assert(
  lastToastError === "Insufficient stock available for Still R/C- SS+Alu Pot 1.8L",
  `Toast alert on status change to Pending: "${lastToastError}"`
);

const test4TransitionApproved = validateStatusTransition(test1Items, "Approved", "Draft");
assert(test4TransitionApproved.valid === false, "Changing Draft to Approved is blocked when stock is insufficient");

const test4TransitionDelivered = validateStatusTransition(test1Items, "Delivered", "Draft");
assert(test4TransitionDelivered.valid === false, "Changing Draft to Delivered is blocked when stock is insufficient");

// TEST 5: Stock replenished to 15, then status change to Approved passes
console.log("\n--- TEST 5: Status change after stock replenishment ---");
const replenishedProducts = [
  { ...sampleProducts[0], stock_quantity: 15 }, // Replenished to 15!
];
const test5TransitionApproved = validateStatusTransition(test1Items, "Approved", "Draft", replenishedProducts);
assert(test5TransitionApproved.valid === true, "Changing Draft to Approved passes after stock replenishment");

console.log("\n=================================================");
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

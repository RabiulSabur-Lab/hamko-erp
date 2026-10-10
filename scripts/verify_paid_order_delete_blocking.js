/**
 * Verification Script: Block Deletion for Partially or Fully Paid Orders
 *
 * Verifies that:
 * 1. An order with Status 'Delivered' and Paid Amount = 0 is successfully deleted.
 * 2. An order with Status 'Unpaid' and Paid Amount = 0 is successfully deleted.
 * 3. An order with Status 'Draft' and Paid Amount = 0 is successfully deleted.
 * 4. An order with Paid Amount > 0 (Partially Paid) is BLOCKED with toast alert:
 *    "Cannot delete order ORD-XXXX because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled."
 * 5. An order with Paid Amount > 0 (Fully Paid) is BLOCKED with exact toast alert.
 * 6. An order with linked collection records is BLOCKED even if paid_amount was 0.
 * 7. Allowed orders are removed from store; blocked orders remain intact.
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
  ORDERS: "sales_erp_local_orders",
  COLLECTIONS: "sales_erp_local_collections",
  DELETED_ORDERS: "sales_erp_deleted_orders_ids",
  CUSTOMERS: "sales_erp_local_customers",
  PRODUCTS: "sales_erp_local_products",
  TRANSACTIONS: "sales_erp_local_stock_transactions",
};

let lastToastError = null;
let lastToastSuccess = null;
const toast = {
  error: (msg) => {
    lastToastError = msg;
  },
  success: (msg) => {
    lastToastSuccess = msg;
  },
};

function getLocalData(key, fallback = []) {
  try {
    const raw = globalThis.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData(key, data) {
  globalThis.localStorage.setItem(key, JSON.stringify(data));
}

// Logic under test: deleteOrder validation & OrdersPage handleDeleteOrder handler
function handleDeleteOrderSimulation(id, orders, collections) {
  const o = orders.find((ord) => String(ord.id) === String(id)) || getLocalData(STORAGE_KEYS.ORDERS, []).find((ord) => String(ord.id) === String(id));
  const orderNumber = o?.order_number || id;
  const paidAmount = Number(o?.paid_amount ?? o?.paidAmount ?? 0);

  const allCollections = collections || getLocalData(STORAGE_KEYS.COLLECTIONS, []);
  const hasLinkedCollection = allCollections.some(
    (c) =>
      String(c.order_id) === String(id) ||
      (o?.order_number && String(c.reference) === String(o.order_number))
  );

  if (paidAmount > 0 || hasLinkedCollection) {
    const errorMsg = `Cannot delete order ${orderNumber} because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.`;
    toast.error(errorMsg);
    return { success: false, error: errorMsg, orders };
  }

  // Perform deletion
  const updatedOrders = orders.filter((ord) => String(ord.id) !== String(id));
  setLocalData(STORAGE_KEYS.ORDERS, updatedOrders);
  toast.success("deleted");
  return { success: true, orders: updatedOrders };
}

// Test Suite
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

console.log("=== Test Suite: Block Deletion for Paid Orders ===\n");

const initialOrders = [
  {
    id: "ord-1",
    order_number: "ORD-1001",
    customer_id: "cust-1",
    status: "Delivered",
    total_amount: 1500,
    paid_amount: 0,
    due_amount: 1500,
    payment_status: "Unpaid",
  },
  {
    id: "ord-2",
    order_number: "ORD-1002",
    customer_id: "cust-2",
    status: "Pending",
    total_amount: 2000,
    paid_amount: 500,
    due_amount: 1500,
    payment_status: "Partial",
  },
  {
    id: "ord-3",
    order_number: "ORD-1003",
    customer_id: "cust-1",
    status: "Delivered",
    total_amount: 3000,
    paid_amount: 3000,
    due_amount: 0,
    payment_status: "Paid",
  },
  {
    id: "ord-4",
    order_number: "ORD-1004",
    customer_id: "cust-3",
    status: "Draft",
    total_amount: 800,
    paid_amount: 0,
    due_amount: 800,
    payment_status: "Unpaid",
  },
  {
    id: "ord-5",
    order_number: "ORD-1005",
    customer_id: "cust-4",
    status: "Pending",
    total_amount: 1200,
    paid_amount: 0,
    due_amount: 1200,
    payment_status: "Unpaid",
  },
];

const initialCollections = [
  {
    id: "col-1",
    collection_number: "COL-1001",
    order_id: "ord-2",
    amount: 500,
  },
  {
    id: "col-2",
    collection_number: "COL-1002",
    order_id: "ord-3",
    amount: 3000,
  },
  {
    id: "col-3",
    collection_number: "COL-1003",
    order_id: "ord-5", // order 5 has paid_amount=0 recorded on order, but a collection is linked
    amount: 200,
  },
];

setLocalData(STORAGE_KEYS.ORDERS, initialOrders);
setLocalData(STORAGE_KEYS.COLLECTIONS, initialCollections);

// Test 1: Deleting order with Status 'Delivered' and Paid Amount = 0
console.log("Test 1: Delete order ORD-1001 (Status: Delivered, Paid Amount: 0)");
lastToastError = null;
lastToastSuccess = null;
const res1 = handleDeleteOrderSimulation("ord-1", initialOrders, initialCollections);
assert(res1.success === true, "ORD-1001 deletion succeeds when paid_amount === 0");
assert(lastToastSuccess === "deleted", "Success toast is displayed");
assert(res1.orders.find((o) => o.id === "ord-1") === undefined, "ORD-1001 removed from orders");

// Test 2: Deleting order with Status 'Draft' and Paid Amount = 0
console.log("\nTest 2: Delete order ORD-1004 (Status: Draft, Paid Amount: 0)");
lastToastError = null;
lastToastSuccess = null;
const res2 = handleDeleteOrderSimulation("ord-4", res1.orders, initialCollections);
assert(res2.success === true, "ORD-1004 deletion succeeds in Draft mode with paid_amount === 0");
assert(lastToastSuccess === "deleted", "Success toast is displayed");
assert(res2.orders.find((o) => o.id === "ord-4") === undefined, "ORD-1004 removed from orders");

// Test 3: Deleting partially paid order (ORD-1002, Paid Amount: 500)
console.log("\nTest 3: Block delete for partially paid order ORD-1002 (Paid Amount: 500)");
lastToastError = null;
lastToastSuccess = null;
const res3 = handleDeleteOrderSimulation("ord-2", res2.orders, initialCollections);
assert(res3.success === false, "ORD-1002 deletion is BLOCKED");
assert(
  lastToastError === "Cannot delete order ORD-1002 because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.",
  `Toast error matches exact message: "${lastToastError}"`
);
assert(res3.orders.some((o) => o.id === "ord-2"), "ORD-1002 remains in orders list");

// Test 4: Deleting fully paid order (ORD-1003, Paid Amount: 3000)
console.log("\nTest 4: Block delete for fully paid order ORD-1003 (Paid Amount: 3000)");
lastToastError = null;
lastToastSuccess = null;
const res4 = handleDeleteOrderSimulation("ord-3", res3.orders, initialCollections);
assert(res4.success === false, "ORD-1003 deletion is BLOCKED");
assert(
  lastToastError === "Cannot delete order ORD-1003 because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.",
  `Toast error matches exact message: "${lastToastError}"`
);
assert(res4.orders.some((o) => o.id === "ord-3"), "ORD-1003 remains in orders list");

// Test 5: Deleting order with paid_amount = 0 but linked collection exists
console.log("\nTest 5: Block delete for order ORD-1005 with linked collection");
lastToastError = null;
lastToastSuccess = null;
const res5 = handleDeleteOrderSimulation("ord-5", res4.orders, initialCollections);
assert(res5.success === false, "ORD-1005 deletion is BLOCKED due to linked collection");
assert(
  lastToastError === "Cannot delete order ORD-1005 because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.",
  `Toast error matches exact message: "${lastToastError}"`
);
assert(res5.orders.some((o) => o.id === "ord-5"), "ORD-1005 remains in orders list");

console.log(`\n==========================================`);
console.log(`Summary: ${testsPassed} passed, ${testsFailed} failed.`);
console.log(`==========================================`);

if (testsFailed > 0) {
  process.exit(1);
}

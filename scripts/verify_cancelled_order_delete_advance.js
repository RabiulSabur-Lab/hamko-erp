/**
 * Verification Script: Allow Deletion of Cancelled Orders and Unlink Payments to Advance Balance
 *
 * Verifies that:
 * 1. Active (non-cancelled) orders with paid_amount > 0 remain strictly blocked with toast alert:
 *    "Cannot delete order ORD-XXXX because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled."
 * 2. Order ORD-35675590 with status = 'Cancelled' and paid_amount = 4000 does NOT get blocked.
 * 3. A confirmation dialog prompt is triggered with:
 *    "This cancelled order has ৳4,000 in recorded payments. Deleting this order will convert the payment into Customer Advance Balance. Proceed?"
 * 4. On confirmation, order ORD-35675590 is successfully deleted.
 * 5. Linked collections have order_id cleared to null and note updated to indicate Advance Credit.
 * 6. The Customer Ledger receives the unallocated collection and calculates ৳4,000 as Advance Balance (Credit).
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
  CUSTOMERS: "sales_erp_local_customers",
  DELETED_ORDERS: "sales_erp_deleted_orders_ids",
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

function formatCurrency(amount) {
  const n = Number(amount);
  return new Intl.NumberFormat("en-BD", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

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

// Logic under test simulating OrdersPage and deleteOrder handler
function handleDeleteOrderSimulation(id, confirmed = false) {
  const orders = getLocalData(STORAGE_KEYS.ORDERS, []);
  const o = orders.find((ord) => String(ord.id) === String(id));
  if (!o) return { success: false, error: "Order not found" };

  const orderNumber = o.order_number || id;
  const paidAmount = Number(o.paid_amount || 0);

  const allCollections = getLocalData(STORAGE_KEYS.COLLECTIONS, []);
  const linkedCols = allCollections.filter(
    (c) =>
      String(c.order_id) === String(id) ||
      (o.order_number && String(c.reference) === String(o.order_number))
  );
  const hasLinkedCollection = linkedCols.length > 0;
  const linkedTotal = linkedCols.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const effectivePaid = paidAmount > 0 ? paidAmount : linkedTotal;

  const isCancelled = o.status === "Cancelled";

  if (isCancelled && (effectivePaid > 0 || hasLinkedCollection)) {
    if (!confirmed) {
      // Trigger confirmation dialog
      const dialogMessage = `This cancelled order has ৳${formatCurrency(effectivePaid)} in recorded payments. Deleting this order will convert the payment into Customer Advance Balance. Proceed?`;
      return {
        promptConfirm: true,
        dialogMessage,
        paidAmount: effectivePaid,
        order: o,
      };
    }
  } else if (paidAmount > 0 || hasLinkedCollection) {
    const errorMsg = `Cannot delete order ${orderNumber} because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.`;
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Deletion logic (matching deleteOrder)
  if (isCancelled && hasLinkedCollection) {
    const updatedCollections = allCollections.map((c) => {
      const isMatch =
        String(c.order_id) === String(id) ||
        (o.order_number && String(c.reference) === String(o.order_number));
      if (isMatch) {
        const existingNote = c.notes && String(c.notes).trim() ? String(c.notes).trim() : "";
        const advanceNote = `Advance Credit from cancelled order ${orderNumber}`;
        const newNote = existingNote ? `${existingNote} · ${advanceNote}` : advanceNote;
        return {
          ...c,
          order_id: null,
          reference: c.reference === o.order_number ? null : c.reference,
          notes: newNote,
        };
      }
      return c;
    });
    setLocalData(STORAGE_KEYS.COLLECTIONS, updatedCollections);
  }

  const updatedOrders = orders.filter((ord) => String(ord.id) !== String(id));
  setLocalData(STORAGE_KEYS.ORDERS, updatedOrders);
  toast.success("deleted");
  return { success: true, orders: updatedOrders };
}

// Ledger calculation test helper (reflecting getCustomerLedgerDetails)
function calculateCustomerLedger(customerId) {
  const orders = getLocalData(STORAGE_KEYS.ORDERS, []).filter(
    (o) => o.customer_id === customerId && o.status !== "Cancelled"
  );
  const collections = getLocalData(STORAGE_KEYS.COLLECTIONS, []).filter(
    (c) => c.customer_id === customerId
  );

  const totalInvoiced = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalCollected = collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const closingBalance = totalInvoiced - totalCollected;
  const advanceDeposit = closingBalance < 0 ? Math.abs(closingBalance) : 0;
  const currentDue = closingBalance > 0 ? closingBalance : 0;

  return {
    totalInvoiced,
    totalCollected,
    closingBalance,
    advanceDeposit,
    currentDue,
    collections,
  };
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

console.log("=== Test Suite: Allow Deletion of Cancelled Orders & Unlink Advance ===\n");

// Initial data setup
const initialOrders = [
  {
    id: "ord-active-1",
    order_number: "ORD-99990001",
    customer_id: "cust-1",
    status: "Delivered",
    total_amount: 5000,
    paid_amount: 2000,
    due_amount: 3000,
    payment_status: "Partial",
  },
  {
    id: "ord-35675590",
    order_number: "ORD-35675590",
    customer_id: "cust-1",
    status: "Cancelled",
    total_amount: 4000,
    paid_amount: 4000,
    due_amount: 0,
    payment_status: "Paid",
  },
];

const initialCollections = [
  {
    id: "col-active-1",
    collection_number: "COL-99991",
    customer_id: "cust-1",
    order_id: "ord-active-1",
    amount: 2000,
    notes: "Partial payment",
  },
  {
    id: "col-35675590",
    collection_number: "COL-35675590",
    customer_id: "cust-1",
    order_id: "ord-35675590",
    amount: 4000,
    notes: "Full payment for cancelled order",
  },
];

setLocalData(STORAGE_KEYS.ORDERS, initialOrders);
setLocalData(STORAGE_KEYS.COLLECTIONS, initialCollections);

// Test 1: Active order with paid_amount > 0 is STILL strictly blocked
console.log("Test 1: Strict block for active order with paid_amount > 0");
lastToastError = null;
const res1 = handleDeleteOrderSimulation("ord-active-1", false);
assert(res1.success === false, "Active order deletion is blocked");
assert(
  lastToastError === "Cannot delete order ORD-99990001 because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.",
  "Toast error correctly prompts user to void payment or change status to Cancelled"
);
assert(res1.promptConfirm !== true, "No advance conversion dialog shown for active order");

// Test 2: Cancelled order ORD-35675590 triggers advance conversion confirmation dialog
console.log("\nTest 2: Cancelled order ORD-35675590 triggers advance conversion dialog");
lastToastError = null;
const res2 = handleDeleteOrderSimulation("ord-35675590", false);
assert(res2.promptConfirm === true, "Confirmation dialog is triggered for Cancelled order");
assert(lastToastError === null, "No blocking error toast is shown");
assert(res2.paidAmount === 4000, "Paid amount correctly detected as 4000");
const expectedDialogMsg = "This cancelled order has ৳4,000 in recorded payments. Deleting this order will convert the payment into Customer Advance Balance. Proceed?";
assert(
  res2.dialogMessage === expectedDialogMsg,
  `Dialog message matches expected text: "${res2.dialogMessage}"`
);

// Test 3: Confirming deletion deletes order and unlinks collection
console.log("\nTest 3: Confirming deletion of ORD-35675590");
lastToastSuccess = null;
const res3 = handleDeleteOrderSimulation("ord-35675590", true);
assert(res3.success === true, "ORD-35675590 successfully deleted upon confirmation");
assert(lastToastSuccess === "deleted", "Success toast shown");

const remainingOrders = getLocalData(STORAGE_KEYS.ORDERS, []);
assert(
  remainingOrders.find((o) => o.id === "ord-35675590") === undefined,
  "ORD-35675590 removed from orders store"
);

// Test 4: Linked collection has order_id unlinked (null)
console.log("\nTest 4: Verify collection is unlinked");
const storedCollections = getLocalData(STORAGE_KEYS.COLLECTIONS, []);
const unlinkedCol = storedCollections.find((c) => c.id === "col-35675590");
assert(unlinkedCol !== undefined, "Collection COL-35675590 is preserved");
assert(unlinkedCol.order_id === null, "Collection order_id is set to null (unallocated)");
assert(
  unlinkedCol.notes.includes("Advance Credit from cancelled order ORD-35675590"),
  `Collection notes updated with Advance Credit info: "${unlinkedCol.notes}"`
);

// Test 5: Customer Ledger statement reflects ৳4,000 in collections
console.log("\nTest 5: Verify Customer Ledger statement has Advance Credit");
const ledger = calculateCustomerLedger("cust-1");
// Invoiced: ord-active-1 (5000). Total collected: 2000 (active) + 4000 (advance) = 6000.
// Net closing balance: 5000 - 6000 = -1000 (1000 net advance deposit credit!)
assert(ledger.totalCollected === 6000, `Total collected includes the ৳4,000 unlinked collection (Total: ${ledger.totalCollected})`);
assert(ledger.closingBalance === -1000, `Customer has net advance credit: ${ledger.closingBalance}`);
assert(ledger.advanceDeposit === 1000, `Advance deposit field reflects credit: ${ledger.advanceDeposit}`);

// If we remove the other order so customer has 0 active invoices:
setLocalData(STORAGE_KEYS.ORDERS, []);
const ledgerOnlyAdvance = calculateCustomerLedger("cust-1");
assert(ledgerOnlyAdvance.totalInvoiced === 0, "No active invoices");
assert(ledgerOnlyAdvance.totalCollected === 6000, "Collections remain 6000");
assert(ledgerOnlyAdvance.advanceDeposit === 6000, `Full ৳4,000+ advance remains safely recorded in ledger (Advance: ${ledgerOnlyAdvance.advanceDeposit})`);

console.log(`\n==========================================`);
console.log(`Summary: ${testsPassed} passed, ${testsFailed} failed.`);
console.log(`==========================================`);

if (testsFailed > 0) process.exit(1);

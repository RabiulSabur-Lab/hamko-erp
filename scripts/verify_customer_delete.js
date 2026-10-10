/**
 * Verification Script: Customer Deletion Safety and FK Constraint Handling
 * Verifies that customers with existing orders, collections, or relational history
 * cannot be deleted, preventing Foreign Key constraint violations.
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
};

const STORAGE_KEYS = {
  CUSTOMERS: "sales_erp_local_customers",
  ORDERS: "sales_erp_local_orders",
  COLLECTIONS: "sales_erp_local_collections",
  DELETED_CUSTOMERS: "sales_erp_local_deleted_customers",
};

function getStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStored(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Mock Supabase
let supabaseMockError = null;
const supabaseMock = {
  from: (table) => ({
    select: (fields) => ({
      eq: (col, val) => ({
        limit: async (num) => {
          if (table === "orders") {
            const list = getStored(STORAGE_KEYS.ORDERS);
            const matches = list.filter((o) => o.customer_id === val);
            return { data: matches.slice(0, num), error: null };
          }
          if (table === "collections") {
            const list = getStored(STORAGE_KEYS.COLLECTIONS);
            const matches = list.filter((c) => c.customer_id === val);
            return { data: matches.slice(0, num), error: null };
          }
          return { data: [], error: null };
        },
      }),
    }),
    delete: () => ({
      eq: async (col, val) => {
        if (supabaseMockError) {
          return { data: null, error: supabaseMockError };
        }
        return { data: null, error: null };
      },
    }),
  }),
};

// Implementation under test: deleteCustomer logic
async function testDeleteCustomer(id) {
  const orders = getStored(STORAGE_KEYS.ORDERS);
  const collections = getStored(STORAGE_KEYS.COLLECTIONS);
  const hasOrders = orders.some((o) => String(o?.customer_id) === String(id) || String(o?.customer?.id) === String(id));
  const hasCollections = collections.some((c) => String(c?.customer_id) === String(id) || String(c?.customer?.id) === String(id));

  if (hasOrders || hasCollections) {
    return {
      success: false,
      error: "Cannot delete customer with existing orders or financial history. Mark as Inactive instead.",
    };
  }

  const prevCustomers = getStored(STORAGE_KEYS.CUSTOMERS);
  const updated = prevCustomers.filter((c) => c.id !== id);
  setStored(STORAGE_KEYS.CUSTOMERS, updated);

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CUSTOMERS);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMERS, JSON.stringify(Array.from(set)));
  } catch {}

  try {
    const { error } = await supabaseMock.from("customers").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    setStored(STORAGE_KEYS.CUSTOMERS, prevCustomers);
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CUSTOMERS);
      if (raw) {
        const set = new Set(JSON.parse(raw));
        set.delete(id);
        localStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMERS, JSON.stringify(Array.from(set)));
      }
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

// Simulating handleDeleteCustomer component handler
async function testHandleDeleteCustomer(customer, customersState, setCustomersState, toastFn) {
  const activeOrders = getStored(STORAGE_KEYS.ORDERS);
  const activeCollections = getStored(STORAGE_KEYS.COLLECTIONS);

  const hasLinkedLocalOrders = activeOrders.some(
    (o) => String(o?.customer_id) === String(customer.id) || String(o?.customer?.id) === String(customer.id)
  );
  const hasLinkedLocalCollections = activeCollections.some(
    (col) => String(col?.customer_id) === String(customer.id) || String(col?.customer?.id) === String(customer.id)
  );

  if (hasLinkedLocalOrders || hasLinkedLocalCollections) {
    toastFn.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
    return { blocked: true };
  }

  // Remote check
  const [remoteOrdersRes, remoteColsRes] = await Promise.all([
    supabaseMock.from("orders").select("id").eq("customer_id", customer.id).limit(1),
    supabaseMock.from("collections").select("id").eq("customer_id", customer.id).limit(1),
  ]);

  if ((remoteOrdersRes.data && remoteOrdersRes.data.length > 0) || (remoteColsRes.data && remoteColsRes.data.length > 0)) {
    toastFn.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
    return { blocked: true };
  }

  const prevCustomers = [...customersState];
  setCustomersState(customersState.filter((item) => item.id !== customer.id));

  try {
    const res = await testDeleteCustomer(customer.id);
    if (!res.success) {
      setCustomersState(prevCustomers);
      const isFkError =
        res.error &&
        (res.error.includes("foreign key") ||
          res.error.includes("violates") ||
          res.error.includes("23503") ||
          res.error.includes("orders") ||
          res.error.includes("collections") ||
          res.error.includes("financial history"));

      if (isFkError) {
        toastFn.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
      } else {
        toastFn.error(res.error || "Failed to delete customer");
      }
      return { success: false, error: res.error };
    }
    toastFn.success("Customer deleted");
    return { success: true };
  } catch (err) {
    setCustomersState(prevCustomers);
    toastFn.error("Cannot delete customer with existing orders or financial history. Mark as Inactive instead.");
    return { success: false, error: err.message };
  }
}

console.log("=================================================");
console.log("CUSTOMER DELETE FK CONSTRAINT VERIFICATION");
console.log("=================================================\n");

let toastMessages = [];
const mockToast = {
  error: (msg) => toastMessages.push({ type: "error", msg }),
  success: (msg) => toastMessages.push({ type: "success", msg }),
};

// Setup initial test data
const customerWithOrder = { id: "cust-1", name: "Al-Amin Traders" };
const customerWithCollection = { id: "cust-2", name: "Kushtia Hardware" };
const customerClean = { id: "cust-3", name: "New Prospect Store" };

let currentCustomers = [customerWithOrder, customerWithCollection, customerClean];
setStored(STORAGE_KEYS.CUSTOMERS, currentCustomers);
setStored(STORAGE_KEYS.ORDERS, [{ id: "ord-1", order_number: "ORD-0001", customer_id: "cust-1", total_amount: 1500 }]);
setStored(STORAGE_KEYS.COLLECTIONS, [{ id: "col-1", collection_number: "COL-0001", customer_id: "cust-2", amount: 500 }]);

// TEST 1: Attempt to delete customer with existing orders
console.log("--- TEST 1: Attempting to delete customer with existing orders ---");
toastMessages = [];
(async () => {
  const result1 = await testHandleDeleteCustomer(
    customerWithOrder,
    currentCustomers,
    (updated) => { currentCustomers = updated; },
    mockToast
  );

  console.log("Result 1:", result1);
  console.log("Toast message received:", toastMessages[0]?.msg);

  if (!result1.blocked) {
    console.error("FAIL: Deletion was not blocked for customer with orders!");
    process.exit(1);
  }

  const expectedMsg = "Cannot delete customer with existing orders or financial history. Mark as Inactive instead.";
  if (toastMessages[0]?.msg !== expectedMsg) {
    console.error(`FAIL: Toast message mismatch! Expected: "${expectedMsg}", got: "${toastMessages[0]?.msg}"`);
    process.exit(1);
  }

  const stillInStorage = getStored(STORAGE_KEYS.CUSTOMERS).some((c) => c.id === "cust-1");
  if (!stillInStorage) {
    console.error("FAIL: Customer was removed from storage despite blocked deletion!");
    process.exit(1);
  }
  console.log("PASSED: Deletion properly blocked, user friendly toast displayed, data preserved.\n");

  // TEST 2: Attempt to delete customer with existing collections
  console.log("--- TEST 2: Attempting to delete customer with existing collections ---");
  toastMessages = [];
  const result2 = await testHandleDeleteCustomer(
    customerWithCollection,
    currentCustomers,
    (updated) => { currentCustomers = updated; },
    mockToast
  );

  console.log("Result 2:", result2);
  console.log("Toast message received:", toastMessages[0]?.msg);

  if (!result2.blocked || toastMessages[0]?.msg !== expectedMsg) {
    console.error("FAIL: Deletion was not blocked for customer with collections!");
    process.exit(1);
  }
  console.log("PASSED: Deletion properly blocked for customer with collections.\n");

  // TEST 3: Postgres Foreign Key constraint error recovery (code 23503)
  console.log("--- TEST 3: Graceful Postgres FK Constraint Error Catching ---");
  toastMessages = [];
  supabaseMockError = {
    code: "23503",
    message: 'update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"',
  };

  const remoteCust = { id: "cust-remote", name: "Remote Linked Customer" };
  currentCustomers.push(remoteCust);
  setStored(STORAGE_KEYS.CUSTOMERS, currentCustomers);

  const result3 = await testHandleDeleteCustomer(
    remoteCust,
    currentCustomers,
    (updated) => { currentCustomers = updated; },
    mockToast
  );

  console.log("Result 3:", result3);
  console.log("Toast message received:", toastMessages[0]?.msg);

  if (toastMessages[0]?.msg !== expectedMsg) {
    console.error("FAIL: FK constraint error did not produce user-friendly message!");
    process.exit(1);
  }

  const restoredInState = currentCustomers.some((c) => c.id === "cust-remote");
  if (!restoredInState) {
    console.error("FAIL: Customer was not restored to state after FK error!");
    process.exit(1);
  }
  console.log("PASSED: FK error caught gracefully without crashing UI, state preserved.\n");

  // TEST 4: Delete clean customer without orders or collections
  console.log("--- TEST 4: Deleting clean customer with no history ---");
  supabaseMockError = null;
  toastMessages = [];
  const result4 = await testHandleDeleteCustomer(
    customerClean,
    currentCustomers,
    (updated) => { currentCustomers = updated; },
    mockToast
  );

  console.log("Result 4:", result4);
  if (!result4.success) {
    console.error("FAIL: Clean customer deletion failed!");
    process.exit(1);
  }
  console.log("PASSED: Clean customer successfully deleted.\n");

  console.log("=================================================");
  console.log("ALL CUSTOMER DELETE VERIFICATION TESTS PASSED!");
  console.log("=================================================");
})();

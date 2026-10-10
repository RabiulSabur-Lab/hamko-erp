import fs from "fs";
import assert from "assert";

console.log("=== RUNNING ORDER DELETE CONFIRMATION TESTS ===");

const ordersPageContent = fs.readFileSync("src/pages/OrdersPage.tsx", "utf8");

// Test 1: Verify orderToDelete state is defined
assert(ordersPageContent.includes("const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);"), "Must declare orderToDelete state");
console.log("1. orderToDelete state declaration verified.");

// Test 2: Verify handleDeleteOrder requires confirmation before proceeding
assert(ordersPageContent.includes("if (!confirmed) {\n      setOrderToDelete(o || ({ id, order_number: orderNumber } as Order));\n      return;\n    }"), "Must block unconfirmed deletion and set orderToDelete");
console.log("2. handleDeleteOrder unconfirmed blocking verified.");

// Test 3: Verify Confirmation Dialog contains the exact required prompt message
assert(ordersPageContent.includes("Are you sure you want to delete Order #"), "Must include 'Are you sure you want to delete Order #'");
assert(ordersPageContent.includes("This action cannot be undone."), "Must include 'This action cannot be undone.'");
console.log("3. Confirmation Dialog message text verified.");

// Test 4: Verify Dialog actions: Cancel closes, Confirm proceeds with confirmed=true
assert(ordersPageContent.includes("onClick={() => setOrderToDelete(null)}"), "Cancel button must clear orderToDelete");
assert(ordersPageContent.includes("handleDeleteOrder(targetId, true);"), "Confirm button must call handleDeleteOrder with confirmed=true");
console.log("4. Dialog Cancel and Confirm actions verified.");

console.log("=== ALL ORDER DELETE CONFIRMATION TESTS PASSED ===");

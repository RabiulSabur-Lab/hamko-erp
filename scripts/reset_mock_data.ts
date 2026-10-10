const SYSTEM_DATA_RESET_EVENT = "system-data-reset";

// Function to clear mock/local data and browser storage (when run in a browser environment)
export function resetMockData() {
  // Clear any localStorage keys related to orders, collections, expenses, etc.
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const keysToRemove = [
      "orders",
      "collections",
      "expenses",
      "draft_order",
      "cart",
      "pending_orders",
      "pending_collections",
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // Remove any other keys that start with these prefixes
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("order") ||
        key.startsWith("collection") ||
        key.startsWith("expense")
      ) {
        localStorage.removeItem(key);
      }
    });
    console.log("✅ Local storage cleared.");
  } else {
    console.warn("⚠️ Not running in a browser context – cannot clear localStorage.");
  }

  // Dispatch the global event so any mounted components reset their state.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYSTEM_DATA_RESET_EVENT));
    console.log("✅ Dispatched system-data-reset event.");
  }
}

// If this script is executed directly (e.g., via ts-node), call the function.
resetMockData();

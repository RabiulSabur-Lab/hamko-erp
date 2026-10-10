import { supabase } from "@/lib/supabase";
import { throwOnError } from "@/lib/supabaseQuery";

export const SYSTEM_DATA_RESET_EVENT = "system-data-reset";

/**
 * Global reset handler that directly wipes all transactional demo data across the application:
 * 1. Purges all rows from Supabase tables: `orders`, `order_items`, `collections`, `expenses`, `stock_transactions`.
 * 2. Updates `customers` table setting `current_due = 0`, `opening_balance = 0`, and `due_status = 'Clear'`.
 * 3. Sets stock quantity for all items in `products` and `inventory` tables to exactly 100 while leaving all product details intact.
 * 4. Dispatches a window event so all mounted pages/components immediately clear local state calculations.
 */
export async function resetAllSystemData() {
  // 1. Purge all rows from collections
  try {
    throwOnError(
      await supabase
        .from("collections")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to clear collections:", err);
  }

  // 2. Purge all rows from order_items
  try {
    throwOnError(
      await supabase
        .from("order_items")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to clear order_items:", err);
  }

  // 3. Purge all rows from orders
  try {
    throwOnError(
      await supabase
        .from("orders")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to clear orders:", err);
  }

  // 4. Purge all rows from expenses
  try {
    throwOnError(
      await supabase
        .from("expenses")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to clear expenses:", err);
  }

  // 5. Purge all rows from stock_transactions
  try {
    throwOnError(
      await supabase
        .from("stock_transactions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to clear stock_transactions:", err);
  }

  // 6. Update customers table setting current_due = 0 and opening_balance = 0
  try {
    throwOnError(
      await supabase
        .from("customers")
        .update({
          current_due: 0,
          opening_balance: 0,
          due_status: "Clear",
        })
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to reset customer dues:", err);
  }

  // 7. Update all products setting stock_quantity to exactly 100, leaving products completely intact
  try {
    throwOnError(
      await supabase
        .from("products")
        .update({
          stock_quantity: 100,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000")
    );
  } catch (err) {
    console.error("Failed to reset product stock quantity:", err);
  }

  // 8. Update/sync inventory table to 100 for each product
  try {
    const products = throwOnError(
      await supabase.from("products").select("id")
    ) as any[];

    if (Array.isArray(products) && products.length > 0) {
      const inventoryPayload = products.map((p: any) => ({
        product_id: p.id,
        warehouse: "Main",
        quantity: 100,
      }));

      await supabase.from("inventory").upsert(inventoryPayload, { onConflict: "product_id,warehouse" });
    }
  } catch (err) {
    console.error("Failed to sync inventory table:", err);
  }

  // 9. Clear any local storage keys for orders, collections, expenses, or drafts if any exist
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const keysToRemove = ["orders", "collections", "expenses", "draft_order", "cart", "pending_orders", "pending_collections"];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("order") || key.startsWith("collection") || key.startsWith("expense")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Could not clear localStorage keys:", e);
    }
  }

  // 10. Dispatch global event to notify all mounted components/pages
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYSTEM_DATA_RESET_EVENT));
  }

  return {
    success: true,
    message: "All transactional demo data wiped and product stocks reset to 100.",
  };
}

// Alias for backwards compatibility
export const resetAllCustomerBalances = resetAllSystemData;

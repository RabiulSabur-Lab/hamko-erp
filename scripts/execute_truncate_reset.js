import { createClient } from "@supabase/supabase-js";


const supabaseUrl = "https://rkjelornojeooqufcuwk.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  console.error("❌ VITE_SUPABASE_SERVICE_ROLE_KEY is missing in .env. Please add it to enable privileged deletions.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function truncateAndReset() {
  // Using service role key bypasses RLS; no need for auth.
  // 1. Delete from collections
  const colRes = await supabase
    .from("collections")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (colRes.error) {
    console.error("Error deleting collections:", colRes.error.message);
  } else {
    console.log("✓ Collections table cleared.");
  }

  // 2. Delete from order_items
  const oiRes = await supabase
    .from("order_items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (oiRes.error) {
    console.error("Error deleting order_items:", oiRes.error.message);
  } else {
    console.log("✓ Order items table cleared.");
  }

  // 3. Delete from orders
  const ordRes = await supabase
    .from("orders")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (ordRes.error) {
    console.error("Error deleting orders:", ordRes.error.message);
  } else {
    console.log("✓ Orders table cleared.");
  }

  // 4. Delete from expenses
  const expRes = await supabase
    .from("expenses")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (expRes.error) {
    console.error("Error deleting expenses:", expRes.error.message);
  } else {
    console.log("✓ Expenses table cleared.");
  }

  // 5. Delete from stock_transactions
  const stRes = await supabase
    .from("stock_transactions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (stRes.error) {
    console.error("Error deleting stock_transactions:", stRes.error.message);
  } else {
    console.log("✓ Stock transactions cleared.");
  }

  // 6. Reset all customer dues to 0
  const custRes = await supabase
    .from("customers")
    .update({
      current_due: 0,
      opening_balance: 0,
      due_status: "Clear",
    })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (custRes.error) {
    console.error("Error updating customers:", custRes.error.message);
  } else {
    console.log("✓ All customer dues and balances set to 0.");
  }

  // 7. Reset product stock to 100
  const prodRes = await supabase
    .from("products")
    .update({ stock_quantity: 100 })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (prodRes.error) {
    console.error("Error resetting product stock:", prodRes.error.message);
  } else {
    console.log("✓ All product stock quantities reset to 100.");
  }

  // 8. Verify counts
  const [cCount, oiCount, oCount, eCount, custList] = await Promise.all([
    supabase.from("collections").select("*", { count: "exact", head: true }),
    supabase.from("order_items").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("expenses").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("current_due").gt("current_due", 0),
  ]);

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log("Remaining Collections count:", cCount.count ?? 0);
  console.log("Remaining Order Items count:", oiCount.count ?? 0);
  console.log("Remaining Orders count:", oCount.count ?? 0);
  console.log("Remaining Expenses count:", eCount.count ?? 0);
  console.log("Customers with current_due > 0:", custList.data?.length ?? 0);
  console.log("============================\n");
}

truncateAndReset();

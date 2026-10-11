import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rkjelornojeooqufcuwk.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramVsb3Jub2plb29xdWZjdXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMjQ3OTYsImV4cCI6MjA5OTkwMDc5Nn0.gs4GtGqYHbparOAx-h8Ny0GXcMX5opx2_7LSIHfc0sk";

console.log("Connecting to Supabase at:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("\n=======================================================");
  console.log("HAMKO SALES ERP - LOCAL TO SUPABASE CLOUD SYNC MIGRATION");
  console.log("=======================================================\n");

  const jsonArg = process.argv[2];
  if (jsonArg && fs.existsSync(jsonArg)) {
    console.log(`Loading backup data from ${jsonArg}...`);
    const content = JSON.parse(fs.readFileSync(jsonArg, "utf-8"));

    // 1. Categories
    if (Array.isArray(content.categories)) {
      console.log(`Syncing ${content.categories.length} categories...`);
      for (const cat of content.categories) {
        if (!cat.name) continue;
        await supabase.from("categories").upsert({
          name: cat.name,
          description: cat.description || null,
        }, { onConflict: "name" });
      }
    }

    // 2. Products
    if (Array.isArray(content.products)) {
      console.log(`Syncing ${content.products.length} products...`);
      for (const p of content.products) {
        if (!p.name || !p.sku_code) continue;
        await supabase.from("products").upsert({
          sku_code: p.sku_code,
          name: p.name,
          brand: p.brand || "Hamko",
          unit_price: Number(p.unit_price) || 0,
          dealer_price: Number(p.dealer_price) || 0,
          distributor_price: Number(p.distributor_price) || 0,
          stock_quantity: Number(p.stock_quantity) || 100,
          reorder_level: Number(p.reorder_level) || 10,
          unit: p.unit || "pcs",
          is_active: p.is_active !== false,
        }, { onConflict: "sku_code" });
      }
    }

    // 3. Customers
    if (Array.isArray(content.customers)) {
      console.log(`Syncing ${content.customers.length} customers...`);
      for (const c of content.customers) {
        if (!c.name) continue;
        await supabase.from("customers").upsert({
          name: c.outlet_name || c.name,
          customer_type: ["Dealer", "Retailer", "Wholesale"].includes(c.customer_type) ? c.customer_type : "Retailer",
          contact_person: c.contact_person || c.name,
          phone: c.phone || null,
          city: c.city || c.area || null,
          current_due: Number(c.current_due) || 0,
          opening_balance: Number(c.opening_balance) || 0,
          due_status: c.due_status || "Clear",
          is_active: c.is_active !== false,
        });
      }
    }

    console.log("\n✔ JSON backup migration completed!");
  } else {
    console.log("No JSON file path specified as argument.");
    console.log("Usage: node sync_local_to_supabase.mjs <path-to-hamko_erp_full_backup.json>");
    console.log("\nChecking current live table counts:");

    const tables = ["categories", "products", "customers", "orders", "order_items", "collections", "expenses"];
    for (const t of tables) {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      console.log(` - ${t}: ${count ?? 0} rows`);
    }
  }
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

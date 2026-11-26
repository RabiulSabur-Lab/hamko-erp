#!/usr/bin/env node
/**
 * Automated Hamko Cookware Catalog -> Supabase ERP Importer
 *
 * Reads the 3-field catalog dataset (sku_code, product_name, category) extracted
 * from hamko-cookware-catalog.pdf and safely upserts:
 *   1. All 12 main categories into `public.categories`
 *   2. All 230 products into `public.products`:
 *      - New SKUs are inserted with default/0 values for pricing & stock.
 *      - Existing SKUs update ONLY `name`, `category_id`, `brand`, and `updated_at`
 *        so live ERP prices, discounts, and inventory quantities are never overwritten.
 *
 * Usage:
 *   node scripts/import_hamko_catalog.mjs            # Execute live import
 *   node scripts/import_hamko_catalog.mjs --dry-run  # Preview without writing
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATA_FILE = path.join(PROJECT_ROOT, "data", "hamko_cookware_products_3fields.json");
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 50;

function loadEnvFiles() {
  const merged = {};
  for (const name of [".env.production", ".env"]) {
    const filePath = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) {
        merged[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  }
  return { ...merged, ...process.env };
}

/**
 * Ensures zero duplicate sku_code values in the payload before hitting Supabase.
 * Known printed catalog duplicates already carry unique variant suffixes:
 *   - HG-01-06-RR (Red Rose Double Burner)
 *   - HA15-01-GS  (7 Pieces Gift Set Non-IB)
 *   - HA15-02-GS  (7 Pieces Gift Set IB)
 */
function deduplicateSkus(items) {
  const seen = new Map();
  const duplicateGuardApplied = [];

  const cleaned = items.map((item) => {
    const rawSku = String(item.sku_code ?? "").trim();
    const productName = String(item.product_name ?? "").trim();
    const category = String(item.category ?? "").trim();

    if (!rawSku || !productName || !category) {
      throw new Error(`Invalid catalog record missing required 3 fields: ${JSON.stringify(item)}`);
    }

    let finalSku = rawSku;
    if (seen.has(finalSku)) {
      let suffix = 2;
      while (seen.has(`${rawSku}-V${suffix}`)) suffix++;
      finalSku = `${rawSku}-V${suffix}`;
      duplicateGuardApplied.push({ original: rawSku, resolved: finalSku, product_name: productName });
    }
    seen.set(finalSku, true);

    return {
      sku_code: finalSku,
      product_name: productName,
      category,
    };
  });

  return { cleaned, duplicateGuardApplied };
}

async function fetchAllRows(supabase, table, columns) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed reading ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const env = loadEnvFiles();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment / .env");
  }

  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Catalog data file not found: ${DATA_FILE}`);
  }

  const rawCatalog = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!Array.isArray(rawCatalog) || rawCatalog.length === 0) {
    throw new Error("Catalog JSON is empty or not an array.");
  }

  const { cleaned: catalogItems, duplicateGuardApplied } = deduplicateSkus(rawCatalog);
  const categoryNames = [...new Set(catalogItems.map((i) => i.category))];

  console.log("=================================================================");
  console.log(`Hamko Cookware Catalog Automated Import ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"}`);
  console.log(`Target Supabase: ${supabaseUrl}`);
  console.log(`Loaded Products: ${catalogItems.length} | Categories: ${categoryNames.length}`);
  if (duplicateGuardApplied.length > 0) {
    console.log("Auto-suffixed duplicate SKUs:", duplicateGuardApplied);
  }
  console.log("=================================================================");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Fetch existing categories & upsert the 12 catalog categories
  const existingCategories = await fetchAllRows(supabase, "categories", "id,name,description");
  const existingCatMap = new Map(existingCategories.map((c) => [c.name, c]));
  const missingCategories = categoryNames
    .filter((name) => !existingCatMap.has(name))
    .map((name) => ({
      name,
      description: `Hamko Cookware — ${name}`,
    }));

  console.log(
    `Categories: ${categoryNames.length - missingCategories.length} already exist, ${missingCategories.length} to create`,
  );

  if (!DRY_RUN && missingCategories.length > 0) {
    const { error: catErr } = await supabase
      .from("categories")
      .upsert(missingCategories, { onConflict: "name", ignoreDuplicates: true });
    if (catErr) {
      throw new Error(`Category upsert failed: ${catErr.message}`);
    }
  }

  // Re-fetch authoritative category UUIDs
  const liveCategories = DRY_RUN
    ? [
        ...existingCategories,
        ...missingCategories.map((c, idx) => ({ id: `dry-run-cat-${idx}`, name: c.name })),
      ]
    : await fetchAllRows(supabase, "categories", "id,name");

  const categoryIdByName = new Map(liveCategories.map((c) => [c.name, c.id]));
  for (const name of categoryNames) {
    if (!categoryIdByName.has(name)) {
      throw new Error(`Category "${name}" could not be resolved after upsert.`);
    }
  }

  // 2. Fetch existing products so we never wipe live prices/stock on existing SKUs
  const existingProducts = await fetchAllRows(
    supabase,
    "products",
    "id,sku_code,name,brand,category_id,unit_price,dealer_price,stock_quantity",
  );
  const existingProductBySku = new Map(existingProducts.map((p) => [p.sku_code, p]));

  const nowIso = new Date().toISOString();
  const toInsert = [];
  const toUpdate = [];

  for (const item of catalogItems) {
    const categoryId = categoryIdByName.get(item.category);
    const existing = existingProductBySku.get(item.sku_code);

    if (!existing) {
      toInsert.push({
        sku_code: item.sku_code,
        name: item.product_name,
        brand: "Hamko",
        category_id: categoryId,
        unit_price: 0,
        dealer_price: 0,
        distributor_price: 0,
        stock_quantity: 0,
        reorder_level: 10,
        unit: "pcs",
        is_active: true,
        updated_at: nowIso,
      });
    } else {
      toUpdate.push({
        id: existing.id,
        sku_code: item.sku_code,
        name: item.product_name,
        brand: existing.brand || "Hamko",
        category_id: categoryId,
        updated_at: nowIso,
      });
    }
  }

  console.log(
    `Products: ${toInsert.length} new to insert (price/stock=0), ${toUpdate.length} existing to update (preserving existing prices/stock)`,
  );

  if (DRY_RUN) {
    console.log("Dry run complete — no changes written to Supabase.");
    return;
  }

  // 3. Bulk insert new catalog products in chunks
  let insertedCount = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "sku_code" })
      .select("id,sku_code");
    if (error) {
      throw new Error(`Bulk insert batch ${i}-${i + chunk.length} failed: ${error.message}`);
    }
    insertedCount += data?.length ?? chunk.length;
  }

  // 4. Safely update metadata (name, category_id, brand, updated_at) on existing products
  //    using concurrency-bounded PATCHes so existing unit_price / dealer_price / stock_quantity stay untouched
  let updatedCount = 0;
  const CONCURRENCY = 10;
  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const batch = toUpdate.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (row) => {
        const { error } = await supabase
          .from("products")
          .update({
            name: row.name,
            brand: row.brand,
            category_id: row.category_id,
            updated_at: row.updated_at,
          })
          .eq("id", row.id);
        if (error) {
          throw new Error(`Failed updating existing SKU ${row.sku_code}: ${error.message}`);
        }
        updatedCount++;
      }),
    );
  }

  // 5. Post-import live verification
  const postCategories = await fetchAllRows(supabase, "categories", "id,name");
  const postProducts = await fetchAllRows(
    supabase,
    "products",
    "id,sku_code,name,brand,category_id,unit_price,dealer_price,stock_quantity",
  );
  const postCatIdToName = new Map(postCategories.map((c) => [c.id, c.name]));
  const postBySku = new Map(postProducts.map((p) => [p.sku_code, p]));

  const missingAfterImport = [];
  const mismatchedCategory = [];
  const priceLossSkus = [];
  const categoryCounts = {};

  for (const item of catalogItems) {
    const row = postBySku.get(item.sku_code);
    if (!row) {
      missingAfterImport.push(item.sku_code);
      continue;
    }
    const actualCat = postCatIdToName.get(row.category_id);
    categoryCounts[actualCat] = (categoryCounts[actualCat] || 0) + 1;
    if (actualCat !== item.category) {
      mismatchedCategory.push({ sku: item.sku_code, expected: item.category, actual: actualCat });
    }
    const prev = existingProductBySku.get(item.sku_code);
    if (
      prev &&
      (Number(row.unit_price) !== Number(prev.unit_price) ||
        Number(row.dealer_price) !== Number(prev.dealer_price) ||
        Number(row.stock_quantity) !== Number(prev.stock_quantity))
    ) {
      priceLossSkus.push(item.sku_code);
    }
  }

  console.log("\n=== IMPORT SUMMARY & LIVE VERIFICATION ===");
  console.log(`Categories Created:           ${missingCategories.length} (Total in DB: ${postCategories.length})`);
  console.log(`Catalog Products Inserted:    ${insertedCount}`);
  console.log(`Catalog Products Updated:     ${updatedCount}`);
  console.log(`Catalog Products Verified:    ${catalogItems.length - missingAfterImport.length} / ${catalogItems.length}`);
  console.log(`Total Products in DB Now:     ${postProducts.length}`);
  console.log(`Missing After Import:         ${missingAfterImport.length}`);
  console.log(`Category Mismatches:          ${mismatchedCategory.length}`);
  console.log(`Existing Price/Stock Altered: ${priceLossSkus.length}`);
  console.log("\nVerified Catalog Products by Category:");
  console.log(JSON.stringify(categoryCounts, null, 2));

  if (missingAfterImport.length > 0 || mismatchedCategory.length > 0 || priceLossSkus.length > 0) {
    throw new Error("Post-import verification detected anomalies! Inspect logs above.");
  }
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err.message || err);
  process.exit(1);
});

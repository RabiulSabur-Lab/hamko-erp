import { supabase, SUPABASE_URL } from "@/lib/supabase";

const SEED_MARKER_SKUS = ["HG-02-07", "HA15-30", "HS13-05"] as const;
const BATCH_SIZE = 50;

let inFlightSeedPromise: Promise<CatalogSeedResult> | null = null;
let seedingActive = false;

export interface CatalogSeedResult {
  seeded: boolean;
  insertedCategories: number;
  insertedProducts: number;
  error?: string;
}

export function isCatalogSeedingInProgress(): boolean {
  return seedingActive;
}

function getSeedStorageKey(): string {
  let hostKey = "default";
  try {
    hostKey = new URL(SUPABASE_URL).hostname.split(".")[0] || "default";
  } catch {
    hostKey = "default";
  }
  return `hamko_official_catalog_230_seeded_v1::${hostKey}`;
}

function isCatalogAlreadyPresent(remoteProducts: Array<{ sku_code?: string | null }>): boolean {
  if (!Array.isArray(remoteProducts)) return false;
  if (remoteProducts.length >= 200) return true;
  const skuSet = new Set(
    remoteProducts
      .map((p) => String(p?.sku_code || "").trim().toUpperCase())
      .filter(Boolean),
  );
  return SEED_MARKER_SKUS.every((marker) => skuSet.has(marker));
}

/**
 * One-time, strictly idempotent catalog bootstrapper for any connected Supabase
 * project that has not yet imported the 230 official Hamko Cookware products.
 *
 * Safety guarantees:
 * - Zero impact on main JS bundle: dynamically imports the 230-item manifest only when needed.
 * - Never overwrites or deletes existing products, prices, or stock quantities.
 * - Uses conflict-free INSERT-missing logic so it never throws PostgreSQL 42P10
 *   even on Supabase projects lacking UNIQUE constraints on categories(name) or products(sku_code).
 * - Immediately short-circuits once the catalog is present (remoteCount >= 200 or marker SKUs exist).
 */
export async function ensureOfficialCatalogSeeded(
  remoteProducts: Array<{ id?: string; sku_code?: string | null }>,
  remoteCategories: Array<{ id: string; name: string }>,
): Promise<CatalogSeedResult> {
  if (isCatalogAlreadyPresent(remoteProducts)) {
    try {
      window.localStorage?.setItem(getSeedStorageKey(), "verified");
    } catch {
      // ignore storage quota errors
    }
    return { seeded: false, insertedCategories: 0, insertedProducts: 0 };
  }

  if (inFlightSeedPromise) {
    return inFlightSeedPromise;
  }

  inFlightSeedPromise = (async (): Promise<CatalogSeedResult> => {
    seedingActive = true;
    try {
      // Re-verify directly against Supabase to avoid seeding if another client just completed it
      const [freshProdsRes, freshCatsRes] = await Promise.all([
        supabase.from("products").select("id, sku_code").limit(2000),
        supabase.from("categories").select("id, name").limit(500),
      ]);

      if (freshProdsRes.error) {
        return {
          seeded: false,
          insertedCategories: 0,
          insertedProducts: 0,
          error: freshProdsRes.error.message,
        };
      }

      const liveProds = Array.isArray(freshProdsRes.data) ? freshProdsRes.data : remoteProducts;
      if (isCatalogAlreadyPresent(liveProds)) {
        try {
          window.localStorage?.setItem(getSeedStorageKey(), "verified");
        } catch {
          // ignore
        }
        return { seeded: false, insertedCategories: 0, insertedProducts: 0 };
      }

      const { HAMKO_OFFICIAL_CATALOG_3FIELDS } = await import("@/data/hamkoCatalog3Fields");

      // 1. Insert only missing official categories (case-insensitive)
      const liveCats = Array.isArray(freshCatsRes.data) ? freshCatsRes.data : remoteCategories;
      const existingCatMap = new Map<string, string>(
        liveCats.map((c: any) => [String(c.name || "").trim().toLowerCase(), String(c.id)]),
      );

      const officialCategoryNames = Array.from(
        new Set(HAMKO_OFFICIAL_CATALOG_3FIELDS.map((item) => item.category.trim())),
      );
      const missingCategories = officialCategoryNames
        .filter((name) => !existingCatMap.has(name.toLowerCase()))
        .map((name) => ({
          name,
          description: `Hamko Cookware — ${name}`,
        }));

      let insertedCategories = 0;
      if (missingCategories.length > 0) {
        const { error: catInsertErr } = await supabase
          .from("categories")
          .insert(missingCategories);
        if (catInsertErr) {
          console.warn("[CatalogSeed] Category insert warning:", catInsertErr.message);
          return {
            seeded: false,
            insertedCategories: 0,
            insertedProducts: 0,
            error: catInsertErr.message,
          };
        }
        insertedCategories = missingCategories.length;
      }

      // Reload authoritative category UUIDs
      const { data: syncedCats, error: catReloadErr } = await supabase
        .from("categories")
        .select("id, name")
        .limit(500);
      if (catReloadErr || !Array.isArray(syncedCats)) {
        return {
          seeded: false,
          insertedCategories,
          insertedProducts: 0,
          error: catReloadErr?.message || "Failed to reload categories after insert",
        };
      }

      const catIdByLowerName = new Map<string, string>(
        syncedCats.map((c: any) => [String(c.name || "").trim().toLowerCase(), String(c.id)]),
      );

      // 2. Filter out any SKUs that already exist in Supabase (case-insensitive)
      const existingSkuSet = new Set(
        liveProds
          .map((p: any) => String(p?.sku_code || "").trim().toUpperCase())
          .filter(Boolean),
      );

      const nowIso = new Date().toISOString();
      const missingProductPayloads = HAMKO_OFFICIAL_CATALOG_3FIELDS.filter(
        (item) => !existingSkuSet.has(item.sku_code.trim().toUpperCase()),
      ).map((item) => ({
        sku_code: item.sku_code.trim(),
        name: item.product_name.trim(),
        brand: "Hamko",
        category_id: catIdByLowerName.get(item.category.trim().toLowerCase()) || null,
        unit_price: 0,
        dealer_price: 0,
        distributor_price: 0,
        stock_quantity: 0,
        reorder_level: 10,
        unit: "pcs",
        is_active: true,
        updated_at: nowIso,
      }));

      // 3. Bulk insert missing products in batches of 50
      let insertedProducts = 0;
      for (let i = 0; i < missingProductPayloads.length; i += BATCH_SIZE) {
        const chunk = missingProductPayloads.slice(i, i + BATCH_SIZE);
        const { error: prodInsertErr } = await supabase.from("products").insert(chunk);
        if (prodInsertErr) {
          console.warn(
            `[CatalogSeed] Product batch ${i}-${i + chunk.length} insert warning:`,
            prodInsertErr.message,
          );
          return {
            seeded: insertedProducts > 0 || insertedCategories > 0,
            insertedCategories,
            insertedProducts,
            error: prodInsertErr.message,
          };
        }
        insertedProducts += chunk.length;
      }

      try {
        window.localStorage?.setItem(getSeedStorageKey(), new Date().toISOString());
      } catch {
        // ignore
      }

      return {
        seeded: insertedCategories > 0 || insertedProducts > 0,
        insertedCategories,
        insertedProducts,
      };
    } catch (err: any) {
      console.warn("[CatalogSeed] Unexpected catalog bootstrap exception:", err);
      return {
        seeded: false,
        insertedCategories: 0,
        insertedProducts: 0,
        error: err?.message || "Catalog bootstrap failed",
      };
    } finally {
      seedingActive = false;
      inFlightSeedPromise = null;
    }
  })();

  return inFlightSeedPromise;
}

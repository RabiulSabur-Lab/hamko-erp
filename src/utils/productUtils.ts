import { STORAGE_KEYS, getDeletedIds, getProducts, r2 } from "@/utils/localStore";
import { sanitizeFormulaInput, isFormulaInjection } from "@/utils/payloadSanitizer";

export interface PriceTierEntry {
  name: string;
  tier1?: number | string | null;
  tier2?: number | string | null;
  tier3?: number | string | null;
  price: number | string;
  rate?: number | string;
}

/**
 * Safely parses an optional discount percentage value (0–100).
 * Returns null for blank/empty inputs, or a clamped numeric percentage.
 */
export function parseTierPercent(value?: number | string | null): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = parseFloat(String(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, r2(parsed)));
}

/**
 * Calculates the final tier rate using successive 3-tier chain discounts:
 * Final Rate = Base DP * (1 - t1/100) * (1 - t2/100) * (1 - t3/100)
 */
export function calculateChainedTierPrice(
  baseDp: number,
  tier1?: number | string | null,
  tier2?: number | string | null,
  tier3?: number | string | null,
): number {
  const dp = Math.max(0, Number(baseDp) || 0);
  if (dp <= 0) return 0;
  const t1 = parseTierPercent(tier1) ?? 0;
  const t2 = parseTierPercent(tier2) ?? 0;
  const t3 = parseTierPercent(tier3) ?? 0;
  return r2(dp * (1 - t1 / 100) * (1 - t2 / 100) * (1 - t3 / 100));
}

/**
 * Default 3-tier chain discount presets based on DP (Selling Base Rate):
 * - D6  = 6%             -> DP * 0.94
 * - B8  = 6% + 2%        -> DP * 0.94 * 0.98 = DP * (4744.18 / 5150)
 * - D8  = 8%             -> DP * 0.92
 * - D10 = 10%            -> DP * 0.90
 * - B12 = 10% + 2%       -> DP * 0.90 * 0.98 = DP * (4542.30 / 5150)
 * - D12 = 12%            -> DP * 0.88
 * - B14 = 12% + 2%       -> DP * 0.88 * 0.98 = DP * (4441.36 / 5150)
 */
export const DEFAULT_TIER_CHAIN_PRESETS: Record<
  string,
  { tier1: number; tier2: number | null; tier3: number | null }
> = {
  D6: { tier1: 6, tier2: null, tier3: null },
  B8: { tier1: 6, tier2: 2, tier3: null },
  D8: { tier1: 8, tier2: null, tier3: null },
  D10: { tier1: 10, tier2: null, tier3: null },
  B12: { tier1: 10, tier2: 2, tier3: null },
  D12: { tier1: 12, tier2: null, tier3: null },
  B14: { tier1: 12, tier2: 2, tier3: null },
};

export const DEFAULT_TIER_FORMULAS: Record<string, (dp: number) => number> = {
  D6: (dp: number) => calculateChainedTierPrice(dp, 6),
  B8: (dp: number) => calculateChainedTierPrice(dp, 6, 2),
  D8: (dp: number) => calculateChainedTierPrice(dp, 8),
  D10: (dp: number) => calculateChainedTierPrice(dp, 10),
  B12: (dp: number) => calculateChainedTierPrice(dp, 10, 2),
  D12: (dp: number) => calculateChainedTierPrice(dp, 12),
  B14: (dp: number) => calculateChainedTierPrice(dp, 12, 2),
};

export const DEFAULT_TIER_NAMES = ["D6", "B8", "D8", "D10", "B12", "D12", "B14"] as const;

export function calculateDefaultPriceTiers(
  dp: number,
): { name: string; tier1: number; tier2: number | null; tier3: number | null; price: number; rate: number }[] {
  const numDp = Math.max(0, Number(dp) || 0);
  return DEFAULT_TIER_NAMES.map((name) => {
    const preset = DEFAULT_TIER_CHAIN_PRESETS[name];
    const val = calculateChainedTierPrice(numDp, preset.tier1, preset.tier2, preset.tier3);
    return {
      name,
      tier1: preset.tier1,
      tier2: preset.tier2,
      tier3: preset.tier3,
      price: val,
      rate: val,
    };
  });
}

/**
 * Strips price amounts inside parentheses (e.g. `(৳ 5,350)`) and suffix words like "Rate" or "Price".
 * E.g.: "DP Price (৳ 5,350)" -> "DP", "D10 Rate (৳ 5,296.5)" -> "D10", "Custom Price" -> "Custom".
 */
export const formatTierLabel = (tierName?: string | null): string => {
  if (!tierName || typeof tierName !== "string") return "";
  const cleaned = tierName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*(Rate|Price)\s*/gi, "")
    .trim();
  return cleaned || tierName.trim();
};

export interface ResolvedProductInfo {
  name: string;
  sku_code?: string;
  isDeleted: boolean;
  exists: boolean;
  product?: any;
}

/**
 * Checks if a product exists in the catalog and database, or if it has been deleted or orphaned.
 * Safely sanitizes formula injections (e.g. '=SUM(1,2)') and falls back to '[Deleted Product]'.
 */
export function resolveOrderProduct(
  itemProduct?: any,
  productId?: string | null,
  allProductsList?: any[]
): ResolvedProductInfo {
  const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
  const prodId = productId || itemProduct?.id;

  // 1. If explicitly marked as deleted in tombstone storage
  if (prodId && deletedIds.has(prodId)) {
    return {
      name: "[Deleted Product]",
      sku_code: undefined,
      isDeleted: true,
      exists: false,
      product: null,
    };
  }

  // 2. Search in provided products list or in local store catalog
  const catalog = Array.isArray(allProductsList) && allProductsList.length > 0
    ? allProductsList
    : getProducts();

  // If a catalog is available, strictly verify if the product actually exists in the store/database
  if (catalog && catalog.length > 0) {
    if (!prodId) {
      return {
        name: "[Deleted Product]",
        sku_code: undefined,
        isDeleted: true,
        exists: false,
        product: null,
      };
    }

    const matched = catalog.find((p: any) => p.id === prodId && p.is_active !== false);
    if (!matched) {
      // The associated product does not exist in store/database or was deleted
      return {
        name: "[Deleted Product]",
        sku_code: undefined,
        isDeleted: true,
        exists: false,
        product: null,
      };
    }

    const rawName = String(matched.name || "").trim();
    if (rawName === "[Deleted Product]" || !rawName) {
      return {
        name: "[Deleted Product]",
        sku_code: undefined,
        isDeleted: true,
        exists: false,
        product: null,
      };
    }

    const sanitizedName = sanitizeFormulaInput(rawName) || "[Deleted Product]";
    const sanitizedSku = matched.sku_code ? sanitizeFormulaInput(matched.sku_code) : undefined;

    return {
      name: sanitizedName,
      sku_code: sanitizedSku,
      isDeleted: false,
      exists: true,
      product: {
        ...matched,
        name: sanitizedName,
        sku_code: sanitizedSku,
      },
    };
  }

  // 3. Fallback when catalog is not yet loaded: inspect embedded product
  if (!itemProduct || typeof itemProduct !== "object") {
    return {
      name: "[Deleted Product]",
      sku_code: undefined,
      isDeleted: true,
      exists: false,
      product: null,
    };
  }

  if (itemProduct.is_active === false || itemProduct.name === "[Deleted Product]") {
    return {
      name: "[Deleted Product]",
      sku_code: undefined,
      isDeleted: true,
      exists: false,
      product: null,
    };
  }

  // If embedded name has formula injection e.g. '=SUM(1,2)', treat non-existent formula product as deleted
  if (isFormulaInjection(itemProduct.name)) {
    return {
      name: "[Deleted Product]",
      sku_code: undefined,
      isDeleted: true,
      exists: false,
      product: null,
    };
  }

  const rawEmbeddedName = String(itemProduct.name || "").trim();
  const sanitizedName = sanitizeFormulaInput(rawEmbeddedName) || "[Deleted Product]";

  return {
    name: sanitizedName,
    sku_code: itemProduct.sku_code ? sanitizeFormulaInput(itemProduct.sku_code) : undefined,
    isDeleted: false,
    exists: true,
    product: {
      ...itemProduct,
      name: sanitizedName,
    },
  };
}

import { z } from "zod";

/**
 * Zod validation schema for product form inputs.
 * Ensures the price field (DP / Base Rate) is never silently blocked, reset, or set to NaN/undefined.
 */
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  sku_code: z.string().min(1, "SKU code is required"),
  brand: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  unit_price: z.coerce.number().min(0, "DP (Selling Base Rate) must be at least 0").default(0),
  dp_price: z.coerce.number().min(0).optional(),
  dealer_price: z.coerce.number().min(0).optional(),
  selling_price: z.coerce.number().min(0).optional(),
  distributor_price: z.coerce.number().min(0).default(0),
  purchase_cost: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().default(0),
  reorder_level: z.coerce.number().default(10),
  unit: z.string().default("pcs"),
  is_active: z.boolean().default(true),
  price_tiers: z.any().optional(),
  mrp: z.coerce.number().nullable().optional(),
  d10_price: z.coerce.number().nullable().optional(),
  b12_price: z.coerce.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export type ProductSchemaType = z.infer<typeof productSchema>;

/**
 * Exact column names that physically exist in the Supabase `products` PostgreSQL table schema.
 * Passing columns outside this list causes PostgREST 400 schema cache error.
 */
export const ALLOWED_SUPABASE_PRODUCT_COLUMNS = new Set([
  "sku_code",
  "name",
  "brand",
  "category_id",
  "unit_price",
  "dealer_price",
  "distributor_price",
  "mrp",
  "d10_price",
  "b12_price",
  "price_tiers",
  "stock_quantity",
  "reorder_level",
  "unit",
  "image_url",
  "is_active",
  "updated_at",
]);

/**
 * Filters a raw product payload so only valid database columns are sent to Supabase.
 * If the brand field is omitted, undefined, or empty, it is gracefully omitted from the payload
 * so that database defaults apply and missing schema column issues are avoided.
 */
export function filterProductPayloadForSupabase(payload: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};
  for (const key of Object.keys(payload)) {
    if (ALLOWED_SUPABASE_PRODUCT_COLUMNS.has(key) && payload[key] !== undefined) {
      if (key === "brand") {
        const val = payload[key];
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
          continue; // Gracefully omit brand when empty or undefined
        }
        filtered[key] = typeof val === "string" ? val.trim() : val;
        continue;
      }
      filtered[key] = payload[key];
    }
  }
  return filtered;
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { sanitizeProductPayload, executeWithSchemaResilience } from "@/lib/payloadSanitizer";

/**
 * React Query mutation hook for updating products in Supabase.
 * Logs payload, forces schema matching, validates against schema cache,
 * and executes queryClient invalidation on success.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, any> }) => {
      const cleanPayload = sanitizeProductPayload(payload);
      console.log("Updating product payload:", cleanPayload);

      const res = await executeWithSchemaResilience("products", cleanPayload, (p) =>
        supabase
          .from("products")
          .update(p)
          .eq("id", id)
          .select("*, category:categories(*)")
          .single(),
      );

      if (res.error || !res.data) {
        console.error("Supabase product update error:", res.error);
        const errMsg = res.error?.message || "Failed to update product in database";
        toast.error(`Database update failed: ${errMsg}`);
        throw new Error(errMsg);
      }

      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export { sanitizeFormulaInput, isFormulaInjection };


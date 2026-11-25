import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, Loader2, Trash2, Sparkles, HelpCircle, Calculator, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { r2, getProducts } from "@/utils/localStore";
import {
  sanitizeFormulaInput,
  formatTierLabel,
  productSchema,
  calculateDefaultPriceTiers,
  calculateChainedTierPrice,
  parseTierPercent,
} from "@/utils/productUtils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Product, Category } from "@/lib/supabase";

export interface PriceTierItem {
  name: string;
  tier1: number | string;
  tier2: number | string;
  tier3: number | string;
  price: number | string;
  rate?: number | string;
  /** True only for pre-existing saved tiers that stored a fixed price without tier1/2/3 percentages */
  isLegacyFixed?: boolean;
}

const INITIAL_BLANK_TIER_ROWS = 10;

const createEmptyTierRow = (): PriceTierItem => ({
  name: "",
  tier1: "",
  tier2: "",
  tier3: "",
  price: "",
  rate: "",
  isLegacyFixed: false,
});

const padTierRows = (existing: PriceTierItem[], minRows = INITIAL_BLANK_TIER_ROWS): PriceTierItem[] => {
  const rows = [...existing];
  while (rows.length < minRows) {
    rows.push(createEmptyTierRow());
  }
  return rows;
};

const hasTierDiscount = (tier: PriceTierItem): boolean =>
  tier.tier1 !== "" || tier.tier2 !== "" || tier.tier3 !== "";

const computeRowPreviewPrice = (tier: PriceTierItem, baseDp: number): number | "" => {
  const dp = Math.max(0, Number(baseDp) || 0);
  if (hasTierDiscount(tier)) {
    return dp > 0 ? calculateChainedTierPrice(dp, tier.tier1, tier.tier2, tier.tier3) : 0;
  }
  if (tier.isLegacyFixed && tier.price !== "" && Number(tier.price) > 0) {
    return r2(Number(tier.price));
  }
  if (tier.name.trim().length > 0 && dp > 0) {
    return calculateChainedTierPrice(dp, tier.tier1, tier.tier2, tier.tier3);
  }
  return "";
};

export interface ProductFormData {
  id?: string;
  sku_code: string;
  name: string;
  brand?: string | null;
  category_id?: string | null;
  unit_price: number | string; // Base selling rate (DP)
  dp_price?: number | string;
  selling_price?: number | string;
  price?: number | string;
  dealer_price?: number | string;
  base_price?: number | string;
  distributor_price: number | string; // Company Purchase Price (Cost)
  purchase_cost?: number | string;
  cost_price?: number | string;
  purchase_price?: number | string;
  stock_quantity?: number;
  reorder_level?: number | string;
  unit?: string;
  is_active?: boolean;
  price_tiers?: {
    name: string;
    tier1?: number | null;
    tier2?: number | null;
    tier3?: number | null;
    price: number;
    rate?: number;
  }[];
}

export interface ProductEditModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  editing?: Product | any | null;
  product?: Product | any | null;
  selectedProduct?: Product | any | null;
  form?: any;
  setForm?: any;
  categories: Category[] | any[];
  onSave: (productData: ProductFormData) => Promise<void> | void;
  saving?: boolean;
  onManageCategories?: () => void;
}

export function ProductEditModal({
  open,
  isOpen,
  onClose,
  editing,
  product,
  selectedProduct,
  form: formProp,
  setForm: setFormProp,
  categories,
  onSave,
  saving = false,
  onManageCategories,
}: ProductEditModalProps) {
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();

  // Role protection: Sales Officer cannot edit or add products
  const rawRoleString = (
    profile?.role_name ||
    (user as any)?.user_metadata?.role ||
    (user as any)?.profile?.role ||
    (user as any)?.role_name ||
    ((user as any)?.role && (user as any).role !== "authenticated" ? (user as any).role : "") ||
    ((user as any)?.email?.toLowerCase().includes("officer") ? "sales_officer" : "") ||
    ""
  );
  const userRole = rawRoleString.toLowerCase().replace(/[\s_-]+/g, "");

  const isSalesOfficer =
    userRole === "sales_officer" ||
    userRole === "salesofficer" ||
    userRole === "so" ||
    userRole.includes("officer") ||
    (user as any)?.role === "sales_officer" ||
    (user as any)?.user_metadata?.role === "sales_officer" ||
    (user as any)?.email?.toLowerCase().includes("officer");

  const isModalOpen = (open ?? isOpen ?? false) && !isSalesOfficer;
  const activeProduct = selectedProduct ?? editing ?? product ?? null;

  if (isSalesOfficer) {
    return null;
  }

  const [priceTiers, setPriceTiers] = useState<PriceTierItem[]>(() => padTierRows([], INITIAL_BLANK_TIER_ROWS));

  const [form, setForm] = useState<ProductFormData>({
    sku_code: "",
    name: "",
    brand: "",
    category_id: "",
    unit_price: 0,
    distributor_price: 0,
    purchase_cost: 0,
    cost_price: 0,
    purchase_price: 0,
    reorder_level: 10,
    unit: "pcs",
    is_active: true,
  });

  const isDirtyRef = useRef(false);
  const prevOpenRef = useRef(false);
  const prevProductIdRef = useRef<string | null | undefined>(undefined);

  const getCurrentBaseDp = (): number => {
    const rawDp =
      form.unit_price ??
      form.dp_price ??
      form.selling_price ??
      form.price ??
      (activeProduct as any)?.unit_price ??
      (activeProduct as any)?.dp_price ??
      (formProp as any)?.unit_price ??
      0;
    return Math.max(0, parseFloat(String(rawDp || 0)) || 0);
  };

  const updateForm = (updater: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => {
    isDirtyRef.current = true;
    if (typeof updater === "function") {
      setForm((prev) => updater(prev));
    } else {
      setForm((prev) => ({ ...prev, ...updater }));
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      prevOpenRef.current = false;
      isDirtyRef.current = false;
      return;
    }

    const currentProdId = activeProduct?.id || null;
    const isNewOpen = !prevOpenRef.current && isModalOpen;
    const isDifferentProduct = currentProdId !== prevProductIdRef.current;

    // Only re-initialize form state if the modal just opened OR if switching to a different product ID while not dirty.
    if (isNewOpen || (isDifferentProduct && !isDirtyRef.current)) {
      prevOpenRef.current = true;
      prevProductIdRef.current = currentProdId;
      isDirtyRef.current = false;

      if (activeProduct) {
        const catId =
          activeProduct.category_id ||
          (typeof activeProduct.category === "object" ? (activeProduct.category as any)?.id : null) ||
          "";
        const purchaseCost =
          (activeProduct as any).purchase_cost ??
          activeProduct.distributor_price ??
          (activeProduct as any).distributorPrice ??
          (activeProduct as any).purchase_price ??
          (activeProduct as any).purchasePrice ??
          0;

        const dpValue = Math.max(
          0,
          parseFloat(
            String(
              activeProduct.unit_price ??
              (activeProduct as any).dp_price ??
              (activeProduct as any).selling_price ??
              (activeProduct as any).unitPrice ??
              (activeProduct as any).base_price ??
              (activeProduct as any).price ??
              (activeProduct as any).dealer_price ??
              (formProp as any)?.unit_price ??
              (formProp as any)?.dp_price ??
              0
            )
          ) || 0
        );

        // Load saved price_tiers (array, JSON string, or object map) without injecting hardcoded defaults
        let initialTiers: PriceTierItem[] = [];
        const locProd = activeProduct?.id ? getProducts().find((p: any) => p.id === activeProduct.id) : null;
        let rawTiers = (activeProduct as any)?.price_tiers;
        if ((!rawTiers || (Array.isArray(rawTiers) && rawTiers.length === 0)) && (locProd as any)?.price_tiers) {
          rawTiers = (locProd as any).price_tiers;
        }
        if ((!rawTiers || (Array.isArray(rawTiers) && rawTiers.length === 0)) && (formProp as any)?.price_tiers) {
          rawTiers = (formProp as any).price_tiers;
        }
        if (typeof rawTiers === "string") {
          try {
            rawTiers = JSON.parse(rawTiers);
          } catch {
            rawTiers = [];
          }
        }
        if (Array.isArray(rawTiers) && rawTiers.length > 0) {
          initialTiers = rawTiers
            .filter((t: any) => t && (t.name != null || t.tier_name != null))
            .map((t: any): PriceTierItem => {
              const t1 = t.tier1 != null && t.tier1 !== "" ? t.tier1 : "";
              const t2 = t.tier2 != null && t.tier2 !== "" ? t.tier2 : "";
              const t3 = t.tier3 != null && t.tier3 !== "" ? t.tier3 : "";
              const hasChain = t1 !== "" || t2 !== "" || t3 !== "";
              const rawPrice = t.price != null && t.price !== "" ? t.price : (t.rate != null && t.rate !== "" ? t.rate : "");
              const computedPrice = hasChain && dpValue > 0
                ? calculateChainedTierPrice(dpValue, t1, t2, t3)
                : rawPrice;
              return {
                name: formatTierLabel(String(t.name ?? t.tier_name ?? t.title ?? "").trim()),
                tier1: t1,
                tier2: t2,
                tier3: t3,
                price: computedPrice,
                rate: computedPrice,
                isLegacyFixed: !hasChain && rawPrice !== "" && Number(rawPrice) > 0,
              };
            })
            .filter((t) => t.name.length > 0);
        } else if (rawTiers && typeof rawTiers === "object" && !Array.isArray(rawTiers)) {
          initialTiers = Object.entries(rawTiers)
            .map(([name, price]): PriceTierItem => {
              const cleaned = formatTierLabel(String(name).trim());
              const numVal = price != null && price !== "" ? Number(price) : "";
              return {
                name: cleaned,
                tier1: "",
                tier2: "",
                tier3: "",
                price: numVal,
                rate: numVal,
                isLegacyFixed: numVal !== "" && Number(numVal) > 0,
              };
            })
            .filter((t) => t.name.length > 0);
        }

        // Pad with blank rows up to 10 so users can type manually without hardcoded defaults
        const paddedTiers = padTierRows(initialTiers, INITIAL_BLANK_TIER_ROWS);
        setPriceTiers(paddedTiers);

        setForm({
          id: activeProduct.id,
          sku_code: activeProduct.sku_code || "",
          name: activeProduct.name || "",
          brand: activeProduct.brand || "",
          category_id: catId,
          unit_price: dpValue,
          dp_price: dpValue,
          selling_price: dpValue,
          price: dpValue,
          dealer_price: dpValue,
          base_price: dpValue,
          distributor_price: purchaseCost,
          purchase_cost: purchaseCost,
          cost_price: purchaseCost,
          purchase_price: purchaseCost,
          stock_quantity: activeProduct.stock_quantity ?? 0,
          reorder_level: activeProduct.reorder_level ?? 10,
          unit: activeProduct.unit || "pcs",
          is_active: activeProduct.is_active ?? true,
          price_tiers: paddedTiers as any,
        });
      } else {
        const blankRows = padTierRows([], INITIAL_BLANK_TIER_ROWS);
        setPriceTiers(blankRows);
        setForm({
          sku_code: "",
          name: "",
          brand: "",
          category_id: "",
          unit_price: 0,
          dp_price: 0,
          selling_price: 0,
          price: 0,
          dealer_price: 0,
          base_price: 0,
          distributor_price: 0,
          purchase_cost: 0,
          cost_price: 0,
          purchase_price: 0,
          stock_quantity: 0,
          reorder_level: 10,
          unit: "pcs",
          is_active: true,
          price_tiers: blankRows as any,
        });
      }
    }
  }, [isModalOpen, activeProduct?.id]);

  // Recalculate chained 3-tier prices live whenever Base DP changes (never injects hardcoded defaults)
  useEffect(() => {
    if (!isModalOpen) return;
    const rawDp = form.unit_price ?? form.dp_price ?? 0;
    const numDp = Math.max(0, parseFloat(String(rawDp || 0)) || 0);

    setPriceTiers((currentTiers) => {
      let changed = false;
      const recalculated = currentTiers.map((t) => {
        if (t.isLegacyFixed && !hasTierDiscount(t)) return t;
        const expected = computeRowPreviewPrice(t, numDp);
        if (t.price !== expected || t.rate !== expected) {
          changed = true;
          return { ...t, price: expected, rate: expected };
        }
        return t;
      });

      if (!changed) return currentTiers;

      setForm((prev) => ({ ...prev, price_tiers: recalculated as any }));
      if (setFormProp) {
        setFormProp((prev: any) => ({ ...prev, price_tiers: recalculated }));
      }
      return recalculated;
    });
  }, [form.unit_price, isModalOpen]);

  const handleAddTier = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDirtyRef.current = true;
    const nextTiers = [...priceTiers, createEmptyTierRow()];
    setPriceTiers(nextTiers);
    setForm((prev) => ({ ...prev, price_tiers: nextTiers as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: nextTiers }));
  };

  const handleResetBlankTiers = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDirtyRef.current = true;
    const blankRows = padTierRows([], INITIAL_BLANK_TIER_ROWS);
    setPriceTiers(blankRows);
    setForm((prev) => ({ ...prev, price_tiers: blankRows as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: blankRows }));
  };

  const handleLoadDefaultTiers = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dp = getCurrentBaseDp();
    if (dp <= 0) {
      toast.error(
        lang === "bn"
          ? "ডিফল্ট টায়ার গণনার জন্য অনুগ্রহ করে আগে একটি সঠিক ডিলার মূল্য (DP) দিন।"
          : "Please enter a valid DP (Selling Base Rate) first to calculate default tiers."
      );
      return;
    }
    isDirtyRef.current = true;
    const presetTiers: PriceTierItem[] = calculateDefaultPriceTiers(dp).map((dt) => ({
      name: dt.name,
      tier1: dt.tier1,
      tier2: dt.tier2 ?? "",
      tier3: dt.tier3 ?? "",
      price: dt.price,
      rate: dt.rate,
      isLegacyFixed: false,
    }));
    const paddedDefaults = padTierRows(presetTiers, INITIAL_BLANK_TIER_ROWS);
    setPriceTiers(paddedDefaults);
    setForm((prev) => ({ ...prev, price_tiers: paddedDefaults as any }));
    if (setFormProp) {
      setFormProp((prev: any) => ({ ...prev, price_tiers: paddedDefaults }));
    }
    toast.success(
      lang === "bn"
        ? `DP (৳ ${dp}) অনুযায়ী ৭টি ডিফল্ট প্রাইস টায়ার লোড হয়েছে`
        : `Loaded 7 default chain-discount tiers based on DP (৳ ${dp})`
    );
  };

  const handleDpChange = (rawVal: string) => {
    isDirtyRef.current = true;
    const numericVal = rawVal === "" ? "" : (parseFloat(rawVal) || 0);
    const numDp = typeof numericVal === "number" ? Math.max(0, numericVal) : 0;

    const updatedTiers = priceTiers.map((t) => {
      if (t.isLegacyFixed && !hasTierDiscount(t)) return t;
      const newPrice = computeRowPreviewPrice(t, numDp);
      return {
        ...t,
        price: newPrice,
        rate: newPrice,
      };
    });

    setPriceTiers(updatedTiers);

    setForm((prev) => ({
      ...prev,
      unit_price: numericVal,
      dp_price: numericVal,
      selling_price: numericVal,
      price: numericVal,
      dealer_price: numericVal,
      base_price: numericVal,
      price_tiers: updatedTiers as any,
    }));

    if (setFormProp) {
      setFormProp((prev: any) => ({
        ...prev,
        unit_price: numericVal,
        dp_price: numericVal,
        selling_price: numericVal,
        price: numericVal,
        dealer_price: numericVal,
        base_price: numericVal,
        price_tiers: updatedTiers,
      }));
    }
  };

  const handleRemoveTier = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDirtyRef.current = true;
    const nextTiers = priceTiers.filter((_, i) => i !== index);
    setPriceTiers(nextTiers);
    setForm((prev) => ({ ...prev, price_tiers: nextTiers as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: nextTiers }));
  };

  const handleTierChange = (index: number, field: "name" | "tier1" | "tier2" | "tier3", val: string) => {
    isDirtyRef.current = true;
    const dp = getCurrentBaseDp();
    const next = [...priceTiers];
    if (!next[index]) return;

    const current = { ...next[index] };
    if (field === "name") {
      current.name = val;
      if (val.trim() === "" && !hasTierDiscount(current)) {
        current.isLegacyFixed = false;
      }
    } else {
      // Allow blank input or valid numeric percentage (0-100) while typing cleanly
      if (val === "") {
        current[field] = "";
      } else {
        const parsed = parseFloat(val);
        if (Number.isFinite(parsed)) {
          current[field] = parsed > 100 ? "100" : parsed < 0 ? "0" : val;
        } else {
          current[field] = val;
        }
      }
      current.isLegacyFixed = false;
    }

    const livePrice = computeRowPreviewPrice(current, dp);
    current.price = livePrice;
    current.rate = livePrice;
    next[index] = current;

    setPriceTiers(next);
    setForm((prev) => ({ ...prev, price_tiers: next as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: next }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Force numeric parsing for DP price to ensure it is never NaN or undefined
    const finalDp = Math.max(
      0,
      r2(parseFloat(String(form.dp_price ?? form.unit_price ?? (form as any).selling_price ?? (form as any).price ?? 0)) || 0)
    );
    const purchaseCost = Math.max(0, r2(parseFloat(String(form.purchase_cost ?? form.distributor_price ?? 0)) || 0));

    const sanitizedName = sanitizeFormulaInput(form.name);
    const sanitizedSku = sanitizeFormulaInput(form.sku_code);
    const sanitizedBrand = form.brand ? sanitizeFormulaInput(form.brand) : "";

    if (!sanitizedName || !sanitizedSku) {
      toast.error("Valid Product Name and SKU Code are required (formula strings prohibited)");
      return;
    }

    // Clean price tiers — ignore empty rows, preserve 3-tier chain percentages + final rate
    const cleanedTiers = priceTiers
      .filter((t) => t && typeof t.name === "string" && sanitizeFormulaInput(t.name).length > 0)
      .map((t) => {
        const t1 = parseTierPercent(t.tier1);
        const t2 = parseTierPercent(t.tier2);
        const t3 = parseTierPercent(t.tier3);
        const hasChain = t1 !== null || t2 !== null || t3 !== null;
        const legacyRaw = parseFloat(String(t.price != null && t.price !== "" ? t.price : (t as any).rate));
        const val = hasChain
          ? calculateChainedTierPrice(finalDp, t1, t2, t3)
          : t.isLegacyFixed && Number.isFinite(legacyRaw) && legacyRaw > 0
            ? r2(legacyRaw)
            : finalDp;
        return {
          name: formatTierLabel(sanitizeFormulaInput(t.name)),
          ...(t1 !== null ? { tier1: t1 } : {}),
          ...(t2 !== null ? { tier2: t2 } : {}),
          ...(t3 !== null ? { tier3: t3 } : {}),
          price: val,
          rate: val,
        };
      });

    // Zod validation to ensure price fields and essential fields are properly typed
    const validationResult = productSchema.safeParse({
      ...form,
      name: sanitizedName,
      sku_code: sanitizedSku,
      brand: sanitizedBrand || null,
      unit_price: finalDp,
      dp_price: finalDp,
      dealer_price: finalDp,
      selling_price: finalDp,
      distributor_price: purchaseCost,
    });

    if (!validationResult.success) {
      const errMsg = validationResult.error.errors[0]?.message || "Product validation failed";
      toast.error(errMsg);
      return;
    }

    isDirtyRef.current = false;
    onSave({
      ...form,
      name: sanitizedName,
      sku_code: sanitizedSku,
      brand: sanitizedBrand || null,
      id: activeProduct?.id || form.id,
      is_active: form.is_active !== false,
      unit_price: finalDp,
      dp_price: finalDp,
      selling_price: finalDp,
      price: finalDp,
      dealer_price: finalDp,
      base_price: finalDp,
      distributor_price: purchaseCost,
      purchase_cost: purchaseCost,
      cost_price: purchaseCost,
      purchase_price: purchaseCost,
      reorder_level: Math.max(0, Math.round(Number(form.reorder_level) || 0)),
      price_tiers: cleanedTiers,
    });
  };

  const liveBaseDp = getCurrentBaseDp();
  const configuredTierCount = priceTiers.filter((t) => t.name.trim().length > 0).length;

  return (
    <Dialog
      open={isModalOpen}
      onClose={onClose}
      title={activeProduct ? t("edit") : t("addProduct")}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* SKU Code */}
          <div className="space-y-1.5">
            <Label>{t("skuCode")}</Label>
            <Input
              value={form.sku_code}
              onChange={(e) => updateForm({ sku_code: e.target.value })}
              placeholder="e.g. HK-001"
              required
            />
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <Label>{t("productName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="Product display name"
              required
            />
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <Label>{t("brand")}</Label>
            <Input
              value={form.brand ?? ""}
              onChange={(e) => updateForm({ brand: e.target.value })}
              placeholder="e.g. HAMKO"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("category")}</Label>
              {onManageCategories && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onManageCategories}
                  className="h-6 px-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 flex items-center gap-1 font-medium"
                  title="Manage categories"
                >
                  <Plus className="h-3 w-3" /> Manage
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Select
                value={form.category_id ?? ""}
                onChange={(e) => updateForm({ category_id: e.target.value || null })}
                className="flex-1"
              >
                <option value="">— Select Category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {onManageCategories && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onManageCategories}
                  className="h-9 w-9 shrink-0 text-primary hover:bg-primary/5 border-dashed"
                  title="Add new category"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* DP (Selling Base Rate) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <span>{lang === "bn" ? "ডিলার মূল্য (DP - Dealer Price)" : "DP (Dealer Price / Base Rate)"}</span>
                <span
                  className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
                  title={
                    lang === "bn"
                      ? "ডিলার মূল্য (DP): অনুমোদিত ডিলার ও আউটলেটের পাইকারি বিক্রয় রেট (খুচরা MRP নয়)"
                      : "Dealer Price (DP): Wholesale base rate for dealers & retail outlets (vs. retail MRP)"
                  }
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </Label>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {lang === "bn" ? "পাইকারি ডিলার রেট" : "Wholesale Dealer Tier"}
              </span>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.unit_price}
              onChange={(e) => handleDpChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "ডিলার মূল্য (DP) হলো ডিলার ও রিটেইলার আউটলেটের জন্য পাইকারি বিক্রয় রেট, যা অর্ডার সৃষ্টি ও প্রাইস টায়ার হিসেবে ব্যবহৃত হয় (খুচরা বিক্রয় মূল্য নয়)।"
                : "Wholesale base rate (Dealer Price) for authorized outlets, used for order creation and customer tier discounts (distinct from retail MRP)."}
            </p>
          </div>

          {/* Company Purchase Price (Cost) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Company Purchase Price (Cost)</Label>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_cost ?? form.distributor_price ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                updateForm({
                  distributor_price: val,
                  purchase_cost: val,
                  cost_price: val,
                  purchase_price: val,
                });
              }}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Purchase cost at which M/S Swarna Enterprise buys products from supplier</p>
          </div>

          {/* Reorder Level */}
          <div className="space-y-1.5">
            <Label>{t("reorderLevel")}</Label>
            <Input
              type="number"
              min="0"
              value={form.reorder_level ?? 10}
              onChange={(e) => updateForm({ reorder_level: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label>{(t as any)("unit" as string) || "Unit of Measure"}</Label>
            <Input
              value={form.unit ?? "pcs"}
              onChange={(e) => updateForm({ unit: e.target.value })}
              placeholder="e.g. pcs, set, box"
            />
          </div>

          {/* Status (Active / Inactive) */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("status") || "Status"}</Label>
            <Select
              value={form.is_active !== false ? "Active" : "Inactive"}
              onChange={(e) => updateForm({ is_active: e.target.value === "Active" })}
            >
              <option value="Active">{lang === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
              <option value="Inactive">{lang === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
            </Select>
          </div>

          {/* Dynamic 3-Tier Multi-Discount Price Tiers (5-Column Excel-Style Grid) */}
          <div className="sm:col-span-2 space-y-3 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span>{lang === "bn" ? "ডায়নামিক প্রাইস টায়ার (৩-স্তর চেইন ডিসকাউন্ট)" : "Dynamic Price Tiers (3-Tier Chain Discount)"}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 tabular-nums">
                    {configuredTierCount} {lang === "bn" ? "সক্রিয়" : "active"} / {priceTiers.length} {lang === "bn" ? "সারি" : "rows"}
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "bn"
                    ? "এক্সেলের মতো পর্যায়ক্রমিক ৩-স্তর (%) ছাড় দিন। বেস DP রেটের ওপর ভিত্তি করে চূড়ান্ত রেট স্বয়ংক্রিয়ভাবে হিসাব হবে।"
                    : "Enter successive Excel-like percentage discounts across up to 3 tiers. Final Rate auto-calculates live from Base DP."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetBlankTiers}
                  className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                  title={lang === "bn" ? "সব সারি খালি করে ১০টি ফাঁকা সারি রিসেট করুন" : "Reset to 10 blank rows"}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {lang === "bn" ? "ফাঁকা রিসেট" : "Reset Blank"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadDefaultTiers}
                  className="gap-1.5 text-xs h-8 font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  title="Auto-calculate 7 standard dealer tiers based on DP (Selling Base Rate)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "bn" ? "+ ডিফল্ট টায়ার লোড" : "+ Load Default Tiers"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTier}
                  className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 h-8 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {lang === "bn" ? "+ নতুন টায়ার যোগ করুন" : "+ Add New Tier"}
                </Button>
              </div>
            </div>

            {/* Live Formula & Base DP Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/60 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/50 backdrop-blur-md px-3 py-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                <Calculator className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Final Rate = Base DP × (1 − T1%) × (1 − T2%) × (1 − T3%)
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground tabular-nums">
                <span className="text-muted-foreground font-sans font-normal">
                  {lang === "bn" ? "বেস DP:" : "Base DP:"}
                </span>
                <span className={liveBaseDp > 0 ? "text-primary" : "text-amber-600 dark:text-amber-400"}>
                  ৳ {liveBaseDp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {priceTiers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground bg-muted/20 space-y-2.5">
                <p>
                  {lang === "bn"
                    ? "কোনো প্রাইস টায়ার সারি নেই। ফাঁকা সারি যোগ করতে \"+ নতুন টায়ার যোগ করুন\" বাটনে ক্লিক করুন।"
                    : "No price tier rows remaining. Click \"+ Add New Tier\" to add a blank row or \"Reset Blank\" for 10 blank rows."}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTier} className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> {lang === "bn" ? "+ নতুন টায়ার" : "+ Add New Tier"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleResetBlankTiers} className="gap-1.5 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> {lang === "bn" ? "১০টি ফাঁকা সারি" : "10 Blank Rows"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/70 dark:border-white/10 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm overflow-x-auto">
                <div className="min-w-[660px]">
                  {/* 5-Column Sticky Frosted Header */}
                  <div className="grid grid-cols-[minmax(145px,1.55fr)_repeat(3,minmax(92px,1fr))_minmax(148px,1.35fr)_38px] gap-2 items-center px-3 py-2.5 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>{lang === "bn" ? "১. টায়ার নাম" : "1. Tier Name"}</span>
                    <span className="text-right">{lang === "bn" ? "২. ১ম ধাপ (%)" : "2. 1st Tier (%)"}</span>
                    <span className="text-right">{lang === "bn" ? "৩. ২য় ধাপ (%)" : "3. 2nd Tier (%)"}</span>
                    <span className="text-right">{lang === "bn" ? "৪. ৩য় ধাপ (%)" : "4. 3rd Tier (%)"}</span>
                    <span className="text-right">{lang === "bn" ? "৫. চূড়ান্ত রেট" : "5. Final Rate / Price"}</span>
                    <span className="text-center sr-only">Action</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50 max-h-[380px] overflow-y-auto">
                    {priceTiers.map((tier, idx) => {
                      const livePreview = computeRowPreviewPrice(tier, liveBaseDp);
                      const hasValue = livePreview !== "" && Number.isFinite(Number(livePreview));
                      const effectivePctOff =
                        hasValue && liveBaseDp > 0 && Number(livePreview) < liveBaseDp
                          ? r2((1 - Number(livePreview) / liveBaseDp) * 100)
                          : 0;
                      const isRowActive = tier.name.trim().length > 0 || hasTierDiscount(tier);

                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-[minmax(145px,1.55fr)_repeat(3,minmax(92px,1fr))_minmax(148px,1.35fr)_38px] gap-2 items-center px-3 py-2 transition-colors ${
                            isRowActive
                              ? "bg-white/60 dark:bg-slate-800/35"
                              : "bg-transparent hover:bg-white/40 dark:hover:bg-slate-800/20"
                          }`}
                        >
                          {/* Col 1: Tier Name */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 text-[10px] font-mono text-muted-foreground/70 text-right shrink-0 select-none">
                              {idx + 1}.
                            </span>
                            <Input
                              type="text"
                              value={tier.name}
                              onChange={(e) => handleTierChange(idx, "name", e.target.value)}
                              placeholder="e.g. D6, B8"
                              className="h-8 text-xs font-medium bg-white/80 dark:bg-slate-950/50"
                            />
                          </div>

                          {/* Col 2: 1st Tier (%) */}
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={tier.tier1}
                              onChange={(e) => handleTierChange(idx, "tier1", e.target.value)}
                              placeholder="—"
                              className="h-8 pr-6 font-mono text-xs text-right tabular-nums bg-white/80 dark:bg-slate-950/50"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                              %
                            </span>
                          </div>

                          {/* Col 3: 2nd Tier (%) */}
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={tier.tier2}
                              onChange={(e) => handleTierChange(idx, "tier2", e.target.value)}
                              placeholder="—"
                              className="h-8 pr-6 font-mono text-xs text-right tabular-nums bg-white/80 dark:bg-slate-950/50"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                              %
                            </span>
                          </div>

                          {/* Col 4: 3rd Tier (%) */}
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={tier.tier3}
                              onChange={(e) => handleTierChange(idx, "tier3", e.target.value)}
                              placeholder="—"
                              className="h-8 pr-6 font-mono text-xs text-right tabular-nums bg-white/80 dark:bg-slate-950/50"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                              %
                            </span>
                          </div>

                          {/* Col 5: Final Rate / Price (Auto-Calculated Live Preview) */}
                          <div
                            className={`h-8 px-2.5 rounded-md border flex items-center justify-between gap-1.5 font-mono text-xs tabular-nums ${
                              hasValue
                                ? "border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-muted-foreground"
                            }`}
                            title={
                              hasValue
                                ? tier.isLegacyFixed && !hasTierDiscount(tier)
                                  ? "Saved fixed price (enter tier % to switch to 3-tier chain formula)"
                                  : `Auto-calculated: ${liveBaseDp} × (1 - ${parseTierPercent(tier.tier1) ?? 0}%) × (1 - ${parseTierPercent(tier.tier2) ?? 0}%) × (1 - ${parseTierPercent(tier.tier3) ?? 0}%)`
                                : "Enter Base DP and tier discounts to preview final rate"
                            }
                          >
                            {effectivePctOff > 0 ? (
                              <span className="text-[10px] font-normal px-1 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                                -{effectivePctOff}%
                              </span>
                            ) : (
                              <span className="text-[10px] font-normal text-muted-foreground/60 shrink-0">৳</span>
                            )}
                            <span className="truncate ml-auto">
                              {hasValue
                                ? `৳ ${Number(livePreview).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                            </span>
                          </div>

                          {/* Delete Row Action */}
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleRemoveTier(idx, e)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={lang === "bn" ? "সারি মুছে ফেলুন" : "Remove tier row"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export const EditProductModal = ProductEditModal;
export const AddProductModal = ProductEditModal;
export default ProductEditModal;

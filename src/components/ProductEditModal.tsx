import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, Loader2, Trash2, Sparkles, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { r2, getProducts } from "@/utils/localStore";
import { sanitizeFormulaInput, formatTierLabel, productSchema, DEFAULT_TIER_FORMULAS, DEFAULT_TIER_NAMES, calculateDefaultPriceTiers } from "@/utils/productUtils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Product, Category } from "@/lib/supabase";

export interface PriceTierItem {
  name: string;
  price: number | string;
  rate?: number | string;
}

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
  price_tiers?: { name: string; price: number }[];
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

  const [priceTiers, setPriceTiers] = useState<PriceTierItem[]>([]);

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

  useEffect(() => {
    if (!isModalOpen) return;
    if (activeProduct) {
      const catId =
        activeProduct.category_id ||
        (typeof activeProduct.category === "object" ? (activeProduct.category as any)?.id : null) ||
        "";
      const purchaseCost = (activeProduct as any).purchase_cost ?? activeProduct.distributor_price ?? (activeProduct as any).distributorPrice ?? (activeProduct as any).purchase_price ?? (activeProduct as any).purchasePrice ?? 0;

      // Load price_tiers with comprehensive parsing (array, JSON string, or object map)
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
          .map((t: any) => ({
            name: formatTierLabel(String(t.name ?? t.tier_name ?? t.title ?? "").trim()),
            price: t.price != null && t.price !== "" ? t.price : (t.rate != null && t.rate !== "" ? t.rate : ""),
          }))
          .filter((t: any) => t.name.length > 0);
      } else if (rawTiers && typeof rawTiers === "object" && !Array.isArray(rawTiers)) {
        initialTiers = Object.entries(rawTiers).map(([name, price]) => ({
          name: formatTierLabel(String(name).trim()),
          price: (price != null ? price : "") as number | string,
          rate: (price != null ? price : "") as number | string,
        }));
      } else {
        if ((activeProduct as any).d10_price != null && Number((activeProduct as any).d10_price) > 0) {
          initialTiers.push({ name: "D10", price: Number((activeProduct as any).d10_price), rate: Number((activeProduct as any).d10_price) });
        }
        if ((activeProduct as any).b12_price != null && Number((activeProduct as any).b12_price) > 0) {
          initialTiers.push({ name: "B12", price: Number((activeProduct as any).b12_price), rate: Number((activeProduct as any).b12_price) });
        }
        if ((activeProduct as any).d12_price != null && Number((activeProduct as any).d12_price) > 0) {
          initialTiers.push({ name: "D12", price: Number((activeProduct as any).d12_price), rate: Number((activeProduct as any).d12_price) });
        }
        if ((activeProduct as any).b14_price != null && Number((activeProduct as any).b14_price) > 0) {
          initialTiers.push({ name: "B14", price: Number((activeProduct as any).b14_price), rate: Number((activeProduct as any).b14_price) });
        }
      }

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

      // If initialTiers has fewer than 7 tiers and contains only default tier names (e.g. only D10, B12),
      // restore the complete set of all 7 tiers (D6, B8, D8, D10, B12, D12, B14)!
      const isSubsetOfDefaults =
        initialTiers.length > 0 &&
        initialTiers.every((t) => DEFAULT_TIER_NAMES.includes(formatTierLabel(t.name).toUpperCase() as any)) &&
        initialTiers.length < 7;

      if ((initialTiers.length === 0 || isSubsetOfDefaults) && dpValue > 0) {
        const fullDefaultTiers = calculateDefaultPriceTiers(dpValue);
        const existingPrices = new Map(initialTiers.map((t) => [formatTierLabel(t.name).toUpperCase(), t.price]));
        initialTiers = fullDefaultTiers.map((dt) => {
          const existing = existingPrices.get(dt.name);
          return existing !== undefined && existing !== "" && Number(existing) > 0
            ? { name: dt.name, price: Number(existing), rate: Number(existing) }
            : dt;
        });
      }
      setPriceTiers(initialTiers);

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
        price_tiers: initialTiers as any,
      });
    } else {
      setPriceTiers([]);
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
        price_tiers: [],
      });
    }
  }, [isModalOpen, activeProduct]);

  // Watch for DP (Selling Base Rate) changes to automatically recalculate dynamic price tiers in real time
  useEffect(() => {
    if (!isModalOpen) return;
    const rawDp = form.unit_price ?? form.dp_price ?? 0;
    const numDp = Math.max(0, parseFloat(String(rawDp || 0)) || 0);

    setPriceTiers((currentTiers) => {
      if (currentTiers.length === 0) {
        if (numDp > 0) {
          const recalculated = calculateDefaultPriceTiers(numDp);
          setForm((prev) => ({ ...prev, price_tiers: recalculated as any }));
          if (setFormProp) {
            setFormProp((prev: any) => ({ ...prev, price_tiers: recalculated }));
          }
          return recalculated;
        }
        return currentTiers;
      }

      const hasDefaultTiers = currentTiers.some((t) => {
        const clean = formatTierLabel(t.name).toUpperCase();
        return clean in DEFAULT_TIER_FORMULAS;
      });

      if (!hasDefaultTiers) return currentTiers;

      const isOnlyDefaultTiers = currentTiers.every((t) => {
        const clean = formatTierLabel(t.name).toUpperCase();
        return clean in DEFAULT_TIER_FORMULAS;
      });

      let changed = false;
      let recalculated: PriceTierItem[];

      if (isOnlyDefaultTiers && currentTiers.length < 7 && numDp > 0) {
        recalculated = calculateDefaultPriceTiers(numDp);
        changed = true;
      } else {
        recalculated = currentTiers.map((t) => {
          const clean = formatTierLabel(t.name).toUpperCase();
          if (clean in DEFAULT_TIER_FORMULAS) {
            const expected = numDp > 0 ? DEFAULT_TIER_FORMULAS[clean](numDp) : 0;
            if (t.price !== expected || (t as any).rate !== expected) {
              changed = true;
              return { ...t, price: expected, rate: expected };
            }
          }
          return t;
        });
      }

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
    const nextTiers = [...priceTiers, { name: "", price: "" }];
    setPriceTiers(nextTiers);
    setForm((prev) => ({ ...prev, price_tiers: nextTiers as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: nextTiers }));
  };

  const handleLoadDefaultTiers = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const rawDp =
      form.unit_price ??
      form.dp_price ??
      form.selling_price ??
      form.price ??
      (activeProduct as any)?.unit_price ??
      (activeProduct as any)?.dp_price ??
      (formProp as any)?.unit_price ??
      0;
    const dp = Math.max(0, parseFloat(String(rawDp || 0)) || 0);
    if (dp <= 0) {
      toast.error("Please enter a valid DP (Selling Base Rate) first to calculate default tiers.");
      return;
    }
    // Completely reset and replace price_tiers state array with all 7 default tiers regardless of existing tiers
    const all7Tiers: PriceTierItem[] = [
      { name: "D6", price: r2(dp * 0.94), rate: r2(dp * 0.94) },
      { name: "B8", price: r2(dp * (4744.18 / 5150)), rate: r2(dp * (4744.18 / 5150)) },
      { name: "D8", price: r2(dp * 0.92), rate: r2(dp * 0.92) },
      { name: "D10", price: r2(dp * 0.90), rate: r2(dp * 0.90) },
      { name: "B12", price: r2(dp * (4542.3 / 5150)), rate: r2(dp * (4542.3 / 5150)) },
      { name: "D12", price: r2(dp * 0.88), rate: r2(dp * 0.88) },
      { name: "B14", price: r2(dp * (4441.36 / 5150)), rate: r2(dp * (4441.36 / 5150)) },
    ];
    setPriceTiers([...all7Tiers]);
    setForm((prev) => ({ ...prev, price_tiers: [...all7Tiers] as any }));
    if (setFormProp) {
      setFormProp((prev: any) => ({ ...prev, price_tiers: [...all7Tiers] }));
    }
    toast.success(`Loaded all 7 default price tiers based on DP (৳ ${dp})`);
  };

  const handleDpChange = (rawVal: string) => {
    const numericVal = rawVal === "" ? "" : (parseFloat(rawVal) || 0);
    const numDp = typeof numericVal === "number" ? Math.max(0, numericVal) : 0;

    let updatedTiers = priceTiers;
    const hasDefaultTiers = priceTiers.some((t) => {
      const clean = formatTierLabel(t.name).toUpperCase();
      return clean in DEFAULT_TIER_FORMULAS;
    });

    if (hasDefaultTiers || (priceTiers.length === 0 && numDp > 0)) {
      if (priceTiers.length === 0 && numDp > 0) {
        updatedTiers = calculateDefaultPriceTiers(numDp);
      } else {
        const isOnlyDefaultTiers = priceTiers.every((t) => {
          const clean = formatTierLabel(t.name).toUpperCase();
          return clean in DEFAULT_TIER_FORMULAS;
        });

        if (isOnlyDefaultTiers && priceTiers.length < 7 && numDp > 0) {
          updatedTiers = calculateDefaultPriceTiers(numDp);
        } else {
          updatedTiers = priceTiers.map((t) => {
            const clean = formatTierLabel(t.name).toUpperCase();
            if (clean in DEFAULT_TIER_FORMULAS) {
              const newPrice = DEFAULT_TIER_FORMULAS[clean](numDp);
              return {
                ...t,
                price: newPrice,
                rate: newPrice,
              };
            }
            return t;
          });
        }
      }
      setPriceTiers(updatedTiers);
    }

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
    const nextTiers = priceTiers.filter((_, i) => i !== index);
    setPriceTiers(nextTiers);
    setForm((prev) => ({ ...prev, price_tiers: nextTiers as any }));
    if (setFormProp) setFormProp((prev: any) => ({ ...prev, price_tiers: nextTiers }));
  };

  const handleTierChange = (index: number, field: "name" | "price", val: any) => {
    const next = [...priceTiers];
    if (!next[index]) return;
    if (field === "name") {
      next[index] = { ...next[index], name: String(val) };
    } else {
      const numVal = val === "" ? "" : (parseFloat(val) || 0);
      next[index] = { ...next[index], price: numVal, rate: numVal };
    }
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

    // Clean price tiers - ensure array with valid types: { name: string, price: number, rate: number }
    const cleanedTiers = priceTiers
      .filter((t) => t && typeof t.name === "string" && sanitizeFormulaInput(t.name).length > 0)
      .map((t) => {
        const val = Math.max(0, r2(parseFloat(String(t.price != null && t.price !== "" ? t.price : (t as any).rate)) || 0));
        return {
          name: formatTierLabel(sanitizeFormulaInput(t.name)),
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

    onSave({
      ...form,
      name: sanitizedName,
      sku_code: sanitizedSku,
      brand: sanitizedBrand || null,
      id: activeProduct?.id || form.id,
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

  return (
    <Dialog
      open={isModalOpen}
      onClose={onClose}
      title={activeProduct ? t("edit") : t("addProduct")}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* SKU Code */}
          <div className="space-y-1.5">
            <Label>{t("skuCode")}</Label>
            <Input
              value={form.sku_code}
              onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
              placeholder="e.g. HK-001"
              required
            />
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <Label>{t("productName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product display name"
              required
            />
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <Label>{t("brand")}</Label>
            <Input
              value={form.brand ?? ""}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
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
                onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
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
                setForm({
                  ...form,
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
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label>{(t as any)("unit" as string) || "Unit of Measure"}</Label>
            <Input
              value={form.unit ?? "pcs"}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. pcs, set, box"
            />
          </div>

          {/* Dynamic 2-Box Key-Value Price Tiers */}
          <div className="sm:col-span-2 space-y-3 pt-3 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  Dynamic Price Tiers
                  <span className="text-xs font-normal text-muted-foreground">({priceTiers.length})</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Unlimited custom price tiers for this product. Populates dynamically in the Order Creation Modal.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLoadDefaultTiers(e);
                  }}
                  className="gap-1.5 text-xs h-8 font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  title="Auto-calculate 7 standard tiers based on DP (Selling Base Rate)"
                >
                  <Sparkles className="h-3.5 w-3.5" /> + Load Default Tiers (D6, B8, D8, D10, B12, D12, B14)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddTier(e);
                  }}
                  className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 h-8 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" /> + Add New Tier
                </Button>
              </div>
            </div>

            {priceTiers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground bg-muted/20 space-y-2.5">
                <p>
                  No custom price tiers defined. Click &quot;+ Load Default Tiers&quot; to auto-calculate the 7 standard dealer tiers (D6, B8, D8, D10, B12, D12, B14) from DP Rate, or click &quot;+ Add New Tier&quot; to configure custom selling rates.
                </p>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLoadDefaultTiers(e);
                    }}
                    className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> + Load Default Tiers (D6, B8, D8, D10, B12, D12, B14)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                  <span className="col-span-6 sm:col-span-7">Tier Name (Box 1)</span>
                  <span className="col-span-5 sm:col-span-4 text-right">Price / Rate (Box 2)</span>
                  <span className="col-span-1 text-center">Action</span>
                </div>
                {priceTiers.map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    {/* Box 1 (Text): Tier Name */}
                    <div className="col-span-6 sm:col-span-7">
                      <Input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleTierChange(idx, "name", e.target.value)}
                        placeholder="e.g. D10, B12, Wholesale"
                        className="h-9 text-xs"
                      />
                    </div>
                    {/* Box 2 (Number): Price / Rate */}
                    <div className="col-span-5 sm:col-span-4">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.price}
                        onChange={(e) => handleTierChange(idx, "price", e.target.value)}
                        placeholder="4500"
                        className="h-9 font-mono text-xs text-right"
                      />
                    </div>
                    {/* Trash/Delete button */}
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTier(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete tier pair"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Loader2, DollarSign, Info, Sparkles, Mic, HelpCircle } from "lucide-react";
import { formatBDT, cn } from "@/lib/utils";
import { useRouter } from "@/router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { SearchableSelect, type SearchableOption } from "@/components/SearchableSelect";
import { SmartOrderAIModal } from "@/components/SmartOrderAIModal";
import { useUsers } from "@/context/UsersContext";
import { toast } from "sonner";
import {
  supabase,
  type Customer,
  type Product,
  type Order,
  type Collection,
} from "@/lib/supabase";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  saveOrders,
  saveCollections,
  getOrders,
  getCustomers,
  getProducts,
  getCollections,
  recalculateCustomerLedger,
  r2,
  dispatchGlobalStateUpdate,
  deduplicateCollections,
  getCustomerLedgerDetails,
  adjustProductStock,
  generateOrderNumber,
  generateCollectionNumber,
  getDeletedIds,
} from "@/utils/localStore";
import { normalizePaymentMethod } from "@/utils/cloudSync";
import { sanitizeFormulaInput, formatTierLabel, calculateDefaultPriceTiers, DEFAULT_TIER_NAMES } from "@/utils/productUtils";

export interface OrderItemRow {
  product_id: string;
  quantity: number | string;
  price_tier: string;
  unit_price: number | string;
  discount: number | string;
  subtotal: number;
}

/**
 * Resolves the Company Purchase Price (Cost) at which M/S Swarna Enterprise buys products from supplier.
 * Purchase cost = product.distributor_price.
 */
export function getProductDistributorPrice(product?: Product | null): number {
  if (!product) return 0;
  return Number(product.distributor_price ?? product.purchase_price ?? 0);
}

/**
 * Resolves the DP (Selling Base Rate) for a product.
 * Base selling price used for order creation and customer tier discounts = product.unit_price.
 */
export function getProductUnitPrice(product?: Product | null): number {
  if (!product) return 0;
  return Number(product.unit_price ?? 0);
}

/**
 * Safely parses and resolves the dynamic price tiers for a product.
 * Returns array of { name: string, price: number }.
 */
export function getProductPriceTiers(product?: any | null): { name: string; price: number }[] {
  if (!product) return [];
  let tiers = product?.price_tiers;
  if (typeof tiers === "string") {
    try {
      tiers = JSON.parse(tiers);
    } catch {
      tiers = [];
    }
  }
  if (Array.isArray(tiers) && tiers.length > 0) {
    let resolved = tiers
      .filter((t: any) => t && (t?.name != null || t?.tier_name != null))
      .map((t: any) => ({
        name: formatTierLabel(String(t?.name ?? t?.tier_name ?? "")).trim(),
        price: Number(t?.price != null && t?.price !== "" ? t.price : t?.rate) || 0,
      }))
      .filter((t: any) => t.name.length > 0);

    const dpVal = Number(product?.unit_price ?? product?.dp_price ?? product?.selling_price ?? product?.dealer_price ?? 0);
    if (resolved.length < 7 && dpVal > 0) {
      const defaults = calculateDefaultPriceTiers(dpVal);
      const existingMap = new Map(resolved.map((t) => [t.name.toUpperCase(), t.price]));
      resolved = defaults.map((d) => {
        const val = existingMap.get(d.name.toUpperCase());
        return val !== undefined && Number(val) > 0 ? { name: d.name, price: Number(val) } : { name: d.name, price: d.price };
      });
    }
    return resolved;
  }
  if (tiers && typeof tiers === "object" && !Array.isArray(tiers)) {
    return Object.entries(tiers).map(([name, price]) => ({
      name: formatTierLabel(String(name)).trim(),
      price: Number(price) || 0,
    }));
  }
  const dpRate = Number(product?.unit_price ?? product?.dp_price ?? product?.selling_price ?? product?.dealer_price ?? 0);
  if (dpRate > 0) {
    return calculateDefaultPriceTiers(dpRate).map(t => ({ name: t.name, price: t.price }));
  }
  // Fallback to legacy fields if present on product
  const legacy: { name: string; price: number }[] = [];
  if (product?.d10_price && Number(product.d10_price) > 0) legacy.push({ name: "D10", price: Number(product.d10_price) });
  if (product?.b12_price && Number(product.b12_price) > 0) legacy.push({ name: "B12", price: Number(product.b12_price) });
  if (product?.d12_price && Number(product.d12_price) > 0) legacy.push({ name: "D12", price: Number(product.d12_price) });
  if (product?.b14_price && Number(product.b14_price) > 0) legacy.push({ name: "B14", price: Number(product.b14_price) });
  return legacy;
}

/**
 * Dynamic Customer Tier Rule:
 * Returns the default price tier based on the selected customer type:
 * - Dealer: "D10" (10% discount on top of DP)
 * - Wholesale: "D12" (12% discount on top of DP)
 * - Retailer / other: "DP" (Base DP Rate)
 */
export function getTierForCustomerType(customerType?: string | null): string {
  if (!customerType) return "DP";
  const norm = customerType.toLowerCase().trim();
  if (norm.includes("dealer")) return "D10";
  if (norm.includes("wholesale")) return "D12";
  return "DP";
}

/**
 * Tier Calculation Rule:
 * Dynamic calculation applied directly on top of product.unit_price (DP / Base Rate):
 * - DP: Base selling price (100% of unit_price)
 * - D6: 6% discount (`unit_price * 0.94`)
 * - B8: 6% + 2% cash bonus (`unit_price * 0.94 * 0.98`)
 * - D8: 8% discount (`unit_price * 0.92`)
 * - D10: 10% discount (`unit_price * 0.90`)
 * - B12: 10% + 2% cash bonus (`unit_price * 0.90 * 0.98`)
 * - D12: 12% discount (`unit_price * 0.88`)
 * - B14: 12% + 2% cash bonus (`unit_price * 0.88 * 0.98`)
 */
export function priceForTier(baseDistributorPrice: number, tier: string): number {
  const dp = Math.max(0, Number(baseDistributorPrice) || 0);
  const cleanTier = formatTierLabel(tier).toUpperCase();
  switch (cleanTier) {
    case "D6":
      return r2(dp * 0.94);
    case "B8":
      return r2(dp * 0.94 * 0.98);
    case "D8":
      return r2(dp * 0.92);
    case "D10":
      return r2(dp * 0.9);
    case "B12":
      return r2(dp * 0.9 * 0.98);
    case "D12":
      return r2(dp * 0.88);
    case "B14":
      return r2(dp * 0.88 * 0.98);
    case "DP":
    default:
      return r2(dp);
  }
}

/**
 * Calculates item price given product, price tier, and optional customer type.
 * Default base calculation price is product.unit_price (DP).
 */
export function calculateItemPrice(
  product: Product | null | undefined,
  tier?: string,
  customerType?: string
): number {
  if (!product) return 0;
  const baseDP = getProductUnitPrice(product);
  const activeTier = tier && tier !== "Custom" ? tier : getTierForCustomerType(customerType);
  return priceForTier(baseDP, activeTier);
}


export function OrderCreate() {
  const { navigate } = useRouter();
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();
  const { getUserName } = useUsers();

  const isAdmin = useMemo(() => {
    const role = (
      profile?.role_name ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      ""
    ).toLowerCase().trim();
    return role.includes("admin");
  }, [profile, user]);

  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [saving, setSaving] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<"Draft" | "Pending" | "Approved" | "Delivered">("Pending");
  const [notes, setNotes] = useState("");
  const [orderDiscount, setOrderDiscount] = useState<number | string>(0);
  const [paymentStatusType, setPaymentStatusType] = useState<"Full Due" | "Full Paid" | "Partial Payment">("Full Due");
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [items, setItems] = useState<OrderItemRow[]>([
    {
      product_id: "",
      quantity: 1,
      price_tier: "DP",
      unit_price: 0,
      discount: 0,
      subtotal: 0,
    },
  ]);

  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const refreshLocal = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setCustomers(getCustomers());
        setProducts(getProducts());
      }, 100);
    };

    // Live Supabase fetch
    async function fetchLive() {
      try {
        const [cRes, pRes] = await Promise.all([
          supabase.from("customers").select("*").eq("is_active", true).order("name"),
          supabase.from("products").select("*").eq("is_active", true).order("name"),
        ]);
        if (!isMounted) return;
        if (!cRes.error && Array.isArray(cRes.data) && cRes.data.length > 0) {
          setCustomers(cRes.data as Customer[]);
        }
        if (!pRes.error && Array.isArray(pRes.data) && pRes.data.length > 0) {
          setProducts(pRes.data as Product[]);
        }
      } catch (err) {
        console.warn("OrderCreate live fetch notice:", err);
      }
    }
    fetchLive();

    let orderCreateChannel: any = null;
    try {
      if (supabase?.channel) {
        orderCreateChannel = supabase
          .channel("order-create-realtime")
          .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
            if (isMounted) fetchLive();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
            if (isMounted) fetchLive();
          })
          .subscribe();
      }
    } catch (e) {
      console.warn("OrderCreate realtime setup notice:", e);
    }

    window.addEventListener("sales_erp_storage_update", refreshLocal);
    window.addEventListener("storage", refreshLocal);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      try {
        if (orderCreateChannel && supabase?.removeChannel) {
          supabase.removeChannel(orderCreateChannel);
        }
      } catch (e) {}
      window.removeEventListener("sales_erp_storage_update", refreshLocal);
      window.removeEventListener("storage", refreshLocal);
    };
  }, []);

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach((p) => {
      if (p && p.id) map.set(p.id, p);
    });
    return map;
  }, [products]);

  const selectedCustomer = useMemo(() => {
    return (customers || []).find((c) => c?.id === customerId);
  }, [customers, customerId]);

  // Fetch customer's current ledger details to detect advance deposits
  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return null;
    return getCustomerLedgerDetails(selectedCustomer, undefined, undefined, { persist: false });
  }, [selectedCustomer]);

  const availableAdvance = useMemo(() => {
    if (!customerLedger) return 0;
    return customerLedger.closingBalance < 0 ? Math.abs(customerLedger.closingBalance) : 0;
  }, [customerLedger]);

  const [useAdvance, setUseAdvance] = useState(true);

  // Automatically enable useAdvance when customer changes and has advance balance
  useEffect(() => {
    if (availableAdvance > 0) {
      setUseAdvance((prev) => (prev ? prev : true));
    }
  }, [customerId, availableAdvance]);

  const customerDefaultTier = useMemo(() => {
    return getTierForCustomerType(selectedCustomer?.customer_type);
  }, [selectedCustomer]);

  // Searchable Customer options (inactive customers filtered out)
  const customerOptions: SearchableOption[] = useMemo(() => {
    return (customers || [])
      .filter((c) => {
        if (!c || !c.id) return false;
        // Exclude customers explicitly marked Inactive
        if (c.status === "Inactive") return false;
        if (c.is_active === false) return false;
        // Keep active or legacy records where status is undefined/null and is_active is not false
        if (c.status && c.status !== "Active") return false;
        return true;
      })
      .sort((a, b) => (a?.outlet_name || a?.name || "").localeCompare(b?.outlet_name || b?.name || ""))
      .map((c) => {
        const baseName = (c?.outlet_name || c?.name || "Customer").trim();
        const areaText = (c?.area || c?.city || (c?.territory as any)?.name || "").trim();
        const partyCode = (c?.party_code || (c as any)?.partyCode || "").trim();
        const phone = (c?.phone || "").trim();
        const details = [partyCode, areaText || phone].filter(Boolean).join(" - ");
        const label = details ? `${baseName} (${details})` : baseName;
        const sublabelParts = [partyCode, areaText, phone].filter(Boolean);
        return {
          value: c.id,
          label,
          sublabel: sublabelParts.length > 0 ? sublabelParts.join(" · ") : undefined,
          badge: c?.customer_type,
          keywords: [partyCode, phone, partyCode.replace(/[-_\s]/g, "")].filter(Boolean) as string[],
        };
      });
  }, [customers]);

  // Searchable Product options - exclude deleted, inactive, or formula products
  const productOptions: SearchableOption[] = useMemo(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    return (products || [])
      .filter((p) => p && p.id && p.is_active !== false && !deletedIds.has(p.id) && p.name !== "[Deleted Product]" && !String(p.name || "").startsWith("="))
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""))
      .map((p) => {
        const catName = p?.category?.name || "";
        const cleanName = sanitizeFormulaInput(p?.name || "");
        const cleanSku = sanitizeFormulaInput(p?.sku_code || "");
        return {
          value: p.id,
          label: catName ? `[${catName}] ${cleanName}` : cleanName,
          sublabel: `${cleanSku} · Stock: ${p?.stock_quantity ?? 0}`,
        };
      });
  }, [products]);

  // When customer changes, update non-customized item price tiers according to customer type
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const targetCust = (customers || []).find((c) => c?.id === newCustId);
    const defaultTier = getTierForCustomerType(targetCust?.customer_type);

    setItems((prev) =>
      (prev || []).map((it) => {
        if (!it?.product_id) {
          return {
            ...it,
            price_tier: defaultTier,
            unit_price: 0,
            discount: 0,
            subtotal: 0,
          };
        }
        if (it.price_tier === "Custom") return it;
        const prod = productsMap.get(it.product_id) || (products || []).find((p) => p?.id === it.product_id);
        if (!prod) {
          return {
            ...it,
            price_tier: defaultTier,
            unit_price: 0,
            discount: 0,
            subtotal: 0,
          };
        }

        const baseDP = getProductUnitPrice(prod);
        const dynamicTiers = getProductPriceTiers(prod) || [];

        let newUnitPrice = 0;
        let appliedTier = defaultTier;

        if (dynamicTiers.length > 0) {
          const matched = dynamicTiers.find(
            (dt: any) =>
              formatTierLabel(dt?.name).toLowerCase() === defaultTier.toLowerCase() ||
              dt?.name?.toLowerCase().trim() === defaultTier.toLowerCase().trim() ||
              dt?.name?.toLowerCase().includes(defaultTier.toLowerCase())
          );
          if (matched) {
            appliedTier = formatTierLabel(matched.name);
            newUnitPrice = Number(matched.price) || 0;
          } else {
            appliedTier = formatTierLabel(dynamicTiers[0]?.name);
            newUnitPrice = Number(dynamicTiers[0]?.price) || 0;
          }
        } else {
          newUnitPrice = priceForTier(baseDP, defaultTier);
        }

        const qty = Number(it.quantity) || 1;
        const disc = Number(it.discount) || 0;
        return {
          ...it,
          price_tier: appliedTier,
          unit_price: newUnitPrice,
          subtotal: Math.max(0, r2((newUnitPrice - disc) * qty)),
        };
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        price_tier: formatTierLabel(customerDefaultTier) || "DP",
        unit_price: 0,
        discount: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleApplyAiItems = (parsedItems: Array<{ productId: string; qty: number; tier?: string }>) => {
    if (!parsedItems || parsedItems.length === 0) return;

    setItems((prev) => {
      // If previous items only contained a single empty row, replace it; otherwise append
      const existingValid = (prev || []).filter((it) => it?.product_id && it.product_id.trim() !== "");
      const newRows: OrderItemRow[] = parsedItems.map((item) => {
        const prod = productsMap.get(item.productId) || (products || []).find((p) => String(p?.id) === String(item.productId));
        const baseDP = prod ? getProductUnitPrice(prod) : 0;
        const dynamicTiers = prod ? getProductPriceTiers(prod) : [];
        const appliedTier = item.tier || formatTierLabel(customerDefaultTier) || "DP";

        let unitPrice = baseDP;
        if (dynamicTiers.length > 0) {
          const matched = dynamicTiers.find(
            (dt: any) => formatTierLabel(dt?.name).toUpperCase() === appliedTier.toUpperCase()
          );
          if (matched) {
            unitPrice = Number(matched.price) || baseDP;
          } else {
            unitPrice = priceForTier(baseDP, appliedTier);
          }
        } else {
          unitPrice = priceForTier(baseDP, appliedTier);
        }

        const qty = Math.max(1, Number(item.qty) || 1);
        return {
          product_id: item.productId,
          quantity: qty,
          price_tier: appliedTier,
          unit_price: unitPrice,
          discount: 0,
          subtotal: Math.max(0, r2(unitPrice * qty)),
        };
      });

      return [...existingValid, ...newRows];
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItemRow, value: any) => {
    setItems((prev) => {
      const next = [...(prev || [])];
      if (!next[index]) return prev;
      const current = { ...next[index] };

      if (field === "product_id") {
        current.product_id = value;
        const prod = productsMap.get(value) || (products || []).find((p) => p?.id === value);
        if (prod) {
          const baseDP = getProductUnitPrice(prod);
          const dynamicTiers = getProductPriceTiers(prod) || [];

          if (dynamicTiers.length > 0) {
            const targetTierName = formatTierLabel(current.price_tier || customerDefaultTier);
            const matchedTier = dynamicTiers.find(
              (dt: any) =>
                formatTierLabel(dt?.name).toLowerCase() === targetTierName.toLowerCase() ||
                dt?.name?.toLowerCase().trim() === targetTierName.toLowerCase().trim() ||
                dt?.name?.toLowerCase().includes(targetTierName.toLowerCase())
            );

            if (matchedTier) {
              current.price_tier = formatTierLabel(matchedTier.name);
              current.unit_price = Number(matchedTier.price) || 0;
            } else if (current.price_tier === "Custom" && current.unit_price) {
              // keep custom override
            } else if (targetTierName === "DP") {
              current.price_tier = "DP";
              current.unit_price = baseDP;
            } else {
              current.price_tier = formatTierLabel(dynamicTiers[0]?.name);
              current.unit_price = Number(dynamicTiers[0]?.price) || 0;
            }
          } else {
            const tierToApply =
              current.price_tier && current.price_tier !== "Custom"
                ? formatTierLabel(current.price_tier)
                : "DP";
            current.price_tier = tierToApply;
            current.unit_price = tierToApply === "DP" ? baseDP : priceForTier(baseDP, tierToApply);
          }
        } else {
          current.unit_price = 0;
          current.discount = 0;
          current.subtotal = 0;
        }
      } else if (field === "price_tier") {
        const cleanVal = formatTierLabel(value) || value;
        current.price_tier = cleanVal;
        if (!current.product_id) {
          current.unit_price = 0;
          current.subtotal = 0;
        } else {
          const prod = productsMap.get(current.product_id) || (products || []).find((p) => p?.id === current.product_id);
          if (prod) {
            const dynamicTiers = getProductPriceTiers(prod) || [];
            const matchedCustom = dynamicTiers.find(
              (dt: any) =>
                formatTierLabel(dt?.name).toLowerCase() === cleanVal.toLowerCase() ||
                dt?.name === value
            );

            if (matchedCustom) {
              current.price_tier = formatTierLabel(matchedCustom.name);
              current.unit_price = Number(matchedCustom.price) || 0;
            } else if (cleanVal === "DP" || value === "DP") {
              current.price_tier = "DP";
              current.unit_price = getProductUnitPrice(prod);
            } else if (cleanVal !== "Custom" && value !== "Custom") {
              const baseDP = getProductUnitPrice(prod);
              current.unit_price = priceForTier(baseDP, cleanVal);
            }
          }
        }
      } else if (field === "unit_price") {
        current.unit_price = value === "" ? "" : Math.max(0, r2(Number(value) || 0));
        current.price_tier = "Custom";
      } else if (field === "quantity") {
        current.quantity = value === "" ? "" : Math.max(1, Math.round(Number(value) || 1));
      } else if (field === "discount") {
        current.discount = value === "" ? "" : Math.max(0, r2(Number(value) || 0));
      }

      // Dynamically calculate line item subtotal: (Unit Price - Discount) * Quantity
      if (!current.product_id) {
        current.unit_price = 0;
        current.subtotal = 0;
      } else {
        const qty = Number(current.quantity) || 0;
        const uPrice = Number(current.unit_price) || 0;
        const lineDisc = Number(current.discount) || 0;
        current.subtotal = Math.max(0, r2((uPrice - lineDisc) * qty));
      }

      next[index] = current;
      return next;
    });
  };

  // Calculations (BUG-012: Explicit numeric coercions to prevent NaN / string concatenations)
  const subtotal = useMemo(() => {
    return r2(items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0));
  }, [items]);

  const total = useMemo(() => {
    const disc = Math.max(0, Number(orderDiscount) || 0);
    return Math.max(0, r2((Number(subtotal) || 0) - disc));
  }, [subtotal, orderDiscount]);

  // Advance balance applied to reduce due
  const appliedAdvance = useMemo(() => {
    if (!useAdvance || (Number(availableAdvance) || 0) <= 0) return 0;
    const tot = Number(total) || 0;
    const adv = Number(availableAdvance) || 0;
    return r2(Math.min(tot, adv));
  }, [useAdvance, availableAdvance, total]);

  const remainingAfterAdvance = useMemo(() => {
    const tot = Number(total) || 0;
    const appAdv = Number(appliedAdvance) || 0;
    return Math.max(0, r2(tot - appAdv));
  }, [total, appliedAdvance]);

  const { calculatedPaid, calculatedDue, additionalCashPaid } = useMemo(() => {
    const tot = Number(total) || 0;
    const remAdv = Number(remainingAfterAdvance) || 0;
    const appAdv = Number(appliedAdvance) || 0;

    if (tot <= 0) {
      return { calculatedPaid: 0, calculatedDue: 0, additionalCashPaid: 0 };
    }

    if (paymentStatusType === "Full Paid") {
      const addPaid = remAdv;
      return {
        calculatedPaid: tot,
        calculatedDue: 0,
        additionalCashPaid: addPaid,
      };
    }

    if (paymentStatusType === "Full Due") {
      return {
        calculatedPaid: appAdv,
        calculatedDue: remAdv,
        additionalCashPaid: 0,
      };
    }

    // Partial Payment: user specifies additional cash paid on top of advance
    const numPaid = Math.max(0, Number(paidAmount) || 0);
    const cappedAdditional = Math.min(remAdv, numPaid);
    const totalPaid = r2(appAdv + cappedAdditional);
    const due = Math.max(0, r2(remAdv - cappedAdditional));
    return {
      calculatedPaid: totalPaid,
      calculatedDue: due,
      additionalCashPaid: cappedAdditional,
    };
  }, [paymentStatusType, paidAmount, total, appliedAdvance, remainingAfterAdvance]);

  async function handleSaveOrder() {
    if (saving) return;
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const validItems = items.filter(
      (it) => it.product_id && !deletedIds.has(it.product_id) && products.some((p) => p.id === it.product_id)
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product");
      return;
    }

    // Backend/submission handler re-validates stock before inserting non-Draft orders
    if (status !== "Draft") {
      const freshProducts = getProducts();
      const productQuantities = new Map<string, number>();
      for (const it of validItems) {
        const currentSum = productQuantities.get(it.product_id) || 0;
        productQuantities.set(it.product_id, currentSum + (Number(it.quantity) || 0));
      }

      for (const it of validItems) {
        const prod = freshProducts.find((p) => p.id === it.product_id) || products.find((p) => p.id === it.product_id);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const requestedQty = Number(it.quantity) || 0;

        if (baseStock <= 0 || requestedQty > baseStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }

      for (const [prodId, totalRequested] of productQuantities.entries()) {
        const prod = freshProducts.find((p) => p.id === prodId) || products.find((p) => p.id === prodId);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));

        if (baseStock <= 0 || totalRequested > baseStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const orderNumber = generateOrderNumber();
      const orderId = crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const sanitizedItems = validItems.map((it, idx) => {
        const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
        const uPrice = Math.max(0, r2(Number(it.unit_price) || 0));
        const disc = Math.max(0, r2(Number(it.discount) || 0));
        const prod = products.find((p) => p.id === it.product_id);
        return {
          id: `item-${orderId}-${idx}`,
          order_id: orderId,
          product_id: it.product_id,
          quantity: qty,
          unit_price: uPrice,
          discount: disc,
          subtotal: Math.max(0, r2((uPrice - disc) * qty)),
          price_tier: it.price_tier || "DP",
          created_at: nowIso,
          product: prod,
        };
      });

      const finalDbPaymentStatus: "Paid" | "Partial" | "Unpaid" =
        paymentStatusType === "Full Paid" || (calculatedDue <= 0 && total > 0)
          ? "Paid"
          : calculatedPaid > 0
          ? "Partial"
          : "Unpaid";

      const currentUserId = profile?.id || user?.id || null;
      const currentUserName = getUserName(profile?.id || user?.id, "Sales Officer");

      // CRIT-003: Prevent draft order advance collection asymmetry
      const isDraftWithPayment = status === "Draft" && Number(additionalCashPaid) > 0;
      const finalOrderStatus = isDraftWithPayment ? "Pending" : status;
      if (isDraftWithPayment) {
        toast.info("Advance cash received: Order promoted from Draft to Pending to maintain symmetric ledger balance.");
      }

      const newOrderRecord: Order & { items?: any[] } = {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        sales_rep_id: currentUserId,
        sales_rep_name: currentUserName,
        created_by_name: currentUserName,
        sales_rep: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
        order_date: orderDate ? new Date(orderDate).toISOString() : nowIso,
        delivery_date: deliveryDate ? deliveryDate : null,
        status: finalOrderStatus as any,
        subtotal: r2(Number(subtotal) || 0),
        discount: r2(Number(orderDiscount) || 0),
        total_amount: r2(Number(total) || 0),
        due_amount: r2(Number(calculatedDue) || 0),
        dueAmount: r2(Number(calculatedDue) || 0),
        paid_amount: r2(Number(calculatedPaid) || 0),
        paidAmount: r2(Number(calculatedPaid) || 0),
        payment_status: finalDbPaymentStatus,
        paymentStatus: paymentStatusType,
        payment_method: paymentMethod,
        notes: sanitizeFormulaInput(notes) || null,
        created_at: nowIso,
        updated_at: nowIso,
        customer: selectedCustomer,
        order_items: sanitizedItems,
        items: Array.from(sanitizedItems),
        advance_applied: r2(Number(appliedAdvance) || 0),
        additional_paid: r2(Number(additionalCashPaid) || 0),
      };

      // 1. Save to local storage
      const existingOrders = getOrders();
      const updatedOrders = [newOrderRecord, ...existingOrders];
      saveOrders(updatedOrders);

      // 2. Insert collection ONLY if additional cash was received (avoid double-counting advance balance already in collections)
      let nextCollections = getCollections();
      const colId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `col-${Date.now()}`;
      const colNumber = generateCollectionNumber(nextCollections);
      const colCreatedIso = new Date(Date.now() + 1000).toISOString();

      if (additionalCashPaid > 0) {
        const details = customerId ? getCustomerLedgerDetails(customerId, updatedOrders, undefined, { persist: false }) : null;
        const prevDueCalc = details ? details.currentDue : Number(selectedCustomer?.current_due ?? 0);
        const remDueCalc = Math.max(0, r2(prevDueCalc - additionalCashPaid));
        const newCollection: Collection = {
          id: colId,
          collection_number: colNumber,
          customer_id: customerId,
          order_id: orderId,
          amount: additionalCashPaid,
          payment_method: paymentMethod as any,
          collection_date: newOrderRecord.order_date || nowIso,
          collected_by: currentUserId,
          collector_name: currentUserName,
          collected_by_name: currentUserName,
          collector: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
          previous_due: prevDueCalc,
          remaining_due: remDueCalc,
          previousDue: prevDueCalc,
          remainingDue: remDueCalc,
          notes: `Payment for order ${orderNumber} (${paymentStatusType})`,
          created_at: colCreatedIso,
          customer: selectedCustomer ? { ...selectedCustomer } : undefined,
        };
        nextCollections = deduplicateCollections([newCollection, ...nextCollections]);
        saveCollections(nextCollections);
      }

      // 3. Recalculate customer ledger WITH updated collections
      recalculateCustomerLedger(customerId, updatedOrders, nextCollections, { persist: true });

      // 4. Deduct product stock & log Stock Out transactions if order status is "Delivered"
      if (status === "Delivered") {
        const existingTx = getLocalData<any>(STORAGE_KEYS.TRANSACTIONS, []);
        const newTransactions: any[] = [];

        sanitizedItems.forEach((it, idx) => {
          const qty = Number(it.quantity) || 0;
          if (qty <= 0) return;

          // Single source of truth for stock reduction (updates local products, warehouse inventory, and Supabase)
          adjustProductStock(it.product_id, -qty, "Main Warehouse");

          const prod = products.find((p) => p.id === it.product_id);
          newTransactions.push({
            id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `tx-${Date.now()}-${idx}`,
            product_id: it.product_id,
            transaction_type: "Stock Out",
            quantity: qty,
            from_warehouse: "Main Warehouse",
            to_warehouse: `Customer: ${selectedCustomer?.name || "Customer"}`,
            reference: orderNumber,
            notes: `Order ${orderNumber} marked as Delivered`,
            performed_by: user?.id ?? profile?.id ?? null,
            transaction_date: nowIso,
            created_at: nowIso,
            product: prod,
          });
        });

        if (newTransactions.length > 0) {
          setLocalData(STORAGE_KEYS.TRANSACTIONS, [...newTransactions, ...existingTx]);

          try {
            const dbTxPayload = newTransactions.map((tx) => ({
              product_id: tx.product_id,
              transaction_type: tx.transaction_type,
              quantity: tx.quantity,
              from_warehouse: tx.from_warehouse,
              to_warehouse: tx.to_warehouse,
              reference: tx.reference,
              notes: tx.notes,
              performed_by: tx.performed_by,
              transaction_date: tx.transaction_date,
            }));
            supabase
              .from("stock_transactions")
              .insert(dbTxPayload)
              .then(undefined, (err) => console.warn("Supabase stock_transactions insert notice:", err));
          } catch (txErr) {
            console.warn("Notice: stock_transactions saved locally, Supabase notice:", txErr);
          }
        }
      }

      // 5. Direct Supabase Central Database Insert: Order FIRST, then Collection & Order Items SECOND
      try {
        const { error: ordErr } = await supabase.from("orders").insert({
          id: orderId,
          order_number: orderNumber,
          customer_id: customerId,
          sales_rep_id: currentUserId,
          order_date: newOrderRecord.order_date,
          delivery_date: newOrderRecord.delivery_date,
          status: finalOrderStatus,
          subtotal: subtotal,
          discount: newOrderRecord.discount,
          total_amount: total,
          due_amount: calculatedDue,
          paid_amount: calculatedPaid,
          payment_status: finalDbPaymentStatus,
          notes: newOrderRecord.notes,
          created_at: nowIso,
        });

        if (ordErr) {
          toast.error(`Server order creation failed: ${ordErr.message}`);
          return;
        }

        if (additionalCashPaid > 0) {
          const { error: colErr } = await supabase.from("collections").insert({
            id: colId,
            collection_number: colNumber,
            customer_id: customerId,
            order_id: orderId,
            amount: additionalCashPaid,
            payment_method: normalizePaymentMethod(paymentMethod),
            collection_date: newOrderRecord.order_date || nowIso,
            collected_by: currentUserId,
            notes: `Payment for order ${orderNumber} (${paymentStatusType})`,
            created_at: colCreatedIso,
          });
          if (colErr) {
            console.warn("Supabase collection insert notice:", colErr.message);
          }
        }

        const { error: itemsErr } = await supabase.from("order_items").insert(
          sanitizedItems.map((it) => ({
            order_id: orderId,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount: it.discount,
            subtotal: it.subtotal,
          })),
        );
        if (itemsErr) {
          console.warn("Supabase order_items insert notice:", itemsErr.message);
        }

        // Sync updated customer due in Supabase so all devices stay identical immediately
        const latestCustDetails = getCustomerLedgerDetails(customerId);
        const nextDue = r2(latestCustDetails.currentDue);
        const nextDueStatus = nextDue <= 0 ? "Clear" : "Partial";
        supabase
          .from("customers")
          .update({ current_due: nextDue, due_status: nextDueStatus })
          .eq("id", customerId)
          .then(undefined, () => {});
      } catch (err: any) {
        toast.error(`Order submission error: ${err?.message || err}`);
        return;
      }

      dispatchGlobalStateUpdate({ customerId, type: "order_created" });
      window.dispatchEvent(new Event("sales_erp_storage_update"));
      window.dispatchEvent(new Event("storage"));
      toast.success(`Order ${orderNumber} created successfully!`);
      navigate("/orders");
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Order</h1>
            <p className="text-sm text-muted-foreground">
              Base price from product Distributor Price with customer-type tiered discounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/orders")} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveOrder} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Create Order
          </Button>
        </div>
      </div>

      {/* Main Order Details Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">1. Customer & Schedule</CardTitle>
          <CardDescription>
            Select a customer to automatically apply their pricing tier (Dealer: D10, Wholesale: D12, Retailer: DP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Customer Select */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Customer / Party</Label>
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onChange={handleCustomerChange}
                placeholder="Search by customer name, area, phone..."
                searchPlaceholder="Search customer..."
              />
            </div>

            {/* Order Date */}
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            {/* Delivery Date */}
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Delivered">Delivered</option>
              </Select>
            </div>

            {/* Available Advance Deposit Alert / Badge */}
            {selectedCustomer && availableAdvance > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                    ৳
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        Available Advance Deposit: {formatBDT(availableAdvance)}
                      </span>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0 px-1.5 h-4">
                        Credit Balance
                      </Badge>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {useAdvance && appliedAdvance > 0
                        ? `${formatBDT(appliedAdvance)} automatically applied to reduce order due amount`
                        : "Can be applied to reduce this order's due amount"}
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-emerald-800 dark:text-emerald-300 select-none bg-white/70 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-300/60">
                  <input
                    type="checkbox"
                    checked={useAdvance}
                    onChange={(e) => setUseAdvance(e.target.checked)}
                    className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>Apply Advance</span>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">2. Order Items</CardTitle>
              <CardDescription>
                Selling price defaults to DP (product.unit_price) with customer tier discounts applied.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiModalOpen(true)}
              className="h-8 gap-2 text-xs font-semibold border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 shadow-sm shrink-0 self-start sm:self-auto transition-all"
            >
              <div className="flex items-center gap-1 text-primary">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <Mic className="h-3.5 w-3.5 text-primary" />
              </div>
              <span>Smart AI Order Entry</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Product</TableHead>
                  <TableHead className="w-24 text-center">Qty</TableHead>
                  <TableHead className="w-36">
                    <div className="flex items-center gap-1">
                      <span>{t("priceTier") || "Price Tier"}</span>
                      <span
                        className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
                        title={
                          lang === "bn"
                            ? "প্রাইস টিয়ার: DP হলো পাইকারি ডিলার মূল্য; Custom দিয়ে নির্দিষ্ট দর নির্ধারণ করা যায়।"
                            : "Price Tier: DP (Dealer Price) is wholesale tier rate; Custom allows manual price entry."
                        }
                      >
                        <HelpCircle className="h-3 w-3" />
                      </span>
                    </div>
                  </TableHead>
                  <TableHead className="w-32 text-right">Selling Price</TableHead>
                  <TableHead className="w-24 text-right">Discount</TableHead>
                  <TableHead className="w-28 text-right">Subtotal</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No items added. Click "+ Add Item" below to select products.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => {
                    const isDraft = status === "Draft";
                    const prod = productsMap.get(it.product_id) || (products || []).find((p) => p?.id === it.product_id);
                    const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
                    const otherRowsQty = (items || []).reduce(
                      (sum, other, otherIdx) =>
                        otherIdx !== idx && other?.product_id === it.product_id
                          ? sum + (Number(other?.quantity) || 0)
                          : sum,
                      0
                    );
                    const remainingForThisRow = Math.max(0, baseStock - otherRowsQty);
                    const requestedQty = Number(it?.quantity) || 0;
                    const isRowOverStock = Boolean(
                      prod && (requestedQty > remainingForThisRow || baseStock <= 0)
                    );

                    return (
                      <TableRow key={idx}>
                        {/* Product Search */}
                        <TableCell className="p-2">
                          <SearchableSelect
                            options={productOptions}
                            value={it.product_id}
                            onChange={(val) => updateItem(idx, "product_id", val)}
                            placeholder="Select product..."
                            searchPlaceholder="Search product by name or category..."
                          />
                          {prod && (
                            <div className="mt-1 px-1 flex items-center justify-between text-[11px] font-mono">
                              <span
                                className={cn(
                                  "transition-colors",
                                  isRowOverStock
                                    ? isDraft
                                      ? "text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"
                                      : "text-destructive font-semibold flex items-center gap-1"
                                    : "text-muted-foreground"
                                )}
                              >
                                {isRowOverStock && (
                                  <span
                                    className={cn(
                                      "inline-block w-1.5 h-1.5 rounded-full",
                                      isDraft ? "bg-amber-500" : "bg-destructive animate-pulse"
                                    )}
                                  />
                                )}
                                Stock: {baseStock}
                              </span>
                              {isRowOverStock && (
                                <span
                                  className={cn(
                                    "text-[10px] font-medium",
                                    isDraft ? "text-amber-600 dark:text-amber-400" : "text-destructive font-semibold"
                                  )}
                                >
                                  {isDraft
                                    ? "Replenish before approval"
                                    : baseStock <= 0
                                    ? "Out of stock"
                                    : "Limit exceeded"}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min="1"
                            max={!isDraft && prod ? Math.max(0, remainingForThisRow) : undefined}
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className={cn(
                              "h-9 text-center font-mono",
                              isRowOverStock && (
                                isDraft
                                  ? "border-amber-400 text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-950/20 focus-visible:ring-amber-400 font-medium"
                                  : "border-destructive text-destructive bg-destructive/10 focus-visible:ring-destructive font-semibold"
                              )
                            )}
                            aria-invalid={!isDraft && isRowOverStock}
                            title={
                              isRowOverStock
                                ? isDraft
                                  ? "Low stock - replenish before approval"
                                  : baseStock <= 0
                                  ? "Out of stock"
                                  : `Max available: ${remainingForThisRow}`
                                : undefined
                            }
                          />
                          {isRowOverStock && (
                            <div
                              className={cn(
                                "text-[10px] font-medium mt-1 text-center whitespace-nowrap animate-in fade-in duration-200",
                                isDraft ? "text-amber-600 dark:text-amber-400" : "text-destructive font-semibold"
                              )}
                            >
                              {isDraft
                                ? "Low stock - replenish before approval"
                                : baseStock <= 0
                                ? "Out of stock"
                                : `Max: ${remainingForThisRow}`}
                            </div>
                          )}
                        </TableCell>

                        {/* Price Tier Selector */}
                        <TableCell className="p-2">
                          {(() => {
                            const dynamicTiers = getProductPriceTiers(prod) || [];

                            return (
                              <Select
                                value={formatTierLabel(it.price_tier) || "DP"}
                                onChange={(e) => updateItem(idx, "price_tier", e.target.value)}
                                className="h-9 text-xs"
                              >
                                <option value="DP">
                                  {lang === "bn" ? "ডিলার মূল্য (DP)" : "DP (Dealer Price)"}
                                </option>
                                {dynamicTiers.map((dt: any, dtIdx: number) => {
                                  const cleanName = formatTierLabel(dt?.name);
                                  return (
                                    <option key={dtIdx} value={cleanName || dt?.name}>
                                      {cleanName || dt?.name}
                                    </option>
                                  );
                                })}
                                <option value="Custom">Custom</option>
                              </Select>
                            );
                          })()}
                        </TableCell>

                        {/* Selling Price */}
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unit_price}
                            onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                            className="h-9 font-mono text-right"
                          />
                        </TableCell>

                        {/* Discount */}
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.discount}
                            onChange={(e) => updateItem(idx, "discount", e.target.value)}
                            className="h-9 font-mono text-right"
                            placeholder="0"
                          />
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell className="p-2 text-right font-mono font-medium">
                          {formatBDT(it.subtotal || 0)}
                        </TableCell>

                        {/* Remove Button */}
                        <TableCell className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="p-2 border-t bg-muted/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="w-full gap-1.5 text-xs border-dashed text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Summary & Payment Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Notes & Instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Notes & Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add order instructions, transport or delivery notes..."
              rows={4}
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">HAMKO Pricing Schema Summary</p>
                <p className="mt-0.5">
                  - <strong>Unit Price</strong>: Supplier purchase cost from HAMKO.
                </p>
                <p>
                  - <strong>Distributor Price</strong>: Base selling price used for order creation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Financials & Payment */}
        <Card className="bg-muted/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold font-mono">{formatBDT(subtotal)}</span>
            </div>

            {/* Special Order Discount */}
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Order Discount</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={orderDiscount === 0 ? "" : orderDiscount}
                placeholder="0.00"
                onChange={(e) =>
                  setOrderDiscount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))
                }
                className="h-8 w-32 text-right font-mono text-sm"
              />
            </div>

            {/* Total Invoiced Amount */}
            {/* Total Invoiced Amount */}
            <div className="flex justify-between font-bold border-t pt-2 text-base">
              <span>Total Payable</span>
              <span className="text-primary font-mono">{formatBDT(total)}</span>
            </div>

            {/* Advance Deposit Applied Row */}
            {appliedAdvance > 0 && (
              <div className="flex justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-md">
                <span className="flex items-center gap-1">
                  <span>🛡️ Advance Deposit Applied</span>
                </span>
                <span className="font-mono">-{formatBDT(appliedAdvance)}</span>
              </div>
            )}

            {/* Net Due Amount */}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed">
              <span className="text-foreground">Net Due Amount</span>
              <span className={calculatedDue > 0 ? "text-amber-600 font-mono text-base font-bold" : "text-emerald-600 font-mono text-base font-bold"}>
                {formatBDT(calculatedDue)}
              </span>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">Payment Status</Label>
                <Select
                  value={paymentStatusType}
                  onChange={(e) => {
                    const val = e.target.value as "Full Due" | "Full Paid" | "Partial Payment";
                    setPaymentStatusType(val);
                    if (val === "Full Paid") setPaidAmount(remainingAfterAdvance);
                    else if (val === "Full Due") setPaidAmount(0);
                    else if (val === "Partial Payment") setPaidAmount(Number(paidAmount) > 0 ? paidAmount : 0);
                  }}
                  className="h-8 w-40 text-xs"
                >
                  <option value="Full Due">Full Due</option>
                  <option value="Full Paid">Full Paid</option>
                  <option value="Partial Payment">Partial Payment</option>
                </Select>
              </div>

              {paymentStatusType === "Partial Payment" && (
                <div className="space-y-2 pt-1 border-t border-dashed">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {appliedAdvance > 0 ? "Additional Cash (৳)" : "Paid Amount (৳)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={remainingAfterAdvance}
                      value={paidAmount === 0 ? "" : paidAmount}
                      placeholder="0.00"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaidAmount(val === "" ? "" : Math.max(0, Number(val) || 0));
                      }}
                      className="h-8 w-32 text-right font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Remaining Due</span>
                    <span className="font-semibold text-amber-600 font-mono text-sm">
                      {formatBDT(calculatedDue)}
                    </span>
                  </div>
                </div>
              )}

              {paymentStatusType === "Full Paid" && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                  <span>Paid: {formatBDT(calculatedPaid)}</span>
                  <span>Due: {formatBDT(0)}</span>
                </div>
              )}

              {paymentStatusType === "Full Due" && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Paid: {formatBDT(calculatedPaid)}</span>
                  <span>Due: {formatBDT(calculatedDue)}</span>
                </div>
              )}

              {(paymentStatusType === "Partial Payment" || paymentStatusType === "Full Paid") && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-8 w-36 text-xs"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                  </Select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/orders")} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={saving}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart AI Voice/Text Order Entry Modal */}
      <SmartOrderAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        products={products}
        onAddItems={handleApplyAiItems}
      />
    </div>
  );
}

export default OrderCreate;

import { useState, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, X, Loader2, HelpCircle } from "lucide-react";
import { formatBDT, cn } from "@/lib/utils";
import { r2, getProducts, getCustomerLedgerDetails, STORAGE_KEYS, getDeletedIds } from "@/utils/localStore";
import { sanitizeFormulaInput, formatTierLabel } from "@/utils/productUtils";
import { useI18n } from "@/lib/i18n";
import { SearchableSelect, type SearchableOption } from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getProductUnitPrice,
  getProductPriceTiers,
  getTierForCustomerType,
  priceForTier,
} from "@/pages/OrderCreate";
import type { Order, Customer, Product } from "@/lib/supabase";

export interface OrderItemForm {
  id?: string;
  category?: string;
  product_id: string;
  quantity: number | string;
  price_tier?: string;
  unit_price: number | string;
  discount: number | string;
  subtotal: number;
}

export interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  order?: Order | null;
  customers: Customer[];
  products: Product[];
  onSave: (orderData: {
    customer_id: string;
    status: string;
    order_date?: string | null;
    delivery_date?: string | null;
    notes: string;
    discount: number;
    subtotal: number;
    total: number;
    payment_status?: "Unpaid" | "Partial" | "Paid" | string;
    paymentStatus?: string;
    paid_amount?: number;
    paidAmount?: number;
    due_amount?: number;
    dueAmount?: number;
    payment_method?: string;
    items: OrderItemForm[];
    advance_applied?: number;
    additional_paid?: number;
  }) => Promise<void> | void;
  saving?: boolean;
}

const orderStatuses = ["Draft", "Pending", "Approved", "Delivered", "Cancelled"] as const;

/** Returns the category_id (UUID) for a product — the authoritative key for filtering. */
export function getProductCategoryId(p?: Product | null): string {
  if (!p) return "";
  if (p.category_id && typeof p.category_id === "string") return p.category_id;
  if (p.category && typeof p.category === "object" && (p.category as any).id) return (p.category as any).id;
  return "";
}

/** Resolves a readable category name from a product (for display only). */
export function getProductCategoryName(p?: Product | null): string {
  if (!p) return "";
  if (p.category && typeof p.category === "object" && p.category.name) return p.category.name.trim();
  return "";
}


export function NewOrderModal({
  open,
  onClose,
  order,
  customers,
  products,
  onSave,
  saving = false,
}: NewOrderModalProps) {
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();
  const isEditing = Boolean(order && order.id);

  const isAdmin = useMemo(() => {
    const role = (
      profile?.role_name ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      ""
    ).toLowerCase().trim();
    return role.includes("admin");
  }, [profile, user]);

  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("Draft");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDiscount, setOrderDiscount] = useState<number | string>(0);
  const [items, setItems] = useState<OrderItemForm[]>([]);

  // Payment Breakdown State
  const [paymentStatusType, setPaymentStatusType] = useState<"Full Due" | "Full Paid" | "Partial Payment">("Full Due");
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");

  // Local copy of products — refreshed reactively via storage events
  const [localProducts, setLocalProducts] = useState<Product[]>(() => getProducts());

  // Subscribe to storage change events so dropdowns update in real-time (only active when modal is open)
  useEffect(() => {
    if (!open) return;
    let timeoutId: any;
    const refresh = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setLocalProducts(getProducts());
      }, 100);
    };
    window.addEventListener("sales_erp_storage_update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("sales_erp_storage_update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [open]);

  // Source of all available products — exclude deleted, inactive, or formula products
  const allProducts = useMemo(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const source = products && products.length > 0 ? products : localProducts;
    return (source || []).filter(
      (p) =>
        p &&
        p.id &&
        !deletedIds.has(p.id) &&
        p.is_active !== false &&
        p.name !== "[Deleted Product]" &&
        !String(p.name || "").startsWith("=")
    );
  }, [products, localProducts]);

  const allProductsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (allProducts || []).forEach((p) => {
      if (p && p.id) map.set(p.id, p);
    });
    return map;
  }, [allProducts]);

  // Flat product options with [Category] Name format — searchable by both category and product name
  const productOptions: SearchableOption[] = useMemo(() => {
    const getCatName = (p: Product): string => {
      if (p?.category && typeof p.category === "object") return (p.category as any)?.name || "";
      if (typeof (p as any)?.category === "string") return (p as any)?.category || "";
      return "";
    };
    return [...allProducts]
      .sort((a, b) => {
        const catA = getCatName(a);
        const catB = getCatName(b);
        const catCmp = catA.localeCompare(catB);
        return catCmp !== 0 ? catCmp : (a?.name || "").localeCompare(b?.name || "");
      })
      .map((p) => {
        const catName = getCatName(p);
        const cleanName = sanitizeFormulaInput(p?.name || "");
        const cleanSku = sanitizeFormulaInput(p?.sku_code || "");
        return {
          value: p.id,
          label: catName ? `[${catName}] ${cleanName}` : cleanName,
          sublabel: `${cleanSku} · Stock: ${p?.stock_quantity ?? 0}`,
        };
      });
  }, [allProducts]);

  // Sync state when modal opens or target order changes
  useEffect(() => {
    if (!open) {
      setItems([]);
      return;
    }

    if (order) {
      setCustomerId(order.customer_id || "");
      setStatus(order.status || "Pending");
      setOrderDate(order.order_date ? order.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDeliveryDate(order.delivery_date ? order.delivery_date.slice(0, 10) : "");
      setNotes(order.notes || "");
      setOrderDiscount(Number(order.discount) || 0);

      const currentPaid = Number(order.paid_amount ?? (order as any).paidAmount ?? 0);
      const currentTotal = Number(order.total_amount ?? (order as any).total ?? 0);

      if (currentPaid >= currentTotal && currentTotal > 0) {
        setPaymentStatusType("Full Paid");
        setPaidAmount(currentTotal);
      } else if (currentPaid > 0) {
        setPaymentStatusType("Partial Payment");
        setPaidAmount(currentPaid);
      } else {
        setPaymentStatusType("Full Due");
        setPaidAmount(0);
      }
      setPaymentMethod((order as any).payment_method || "Cash");

      // Explicitly load editing order items directly without appending to previous modal state
      const sourceItems: any[] = (order as any).items ? [...(order as any).items] : order.order_items ? [...order.order_items] : [];
      if (sourceItems.length > 0) {
        // De-duplicate items if any duplicates exist (e.g. same product ID, price, tier)
        const seen = new Set<string>();
        const cleanItems = sourceItems.filter((it: any) => {
          const key = it.product_id
            ? `${it.product_id}-${it.unit_price}-${it.price_tier || "Custom"}`
            : it.id
            ? String(it.id)
            : `${it.quantity}-${it.unit_price}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setItems(
          cleanItems.map((it: any) => {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const uPrice = Math.max(0, r2(Number(it.unit_price) || 0));
            const disc = Math.max(0, r2(Number(it.discount) || 0));
            return {
              id: it.id,
              product_id: it.product_id,
              quantity: qty,
              price_tier: it.price_tier || "Custom",
              unit_price: uPrice,
              discount: disc,
              subtotal: Math.max(0, r2(qty * uPrice - disc)),
            };
          })
        );
      } else {
        setItems([]);
      }
    } else {
      // Reset for new order
      setCustomerId("");
      setStatus("Draft");
      setOrderDate(new Date().toISOString().slice(0, 10));
      setDeliveryDate("");
      setNotes("");
      setOrderDiscount(0);
      setPaymentStatusType("Full Due");
      setPaidAmount(0);
      setPaymentMethod("Cash");
      setItems([
        {
          product_id: "",
          quantity: 1,
          unit_price: 0,
          discount: 0,
          price_tier: "DP",
          subtotal: 0,
        },
      ]);
    }
  }, [open, order?.id]);

  // Options for Searchable Customer Select (inactive customers filtered out)
  const customerOptions: SearchableOption[] = useMemo(() => {
    return (customers || [])
      .filter((c) => {
        if (!c || !c.id) return false;
        if (c.id === customerId) return true; // keep existing selected customer for edit
        if (c.status === "Inactive") return false;
        if (c.is_active === false) return false;
        if (c.status && c.status !== "Active") return false;
        return true;
      })
      .sort((a, b) => (a?.outlet_name || a?.name || "").localeCompare(b?.outlet_name || b?.name || ""))
      .map((c) => {
        const baseName = (c?.outlet_name || c?.name || "Customer").trim();
        const areaText = (c?.area || c?.city || (c?.territory as any)?.name || "").trim();
        const partyCode = (c?.party_code || (c as any)?.partyCode || (c as any)?.code || "").trim();
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
  }, [customers, customerId]);

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

  // When customer changes, apply their dynamic price tier across line items
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
        const prod = allProductsMap.get(it.product_id) || (allProducts || []).find((p) => p?.id === it.product_id);
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

  // Add Item - defaults to selected customer's dynamic price tier
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        price_tier: formatTierLabel(customerDefaultTier) || "DP",
        subtotal: 0,
      },
    ]);
  }

  // Remove Item - fully active across ALL order statuses
  function removeItem(index: number) {
    setItems((prev) => (prev || []).filter((_, i) => i !== index));
  }

  // Update line item with real-time recalculations and category filtering
  function updateItem(index: number, field: keyof OrderItemForm, value: any) {
    setItems((prev) => {
      const next = [...(prev || [])];
      if (!next[index]) return prev;
      const current = { ...next[index] };

      if (field === "product_id") {
        current.product_id = value;
        const selectedProd = allProductsMap.get(value) || (allProducts || []).find((p) => p?.id === value);
        if (selectedProd) {
          const baseDP = getProductUnitPrice(selectedProd);
          const dynamicTiers = getProductPriceTiers(selectedProd) || [];

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
          const selectedProd = allProductsMap.get(current.product_id) || (allProducts || []).find((p) => p?.id === current.product_id);
          if (selectedProd) {
            const dynamicTiers = getProductPriceTiers(selectedProd) || [];
            const matchedCustom = dynamicTiers.find(
              (dt: any) =>
                formatTierLabel(dt?.name).toLowerCase() === cleanVal.toLowerCase() ||
                dt?.name === value
            );

            if (matchedCustom) {
              // Selecting a Tier Name automatically updates the Unit Price field
              current.price_tier = formatTierLabel(matchedCustom.name);
              current.unit_price = Number(matchedCustom.price) || 0;
            } else if (cleanVal === "DP" || value === "DP") {
              current.price_tier = "DP";
              current.unit_price = getProductUnitPrice(selectedProd);
            } else if (cleanVal !== "Custom" && value !== "Custom") {
              const baseDP = getProductUnitPrice(selectedProd);
              current.unit_price = priceForTier(baseDP, cleanVal);
            }
          }
        }
      } else if (field === "unit_price") {
        // Direct manual override of unit price
        current.unit_price = value === "" ? ("" as any) : Math.max(0, r2(Number(value) || 0));
        current.price_tier = "Custom";
      } else if (field === "quantity") {
        current.quantity = value === "" ? ("" as any) : Math.max(1, Math.round(Number(value) || 1));
      } else if (field === "discount") {
        current.discount = value === "" ? ("" as any) : Math.max(0, r2(Number(value) || 0));
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
  }

  // Real-time calculations (BUG-012: Explicit numeric coercions to prevent NaN / string concatenations)
  const subtotal = useMemo(() => {
    return r2(items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0));
  }, [items]);

  const total = useMemo(() => {
    const disc = Math.max(0, Number(orderDiscount) || 0);
    return Math.max(0, r2((Number(subtotal) || 0) - disc));
  }, [subtotal, orderDiscount]);

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

  function handleFormSubmit() {
    if (!customerId) {
      toast.error(t("selectCustomer") || "Please select a customer");
      return;
    }

    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const validItems = items.filter(
      (it) => it.product_id && !deletedIds.has(it.product_id) && allProducts.some((p) => p.id === it.product_id)
    );
    if (validItems.length === 0) {
      toast.error(t("addItem") || "Please select valid products for all items");
      return;
    }

    // Real-time stock validation check (Strict validation for non-Draft statuses: Pending, Approved, Delivered)
    if (status !== "Draft") {
      const productQuantities = new Map<string, number>();
      for (const it of validItems) {
        const currentSum = productQuantities.get(it.product_id) || 0;
        productQuantities.set(it.product_id, currentSum + (Number(it.quantity) || 0));
      }

      // Check individual items against product stock
      for (const it of validItems) {
        const prod = allProducts.find((p) => p.id === it.product_id);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const origQty = order && order.status === "Delivered"
          ? Number(order.order_items?.find((o: any) => o.product_id === it.product_id)?.quantity || 0)
          : 0;
        const availableStock = baseStock + origQty;
        const requestedQty = Number(it.quantity) || 0;

        if (availableStock <= 0 || requestedQty > availableStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }

      // Check accumulated product quantities across lines
      for (const [prodId, totalRequested] of productQuantities.entries()) {
        const prod = allProducts.find((p) => p.id === prodId);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const origQty = order && order.status === "Delivered"
          ? Number(order.order_items?.find((o: any) => o.product_id === prodId)?.quantity || 0)
          : 0;
        const availableStock = baseStock + origQty;

        if (availableStock <= 0 || totalRequested > availableStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }
    }

    const sanitizedItems = validItems
      .map((it) => {
        const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
        const uPrice = Math.max(0, r2(Number(it.unit_price) || 0));
        const disc = Math.max(0, r2(Number(it.discount) || 0));
        return {
          ...it,
          quantity: qty,
          unit_price: uPrice,
          discount: disc,
          subtotal: Math.max(0, r2((uPrice - disc) * qty)),
        };
      });

    const finalPaid = r2(Number(calculatedPaid) || 0);
    const finalDue = r2(Number(calculatedDue) || 0);
    const finalTotal = r2(Number(total) || 0);
    const finalDbPaymentStatus: "Paid" | "Partial" | "Unpaid" =
      paymentStatusType === "Full Paid" || (finalDue <= 0 && finalTotal > 0)
        ? "Paid"
        : finalPaid > 0
        ? "Partial"
        : "Unpaid";

    // CRIT-003: Prevent draft order advance collection asymmetry
    const isDraftWithPayment = status === "Draft" && Number(additionalCashPaid) > 0;
    const finalOrderStatus = isDraftWithPayment ? "Pending" : status;

    onSave({
      customer_id: customerId,
      status: finalOrderStatus,
      order_date: orderDate?.trim() ? new Date(orderDate.trim()).toISOString() : new Date().toISOString(),
      delivery_date: deliveryDate?.trim() ? deliveryDate.trim() : null,
      notes: sanitizeFormulaInput(notes),
      discount: r2(Number(orderDiscount) || 0),
      subtotal: r2(Number(subtotal) || 0),
      total: finalTotal,
      payment_status: finalDbPaymentStatus,
      paymentStatus: paymentStatusType,
      paid_amount: finalPaid,
      paidAmount: finalPaid,
      due_amount: finalDue,
      dueAmount: finalDue,
      payment_method: paymentMethod,
      items: sanitizedItems,
      advance_applied: r2(Number(appliedAdvance) || 0),
      additional_paid: r2(Number(additionalCashPaid) || 0),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit Order (${order?.order_number})` : t("addOrder")}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Order Details Header */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label>{t("selectCustomer")}</Label>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onChange={handleCustomerChange}
              placeholder="Select outlet or customer..."
              searchPlaceholder="Filter by name, party code, area..."
            />
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
          <div className="space-y-1.5">
            <Label>{t("status")}</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {orderStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(s.toLowerCase())}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Order Date</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deliveryDate" as string) || "Delivery Date"}</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">{t("orderItems")}</Label>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          </div>

          <div className="rounded-lg border overflow-visible">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-[240px]">{t("product")}</TableHead>
                  <TableHead className="w-16 text-center">{t("quantity")}</TableHead>
                  <TableHead className="w-32">
                    <div className="flex items-center gap-1">
                      <span>{t("priceTier")}</span>
                      <span
                        className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
                        title={
                          lang === "bn"
                            ? "প্রাইস টিয়ার: DP হলো পাইকারি ডিলার মূল্য"
                            : "Price Tier: DP represents Dealer Price (wholesale outlet rate)"
                        }
                      >
                        <HelpCircle className="h-3 w-3" />
                      </span>
                    </div>
                  </TableHead>
                  <TableHead className="w-24 text-right">{t("unitPrice")}</TableHead>
                  <TableHead className="w-20 text-right">{t("discount")}</TableHead>
                  <TableHead className="w-24 text-right">{t("subtotal")}</TableHead>
                  <TableHead className="w-10 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No items in this order. Click "+ Add Item" below to add products.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => {
                    const isDraft = status === "Draft";
                    const selectedProd = allProductsMap.get(it.product_id) || (allProducts || []).find((p) => p?.id === it.product_id);
                    const baseStock = Math.max(0, Number(selectedProd?.stock_quantity ?? (selectedProd as any)?.stock ?? 0));
                    const origQty = order && order.status === "Delivered"
                      ? Number(order.order_items?.find((o: any) => o.product_id === it.product_id)?.quantity || 0)
                      : 0;
                    const availableStock = baseStock + origQty;
                    const otherRowsQty = (items || []).reduce(
                      (sum, other, otherIdx) =>
                        otherIdx !== idx && other?.product_id === it.product_id
                          ? sum + (Number(other?.quantity) || 0)
                          : sum,
                      0
                    );
                    const remainingForThisRow = Math.max(0, availableStock - otherRowsQty);
                    const requestedQty = Number(it?.quantity) || 0;
                    const isRowOverStock = Boolean(
                      selectedProd && (requestedQty > remainingForThisRow || availableStock <= 0)
                    );

                    return (
                      <TableRow key={idx}>
                        {/* Searchable Product Select — [Category] Product Name format */}
                        <TableCell className="p-2">
                          <SearchableSelect
                            options={productOptions}
                            value={it.product_id}
                            onChange={(val) => updateItem(idx, "product_id", val)}
                            placeholder="Search by category or product name..."
                            searchPlaceholder="Type category or product name..."
                          />
                          {selectedProd && (
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
                                Stock: {availableStock}
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
                                    : availableStock <= 0
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
                            max={!isDraft && selectedProd ? Math.max(0, remainingForThisRow) : undefined}
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
                                  : availableStock <= 0
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
                                : availableStock <= 0
                                ? "Out of stock"
                                : `Max: ${remainingForThisRow}`}
                            </div>
                          )}
                        </TableCell>

                        {/* Price Tier Selection */}
                        <TableCell className="p-2">
                          {(() => {
                            const dynamicTiers = getProductPriceTiers(selectedProd) || [];

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

                        {/* Unit Price - Directly editable per line item */}
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unit_price}
                            onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                            className="h-9 font-mono text-right"
                            title="Click to override unit price"
                          />
                        </TableCell>

                        {/* Discount per line item */}
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.discount}
                            onChange={(e) => updateItem(idx, "discount", e.target.value)}
                            className="h-9 text-right"
                          />
                        </TableCell>

                        {/* Line Subtotal */}
                        <TableCell className="p-2 text-right font-medium">
                          {formatBDT(it.subtotal || 0)}
                        </TableCell>

                        {/* Delete item button - Always active across all statuses */}
                        <TableCell className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Remove line item"
                          >
                            <X className="h-4 w-4" />
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
                <span>{t("addItem")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Notes & Summary Totals */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order remarks, special delivery instructions..."
              rows={3}
            />
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="font-semibold">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">{t("discount")}</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={orderDiscount === 0 ? "" : orderDiscount}
                placeholder="0.00"
                onChange={(e) =>
                  setOrderDiscount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))
                }
                className="h-8 w-28 text-right font-mono"
              />
            </div>
            <div className="flex justify-between font-bold border-t pt-2 text-base">
              <span>{t("total")}</span>
              <span className="text-primary">{formatBDT(total)}</span>
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

            {/* Payment Breakdown Section */}
            <div className="border-t pt-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">Payment Status</Label>
                <Select
                  value={paymentStatusType}
                  onChange={(e) => {
                    const val = e.target.value as "Full Due" | "Full Paid" | "Partial Payment";
                    setPaymentStatusType(val);
                    if (val === "Full Paid") {
                      setPaidAmount(remainingAfterAdvance);
                    } else if (val === "Full Due") {
                      setPaidAmount(0);
                    } else if (val === "Partial Payment") {
                      setPaidAmount(Number(paidAmount) > 0 ? paidAmount : 0);
                    }
                  }}
                  className="h-8 w-36 text-xs"
                >
                  <option value="Full Due">Full Due</option>
                  <option value="Full Paid">Full Paid</option>
                  <option value="Partial Payment">Partial Payment</option>
                </Select>
              </div>

              {/* Partial Payment: Additional Cash Paid input & auto-calculated Due Amount */}
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
                    <span className="text-muted-foreground">Remaining Due (৳)</span>
                    <span className="font-semibold text-amber-600 font-mono text-sm">
                      {formatBDT(calculatedDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* Full Paid Breakdown indicator */}
              {paymentStatusType === "Full Paid" && (
                <div className="flex items-center justify-between text-xs pt-1 text-emerald-600 font-medium">
                  <span>Paid: {formatBDT(calculatedPaid)}</span>
                  <span>Due: {formatBDT(0)}</span>
                </div>
              )}

              {/* Full Due Breakdown indicator */}
              {paymentStatusType === "Full Due" && (
                <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                  <span>Paid: {formatBDT(calculatedPaid)}</span>
                  <span>Due: {formatBDT(calculatedDue)}</span>
                </div>
              )}

              {/* Payment Method selector when payment > 0 */}
              {(paymentStatusType === "Partial Payment" || paymentStatusType === "Full Paid") && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
                  <Label className="text-xs text-muted-foreground">{t("paymentMethod" as string) || "Payment Method"}</Label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-8 w-32 text-xs"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button onClick={handleFormSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
          {isEditing ? t("updated") || "Update Order" : t("save")}
        </Button>
      </div>
    </Dialog>
  );
}
export { NewOrderModal as AddOrderModal };
export default NewOrderModal;

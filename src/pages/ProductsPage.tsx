import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, toBnDigit } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import { Plus, Search, Pencil, Trash2, Download, Package, Loader2, ExternalLink, HelpCircle, Info, X } from "lucide-react";
import { useRouter } from "@/router";
import { toast } from "sonner";
import { useAutoSync } from "@/hooks/useAutoSync";

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getDeletedIds,
  saveDeletedId,
  r2,
  getOrders,
  isPendingOfflineRecord,
} from "@/utils/localStore";
import {
  sanitizeFormulaInput,
  formatTierLabel,
  productSchema,
  filterProductPayloadForSupabase,
  DEFAULT_TIER_NAMES,
  calculateDefaultPriceTiers,
} from "@/utils/productUtils";

export interface Category {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  sku_code?: string;
  category?: string | Category | any;
  price_tiers?: Record<string, number> | Array<{ name: string; price: number }> | string;
  [key: string]: any;
}

import { EditProductModal } from "@/components/EditProductModal";
import type { ProductFormData } from "@/components/ProductEditModal";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t, lang } = useI18n();
  const { query, navigate } = useRouter();

  console.log("Logged in user:", user);

  // Role-based access control (RBAC): inspect exact user role structure
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

  const isAdmin =
    userRole.includes("admin") ||
    String(profile?.role_name || "").toLowerCase().includes("admin") ||
    String((user as any)?.user_metadata?.role || "").toLowerCase().includes("admin") ||
    (Boolean(user?.email?.toLowerCase().includes("admin")) && !userRole.includes("officer"));

  const canManageProducts = !isSalesOfficer;
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const stored = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    return (Array.isArray(stored) ? stored : [])
      .filter((p: Product) => !deletedIds.has(p.id))
      .sort((a: Product, b: Product) => (a.name || "").localeCompare(b.name || ""));
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = getLocalData<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    return Array.isArray(stored) ? stored : [];
  });
  const [search, setSearch] = useState(() => query.search || "");
  const [catFilter, setCatFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ sku: '', name: '', brand: '', category_id: '', base_price: 0, purchase_cost: 0, reorder_level: 10, unit: 'pcs' });

  // Category management sub-modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    const handleStorage = () => {
      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
      const storedProds = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const refreshed = (Array.isArray(storedProds) ? storedProds : []).filter((p: Product) => !deletedIds.has(p.id));
      setProducts([...refreshed].sort((a: Product, b: Product) => (a.name || "").localeCompare(b.name || "")));
      const refreshedCats = getLocalData<Category[]>(STORAGE_KEYS.CATEGORIES, []);
      if (Array.isArray(refreshedCats) && refreshedCats.length > 0) setCategories(refreshedCats);
    };

    const prodChannel = supabase
      .channel("products-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => loadData())
      .subscribe();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleStorage);
    return () => {
      mountedRef.current = false;
      supabase.removeChannel(prodChannel);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleStorage);
    };
  }, []);

  // Anti-stale data: auto re-fetch on window focus, visibility change, and mobile app resume
  useAutoSync(() => {
    loadData(false);
  });

  useEffect(() => {
    if (query.search && query.search !== search) {
      setSearch(query.search);
    }
  }, [query.search]);

  async function loadData(isManual = false) {
    if (isManual) setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from("products").select("*, category:categories(*)").order("name", { ascending: true }),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (!mountedRef.current) return;

      let cats: Category[] = categories;
      if (cRes.data && Array.isArray(cRes.data)) {
        cats = cRes.data as Category[];
        if (mountedRef.current) setCategories(cRes.data as Category[]);
        setLocalData(STORAGE_KEYS.CATEGORIES, cRes.data, null, true);
      }
      const catMap = new Map<string, Category>(cats.map((c: Category) => [c.id, c]));

      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);

      if (!pRes.error && Array.isArray(pRes.data)) {
        const validRemote = (pRes.data as Product[]).filter((p: Product) => !deletedIds.has(p.id));
        const remoteIdSet = new Set<string>(validRemote.map((p: Product) => String(p.id)));

        // Merge any locally created pending products not yet present in Supabase
        const storedLocal = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        const currentLocal = (Array.isArray(storedLocal) ? storedLocal : []).filter((p: Product) => !deletedIds.has(p.id));
        const pendingLocal = currentLocal.filter(
          (lp: Product) => !remoteIdSet.has(String(lp.id)) && isPendingOfflineRecord(lp)
        );

        // Preserve local purchase_price and ensure category is always populated from category_id
        const localMap = new Map<string, Product>(currentLocal.map((p: Product) => [String(p.id), p]));
        const enrichedRemote: Product[] = validRemote.map((rp: any) => {
          const loc = localMap.get(String(rp.id));
          const locIsPending = Boolean(loc && isPendingOfflineRecord(loc));
          const resolvedCat = (rp.category_id && catMap.has(rp.category_id))
            ? catMap.get(rp.category_id)
            : (rp.category || loc?.category || null);
          const localStock = (loc as any)?.stock_quantity ?? (loc as any)?.stock;
          const remoteStock = Number(rp.stock_quantity ?? (rp as any)?.stock ?? 0);
          const effectiveStock = locIsPending && localStock !== undefined ? Number(localStock) : remoteStock;

          const resolvedCost = (loc as any)?.purchase_cost ?? rp.purchase_cost ?? rp.distributor_price ?? (loc as any)?.distributor_price ?? (loc as any)?.purchase_price ?? null;
          const resolvedDp = rp.unit_price ?? rp.dealer_price ?? rp.dp_price ?? rp.price ?? (loc as any)?.unit_price ?? (loc as any)?.dp_price ?? 0;

          // Preserve price_tiers from remote or localStore
          let candidateTiers: any = rp.price_tiers;
          if (typeof candidateTiers === "string") {
            try { candidateTiers = JSON.parse(candidateTiers); } catch { candidateTiers = undefined; }
          }
          const safeCandidateTiers = Array.isArray(candidateTiers) ? (candidateTiers ?? []) : [];

          let locTiers: any = loc?.price_tiers;
          if (typeof locTiers === "string") {
            try { locTiers = JSON.parse(locTiers); } catch { locTiers = undefined; }
          }
          const safeLocTiers = Array.isArray(locTiers) ? (locTiers ?? []) : [];

          let resolvedPriceTiers = safeCandidateTiers.length >= 7
            ? safeCandidateTiers
            : (safeLocTiers.length >= 7
              ? (safeLocTiers ?? [])
              : (safeCandidateTiers.length > 0
                ? safeCandidateTiers
                : (safeLocTiers ?? [])));

          // If product only has a subset of default tiers (e.g. only D10, B12), expand to all 7 default tiers
          if (
            Array.isArray(resolvedPriceTiers) &&
            resolvedPriceTiers.length > 0 &&
            resolvedPriceTiers.length < 7 &&
            resolvedPriceTiers.every((t: any) => DEFAULT_TIER_NAMES.includes(formatTierLabel(t.name).toUpperCase() as any)) &&
            Number(resolvedDp) > 0
          ) {
            const fullDefaults = calculateDefaultPriceTiers(Number(resolvedDp));
            const existingMap = new Map(resolvedPriceTiers.map((t: any) => [formatTierLabel(t.name).toUpperCase(), t.price]));
            resolvedPriceTiers = fullDefaults.map((dt) => {
              const customVal = existingMap.get(dt.name);
              return customVal !== undefined && Number(customVal) > 0
                ? { name: dt.name, price: Number(customVal), rate: Number(customVal) }
                : dt;
            });
          }

          return {
            ...rp,
            unit_price: resolvedDp,
            dealer_price: resolvedDp,
            category: resolvedCat,
            purchase_cost: resolvedCost,
            distributor_price: resolvedCost ?? rp.distributor_price,
            purchase_price: resolvedCost,
            cost_price: resolvedCost,
            stock_quantity: effectiveStock,
            stock: effectiveStock,
            price_tiers: resolvedPriceTiers,
          } as Product;
        });

        const merged: Product[] = [...pendingLocal, ...enrichedRemote].sort((a: Product, b: Product) =>
          (a.name || "").localeCompare(b.name || "")
        );

        if (mountedRef.current) setProducts(merged);
        setLocalData(STORAGE_KEYS.PRODUCTS, merged, null, true);
        if (isManual) {
          toast.success(lang === "bn" ? `ক্লাউড ডাটাবেজ থেকে ${merged.length}টি পণ্য সিন্ক হয়েছে` : `Live sync: ${merged.length} products loaded from cloud`);
        }
      } else {
        const storedLocal = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        const localList: Product[] = (Array.isArray(storedLocal) ? storedLocal : [])
          .filter((p: Product) => !deletedIds.has(p.id))
          .map((p: any) => ({
            ...p,
            unit_price: p.unit_price ?? p.dp_price ?? p.selling_price ?? p.dealer_price ?? p.price ?? 0,
            dealer_price: p.unit_price ?? p.dp_price ?? p.selling_price ?? p.dealer_price ?? p.price ?? 0,
            purchase_cost: p.purchase_cost ?? p.distributor_price ?? p.purchase_price ?? null,
            category: (p.category_id && catMap.has(p.category_id)) ? catMap.get(p.category_id) : (p.category || null),
          }))
          .sort((a: Product, b: Product) => (a.name || "").localeCompare(b.name || ""));
        setProducts(localList);
      }
    } catch (err) {
      console.warn("Using local product cache due to fetch error:", err);
      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
      const storedLocal = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const localList: Product[] = (Array.isArray(storedLocal) ? storedLocal : [])
        .filter((p: Product) => !deletedIds.has(p.id))
        .sort((a: Product, b: Product) => (a.name || "").localeCompare(b.name || ""));
      setProducts(localList);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return [...products]
      .filter((p: Product) => {
        const s = search.toLowerCase();
        const matchSearch = !s || (p.name || "").toLowerCase().includes(s) || (p.sku_code || p.sku || "").toLowerCase().includes(s) || (p.brand ?? "").toLowerCase().includes(s);
        const matchCat = !catFilter || p.category_id === catFilter;
        return matchSearch && matchCat;
      })
      .sort((a: Product, b: Product) => (a.name || "").localeCompare(b.name || ""));
  }, [products, search, catFilter]);

  function handleEditProduct(product: Product) {
    if (!canManageProducts) {
      toast.error("You do not have permission to edit products.");
      return;
    }
    setSelectedProduct(product);
    setEditing(product);
    const dpVal = product.unit_price ?? (product as any).dp_price ?? (product as any).selling_price ?? (product as any).price ?? (product as any).dealer_price ?? (product as any).base_price ?? 0;
    const purchaseCost = (product as any).purchase_cost ?? product.distributor_price ?? (product as any).distributorPrice ?? (product as any).purchase_price ?? 0;
    setForm({
      id: product.id,
      sku: product.sku_code || "",
      sku_code: product.sku_code || "",
      name: product.name || "",
      brand: product.brand || "",
      category_id: product.category_id || (typeof product.category === "object" ? product.category?.id : "") || "",
      base_price: dpVal,
      unit_price: dpVal,
      dp_price: dpVal,
      selling_price: dpVal,
      price: dpVal,
      dealer_price: dpVal,
      purchase_cost: purchaseCost,
      distributor_price: purchaseCost,
      reorder_level: product.reorder_level ?? 10,
      unit: product.unit || "pcs",
      is_active: product.is_active ?? true,
      price_tiers: product.price_tiers || [],
    });
    setIsEditOpen(true);
    setIsEditModalOpen(true);
    setDialogOpen(true);
  }

  const handleEdit = handleEditProduct;
  const openEditModal = handleEditProduct;
  const openEdit = handleEditProduct;

  function openNew() {
    if (!canManageProducts) {
      toast.error("You do not have permission to add products.");
      return;
    }
    setSelectedProduct(null);
    setEditing(null);
    setForm({
      sku: "",
      sku_code: "",
      name: "",
      brand: "",
      category_id: "",
      base_price: 0,
      unit_price: 0,
      purchase_cost: 0,
      distributor_price: 0,
      reorder_level: 10,
      unit: "pcs",
      is_active: true,
    });
    setIsEditOpen(true);
    setIsEditModalOpen(true);
    setDialogOpen(true);
  }

  function handleCloseModal() {
    setDialogOpen(false);
    setIsEditOpen(false);
    setIsEditModalOpen(false);
    setSelectedProduct(null);
    setEditing(null);
    setForm({
      sku: "",
      sku_code: "",
      name: "",
      brand: "",
      category_id: "",
      base_price: 0,
      unit_price: 0,
      purchase_cost: 0,
      distributor_price: 0,
      reorder_level: 10,
      unit: "pcs",
      is_active: true,
    });
  }

  async function addProduct(baseDbPayload: Record<string, any>, category: Category | null, purchaseCost: number | null) {
    const costValue = purchaseCost ?? baseDbPayload.purchase_cost ?? baseDbPayload.distributor_price ?? 0;
    const finalDp = Math.max(0, r2(parseFloat(String(baseDbPayload.unit_price ?? baseDbPayload.dealer_price ?? 0)) || 0));

    // Construct clean payload strictly adhering to physical PostgreSQL columns
    const payload = filterProductPayloadForSupabase(baseDbPayload);
    payload.unit_price = finalDp;
    payload.dealer_price = finalDp;
    payload.distributor_price = costValue;
    payload.price_tiers = baseDbPayload.price_tiers || [];
    payload.updated_at = new Date().toISOString();

    console.log("Adding product payload:", payload);

    let res: any = null;
    const currentPayload: Record<string, any> = { ...payload };

    for (let attempt = 0; attempt < 6; attempt++) {
      res = await supabase
        .from("products")
        .insert(currentPayload)
        .select("*, category:categories(*)")
        .single();

      if (!res.error && res.data) {
        break;
      }

      const match = res.error?.message?.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in currentPayload) {
        console.warn(`Retrying insert without missing column '${match[1]}' due to schema cache:`, res.error?.message);
        delete currentPayload[match[1]];
        continue;
      }

      if (res.error?.message?.includes("distributor_price") && "distributor_price" in currentPayload) {
        delete currentPayload.distributor_price;
        continue;
      }
      if (res.error?.message?.includes("brand") && "brand" in currentPayload) {
        delete currentPayload.brand;
        continue;
      }
      if (res.error?.message?.includes("price_tiers") && "price_tiers" in currentPayload) {
        delete currentPayload.price_tiers;
        continue;
      }

      break;
    }

    if (res.error || !res.data) {
      console.error("Supabase product insert error:", res.error);
      const errMsg = res.error?.message || "Failed to add product to database";
      toast.error(`Database insert failed: ${errMsg}`);
      throw new Error(errMsg);
    }

    const createdProduct: Product = {
      ...(res.data as Product),
      unit_price: finalDp,
      dealer_price: finalDp,
      dp_price: finalDp,
      selling_price: finalDp,
      price: finalDp,
      base_price: finalDp,
      distributor_price: costValue,
      purchase_cost: costValue,
      cost_price: costValue,
      purchase_price: costValue,
      category_id: baseDbPayload.category_id,
      category: category || (res.data as any)?.category,
      price_tiers: baseDbPayload.price_tiers || [],
    };

    // Update state and localStorage
    setProducts((prev) => {
      const updated = [createdProduct, ...prev.filter((p) => p.id !== createdProduct.id)];
      const sorted = [...updated].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setLocalData(STORAGE_KEYS.PRODUCTS, sorted);
      return sorted;
    });

    await queryClient.invalidateQueries({ queryKey: ["products"] });
    window.dispatchEvent(new Event("sales_erp_storage_update"));

    toast.success(t("created"));
    handleCloseModal();
  }

  async function updateProduct(id: string, baseDbPayload: Record<string, any>, category: Category | null, purchaseCost: number | null) {
    const costValue = purchaseCost ?? baseDbPayload.purchase_cost ?? baseDbPayload.distributor_price ?? 0;
    const finalDp = Math.max(0, r2(parseFloat(String(baseDbPayload.unit_price ?? baseDbPayload.dealer_price ?? 0)) || 0));

    // Construct clean payload strictly adhering to physical PostgreSQL columns
    const payload = filterProductPayloadForSupabase(baseDbPayload);
    payload.unit_price = finalDp;
    payload.dealer_price = finalDp;
    payload.distributor_price = costValue;
    payload.price_tiers = baseDbPayload.price_tiers || [];
    payload.updated_at = new Date().toISOString();

    console.log("Updating product payload:", payload);

    let res: any = null;
    const currentPayload: Record<string, any> = { ...payload };

    for (let attempt = 0; attempt < 6; attempt++) {
      res = await supabase
        .from("products")
        .update(currentPayload)
        .eq("id", id)
        .select("*, category:categories(*)")
        .single();

      if (!res.error && res.data) {
        break;
      }

      const match = res.error?.message?.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in currentPayload) {
        console.warn(`Retrying update without missing column '${match[1]}' due to schema cache:`, res.error?.message);
        delete currentPayload[match[1]];
        continue;
      }

      if (res.error?.message?.includes("distributor_price") && "distributor_price" in currentPayload) {
        delete currentPayload.distributor_price;
        continue;
      }
      if (res.error?.message?.includes("brand") && "brand" in currentPayload) {
        delete currentPayload.brand;
        continue;
      }
      if (res.error?.message?.includes("price_tiers") && "price_tiers" in currentPayload) {
        delete currentPayload.price_tiers;
        continue;
      }

      break;
    }

    if (res.error || !res.data) {
      console.error("Supabase product update error:", res.error);
      const errMsg = res.error?.message || "Failed to update product in database";
      toast.error(`Database update failed: ${errMsg}`);
      throw new Error(errMsg);
    }

    const updatedProduct: Product = {
      ...(selectedProduct || editing || {}),
      ...(res.data as Product),
      id,
      is_active: baseDbPayload.is_active !== undefined ? Boolean(baseDbPayload.is_active) : ((res.data as any)?.is_active ?? true),
      unit_price: finalDp,
      dealer_price: finalDp,
      dp_price: finalDp,
      selling_price: finalDp,
      price: finalDp,
      base_price: finalDp,
      distributor_price: costValue,
      purchase_cost: costValue,
      cost_price: costValue,
      purchase_price: costValue,
      category_id: baseDbPayload.category_id,
      category: category || (res.data as any)?.category,
      price_tiers: baseDbPayload.price_tiers,
    };

    // Update state and localStorage
    setProducts((prev) => {
      const updated = prev.map((item) => (String(item.id) === String(id) ? updatedProduct : item));
      const sorted = [...updated].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setLocalData(STORAGE_KEYS.PRODUCTS, sorted);
      return sorted;
    });

    await queryClient.invalidateQueries({ queryKey: ["products"] });
    window.dispatchEvent(new Event("sales_erp_storage_update"));

    toast.success(t("updated"));
    handleCloseModal();
  }

  async function deleteProduct(p: Product) {
    if (!canManageProducts) {
      toast.error("You do not have permission to delete products.");
      return;
    }
    if (!confirm(t("confirmDelete"))) return;

    try {
      // 1. Soft-deactivate in Supabase first so foreign key constraints on order_items don't fail
      await supabase.from("products").update({
        is_active: false,
        name: "[Deleted Product]",
      }).eq("id", p.id);

      // Attempt hard delete if no foreign key references restrict it
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) {
        console.info("Supabase product delete preserved via soft-delete:", error.message);
      }
    } catch (err) {
      console.warn("Supabase product delete exception:", err);
    }

    // 2. Persist deletion in deleted IDs set
    saveDeletedId(STORAGE_KEYS.DELETED_PRODUCTS, p.id);

    // 3. Update state and localStorage for products
    setProducts((prev) => {
      const updated = prev.filter((item) => item.id !== p.id);
      setLocalData(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });

    // 4. Cascade foreign key reference handling in local orders
    try {
      const currentOrders = getOrders();
      let ordersUpdated = false;
      const nextOrders = currentOrders.map((ord: any) => {
        const items = ord.order_items || ord.items;
        if (Array.isArray(items) && items.some((it: any) => it.product_id === p.id)) {
          ordersUpdated = true;
          const cleanItems = items.map((it: any) =>
            it.product_id === p.id
              ? { ...it, product: null }
              : it
          );
          return {
            ...ord,
            order_items: cleanItems,
            items: cleanItems,
          };
        }
        return ord;
      });
      if (ordersUpdated) {
        setLocalData(STORAGE_KEYS.ORDERS, nextOrders);
      }
    } catch (err) {
      console.warn("Cascade product delete in orders notice:", err);
    }

    window.dispatchEvent(new Event("sales_erp_storage_update"));

    toast.success(t("deleted"));
  }

  async function handleSaveProduct(productData?: ProductFormData) {
    if (!canManageProducts) {
      toast.error("You do not have permission to manage products.");
      return;
    }
    const data = productData || (form as any);
    const sku = sanitizeFormulaInput(data.sku_code);
    const name = sanitizeFormulaInput(data.name);
    const brand = data.brand ? sanitizeFormulaInput(data.brand) : null;
    if (!name || !sku) {
      toast.error("Valid Name and SKU required (formula characters =, +, -, @ prohibited)");
      return;
    }
    setSaving(true);
    try {
      const activeProduct = selectedProduct || editing || (data?.id ? products.find((p) => p.id === data.id) : null);
      const category = categories.find((c) => c.id === data.category_id) ?? null;
      const categoryId = data.category_id || null;
      const rawDp = data.dp_price ?? data.unit_price ?? data.selling_price ?? data.price ?? (data as any).base_price ?? (data as any).dealer_price ?? 0;
      const finalDp = Math.max(0, r2(parseFloat(String(rawDp)) || 0));

      // Properly extract and parse Company Purchase Price (Cost)
      const rawCost = data.purchase_cost ?? data.distributor_price ?? data.cost_price ?? data.purchase_price ?? 0;
      const purchaseCost = Math.max(0, r2(parseFloat(String(rawCost)) || 0));
      const distributorPrice = purchaseCost;
      const dealerPrice = finalDp; // DP = Dealer Price (Selling Base Rate)
      const reorderLevel = Math.max(0, Math.round(Number(data.reorder_level) || 0));
      const unit = data.unit?.trim() || "pcs";
      const isActive = data.is_active ?? true;

      // Zod validation to ensure DP and required fields are valid and never NaN/undefined
      const validationResult = productSchema.safeParse({
        ...data,
        name,
        sku_code: sku,
        brand,
        unit_price: finalDp,
        dp_price: finalDp,
        dealer_price: finalDp,
        distributor_price: purchaseCost,
      });

      if (!validationResult.success) {
        const errMsg = validationResult.error.errors[0]?.message || "Product validation failed";
        toast.error(errMsg);
        return;
      }

      // Map and clean price tiers - filter out empty tier names
      let rawInputTiers = data.price_tiers;
      if (typeof rawInputTiers === "string") {
        try { rawInputTiers = JSON.parse(rawInputTiers); } catch { rawInputTiers = []; }
      }
      const priceTiers: { name: string; price: number; rate: number }[] = Array.isArray(rawInputTiers)
        ? rawInputTiers
          .filter((t: any) => t && typeof t.name === "string" && sanitizeFormulaInput(t.name).length > 0)
          .map((t: any) => {
            const val = Math.max(0, r2(parseFloat(String(t.price != null && t.price !== "" ? t.price : t.rate)) || 0));
            return {
              name: formatTierLabel(sanitizeFormulaInput(t.name)),
              price: val,
              rate: val,
            };
          })
        : [];

      const baseDbPayload: Record<string, any> = {
        sku_code: sku,
        name: name,
        brand: brand,
        category_id: categoryId,
        unit_price: finalDp,
        dealer_price: dealerPrice,
        distributor_price: distributorPrice,
        purchase_cost: purchaseCost,
        stock_quantity: activeProduct ? (activeProduct.stock_quantity ?? 0) : 0,
        reorder_level: reorderLevel,
        unit: unit,
        is_active: isActive,
        price_tiers: priceTiers,
      };

      // Also sync legacy d10_price and b12_price if matching tiers exist
      const d10Tier = priceTiers.find((t: any) => t.name.toLowerCase().includes("d10"));
      const b12Tier = priceTiers.find((t: any) => t.name.toLowerCase().includes("b12"));
      if (d10Tier) baseDbPayload.d10_price = r2(Number(d10Tier.price));
      else if ((data as any).d10_price != null) baseDbPayload.d10_price = r2(Number((data as any).d10_price));

      if (b12Tier) baseDbPayload.b12_price = r2(Number(b12Tier.price));
      else if ((data as any).b12_price != null) baseDbPayload.b12_price = r2(Number((data as any).b12_price));

      const d12Tier = priceTiers.find((t: any) => t.name.toLowerCase().includes("d12"));
      const b14Tier = priceTiers.find((t: any) => t.name.toLowerCase().includes("b14"));
      if (d12Tier) baseDbPayload.d12_price = r2(Number(d12Tier.price));
      else if ((data as any).d12_price != null) baseDbPayload.d12_price = r2(Number((data as any).d12_price));
      if (b14Tier) baseDbPayload.b14_price = r2(Number(b14Tier.price));
      else if ((data as any).b14_price != null) baseDbPayload.b14_price = r2(Number((data as any).b14_price));

      if ((data as any).image_url != null) baseDbPayload.image_url = (data as any).image_url;

      const targetId = activeProduct?.id || data?.id;
      if (targetId) {
        await updateProduct(targetId, baseDbPayload, category, purchaseCost);
      } else {
        await addProduct(baseDbPayload, category, purchaseCost);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  const save = handleSaveProduct;

  const remove = deleteProduct;

  async function handleCreateCategory() {
    if (!newCatName.trim()) {
      toast.error("Category name required");
      return;
    }
    const catName = newCatName.trim();
    setSavingCat(true);
    try {
      const tempId = crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`;
      let createdCat: Category = {
        id: tempId,
        name: catName,
        description: undefined,
        created_at: new Date().toISOString(),
      };

      // 1. Save directly to database
      const { data, error } = await supabase.from("categories").insert({ name: catName }).select().single();
      if (!error && data) {
        createdCat = data as Category;
      } else if (error) {
        console.warn("Supabase category insert notice:", error.message);
      }

      // 2. Update local state & localStorage
      const updatedCats = [...categories.filter((c: Category) => c.id !== createdCat.id), createdCat].sort((a: Category, b: Category) => a.name.localeCompare(b.name));
      setCategories(updatedCats);
      setLocalData(STORAGE_KEYS.CATEGORIES, updatedCats);
      window.dispatchEvent(new Event("sales_erp_storage_update"));

      // 3. Set newly created category as active selection in product form
      setForm((prev: any) => ({ ...prev, category_id: createdCat.id }));

      toast.success(`Category "${catName}" created`);
      setNewCatName("");
      setCatModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSavingCat(false);
    }
  }

  async function handleUpdateCategory() {
    if (!editingCat || !newCatName.trim()) return;
    const catName = newCatName.trim();
    setSavingCat(true);
    try {
      // 1. Update in database
      const { error } = await supabase.from("categories").update({ name: catName }).eq("id", editingCat.id);
      if (error) {
        console.warn("Supabase category update notice:", error.message);
      }

      // 2. Update categories state & storage
      const updatedCats = categories
        .map((c: Category) => (c.id === editingCat.id ? { ...c, name: catName } : c))
        .sort((a: Category, b: Category) => a.name.localeCompare(b.name));
      setCategories(updatedCats);
      setLocalData(STORAGE_KEYS.CATEGORIES, updatedCats);

      // 3. Update all linked products in state & storage
      setProducts((prev) => {
        const updated = prev.map((p: Product) =>
          (p.category_id === editingCat.id || (typeof p.category === "object" && (p.category as any)?.id === editingCat.id))
            ? { ...p, category_id: editingCat.id, category: { ...(typeof p.category === "object" ? p.category : {}), id: editingCat.id, name: catName } }
            : p
        );
        setLocalData(STORAGE_KEYS.PRODUCTS, updated);
        return updated;
      });

      window.dispatchEvent(new Event("sales_erp_storage_update"));

      toast.success("Category updated");
      setEditingCat(null);
      setNewCatName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update category");
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(catId: string, catName: string) {
    const linkedCount = products.filter((p: Product) => p.category_id === catId || (typeof p.category === "object" && (p.category as any)?.id === catId)).length;
    if (linkedCount > 0) {
      toast.warning(`Cannot delete "${catName}": ${linkedCount} product(s) are currently linked to this category. Please reassign their category first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", catId);
      if (error) {
        console.warn("Supabase category delete notice:", error.message);
      }

      const updatedCats = categories.filter((c: Category) => c.id !== catId);
      setCategories(updatedCats);
      setLocalData(STORAGE_KEYS.CATEGORIES, updatedCats);
      window.dispatchEvent(new Event("sales_erp_storage_update"));

      if (form.category_id === catId) {
        setForm((prev: any) => ({ ...prev, category_id: null }));
      }

      toast.success(`Category "${catName}" deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  }

  function handleExport() {
    exportToExcel(
      "products",
      filtered.map((p: Product) => {
        const row: Record<string, unknown> = {
          SKU: p.sku_code || p.sku || "",
          Name: p.name,
          Brand: p.brand ?? "",
          Category: typeof p.category === "object" ? p.category?.name ?? "" : p.category ?? "",
          UnitPrice: p.unit_price,
        };

        // Restrict confidential procurement / distributor price to administrators only
        if (isAdmin) {
          row["DistributorPrice"] = p.distributor_price ?? p.purchase_cost ?? 0;
        }

        row["Stock"] = p.stock_quantity;
        row["ReorderLevel"] = p.reorder_level;
        row["Unit"] = p.unit;

        return row;
      })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="sm:w-48">
            <option value="">{t("allCategories")}</option>
            {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
          {canManageProducts && (
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> {t("addProduct")}</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("products")}</p><p className="text-xl font-bold mt-1">{lang === "bn" ? toBnDigit(products.length) : products.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("allCategories")}</p><p className="text-xl font-bold mt-1">{lang === "bn" ? toBnDigit(categories.length) : categories.length}</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Package className="h-10 w-10" />} title={t("noData")} />
          ) : (
            <div>
              {/* Informative Helper Note on DP vs. Retail Price */}
              <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {lang === "bn"
                      ? "মূল্য নির্দেশিকা: DP (Dealer Price) হলো অনুমোদিত ডিলার ও রিটেইলার আউটলেটের পাইকারি বিক্রয় রেট। সাধারণ একক মূল্য খুচরা/MRP রেট নির্দেশ করে।"
                      : "Pricing Guide: DP (Dealer Price) represents the wholesale base tier rate for authorized dealers & retail outlets (distinct from retail MRP)."}
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                  {lang === "bn" ? "ডিলার পাইকারি রেট" : "Wholesale Dealer Rate"}
                </Badge>
              </div>

              {/* Mobile Product Cards (screens < 768px) */}
              <div className="block md:hidden divide-y divide-border/60">
                {filtered.map((p: Product) => {
                  const dpPrice = p.unit_price ?? (p as any).dp_price ?? (p as any).selling_price ?? (p as any).price ?? (p as any).dealer_price ?? 0;
                  return (
                    <div key={p.id} className="p-4 space-y-2.5 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/inventory?search=${encodeURIComponent(p.name)}`)}
                            className="font-semibold text-base text-left text-foreground hover:text-primary hover:underline transition-colors leading-snug"
                            title="Click to view stock in Inventory"
                          >
                            {p.name}
                          </button>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.brand || "—"}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-border/70">
                          {p.sku_code}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {p.category?.name ?? "General"}
                        </Badge>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Dealer Price (DP)</span>
                          <span className="font-mono text-sm font-bold text-foreground">{formatBDT(dpPrice)}</span>
                        </div>
                      </div>

                      {canManageProducts && (
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProduct(p);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>{t("edit")}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(p);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t("delete")}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (screens md+ >= 768px) */}
              <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] border rounded-lg max-w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-card z-10 shadow-sm">
                    <TableRow className="bg-white dark:bg-card border-b">
                      <TableHead className="w-28 min-w-[100px] bg-white dark:bg-card sticky top-0 z-10">{t("skuCode")}</TableHead>
                      <TableHead className="min-w-[200px] bg-white dark:bg-card sticky top-0 z-10">{t("productName")}</TableHead>
                      <TableHead className="min-w-[120px] bg-white dark:bg-card sticky top-0 z-10">{t("category")}</TableHead>
                      <TableHead className="text-right min-w-[150px] bg-white dark:bg-card sticky top-0 z-10">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{lang === "bn" ? "ডিলার মূল্য (DP)" : "DP (Dealer Price)"}</span>
                          <span
                            className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
                            title={
                              lang === "bn"
                                ? "ডিলার মূল্য (DP): ডিলার ও রিটেইলার আউটলেটের পাইকারি বিক্রয় রেট (খুচরা বা MRP নয়)"
                                : "Dealer Price (DP): Wholesale base tier rate for dealers & retail outlets (distinct from retail MRP)"
                            }
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </TableHead>
                      {canManageProducts && (
                        <TableHead className="text-right w-24 min-w-[90px] bg-white dark:bg-card sticky top-0 z-10">{t("actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p: Product) => {
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{p.sku_code}</TableCell>
                          <TableCell className="min-w-[200px]">
                            <div>
                              <button
                                type="button"
                                onClick={() => navigate(`/inventory?search=${encodeURIComponent(p.name)}`)}
                                className="font-medium text-left text-foreground hover:text-primary hover:underline transition-colors"
                                title="Click to view stock and transactions in Inventory"
                              >
                                {p.name}
                              </button>
                              <p className="text-xs text-muted-foreground">{p.brand ?? "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{p.category?.name ?? "—"}</TableCell>
                          <TableCell
                            className="text-right font-mono text-xs font-semibold whitespace-nowrap"
                            title={
                              lang === "bn"
                                ? "ডিলার মূল্য (DP): অনুমোদিত ডিলার ও আউটলেটের পাইকারি বিক্রয় রেট"
                                : "DP (Dealer Price): Wholesale base tier rate for dealers & retail outlets"
                            }
                          >
                            {formatBDT(p.unit_price ?? (p as any).dp_price ?? (p as any).selling_price ?? (p as any).price ?? (p as any).dealer_price ?? 0)}
                          </TableCell>
                        {canManageProducts && (
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProduct(p);
                                }}
                                title={t("edit")}
                                aria-label={`Edit ${p.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  remove(p);
                                }}
                                title={t("delete")}
                                aria-label={`Delete ${p.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Add Product Modal */}
      {canManageProducts && (
        <EditProductModal
          open={isEditOpen || isEditModalOpen || dialogOpen}
          isOpen={isEditOpen || isEditModalOpen || dialogOpen}
          onClose={handleCloseModal}
          editing={selectedProduct || editing}
          selectedProduct={selectedProduct || editing}
          product={selectedProduct || editing}
          form={form}
          setForm={setForm}
          categories={categories}
          onSave={handleSaveProduct}
          saving={saving}
          onManageCategories={() => {
            setEditingCat(null);
            setNewCatName("");
            setCatModalOpen(true);
          }}
        />
      )}

      {/* Category Management Sub-Modal */}
      <Dialog
        open={catModalOpen}
        onClose={() => {
          setCatModalOpen(false);
          setEditingCat(null);
          setNewCatName("");
        }}
        title="Add / Manage Categories"
        size="md"
      >
        <div className="space-y-4">
          {/* Add / Edit Input Group */}
          <div className="space-y-1.5">
            <Label>{editingCat ? "Edit Category Name" : "New Category Name"}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Cookware, Pressure Cooker..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (editingCat) handleUpdateCategory();
                    else handleCreateCategory();
                  }
                }}
                className="flex-1"
                autoFocus
              />
              {editingCat ? (
                <div className="flex gap-1">
                  <Button
                    onClick={handleUpdateCategory}
                    disabled={savingCat || !newCatName.trim()}
                    size="sm"
                  >
                    {savingCat && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCat(null);
                      setNewCatName("");
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleCreateCategory}
                  disabled={savingCat || !newCatName.trim()}
                  size="sm"
                >
                  {savingCat && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              )}
            </div>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium border-b pb-1.5">
              <span>{lang === "bn" ? `বিদ্যমান ক্যাটাগরি (${toBnDigit(categories.length)})` : `Existing Categories (${categories.length})`}</span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/40 pr-1">
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No categories created yet</p>
              ) : (
                categories.map((c: Category) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate text-foreground">{c.name}</span>
                      {form.category_id === c.id && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1">Selected</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingCat(c);
                          setNewCatName(c.name);
                        }}
                        title="Edit category name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setCatModalOpen(false);
              setEditingCat(null);
              setNewCatName("");
            }}
          >
            Close
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

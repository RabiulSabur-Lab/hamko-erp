import { useEffect, useState, useMemo, useRef } from "react";
import { supabase, type Product } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
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
import { Search, Download, Warehouse, Loader2 } from "lucide-react";
import { useRouter } from "@/router";
import { toast } from "sonner";
import { useAutoSync } from "@/hooks/useAutoSync";

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getDeletedIds,
  r2,
  getProductPurchasePrice,
  calculateInventoryStockValue,
  isPendingOfflineRecord,
  adjustProductStock,
  getProducts,
} from "@/utils/localStore";

export type StockType = "Stock In" | "Stock Out" | "Damage";
const txTypes: readonly StockType[] = ["Stock In", "Stock Out", "Damage"] as const;

export function InventoryPage() {
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();
  const { query, navigate } = useRouter();

  // Role-based access control (RBAC): Super Admin vs Sales Officer
  const rawRole = (
    profile?.role_name ||
    (profile as any)?.role ||
    (user as any)?.user_metadata?.role ||
    (user as any)?.profile?.role ||
    ((user as any)?.role && (user as any).role !== "authenticated" ? (user as any).role : "") ||
    ""
  ).toLowerCase().trim();

  const isSuperAdmin =
    rawRole.includes("admin") ||
    rawRole === "super_admin" ||
    (Boolean(user?.email?.toLowerCase().includes("admin")) && !rawRole.includes("officer"));

  const [loading, setLoading] = useState(() => getLocalData(STORAGE_KEYS.PRODUCTS).length === 0);
  const [products, setProducts] = useState<Product[]>(() => {
    const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const cachedCategories: any[] = getLocalData(STORAGE_KEYS.CATEGORIES, []);
    const catMap = new Map(cachedCategories.map((c) => [c.id, c]));
    return [...getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, [])]
      .filter((p) => !deletedIds.has(p.id))
      .map((p: any) => ({
        ...p,
        purchase_cost: p.purchase_cost ?? p.distributor_price ?? p.purchase_price ?? null,
        category: (p.category_id && catMap.has(p.category_id)) ? catMap.get(p.category_id) : (p.category || null),
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });
  const [search, setSearch] = useState(() => query.search || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "out">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    transaction_type?: typeof txTypes[number];
    product_id?: string;
    quantity?: number;
    reference?: string;
    notes?: string;
  }>({});

  useEffect(() => {
    if (query.search && query.search !== search) {
      setSearch(query.search);
    }
  }, [query.search]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    const handleStorage = () => {
      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
      const cachedCategories: any[] = getLocalData(STORAGE_KEYS.CATEGORIES, []);
      const catMap = new Map(cachedCategories.map((c) => [c.id, c]));
      const refreshed = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, [])
        .filter((p: any) => !deletedIds.has(p.id))
        .map((p: any) => ({
          ...p,
          purchase_cost: p.purchase_cost ?? p.distributor_price ?? p.purchase_price ?? null,
          category: (p.category_id && catMap.has(p.category_id)) ? catMap.get(p.category_id) : (p.category || null),
        }));
      setProducts([...refreshed].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    };

    const invChannel = supabase
      .channel("inventory-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_transactions" }, () => loadData())
      .subscribe();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sales_erp_storage_update", handleStorage);
    return () => {
      mountedRef.current = false;
      supabase.removeChannel(invChannel);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sales_erp_storage_update", handleStorage);
    };
  }, []);

  // Cloud-First re-validation on window focus, visibility change, and mobile app resume
  useAutoSync(() => {
    void loadData();
  });

  async function loadData() {
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from("products").select("*, category:categories(*)").order("name", { ascending: true }),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (!cRes.error && Array.isArray(cRes.data)) {
        setLocalData(STORAGE_KEYS.CATEGORIES, cRes.data, null, true);
      }

      const cachedCategories: any[] = !cRes.error && Array.isArray(cRes.data)
        ? cRes.data
        : getLocalData(STORAGE_KEYS.CATEGORIES, []);
      const catMap = new Map(cachedCategories.map((c) => [c.id, c]));

      if (!pRes.error && Array.isArray(pRes.data)) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
        const filtered = (pRes.data as Product[]).filter((p) => !deletedIds.has(p.id));
        const currentLocal = getLocalData<any[]>(STORAGE_KEYS.PRODUCTS, []);
        const localMap = new Map<string, any>((Array.isArray(currentLocal) ? currentLocal : []).map((p: any) => [String(p.id), p]));

        const enriched = filtered.map((p: any) => {
          const loc = localMap.get(String(p.id));
          const locIsPending = Boolean(loc && isPendingOfflineRecord(loc));
          const localStock = loc?.stock_quantity ?? loc?.stock;
          const remoteStock = Number(p.stock_quantity ?? p.stock ?? 0);
          const effectiveStock = locIsPending && localStock !== undefined ? Number(localStock) : remoteStock;
          const resolvedCost = loc?.purchase_cost ?? (p as any).purchase_cost ?? p.distributor_price ?? loc?.distributor_price ?? loc?.purchase_price ?? null;

          return {
            ...p,
            purchase_cost: resolvedCost,
            distributor_price: resolvedCost ?? p.distributor_price,
            purchase_price: resolvedCost,
            cost_price: resolvedCost,
            stock_quantity: effectiveStock,
            stock: effectiveStock,
            category: (p.category_id && catMap.has(p.category_id)) ? catMap.get(p.category_id) : (p.category || null),
          };
        });
        const sorted = enriched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (mountedRef.current) setProducts(sorted);
        setLocalData(STORAGE_KEYS.PRODUCTS, sorted, null, true);
      }
    } catch (err) {
      console.warn("Using local inventory cache:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return [...products]
      .filter((p: any) => {
        const s = search.toLowerCase();
        const categoryStr =
          typeof p.category === 'object'
            ? (p.category?.name || '—')
            : (p.category || p.category_name || '—');
        const matchesSearch =
          !s ||
          (p.name || "").toLowerCase().includes(s) ||
          (p.sku_code || "").toLowerCase().includes(s) ||
          categoryStr.toLowerCase().includes(s);
        if (!matchesSearch) return false;
        if (statusFilter === "low") return p.stock_quantity <= p.reorder_level;
        if (statusFilter === "out") return p.stock_quantity === 0;
        return true;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products, search, statusFilter]);

  const lowStock = useMemo(() => {
    return products
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products]);

  const outOfStock = useMemo(() => {
    return products
      .filter((p) => p.stock_quantity === 0)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products]);

  const availableSkusCount = useMemo(() => {
    return products.filter((p) => p.stock_quantity > 0).length;
  }, [products]);

  function openTx(type: typeof txTypes[number], productId?: string) {
    setForm({
      transaction_type: type,
      product_id: productId || (products[0]?.id ?? ""),
      quantity: 1,
      reference: "",
      notes: "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.product_id || !form.quantity) {
      toast.error("Product and quantity required");
      return;
    }
    const qty = Math.max(1, Math.round(Number(form.quantity)));
    const targetProduct = products.find((p) => p.id === form.product_id);
    if (!targetProduct) return;
    const txType = form.transaction_type || "Stock Out";
    setSaving(true);
    try {
      const delta = txType === "Stock In" ? qty : -qty;
      adjustProductStock(form.product_id, delta, "Main Warehouse");
      const sorted = [...getProducts()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setProducts(sorted);

      const nowIso = new Date().toISOString();
      const newTxRecord = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
        product_id: form.product_id,
        transaction_type: txType,
        quantity: qty,
        from_warehouse: "Main Warehouse",
        to_warehouse: "Main Warehouse",
        reference: form.reference?.trim() || null,
        notes: form.notes?.trim() || null,
        performed_by: profile?.id ?? null,
        transaction_date: nowIso,
        created_at: nowIso,
        product: targetProduct,
      };
      const existingTx = getLocalData<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
      setLocalData(STORAGE_KEYS.TRANSACTIONS, [newTxRecord, ...(Array.isArray(existingTx) ? existingTx : [])]);

      toast.success(`${txType} updated successfully`);
      setDialogOpen(false);

      // 3. Record stock transaction in Supabase via RPC or direct table insert fallback
      supabase.rpc("record_stock_transaction", {
        p_tx: {
          product_id: form.product_id,
          transaction_type: txType,
          quantity: qty,
          from_warehouse: "Main Warehouse",
          to_warehouse: "Main Warehouse",
          reference: form.reference?.trim() ?? "",
          notes: form.notes?.trim() ?? "",
          performed_by: profile?.id ?? "",
        },
      }).then(({ error }) => {
        if (error) {
          supabase
            .from("stock_transactions")
            .insert({
              product_id: form.product_id,
              transaction_type: txType,
              quantity: qty,
              from_warehouse: "Main Warehouse",
              to_warehouse: "Main Warehouse",
              reference: form.reference?.trim() || null,
              notes: form.notes?.trim() || null,
              performed_by: profile?.id ?? null,
              transaction_date: nowIso,
            })
            .then(undefined, (insErr) => console.warn("Direct stock_transactions insert notice:", insErr));
        }
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    exportToExcel("current_inventory", filteredProducts.map((p: any) => {
      const unitPrice = getProductPurchasePrice(p);
      const categoryStr =
        typeof p.category === 'object'
          ? (p.category?.name || '—')
          : (p.category || p.category_name || '—');
      const baseRow: Record<string, any> = {
        SKU: p.sku_code,
        "Product Name": p.name,
        Category: categoryStr,
        "Stock Quantity": p.stock_quantity,
        "Reorder Level": p.reorder_level,
      };

      if (isSuperAdmin) {
        baseRow["Purchase Cost (৳)"] = unitPrice;
        baseRow["Total Stock Value (৳)"] = r2(p.stock_quantity * unitPrice);
      }

      baseRow["Status"] = p.stock_quantity === 0 ? "Out of Stock" : p.stock_quantity <= p.reorder_level ? "Low Stock" : "In Stock";
      return baseRow;
    }));
  }

  return (
    <div className="space-y-4">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${statusFilter === "all" ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("products")}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{lang === "bn" ? toBnDigit(products.length) : products.length}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${statusFilter === "low" ? "ring-2 ring-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "low" ? "all" : "low")}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("lowStockAlert")}</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{lang === "bn" ? toBnDigit(lowStock.length) : lowStock.length}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${statusFilter === "out" ? "ring-2 ring-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "out" ? "all" : "out")}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t("outOfStock")}</p>
            <p className="text-2xl font-bold mt-1 text-rose-600">{lang === "bn" ? toBnDigit(outOfStock.length) : outOfStock.length}</p>
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card className="transition-all">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{t("totalStockValue")}</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{formatBDT(calculateInventoryStockValue(products))}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="transition-all">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{t("availableSkus")}</p>
              <p className="text-2xl font-bold mt-1 text-primary">{lang === "bn" ? toBnDigit(availableSkusCount) : availableSkusCount}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Toolbar & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search bar on the left */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchProductPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm pr-20"
          />
          {statusFilter !== "all" && (
            <Badge
              variant="outline"
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[10px] py-0.5 px-1.5 gap-1 border-dashed hover:bg-muted"
              onClick={() => setStatusFilter("all")}
            >
              {statusFilter === "low" ? t("lowStock") : t("outOfStock")} ×
            </Badge>
          )}
        </div>

        {/* Action Button on the right: Export Excel */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1.5" /> {t("exportExcel")}
          </Button>
        </div>
      </div>

      {/* Main Single Inventory Table (Product Name, Category, Stock Quantity, Unit Price, Total Value, Stock Status) */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState icon={<Warehouse className="h-10 w-10" />} title={t("noData")} />
          ) : (
            <div>
              {/* Mobile Inventory Cards (screens < 768px) */}
              <div className="block md:hidden divide-y divide-border/60">
                {filteredProducts.map((p) => {
                  const low = p.stock_quantity <= p.reorder_level;
                  const out = p.stock_quantity === 0;
                  const unitPrice = getProductPurchasePrice(p);
                  const totalVal = r2(p.stock_quantity * unitPrice);
                  const categoryName = typeof p.category === 'object'
                    ? (p.category?.name || '—')
                    : (p.category || (p as any).category_name || '—');

                  return (
                    <div key={p.id} className="p-4 space-y-2.5 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/products?search=${encodeURIComponent(p.name)}`)}
                            className="font-semibold text-base text-left text-foreground hover:text-primary hover:underline transition-colors leading-snug"
                            title="Click to view in Products catalog"
                          >
                            {p.name}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-muted-foreground">{p.sku_code}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {categoryName}
                            </Badge>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {out ? (
                            <Badge variant="destructive" className="text-[10px]">{t("outOfStock")}</Badge>
                          ) : low ? (
                            <Badge variant="warning" className="text-[10px]">{t("lowStockAlert")}</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">{t("inStock")}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Stock Quantity & Financial Info */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Stock Quantity</span>
                          <span className={`text-base font-bold font-mono ${out ? "text-destructive" : low ? "text-amber-600" : "text-foreground"}`}>
                            {lang === "bn" ? toBnDigit(p.stock_quantity) : p.stock_quantity} <span className="text-xs font-normal text-muted-foreground">{p.unit || "pcs"}</span>
                          </span>
                        </div>

                        {isSuperAdmin && (
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Total Stock Value</span>
                            <span className="font-mono text-sm font-bold text-foreground">{formatBDT(totalVal)}</span>
                            <span className="text-[10px] text-muted-foreground block">Rate: {formatBDT(unitPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (screens md+ >= 768px) */}
              <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-card z-10 shadow-sm">
                    <TableRow className="bg-white dark:bg-card border-b">
                      <TableHead className="bg-white dark:bg-card sticky top-0 z-10">{t("productName")}</TableHead>
                      <TableHead className="bg-white dark:bg-card sticky top-0 z-10">{t("category")}</TableHead>
                      <TableHead className="text-right bg-white dark:bg-card sticky top-0 z-10">{t("stockQty")}</TableHead>
                      {isSuperAdmin && (
                        <>
                          <TableHead className="text-right bg-white dark:bg-card sticky top-0 z-10">{t("purchaseCost")}</TableHead>
                          <TableHead className="text-right bg-white dark:bg-card sticky top-0 z-10">{t("totalValue")}</TableHead>
                        </>
                      )}
                      <TableHead className="bg-white dark:bg-card sticky top-0 z-10">{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const low = p.stock_quantity <= p.reorder_level;
                      const out = p.stock_quantity === 0;
                      const unitPrice = getProductPurchasePrice(p);
                      const totalVal = r2(p.stock_quantity * unitPrice);

                      return (
                        <TableRow key={p.id}>
                          {/* Product Name */}
                          <TableCell>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => navigate(`/products?search=${encodeURIComponent(p.name)}`)}
                                className="font-medium text-left text-foreground hover:text-primary hover:underline transition-colors"
                                title="Click to view in Products catalog"
                              >
                                {p.name}
                              </button>
                              <span className="font-mono text-[11px] text-muted-foreground">{p.sku_code}</span>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="text-sm text-muted-foreground">
                            {typeof p.category === 'object'
                              ? (p.category?.name || '—')
                              : (p.category || (p as any).category_name || '—')}
                          </TableCell>

                          {/* Stock Quantity */}
                          <TableCell className="text-right font-semibold">
                            <span className={out ? "text-destructive" : low ? "text-amber-600" : "text-foreground"}>
                              {lang === "bn" ? toBnDigit(p.stock_quantity) : p.stock_quantity}
                            </span>
                          </TableCell>

                          {/* Financial Columns: Only visible for Super Admin */}
                          {isSuperAdmin && (
                            <>
                              <TableCell className="text-right text-sm">
                                {formatBDT(unitPrice)}
                              </TableCell>

                              <TableCell className="text-right text-sm font-semibold">
                                {formatBDT(totalVal)}
                              </TableCell>
                            </>
                          )}

                          {/* Stock Status */}
                          <TableCell>
                            {out ? (
                              <Badge variant="destructive" className="text-[10px]">{t("outOfStock")}</Badge>
                            ) : low ? (
                              <Badge variant="warning" className="text-[10px]">{t("lowStockAlert")}</Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px]">{t("inStock")}</Badge>
                            )}
                          </TableCell>
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

      {/* Stock Transaction Modal (Single Warehouse Stock Update) */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={form.transaction_type || t("transactionType")} size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("product")}</Label>
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku_code}) — Current Stock: {p.stock_quantity}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("quantity")}</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("reference")}</Label>
            <Input
              value={form.reference ?? ""}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="PO / Invoice / Ref no."
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t("save")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase, SUPABASE_TABLE_SELECTS, type Product } from "@/lib/supabase";
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
import { Search, Download, Warehouse, Loader2, RefreshCw, AlertTriangle, PackageX, DollarSign, PackageCheck, Plus, ArrowUpDown, Clock } from "lucide-react";
import { useRouter } from "@/router";
import { toast } from "sonner";
import { useAutoSync } from "@/hooks/useAutoSync";
import { triggerGlobalLiveSync, clearCloudPullThrottle } from "@/utils/cloudSync";

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
  reconcileProductsWithRemote,
  reconcileCategoriesWithRemote,
  dispatchGlobalStateUpdate,
} from "@/utils/localStore";
import {
  filterActiveProducts,
  getEffectiveStockQuantity,
  getEffectiveReorderLevel,
  classifyProductStock,
} from "@/utils/productUtils";
import { sanitizeStockTxPayload, generateUuid } from "@/lib/payloadSanitizer";

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

  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [products, setProducts] = useState<Product[]>(() =>
    filterActiveProducts(getProducts(), getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS)),
  );
  const [search, setSearch] = useState(() => query.search || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "out" | "pending">("all");
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
    void loadData();

    // Watchdog timer: automatically release loading spinner within 3.5s
    const watchdog = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    }, 3500);

    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    const handleLocalStorageSync = () => {
      if (!mountedRef.current) return;
      const syncedLocal = filterActiveProducts(
        getProducts(),
        getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS),
      ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      if (syncedLocal.length > 0) {
        setProducts(syncedLocal);
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sales_erp_storage_update", handleLocalStorageSync);

    let realtimeReloadTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRealtimeLoad = () => {
      if (realtimeReloadTimer) clearTimeout(realtimeReloadTimer);
      realtimeReloadTimer = setTimeout(() => {
        if (mountedRef.current) void loadData(false);
      }, 450);
    };

    const invChannel = supabase
      .channel("inventory-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleRealtimeLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, scheduleRealtimeLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_transactions" }, scheduleRealtimeLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleRealtimeLoad)
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearTimeout(watchdog);
      if (realtimeReloadTimer) clearTimeout(realtimeReloadTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sales_erp_storage_update", handleLocalStorageSync);
      try {
        if (invChannel && supabase?.removeChannel) {
          supabase.removeChannel(invChannel);
        }
      } catch (e) {}
    };
  }, []);

  // Cloud-First re-validation on window focus, visibility change, and mobile app resume
  useAutoSync(() => {
    mountedRef.current = true;
    void loadData(false);
  });

  async function loadData(isManual = false) {
    mountedRef.current = true;
    if (isManual) {
      setLoading(true);
    }
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Inventory fetch timeout")), 12000)
      );
      const [pRes, cRes, invRes] = await Promise.race([
        Promise.all([
          supabase.from("products").select("*, category:categories(*)").order("name", { ascending: true }).limit(2000),
          supabase.from("categories").select("*").order("name").limit(500),
          supabase.from("inventory").select(SUPABASE_TABLE_SELECTS.inventory).limit(2000),
        ]),
        timeoutPromise,
      ]);

      const catList: any[] = !cRes.error && Array.isArray(cRes.data) ? cRes.data : [];
      if (catList.length > 0) {
        reconcileCategoriesWithRemote(catList as any, { persist: true });
      }
      const catMap = new Map(catList.map((c) => [c.id, c]));

      // Map warehouse inventory rows by product_id as fallback if product.stock_quantity is absent
      const invByProduct = new Map<string, number>();
      if (!invRes.error && Array.isArray(invRes.data)) {
        for (const row of invRes.data as any[]) {
          if (row?.product_id) {
            const pid = String(row.product_id);
            invByProduct.set(pid, (invByProduct.get(pid) || 0) + Math.max(0, Number(row.quantity || 0)));
          }
        }
      }

      let rawProductList: any[] | null = !pRes.error && Array.isArray(pRes.data) && pRes.data.length > 0 ? pRes.data : null;
      if (!rawProductList) {
        console.warn("Inventory products joined select notice, attempting flat query fallback:", pRes?.error?.message);
        const fbRes = await supabase.from("products").select("*").order("name", { ascending: true }).limit(2000);
        if (!fbRes.error && Array.isArray(fbRes.data)) {
          rawProductList = fbRes.data;
        }
      }

      if (rawProductList && rawProductList.length > 0) {
        const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
        const activeList = filterActiveProducts(rawProductList as Product[], deletedIds);

        const enriched = activeList.map((p: any) => {
          const directStock = getEffectiveStockQuantity(p);
          const remoteStock = directStock > 0 ? directStock : (invByProduct.get(String(p.id)) ?? directStock);
          const resolvedCost = getProductPurchasePrice(p);
          const effectiveReorder = getEffectiveReorderLevel(p);

          return {
            ...p,
            purchase_cost: resolvedCost > 0 ? resolvedCost : null,
            distributor_price: resolvedCost > 0 ? resolvedCost : (Number(p.distributor_price) || 0),
            purchase_price: resolvedCost > 0 ? resolvedCost : null,
            cost_price: resolvedCost > 0 ? resolvedCost : null,
            stock_quantity: remoteStock,
            stock: remoteStock,
            reorder_level: effectiveReorder,
            category: (p.category_id && catMap.has(p.category_id)) ? catMap.get(p.category_id) : (p.category || null),
          };
        });
        const sorted = enriched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        reconcileProductsWithRemote(sorted as any, { persist: true });
        if (mountedRef.current) setProducts(sorted);
        setIsOfflineMode(false);
        if (isManual) {
          toast.success(lang === "bn" ? `লাইভ সিন্ক: ${sorted.length}টি পণ্য লোড হয়েছে` : `Live sync: ${sorted.length} products loaded from cloud`);
        }
      }
    } catch (err) {
      console.warn("Inventory fetch notice:", err);
      setIsOfflineMode(true);
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
        const stockStatus = classifyProductStock(p);
        if (statusFilter === "low") return stockStatus === "low_stock";
        if (statusFilter === "out") return stockStatus === "out_of_stock";
        if (statusFilter === "pending") return stockStatus === "pending_stock";
        return true;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products, search, statusFilter]);

  const lowStock = useMemo(() => {
    return products
      .filter((p) => classifyProductStock(p) === "low_stock")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products]);

  const outOfStock = useMemo(() => {
    return products
      .filter((p) => classifyProductStock(p) === "out_of_stock")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products]);

  const pendingOpeningStock = useMemo(() => {
    return products
      .filter((p) => classifyProductStock(p) === "pending_stock")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products]);

  const stockedMissingCostCount = useMemo(() => {
    return products.filter((p) => getEffectiveStockQuantity(p) > 0 && getProductPurchasePrice(p) <= 0).length;
  }, [products]);

  const availableSkusCount = useMemo(() => {
    return products.filter((p) => getEffectiveStockQuantity(p) > 0).length;
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
      adjustProductStock(form.product_id, delta, "Main Warehouse", { skipRemoteProductUpdate: true });
      const sorted = filterActiveProducts(
        getProducts(),
        getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS),
      ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setProducts(sorted);

      const nowIso = new Date().toISOString();
      const newTxRecord = {
        id: generateUuid(),
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
        _unsynced: true,
        _modifiedAt: Date.now(),
        is_offline: true,
      };
      const existingTx = getLocalData<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
      setLocalData(STORAGE_KEYS.TRANSACTIONS, [newTxRecord, ...(Array.isArray(existingTx) ? existingTx : [])]);

      toast.success(`${txType} updated successfully`);
      setDialogOpen(false);
      window.dispatchEvent(new Event("sales_erp_storage_update"));
      dispatchGlobalStateUpdate({ type: "inventory_adjusted", recordId: form.product_id });

      // 3. Record stock transaction in Supabase via RPC or direct table insert fallback
      try {
        const { error } = await supabase.rpc("record_stock_transaction", {
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
        });

        if (error) {
          console.warn("RPC record_stock_transaction notice, using direct table fallback:", error.message);
          const cleanTx = sanitizeStockTxPayload({
            product_id: form.product_id,
            transaction_type: txType,
            quantity: qty,
            from_warehouse: "Main Warehouse",
            to_warehouse: "Main Warehouse",
            reference: form.reference?.trim() || null,
            notes: form.notes?.trim() || null,
            performed_by: profile?.id ?? null,
            transaction_date: nowIso,
          }, true);
          await supabase
            .from("stock_transactions")
            .insert(cleanTx)
            .then(undefined, (insErr) => console.warn("Direct stock_transactions insert notice:", insErr));

          // Also ensure remote product stock is updated in fallback
          const curStock = Math.max(0, Number(targetProduct.stock_quantity ?? 0));
          const nextStock = Math.max(0, curStock + delta);
          await supabase
            .from("products")
            .update({ stock_quantity: nextStock, updated_at: nowIso })
            .eq("id", form.product_id)
            .then(undefined, (prodErr) => console.warn("Direct product stock fallback notice:", prodErr));
        }

        // Mark local transaction record as synced
        const storedTx = getLocalData<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
        if (Array.isArray(storedTx)) {
          setLocalData(
            STORAGE_KEYS.TRANSACTIONS,
            storedTx.map((tx: any) => (tx.id === newTxRecord.id ? { ...tx, _unsynced: false, is_offline: false } : tx))
          );
        }
      } catch (rpcErr) {
        console.warn("Stock transaction remote sync notice (persisted locally with unsynced protection):", rpcErr);
      }
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

      baseRow["Status"] = (() => {
        const st = classifyProductStock(p);
        if (st === "pending_stock") return "Pending Opening Stock";
        if (st === "out_of_stock") return "Out of Stock";
        if (st === "low_stock") return "Low Stock";
        return "In Stock";
      })();
      return baseRow;
    }));
  }

  return (
    <div className="space-y-4">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card
          interactive
          className={`cursor-pointer ${statusFilter === "all" ? "ring-2 ring-primary/45 bg-sky-100/45 dark:bg-sky-500/20" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground font-medium truncate">{t("products")}</p>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20">
                <Warehouse className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight mt-2 text-foreground">{lang === "bn" ? toBnDigit(products.length) : products.length}</p>
          </CardContent>
        </Card>

        <Card
          interactive
          className={`cursor-pointer ${statusFilter === "low" ? "ring-2 ring-amber-500/45 bg-amber-100/45 dark:bg-amber-500/20" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "low" ? "all" : "low")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground font-medium truncate">{t("lowStockAlert")}</p>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight mt-2 text-amber-600 dark:text-amber-400">{lang === "bn" ? toBnDigit(lowStock.length) : lowStock.length}</p>
          </CardContent>
        </Card>

        <Card
          interactive
          className={`cursor-pointer ${statusFilter === "out" ? "ring-2 ring-rose-500/45 bg-rose-100/45 dark:bg-rose-500/20" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "out" ? "all" : "out")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground font-medium truncate">{t("outOfStock")}</p>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20">
                <PackageX className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight mt-2 text-rose-600 dark:text-rose-400">{lang === "bn" ? toBnDigit(outOfStock.length) : outOfStock.length}</p>
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card interactive>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground font-medium truncate">{t("totalStockValue")}</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight mt-2 text-foreground">{formatBDT(calculateInventoryStockValue(products))}</p>
              {stockedMissingCostCount > 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 truncate">
                  {lang === "bn"
                    ? `${toBnDigit(stockedMissingCostCount)}টি পণ্যের ক্রয়মূল্য সেট করা হয়নি`
                    : `${stockedMissingCostCount} stocked SKU(s) missing purchase cost`}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card interactive>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground font-medium truncate">{t("availableSkus")}</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <PackageCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight mt-2 text-primary">{lang === "bn" ? toBnDigit(availableSkusCount) : availableSkusCount}</p>
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
              {statusFilter === "low"
                ? t("lowStock")
                : statusFilter === "out"
                ? t("outOfStock")
                : (lang === "bn" ? "ওপেনিং স্টক বাকি" : "Pending Stock")} ×
            </Badge>
          )}
        </div>

        {/* Action Button on the right: Pending Stock Pill, Stock In, Live Sync & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingOpeningStock.length > 0 && (
            <Badge
              variant={statusFilter === "pending" ? "default" : "outline"}
              className="cursor-pointer gap-1.5 h-9 px-2.5 text-xs font-medium border-slate-300 dark:border-slate-700"
              onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
              title="Newly imported catalog products awaiting opening stock & pricing"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {lang === "bn"
                  ? `ওপেনিং স্টক বাকি: ${toBnDigit(pendingOpeningStock.length)}`
                  : `Pending Stock: ${pendingOpeningStock.length}`}
              </span>
            </Badge>
          )}
          {isOfflineMode && (
            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Offline Mode
            </Badge>
          )}
          {isSuperAdmin && (
            <Button
              size="sm"
              onClick={() => openTx("Stock In")}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === "bn" ? "স্টক ইন / এডজাস্ট" : "Stock In / Adjust"}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={loading}
            title="Live cloud sync"
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">{loading ? "Syncing..." : "Live Sync"}</span>
          </Button>
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
                  const stockStatus = classifyProductStock(p);
                  const pending = stockStatus === "pending_stock";
                  const low = stockStatus === "low_stock";
                  const out = stockStatus === "out_of_stock";
                  const qty = getEffectiveStockQuantity(p);
                  const unitPrice = getProductPurchasePrice(p);
                  const totalVal = r2(qty * unitPrice);
                  const categoryName = typeof p.category === 'object'
                    ? (p.category?.name || '—')
                    : (p.category || (p as any).category_name || '—');

                  return (
                    <div key={p.id} className="p-4 space-y-2.5 bg-transparent hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
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
                          {pending ? (
                            <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                              {lang === "bn" ? "স্টক বাকি" : "Pending Stock"}
                            </Badge>
                          ) : out ? (
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
                          <span className={`text-base font-bold font-mono ${pending ? "text-muted-foreground" : out ? "text-destructive" : low ? "text-amber-600" : "text-foreground"}`}>
                            {lang === "bn" ? toBnDigit(qty) : qty} <span className="text-xs font-normal text-muted-foreground">{p.unit || "pcs"}</span>
                          </span>
                        </div>

                        {isSuperAdmin && (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Total Stock Value</span>
                              <span className="font-mono text-sm font-bold text-foreground">{formatBDT(totalVal)}</span>
                              <span className="text-[10px] text-muted-foreground block">
                                Rate: {unitPrice > 0 ? formatBDT(unitPrice) : (lang === "bn" ? "সেট নেই" : "Not set")}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => openTx("Stock In", p.id)}
                              title="Update / Stock In"
                            >
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (screens md+ >= 768px) */}
              <div className="hidden md:block border rounded-lg">
                <Table containerClassName="max-h-[calc(100vh-280px)] rounded-lg">
                  <TableHeader className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs">
                    <TableRow className="border-b hover:bg-transparent">
                      <TableHead>{t("productName")}</TableHead>
                      <TableHead>{t("category")}</TableHead>
                      <TableHead className="text-right">{t("stockQty")}</TableHead>
                      {isSuperAdmin && (
                        <>
                          <TableHead className="text-right">{t("purchaseCost")}</TableHead>
                          <TableHead className="text-right">{t("totalValue")}</TableHead>
                        </>
                      )}
                      <TableHead>{t("status")}</TableHead>
                      {isSuperAdmin && <TableHead className="text-right w-20">{t("actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const stockStatus = classifyProductStock(p);
                      const pending = stockStatus === "pending_stock";
                      const low = stockStatus === "low_stock";
                      const out = stockStatus === "out_of_stock";
                      const qty = getEffectiveStockQuantity(p);
                      const unitPrice = getProductPurchasePrice(p);
                      const totalVal = r2(qty * unitPrice);

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
                            <span className={pending ? "text-muted-foreground" : out ? "text-destructive" : low ? "text-amber-600" : "text-foreground"}>
                              {lang === "bn" ? toBnDigit(qty) : qty}
                            </span>
                          </TableCell>

                          {/* Financial Columns: Only visible for Super Admin */}
                          {isSuperAdmin && (
                            <>
                              <TableCell className="text-right text-sm">
                                {unitPrice > 0 ? (
                                  formatBDT(unitPrice)
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    {lang === "bn" ? "সেট নেই" : "Not set"}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="text-right text-sm font-semibold">
                                {formatBDT(totalVal)}
                              </TableCell>
                            </>
                          )}

                          {/* Stock Status */}
                          <TableCell>
                            {pending ? (
                              <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                                {lang === "bn" ? "ওপেনিং স্টক বাকি" : "Pending Stock"}
                              </Badge>
                            ) : out ? (
                              <Badge variant="destructive" className="text-[10px]">{t("outOfStock")}</Badge>
                            ) : low ? (
                              <Badge variant="warning" className="text-[10px]">{t("lowStockAlert")}</Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px]">{t("inStock")}</Badge>
                            )}
                          </TableCell>

                          {isSuperAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openTx("Stock In", p.id)}
                                title={lang === "bn" ? "স্টক ইন / এডজাস্ট" : "Stock In / Adjust"}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              </Button>
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

      {/* Stock Transaction Modal (Single Warehouse Stock Update) */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={form.transaction_type || t("transactionType")} size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("transactionType")}</Label>
            <Select
              value={form.transaction_type || "Stock In"}
              onChange={(e) => setForm({ ...form, transaction_type: e.target.value as StockType })}
            >
              {txTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </Select>
          </div>
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

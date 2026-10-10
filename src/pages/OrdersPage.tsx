import { useEffect, useState, useMemo } from "react";
import { supabase, type Order, type OrderItem, type Customer, type Product, type StockTransaction, type Collection } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { formatBDT, formatCurrency, formatDate, cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  ShoppingCart,
  Loader2,
  Eye,
  Printer,
  ExternalLink,
  ChevronDown,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  FileText,
  User,
} from "lucide-react";
import { useRouter } from "@/router";
import { CustomerLedgerModal } from "@/components/CustomerLedgerModal";
import { OrderPrintInvoice } from "@/components/OrderPrintInvoice";
import { AddOrderModal, type OrderItemForm } from "@/components/AddOrderModal";
import { toast } from "sonner";
import {
  fetchActiveSalesOfficers,
  getLocalSalesOfficers,
  resolveOfficerName,
  buildUserLookupMap,
  fetchAllUsersMap,
  type ManagedUser,
  type UserLookupInfo,
} from "@/services/userService";
import { useUsers } from "@/context/UsersContext";

import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  saveOrders,
  saveCollections,
  optimisticAdd,
  optimisticUpdate,
  getOrders,
  getCustomers,
  getProducts,
  getCollections,
  deleteOrder,
  getDeletedIds,
  getAreas,
  type Area,
  mergeAndEnrichCustomers,
  getCustomerLedgerDetails,
  recalculateCustomerLedger,
  r2,
  dispatchGlobalStateUpdate,
  deduplicateCollections,
  adjustProductStock,
  generateOrderNumber,
  generateCollectionNumber,
  voidOrderCollections,
} from "@/utils/localStore";
import { resolveOrderProduct, sanitizeFormulaInput, formatTierLabel } from "@/utils/productUtils";

const statuses = ["Draft", "Pending", "Approved", "Delivered", "Cancelled"] as const;

export function getOrderStatusBadgeClass(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700";
    case "Pending":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700";
    case "Approved":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700";
    case "Delivered":
      return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700";
    case "Cancelled":
      return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700";
  }
}

export function getOrderStatusConfig(status: string) {
  switch (status) {
    case "Draft":
      return {
        badge: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700",
        border: "border-gray-200 dark:border-gray-800",
        activeBorder: "border-gray-400 bg-gray-50/60 dark:bg-gray-900/40",
        dot: "bg-gray-500",
        icon: FileText,
        iconColor: "text-gray-600 dark:text-gray-400",
        iconBg: "bg-gray-100 dark:bg-gray-800",
      };
    case "Pending":
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
        border: "border-amber-200/80 dark:border-amber-900/40",
        activeBorder: "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30",
        dot: "bg-amber-500",
        icon: Clock,
        iconColor: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-100 dark:bg-amber-900/50",
      };
    case "Approved":
      return {
        badge: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
        border: "border-blue-200/80 dark:border-blue-900/40",
        activeBorder: "border-blue-400 bg-blue-50/60 dark:bg-blue-950/30",
        dot: "bg-blue-500",
        icon: CheckCircle2,
        iconColor: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
      };
    case "Delivered":
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
        border: "border-emerald-200/80 dark:border-emerald-900/40",
        activeBorder: "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30",
        dot: "bg-emerald-500",
        icon: Truck,
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      };
    case "Cancelled":
      return {
        badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
        border: "border-rose-200/80 dark:border-rose-900/40",
        activeBorder: "border-rose-400 bg-rose-50/60 dark:bg-rose-950/30",
        dot: "bg-rose-500",
        icon: XCircle,
        iconColor: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-rose-100 dark:bg-rose-900/50",
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700",
        border: "border-gray-200 dark:border-gray-800",
        activeBorder: "border-gray-400 bg-gray-50/60",
        dot: "bg-gray-500",
        icon: FileText,
        iconColor: "text-gray-600",
        iconBg: "bg-gray-100",
      };
  }
}

/**
 * Utility to deduplicate order items by product_id, unit_price, and price_tier.
 */
export function deduplicateOrderItems<T extends { product_id?: string; unit_price?: number; price_tier?: string; id?: string; quantity?: number }>(items: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.product_id
      ? `${it.product_id}-${it.unit_price}-${formatTierLabel(it.price_tier) || "Custom"}`
      : it.id
        ? String(it.id)
        : `${it.quantity}-${it.unit_price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Clears duplicated rows from local storage (including corrupted orders like ORD-73505232).
 */
export function cleanCorruptedStoredOrders(): Order[] {
  const current = getOrders();
  let changed = false;
  const cleaned = current.map((ord) => {
    const rawItems: any[] = ord.order_items || (ord as any).items;
    if (rawItems && Array.isArray(rawItems)) {
      let itemCleaned = false;
      const deduped: OrderItem[] = deduplicateOrderItems(rawItems).map((item: any, idx: number) => {
        const prodInfo = resolveOrderProduct(item.product, item.product_id);
        if (item.product?.name && /^[=+\-@]/.test(item.product.name)) {
          itemCleaned = true;
        }
        return {
          id: item.id || `item-${ord.id}-${idx}`,
          order_id: item.order_id || ord.id,
          product_id: item.product_id || "",
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
          subtotal: Number(item.subtotal) || 0,
          price_tier: item.price_tier || "Custom",
          created_at: item.created_at || ord.created_at || new Date().toISOString(),
          product: prodInfo.exists ? prodInfo.product : null,
        };
      });
      if (deduped.length !== rawItems.length || ord.order_number === "ORD-73505232" || itemCleaned) {
        changed = true;
        const newSubtotal = r2(deduped.reduce((sum: number, it: any) => sum + Number(it.subtotal || 0), 0));
        const disc = Number(ord.discount) || 0;
        const newTotal = r2(Math.max(0, newSubtotal - disc));
        const paid = Number(ord.paid_amount) || 0;
        const newDue = r2(Math.max(0, newTotal - paid));
        return {
          ...ord,
          order_items: deduped,
          items: deduped,
          subtotal: newSubtotal,
          total_amount: newTotal,
          due_amount: newDue,
        } as Order;
      }
    }
    return ord;
  });

  if (changed) {
    setLocalData(STORAGE_KEYS.ORDERS, cleaned);
  }
  return cleaned;
}

export function OrdersPage() {
  const { t } = useI18n();
  const { profile, user } = useAuth();
  const { query, navigate } = useRouter();

  const isManagerOrAdmin = useMemo(() => {
    const role = (
      profile?.role_name ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      ""
    ).toLowerCase().trim();
    return role.includes("admin") || role.includes("manager");
  }, [profile, user]);

  const currentUserId = profile?.id || user?.id;

  // Strict Edit-Own Permission Rule:
  // - All authenticated Sales Officers can VIEW all orders across the system (Read Access).
  // - Sales Officers can ONLY edit, update, or delete entries created by themselves (sales_rep_id = auth.uid()).
  // - Admins and Managers retain full modification permissions.
  const canModifyOrder = (o?: Order | null): boolean => {
    if (isManagerOrAdmin) return true;
    if (!o) return false;
    return Boolean(currentUserId && o.sales_rep_id && o.sales_rep_id === currentUserId);
  };
  const [loading, setLoading] = useState(() => getOrders().length === 0);
  const [orders, setOrders] = useState<Order[]>(() => cleanCorruptedStoredOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const list = getCustomers();
    return Array.isArray(list) ? list : [];
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const list = getProducts();
    return Array.isArray(list) ? list : [];
  });
  const [search, setSearch] = useState(() => query.search || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [areas, setAreas] = useState<Area[]>(() => getAreas());
  const [areaFilter, setAreaFilter] = useState("");
  const { getUserName, getSalesOfficerById, salesOfficers: contextOfficers } = useUsers();
  const [salesOfficers, setSalesOfficers] = useState<ManagedUser[]>(() => getLocalSalesOfficers());
  const [officerFilter, setOfficerFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [cancelledOrderToUnlink, setCancelledOrderToUnlink] = useState<{
    order: Order;
    paidAmount: number;
  } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Globally accessible User Lookup Map in state, populated synchronously on mount
  const [usersMap, setUsersMap] = useState<Record<string, UserLookupInfo>>(() => buildUserLookupMap(profile));

  // Sync usersMap whenever authenticated user profile changes
  useEffect(() => {
    if (profile?.id) {
      setUsersMap((prev) => {
        if (prev[profile.id]?.full_name === profile.full_name) return prev;
        return {
          ...prev,
          [profile.id]: {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role_name: profile.role_name,
          },
        };
      });
    }
  }, [profile]);

  const officersMap = useMemo(() => {
    const map = new Map<string, ManagedUser>();
    salesOfficers.forEach((so) => map.set(String(so.id), so));
    Object.values(usersMap).forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          email: u.email || "",
          full_name: u.full_name || "",
          role: "sales_officer",
          role_name: u.role_name || "Sales Officer",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    });
    return map;
  }, [salesOfficers, usersMap]);

  // Sync order query parameter from URL (e.g. redirected from customer ledger statement)
  useEffect(() => {
    if (query.order && orders.length > 0) {
      const match = orders.find((o) => o.id === query.order || o.order_number === query.order);
      if (match) {
        view(match);
      }
    }
  }, [query.order, orders]);

  // Sync search query parameter from URL (e.g. redirected from customer ledger)
  useEffect(() => {
    if (query.search !== undefined && query.search !== search) {
      setSearch(query.search);
    }
  }, [query.search]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [usersQueryRes, oRes, cRes, pRes, officersData] = await Promise.all([
          supabase.from("users").select("id, full_name, email, role_name"),
          supabase.from("orders").select("*, customer:customers(name, current_due, address, city, phone, trade_license_number), sales_rep:users(id, full_name, email), order_items(*, product:products(name, sku_code, unit_price))").order("order_date", { ascending: false }),
          supabase.from("customers").select("*").eq("is_active", true).order("name"),
          supabase.from("products").select("*").eq("is_active", true).order("name"),
          fetchActiveSalesOfficers(),
        ]);
        if (!isMounted) return;

        // Build enriched user lookup map from database query, officers list, and orders
        const updatedUsersMap: Record<string, UserLookupInfo> = { ...buildUserLookupMap(profile) };

        if (!usersQueryRes.error && Array.isArray(usersQueryRes.data)) {
          usersQueryRes.data.forEach((u: any) => {
            if (u.id) {
              updatedUsersMap[String(u.id)] = {
                id: String(u.id),
                full_name: u.full_name || u.name || "",
                email: u.email,
                role_name: u.role_name,
              };
            }
          });
        }

        if (Array.isArray(officersData) && officersData.length > 0) {
          officersData.forEach((so) => {
            if (so.id) {
              updatedUsersMap[String(so.id)] = {
                id: String(so.id),
                full_name: so.full_name || updatedUsersMap[String(so.id)]?.full_name || "",
                email: so.email || updatedUsersMap[String(so.id)]?.email,
                role_name: so.role_name || updatedUsersMap[String(so.id)]?.role_name,
              };
            }
          });
          setSalesOfficers(officersData);
        }

        if (!oRes.error && Array.isArray(oRes.data)) {
          (oRes.data as any[]).forEach((ord) => {
            if (ord.sales_rep_id && ord.sales_rep?.full_name) {
              updatedUsersMap[String(ord.sales_rep_id)] = {
                id: String(ord.sales_rep_id),
                full_name: ord.sales_rep.full_name,
                email: ord.sales_rep.email || updatedUsersMap[String(ord.sales_rep_id)]?.email,
              };
            }
          });
        }

        setUsersMap(updatedUsersMap);

        if (!oRes.error && Array.isArray(oRes.data)) {
          const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
          const rawOrders = (oRes.data as Order[]).filter((o: any) => !deletedIds.has(o.id));
          // Clean duplicate line items defensively and fix any inflated totals
          const remoteOrders = rawOrders.map((ord) => {
            const rawItems = ord.order_items || (ord as any).items;
            const repName =
              (ord.sales_rep_id ? getSalesOfficerById(ord.sales_rep_id)?.full_name : null) ||
              (ord.sales_rep_id ? getUserName(ord.sales_rep_id) : null) ||
              (ord.sales_rep_id ? updatedUsersMap[String(ord.sales_rep_id)]?.full_name : null) ||
              ord.sales_rep?.full_name ||
              ord.sales_rep_name ||
              (ord as any).created_by_name ||
              null;

            if (rawItems && Array.isArray(rawItems)) {
              const cleanItems: OrderItem[] = deduplicateOrderItems(rawItems).map((item: any, idx: number) => {
                const prodInfo = resolveOrderProduct(item.product, item.product_id, pRes.data || []);
                return {
                  id: item.id || `item-${ord.id}-${idx}`,
                  order_id: item.order_id || ord.id,
                  product_id: item.product_id || "",
                  quantity: Number(item.quantity) || 1,
                  unit_price: Number(item.unit_price) || 0,
                  discount: Number(item.discount) || 0,
                  subtotal: Number(item.subtotal) || 0,
                  price_tier: item.price_tier || "Custom",
                  created_at: item.created_at || ord.created_at || new Date().toISOString(),
                  product: prodInfo.exists ? prodInfo.product : null,
                };
              });
              const newSubtotal = r2(cleanItems.reduce((sum: number, it: any) => sum + Number(it.subtotal || 0), 0));
              const disc = Number(ord.discount) || 0;
              const newTotal = r2(Math.max(0, newSubtotal - disc));
              const paid = Number(ord.paid_amount) || 0;
              const newDue = r2(Math.max(0, newTotal - paid));
              return {
                ...ord,
                sales_rep_name: repName || ord.sales_rep_name || null,
                created_by_name: repName || (ord as any).created_by_name || null,
                order_items: cleanItems,
                items: cleanItems,
                subtotal: newSubtotal,
                total_amount: newTotal,
                due_amount: newDue,
              } as Order;
            }
            return {
              ...ord,
              sales_rep_name: repName || ord.sales_rep_name || null,
              created_by_name: repName || (ord as any).created_by_name || null,
            } as Order;
          });
          const remoteIdSet = new Set(remoteOrders.map((o) => String(o.id)));
          const remoteOrderNumSet = new Set(
            remoteOrders.map((o) => (o.order_number ? String(o.order_number).trim().toUpperCase() : "")).filter(Boolean)
          );

          // Preserve pending local orders that have not yet been synced to Supabase
          const currentLocal = cleanCorruptedStoredOrders().filter((o: any) => !deletedIds.has(o.id));
          const localByNum = new Map<string, Order>();
          const localById = new Map<string, Order>();
          currentLocal.forEach((lo) => {
            if (lo.id) localById.set(String(lo.id), lo);
            if (lo.order_number) localByNum.set(String(lo.order_number).trim().toUpperCase(), lo);
          });

          // Enrich remote orders if remote has missing line items but local copy has them
          const enrichedRemoteOrders = remoteOrders.map((ro) => {
            const hasItems = (ro.order_items && ro.order_items.length > 0) || ((ro as any).items && (ro as any).items.length > 0);
            if (!hasItems) {
              const num = ro.order_number ? String(ro.order_number).trim().toUpperCase() : "";
              const matchedLocal = (ro.id ? localById.get(String(ro.id)) : undefined) || (num ? localByNum.get(num) : undefined);
              if (matchedLocal && ((matchedLocal.order_items && matchedLocal.order_items.length > 0) || ((matchedLocal as any).items && (matchedLocal as any).items.length > 0))) {
                const items = matchedLocal.order_items || (matchedLocal as any).items;
                return {
                  ...ro,
                  order_items: items,
                  items: items,
                };
              }
            }
            return ro;
          });

          const pendingLocalOrders = currentLocal.filter((lo) => {
            const idMatch = remoteIdSet.has(String(lo.id));
            const numMatch = lo.order_number && remoteOrderNumSet.has(String(lo.order_number).trim().toUpperCase());
            return !idMatch && !numMatch;
          });

          const mergedOrders = [...pendingLocalOrders, ...enrichedRemoteOrders].map((ord) => {
            const repName =
              (ord.sales_rep_id ? getSalesOfficerById(ord.sales_rep_id)?.full_name : null) ||
              (ord.sales_rep_id ? getUserName(ord.sales_rep_id) : null) ||
              (ord.sales_rep_id ? updatedUsersMap[String(ord.sales_rep_id)]?.full_name : null) ||
              ord.sales_rep?.full_name ||
              ord.sales_rep_name ||
              (ord as any).created_by_name ||
              null;
            return {
              ...ord,
              sales_rep_name: repName || ord.sales_rep_name || null,
              created_by_name: repName || (ord as any).created_by_name || null,
            } as Order;
          }).sort(
            (a, b) => new Date(b.order_date || b.created_at || 0).getTime() - new Date(a.order_date || a.created_at || 0).getTime()
          );

          setOrders(mergedOrders);
          saveOrders(mergedOrders);
        } else {
          // Fallback to local storage when remote Supabase fetch fails or is offline
          const fallbackOrders = cleanCorruptedStoredOrders();
          setOrders(fallbackOrders);
        }
        if (!cRes.error && Array.isArray(cRes.data)) {
          const mergedCusts = mergeAndEnrichCustomers(cRes.data as Customer[]);
          setCustomers(mergedCusts);
        }
        if (!pRes.error && Array.isArray(pRes.data)) {
          const localProds = getProducts();
          const localMap = new Map(localProds.map((p) => [String(p.id), p]));
          const mergedProds: Product[] = (pRes.data as Product[]).map((rp: any) => {
            const loc = localMap.get(String(rp.id));
            let candidateTiers = rp.price_tiers;
            if (typeof candidateTiers === "string") {
              try { candidateTiers = JSON.parse(candidateTiers); } catch { candidateTiers = null; }
            }
            const hasRemoteTiers = Array.isArray(candidateTiers) && candidateTiers.length > 0;

            let locTiers = loc?.price_tiers;
            if (typeof locTiers === "string") {
              try { locTiers = JSON.parse(locTiers); } catch { locTiers = null; }
            }
            const hasLocTiers = Array.isArray(locTiers) && (locTiers ?? []).length > 0;

            const resolvedPriceTiers = hasRemoteTiers
              ? candidateTiers
              : (hasLocTiers ? (locTiers ?? []) : (Array.isArray(candidateTiers) ? candidateTiers : []));

            return {
              ...rp,
              price_tiers: resolvedPriceTiers,
              purchase_cost: (loc as any)?.purchase_cost ?? rp.purchase_cost ?? rp.distributor_price,
            } as Product;
          });
          setProducts(mergedProds);
          setLocalData(STORAGE_KEYS.PRODUCTS, mergedProds);
        }
      } catch (err) {
        console.warn("Using cached orders data due to network error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const currentMap = buildUserLookupMap(profile);
      setUsersMap((prev) => ({ ...prev, ...currentMap }));
      setSalesOfficers(getLocalSalesOfficers());
      const cleaned = cleanCorruptedStoredOrders();
      const deletedIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
      const updated = cleaned.filter((o: Order) => !deletedIds.has(o.id));
      setOrders([...updated]);
      const custs = getCustomers();
      setCustomers(Array.isArray(custs) ? [...custs] : []);
      const prods = getProducts();
      setProducts(Array.isArray(prods) ? [...prods] : []);
      setAreas(getAreas());
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);
    window.addEventListener("customer_ledger_updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
      window.removeEventListener("customer_ledger_updated", handleStorageUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return orders.filter((o) => {
      const orderNum = (o.order_number || "").toLowerCase();
      const custName = (o.customer?.name || "").toLowerCase();
      const matchSearch = !s || orderNum.includes(s) || custName.includes(s);
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchArea =
        !areaFilter ||
        (o.customer?.area && o.customer.area.trim().toLowerCase() === areaFilter.trim().toLowerCase()) ||
        (o.customer?.city && o.customer.city.trim().toLowerCase() === areaFilter.trim().toLowerCase());
      const matchOfficer = !officerFilter || String(o.sales_rep_id) === String(officerFilter);
      return matchSearch && matchStatus && matchArea && matchOfficer;
    });
  }, [orders, search, statusFilter, areaFilter, officerFilter]);

  function openNew() {
    setEditingOrder(null);
    setDialogOpen(true);
  }

  function handlePrintInvoice() {
    document.body.classList.add("printing-invoice");
    const cleanup = () => {
      document.body.classList.remove("printing-invoice");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  }

  function openEdit(o: Order) {
    if (!canModifyOrder(o)) {
      toast.error("Permission denied: You can only edit orders created by yourself.");
      return;
    }
    const rawItems: any[] = o.order_items || (o as any).items || [];
    const deduped: OrderItem[] = deduplicateOrderItems(rawItems).map((item: any, idx: number) => ({
      id: item.id || `item-${o.id}-${idx}`,
      order_id: item.order_id || o.id,
      product_id: item.product_id || "",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount: Number(item.discount) || 0,
      subtotal: Number(item.subtotal) || 0,
      price_tier: item.price_tier || "Custom",
      created_at: item.created_at || o.created_at || new Date().toISOString(),
      product: item.product,
    }));
    setEditingOrder({
      ...o,
      order_items: deduped,
      items: deduped,
    } as any);
    setDialogOpen(true);
  }

  async function handleSaveOrder(orderFormData: {
    customer_id: string;
    status: string;
    order_date?: string | null;
    delivery_date?: string | null;
    notes: string;
    discount: number;
    subtotal: number;
    total: number;
    payment_status?: string;
    paymentStatus?: string;
    paid_amount?: number;
    paidAmount?: number;
    due_amount?: number;
    dueAmount?: number;
    payment_method?: string;
    items: OrderItemForm[];
  }) {
    if (!orderFormData.customer_id) {
      toast.error(t("selectCustomer") || "Please select a customer");
      return;
    }
    if (orderFormData.items.length === 0) {
      toast.error(t("addItem") || "Please add at least one item");
      return;
    }

    // Backend/submission handler re-validates stock before inserting/updating non-Draft orders
    if (orderFormData.status !== "Draft") {
      const freshProducts = getProducts();
      const productQuantities = new Map<string, number>();
      for (const it of orderFormData.items) {
        if (!it.product_id) continue;
        const currentSum = productQuantities.get(it.product_id) || 0;
        productQuantities.set(it.product_id, currentSum + (Number(it.quantity) || 0));
      }

      for (const it of orderFormData.items) {
        if (!it.product_id) continue;
        const prod = freshProducts.find((p) => p.id === it.product_id) || (Array.isArray(products) ? products : []).find((p: Product) => p.id === it.product_id);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const origQty = editingOrder && editingOrder.status === "Delivered"
          ? Number(editingOrder.order_items?.find((o: any) => o.product_id === it.product_id)?.quantity || 0)
          : 0;
        const availableStock = baseStock + origQty;
        const requestedQty = Number(it.quantity) || 0;

        if (availableStock <= 0 || requestedQty > availableStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }

      for (const [prodId, totalRequested] of productQuantities.entries()) {
        const prod = freshProducts.find((p) => p.id === prodId) || (Array.isArray(products) ? products : []).find((p: Product) => p.id === prodId);
        const prodName = prod?.name || "Product";
        const baseStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const origQty = editingOrder && editingOrder.status === "Delivered"
          ? Number(editingOrder.order_items?.find((o: any) => o.product_id === prodId)?.quantity || 0)
          : 0;
        const availableStock = baseStock + origQty;

        if (availableStock <= 0 || totalRequested > availableStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const customer = (Array.isArray(customers) ? customers : []).find((c: Customer) => c.id === orderFormData.customer_id);

      if (editingOrder) {
        // --- EDIT EXISTING ORDER ---
        const newTotal = r2(Number(orderFormData.total) || 0);
        const editPaid = Math.max(0, r2(Number(orderFormData.paidAmount ?? orderFormData.paid_amount ?? (editingOrder.paid_amount || 0))));
        const editDue = Math.max(0, r2(Number(orderFormData.dueAmount ?? orderFormData.due_amount ?? (newTotal - editPaid))));
        const editPayStatus = orderFormData.paymentStatus || (editDue <= 0 && newTotal > 0 ? "Full Paid" : editPaid > 0 ? "Partial Payment" : "Full Due");
        const editDbPayStatus: "Paid" | "Partial" | "Unpaid" =
          editPayStatus === "Full Paid" || (editDue <= 0 && newTotal > 0)
            ? "Paid"
            : editPaid > 0
              ? "Partial"
              : "Unpaid";

        const oldDue = Number(editingOrder.due_amount ?? (Number(editingOrder.total_amount) - Number(editingOrder.paid_amount))) || 0;
        const dueDiff = r2(editDue - oldDue);
        const oldPaid = Number(editingOrder.paid_amount) || 0;
        const paidDiff = r2(editPaid - oldPaid);

        // Requirement 1: Replace items property completely with current items array
        const newItemsList = Array.from(orderFormData.items).map((it, i) => {
          const prodInfo = resolveOrderProduct(undefined, it.product_id, Array.isArray(products) ? products : []);
          return {
            id: it.id || `item-${editingOrder.id}-${i}`,
            order_id: editingOrder.id,
            product_id: it.product_id,
            quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
            unit_price: r2(Number(it.unit_price) || 0),
            discount: r2(Number(it.discount) || 0),
            subtotal: r2(Number(it.subtotal) || 0),
            price_tier: it.price_tier || "Custom",
            created_at: editingOrder.created_at,
            product: prodInfo.exists ? prodInfo.product : null,
          };
        });

        const currentOfficerName =
          (editingOrder.sales_rep_id ? getSalesOfficerById(editingOrder.sales_rep_id)?.full_name : null) ||
          (editingOrder.sales_rep_id ? getUserName(editingOrder.sales_rep_id) : null) ||
          (editingOrder.sales_rep_id ? usersMap[String(editingOrder.sales_rep_id)]?.full_name : null) ||
          editingOrder.sales_rep?.full_name ||
          editingOrder.sales_rep_name ||
          profile?.full_name ||
          user?.user_metadata?.full_name ||
          "Sales Officer";

        const updatedOrderRecord: Order & { items?: any[] } = {
          ...editingOrder,
          customer_id: orderFormData.customer_id,
          sales_rep_id: editingOrder.sales_rep_id || profile?.id || user?.id || null,
          sales_rep_name: currentOfficerName,
          created_by_name: (editingOrder as any).created_by_name || currentOfficerName,
          status: (orderFormData.status || editingOrder.status) as any,
          delivery_date: orderFormData.delivery_date || null,
          notes: sanitizeFormulaInput(orderFormData.notes) || null,
          discount: r2(Number(orderFormData.discount || 0)),
          subtotal: r2(Number(orderFormData.subtotal || 0)),
          total_amount: newTotal,
          due_amount: editDue,
          dueAmount: editDue,
          paid_amount: editPaid,
          paidAmount: editPaid,
          payment_status: editDbPayStatus,
          paymentStatus: editPayStatus,
          updated_at: new Date().toISOString(),
          customer: customer || editingOrder.customer,
          // Requirement: In Local Storage (STORAGE_KEYS.ORDERS), replace items property completely with current items array
          order_items: newItemsList,
          items: Array.from(newItemsList),
        };

        // 1. Optimistically update local order state and storage (complete replacement)
        setOrders((prev) => prev.map((item) => (item.id === editingOrder.id ? updatedOrderRecord : item)));
        const currentStoredOrders = getOrders();
        const nextStoredOrders = currentStoredOrders.map((item) => (item.id === editingOrder.id ? updatedOrderRecord : item));
        saveOrders(nextStoredOrders);

        let nextCollections = getCollections();
        if (paidDiff > 0) {
          const colNumber = generateCollectionNumber(nextCollections);
          const colId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `col-${Date.now()}`;
          const colCreatedIso = new Date(Date.now() + 1000).toISOString();
          const details = orderFormData.customer_id ? getCustomerLedgerDetails(orderFormData.customer_id) : null;
          const prevDueCalc = details ? details.currentDue : Number(customer?.current_due ?? 0);
          const remDueCalc = Math.max(0, r2(prevDueCalc - paidDiff));
          const newCollection: Collection = {
            id: colId,
            collection_number: colNumber,
            customer_id: orderFormData.customer_id,
            order_id: editingOrder.id,
            amount: paidDiff,
            payment_method: (orderFormData.payment_method as any) || "Cash",
            collection_date: orderFormData.order_date || new Date().toISOString(),
            collected_by: profile?.id ?? null,
            previous_due: prevDueCalc,
            remaining_due: remDueCalc,
            previousDue: prevDueCalc,
            remainingDue: remDueCalc,
            notes: `Payment for order ${editingOrder.order_number} (${editPayStatus})`,
            created_at: colCreatedIso,
            customer: customer ? { ...customer } : undefined,
          };
          nextCollections = deduplicateCollections([newCollection, ...nextCollections]);
          saveCollections(nextCollections);

          supabase.from("collections").insert({
            id: colId,
            collection_number: colNumber,
            customer_id: orderFormData.customer_id,
            order_id: editingOrder.id,
            amount: paidDiff,
            payment_method: (orderFormData.payment_method as any) || "Cash",
            collection_date: orderFormData.order_date || new Date().toISOString(),
            collected_by: profile?.id ?? null,
            notes: `Payment for order ${editingOrder.order_number} (${editPayStatus})`,
            created_at: colCreatedIso,
          }).then(({ error: colErr }) => {
            if (colErr) console.warn("Supabase collection insert on edit notice:", colErr.message);
          });
        }

        // 2b. If order is marked as Cancelled, void any associated collections to prevent orphaned credits
        if (orderFormData.status === "Cancelled" && editingOrder.status !== "Cancelled") {
          const { voidedCount, voidedAmount, collections: purgedCols } = voidOrderCollections(editingOrder.id, editingOrder.order_number);
          nextCollections = purgedCols;
          if (voidedCount > 0) {
            toast.info(`Voided ${voidedCount} linked collection(s) (${formatBDT(voidedAmount)}) for cancelled order.`);
          }
        }

        // 2c. Recalculate customer due using master recalculateCustomerLedger WITH updated collections
        if (orderFormData.customer_id) {
          recalculateCustomerLedger(orderFormData.customer_id, nextStoredOrders, nextCollections, { persist: true });
        }
        if (editingOrder.customer_id && editingOrder.customer_id !== orderFormData.customer_id) {
          recalculateCustomerLedger(editingOrder.customer_id, nextStoredOrders, nextCollections, { persist: true });
        }
        setCustomers(getCustomers());

        // 3. Adjust product stock differences only if previous or new status was Delivered
        const wasDelivered = editingOrder.status === "Delivered";
        const isDelivered = orderFormData.status === "Delivered";

        const oldItemQtyMap = new Map<string, number>();
        editingOrder.order_items?.forEach((it) => {
          oldItemQtyMap.set(it.product_id, (oldItemQtyMap.get(it.product_id) || 0) + Number(it.quantity || 0));
        });
        const newItemQtyMap = new Map<string, number>();
        orderFormData.items.forEach((it) => {
          newItemQtyMap.set(it.product_id, (newItemQtyMap.get(it.product_id) || 0) + Number(it.quantity || 0));
        });

        const allProductIds = new Set([...oldItemQtyMap.keys(), ...newItemQtyMap.keys()]);
        if (allProductIds.size > 0 && (wasDelivered || isDelivered)) {
          allProductIds.forEach((prodId) => {
            const prevDeducted = wasDelivered ? (oldItemQtyMap.get(prodId) || 0) : 0;
            const nextDeducted = isDelivered ? (newItemQtyMap.get(prodId) || 0) : 0;
            const diff = nextDeducted - prevDeducted;
            if (diff !== 0) {
              // Positive diff: more items delivered -> deduct stock (-diff)
              // Negative diff: fewer items delivered -> restore stock (+abs(diff))
              adjustProductStock(prodId, -diff, "Main Warehouse");
            }
          });
          setProducts(getProducts());
        }

        toast.success(t("updated"));
        setDialogOpen(false);
        setEditingOrder(null);

        // 4. Requirement 1: In Supabase, update order, delete/clear existing order_items, then insert updated items array
        try {
          const { error: orderUpdateErr } = await supabase
            .from("orders")
            .update({
              customer_id: orderFormData.customer_id,
              status: orderFormData.status,
              order_date: orderFormData.order_date || editingOrder.order_date || new Date().toISOString(),
              delivery_date: orderFormData.delivery_date ? orderFormData.delivery_date : null,
              notes: orderFormData.notes?.trim() || null,
              discount: r2(Number(orderFormData.discount || 0)),
              subtotal: r2(Number(orderFormData.subtotal || 0)),
              total_amount: r2(Number(newTotal || 0)),
              due_amount: r2(Number(editDue || 0)),
              paid_amount: r2(Number(editPaid || 0)),
              payment_status: editDbPayStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingOrder.id);

          if (orderUpdateErr) {
            console.warn("Supabase order update notice:", orderUpdateErr.message);
          }

          // First delete/clear existing order_items for order_id in Supabase
          const { error: delErr } = await supabase
            .from("order_items")
            .delete()
            .eq("order_id", editingOrder.id);

          if (delErr) {
            console.warn("Supabase order_items delete notice:", delErr.message);
          }

          // Then insert the updated items array
          if (orderFormData.items.length > 0) {
            const dbItemsPayload = orderFormData.items.map((it) => ({
              order_id: editingOrder.id,
              product_id: it.product_id,
              quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
              unit_price: r2(Number(it.unit_price) || 0),
              discount: r2(Number(it.discount) || 0),
              subtotal: r2(Number(it.subtotal) || 0),
              price_tier: it.price_tier || "DP",
            }));
            const { error: itemsErr } = await supabase.from("order_items").insert(dbItemsPayload);
            if (itemsErr) console.warn("Supabase order_items re-insert notice:", itemsErr.message);
          }
        } catch (syncErr: any) {
          console.warn("Supabase order edit sync exception:", syncErr?.message || syncErr);
        }

        dispatchGlobalStateUpdate({ customerId: orderFormData.customer_id, type: "order_updated" });
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
      } else {
        // --- CREATE NEW ORDER ---
        const total = r2(Number(orderFormData.total || 0));
        const paid = Math.max(0, r2(Number(orderFormData.paidAmount ?? orderFormData.paid_amount ?? 0)));
        const due = Math.max(0, r2(Number(orderFormData.dueAmount ?? orderFormData.due_amount ?? (total - paid))));
        const payStatus = orderFormData.paymentStatus || (due <= 0 && total > 0 ? "Full Paid" : paid > 0 ? "Partial Payment" : "Full Due");
        const dbPayStatus: "Paid" | "Partial" | "Unpaid" =
          payStatus === "Full Paid" || (due <= 0 && total > 0)
            ? "Paid"
            : paid > 0
              ? "Partial"
              : "Unpaid";

        const orderNumber = generateOrderNumber(orders);
        const tempId = crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}`;

        const currentOfficerName = profile?.full_name || user?.user_metadata?.full_name || (user as any)?.name || "Sales Officer";

        const additionalCash = (orderFormData as any).additional_paid !== undefined
          ? Number((orderFormData as any).additional_paid)
          : ((orderFormData as any).advance_applied
            ? Math.max(0, r2(paid - Number((orderFormData as any).advance_applied)))
            : paid);

        // CRIT-003: Prevent draft order advance collection asymmetry
        const isDraftWithPayment = (orderFormData.status === "Draft") && additionalCash > 0;
        const effectiveStatus = isDraftWithPayment ? "Pending" : (orderFormData.status || "Pending");

        const newOrderRecord: Order = {
          id: tempId,
          order_number: orderNumber,
          customer_id: orderFormData.customer_id,
          sales_rep_id: profile?.id || user?.id || null,
          sales_rep_name: currentOfficerName,
          created_by_name: currentOfficerName,
          sales_rep: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
          order_date: orderFormData.order_date || new Date().toISOString(),
          delivery_date: orderFormData.delivery_date ? orderFormData.delivery_date : null,
          status: effectiveStatus as any,
          subtotal: r2(Number(orderFormData.subtotal || 0)),
          discount: r2(Number(orderFormData.discount || 0)),
          total_amount: total,
          paid_amount: paid,
          paidAmount: paid,
          due_amount: due,
          dueAmount: due,
          payment_status: dbPayStatus,
          paymentStatus: payStatus,
          notes: sanitizeFormulaInput(orderFormData.notes) || null,
          created_at: orderFormData.order_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer: customer || undefined,
          order_items: orderFormData.items.map((it, i) => {
            const prodInfo = resolveOrderProduct(undefined, it.product_id, Array.isArray(products) ? products : []);
            return {
              id: `item-${tempId}-${i}`,
              order_id: tempId,
              product_id: it.product_id,
              quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
              unit_price: r2(Number(it.unit_price) || 0),
              discount: r2(Number(it.discount) || 0),
              subtotal: r2(Number(it.subtotal) || 0),
              price_tier: it.price_tier || "Custom",
              created_at: new Date().toISOString(),
              product: prodInfo.exists ? prodInfo.product : null,
            };
          }),
        };

        // 1. Instant local mutation (outside updater to prevent re-entrant dispatch)
        setOrders((prev) => [newOrderRecord, ...prev]);
        const currentOrders = getOrders();
        const nextOrders = [newOrderRecord, ...currentOrders.filter((o) => o.id !== tempId)];
        saveOrders(nextOrders);

        // 1b. Record additional cash payment into Cash/Accounts ledger (Collections)
        // If payment was covered by existing advance deposit, do NOT create redundant collection
        let nextCollections = getCollections();

        if (additionalCash > 0) {
          const colNumber = generateCollectionNumber(nextCollections);
          const colId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `col-${Date.now()}`;
          const colCreatedIso = new Date(Date.now() + 1000).toISOString();
          const details = orderFormData.customer_id
            ? getCustomerLedgerDetails(orderFormData.customer_id, nextOrders, undefined, { persist: false })
            : null;
          const prevDueCalc = details ? details.currentDue : Number(customer?.current_due ?? 0);
          const remDueCalc = Math.max(0, r2(prevDueCalc - additionalCash));
          const newCollection: Collection = {
            id: colId,
            collection_number: colNumber,
            customer_id: orderFormData.customer_id,
            order_id: tempId,
            amount: additionalCash,
            payment_method: (orderFormData.payment_method as any) || "Cash",
            collection_date: orderFormData.order_date || new Date().toISOString(),
            collected_by: profile?.id || user?.id || null,
            collector_name: currentOfficerName,
            collected_by_name: currentOfficerName,
            collector: profile ? ({ id: profile.id, full_name: profile.full_name, email: profile.email } as any) : undefined,
            previous_due: prevDueCalc,
            remaining_due: remDueCalc,
            previousDue: prevDueCalc,
            remainingDue: remDueCalc,
            notes: `Order ${orderNumber} payment (${payStatus})`,
            created_at: colCreatedIso,
            customer: customer ? { ...customer } : undefined,
          };
          nextCollections = deduplicateCollections([newCollection, ...nextCollections]);
          saveCollections(nextCollections);

          // Background Supabase collection insert with matching ID and subsequent timestamp
          supabase
            .from("collections")
            .insert({
              id: colId,
              collection_number: colNumber,
              customer_id: orderFormData.customer_id,
              order_id: tempId,
              amount: additionalCash,
              payment_method: (orderFormData.payment_method as any) || "Cash",
              collection_date: orderFormData.order_date || new Date().toISOString(),
              collected_by: profile?.id ?? null,
              notes: `Order ${orderNumber} payment (${payStatus})`,
              created_at: colCreatedIso,
            })
            .then(({ error: colErr }) => {
              if (colErr) console.warn("Notice inserting collection to Supabase:", colErr.message);
            });
        }

        // 1c. Recalculate customer due using master recalculateCustomerLedger WITH the new collection
        if (orderFormData.customer_id) {
          recalculateCustomerLedger(orderFormData.customer_id, nextOrders, nextCollections, { persist: true });
          setCustomers(getCustomers());
        }

        // 1d. Deduct product stock & log Stock Out transactions if order status is "Delivered"
        if (orderFormData.status === "Delivered") {
          const existingTx = getLocalData<any>(STORAGE_KEYS.TRANSACTIONS, []);
          const newTransactions: any[] = [];
          const nowIso = new Date().toISOString();

          orderFormData.items.forEach((it, idx) => {
            const qty = Number(it.quantity || 0);
            if (qty <= 0) return;

            // Single source of truth for stock reduction
            adjustProductStock(it.product_id, -qty, "Main Warehouse");

            const prod = (Array.isArray(products) ? products : []).find((p: Product) => p.id === it.product_id);
            newTransactions.push({
              id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `tx-${Date.now()}-${idx}`,
              product_id: it.product_id,
              transaction_type: "Stock Out",
              quantity: qty,
              from_warehouse: "Main Warehouse",
              to_warehouse: `Customer: ${customer?.name || "Customer"}`,
              reference: orderNumber,
              notes: `Order ${orderNumber} marked as Delivered`,
              performed_by: profile?.id ?? null,
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

          setProducts(getProducts());
        }

        dispatchGlobalStateUpdate({ customerId: orderFormData.customer_id, type: "order_created" });
        window.dispatchEvent(new Event("sales_erp_storage_update"));
        window.dispatchEvent(new Event("storage"));
        toast.success(t("created"));
        setDialogOpen(false);

        // 2. Background persistence: Attempt RPC first, fallback to direct table inserts
        const dbOrderPayload = {
          order_number: orderNumber,
          customer_id: orderFormData.customer_id,
          sales_rep_id: profile?.id ?? null,
          status: orderFormData.status || "Pending",
          order_date: orderFormData.order_date || new Date().toISOString(),
          subtotal: r2(Number(orderFormData.subtotal || 0)),
          discount: r2(Number(orderFormData.discount || 0)),
          total_amount: r2(Number(orderFormData.total || 0)),
          due_amount: due,
          paid_amount: paid,
          payment_status: dbPayStatus,
          notes: orderFormData.notes?.trim() || null,
          delivery_date: orderFormData.delivery_date ? orderFormData.delivery_date : null,
        };

        const handleReconcileOrder = (createdServerId: string) => {
          setOrders((prev) => {
            const reconciled = prev.map((item) =>
              item.id === tempId ? { ...item, id: createdServerId } : item
            );
            return reconciled;
          });
          const stored = getOrders();
          const reconciledStored = stored.map((item) =>
            item.id === tempId ? { ...item, id: createdServerId } : item
          );
          saveOrders(reconciledStored);
        };

        const insertDirectly = async () => {
          try {
            const { data: orderData, error: orderErr } = await supabase
              .from("orders")
              .insert(dbOrderPayload)
              .select("id")
              .single();

            if (orderErr) {
              console.warn("Direct Supabase order insert error (persisted locally):", orderErr.message);
              return;
            }

            if (orderData && orderData.id) {
              const realOrderId = orderData.id;
              handleReconcileOrder(realOrderId);

              // Insert line items
              if (orderFormData.items.length > 0) {
                const dbItemsPayload = orderFormData.items.map((it) => ({
                  order_id: realOrderId,
                  product_id: it.product_id,
                  quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
                  unit_price: r2(Number(it.unit_price) || 0),
                  discount: r2(Number(it.discount) || 0),
                  subtotal: r2(Number(it.subtotal) || 0),
                  price_tier: it.price_tier || "DP",
                }));

                const { error: itemsErr } = await supabase
                  .from("order_items")
                  .insert(dbItemsPayload);

                if (itemsErr) {
                  console.warn("Direct Supabase order_items insert error:", itemsErr.message);
                } else {
                  // Note: Product stock reduction for "Delivered" orders is already handled
                  // centrally via adjustProductStock above (single source of truth).
                  // Do NOT decrement remote stock here to prevent double deduction.

                  // Update customer current_due in Supabase using master recalculateCustomerLedger
                  if (orderFormData.customer_id) {
                    try {
                      const ledgerRes = recalculateCustomerLedger(orderFormData.customer_id, undefined, undefined, { persist: true });
                      await supabase
                        .from("customers")
                        .update({ current_due: ledgerRes.currentDue, due_status: ledgerRes.dueStatus })
                        .eq("id", orderFormData.customer_id);
                    } catch (e) {
                      console.warn("Notice updating remote customer due on direct insert:", e);
                    }
                  }
                }
              }
            }
          } catch (directErr: any) {
            console.warn("Fallback direct order insert exception (persisted locally):", directErr?.message || directErr);
          }
        };

        const rpcOrderData = {
          ...dbOrderPayload,
          subtotal: String(dbOrderPayload.subtotal),
          discount: String(dbOrderPayload.discount),
          total_amount: String(dbOrderPayload.total_amount),
          due_amount: String(dbOrderPayload.due_amount),
          paid_amount: String(dbOrderPayload.paid_amount),
          delivery_date: dbOrderPayload.delivery_date ? dbOrderPayload.delivery_date : null,
        };

        const rpcItemsInserts = orderFormData.items.map((it) => ({
          product_id: it.product_id,
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
          discount: String(r2(Number(it.discount || 0))),
          subtotal: String(it.subtotal ?? 0),
          price_tier: it.price_tier ?? "DP",
        }));

        const invokeRpcOrFallback = async () => {
          try {
            const { data, error } = await supabase.rpc("create_order_with_items", {
              p_order_data: rpcOrderData,
              p_items: rpcItemsInserts,
            });

            if (error || !data || !data.id) {
              if (error) console.warn("RPC create_order_with_items error, falling back to direct table inserts:", error.message);
              await insertDirectly();
            } else {
              handleReconcileOrder(data.id);
            }
          } catch (err: any) {
            console.warn("RPC invocation exception, falling back to direct table inserts:", err?.message || err);
            await insertDirectly();
          }
        };

        invokeRpcOrFallback();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(o: Order, status: any) {
    const oldStatus = o.status;
    if (oldStatus === status) return;

    if (!canModifyOrder(o)) {
      toast.error("Permission denied: You can only update orders created by yourself.");
      return;
    }

    // 1. Instant local mutation
    setOrders((prev) => prev.map((item) => (item.id === o.id ? { ...item, status, updated_at: new Date().toISOString() } : item)));
    const currentOrders = getOrders();
    const nextOrders = currentOrders.map((item) => (item.id === o.id ? { ...item, status, updated_at: new Date().toISOString() } : item));
    saveOrders(nextOrders);

    // If order is cancelled, revert customer due, restore product stock, and void linked collections
    if ((status === "Cancelled" && oldStatus !== "Cancelled") || (oldStatus === "Cancelled" && status !== "Cancelled")) {
      let activeCols = getCollections();
      if (status === "Cancelled") {
        const { voidedCount, voidedAmount, collections: purgedCols } = voidOrderCollections(o.id, o.order_number);
        activeCols = purgedCols;
        if (voidedCount > 0) {
          toast.info(`Voided ${voidedCount} linked collection(s) (${formatBDT(voidedAmount)}) for cancelled order.`);
        }
      }
      if (o.customer_id) {
        recalculateCustomerLedger(o.customer_id, nextOrders, activeCols, { persist: true });
        setCustomers(getCustomers());
      }
    }

    // Inventory Stock Quantity & Transactions handling per order status:
    // a) Delivered: Decreases product stock_quantity by the ordered amount.
    // b) Cancelled / Reverted (from Delivered): Restores/increases stock_quantity back.
    // c) Pending / Approved / Draft: Ensures main inventory stock is NOT prematurely deducted.
    const isNowDelivered = status === "Delivered";
    const wasDelivered = oldStatus === "Delivered";

    const orderItemsList = (o.order_items && o.order_items.length > 0)
      ? o.order_items
      : (currentOrders.find((it) => it.id === o.id)?.order_items || []);

    // Strict stock validation when status is set to Pending, Approved, or Delivered
    const isEnforcingStock = ["Pending", "Approved", "Delivered"].includes(status);
    if (orderItemsList.length > 0 && isEnforcingStock && (oldStatus === "Draft" || isNowDelivered)) {
      const freshProds = getProducts();
      for (const it of orderItemsList) {
        const prod = freshProds.find((p: Product) => p.id === it.product_id);
        const prodName = prod?.name || "Product";
        const curStock = Math.max(0, Number(prod?.stock_quantity ?? (prod as any)?.stock ?? 0));
        const reqQty = Number(it.quantity) || 0;
        if (curStock <= 0 || reqQty > curStock) {
          toast.error(`Insufficient stock available for ${prodName}`);
          return;
        }
      }
    }

    if (orderItemsList.length > 0 && wasDelivered !== isNowDelivered) {
      const isDeducting = isNowDelivered; // true = Stock Out (-qty), false = Stock In (+qty)
      const txType: "Stock Out" | "Stock In" = isDeducting ? "Stock Out" : "Stock In";
      const txNotes = isDeducting
        ? `Order ${o.order_number} marked as Delivered`
        : status === "Cancelled"
          ? `Order ${o.order_number} cancelled (stock restored)`
          : `Order ${o.order_number} status reverted to ${status} (stock restored)`;

      // 1. Calculate per-product delta
      const itemMap = new Map<string, number>();
      orderItemsList.forEach((it: any) => {
        const q = Number(it.quantity) || 0;
        if (q > 0 && it.product_id) {
          itemMap.set(it.product_id, (itemMap.get(it.product_id) || 0) + q);
        }
      });

      // 2. Mutate products state & localStorage & Supabase using single source of truth adjustProductStock
      itemMap.forEach((qty, prodId) => {
        adjustProductStock(prodId, isDeducting ? -qty : qty, "Main Warehouse");
      });
      const nextProds = getProducts();
      setProducts(nextProds);

      // 4. Log Stock Transactions
      const newTransactions: StockTransaction[] = orderItemsList.map((it: any, idx: number): StockTransaction => {
        const targetProduct = nextProds.find((p: Product) => p.id === it.product_id) || it.product;
        return {
          id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}-${idx}`,
          product_id: it.product_id,
          transaction_type: txType,
          quantity: Number(it.quantity) || 1,
          from_warehouse: "Main",
          to_warehouse: "Main",
          reference: o.order_number,
          notes: txNotes,
          performed_by: profile?.id ?? null,
          transaction_date: new Date().toISOString(),
          product: targetProduct,
        };
      });

      const existingTx: StockTransaction[] = getLocalData<StockTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
      const updatedTx: StockTransaction[] = [...newTransactions, ...(Array.isArray(existingTx) ? existingTx : [])];
      setLocalData(STORAGE_KEYS.TRANSACTIONS, updatedTx);

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

      supabase.from("stock_transactions").insert(dbTxPayload).then(undefined, (err) => {
        console.warn("Supabase stock_transactions insert error:", err);
      });
    }

    dispatchGlobalStateUpdate({ customerId: o.customer_id, type: "order_status_changed" });
    toast.success(t("updated"));

    // 2. Background persistence
    const { error } = await supabase.from("orders").update({ status }).eq("id", o.id);
    if (error) console.warn("Supabase order status update notice:", error.message);
  }

  const proceedDeleteOrder = (id: string) => {
    const o = orders.find((ord) => String(ord.id) === String(id)) || getOrders().find((ord) => String(ord.id) === String(id));
    const updated = deleteOrder(id);
    if ((updated as any)?.success === false) {
      toast.error((updated as any)?.error || "Failed to delete order");
      return;
    }
    setOrders([...updated]); // Spread operator creates a new array reference to force immediate React re-render
    setCustomers(getCustomers());
    setProducts(getProducts());
    if (o?.customer_id) {
      recalculateCustomerLedger(o.customer_id, updated, undefined, { persist: true });
      dispatchGlobalStateUpdate({ customerId: o.customer_id, type: "customer_ledger_updated" });
    }
    window.dispatchEvent(new Event("sales_erp_storage_update"));
    window.dispatchEvent(new Event("storage"));
    toast.success(t("deleted"));
  };

  const handleDeleteOrder = (id: string, confirmed = false) => {
    const o = orders.find((ord) => String(ord.id) === String(id)) || getOrders().find((ord) => String(ord.id) === String(id));
    if (o && !canModifyOrder(o)) {
      toast.error("Permission denied: You can only delete orders created by yourself.");
      return;
    }
    const orderNumber = o?.order_number || id;
    const paidAmount = Number(o?.paid_amount ?? (o as any)?.paidAmount ?? 0);

    const allCollections = getCollections();
    const linkedCols = allCollections.filter(
      (c: any) =>
        String(c.order_id) === String(id) ||
        (o?.order_number && String(c.reference) === String(o.order_number))
    );
    const hasLinkedCollection = linkedCols.length > 0;
    const linkedTotal = linkedCols.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const effectivePaid = paidAmount > 0 ? paidAmount : linkedTotal;

    const isCancelled = o?.status === "Cancelled";

    if (isCancelled && (effectivePaid > 0 || hasLinkedCollection)) {
      if (!confirmed) {
        setCancelledOrderToUnlink({
          order: o!,
          paidAmount: effectivePaid,
        });
        return;
      }
    } else if (paidAmount > 0 || hasLinkedCollection) {
      toast.error(
        `Cannot delete order ${orderNumber} because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.`
      );
      return;
    }

    if (!confirmed) {
      setOrderToDelete(o || ({ id, order_number: orderNumber } as Order));
      return;
    }

    proceedDeleteOrder(id);
  };

  const remove = (o: Order) => {
    handleDeleteOrder(o.id);
  };

  function view(o: Order) {
    const rawItems: any[] = o.order_items || (o as any).items || [];
    const deduped: OrderItem[] = deduplicateOrderItems(rawItems).map((item: any, idx: number) => ({
      id: item.id || `item-${o.id}-${idx}`,
      order_id: item.order_id || o.id,
      product_id: item.product_id || "",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount: Number(item.discount) || 0,
      subtotal: Number(item.subtotal) || 0,
      price_tier: item.price_tier || "Custom",
      created_at: item.created_at || o.created_at || new Date().toISOString(),
      product: item.product,
    }));
    setViewing({
      ...o,
      order_items: deduped,
      items: deduped,
    } as any);
    setViewOpen(true);
  }

  function handleExport() {
    exportToExcel("orders", filtered.map((o) => ({
      OrderNo: o.order_number, Customer: o.customer?.name ?? "",
      Date: formatDate(o.order_date), Status: o.status,
      Total: o.total_amount, Paid: o.paid_amount, Due: o.due_amount,
      Payment: o.payment_status,
    })));
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
            <option value="">{t("selectStatus")}</option>
            {statuses.map((s) => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
          </Select>
          <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="sm:w-40">
            <option value="">All Areas</option>
            {areas.map((ar) => (
              <option key={ar.id} value={ar.name}>
                {ar.name}
              </option>
            ))}
          </Select>
          <Select value={officerFilter} onChange={(e) => setOfficerFilter(e.target.value)} className="sm:w-44">
            <option value="">All Officers</option>
            {(contextOfficers && contextOfficers.length > 0 ? contextOfficers : salesOfficers).map((so) => (
              <option key={so.id} value={so.id}>
                {so.full_name || so.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> {t("exportExcel")}</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> {t("addOrder")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {statuses.map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          const config = getOrderStatusConfig(s);
          const Icon = config.icon;
          const isSelected = statusFilter === s;
          return (
            <Card
              key={s}
              className={cn(
                "transition-all duration-200 border cursor-pointer hover:shadow-sm",
                config.border,
                isSelected ? `${config.activeBorder} ring-2 ring-primary/40 shadow-sm` : "hover:border-primary/30"
              )}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              title={`Click to filter by ${s}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs",
                      config.badge
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                    {t(s.toLowerCase()) || s}
                  </span>
                  <p className="text-2xl font-bold mt-2 font-mono tracking-tight">{count}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", config.iconBg)}>
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto relative max-w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="h-10 w-10" />} title={t("noData")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orderNumber")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>Sales Officer</TableHead>
                  <TableHead>{t("orderDate")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("total")}</TableHead>
                  <TableHead className="text-right">{t("dueAmount")}</TableHead>
                  <TableHead className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => view(o)}
                        className="font-mono text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors text-left"
                        title="Click to view order details & invoice"
                      >
                        {o.order_number}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const target = (Array.isArray(customers) ? customers : []).find((c: Customer) => c.id === o.customer_id) || {
                              id: o.customer_id || `cust-${o.id}`,
                              name: o.customer?.name || (o as any).customer_name || "Customer",
                              opening_balance: 0,
                              current_due: o.due_amount,
                              due_status: o.due_amount > 0 ? "Partial" : "Clear",
                              is_active: true,
                              created_at: o.created_at,
                              customer_type: "Retailer",
                            } as Customer;
                            setSelectedLedgerCustomer(target);
                            setLedgerOpen(true);
                          }}
                          className="font-medium text-left text-foreground hover:text-primary hover:underline transition-colors"
                          title="View Customer Ledger Statement"
                        >
                          {o.customer?.name ?? "—"}
                        </button>
                        {o.customer?.name && (
                          <button
                            type="button"
                            onClick={() => navigate(`/customers?search=${encodeURIComponent(o.customer?.name || "")}`)}
                            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                            title="Go to Customer in CRM"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/80 text-foreground border border-border/60 whitespace-nowrap">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {getUserName(
                          o.sales_rep_id,
                          o.sales_rep?.full_name || o.sales_rep_name || (o as any).created_by_name
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(o.order_date)}</TableCell>
                    <TableCell>
                      {canModifyOrder(o) ? (
                        <div className="relative inline-flex items-center">
                          <select
                            value={o.status}
                            onChange={(e) => updateStatus(o, e.target.value)}
                            className={cn(
                              "h-7 text-xs font-semibold rounded-full border px-2.5 py-0.5 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all shadow-2xs",
                              getOrderStatusBadgeClass(o.status)
                            )}
                            title={`Current status: ${o.status}. Click to change.`}
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s} className="bg-background text-foreground font-normal">
                                {t(s.toLowerCase()) || s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-60" />
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-not-allowed opacity-80",
                            getOrderStatusBadgeClass(o.status)
                          )}
                          title="Status is read-only (created by another Sales Officer)"
                        >
                          {t(o.status.toLowerCase()) || o.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatBDT(o.total_amount)}</TableCell>
                    <TableCell className="text-right">{o.due_amount > 0 ? <span className="text-amber-600">{formatBDT(o.due_amount)}</span> : "—"}</TableCell>
                    <TableCell className="text-right sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                      <div className="whitespace-nowrap flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => view(o)} title={t("viewAll")}><Eye className="h-3.5 w-3.5" /></Button>
                        {canModifyOrder(o) ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title={t("edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(o.id)} title={t("delete")}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              className="opacity-30 cursor-not-allowed"
                              title="Only the creator can edit this order"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              className="opacity-30 cursor-not-allowed"
                              title="Only the creator can delete this order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Order Modal */}
      <AddOrderModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        customers={Array.isArray(customers) ? customers : []}
        products={Array.isArray(products) ? products : []}
        onSave={handleSaveOrder}
        saving={saving}
      />

      {/* View dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} title={viewing?.order_number} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintInvoice}><Printer className="h-4 w-4" /> {t("print")}</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("customer")}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{viewing.customer?.outlet_name || viewing.customer?.name}</p>
                  {(viewing.customer?.party_code || (Array.isArray(customers) ? customers.find((c: Customer) => c.id === viewing.customer_id)?.party_code : null)) && (
                    <Badge variant="outline" className="font-mono text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                      {viewing.customer?.party_code || (Array.isArray(customers) ? customers.find((c: Customer) => c.id === viewing.customer_id)?.party_code : null)}
                    </Badge>
                  )}
                </div>
              </div>
              <div><p className="text-xs text-muted-foreground">{t("orderDate")}</p><p className="font-medium">{formatDate(viewing.order_date)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Sales Officer</p>
                <p className="font-medium">
                  {getUserName(
                    viewing.sales_rep_id,
                    viewing.sales_rep?.full_name || viewing.sales_rep_name || (viewing as any).created_by_name
                  )}
                </p>
              </div>
              <div><p className="text-xs text-muted-foreground">{t("status")}</p><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", getOrderStatusBadgeClass(viewing.status))}>{t(viewing.status.toLowerCase()) || viewing.status}</span></div>
              <div><p className="text-xs text-muted-foreground">{t("paymentStatus")}</p><Badge variant="secondary" className="text-[10px]">{t(viewing.payment_status.toLowerCase())}</Badge></div>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>{t("product")}</TableHead><TableHead className="text-right">{t("quantity")}</TableHead><TableHead>{t("priceTier")}</TableHead><TableHead className="text-right">{t("unitPrice")}</TableHead><TableHead className="text-right">{t("subtotal")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deduplicateOrderItems(viewing.order_items || (viewing as any).items || []).map((it: any) => {
                    const prodInfo = resolveOrderProduct(it.product, it.product_id, products);
                    return (
                      <TableRow key={it.id || `${it.product_id}-${it.unit_price}`}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            {prodInfo.exists ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewOpen(false);
                                    navigate(`/products?search=${encodeURIComponent(prodInfo.name || prodInfo.sku_code || "")}`);
                                  }}
                                  className="font-medium text-left text-primary hover:underline hover:text-primary/80 transition-colors"
                                  title="View product in Products catalog"
                                >
                                  {prodInfo.name}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewOpen(false);
                                    navigate(`/inventory?search=${encodeURIComponent(prodInfo.name || prodInfo.sku_code || "")}`);
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded transition-colors"
                                  title="View product stock & transactions in Inventory"
                                >
                                  Stock
                                </button>
                              </>
                            ) : (
                              <span className="font-medium text-destructive/90 italic">
                                [Deleted Product]
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                        <TableCell className="text-sm">
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                            title={
                              (formatTierLabel(it.price_tier) || "DP").toUpperCase() === "DP"
                                ? "DP: Dealer Price (Wholesale Base Tier)"
                                : undefined
                            }
                          >
                            {formatTierLabel(it.price_tier) || "DP"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatBDT(it.unit_price)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatBDT(it.subtotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between font-bold border-t pt-3"><span>{t("total")}</span><span className="text-primary">{formatBDT(viewing.total_amount)}</span></div>
          </div>
        )}
      </Dialog>

      {/* Print-only invoice */}
      {viewOpen && viewing && <OrderPrintInvoice order={viewing} />}

      {/* Customer Ledger Statement Modal */}
      <CustomerLedgerModal
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setSelectedLedgerCustomer(null);
        }}
        customer={selectedLedgerCustomer}
      />

      {/* Confirmation Dialog for Deleting Cancelled Orders with Recorded Payments */}
      <Dialog
        open={Boolean(cancelledOrderToUnlink)}
        onClose={() => setCancelledOrderToUnlink(null)}
        title="Unlink Payment & Delete Cancelled Order"
        size="md"
      >
        {cancelledOrderToUnlink && (
          <div className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              This cancelled order has ৳{formatCurrency(cancelledOrderToUnlink.paidAmount)} in recorded payments. Deleting this order will convert the payment into Customer Advance Balance. Proceed?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelledOrderToUnlink(null)}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const targetId = cancelledOrderToUnlink.order.id;
                  setCancelledOrderToUnlink(null);
                  handleDeleteOrder(targetId, true);
                }}
              >
                {t("confirm") || "Proceed"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation Dialog for Deleting Orders */}
      <Dialog
        open={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        title={t("confirmDelete") || "Delete Order"}
        size="sm"
      >
        {orderToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              Are you sure you want to delete Order #{String(orderToDelete.order_number || orderToDelete.id).replace(/^#/, "")}? This action cannot be undone.
            </p>
            <div className="rounded-lg bg-muted/60 border p-3 text-xs space-y-1">
              <p><span className="font-semibold text-foreground">Customer:</span> {orderToDelete.customer?.name ?? (orderToDelete as any).customer_name ?? "—"}</p>
              <p><span className="font-semibold text-foreground">Status:</span> {orderToDelete.status}</p>
              <p><span className="font-semibold text-foreground">Amount:</span> ৳{formatCurrency(orderToDelete.total_amount)}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrderToDelete(null)}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const targetId = orderToDelete.id;
                  setOrderToDelete(null);
                  handleDeleteOrder(targetId, true);
                }}
              >
                {t("confirm") || "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}



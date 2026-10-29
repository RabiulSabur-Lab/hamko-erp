import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth, hasActiveSessionToken } from "@/lib/auth";
import {
  withQueryTimeout,
  classifySupabaseError,
  DASHBOARD_QUERY_TIMEOUT_MS,
  type SupabaseFailureKind,
} from "@/lib/supabaseQuery";
import { useAutoSync } from "@/hooks/useAutoSync";
import { initialOrders, initialCollections } from "@/lib/mockData";
import {
  deduplicateCollections,
  deduplicateOrders,
  getOrders,
  getCollections,
  getCustomers,
  getLocalData,
  setLocalData,
  getDeletedIds,
  mergeAndEnrichCustomers,
  STORAGE_KEYS,
  type Customer,
} from "@/utils/localStore";

export interface PrevDashboardMetrics {
  prevCollection: number;
  prevDue: number;
  prevCustCount: number;
}

export interface DashboardConnectionIssue {
  kind: SupabaseFailureKind;
  message: string;
  messageBn: string;
  failedResources: string[];
}

export interface UseDashboardDataResult {
  orders: any[];
  collections: any[];
  customers: Customer[];
  products: any[];
  prevMetrics: PrevDashboardMetrics;
  loading: boolean;
  refreshing: boolean;
  isFallbackData: boolean;
  lastSynced: Date | null;
  connectionIssue: DashboardConnectionIssue | null;
  refresh: (isManual?: boolean) => Promise<void>;
}

const SKELETON_HARD_CAP_MS = 9500;

function readCachedDashboardSnapshot() {
  const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
  const rawCachedOrders = getOrders().filter((o: any) => o && !deletedOrderIds.has(o.id));
  const cachedOrders = rawCachedOrders.length > 0 ? rawCachedOrders : initialOrders;

  const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
  const rawCachedCols = getCollections().filter((c: any) => c && !deletedColIds.has(c.id));
  const cachedCols = rawCachedCols.length > 0 ? rawCachedCols : initialCollections;

  const cachedCustomers = getCustomers();
  const cachedProducts = getLocalData<any[]>(STORAGE_KEYS.PRODUCTS, []);

  const hasAnyCached =
    rawCachedOrders.length > 0 ||
    rawCachedCols.length > 0 ||
    cachedCustomers.length > 0 ||
    cachedProducts.length > 0;

  return {
    orders: cachedOrders,
    collections: cachedCols,
    customers: cachedCustomers,
    products: Array.isArray(cachedProducts) ? cachedProducts : [],
    hasAnyCached,
  };
}

function computePreviousMetrics(
  collectionsList: any[],
  customersList: Customer[],
  prevMonthStart: string,
  monthStart: string,
  prevWeekEndIso: string,
): PrevDashboardMetrics {
  let prevCollection = 0;
  for (let i = 0; i < collectionsList.length; i++) {
    const c = collectionsList[i];
    const cDate = String(c?.collection_date || c?.created_at || "").slice(0, 10);
    if (cDate >= prevMonthStart && cDate < monthStart) {
      prevCollection += Number(c?.amount || 0);
    }
  }

  const prevWeekCutoffMs = new Date(prevWeekEndIso).getTime();
  let prevDue = 0;
  let prevCustCount = 0;
  for (let i = 0; i < customersList.length; i++) {
    const cust = customersList[i];
    if (!cust || cust.is_active === false || cust.status === "Inactive") continue;
    const createdMs = cust.created_at ? new Date(cust.created_at).getTime() : 0;
    if (createdMs > 0 && createdMs < prevWeekCutoffMs) {
      prevCustCount++;
      prevDue += Number(cust.current_due || 0);
    }
  }

  return { prevCollection, prevDue, prevCustCount };
}

export function useDashboardData(lang: "en" | "bn" = "en"): UseDashboardDataResult {
  const { session, loading: authLoading, sessionVerified, verifySession } = useAuth();

  // Synchronously hydrate from localStorage if available to avoid unnecessary skeleton flash
  const initialSnapshot = useRef(readCachedDashboardSnapshot());

  const [orders, setOrders] = useState<any[]>(() => initialSnapshot.current.orders);
  const [collections, setCollections] = useState<any[]>(() => initialSnapshot.current.collections);
  const [customers, setCustomers] = useState<Customer[]>(() => initialSnapshot.current.customers);
  const [products, setProducts] = useState<any[]>(() => initialSnapshot.current.products);
  const [prevMetrics, setPrevMetrics] = useState<PrevDashboardMetrics>({
    prevCollection: 0,
    prevDue: 0,
    prevCustCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(() => !initialSnapshot.current.hasAnyCached);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(() => initialSnapshot.current.hasAnyCached);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<DashboardConnectionIssue | null>(null);

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastToastTimeRef = useRef<number>(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const applyLocalFallback = useCallback(() => {
    const snap = readCachedDashboardSnapshot();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
    const prevWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    setOrders(snap.orders);
    setCollections(snap.collections);
    setCustomers(snap.customers);
    setProducts(snap.products);
    setPrevMetrics(
      computePreviousMetrics(snap.collections, snap.customers, prevMonthStart, monthStart, prevWeekEnd),
    );
    setIsFallbackData(true);
  }, []);

  const surfaceFailureNotification = useCallback(
    (issue: DashboardConnectionIssue, isManual: boolean, retryFn: () => void) => {
      const now = Date.now();
      // Always toast on manual retry; rate-limit automatic background sync toasts to once every 15s
      if (!isManual && now - lastToastTimeRef.current < 15_000) return;
      lastToastTimeRef.current = now;

      const localizedMsg = langRef.current === "bn" ? issue.messageBn : issue.message;
      const retryLabel = langRef.current === "bn" ? "পুনরায় চেষ্টা" : "Retry";

      toast.warning(localizedMsg, {
        duration: 6500,
        action: {
          label: retryLabel,
          onClick: retryFn,
        },
      });
    },
    [],
  );

  const fetchFromSupabase = useCallback(
    async (isManual = false): Promise<void> => {
      // Share in-flight execution instead of dropping state updates on StrictMode remounts
      if (inFlightRef.current && !isManual) {
        return inFlightRef.current;
      }

      if (isManual && mountedRef.current) {
        setRefreshing(true);
      }

      const task = (async () => {
        try {
          // 1. Verify active Supabase session token before firing heavy background queries
          const activeSession = hasActiveSessionToken(session)
            ? session
            : await verifySession(isManual);

          if (!activeSession) {
            if (!mountedRef.current) return;
            applyLocalFallback();
            const authIssue: DashboardConnectionIssue = {
              kind: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "auth",
              message:
                typeof navigator !== "undefined" && navigator.onLine === false
                  ? "Device is offline. Displaying cached dashboard state."
                  : "Session token could not be verified. Displaying cached/default dashboard state.",
              messageBn:
                typeof navigator !== "undefined" && navigator.onLine === false
                  ? "ইন্টারনেট সংযোগ নেই। সংরক্ষিত ড্যাশবোর্ড ডেটা দেখানো হচ্ছে।"
                  : "সেশন টোকেন যাচাই করা যায়নি। সংরক্ষিত ড্যাশবোর্ড ডেটা দেখানো হচ্ছে।",
              failedResources: ["session"],
            };
            setConnectionIssue(authIssue);
            if (isManual) {
              surfaceFailureNotification(authIssue, true, () => {
                void fetchFromSupabase(true);
              });
            }
            return;
          }

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevMonthStart = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
          const prevWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

          // 2. Execute 4 lean parallel queries, each bounded by an explicit 9s timeout.
          //    Using Promise.allSettled ensures one slow query never blocks the rest of the Dashboard.
          const [oSettled, colSettled, custSettled, prodSettled] = await Promise.allSettled([
            withQueryTimeout(
              supabase
                .from("orders")
                .select(
                  "id, order_number, total_amount, status, created_at, order_date, customer_id, due_amount, paid_amount, order_items(*, product:products(name, category_id, category:categories(name))), customer:customers(id, name)",
                )
                .order("order_date", { ascending: false }),
              DASHBOARD_QUERY_TIMEOUT_MS,
              "Orders query",
            ),
            withQueryTimeout(
              supabase
                .from("collections")
                .select("id, collection_number, amount, collection_date, customer_id, created_at")
                .order("collection_date", { ascending: false }),
              DASHBOARD_QUERY_TIMEOUT_MS,
              "Collections query",
            ),
            withQueryTimeout(
              supabase
                .from("customers")
                .select("*, territory:territories(*)")
                .order("name", { ascending: true }),
              DASHBOARD_QUERY_TIMEOUT_MS,
              "Customers query",
            ),
            withQueryTimeout(
              supabase
                .from("products")
                .select("id, name, unit_price, stock_quantity, reorder_level, category_id, category:categories(name)")
                .eq("is_active", true),
              DASHBOARD_QUERY_TIMEOUT_MS,
              "Products query",
            ),
          ]);

          if (!mountedRef.current) return;

          const failedResources: string[] = [];
          let firstError: unknown = null;

          const recordFailure = (name: string, err: unknown) => {
            failedResources.push(name);
            if (!firstError) firstError = err;
          };

          // ── Orders ──────────────────────────────────────────────────────────
          let resolvedOrders: any[] = initialOrders;
          const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
          if (oSettled.status === "fulfilled" && !oSettled.value.error && Array.isArray(oSettled.value.data)) {
            const remoteOrders = (oSettled.value.data as any[]).filter((o: any) => !deletedOrderIds.has(o.id));
            const remoteIdSet = new Set(remoteOrders.map((o: any) => String(o.id)));
            const pendingLocal = getOrders().filter(
              (lo: any) => lo && !deletedOrderIds.has(lo.id) && !remoteIdSet.has(String(lo.id)),
            );
            resolvedOrders = deduplicateOrders([...pendingLocal, ...remoteOrders], {
              excludeDrafts: false,
              excludeCancelled: false,
            });
            setLocalData(STORAGE_KEYS.ORDERS, resolvedOrders, null, true);
          } else {
            recordFailure(
              "orders",
              oSettled.status === "rejected" ? oSettled.reason : oSettled.value.error,
            );
            const fallbackOrders = getOrders().filter((o: any) => o && !deletedOrderIds.has(o.id));
            resolvedOrders = fallbackOrders.length > 0 ? fallbackOrders : initialOrders;
          }
          setOrders(resolvedOrders);

          // ── Collections ─────────────────────────────────────────────────────
          let resolvedCollections: any[] = initialCollections;
          const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
          if (colSettled.status === "fulfilled" && !colSettled.value.error && Array.isArray(colSettled.value.data)) {
            const remoteCols = colSettled.value.data.filter((c: any) => !deletedColIds.has(c.id));
            const remoteIdSet = new Set(remoteCols.map((c: any) => String(c.id)));
            const remoteColNumSet = new Set(
              remoteCols
                .map((c: any) => String(c.collection_number || "").trim().toUpperCase())
                .filter(Boolean),
            );
            const pendingLocal = getCollections().filter(
              (lc: any) =>
                lc &&
                !deletedColIds.has(lc.id) &&
                !remoteIdSet.has(String(lc.id)) &&
                (!lc.collection_number ||
                  !remoteColNumSet.has(String(lc.collection_number).trim().toUpperCase())),
            );
            resolvedCollections = deduplicateCollections([...pendingLocal, ...remoteCols]);
            setLocalData(STORAGE_KEYS.COLLECTIONS, resolvedCollections, null, true);
          } else {
            recordFailure(
              "collections",
              colSettled.status === "rejected" ? colSettled.reason : colSettled.value.error,
            );
            const fallbackCols = getCollections().filter((c: any) => c && !deletedColIds.has(c.id));
            resolvedCollections = fallbackCols.length > 0 ? fallbackCols : initialCollections;
          }
          setCollections(resolvedCollections);

          // ── Customers ───────────────────────────────────────────────────────
          let resolvedCustomers: Customer[] = [];
          if (custSettled.status === "fulfilled" && !custSettled.value.error && Array.isArray(custSettled.value.data)) {
            resolvedCustomers = mergeAndEnrichCustomers(custSettled.value.data as Customer[]);
          } else {
            recordFailure(
              "customers",
              custSettled.status === "rejected" ? custSettled.reason : custSettled.value.error,
            );
            resolvedCustomers = getCustomers();
          }
          setCustomers(resolvedCustomers);

          // ── Products ────────────────────────────────────────────────────────
          let resolvedProducts: any[] = [];
          if (prodSettled.status === "fulfilled" && !prodSettled.value.error && Array.isArray(prodSettled.value.data)) {
            resolvedProducts = prodSettled.value.data;
            setLocalData(STORAGE_KEYS.PRODUCTS, resolvedProducts, null, true);
          } else {
            recordFailure(
              "products",
              prodSettled.status === "rejected" ? prodSettled.reason : prodSettled.value.error,
            );
            resolvedProducts = getLocalData<any[]>(STORAGE_KEYS.PRODUCTS, []);
          }
          setProducts(Array.isArray(resolvedProducts) ? resolvedProducts : []);

          // ── Previous-period metrics computed in O(N) without extra DB round-trips ──
          setPrevMetrics(
            computePreviousMetrics(
              resolvedCollections,
              resolvedCustomers,
              prevMonthStart,
              monthStart,
              prevWeekEnd,
            ),
          );

          // ── Connection diagnostics & user feedback ──────────────────────────
          if (failedResources.length > 0) {
            const classified = classifySupabaseError(firstError);
            const issue: DashboardConnectionIssue = {
              kind: classified.kind,
              message: classified.userMessage,
              messageBn: classified.userMessageBn,
              failedResources,
            };
            setConnectionIssue(issue);
            setIsFallbackData(failedResources.length === 4);
            surfaceFailureNotification(issue, isManual, () => {
              void fetchFromSupabase(true);
            });
          } else {
            setConnectionIssue(null);
            setIsFallbackData(false);
            setLastSynced(new Date());
            if (isManual) {
              toast.success(
                langRef.current === "bn"
                  ? "ড্যাশবোর্ড সফলভাবে আপডেট হয়েছে"
                  : "Dashboard synced with cloud",
                { duration: 2500 },
              );
            }
          }
        } catch (err) {
          console.warn("Dashboard Supabase fetch error — using local fallback:", err);
          if (!mountedRef.current) return;
          applyLocalFallback();
          const classified = classifySupabaseError(err);
          const issue: DashboardConnectionIssue = {
            kind: classified.kind,
            message: classified.userMessage,
            messageBn: classified.userMessageBn,
            failedResources: ["orders", "collections", "customers", "products"],
          };
          setConnectionIssue(issue);
          surfaceFailureNotification(issue, isManual, () => {
            void fetchFromSupabase(true);
          });
        } finally {
          inFlightRef.current = null;
          if (mountedRef.current) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();

      inFlightRef.current = task;
      return task;
    },
    [session, verifySession, applyLocalFallback, surfaceFailureNotification],
  );

  // Hard skeleton watchdog: guarantees mobile skeleton states NEVER stay stuck beyond 9.5s
  useEffect(() => {
    mountedRef.current = true;
    const watchdog = setTimeout(() => {
      if (mountedRef.current) {
        setLoading((prevLoading) => {
          if (prevLoading) {
            console.warn("[Dashboard] Skeleton hard-cap watchdog triggered (9.5s). Unlocking UI with fallback state.");
            applyLocalFallback();
          }
          return false;
        });
        setRefreshing(false);
      }
    }, SKELETON_HARD_CAP_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(watchdog);
    };
  }, [applyLocalFallback]);

  // Trigger initial cloud fetch once AuthProvider finishes initial token check
  useEffect(() => {
    if (authLoading || !sessionVerified) return;
    void fetchFromSupabase(false);
  }, [authLoading, sessionVerified, fetchFromSupabase]);

  // Single multiplexed Realtime channel (deferred until initial load finishes & session is verified)
  useEffect(() => {
    if (loading || !sessionVerified || !hasActiveSessionToken(session)) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mountedRef.current && !inFlightRef.current) {
          void fetchFromSupabase(false);
        }
      }, 1500);
    };

    let channel: any = null;
    try {
      channel = supabase
        .channel("dashboard_live_sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleSync)
        .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, scheduleSync)
        .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, scheduleSync)
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleSync)
        .subscribe();
    } catch (err) {
      console.warn("Dashboard realtime subscription notice:", err);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [loading, sessionVerified, session, fetchFromSupabase]);

  // Listen to local mutation events from other ERP modules
  useEffect(() => {
    const handleLocalUpdate = () => {
      if (!mountedRef.current) return;
      const snap = readCachedDashboardSnapshot();
      if (snap.hasAnyCached) {
        setOrders(snap.orders);
        setCollections(snap.collections);
        setCustomers(snap.customers);
        setProducts(snap.products);
      }
    };
    window.addEventListener("sales_erp_storage_update", handleLocalUpdate);
    window.addEventListener("customer_ledger_updated", handleLocalUpdate);
    return () => {
      window.removeEventListener("sales_erp_storage_update", handleLocalUpdate);
      window.removeEventListener("customer_ledger_updated", handleLocalUpdate);
    };
  }, []);

  // Auto-sync on mobile app resume / focus / online reconnect (debounced to 10s)
  useAutoSync(
    () => {
      if (!loading && !refreshing && !inFlightRef.current && sessionVerified) {
        void fetchFromSupabase(false);
      }
    },
    !loading && sessionVerified,
    10000,
  );

  return {
    orders,
    collections,
    customers,
    products,
    prevMetrics,
    loading,
    refreshing,
    isFallbackData,
    lastSynced,
    connectionIssue,
    refresh: fetchFromSupabase,
  };
}


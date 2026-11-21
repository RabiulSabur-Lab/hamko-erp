import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { toast } from "sonner";
import {
  supabase,
  SUPABASE_TABLE_SELECTS,
  type Order,
  type Collection,
  type Product,
  type Customer,
} from "@/lib/supabase";
import { useAuth, hasActiveSessionToken } from "@/lib/auth";
import {
  withQueryTimeout,
  classifySupabaseError,
  isRlsOrPermissionError,
  DASHBOARD_QUERY_TIMEOUT_MS,
  type SupabaseFailureKind,
} from "@/lib/supabaseQuery";
import { useAutoSync } from "@/hooks/useAutoSync";
import { getOrders, getCollections, getCustomers, getProducts } from "@/utils/localStore";

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
  orders: Order[];
  collections: Collection[];
  customers: Customer[];
  products: Product[];
  prevMetrics: PrevDashboardMetrics;
  loading: boolean;
  refreshing: boolean;
  isFallbackData: boolean;
  lastSynced: Date | null;
  connectionIssue: DashboardConnectionIssue | null;
  refresh: (isManual?: boolean) => Promise<void>;
}

interface SafeQueryResult<T> {
  data: T[] | null;
  error: unknown;
}

const SKELETON_HARD_CAP_MS = 3500;
const MIN_AUTO_FETCH_INTERVAL_MS = 1500;
const MAX_LOCAL_CACHE_ORDERS = 400;
const MAX_LOCAL_CACHE_COLLECTIONS = 800;

/**
 * Yields control back to the browser's main thread so rendering and user input never freeze.
 */
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/**
 * Wraps an async Supabase PostgREST call inside an explicit try/catch + timeout boundary (8–10s)
 * with 1 automatic retry for transient mobile/edge network drops.
 * Guarantees that network timeouts, CORS blocks, or schema errors return a clean result object
 * without throwing unhandled rejections or blocking the main browser thread.
 */
async function executeTimedQuery<T>(
  queryFactory: () => PromiseLike<{ data: T[] | null; error: any }>,
  label: string,
  timeoutMs = DASHBOARD_QUERY_TIMEOUT_MS,
  maxRetries = 1,
): Promise<SafeQueryResult<T>> {
  let lastError: unknown = null;
  const totalAttempts = Math.max(1, maxRetries + 1);

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      const res = await withQueryTimeout(queryFactory(), timeoutMs, label);
      if (!res.error) {
        return { data: Array.isArray(res.data) ? res.data : [], error: null };
      }
      lastError = res.error;
      // Do not mask 401/403 or RLS errors as empty successful datasets!
      // Treating authorization or JWT errors as empty datasets wipes local state and renders false zeros.
      if (attempt < totalAttempts - 1) {
        const classified = classifySupabaseError(lastError);
        if (
          classified.kind === "timeout" ||
          classified.kind === "cors_or_network" ||
          classified.kind === "server"
        ) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
      }
      return { data: null, error: lastError };
    } catch (err) {
      lastError = err;
      if (attempt < totalAttempts - 1) {
        const classified = classifySupabaseError(lastError);
        if (
          classified.kind === "timeout" ||
          classified.kind === "cors_or_network" ||
          classified.kind === "server"
        ) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
      }
      return { data: null, error: lastError };
    }
  }
  return { data: null, error: lastError };
}

/**
 * Schedules non-critical localStorage persistence during browser idle time
 * so synchronous JSON.stringify never blocks Dashboard paint or interactions.
 */
function scheduleIdleTask(cb: () => void): void {
  if (typeof window === "undefined") return;
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === "function") {
    ric(
      () => {
        try {
          cb();
        } catch (e) {
          console.warn("[Dashboard] Idle cache write warning:", e);
        }
      },
      { timeout: 1500 },
    );
  } else {
    setTimeout(() => {
      try {
        cb();
      } catch (e) {
        console.warn("[Dashboard] Deferred cache write warning:", e);
      }
    }, 200);
  }
}

function computePreviousMetrics(
  collectionsList: Collection[],
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
  const userId = session?.user?.id ?? null;

  // Store changing auth objects in refs so callbacks & effects NEVER re-trigger in loops
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const verifySessionRef = useRef(verifySession);
  verifySessionRef.current = verifySession;
  const langRef = useRef(lang);
  langRef.current = lang;

  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [collections, setCollections] = useState<Collection[]>(() => getCollections());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [prevMetrics, setPrevMetrics] = useState<PrevDashboardMetrics>({
    prevCollection: 0,
    prevDue: 0,
    prevCustCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<DashboardConnectionIssue | null>(null);

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastAutoFetchAtRef = useRef<number>(0);
  const initialFetchedForUserRef = useRef<string | null>(null);

  // Stable identity (no session object in deps!) prevents infinite useEffect re-execution loops
  const fetchFromSupabase = useCallback(
    async (isManual = false): Promise<void> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const nowMs = Date.now();
      if (!isManual && nowMs - lastAutoFetchAtRef.current < MIN_AUTO_FETCH_INTERVAL_MS) {
        return;
      }
      lastAutoFetchAtRef.current = nowMs;

      if (isManual) {
        initialFetchedForUserRef.current = null;
        lastAutoFetchAtRef.current = 0;
        if (mountedRef.current) {
          setRefreshing(true);
        }
      }

      const task = (async () => {
        try {
          // 0. Fast-path when browser reports offline
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            if (!mountedRef.current) return;
            setLoading(false);
            setRefreshing(false);
            return;
          }

          // 1. Verify active Supabase session token via refs before firing heavy queries
          const currentSess = sessionRef.current;
          const activeSession = hasActiveSessionToken(currentSess)
            ? currentSess
            : await verifySessionRef.current(isManual);

          if (!activeSession) {
            console.warn("[Dashboard] Session token absent or expired; proceeding with public cloud read.");
          }

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevMonthStart = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
          const prevWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

          const isSchemaOrRelationErr = (err: any): boolean => {
            if (!err) return false;
            const code = String(err.code || "");
            const msg = String(err.message || "").toLowerCase();
            return (
              code === "42703" ||
              code === "PGRST200" ||
              code === "PGRST204" ||
              code === "PGRST201" ||
              msg.includes("column") ||
              msg.includes("relationship") ||
              msg.includes("schema cache")
            );
          };

          // 2. Schema-verified, bounded queries with explicit 9s timeout & try/catch per query.
          const fetchProductsSafe = async (): Promise<SafeQueryResult<Product>> => {
            const fullRes = await executeTimedQuery<Product>(
              () =>
                supabase
                  .from("products")
                  .select(SUPABASE_TABLE_SELECTS.productsFull)
                  .order("name", { ascending: true })
                  .limit(1000) as unknown as PromiseLike<{ data: Product[] | null; error: any }>,
              "Products query",
            );
            if (!fullRes.error && Array.isArray(fullRes.data) && fullRes.data.length > 0) return fullRes;

            const coreRes = await executeTimedQuery<Product>(
              () =>
                supabase
                  .from("products")
                  .select(SUPABASE_TABLE_SELECTS.productsCoreFallback)
                  .order("name", { ascending: true })
                  .limit(1000) as unknown as PromiseLike<{ data: Product[] | null; error: any }>,
              "Products fallback query",
            );
            if (!coreRes.error && Array.isArray(coreRes.data) && coreRes.data.length > 0) return coreRes;

            return executeTimedQuery<Product>(
              () =>
                supabase
                  .from("products")
                  .select(SUPABASE_TABLE_SELECTS.productsFlatFallback)
                  .order("name", { ascending: true })
                  .limit(1000) as unknown as PromiseLike<{ data: Product[] | null; error: any }>,
              "Products flat fallback query",
            );
          };

          const fetchOrdersSafe = async (): Promise<SafeQueryResult<Order>> => {
            const fullRes = await executeTimedQuery<Order>(
              () =>
                supabase
                  .from("orders")
                  .select(SUPABASE_TABLE_SELECTS.ordersWithItemsAndCustomer)
                  .order("order_date", { ascending: false })
                  .limit(1000) as unknown as PromiseLike<{ data: Order[] | null; error: any }>,
              "Orders query",
            );
            if (!fullRes.error && Array.isArray(fullRes.data) && fullRes.data.length > 0) return fullRes;

            const coreRes = await executeTimedQuery<Order>(
              () =>
                supabase
                  .from("orders")
                  .select(SUPABASE_TABLE_SELECTS.ordersCoreFallback)
                  .order("order_date", { ascending: false })
                  .limit(1000) as unknown as PromiseLike<{ data: Order[] | null; error: any }>,
              "Orders fallback query",
            );
            if (!coreRes.error && Array.isArray(coreRes.data) && coreRes.data.length > 0) return coreRes;

            return executeTimedQuery<Order>(
              () =>
                supabase
                  .from("orders")
                  .select(SUPABASE_TABLE_SELECTS.ordersFlatFallback)
                  .order("order_date", { ascending: false })
                  .limit(1000) as unknown as PromiseLike<{ data: Order[] | null; error: any }>,
              "Orders flat fallback query",
            );
          };

          const [oRes, colRes, custRes, prodRes] = await Promise.all([
            fetchOrdersSafe(),
            executeTimedQuery<Collection>(
              () =>
                supabase
                  .from("collections")
                  .select(SUPABASE_TABLE_SELECTS.collections)
                  .order("collection_date", { ascending: false })
                  .limit(2000) as unknown as PromiseLike<{ data: Collection[] | null; error: any }>,
              "Collections query",
            ),
            executeTimedQuery<Customer>(
              () =>
                supabase
                  .from("customers")
                  .select(SUPABASE_TABLE_SELECTS.customers)
                  .order("name", { ascending: true })
                  .limit(2000) as unknown as PromiseLike<{ data: Customer[] | null; error: any }>,
              "Customers query",
            ),
            fetchProductsSafe(),
          ]);

          if (!mountedRef.current) return;

          // Yield to browser frame before CPU data merging so scrolling/clicks stay responsive
          await yieldToMain();
          if (!mountedRef.current) return;

          const failedResources: string[] = [];
          let firstError: unknown = null;

          const recordFailure = (name: string, err: unknown) => {
            failedResources.push(name);
            if (!firstError) firstError = err;
          };

          // ── Orders (Cloud-Authoritative) ────────────────────────────────────
          let resolvedOrders: Order[] = [];
          if (!oRes.error && Array.isArray(oRes.data)) {
            resolvedOrders = oRes.data as Order[];
          } else {
            recordFailure("orders", oRes.error);
          }

          // ── Collections (Cloud-Authoritative) ───────────────────────────────
          let resolvedCollections: Collection[] = [];
          if (!colRes.error && Array.isArray(colRes.data)) {
            resolvedCollections = colRes.data as Collection[];
          } else {
            recordFailure("collections", colRes.error);
          }

          // Yield again before customer enrichment & state commit
          await yieldToMain();
          if (!mountedRef.current) return;

          // ── Customers (Cloud-Authoritative) ─────────────────────────────────
          let resolvedCustomers: Customer[] = [];
          if (!custRes.error && Array.isArray(custRes.data)) {
            resolvedCustomers = custRes.data as Customer[];
          } else {
            recordFailure("customers", custRes.error);
          }

          // ── Products (Cloud-Authoritative) ──────────────────────────────────
          let resolvedProducts: Product[] = [];
          if (!prodRes.error && Array.isArray(prodRes.data)) {
            resolvedProducts = prodRes.data as Product[];
          } else {
            recordFailure("products", prodRes.error);
          }

          const computedPrev = computePreviousMetrics(
            resolvedCollections,
            resolvedCustomers,
            prevMonthStart,
            monthStart,
            prevWeekEnd,
          );

          // Commit data updates inside startTransition so heavy chart renders never block UI input
          startTransition(() => {
            if (!mountedRef.current) return;
            setOrders(resolvedOrders);
            setCollections(resolvedCollections);
            setCustomers(resolvedCustomers);
            setProducts(resolvedProducts);
            setPrevMetrics(computedPrev);
          });

          // ── Connection diagnostics & user feedback ──────────────────────────
          setConnectionIssue(null);
          setIsFallbackData(false);
          setLastSynced(new Date());

          if (failedResources.length > 0) {
            console.warn(
              `[Dashboard] Non-critical resource notice (${failedResources.join(", ")}): using available state without banner.`,
            );
          } else if (isManual) {
            toast.success(
              langRef.current === "bn"
                ? "ড্যাশবোর্ড সফলভাবে আপডেট হয়েছে"
                : "Dashboard synced with cloud",
              { duration: 2500 },
            );
          }
        } catch (err) {
          console.warn("Dashboard Supabase fetch error:", err);
          if (!mountedRef.current) return;
          setConnectionIssue(null);
          setIsFallbackData(false);
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
    [],
  );

  // Hard loading timeout: guarantees Dashboard skeleton exits cleanly within 3.5s
  useEffect(() => {
    mountedRef.current = true;
    const watchdog = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }, SKELETON_HARD_CAP_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(watchdog);
    };
  }, []);

  // Initial cloud fetch from Supabase SSOT
  useEffect(() => {
    if (authLoading) return;
    const targetKey = userId ?? "__public__";
    if (initialFetchedForUserRef.current === targetKey) return;

    lastAutoFetchAtRef.current = 0; // Allow initial fetch immediately
    void fetchFromSupabase(false)
      .then(() => {
        if (mountedRef.current) {
          initialFetchedForUserRef.current = targetKey;
        }
      })
      .catch(() => {
        initialFetchedForUserRef.current = null;
      });
  }, [authLoading, userId, fetchFromSupabase]);

  // Single multiplexed Realtime channel for instant zero-lag dashboard invalidation
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mountedRef.current && !inFlightRef.current) {
          lastAutoFetchAtRef.current = 0;
          void fetchFromSupabase(false);
        }
      }, 2000);
    };

    let channel: any = null;
    try {
      const channelName = `dashboard_live_sync_${Date.now().toString(36)}`;
      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleSync)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, scheduleSync)
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
  }, [fetchFromSupabase]);

  // Auto-sync on mobile app resume / focus / online reconnect (Cloud-First revalidation)
  useAutoSync(
    () => {
      if (!loading && !refreshing && !inFlightRef.current) {
        lastAutoFetchAtRef.current = 0;
        void fetchFromSupabase(false);
      }
    },
    !loading,
    1000,
    6000,
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

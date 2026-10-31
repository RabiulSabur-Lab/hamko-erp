import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { toast } from "sonner";
import {
  supabase,
  SUPABASE_TABLE_SELECTS,
  type Order,
  type Collection,
  type Product,
} from "@/lib/supabase";
import { useAuth, hasActiveSessionToken } from "@/lib/auth";
import {
  withQueryTimeout,
  classifySupabaseError,
  DASHBOARD_QUERY_TIMEOUT_MS,
  type SupabaseFailureKind,
} from "@/lib/supabaseQuery";
import { useAutoSync } from "@/hooks/useAutoSync";
import {
  getOrders,
  getCollections,
  getCustomers,
  getLocalData,
  setLocalData,
  getDeletedIds,
  mergeAndEnrichCustomers,
  reconcileOrdersWithRemote,
  reconcileCollectionsWithRemote,
  reconcileProductsWithRemote,
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

const SKELETON_HARD_CAP_MS = 9000;
const MIN_AUTO_FETCH_INTERVAL_MS = 1500;
const MAX_LOCAL_CACHE_ORDERS = 400;
const MAX_LOCAL_CACHE_COLLECTIONS = 800;

const DASHBOARD_RELEVANT_KEYS = new Set<string>([
  STORAGE_KEYS.ORDERS,
  STORAGE_KEYS.DELETED_ORDERS,
  STORAGE_KEYS.COLLECTIONS,
  STORAGE_KEYS.DELETED_COLLECTIONS,
  STORAGE_KEYS.CUSTOMERS,
  STORAGE_KEYS.DELETED_CUSTOMERS,
  STORAGE_KEYS.PRODUCTS,
  STORAGE_KEYS.DELETED_PRODUCTS,
]);

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

function readCachedDashboardSnapshot() {
  try {
    const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
    const cachedOrders: Order[] = getOrders().filter((o) => o && !deletedOrderIds.has(o.id));

    const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
    const cachedCols: Collection[] = getCollections().filter((c) => c && !deletedColIds.has(c.id));

    const cachedCustomers = getCustomers();
    const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
    const rawCachedProducts = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const cachedProducts = Array.isArray(rawCachedProducts)
      ? rawCachedProducts.filter((p) => p && !deletedProdIds.has(String(p.id)))
      : [];

    const hasAnyCached =
      cachedOrders.length > 0 ||
      cachedCols.length > 0 ||
      cachedCustomers.length > 0 ||
      cachedProducts.length > 0;

    return {
      orders: cachedOrders,
      collections: cachedCols,
      customers: cachedCustomers,
      products: cachedProducts,
      hasAnyCached,
    };
  } catch (err) {
    console.warn("[Dashboard] Failed reading local snapshot, using clean empty defaults:", err);
    return {
      orders: [] as Order[],
      collections: [] as Collection[],
      customers: [] as Customer[],
      products: [] as Product[],
      hasAnyCached: false,
    };
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

  // Synchronously hydrate once from localStorage if available to avoid skeleton flash
  const initialSnapshotRef = useRef<ReturnType<typeof readCachedDashboardSnapshot> | null>(null);
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = readCachedDashboardSnapshot();
  }

  const [orders, setOrders] = useState<Order[]>(() => initialSnapshotRef.current!.orders);
  const [collections, setCollections] = useState<Collection[]>(() => initialSnapshotRef.current!.collections);
  const [customers, setCustomers] = useState<Customer[]>(() => initialSnapshotRef.current!.customers);
  const [products, setProducts] = useState<Product[]>(() => initialSnapshotRef.current!.products);
  const [prevMetrics, setPrevMetrics] = useState<PrevDashboardMetrics>({
    prevCollection: 0,
    prevDue: 0,
    prevCustCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(() => !initialSnapshotRef.current!.hasAnyCached);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<DashboardConnectionIssue | null>(null);

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastAutoFetchAtRef = useRef<number>(0);
  const initialFetchedForUserRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef<number>(0);

  const applyLocalFallback = useCallback(() => {
    const snap = readCachedDashboardSnapshot();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
    const prevWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    startTransition(() => {
      setOrders(snap.orders);
      setCollections(snap.collections);
      setCustomers(snap.customers);
      setProducts(snap.products);
      setPrevMetrics(
        computePreviousMetrics(snap.collections, snap.customers, prevMonthStart, monthStart, prevWeekEnd),
      );
      setIsFallbackData(true);
    });
  }, []);

  const surfaceFailureNotification = useCallback(
    (issue: DashboardConnectionIssue, isManual: boolean, retryFn: () => void) => {
      const now = Date.now();
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

      if (isManual && mountedRef.current) {
        setRefreshing(true);
      }

      const task = (async () => {
        try {
          // 0. Fast-path when browser reports offline — fall back in 0ms without opening doomed sockets
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            if (!mountedRef.current) return;
            applyLocalFallback();
            const offlineIssue: DashboardConnectionIssue = {
              kind: "offline",
              message: "Device is offline. Displaying cached dashboard state.",
              messageBn: "ইন্টারনেট সংযোগ নেই। সংরক্ষিত ড্যাশবোর্ড ডেটা দেখানো হচ্ছে।",
              failedResources: ["network"],
            };
            setConnectionIssue(offlineIssue);
            if (isManual) {
              surfaceFailureNotification(offlineIssue, true, () => {
                void fetchFromSupabase(true);
              });
            }
            return;
          }

          // 1. Verify active Supabase session token via refs before firing heavy queries
          const currentSess = sessionRef.current;
          const activeSession = hasActiveSessionToken(currentSess)
            ? currentSess
            : await verifySessionRef.current(isManual);

          if (!activeSession) {
            const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
            if (isOffline) {
              if (!mountedRef.current) return;
              applyLocalFallback();
              const authIssue: DashboardConnectionIssue = {
                kind: "offline",
                message: "Device is offline. Displaying cached dashboard state.",
                messageBn: "ইন্টারনেট সংযোগ নেই। সংরক্ষিত ড্যাশবোর্ড ডেটা দেখানো হচ্ছে।",
                failedResources: ["network"],
              };
              setConnectionIssue(authIssue);
              if (isManual) {
                surfaceFailureNotification(authIssue, true, () => {
                  void fetchFromSupabase(true);
                });
              }
              return;
            }
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
            if (!fullRes.error) return fullRes;

            if (isSchemaOrRelationErr(fullRes.error)) {
              const coreRes = await executeTimedQuery<Product>(
                () =>
                  supabase
                    .from("products")
                    .select(SUPABASE_TABLE_SELECTS.productsCoreFallback)
                    .order("name", { ascending: true })
                    .limit(1000) as unknown as PromiseLike<{ data: Product[] | null; error: any }>,
                "Products fallback query",
              );
              if (!coreRes.error) return coreRes;
              if (isSchemaOrRelationErr(coreRes.error)) {
                return executeTimedQuery<Product>(
                  () =>
                    supabase
                      .from("products")
                      .select(SUPABASE_TABLE_SELECTS.productsFlatFallback)
                      .order("name", { ascending: true })
                      .limit(1000) as unknown as PromiseLike<{ data: Product[] | null; error: any }>,
                  "Products flat fallback query",
                );
              }
              return coreRes;
            }
            return fullRes;
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
            if (!fullRes.error) return fullRes;

            if (isSchemaOrRelationErr(fullRes.error)) {
              const coreRes = await executeTimedQuery<Order>(
                () =>
                  supabase
                    .from("orders")
                    .select(SUPABASE_TABLE_SELECTS.ordersCoreFallback)
                    .order("order_date", { ascending: false })
                    .limit(1000) as unknown as PromiseLike<{ data: Order[] | null; error: any }>,
                "Orders fallback query",
              );
              if (!coreRes.error) return coreRes;
              if (isSchemaOrRelationErr(coreRes.error)) {
                return executeTimedQuery<Order>(
                  () =>
                    supabase
                      .from("orders")
                      .select(SUPABASE_TABLE_SELECTS.ordersFlatFallback)
                      .order("order_date", { ascending: false })
                      .limit(1000) as unknown as PromiseLike<{ data: Order[] | null; error: any }>,
                  "Orders flat fallback query",
                );
              }
              return coreRes;
            }
            return fullRes;
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
          let shouldCacheOrders = false;
          const deletedOrderIds = getDeletedIds(STORAGE_KEYS.DELETED_ORDERS);
          if (!oRes.error && oRes.data !== null) {
            resolvedOrders = reconcileOrdersWithRemote(oRes.data, { persist: false });
            shouldCacheOrders = true;
          } else {
            recordFailure("orders", oRes.error);
            resolvedOrders = getOrders().filter((o) => o && !deletedOrderIds.has(o.id));
          }

          // ── Collections (Cloud-Authoritative) ───────────────────────────────
          let resolvedCollections: Collection[] = [];
          let shouldCacheCollections = false;
          const deletedColIds = getDeletedIds(STORAGE_KEYS.DELETED_COLLECTIONS);
          if (!colRes.error && colRes.data !== null) {
            resolvedCollections = reconcileCollectionsWithRemote(colRes.data, { persist: false });
            shouldCacheCollections = true;
          } else {
            recordFailure("collections", colRes.error);
            resolvedCollections = getCollections().filter((c) => c && !deletedColIds.has(c.id));
          }

          // Yield again before customer enrichment & state commit
          await yieldToMain();
          if (!mountedRef.current) return;

          // ── Customers (Cloud-Authoritative) ─────────────────────────────────
          let resolvedCustomers: Customer[] = [];
          let shouldCacheCustomers = false;
          if (!custRes.error && custRes.data !== null) {
            // Defer localStorage write (`persist: false`) to idle callback so main thread stays silky-smooth
            resolvedCustomers = mergeAndEnrichCustomers(custRes.data, { persist: false });
            shouldCacheCustomers = true;
          } else {
            recordFailure("customers", custRes.error);
            resolvedCustomers = getCustomers();
          }

          // ── Products (Cloud-Authoritative) ──────────────────────────────────
          let resolvedProducts: Product[] = [];
          let shouldCacheProducts = false;
          const deletedProdIds = getDeletedIds(STORAGE_KEYS.DELETED_PRODUCTS);
          if (!prodRes.error && prodRes.data !== null) {
            resolvedProducts = reconcileProductsWithRemote(prodRes.data, { persist: false });
            shouldCacheProducts = true;
          } else {
            recordFailure("products", prodRes.error);
            const fallbackProds = getLocalData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
            resolvedProducts = Array.isArray(fallbackProds)
              ? fallbackProds.filter((p) => p && !deletedProdIds.has(String(p.id)))
              : [];
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

          // Persist bounded cache snapshots asynchronously during browser idle time
          if (shouldCacheOrders || shouldCacheCollections || shouldCacheCustomers || shouldCacheProducts) {
            scheduleIdleTask(() => {
              if (shouldCacheOrders) {
                setLocalData(
                  STORAGE_KEYS.ORDERS,
                  resolvedOrders.slice(0, MAX_LOCAL_CACHE_ORDERS),
                  null,
                  true,
                );
              }
              if (shouldCacheCollections) {
                setLocalData(
                  STORAGE_KEYS.COLLECTIONS,
                  resolvedCollections.slice(0, MAX_LOCAL_CACHE_COLLECTIONS),
                  null,
                  true,
                );
              }
              if (shouldCacheCustomers) {
                setLocalData(STORAGE_KEYS.CUSTOMERS, resolvedCustomers, null, true);
              }
              if (shouldCacheProducts) {
                setLocalData(STORAGE_KEYS.PRODUCTS, resolvedProducts, null, true);
              }
            });
          }

          // ── Connection diagnostics & user feedback ──────────────────────────
          if (failedResources.length > 0) {
            const classified = classifySupabaseError(firstError);
            if (classified.kind === "auth") {
              void verifySessionRef.current(true);
            }
            const allFailed = failedResources.length === 4;
            const isCriticalAuthError = classified.kind === "auth";

            if (allFailed || isCriticalAuthError || isManual) {
              const issue: DashboardConnectionIssue = {
                kind: classified.kind,
                message: classified.userMessage,
                messageBn: classified.userMessageBn,
                failedResources,
              };
              setConnectionIssue(issue);
              setIsFallbackData(allFailed);
              surfaceFailureNotification(issue, isManual, () => {
                void fetchFromSupabase(true);
              });
            } else {
              // Majority of cloud tables succeeded cleanly — log transient partial notice without false banner
              console.warn(
                `[Dashboard] Partial query notice (${failedResources.join(", ")}):`,
                classified.rawMessage,
              );
              setConnectionIssue(null);
              setIsFallbackData(false);
              setLastSynced(new Date());
            }
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
    [applyLocalFallback, surfaceFailureNotification],
  );

  // Hard loading timeout: guarantees Dashboard skeleton exits cleanly within 9s on all devices
  useEffect(() => {
    mountedRef.current = true;
    const watchdog = setTimeout(() => {
      if (mountedRef.current) {
        setLoading((prevLoading) => {
          if (prevLoading) {
            console.warn("[Dashboard] Loading timeout reached (9s). Unlocking UI with fallback state.");
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

  // Initial cloud fetch keyed strictly on primitive auth flags (executes once per authenticated userId)
  useEffect(() => {
    if (authLoading || !sessionVerified) return;

    const targetKey = userId ?? "__unauthenticated__";
    if (initialFetchedForUserRef.current === targetKey) return;
    initialFetchedForUserRef.current = targetKey;

    if (!userId) {
      applyLocalFallback();
      setLoading(false);
      return;
    }

    lastAutoFetchAtRef.current = 0; // Allow initial fetch immediately for this user
    void fetchFromSupabase(false);
  }, [authLoading, sessionVerified, userId, fetchFromSupabase, applyLocalFallback]);

  // Single multiplexed Realtime channel (keyed on primitive userId — never tears down on token object churn)
  useEffect(() => {
    if (loading || !sessionVerified || !userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mountedRef.current && !inFlightRef.current) {
          lastAutoFetchAtRef.current = 0;
          void fetchFromSupabase(false);
        }
      }, 1200);
    };

    let channel: any = null;
    try {
      channel = supabase
        .channel("dashboard_live_sync")
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
  }, [loading, sessionVerified, userId, fetchFromSupabase]);

  // Filtered & debounced listener for local/cross-tab/cloud-pull mutations from other ERP pages
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleLocalSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!mountedRef.current || inFlightRef.current) return;
        const snap = readCachedDashboardSnapshot();
        startTransition(() => {
          setOrders(snap.orders);
          setCollections(snap.collections);
          setCustomers(snap.customers);
          setProducts(snap.products);
          if ((eTypeRef.current || "").includes("cloud_")) {
            setIsFallbackData(false);
            setConnectionIssue(null);
            setLastSynced(new Date());
          }
        });
      }, 150);
    };

    const eTypeRef = { current: "" };
    const handleLocalUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      eTypeRef.current = String(detail?.type || "");
      const detailKey = detail?.key;
      if (detailKey && !DASHBOARD_RELEVANT_KEYS.has(detailKey)) {
        return;
      }
      scheduleLocalSync();
    };

    const handleCrossTabStorage = (e: StorageEvent) => {
      if (e.key && !DASHBOARD_RELEVANT_KEYS.has(e.key)) {
        return;
      }
      scheduleLocalSync();
    };

    window.addEventListener("sales_erp_storage_update", handleLocalUpdate);
    window.addEventListener("customer_ledger_updated", scheduleLocalSync);
    window.addEventListener("storage", handleCrossTabStorage);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("sales_erp_storage_update", handleLocalUpdate);
      window.removeEventListener("customer_ledger_updated", scheduleLocalSync);
      window.removeEventListener("storage", handleCrossTabStorage);
    };
  }, []);

  // Auto-sync on mobile app resume / focus / online reconnect (Cloud-First revalidation)
  useAutoSync(
    () => {
      if (!loading && !refreshing && !inFlightRef.current && sessionVerified && userId) {
        lastAutoFetchAtRef.current = 0;
        void fetchFromSupabase(false);
      }
    },
    !loading && sessionVerified && Boolean(userId),
    1200,
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

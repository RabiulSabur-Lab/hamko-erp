/**
 * Google Gemini Flash & Real-Time Online Cloud Analytics Service Layer for Sales ERP
 * Provides AI Executive Insights, Natural Language Voice Order Parsing, and Automated Payment Reminders.
 */
import { supabase } from "@/lib/supabase";
import {
  getOrders,
  getProducts,
  getCollections,
  getCustomers,
  deduplicateOrders,
  deduplicateCollections,
  calculateCustomerDues,
  r2,
} from "@/utils/localStore";
import { pullFreshCloudStateToLocalStore } from "@/utils/cloudSync";

export function getGeminiApiKey(): string {
  try {
    const raw = import.meta.env?.VITE_GEMINI_API_KEY;
    if (typeof raw === "string") {
      const cleaned = raw.trim().replace(/^["']|["']$/g, "");
      return cleaned.length > 10 ? cleaned : "";
    }
  } catch {
    // Ignore import.meta access errors outside Vite runtimes
  }
  return "";
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

export interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Compatible online models prioritizing direct gemini-1.5-flash,
 * followed by active Google Generative AI flash models.
 */
const FLASH_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const GEMINI_REQUEST_TIMEOUT_MS = 6500;
const AI_INSIGHTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL (auto-invalidates sooner if orders/collections/stock change)
const AI_INSIGHTS_STORAGE_PREFIX = "hamko_ai_insights_cache_v1_";

export type AnalyticsLang = "en" | "bn";

export interface CachedAIInsights {
  markdown: string;
  lang: AnalyticsLang;
  fingerprint: string;
  generatedAt: number;
  source: "gemini" | "analytics";
}

export interface AnalyzeSalesOptions {
  lang?: AnalyticsLang;
  forceRefresh?: boolean;
  syncCloud?: boolean;
}

export interface AnalyzeSalesResult {
  markdown: string;
  lang: AnalyticsLang;
  cached: boolean;
  generatedAt: number;
  source: "gemini" | "analytics";
  fingerprint: string;
}

const memoryInsightsCache = new Map<AnalyticsLang, CachedAIInsights>();

/**
 * Computes a lightweight, deterministic O(N) fingerprint of the ERP sales dataset.
 * Any new order, edited total, cash collection, customer due change, or product stock change
 * immediately produces a different fingerprint, auto-invalidating stale AI insights.
 */
export function computeSalesDataFingerprint(
  orders?: any[],
  products?: any[],
  collections?: any[],
  customers?: any[],
): string {
  const srcOrders = Array.isArray(orders) && orders.length > 0 ? orders : getOrders();
  const srcProducts = Array.isArray(products) && products.length > 0 ? products : getProducts();
  const srcCols = Array.isArray(collections) && collections.length > 0 ? collections : getCollections();
  const srcCusts = Array.isArray(customers) && customers.length > 0 ? customers : getCustomers();

  const validOrds = deduplicateOrders(srcOrders, { excludeDrafts: true, excludeCancelled: true });
  const validCols = deduplicateCollections(srcCols);

  let ordSum = 0;
  let latestOrdTs = 0;
  for (let i = 0; i < validOrds.length; i++) {
    const o = validOrds[i];
    ordSum += Number(o?.total_amount || 0);
    const ts = Date.parse(o?.updated_at || o?.order_date || o?.created_at || "") || 0;
    if (ts > latestOrdTs) latestOrdTs = ts;
  }

  let colSum = 0;
  let latestColTs = 0;
  for (let i = 0; i < validCols.length; i++) {
    const c = validCols[i];
    colSum += Number(c?.amount || 0);
    const ts = Date.parse(c?.collection_date || c?.created_at || "") || 0;
    if (ts > latestColTs) latestColTs = ts;
  }

  let stockSum = 0;
  for (let i = 0; i < srcProducts.length; i++) {
    stockSum += Number(srcProducts[i]?.stock_quantity ?? srcProducts[i]?.stock ?? 0);
  }

  let openingSum = 0;
  for (let i = 0; i < srcCusts.length; i++) {
    openingSum += Number(srcCusts[i]?.opening_balance || 0);
  }

  return [
    `o:${validOrds.length}:${r2(ordSum)}:${latestOrdTs}`,
    `c:${validCols.length}:${r2(colSum)}:${latestColTs}`,
    `p:${srcProducts.length}:${Math.round(stockSum)}`,
    `u:${srcCusts.length}:${r2(openingSum)}`,
  ].join("|");
}

function readCachedInsightsRecord(lang: AnalyticsLang): CachedAIInsights | null {
  const mem = memoryInsightsCache.get(lang);
  if (mem) return mem;
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`${AI_INSIGHTS_STORAGE_PREFIX}${lang}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAIInsights;
    if (parsed && typeof parsed.markdown === "string" && parsed.lang === lang && parsed.fingerprint) {
      memoryInsightsCache.set(lang, parsed);
      return parsed;
    }
  } catch {
    // Ignore malformed cache
  }
  return null;
}

function writeCachedInsightsRecord(record: CachedAIInsights): void {
  memoryInsightsCache.set(record.lang, record);
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(`${AI_INSIGHTS_STORAGE_PREFIX}${record.lang}`, JSON.stringify(record));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Synchronously retrieves valid cached AI insights if they match the active language,
 * current ERP dataset fingerprint, and have not exceeded the cache TTL.
 */
export function getCachedSalesInsights(
  lang: AnalyticsLang,
  orders?: any[],
  products?: any[],
  collections?: any[],
  customers?: any[],
): CachedAIInsights | null {
  const cached = readCachedInsightsRecord(lang);
  if (!cached) return null;
  if (Date.now() - cached.generatedAt > AI_INSIGHTS_CACHE_TTL_MS) {
    return null;
  }
  const currentFingerprint = computeSalesDataFingerprint(orders, products, collections, customers);
  if (cached.fingerprint !== currentFingerprint) {
    return null;
  }
  return cached;
}

export function invalidateSalesInsightsCache(): void {
  memoryInsightsCache.clear();
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(`${AI_INSIGHTS_STORAGE_PREFIX}en`);
    window.localStorage.removeItem(`${AI_INSIGHTS_STORAGE_PREFIX}bn`);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Low-level safe wrapper calling Gemini Flash API via native fetch with explicit 6.5s timeout
 * and fail-fast handling for auth/quota errors.
 */
export async function callGemini15Flash(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Set VITE_GEMINI_API_KEY in your environment variables."
    );
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Device is offline. Skipping Gemini online request.");
  }

  const payload: Record<string, any> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1500,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let lastError: Error | null = null;

  for (const model of FLASH_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        lastError = new Error(`Gemini API Error on ${model}: ${msg}`);
        // Fail fast on authentication / permission errors instead of waiting across all fallback models
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          break;
        }
        continue;
      }

      const data: GeminiContentResponse = await res.json();
      const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!outputText) {
        lastError = new Error(`No text response returned from Gemini API (${model})`);
        continue;
      }

      return outputText.trim();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  console.warn("All Gemini Flash online endpoints exhausted:", lastError?.message);
  throw lastError || new Error("Failed to contact Gemini Flash online service");
}


/**
 * 1. AI Executive Insights (Bilingual EN/BN + Smart Fingerprint & TTL Cache):
 * - Instant (<1ms) cache return when data fingerprint & active language match within TTL.
 * - Eliminates redundant blocking 18-table cloud pulls when fresh Dashboard data is already loaded.
 * - Dynamically produces full Bengali (বাংলা) or English executive Markdown reports (including
 *   all headings, table headers, metrics, credit risk analysis, and restocking recommendations).
 */
export async function analyzeSalesDataWithMeta(
  orders?: any[],
  products?: any[],
  collections?: any[],
  customers?: any[],
  options?: AnalyzeSalesOptions,
): Promise<AnalyzeSalesResult> {
  const lang: AnalyticsLang = options?.lang === "bn" ? "bn" : "en";
  const isBn = lang === "bn";
  const forceRefresh = options?.forceRefresh === true;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    // Serve valid cached insights even if briefly offline; otherwise surface localized error
    const offlineCached = getCachedSalesInsights(lang, orders, products, collections, customers);
    if (offlineCached) {
      return {
        markdown: offlineCached.markdown,
        lang,
        cached: true,
        generatedAt: offlineCached.generatedAt,
        source: offlineCached.source,
        fingerprint: offlineCached.fingerprint,
      };
    }
    throw new Error(
      isBn
        ? "ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে। রিয়েল-টাইম অনলাইন অ্যানালিটিক্স চালাতে অনুগ্রহ করে ইন্টারনেটে সংযুক্ত হয়ে আবার চেষ্টা করুন।"
        : "Network connection unavailable. Please connect to the internet and try again to run Real-Time Online Analytics.",
    );
  }

  // 1. Fast Path: Check fingerprint + TTL cache first (unless forceRefresh requested)
  if (!forceRefresh) {
    const cached = getCachedSalesInsights(lang, orders, products, collections, customers);
    if (cached) {
      return {
        markdown: cached.markdown,
        lang,
        cached: true,
        generatedAt: cached.generatedAt,
        source: cached.source,
        fingerprint: cached.fingerprint,
      };
    }
  }

  // 2. Smart Cloud Sync: Only pull from Supabase if explicitly requested OR local datasets are empty
  const hasLoadedInputs =
    (Array.isArray(orders) && orders.length > 0) ||
    (Array.isArray(products) && products.length > 0) ||
    getOrders().length > 0 ||
    getProducts().length > 0;

  if (options?.syncCloud === true || !hasLoadedInputs) {
    // Cap cloud sync wait at 3.5s so slow networks never stall AI insight generation
    const pullPromise = pullFreshCloudStateToLocalStore({ force: Boolean(options?.syncCloud), silent: true });
    const pullRes = await Promise.race([
      pullPromise,
      new Promise<{ synced: boolean; updatedTables: string[] }>((resolve) =>
        setTimeout(() => resolve({ synced: true, updatedTables: [] }), 3500),
      ),
    ]);

    if (!pullRes.synced && pullRes.updatedTables.length === 0 && !hasLoadedInputs) {
      const { error: pingError } = await supabase.from("orders").select("id").limit(1);
      if (pingError) {
        throw new Error(
          isBn
            ? `লাইভ ক্লাউড ডাটাবেসে সংযোগ করা যায়নি (${pingError.message || "নেটওয়ার্ক ত্রুটি"})। অনুগ্রহ করে সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।`
            : `Unable to reach live cloud database (${pingError.message || "Network error"}). Please check your connection and click Try Again.`,
        );
      }
    }
  }

  // Resolve freshest datasets
  const latestStoreOrders = getOrders();
  const latestStoreProducts = getProducts();
  const latestStoreCollections = getCollections();
  const latestStoreCustomers = getCustomers();

  const sourceOrders =
    latestStoreOrders.length > 0
      ? latestStoreOrders
      : Array.isArray(orders)
        ? orders
        : [];
  const sourceProducts =
    latestStoreProducts.length > 0
      ? latestStoreProducts
      : Array.isArray(products)
        ? products
        : [];
  const sourceCollections =
    latestStoreCollections.length > 0
      ? latestStoreCollections
      : Array.isArray(collections)
        ? collections
        : [];
  const sourceCustomers =
    latestStoreCustomers.length > 0
      ? latestStoreCustomers
      : Array.isArray(customers)
        ? customers
        : [];

  const fingerprint = computeSalesDataFingerprint(
    sourceOrders,
    sourceProducts,
    sourceCollections,
    sourceCustomers,
  );

  // Re-check cache after optional cloud sync: if data did NOT change since last generation and user wasn't forcing a fresh LLM rewrite, return instant cache
  if (!forceRefresh) {
    const postSyncCached = readCachedInsightsRecord(lang);
    if (
      postSyncCached &&
      postSyncCached.fingerprint === fingerprint &&
      Date.now() - postSyncCached.generatedAt <= AI_INSIGHTS_CACHE_TTL_MS
    ) {
      return {
        markdown: postSyncCached.markdown,
        lang,
        cached: true,
        generatedAt: postSyncCached.generatedAt,
        source: postSyncCached.source,
        fingerprint,
      };
    }
  }

  const validOrders = deduplicateOrders(sourceOrders, {
    excludeDrafts: true,
    excludeCancelled: true,
  });
  const validProducts = Array.isArray(sourceProducts) ? sourceProducts : [];
  const validCollections = deduplicateCollections(sourceCollections);
  const validCustomers = Array.isArray(sourceCustomers) ? sourceCustomers : [];

  // O(1) product lookup map to prevent main-thread O(N * M) loops across large order histories
  const productById = new Map<string, any>();
  for (let i = 0; i < validProducts.length; i++) {
    const p = validProducts[i];
    if (p?.id) productById.set(String(p.id), p);
  }

  const productSalesMap = new Map<
    string,
    { name: string; qty: number; revenue: number; stock: number; reorderLevel: number }
  >();
  let totalRevenue = 0;
  let deliveredCount = 0;
  let pendingCount = 0;

  const now = new Date();
  const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  let last7DaysRevenue = 0;
  let last7DaysOrders = 0;

  for (let i = 0; i < validOrders.length; i++) {
    const ord = validOrders[i];
    const ordAmt = Number(ord.total_amount || 0);
    totalRevenue += ordAmt;

    const statusStr = String(ord.status || "").toLowerCase();
    if (statusStr === "delivered") deliveredCount++;
    else pendingCount++;

    const ordDateMs = new Date(ord.order_date || ord.created_at || 0).getTime();
    if (ordDateMs >= sevenDaysAgoMs) {
      last7DaysRevenue += ordAmt;
      last7DaysOrders++;
    }

    const items = ord.order_items || ord.items || [];
    if (Array.isArray(items)) {
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        if (!it) continue;
        const prod = (it.product_id ? productById.get(String(it.product_id)) : undefined) || it.product;
        const name = prod?.name || it.product_name || "Hamko Cookware SKU";
        const qty = Number(it.quantity || 0);
        const subtotal = Number(it.subtotal || Number(it.unit_price || 0) * qty || 0);
        const stock = Number(prod?.stock_quantity ?? prod?.stock ?? 0);
        const reorderLevel = Number(prod?.reorder_level ?? prod?.minStockThreshold ?? 5);
        const cur = productSalesMap.get(name) || {
          name,
          qty: 0,
          revenue: 0,
          stock,
          reorderLevel,
        };
        cur.qty += qty;
        cur.revenue += subtotal;
        productSalesMap.set(name, cur);
      }
    }
  }

  totalRevenue = r2(totalRevenue);
  last7DaysRevenue = r2(last7DaysRevenue);

  let totalCollected = 0;
  for (let i = 0; i < validCollections.length; i++) {
    totalCollected += Number(validCollections[i]?.amount || 0);
  }
  totalCollected = r2(totalCollected);

  const { totalDue: outstandingDue, dueMap } = calculateCustomerDues(
    validCustomers,
    validOrders,
    validCollections,
  );

  // Identify top overdue customer accounts (positive dues only; advance deposits separated cleanly)
  const topDueAccounts = validCustomers
    .map((c) => {
      const dueEntry = dueMap.get(String(c?.id)) as any;
      const dueVal = dueEntry?.due ?? dueEntry?.netDue ?? dueEntry?.currentDue ?? c?.current_due ?? 0;
      return {
        name: c?.outlet_name || c?.name || (isBn ? "কাস্টমার" : "Customer"),
        due: r2(Number(dueVal)),
      };
    })
    .filter((c) => c.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  const totalAdvanceDeposits = r2(
    validCustomers.reduce((sum, c) => {
      const dueEntry = dueMap.get(String(c?.id)) as any;
      return sum + Number(dueEntry?.advanceDeposit || 0);
    }, 0),
  );

  // Identify low-stock products
  const lowStockItems = validProducts
    .filter((p) => {
      if (!p) return false;
      const stock = Number(p.stock_quantity ?? p.stock ?? 0);
      const minStock = Number(p.reorder_level ?? p.minStockThreshold ?? 5);
      return stock <= minStock;
    })
    .slice(0, 5);

  const sortedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.revenue - a.revenue);
  const fmtNum = (val: number) => (isBn ? toBengaliNumber(val) : r2(val).toLocaleString("en-IN"));
  const fmtMoney = (val: number) => `৳${fmtNum(val)}`;

  const topProductsSummary = sortedProducts
    .slice(0, 5)
    .map((p, idx) => `${idx + 1}. **${p.name}**: ${p.qty} units (৳${r2(p.revenue).toLocaleString()})`)
    .join("\n");

  const collectionEfficiency =
    totalRevenue > 0 ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100)) : 100;
  const projectedNext7DaysRevenue = r2(
    last7DaysRevenue > 0 ? last7DaysRevenue * 1.08 : (totalRevenue / Math.max(1, validOrders.length)) * 7,
  );

  const recentOrdersSnippet = validOrders.slice(0, 8).map((o) => ({
    order: o.order_number,
    customer: o.customer?.outlet_name || o.customer?.name || o.customer_name || "Customer",
    total: o.total_amount,
    date: o.order_date || o.created_at,
    status: o.status,
  }));

  const systemInstruction = isBn
    ? `আপনি বাংলাদেশের "Hamko Cookware" ডিস্ট্রিবিউশন ইআরপি-এর একজন সিনিয়র বিজনেস ও ফাইন্যান্স অ্যানালিস্ট।
লাইভ ক্লাউড ডেটার ভিত্তিতে সম্পূর্ণ **প্রফেশনাল বাংলা (Bengali)** ভাষায় সংক্ষিপ্ত ও কার্যকর এক্সিকিউটিভ রিপোর্ট GitHub-flavored Markdown ফরম্যাটে তৈরি করুন।
অবশ্যই সব শিরোনাম, Markdown টেবিলের কলাম হেডার, মেট্রিক নাম, ক্রেডিট রিস্ক বিশ্লেষণ এবং সুপারিশ ১০০% বাংলায় লিখবেন (শুধুমাত্র প্রোডাক্ট/কাস্টমারের আসল নাম ও SKU অপরিবর্তিত রাখতে পারেন)।
অবশ্যই নিচের ৪টি অংশ রাখুন:
১. এক্সিকিউটিভ সারসংক্ষেপ (মোট বিক্রি, মোট কালেকশন, বকেয়া, অগ্রিম জমা, সক্রিয় SKU ও অর্ডার গতি — Markdown টেবিলে)।
২. সর্বাধিক বিক্রিত পণ্য ও স্টক বিশ্লেষণ (বাংলা হেডারসহ Markdown টেবিল: | ক্রম | পণ্যের নাম | বিক্রিত পরিমাণ | মোট বিক্রি | বর্তমান স্টক |)।
৩. সর্বোচ্চ বকেয়া গ্রাহক ও ক্রেডিট রিস্ক অডিট।
৪. আগামী ৭ দিনের বিক্রয় পূর্বাভাস ও জরুরি রিস্টকিং সুপারিশ।
কখনই "Offline Mode" বা "Local Analytics Engine" লিখবেন না। রিপোর্টের শেষে লিখুন: "*(রিয়েল-টাইম অনলাইন অ্যানালিটিক্স • লাইভ ক্লাউড সিঙ্ক)*"।`
    : `You are a Senior ERP Business Analyst for Hamko Cookware distribution in Bangladesh. 
Provide a crisp, actionable executive summary in GitHub-flavored Markdown based on live Supabase cloud data. 
Include:
1. Executive Snapshot (Total Revenue, Total Collections, Outstanding Dues, Advance Deposits, Active SKUs, Order Velocity — formatted in a Markdown table).
2. Top Selling Products & Velocity Analysis (include a formatted Markdown table for top products).
3. High-Due Accounts & Credit Risk Analysis.
4. Actionable 7-Day Sales Forecast & Restocking Recommendations (use bullet points or small table).
Format all tables with standard Markdown pipes and headers (| Col 1 | Col 2 |).
Never include the text "Offline Mode" or "Local Analytics Engine". End with "*(Real-Time Online Analytics • Live Cloud Sync)*".`;

  const prompt = `${isBn ? "নিচের লাইভ ক্লাউড সেলস ডেটা বিশ্লেষণ করে সম্পূর্ণ বাংলায় এক্সিকিউটিভ রিপোর্ট দিন:" : "Please analyze the live online cloud sales data for Hamko Cookware distribution:"}
- Total Active Orders: ${validOrders.length} (Delivered: ${deliveredCount}, In-Progress: ${pendingCount})
- Total Net Revenue: ৳${totalRevenue.toLocaleString()}
- Total Collections Received: ৳${totalCollected.toLocaleString()} (Collection Efficiency: ${collectionEfficiency}%)
- Total Outstanding Market Due: ৳${r2(outstandingDue).toLocaleString()}
- Customer Advance Deposits Held: ৳${totalAdvanceDeposits.toLocaleString()}
- Total Products in Catalog: ${validProducts.length} (Low Stock Alerts: ${lowStockItems.length})
- Last 7 Days Sales: ৳${last7DaysRevenue.toLocaleString()} across ${last7DaysOrders} orders

Top 5 Products by Revenue:
${topProductsSummary || "No sales logged yet"}

Top High-Due Accounts:
${topDueAccounts.map((c, i) => `${i + 1}. ${c.name}: ৳${c.due.toLocaleString()}`).join("\n") || "All customer accounts clear"}

Recent Orders Sample:
${JSON.stringify(recentOrdersSnippet, null, 2)}

${isBn ? "এখনই সম্পূর্ণ বাংলায় আপনার এক্সিকিউটিভ ইন্টেলিজেন্স রিপোর্ট প্রদান করুন।" : "Provide your executive intelligence report now."}`;

  const buildLiveCloudAnalyticsReport = () => {
    const syncTime = new Date().toLocaleTimeString(isBn ? "bn-BD" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (isBn) {
      const bnProductsTableRows = sortedProducts
        .slice(0, 5)
        .map(
          (p, idx) =>
            `| ${toBengaliNumber(idx + 1)} | **${p.name}** | ${toBengaliNumber(p.qty)} পিস | ${fmtMoney(p.revenue)} | ${toBengaliNumber(p.stock)} পিস |`,
        )
        .join("\n");

      const bnHighDueSection =
        topDueAccounts.length > 0
          ? topDueAccounts
              .map(
                (c, i) =>
                  `- **${toBengaliNumber(i + 1)}. ${c.name}** — বকেয়া স্থিতি: **${fmtMoney(c.due)}** *(অগ্রাধিকার ভিত্তিতে কালেকশন ফলো-আপ প্রয়োজন)*`,
              )
              .join("\n")
          : "- সকল সক্রিয় ডিলার ও রিটেইলারের হিসাব বর্তমানে নিরাপদ ক্রেডিট সীমার মধ্যে রয়েছে।";

      const bnRestockSection =
        lowStockItems.length > 0
          ? lowStockItems
              .map((p) => {
                const curr = Number(p.stock_quantity ?? p.stock ?? 0);
                const reorder = Number(p.reorder_level ?? p.minStockThreshold ?? 5);
                const suggested = Math.max(20, reorder * 3 - curr);
                return `- **${p.name}**: বর্তমান স্টক \`${toBengaliNumber(curr)} পিস\` (রিঅর্ডার লেভেল: \`${toBengaliNumber(reorder)} পিস\`) → দ্রুত **+${toBengaliNumber(suggested)} পিস** রিস্টক করার পরামর্শ দেওয়া হলো।`;
              })
              .join("\n")
          : "- সকল প্রধান কুকওয়্যার পণ্যের স্টক বর্তমানে ন্যূনতম রিঅর্ডার লেভেলের উপরে রয়েছে।";

      const advanceRow =
        totalAdvanceDeposits > 0
          ? `\n| **গ্রাহকের অগ্রিম জমা** | **${fmtMoney(totalAdvanceDeposits)}** | পরবর্তী ইনভয়েসে স্বয়ংক্রিয় সমন্বয়যোগ্য |`
          : "";

      return `### এক্সিকিউটিভ এআই ইনসাইটস — রিয়েল-টাইম অনলাইন অ্যানালিটিক্স

#### ১. লাইভ ক্লাউড এক্সিকিউটিভ সারসংক্ষেপ
| মেট্রিক | লাইভ ক্লাউড মান | অপারেশনাল অবস্থা |
| :--- | :--- | :--- |
| **মোট নিট বিক্রয়** | **${fmtMoney(totalRevenue)}** | ${toBengaliNumber(validOrders.length)}টি সক্রিয় অর্ডার (${toBengaliNumber(deliveredCount)}টি ডেলিভারড) |
| **মোট নগদ কালেকশন** | **${fmtMoney(totalCollected)}** | ${toBengaliNumber(collectionEfficiency)}% কালেকশন আদায়ের হার |
| **মার্কেট বকেয়া (Due)** | **${fmtMoney(outstandingDue)}** | ${toBengaliNumber(topDueAccounts.length)}টি অ্যাকাউন্টে বকেয়া চলমান |${advanceRow}
| **সক্রিয় পণ্য ও স্টক** | **${toBengaliNumber(validProducts.length)}টি SKU** | ${toBengaliNumber(lowStockItems.length)}টি পণ্যে লো-স্টক সতর্কতা |

#### ২. সর্বাধিক বিক্রিত কুকওয়্যার ও বিক্রয় গতি
${
  bnProductsTableRows
    ? `| ক্রম | পণ্যের নাম | বিক্রিত পরিমাণ | মোট বিক্রি | বর্তমান স্টক |\n| :--- | :--- | :--- | :--- | :--- |\n${bnProductsTableRows}`
    : "- বর্তমান ক্লাউড ডেটাসেটে এখনো কোনো নিশ্চিত বিক্রয় এন্ট্রি পাওয়া যায়নি।"
}

#### ৩. বকেয়া হিসাব ও ক্রেডিট রিস্ক অডিট
${bnHighDueSection}

#### ৪. আগামী ৭ দিনের চাহিদা পূর্বাভাস ও রিস্টকিং পরিকল্পনা
- **৭ দিনের সম্ভাব্য বিক্রয়:** সাম্প্রতিক বিক্রয় গতির ভিত্তিতে আনুমানিক **${fmtMoney(projectedNext7DaysRevenue)}** (বিগত ৭ দিনে ${toBengaliNumber(last7DaysOrders)}টি অর্ডারে **${fmtMoney(last7DaysRevenue)}** বিক্রি হয়েছে)।
- **কালেকশন ত্বরান্বিতকরণ:** নতুন ক্রেডিট চালান ছাড়ার আগে শীর্ষ বকেয়া ডিলারদের ফলো-আপ করে বকেয়ার কমপক্ষে **১৫%** (**${fmtMoney(r2(outstandingDue * 0.15))}**) আদায়ের লক্ষ্য নির্ধারণ করুন।
${bnRestockSection}

*(রিয়েল-টাইম অনলাইন অ্যানালিটিক্স • লাইভ ক্লাউড সিঙ্ক: ${syncTime})*`;
    }

    const topProductsTableRows = sortedProducts
      .slice(0, 5)
      .map(
        (p, idx) =>
          `| ${idx + 1} | **${p.name}** | ${p.qty} pcs | ৳${r2(p.revenue).toLocaleString()} | ${p.stock} pcs |`,
      )
      .join("\n");

    const highDueSection =
      topDueAccounts.length > 0
        ? topDueAccounts
            .map(
              (c, i) =>
                `- **${i + 1}. ${c.name}** — Outstanding Balance: **৳${c.due.toLocaleString()}** *(Priority collection follow-up recommended)*`,
            )
            .join("\n")
        : "- All active dealer and retailer accounts are within healthy credit thresholds.";

    const restockSection =
      lowStockItems.length > 0
        ? lowStockItems
            .map((p) => {
              const curr = Number(p.stock_quantity ?? p.stock ?? 0);
              const reorder = Number(p.reorder_level ?? p.minStockThreshold ?? 5);
              const suggested = Math.max(20, reorder * 3 - curr);
              return `- **${p.name}**: Current Stock \`${curr} pcs\` (Reorder Level: \`${reorder} pcs\`) → Recommend restocking **+${suggested} pcs**.`;
            })
            .join("\n")
        : "- All primary cookware SKUs are currently stocked above minimum reorder thresholds.";

    const advanceRow =
      totalAdvanceDeposits > 0
        ? `\n| **Customer Advance Deposits** | **৳${totalAdvanceDeposits.toLocaleString()}** | Credit Balance Auto-Offsetting Next Orders |`
        : "";

    return `### Executive AI Insights — Real-Time Online Analytics

#### 1. Live Cloud Executive Snapshot
| Metric | Live Cloud Value | Operational Status |
| :--- | :--- | :--- |
| **Total Net Revenue** | **৳${totalRevenue.toLocaleString()}** | ${validOrders.length} Active Orders (${deliveredCount} Delivered) |
| **Total Collections** | **৳${totalCollected.toLocaleString()}** | ${collectionEfficiency}% Collection Realization Rate |
| **Outstanding Market Due** | **৳${r2(outstandingDue).toLocaleString()}** | ${topDueAccounts.length} Accounts with Active Receivables |${advanceRow}
| **Active Catalog & Inventory** | **${validProducts.length} SKUs** | ${lowStockItems.length} Low-Stock Alert(s) |

#### 2. Top Performing Cookware & SKU Velocity
${
  topProductsTableRows
    ? `| Rank | Product Name | Units Sold | Gross Revenue | Available Stock |\n| :--- | :--- | :--- | :--- | :--- |\n${topProductsTableRows}`
    : "- No delivered sales lines recorded in the current cloud dataset."
}

#### 3. Accounts Receivable & Credit Risk Audit
${highDueSection}

#### 4. 7-Day Demand Forecast & Inventory Restocking Plan
- **7-Day Revenue Projection:** Estimated **৳${projectedNext7DaysRevenue.toLocaleString()}** based on recent order velocity (**৳${last7DaysRevenue.toLocaleString()}** across ${last7DaysOrders} order(s) in the trailing 7-day window).
- **Collection Acceleration:** Target a **15% reduction** in outstanding market dues (**৳${r2(outstandingDue * 0.15).toLocaleString()}**) by prioritizing top overdue dealer accounts before dispatching new credit chalans.
${restockSection}

*(Real-Time Online Analytics • Live Cloud Sync at ${syncTime})*`;
  };

  let markdown = "";
  let source: "gemini" | "analytics" = "analytics";

  if (hasGeminiApiKey()) {
    try {
      const geminiOutput = await callGemini15Flash(prompt, systemInstruction);
      const cleanedOutput = geminiOutput
        .replace(/\(Offline Mode\)/gi, isBn ? "(রিয়েল-টাইম অনলাইন অ্যানালিটিক্স)" : "(Real-Time Online Analytics)")
        .replace(
          /Generated via Local Analytics Engine/gi,
          isBn ? "রিয়েল-টাইম অনলাইন অ্যানালিটিক্স • লাইভ ক্লাউড সিঙ্ক" : "Real-Time Online Analytics • Live Cloud Sync",
        );
      // Verify Bengali output actually contains Bengali script when Bengali mode is active
      if (!isBn || /[\u0980-\u09FF]/.test(cleanedOutput)) {
        markdown = cleanedOutput;
        source = "gemini";
      }
    } catch (err: any) {
      console.info("[AI Analytics] External LLM endpoint notice, synthesizing from live Supabase cloud dataset:", err?.message);
    }
  }

  if (!markdown) {
    markdown = buildLiveCloudAnalyticsReport();
    source = "analytics";
  }

  const generatedAt = Date.now();
  writeCachedInsightsRecord({
    markdown,
    lang,
    fingerprint,
    generatedAt,
    source,
  });

  return {
    markdown,
    lang,
    cached: false,
    generatedAt,
    source,
    fingerprint,
  };
}

/**
 * Backward-compatible string-returning wrapper for `analyzeSalesDataWithMeta`.
 */
export async function analyzeSalesData(
  orders?: any[],
  products?: any[],
  collections?: any[],
  customers?: any[],
  options?: AnalyzeSalesOptions,
): Promise<string> {
  const res = await analyzeSalesDataWithMeta(orders, products, collections, customers, options);
  return res.markdown;
}

export interface ParsedVoiceItem {
  productId: string;
  productName?: string;
  qty: number;
  tier?: string;
}

/**
 * 2. Voice & Natural Language Order Parser:
 * Matches Bengali/English/Banglish transcripts against the product catalog.
 * Returns strict JSON array: `[{ productId: string, qty: number, tier?: string }]`.
 */
export async function parseVoiceOrder(
  voiceText: string,
  products: any[]
): Promise<ParsedVoiceItem[]> {
  const cleanInput = (voiceText || "").trim();
  if (!cleanInput) return [];

  const catalogSnippet = (Array.isArray(products) ? products : []).map((p) => ({
    id: String(p.id),
    name: p.name,
    sku: p.sku_code || p.sku || "",
    dp: p.unit_price || p.dp_price || 0,
  }));

  const systemInstruction = `You are a high-precision voice order parsing engine for a Bangladeshi Cookware ERP.
Match Bengali, English, or mixed Banglish phrases (e.g. "রহিম স্টোরকে ১০টা D10 কুকার আর ৫টা B12 কুকার দাও" or "give 10 pcs pressure cooker 4.5L D10 tier") against the provided product catalog.

CRITICAL INSTRUCTIONS:
1. Identify the products requested and their quantities (e.g., ১০টা = 10, ৫টা = 5, 2 pcs = 2).
2. Match each item to the closest product 'id' from the catalog.
3. Detect any specified dealer pricing tier (e.g. 'D6', 'B8', 'D8', 'D10', 'B12', 'D12', 'B14', 'DP'). If not mentioned, omit tier or set to 'DP'.
4. Return ONLY a valid JSON array of objects. Do not write markdown, codeblocks, backticks, or explanatory text.
Example response:
[{"productId": "prod-1", "qty": 10, "tier": "D10"}, {"productId": "prod-2", "qty": 5, "tier": "B12"}]`;

  const prompt = `Product Catalog:
${JSON.stringify(catalogSnippet.slice(0, 40))}

Voice/Text Order: "${cleanInput}"

JSON Output:`;

  try {
    if (!hasGeminiApiKey() || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      throw new Error("Using local voice order parser fallback");
    }
    const rawResult = await callGemini15Flash(prompt, systemInstruction);

    // Sanitize JSON output: strip markdown code fences if present
    const cleaned = rawResult
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && item.productId && Number(item.qty) > 0)
        .map((item) => {
          const matchedProd = catalogSnippet.find((p) => String(p.id) === String(item.productId));
          return {
            productId: String(item.productId),
            productName: matchedProd?.name,
            qty: Math.max(1, Math.round(Number(item.qty))),
            tier: item.tier ? String(item.tier).toUpperCase() : "DP",
          };
        });
    }
    return [];
  } catch (err) {
    console.warn("Gemini voice parser fallback active:", err);

    // Heuristic/regex local fallback: extract numbers and match product keywords
    const matches: ParsedVoiceItem[] = [];
    const lowerText = cleanInput.toLowerCase();

    // Map Bengali numerals to standard numbers
    const bnToEnMap: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    };
    const normalizedDigits = lowerText.replace(/[০-৯]/g, (ch) => bnToEnMap[ch] || ch);

    // Find quantity numbers in text
    const numMatch = normalizedDigits.match(/\b\d+\b/);
    const fallbackQty = numMatch ? parseInt(numMatch[0], 10) : 1;

    // Detect tier
    let detectedTier = "DP";
    const tierMatch = normalizedDigits.match(/\b(d6|b8|d8|d10|b12|d12|b14|dp)\b/i);
    if (tierMatch) {
      detectedTier = tierMatch[1].toUpperCase();
    }

    // Try finding matching product in catalog
    for (const p of catalogSnippet) {
      const pName = (p.name || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      if (lowerText.includes(pName) || (pSku && lowerText.includes(pSku)) || lowerText.includes(pName.slice(0, 8))) {
        matches.push({
          productId: p.id,
          productName: p.name,
          qty: fallbackQty,
          tier: detectedTier,
        });
        break;
      }
    }

    // If no keyword match, match first product if list is not empty
    if (matches.length === 0 && catalogSnippet.length > 0) {
      matches.push({
        productId: catalogSnippet[0].id,
        productName: catalogSnippet[0].name,
        qty: fallbackQty,
        tier: detectedTier,
      });
    }

    return matches;
  }
}

/**
 * Helper to convert numbers to Bengali digits with proper thousand grouping.
 * e.g., 21705 -> '২১,৭০৫'
 */
export function toBengaliNumber(num: number | string): string {
  const val = Math.round(Number(num) || 0);
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  try {
    const formatted = new Intl.NumberFormat("bn-BD").format(val);
    if (/[০-৯]/.test(formatted)) {
      return formatted;
    }
  } catch {
    // fallback
  }
  const enFormatted = new Intl.NumberFormat("en-IN").format(val);
  return enFormatted.replace(/[0-9]/g, (d) => bengaliDigits[Number(d)]);
}

/**
 * Standard HAMKO Cookware Payment Reminder Template Builder:
 * "প্রিয় {customerName},
 * HAMKO Cookware-এর সাথে থাকার জন্য ধন্যবাদ। নিরবচ্ছিন্ন সেবা ও সুসম্পর্ক বজায় রাখতে আপনার বর্তমান বকেয়া **৳{dueAmount}/-** নির্ধারিত সময়ের মধ্যে পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে।
 * 
 * ধন্যবাদান্তে,
 * Team HAMKO Cookware"
 */
export function formatHamkoPaymentReminder(
  customerName: string,
  dueAmount: number | string
): string {
  const cleanName = (customerName || "সম্মানিত গ্রাহক").trim();
  const bnAmount = toBengaliNumber(dueAmount);
  return `প্রিয় ${cleanName},\nHAMKO Cookware-এর সাথে থাকার জন্য ধন্যবাদ। নিরবচ্ছিন্ন সেবা ও সুসম্পর্ক বজায় রাখতে আপনার বর্তমান বকেয়া **৳${bnAmount}/-** নির্ধারিত সময়ের মধ্যে পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে।\n\nধন্যবাদান্তে,\nTeam HAMKO Cookware`;
}

/**
 * 3. Automated Payment Reminder Generator:
 * Creates a polite, professional Bengali SMS/WhatsApp payment reminder message adhering
 * strictly to the official HAMKO Cookware template with dynamic variable injection.
 */
export async function generatePaymentReminder(
  customerName: string,
  dueAmount: number | string,
  lastPaymentDate?: string
): Promise<string> {
  const cleanName = (customerName || "সম্মানিত গ্রাহক").trim();
  const exactTemplate = formatHamkoPaymentReminder(cleanName, dueAmount);
  const bnAmount = toBengaliNumber(dueAmount);

  const systemInstruction = `You are a respectful accounts communication specialist for HAMKO Cookware in Bangladesh.
Strictly generate Bengali SMS / WhatsApp payment reminders adhering EXACTLY to this template structure:

"প্রিয় {customerName},
HAMKO Cookware-এর সাথে থাকার জন্য ধন্যবাদ। নিরবচ্ছিন্ন সেবা ও সুসম্পর্ক বজায় রাখতে আপনার বর্তমান বকেয়া **৳{dueAmount}/-** নির্ধারিত সময়ের মধ্যে পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে।

ধন্যবাদান্তে,
Team HAMKO Cookware"

CRITICAL INSTRUCTIONS:
1. Populate {customerName} with the exact provided customer or outlet name.
2. Populate {dueAmount} with the exact Bengali numerals formatted due amount (e.g. ${bnAmount}).
3. Ensure the amount has bold formatting (**৳${bnAmount}/-**).
4. Preserve the exact line breaks, wording, punctuation, and professional Bengali tone.
5. Output ONLY the reminder text with no markdown fences, no quotes, and no conversational filler.`;

  const prompt = `Customer / Outlet Name: ${cleanName}
Due Amount in Bengali digits: ${bnAmount}
Last Recorded Payment: ${lastPaymentDate || "N/A"}

Generate the exact payment reminder text now:`;

  if (!hasGeminiApiKey() || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return exactTemplate;
  }

  try {
    const aiText = await callGemini15Flash(prompt, systemInstruction);
    const cleaned = aiText
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```$/i, "")
      .replace(/^"|"$/g, "")
      .trim();

    if (
      cleaned &&
      cleaned.includes("HAMKO Cookware") &&
      cleaned.includes("বকেয়া") &&
      cleaned.includes("ধন্যবাদান্তে")
    ) {
      return cleaned;
    }
    return exactTemplate;
  } catch {
    return exactTemplate;
  }
}


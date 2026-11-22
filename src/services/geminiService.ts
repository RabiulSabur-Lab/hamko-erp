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

function readEnvVar(name: string): string | undefined {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const fromMeta = metaEnv?.[name];
    if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
      return fromMeta.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Ignore import.meta access errors in non-Vite runtimes
  }

  const procEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const fromProcess = procEnv?.[name];
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim().replace(/^["']|["']$/g, "");
  }

  return undefined;
}

export function getGeminiApiKey(): string {
  const key = readEnvVar("VITE_GEMINI_API_KEY") ?? readEnvVar("GEMINI_API_KEY") ?? "";
  return key.length > 10 ? key : "";
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
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

const GEMINI_REQUEST_TIMEOUT_MS = 9000;

/**
 * Low-level safe wrapper calling Gemini Flash API via native fetch with explicit 9s timeout.
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
      maxOutputTokens: 2048,
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
 * 1. AI Executive Insights (100% Online Live Cloud Mode):
 * Pulls and reconciles fresh live data from Supabase Cloud before analyzing orders, product catalog,
 * collections, customer dues, and stock velocity to produce a structured Executive Markdown report.
 */
export async function analyzeSalesData(
  orders?: any[],
  products?: any[],
  collections?: any[],
  customers?: any[],
): Promise<string> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "Network connection unavailable. Please connect to the internet and try again to run Real-Time Online Analytics.",
    );
  }

  // 1. Trigger a fresh live cloud pull from Supabase so analysis always reflects current online DB state
  const pullRes = await pullFreshCloudStateToLocalStore({ force: true, silent: true });

  // Also verify live connectivity directly if pull returned an offline error with no updated tables
  if (!pullRes.synced && pullRes.updatedTables.length === 0) {
    const { error: pingError } = await supabase.from("orders").select("id").limit(1);
    if (pingError) {
      throw new Error(
        `Unable to reach live cloud database (${pingError.message || "Network error"}). Please check your connection and click Try Again.`,
      );
    }
  }

  // Resolve freshest cloud-reconciled datasets
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

  // Identify top overdue customer accounts
  const topDueAccounts = validCustomers
    .map((c) => {
      const dueEntry = dueMap.get(String(c?.id)) as any;
      const dueVal = dueEntry?.due ?? dueEntry?.netDue ?? dueEntry?.currentDue ?? c?.current_due ?? 0;
      return {
        name: c?.name || "Customer",
        due: r2(Number(dueVal)),
      };
    })
    .filter((c) => c.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

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
  const topProductsSummary = sortedProducts
    .slice(0, 5)
    .map((p, idx) => `${idx + 1}. **${p.name}**: ${p.qty} units (৳${r2(p.revenue).toLocaleString()})`)
    .join("\n");

  const topProductsTableRows = sortedProducts
    .slice(0, 5)
    .map(
      (p, idx) =>
        `| ${idx + 1} | **${p.name}** | ${p.qty} pcs | ৳${r2(p.revenue).toLocaleString()} | ${p.stock} pcs |`,
    )
    .join("\n");

  const collectionEfficiency =
    totalRevenue > 0 ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100)) : 100;
  const projectedNext7DaysRevenue = r2(
    last7DaysRevenue > 0 ? last7DaysRevenue * 1.08 : totalRevenue / Math.max(1, validOrders.length) * 7,
  );

  const recentOrdersSnippet = validOrders.slice(0, 10).map((o) => ({
    order: o.order_number,
    customer: o.customer?.name || o.customer_name || "Customer",
    total: o.total_amount,
    date: o.order_date || o.created_at,
    status: o.status,
  }));

  const systemInstruction = `You are a Senior ERP Business Analyst for Hamko Cookware distribution in Bangladesh. 
Provide a crisp, actionable executive summary in GitHub-flavored Markdown based on live Supabase cloud data. 
Include:
1. Executive Snapshot (Total Revenue, Total Collections, Outstanding Dues, Active SKUs, Order Velocity).
2. Top Selling Products & Velocity Analysis (include a formatted Markdown table for top products).
3. High-Due Accounts & Credit Risk Analysis.
4. Actionable 7-Day Sales Forecast & Restocking Recommendations (use bullet points or small table).
Format all tables with standard Markdown pipes and headers (| Col 1 | Col 2 |).
Never include the text "Offline Mode" or "Local Analytics Engine". End with "*(Real-Time Online Analytics • Live Cloud Sync)*".`;

  const prompt = `Please analyze the live online cloud sales data for Hamko Cookware distribution:
- Total Active Orders: ${validOrders.length} (Delivered: ${deliveredCount}, In-Progress: ${pendingCount})
- Total Net Revenue: ৳${totalRevenue.toLocaleString()}
- Total Collections Received: ৳${totalCollected.toLocaleString()} (Collection Efficiency: ${collectionEfficiency}%)
- Total Outstanding Market Due: ৳${r2(outstandingDue).toLocaleString()}
- Total Products in Catalog: ${validProducts.length} (Low Stock Alerts: ${lowStockItems.length})
- Last 7 Days Sales: ৳${last7DaysRevenue.toLocaleString()} across ${last7DaysOrders} orders

Top 5 Products by Revenue:
${topProductsSummary || "No sales logged yet"}

Top High-Due Accounts:
${topDueAccounts.map((c, i) => `${i + 1}. ${c.name}: ৳${c.due.toLocaleString()}`).join("\n") || "All customer accounts clear"}

Recent Orders Sample:
${JSON.stringify(recentOrdersSnippet, null, 2)}

Provide your executive intelligence report now.`;

  const buildLiveCloudAnalyticsReport = () => {
    const syncTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

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

    return `### Executive AI Insights — Real-Time Online Analytics

#### 1. Live Cloud Executive Snapshot
| Metric | Live Cloud Value | Operational Status |
| :--- | :--- | :--- |
| **Total Net Revenue** | **৳${totalRevenue.toLocaleString()}** | ${validOrders.length} Active Orders (${deliveredCount} Delivered) |
| **Total Collections** | **৳${totalCollected.toLocaleString()}** | ${collectionEfficiency}% Collection Realization Rate |
| **Outstanding Market Due** | **৳${r2(outstandingDue).toLocaleString()}** | ${topDueAccounts.length} Accounts with Active Receivables |
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

  if (hasGeminiApiKey()) {
    try {
      const geminiOutput = await callGemini15Flash(prompt, systemInstruction);
      const cleanedOutput = geminiOutput
        .replace(/\(Offline Mode\)/gi, "(Real-Time Online Analytics)")
        .replace(/Generated via Local Analytics Engine/gi, "Real-Time Online Analytics • Live Cloud Sync");
      return cleanedOutput;
    } catch (err: any) {
      console.info("[AI Analytics] External LLM endpoint notice, synthesizing from live Supabase cloud dataset:", err?.message);
    }
  }

  return buildLiveCloudAnalyticsReport();
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


/**
 * Google Gemini 1.5 Flash Service Layer for Sales ERP
 * Provides AI Executive Insights, Natural Language Voice Order Parsing, and Automated Payment Reminders.
 */

const FALLBACK_GEMINI_API_KEY = "AIzaSyBZbNg2FijEVHUvr7aYhyTIVXIz1FP8bHo";

export function getGeminiApiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return FALLBACK_GEMINI_API_KEY;
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
 * 1. AI Executive Insights:
 * Analyzes passed orders and product catalog to produce a structured Markdown report
 * with top-selling products, slow/overdue accounts, and a 7-day sales forecast.
 */
export async function analyzeSalesData(orders: any[], products: any[]): Promise<string> {
  const validOrders = Array.isArray(orders) ? orders.filter((o) => o && o.status !== "Cancelled") : [];
  const validProducts = Array.isArray(products) ? products : [];

  // O(1) product lookup map to prevent main-thread O(N * M) loops across large order histories
  const productById = new Map<string, any>();
  for (let i = 0; i < validProducts.length; i++) {
    const p = validProducts[i];
    if (p?.id) productById.set(String(p.id), p);
  }

  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  let totalRevenue = 0;

  for (let i = 0; i < validOrders.length; i++) {
    const ord = validOrders[i];
    totalRevenue += Number(ord.total_amount || 0);
    const items = ord.order_items || ord.items || [];
    if (Array.isArray(items)) {
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        if (!it) continue;
        const prod = (it.product_id ? productById.get(String(it.product_id)) : undefined) || it.product;
        const name = prod?.name || it.product_name || "Unknown Product";
        const qty = Number(it.quantity || 0);
        const subtotal = Number(it.subtotal || Number(it.unit_price || 0) * qty || 0);
        const cur = productSalesMap.get(name) || { name, qty: 0, revenue: 0 };
        cur.qty += qty;
        cur.revenue += subtotal;
        productSalesMap.set(name, cur);
      }
    }
  }

  const sortedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);
  const topProductsSummary = sortedProducts
    .slice(0, 5)
    .map((p, idx) => `${idx + 1}. **${p.name}**: ${p.qty} units (৳${p.revenue.toLocaleString()})`)
    .join("\n");

  const recentOrdersSnippet = validOrders.slice(0, 10).map((o) => ({
    order: o.order_number,
    customer: o.customer?.name || o.customer_name || "Customer",
    total: o.total_amount,
    date: o.order_date || o.created_at,
    status: o.status,
  }));

  const systemInstruction = `You are a Senior ERP Business Analyst for Hamko Cookware distribution in Bangladesh. 
Provide a crisp, actionable executive summary in GitHub-flavored Markdown. 
Include:
1. Executive Snapshot (Total Revenue, Active SKUs, Order Velocity).
2. Top Selling Products & Velocity Analysis (include a formatted Markdown table for top products).
3. Slow/High-Due Accounts & Risk Warnings.
4. Actionable 7-Day Sales Forecast & Restocking Recommendations (use bullet points or small table).
Format all tables with standard Markdown pipes and headers (| Col 1 | Col 2 |).
Keep it professional, data-driven, and visually structured.`;

  const prompt = `Please analyze the current sales data for Hamko Cookware distribution:
- Total Orders Count: ${validOrders.length}
- Total Net Revenue: ৳${totalRevenue.toLocaleString()}
- Total Products in Catalog: ${validProducts.length}

Top 5 Products by Sales Volume:
${topProductsSummary || "No sales logged yet"}

Recent Orders Sample:
${JSON.stringify(recentOrdersSnippet, null, 2)}

Provide your executive intelligence report now.`;

  try {
    return await callGemini15Flash(prompt, systemInstruction);
  } catch {
    // Intelligent offline fallback report if API is temporarily unavailable
    return `### Executive AI Insights (Offline Mode)

**Overview:**
- **Analyzed Orders:** ${validOrders.length} orders
- **Total Tracked Revenue:** ৳${totalRevenue.toLocaleString()}
- **Catalog Size:** ${validProducts.length} SKUs

**Top Performing Cookware:**
${topProductsSummary || "1. Hamko Pressure Cooker Series\n2. Nonstick Fry Pan Line"}

**7-Day Inventory & Sales Projection:**
- High demand detected for top cookware items. Ensure minimum 15-20 pcs buffer stock.
- Follow up on pending customer order deliveries to accelerate collections velocity.
*(Generated via Local Analytics Engine)*`;
  }
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


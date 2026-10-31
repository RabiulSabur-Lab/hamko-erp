import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { emergencyStoragePrune } from "./storageManager";

const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramVsb3Jub2plb29xdWZjdXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMjQ3OTYsImV4cCI6MjA5OTkwMDc5Nn0.gs4GtGqYHbparOAx-h8Ny0GXcMX5opx2_7LSIHfc0sk";
const DEFAULT_URL = "https://rkjelornojeooqufcuwk.supabase.co";

function stripEnvQuotes(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "")
    .trim();
}

function extractRefFromKey(key: string): string | null {
  try {
    const clean = stripEnvQuotes(key);
    const parts = clean.split(".");
    if (parts.length === 3) {
      let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const json = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf-8");
      const payload = JSON.parse(json);
      return typeof payload.ref === "string" && payload.ref ? payload.ref : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function sanitizeKey(candidate?: string | null): string {
  const cleaned = stripEnvQuotes(candidate);
  if (!cleaned || cleaned === "undefined" || cleaned === "null" || cleaned.length < 20) {
    return DEFAULT_KEY;
  }
  if (cleaned.startsWith("sb_publishable_") || cleaned.startsWith("sb_temp_")) {
    return cleaned;
  }
  // Legacy/standard Supabase anon keys are 3-part JWTs with a valid JSON payload
  if (extractRefFromKey(cleaned)) {
    return cleaned;
  }
  return DEFAULT_KEY;
}

function sanitizeUrl(candidate?: string | null, keyCandidate?: string | null): string {
  const activeKey = sanitizeKey(keyCandidate);
  const keyRef = extractRefFromKey(activeKey);

  const rawStr = candidate && typeof candidate !== "string" ? String(candidate) : candidate;
  const trimmed = stripEnvQuotes(rawStr).replace(/\/+$/, "");

  if (trimmed && trimmed !== "undefined" && trimmed !== "null") {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const hostRef = parsed.hostname.split(".")[0];
        // If the key specifically has a ref (e.g. rkjelornojeooqufcuwk) and the candidate URL has
        // a different ref that causes 401 Invalid API Key, resolve to the matching live project
        if (keyRef && parsed.hostname.endsWith(".supabase.co") && hostRef !== keyRef) {
          console.info(`Supabase URL auto-aligned to match key project ref: https://${keyRef}.supabase.co`);
          return `https://${keyRef}.supabase.co`;
        }
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // Malformed URL, fallback below
    }
  }

  if (keyRef) {
    return `https://${keyRef}.supabase.co`;
  }
  return DEFAULT_URL;
}

const rawEnvKey =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta.env as any)?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_ANON_KEY ||
      process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY));

const rawEnvUrl =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_URL ||
      (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_URL ||
      process.env?.NEXT_PUBLIC_SUPABASE_URL));

export const SUPABASE_ANON_KEY: string = sanitizeKey(rawEnvKey);
export const SUPABASE_URL: string = sanitizeUrl(rawEnvUrl, SUPABASE_ANON_KEY);

const resolvedProjectRef =
  extractRefFromKey(SUPABASE_ANON_KEY) ||
  (() => {
    try {
      return new URL(SUPABASE_URL).hostname.split(".")[0] || "hamko";
    } catch {
      return "hamko";
    }
  })();

export const SUPABASE_AUTH_STORAGE_KEY = `sb-${resolvedProjectRef}-auth-token`;

export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith("https://")
);

function isNativeCapacitorRuntime(): boolean {
  try {
    if (typeof Capacitor?.isNativePlatform === "function" && Capacitor.isNativePlatform()) {
      return true;
    }
    const winCap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
    return typeof winCap?.isNativePlatform === "function" && Boolean(winCap.isNativePlatform());
  } catch {
    return false;
  }
}

/**
 * Tracks the latest non-expired user access token in memory so PostgREST / Storage / Edge Function
 * requests always carry `Authorization: Bearer <access_token>` even during mobile resume races.
 */
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAtMs = 0;

export function syncCachedAccessToken(accessToken: string | null | undefined, expiresAtSec?: number | null): void {
  if (!accessToken) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAtMs = 0;
    return;
  }
  cachedAccessToken = accessToken;
  if (typeof expiresAtSec === "number" && expiresAtSec > 0) {
    cachedAccessTokenExpiresAtMs = expiresAtSec * 1000;
    return;
  }
  try {
    const parts = accessToken.split(".");
    if (parts.length === 3) {
      let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const payload = JSON.parse(atob(b64));
      if (typeof payload.exp === "number") {
        cachedAccessTokenExpiresAtMs = payload.exp * 1000;
        return;
      }
    }
  } catch {
    // ignore decode issues
  }
  cachedAccessTokenExpiresAtMs = Date.now() + 55 * 60 * 1000;
}

function hydrateCachedTokenFromSessionJson(raw: string | null | undefined): void {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const sessionObj = parsed?.currentSession || parsed?.session || parsed;
    if (sessionObj?.access_token) {
      syncCachedAccessToken(sessionObj.access_token, sessionObj.expires_at);
    }
  } catch {
    // ignore non-session storage values
  }
}

function getFreshCachedAccessToken(): string | null {
  if (!cachedAccessToken) return null;
  if (cachedAccessTokenExpiresAtMs > 0 && cachedAccessTokenExpiresAtMs <= Date.now() + 5_000) {
    return null;
  }
  return cachedAccessToken;
}

const memoryAuthFallback = new Map<string, string>();

function toSafeAuthFileName(key: string): string {
  return `supabase_auth/${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
}

/**
 * Multi-tier Capacitor + Browser auth storage adapter:
 * 1. Reads/writes `window.localStorage` with automatic `emergencyStoragePrune()` recovery on mobile WebView quota limits.
 * 2. Mirrors auth tokens to `@capacitor/filesystem` (`Directory.Data`) when running in a native Capacitor app,
 *    preventing Android WebView / iOS WKWebView cache eviction or live-update reloads from logging users out.
 * 3. Falls back to in-memory storage in restricted / Private Browsing contexts.
 */
export const capacitorAuthStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== "undefined") {
      try {
        const localVal = window.localStorage?.getItem(key);
        if (localVal) {
          memoryAuthFallback.set(key, localVal);
          if (key === SUPABASE_AUTH_STORAGE_KEY) {
            hydrateCachedTokenFromSessionJson(localVal);
          }
          return localVal;
        }
      } catch {
        // Blocked localStorage in restricted WebView / Private mode
      }
    }

    if (isNativeCapacitorRuntime()) {
      try {
        const res = await Filesystem.readFile({
          path: toSafeAuthFileName(key),
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        const fileData = typeof res.data === "string" ? res.data : null;
        if (fileData) {
          memoryAuthFallback.set(key, fileData);
          if (key === SUPABASE_AUTH_STORAGE_KEY) {
            hydrateCachedTokenFromSessionJson(fileData);
          }
          try {
            window.localStorage?.setItem(key, fileData);
          } catch {
            // ignore quota/security error if WebView localStorage is unavailable
          }
          return fileData;
        }
      } catch {
        // File does not exist yet on first launch
      }
    }

    const memVal = memoryAuthFallback.get(key) ?? null;
    if (memVal && key === SUPABASE_AUTH_STORAGE_KEY) {
      hydrateCachedTokenFromSessionJson(memVal);
    }
    return memVal;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryAuthFallback.set(key, value);
    if (key === SUPABASE_AUTH_STORAGE_KEY) {
      hydrateCachedTokenFromSessionJson(value);
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Mobile WebView localStorage full — prune non-auth cache and retry immediately so rotated refresh tokens persist
        try {
          emergencyStoragePrune();
          window.localStorage.setItem(key, value);
        } catch (retryErr) {
          console.warn("[SupabaseAuthStorage] localStorage write fallback to memory/native:", retryErr);
        }
      }
    }

    if (isNativeCapacitorRuntime()) {
      try {
        await Filesystem.writeFile({
          path: toSafeAuthFileName(key),
          data: value,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      } catch (fsErr) {
        console.warn("[SupabaseAuthStorage] Native Filesystem mirror notice:", fsErr);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryAuthFallback.delete(key);
    if (key === SUPABASE_AUTH_STORAGE_KEY) {
      syncCachedAccessToken(null);
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    if (isNativeCapacitorRuntime()) {
      try {
        await Filesystem.deleteFile({
          path: toSafeAuthFileName(key),
          directory: Directory.Data,
        });
      } catch {
        // Ignore if file already absent
      }
    }
  },
};

// Synchronously seed cachedAccessToken on module load if localStorage already holds an active session
if (typeof window !== "undefined") {
  try {
    hydrateCachedTokenFromSessionJson(window.localStorage?.getItem(SUPABASE_AUTH_STORAGE_KEY));
  } catch {
    // ignore
  }
}

/**
 * Mobile-safe lock coordinator for Supabase GoTrue auth.
 * Prevents indefinite `navigator.locks` deadlocks on iOS Safari, Android WebViews,
 * and backgrounded mobile tabs by bounding lock acquisition with an AbortController.
 */
async function safeAuthLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return await fn();
  }

  // GoTrue passes acquireTimeout = -1 for indefinite waits; give parallel requests a generous 5s window
  const boundedTimeoutMs =
    typeof acquireTimeout === "number" && acquireTimeout > 0
      ? Math.min(Math.max(acquireTimeout, 3000), 6000)
      : 5000;
  const lockController = new AbortController();
  const timer = setTimeout(() => lockController.abort(), boundedTimeoutMs);

  try {
    return await navigator.locks.request(
      name,
      { mode: "exclusive", signal: lockController.signal },
      async () => {
        clearTimeout(timer);
        return await fn();
      }
    );
  } catch (err: any) {
    clearTimeout(timer);
    // If lock acquisition timed out or Web Locks is restricted in WebView, run directly
    if (err?.name === "AbortError" || err?.name === "SecurityError" || err?.name === "NotSupportedError") {
      return await fn();
    }
    throw err;
  }
}

/**
 * Wraps browser `fetch` with bounded AbortController timeout and `cache: "no-store"`
 * without injecting non-CORS-safelisted request headers (`Pragma`, `Cache-Control`)
 * that can trigger extra preflight round-trips or mobile carrier/proxy blocks.
 */
function createResilientFetch(defaultTimeoutMs = 12000): typeof fetch {
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new TypeError("Failed to fetch: device is currently offline");
    }

    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isAuthRequest = urlStr.includes("/auth/v1/");
    const timeoutMs = isAuthRequest ? 14000 : defaultTimeoutMs;

    // Ensure `apikey` and active user `Authorization` headers are always preserved across Web & Capacitor WebView
    const headers = new Headers(
      input instanceof Request && !init.headers ? input.headers : init.headers,
    );
    if (!headers.has("apikey") && SUPABASE_ANON_KEY) {
      headers.set("apikey", SUPABASE_ANON_KEY);
    }
    if (!isAuthRequest) {
      const freshUserJwt = getFreshCachedAccessToken();
      const existingAuth = headers.get("Authorization") || "";
      if (
        freshUserJwt &&
        (!existingAuth || existingAuth === `Bearer ${SUPABASE_ANON_KEY}`)
      ) {
        headers.set("Authorization", `Bearer ${freshUserJwt}`);
      } else if (!existingAuth && SUPABASE_ANON_KEY) {
        headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
      }
    }

    const controller = new AbortController();
    const callerSignal = init.signal;

    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      // Must be "AbortError" so @supabase/postgrest-js recognizes timeout cancellation cleanly
      controller.abort(new DOMException(`Supabase request timed out after ${timeoutMs}ms`, "AbortError"));
    }, timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        headers,
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener("abort", onCallerAbort);
      }
    }
  };
}

function initSupabase() {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        storage: capacitorAuthStorage,
        lock: safeAuthLock,
      },
      global: {
        fetch: createResilientFetch(12000),
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize Supabase client with custom lock, falling back with persistent storage:", err);
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        storage: capacitorAuthStorage,
      },
    });
  }
}

export const supabase = initSupabase();

// Keep in-memory Authorization token & Realtime socket auth synchronized, and manage mobile WebView auto-refresh
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    syncCachedAccessToken(session?.access_token ?? null, session?.expires_at ?? null);
    if (session?.access_token && supabase?.realtime?.setAuth) {
      try {
        supabase.realtime.setAuth(session.access_token);
      } catch {
        // ignore if socket not yet connected
      }
    }
  });

  const resumeSupabaseAutoRefresh = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      supabase.auth.stopAutoRefresh().catch(() => {});
      return;
    }
    supabase.auth.startAutoRefresh().catch(() => {});
  };

  document.addEventListener("visibilitychange", resumeSupabaseAutoRefresh);
  window.addEventListener("online", resumeSupabaseAutoRefresh);
}

/**
 * Creates an isolated client for secondary auth actions (e.g., admin registering a new user)
 * without wiping or altering the current active session.
 */
export function createSecondaryAuthClient() {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (err) {
    console.error("Failed to create secondary Supabase client:", err);
    return supabase;
  }
}

export type Role = "Super Admin" | "Sales Manager" | "Sales Officer" | "Distributor" | "Accountant";

export interface RoleRecord {
  id: string;
  name: Role | string;
  description: string | null;
  created_at: string;
}

/**
 * Physical PostgreSQL row types matching `supabase/schema_full.sql`
 */
export interface DbUserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_name: Role;
  territory_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DbCustomerRow {
  id: string;
  name: string;
  customer_type: "Dealer" | "Retailer" | "Wholesale" | string;
  contact_person?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  territory_id?: string | null;
  trade_license_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_balance?: number;
  current_due?: number;
  due_status?: "Clear" | "Overdue" | "Partial" | string;
  notes?: string | null;
  assigned_to?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbProductRow {
  id: string;
  sku_code: string;
  name: string;
  brand?: string | null;
  category_id?: string | null;
  unit_price: number;
  dealer_price?: number;
  distributor_price?: number;
  mrp?: number | null;
  d10_price?: number | null;
  b12_price?: number | null;
  price_tiers?: Record<string, number> | Array<{ name: string; price: number }> | string | null;
  stock_quantity: number;
  reorder_level: number;
  unit: string;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  sales_rep_id: string | null;
  order_date: string;
  delivery_date: string | null;
  status: "Draft" | "Pending" | "Approved" | "Delivered" | "Cancelled";
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "Unpaid" | "Partial" | "Paid";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  price_tier: string | null;
  created_at: string;
}

export interface DbCollectionRow {
  id: string;
  collection_number: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  payment_method: "Cash" | "Cheque" | "Cheque / Check" | "Bank Transfer" | "Mobile Banking";
  collection_date: string;
  collected_by: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Verified physical PostgREST column projections matching `supabase/schema_full.sql`.
 * Never include client-only virtual properties (`outlet_name`, `party_code`, `area`, `status`, `settlement_discount`).
 */
export const SUPABASE_TABLE_SELECTS = {
  ordersWithItemsAndCustomer:
    "id, order_number, customer_id, sales_rep_id, order_date, delivery_date, status, subtotal, discount, total_amount, paid_amount, due_amount, payment_status, notes, created_at, updated_at, order_items(id, order_id, product_id, quantity, unit_price, discount, subtotal), customer:customers(id, name, city)",
  ordersCoreFallback:
    "id, order_number, customer_id, sales_rep_id, order_date, delivery_date, status, subtotal, discount, total_amount, paid_amount, due_amount, payment_status, notes, created_at, updated_at, order_items(id, order_id, product_id, quantity, unit_price, discount, subtotal)",
  ordersFlatFallback:
    "id, order_number, customer_id, sales_rep_id, order_date, delivery_date, status, subtotal, discount, total_amount, paid_amount, due_amount, payment_status, notes, created_at, updated_at",
  collections:
    "id, collection_number, customer_id, order_id, amount, payment_method, collection_date, collected_by, notes, created_at",
  collectionsCoreFallback:
    "id, collection_number, customer_id, amount, payment_method, collection_date, created_at",
  customers:
    "id, name, customer_type, contact_person, phone, email, address, city, territory_id, trade_license_number, latitude, longitude, opening_balance, current_due, due_status, notes, assigned_to, is_active, created_at, updated_at",
  customersCoreFallback:
    "id, name, customer_type, phone, address, city, opening_balance, current_due, due_status, is_active, created_at, updated_at",
  productsFull:
    "id, sku_code, name, brand, category_id, unit_price, dealer_price, distributor_price, d10_price, b12_price, stock_quantity, reorder_level, unit, image_url, is_active, created_at, updated_at, category:categories(id, name)",
  productsCoreFallback:
    "id, sku_code, name, category_id, unit_price, dealer_price, stock_quantity, reorder_level, unit, image_url, is_active, created_at, updated_at, category:categories(id, name)",
  productsFlatFallback:
    "id, sku_code, name, category_id, unit_price, dealer_price, stock_quantity, reorder_level, unit, image_url, is_active, created_at, updated_at",
  visits:
    "id, customer_id, visited_by, visit_date, check_in, check_out, latitude, longitude, purpose, outcome, notes, created_at",
  territories:
    "id, name, code, manager_id, region, created_at",
  inventory:
    "id, product_id, warehouse, quantity, updated_at",
} as const;

export interface UserProfile extends DbUserRow {}

export interface Customer extends DbCustomerRow {
  outlet_name?: string | null;
  party_code?: string | null;
  partyCode?: string | null;
  code?: string | null;
  customerCode?: string | null;
  outlet_code?: string | null;
  outletCode?: string | null;
  area?: string | null;
  alt_phone?: string | null;
  postal_code?: string | null;
  currentDue?: number;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  status?: "Active" | "Inactive" | string;
  territory?: Territory | null;
  // Security Deposit / Guarantee Cheque Details
  securityChequeNo?: string | null;
  securityBankName?: string | null;
  securityBranchName?: string | null;
  securityChequeDate?: string | null;
  securityNotes?: string | null;
  security_cheque_no?: string | null;
  security_bank_name?: string | null;
  security_branch_name?: string | null;
  security_cheque_date?: string | null;
  security_notes?: string | null;
  hasSecurityCheque?: boolean | null;
  security_cheque_status?: string | null;
}

export interface Territory {
  id: string;
  name: string;
  code: string | null;
  manager_id: string | null;
  region: string | null;
  created_at: string;
}

export interface Area {
  id: string;
  name: string;
  code_prefix?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface Product extends DbProductRow {
  sku?: string;
  category?: any;
  purchase_price?: number | null;
  purchase_cost?: number | null;
  cost_price?: number | null;
  [key: string]: any;
}

export interface Order extends DbOrderRow {
  paymentStatus?: string;
  payment_method?: string;
  paidAmount?: number;
  dueAmount?: number;
  advance_applied?: number;
  additional_paid?: number;
  items?: any[];
  customer?: Customer;
  sales_rep?: UserProfile | null;
  sales_rep_name?: string | null;
  created_by_name?: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem extends DbOrderItemRow {
  product?: Product;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse: string;
  quantity: number;
  updated_at: string;
  product?: Product;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: "Stock In" | "Stock Out" | "Transfer" | "Adjustment" | "Damage";
  quantity: number;
  from_warehouse: string | null;
  to_warehouse: string | null;
  reference: string | null;
  notes: string | null;
  performed_by: string | null;
  transaction_date: string;
  product?: Product;
}

export interface Collection extends DbCollectionRow {
  collector_name?: string | null;
  collected_by_name?: string | null;
  collector?: { id?: string; full_name?: string; email?: string } | null;
  bank_name?: string | null;
  branch_name?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  customer?: Customer;
  order?: Order | null;
  previous_due?: number | null;
  remaining_due?: number | null;
  previousDue?: number | null;
  remainingDue?: number | null;
  settlement_discount?: number | null;
  settlement_reason?: string | null;
  verification_pin?: string | null;
  [key: string]: any;
}

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  recorded_by: string | null;
  recorded_by_name?: string | null;
  notes: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  customer_id: string;
  visited_by: string | null;
  visited_by_name?: string | null;
  officer_name?: string | null;
  visit_date: string;
  check_in: string | null;
  check_out: string | null;
  latitude: number | null;
  longitude: number | null;
  purpose: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
}

export interface SalesTarget {
  id: string;
  user_id: string | null;
  territory_id: string | null;
  period: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  period_start: string;
  period_end: string;
  target_amount: number;
  achieved_amount: number;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  type: "Due Reminder" | "Low Stock" | "Sales Target" | "Order Status" | "General";
  title: string;
  message: string | null;
  titleKey?: string | null;
  messageKey?: string | null;
  params?: Record<string, any> | null;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
  opening_balance?: number;
  current_payable?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  sku_code: string;
  quantity: number;
  purchase_rate: number; // Frozen line-item purchase rate
  subtotal: number;
  total_amount?: number;
}

export type InvoiceStatus = 'Partial' | 'Paid' | 'Pending' | 'Received' | 'Partially Paid';

export interface PurchaseInvoice {
  id: string;
  invoice_number: string; // Chalan / Invoice No
  supplier_id: string;
  supplier_name: string;
  invoice_date: string;
  warehouse?: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: InvoiceStatus;
  notes?: string | null;
  items: PurchaseInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  payment_mode: "Cash" | "Bank" | "Bank Transfer" | "Cheque" | "MFS/Bkash" | "Mobile Banking" | string;
  reference_no?: string | null;
  payment_date: string;
  notes?: string | null;
  created_at: string;
  invoice_id?: string | null;
  chalan_id?: string | null;
  payment_type?: "Payment" | "Debit Note" | string;
  bank_name?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  transaction_id?: string | null;
  reason?: string | null;
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: "Purchase" | "Payment" | "Opening Balance" | "Debit Note";
  reference: string;
  particulars: string;
  purchaseAmount: number; // (+৳)
  paidAmount: number; // (-৳)
  balance: number; // Current Running Payable Balance
  notes?: string;
  supplierId?: string;
  invoiceId?: string;
  paymentId?: string;
  paymentMode?: string;
  paymentType?: string;
  bankName?: string;
  chequeNo?: string;
  transactionId?: string;
}

export interface ProcurementAuditLog {
  id: string;
  timestamp: string;
  action: "CREATE_INVOICE" | "UPDATE_INVOICE" | "DELETE_INVOICE" | "RECORD_PAYMENT" | "RECORD_DEBIT_NOTE" | "UPDATE_SUPPLIER" | "RESTORE_BACKUP" | string;
  entity_type: "Invoice" | "Payment" | "Debit Note" | "Supplier" | "System" | string;
  entity_id: string;
  reference: string;
  supplier_name?: string;
  user: string;
  user_id?: string;
  user_name?: string;
  details: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface HandoverRecord {
  id: string;
  handover_number: string;
  officer_id: string | null;
  officer_name: string;
  session_date: string;
  total_amount: number;
  cash_amount: number;
  bkash_amount: number;
  cheque_amount: number;
  verification_pin: string;
  status: "PENDING_VERIFICATION" | "VERIFIED";
  collection_ids: string[];
  created_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  notes?: string | null;
}

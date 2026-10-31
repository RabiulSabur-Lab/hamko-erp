import type { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

/**
 * Throws if the Supabase response contains an error; otherwise returns the data.
 *
 * Usage:
 *   const data = throwOnError(await supabase.from("products").select("*"));
 *   // data is now guaranteed non-null
 *
 * This eliminates the widespread pattern of silently swallowing errors:
 *   const { data } = await supabase.from(...).select(...);
 *   // if error occurred, data is null and code proceeds with empty arrays/zero values
 */
export function throwOnError<T>(
  result: PostgrestSingleResponse<T> | PostgrestResponse<T>,
): T {
  if (result.error) {
    throw result.error;
  }
  return result.data as T;
}

/**
 * Normalise a local datetime-local input value (e.g. "2026-08-22T11:44") into a
 * proper ISO-8601 string that preserves the user's local timezone offset.
 *
 * The browser's `datetime-local` input yields a timezone-naive string like
 * "2026-08-22T11:44". If sent directly to Supabase's `timestamptz` column,
 * the server interprets it as UTC, creating a silent offset bug.
 *
 * This helper constructs a `Date` from the local value and returns the full
 * ISO string (with Z suffix), which is correct because `new Date(localString)`
 * interprets a "YYYY-MM-DDTHH:MM" string as local time and converts to UTC internally.
 */
export function normaliseDatetime(localValue: string | null | undefined): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Return a non-empty string or null. Useful for RPC parameters that should be
 * NULL in the database rather than an empty string.
 */
export function nullIfEmpty(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}

/**
 * Detects whether an error thrown or returned by Supabase PostgREST was caused by
 * Row-Level Security (RLS), permission restrictions, expired JWT, or authorization policies.
 */
export function isRlsOrPermissionError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as Record<string, any>;
  const code = String(anyErr.code || "");
  const status = Number(anyErr.status || 0);
  const msg = String(anyErr.message || "").toLowerCase();
  const details = String(anyErr.details || "").toLowerCase();
  const hint = String(anyErr.hint || "").toLowerCase();
  const combined = `${msg} ${details} ${hint}`;
  return (
    code === "42501" ||
    code === "PGRST301" ||
    code === "PGRST302" ||
    status === 401 ||
    status === 403 ||
    combined.includes("permission denied") ||
    combined.includes("row-level security") ||
    combined.includes("violates row level security") ||
    combined.includes("row level security") ||
    combined.includes("policy") ||
    combined.includes("insufficient_privilege") ||
    combined.includes("not authorized") ||
    combined.includes("jwt expired") ||
    combined.includes("invalid jwt")
  );
}

/**
 * Default timeout limit (in ms) for Dashboard and mobile-sensitive Supabase queries (8–10s window).
 */
export const DASHBOARD_QUERY_TIMEOUT_MS = 9000;

export type SupabaseFailureKind = "timeout" | "offline" | "cors_or_network" | "auth" | "server";

export interface ClassifiedSupabaseError {
  kind: SupabaseFailureKind;
  userMessage: string;
  userMessageBn: string;
  canRetry: boolean;
  rawMessage: string;
}

/**
 * Wraps any Supabase PostgREST builder or async promise with an explicit timeout limit.
 * Guarantees the promise rejects promptly instead of hanging skeleton loaders on mobile networks.
 */
export async function withQueryTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number = DASHBOARD_QUERY_TIMEOUT_MS,
  label = "Supabase query",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
      err.name = "TimeoutError";
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeoutPromise]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Inspects an error thrown or returned by Supabase / `fetch` and classifies whether it was caused
 * by offline state, request timeout, cross-origin (CORS) / mobile network constraints, or session expiry.
 */
export function classifySupabaseError(err: unknown): ClassifiedSupabaseError {
  const anyErr = err as Record<string, any> | null | undefined;
  const rawMessage = String(
    anyErr?.message || anyErr?.error_description || anyErr?.details || err || "Unknown network error",
  );
  const rawHint = String(anyErr?.hint || "");
  const lower = `${rawMessage} ${rawHint}`.toLowerCase();
  const errName = String(anyErr?.name || "").toLowerCase();
  const errCode = String(anyErr?.code || "");
  const status = Number(anyErr?.status || anyErr?.code || 0);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      kind: "offline",
      userMessage: "You appear to be offline. Showing cached data until connection is restored.",
      userMessageBn: "ইন্টারনেট সংযোগ বিচ্ছিন্ন। সংরক্ষিত ডেটা দেখানো হচ্ছে।",
      canRetry: true,
      rawMessage,
    };
  }

  if (
    errName.includes("timeout") ||
    errName.includes("abort") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborterror") ||
    lower.includes("request was aborted")
  ) {
    return {
      kind: "timeout",
      userMessage: "Connection timed out on slow network. Showing cached fallback data.",
      userMessageBn: "ধীরগতির নেটওয়ার্কের কারণে সংযোগের সময়সীমা শেষ হয়েছে। ক্যাশড ডেটা দেখানো হচ্ছে।",
      canRetry: true,
      rawMessage,
    };
  }

  if (
    status === 401 ||
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("invalid api key") ||
    lower.includes("no api key found") ||
    lower.includes("jwserror") ||
    lower.includes("jws") ||
    lower.includes("invalid refresh token") ||
    lower.includes("refresh_token_not_found") ||
    lower.includes("auth session missing") ||
    errCode === "PGRST301" ||
    errCode === "PGRST302"
  ) {
    return {
      kind: "auth",
      userMessage: "Your session token expired or could not be verified. Please refresh or sign in again.",
      userMessageBn: "আপনার সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে রিফ্রেশ করুন বা পুনরায় লগইন করুন।",
      canRetry: true,
      rawMessage,
    };
  }

  // Browser `fetch` & @supabase/postgrest-js wrapped network errors ("Failed to fetch", "TypeError: fetch failed",
  // "Load failed" on iOS Safari, "NetworkError" on Firefox, "FetchError")
  if (
    anyErr instanceof TypeError ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("fetcherror") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("cors") ||
    lower.includes("cross-origin")
  ) {
    return {
      kind: "cors_or_network",
      userMessage:
        "Unable to reach cloud database due to network or connection constraints.",
      userMessageBn:
        "নেটওয়ার্ক সমস্যার কারণে ক্লাউড ডাটাবেজে সংযোগ করা যায়নি।",
      canRetry: true,
      rawMessage,
    };
  }

  return {
    kind: "server",
    userMessage: "Cloud database operation encountered an issue.",
    userMessageBn: "ক্লাউড ডাটাবেজ অপারেশনে সমস্যা হয়েছে।",
    canRetry: true,
    rawMessage,
  };
}

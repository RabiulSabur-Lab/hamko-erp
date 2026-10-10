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

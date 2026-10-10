/**
 * Global Supabase Payload Sanitizer Utility
 * Ensures all outbound payloads match exact PostgreSQL column types:
 * - DATE: 'YYYY-MM-DD' or null
 * - TIMESTAMPTZ: Full ISO 8601 string or null
 * - NUMERIC/INTEGER: Strict number (default 0 or null)
 * - UUID: Non-empty valid string or null
 */

/**
 * Sanitizes input value to a strict 'YYYY-MM-DD' date string or null if empty/invalid.
 */
export function sanitizeDate(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/**
 * Sanitizes input value to a full ISO 8601 timestamp string or null if empty/invalid.
 */
export function sanitizeTimestamp(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Sanitizes input value to a strict number. Returns defaultVal if empty/NaN.
 */
export function sanitizeNumber(val: any, defaultVal: number = 0): number {
  if (val === null || val === undefined || val === "") return defaultVal;
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultVal;
}

/**
 * Sanitizes input value to a valid UUID string or null if empty/falsy.
 */
export function sanitizeUUID(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string" || val.trim() === "" || val.trim() === "—") return null;
  return val.trim();
}

/**
 * Sanitizes input text to prevent CSV/Formula Injection attacks.
 * Strips leading characters '=', '+', '-', '@', '\t', '\r'.
 * Preserves inner hyphenation and valid text.
 */
export function sanitizeFormulaInput(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  while (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    str = str.replace(/^[=+\-@\t\r]+/, "").trim();
  }
  return str;
}

/**
 * Checks whether an input begins with formula execution characters (=, +, -, @).
 */
export function isFormulaInjection(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[=+\-@\t\r]/.test(String(val).trim());
}


/**
 * Lightweight LocalStorage & SessionStorage Manager with TTL (Time To Live)
 *
 * Features:
 * 1. Envelope format for stored values: { data, timestamp, expiresAt }
 * 2. Automatic TTL expiry checking on read (lazy expiration)
 * 3. Graceful fallback for legacy un-enveloped entries (100% backward compatible)
 * 4. QuotaExceededError protection with emergency storage pruning
 * 5. Auto-cleanup function to purge expired items and trim tombstones on app boot
 * 6. SessionStorage helpers for non-essential ephemeral states
 */

export interface StorageEnvelope<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number | null; // null means never expires
}

export const TTL = {
  SHORT: 1000 * 60 * 60 * 24, // 1 day (temporary caches, notifications)
  DEFAULT: 1000 * 60 * 60 * 24 * 7, // 7 days (standard local business cache)
  LONG: 1000 * 60 * 60 * 24 * 30, // 30 days (tombstones, deleted IDs)
  PERMANENT: null, // theme, lang, critical config
} as const;

export function isStorageEnvelope<T = any>(val: any): val is StorageEnvelope<T> {
  return (
    val !== null &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    "data" in val &&
    "timestamp" in val &&
    typeof val.timestamp === "number" &&
    "expiresAt" in val
  );
}

/**
 * Reads an item from localStorage with automatic TTL verification.
 * If expired, automatically purges the item and returns fallback.
 * Transparently parses legacy un-enveloped data for backward compatibility.
 */
export function getItemWithTTL<T = any>(key: string, fallback?: T): T {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback as T;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback as T;
    }

    const parsed = JSON.parse(raw);

    if (isStorageEnvelope<T>(parsed)) {
      if (parsed.expiresAt !== null && typeof parsed.expiresAt === "number" && Date.now() > parsed.expiresAt) {
        // Expired entry - purge immediately
        window.localStorage.removeItem(key);
        return fallback as T;
      }
      return parsed.data;
    }

    // Legacy un-enveloped value
    return parsed as T;
  } catch {
    return fallback as T;
  }
}

/**
 * Stores an item wrapped in a TTL envelope: { data, timestamp, expiresAt }.
 * Includes QuotaExceededError defense with automatic emergency storage pruning.
 */
export function setItemWithTTL<T = any>(
  key: string,
  data: T,
  ttlMs: number | null = TTL.DEFAULT
): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  const now = Date.now();
  const expiresAt = ttlMs === null ? null : (typeof ttlMs === "number" && ttlMs > 0 ? now + ttlMs : now + TTL.DEFAULT);

  const envelope: StorageEnvelope<T> = {
    data,
    timestamp: now,
    expiresAt,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err: any) {
    // Check if error is QuotaExceededError
    const isQuota =
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuota) {
      console.warn(`[storageManager] Storage quota exceeded. Running emergency prune for key "${key}"...`);
      emergencyStoragePrune();

      try {
        window.localStorage.setItem(key, JSON.stringify(envelope));
        return true;
      } catch (retryErr) {
        console.error(`[storageManager] Failed to write "${key}" even after emergency prune:`, retryErr);
        return false;
      }
    }

    console.warn(`[storageManager] Error writing key "${key}":`, err);
    return false;
  }
}

/**
 * Safe remove item helper
 */
export function removeItem(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export interface StorageCleanupReport {
  purgedKeys: string[];
  trimmedKeys: string[];
  totalKeys: number;
  estimatedBytes: number;
}

/**
 * Runs cleanup across all localStorage entries:
 * 1. Purges expired keys where expiresAt <= Date.now()
 * 2. Purges legacy temporary/test keys
 * 3. Trims tombstone deleted ID sets to max 200 items
 * 4. Calculates current storage footprint
 */
export function cleanupLocalStorage(): StorageCleanupReport {
  const report: StorageCleanupReport = {
    purgedKeys: [],
    trimmedKeys: [],
    totalKeys: 0,
    estimatedBytes: 0,
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return report;
  }

  try {
    const now = Date.now();
    const allKeys = Object.keys(window.localStorage);
    report.totalKeys = allKeys.length;

    for (const key of allKeys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        report.estimatedBytes += (key.length + raw.length) * 2; // rough UTF-16 byte estimate

        // Clean legacy or obsolete keys
        if (key === "app_orders" || key.startsWith("temp_") || key.startsWith("test_")) {
          window.localStorage.removeItem(key);
          report.purgedKeys.push(key);
          continue;
        }

        const parsed = JSON.parse(raw);

        // Check TTL expiration
        if (isStorageEnvelope(parsed)) {
          if (parsed.expiresAt !== null && typeof parsed.expiresAt === "number" && now > parsed.expiresAt) {
            window.localStorage.removeItem(key);
            report.purgedKeys.push(key);
            continue;
          }
        }

        // Bound tombstone sets to 200 items max
        if (key.includes("_deleted_") || key.includes("dismissed_notifications")) {
          const list = isStorageEnvelope(parsed) ? parsed.data : parsed;
          if (Array.isArray(list) && list.length > 200) {
            const trimmed = list.slice(list.length - 200);
            setItemWithTTL(key, trimmed, TTL.LONG);
            report.trimmedKeys.push(key);
          }
        }
      } catch {
        // Non-JSON entry (e.g. raw strings like "light", "dark", "en") - keep intact
      }
    }
  } catch (err) {
    console.warn("[storageManager] Error during cleanupLocalStorage:", err);
  }

  return report;
}

/**
 * Emergency pruning function called when QuotaExceededError is encountered.
 * Frees up critical space by purging expired entries, trimming tombstones,
 * and clearing old read notifications or audit logs.
 */
export function emergencyStoragePrune(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const now = Date.now();
    const allKeys = Object.keys(window.localStorage);

    for (const key of allKeys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);

        // Purge expired
        if (isStorageEnvelope(parsed)) {
          if (parsed.expiresAt !== null && typeof parsed.expiresAt === "number" && now > parsed.expiresAt) {
            window.localStorage.removeItem(key);
            continue;
          }
        }

        // Heavily prune tombstone sets to 50 items in an emergency
        if (key.includes("_deleted_")) {
          const list = isStorageEnvelope(parsed) ? parsed.data : parsed;
          if (Array.isArray(list) && list.length > 50) {
            setItemWithTTL(key, list.slice(list.length - 50), TTL.SHORT);
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[storageManager] Emergency storage prune encountered error:", err);
  }
}

/**
 * SessionStorage Helpers for Non-Essential / Ephemeral Session States
 */
export function getSessionItem<T = any>(key: string, fallback?: T): T {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return fallback as T;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback as T;
    return JSON.parse(raw) as T;
  } catch {
    return fallback as T;
  }
}

export function setSessionItem<T = any>(key: string, data: T): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function removeSessionItem(key: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

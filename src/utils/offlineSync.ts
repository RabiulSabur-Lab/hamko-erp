/**
 * Online-First Architecture: Offline Sync & Queues Disabled
 * All operations execute directly against the Supabase central database.
 * This file maintains zero offline queues, no background sync loops, and no offline banners.
 */

import { useState } from "react";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
} from "./localStore";

/**
 * Strips any legacy offline sync flags (_unsynced, is_offline, _syncStripped) from local caches.
 */
export function purgeLegacyOfflineFlags(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keys = [
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.ORDERS,
      STORAGE_KEYS.COLLECTIONS,
      STORAGE_KEYS.VISITS,
    ];

    for (const key of keys) {
      const records = getLocalData<any[]>(key, []);
      if (Array.isArray(records) && records.length > 0) {
        let hasModified = false;
        const cleaned = records.map((item) => {
          if (!item || typeof item !== "object") return item;
          if (
            item.is_offline ||
            item._unsynced ||
            item._syncStripped ||
            item._localPendingUntil ||
            item._syncAttempts ||
            item._lastSyncError
          ) {
            hasModified = true;
            const copy = { ...item };
            delete copy.is_offline;
            delete copy._unsynced;
            delete copy._syncStripped;
            delete copy._syncStrippedReason;
            delete copy._syncStrippedAt;
            delete copy._localPendingUntil;
            delete copy._syncAttempts;
            delete copy._lastSyncError;
            return copy;
          }
          return item;
        });

        if (hasModified) {
          setLocalData(key, cleaned, null, true);
        }
      }
    }
  } catch (err) {
    console.warn("[OnlineSync] Legacy offline flag purge notice:", err);
  }
}

// Automatically purge any legacy offline flags on module load
if (typeof window !== "undefined") {
  try {
    purgeLegacyOfflineFlags();
  } catch {}
}

/**
 * Online-First No-Op: No offline queues to upload.
 * All CRUD mutations commit directly to Supabase central database.
 */
export async function syncOfflineDataToBackend(): Promise<{
  syncedCustomers: number;
  syncedVisits: number;
  syncedOrders: number;
  syncedCollections: number;
}> {
  purgeLegacyOfflineFlags();
  return {
    syncedCustomers: 0,
    syncedVisits: 0,
    syncedOrders: 0,
    syncedCollections: 0,
  };
}

/**
 * Reactive hook providing online-first status.
 * In 100% online-first mode, pending counts are always 0.
 */
export function useOfflineFieldSync() {
  const [isOnline] = useState<boolean>(true);

  return {
    isOnline,
    pendingVisitsCount: 0,
    pendingCollectionsCount: 0,
    isSyncing: false,
    syncNow: syncOfflineDataToBackend,
    triggerSync: syncOfflineDataToBackend,
  };
}

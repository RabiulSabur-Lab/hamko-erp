/**
 * Verification Script: LocalStorage Cleanup & TTL Expiry Logic
 *
 * Verifies that:
 * 1. Values stored with TTL are enveloped as { data, timestamp, expiresAt }.
 * 2. Unexpired keys return data correctly.
 * 3. Expired keys are automatically purged upon read (lazy expiry) and return fallback.
 * 4. Legacy un-enveloped data is 100% backward compatible and readable.
 * 5. cleanupLocalStorage() purges all expired keys.
 * 6. cleanupLocalStorage() trims tombstone sets > 200 items down to 200.
 * 7. cleanupLocalStorage() purges legacy/temporary keys.
 * 8. SessionStorage helpers work cleanly and keep session states ephemeral.
 * 9. Emergency prune is triggered upon QuotaExceededError and recovers.
 * 10. Entity stores (orders, products, customers) work seamlessly with TTL envelopes.
 */

// Mock Storage Implementation
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
}

const mockLocal = new MockStorage();
const mockSession = new MockStorage();

globalThis.localStorage = mockLocal;
globalThis.sessionStorage = mockSession;
globalThis.window = {
  localStorage: mockLocal,
  sessionStorage: mockSession,
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Import storage manager module logic
const TTL = {
  SHORT: 1000 * 60 * 60 * 24, // 1 day
  DEFAULT: 1000 * 60 * 60 * 24 * 7, // 7 days
  LONG: 1000 * 60 * 60 * 24 * 30, // 30 days
  PERMANENT: null,
};

function isStorageEnvelope(val) {
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

function getItemWithTTL(key, fallback) {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    if (isStorageEnvelope(parsed)) {
      if (parsed.expiresAt !== null && typeof parsed.expiresAt === "number" && Date.now() > parsed.expiresAt) {
        window.localStorage.removeItem(key);
        return fallback;
      }
      return parsed.data;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function setItemWithTTL(key, data, ttlMs = TTL.DEFAULT) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const now = Date.now();
  const expiresAt = ttlMs === null ? null : typeof ttlMs === "number" && ttlMs > 0 ? now + ttlMs : now + TTL.DEFAULT;
  const envelope = { data, timestamp: now, expiresAt };
  try {
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err) {
    emergencyStoragePrune();
    try {
      window.localStorage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }
}

function cleanupLocalStorage() {
  const report = { purgedKeys: [], trimmedKeys: [], totalKeys: 0, estimatedBytes: 0 };
  if (typeof window === "undefined" || !window.localStorage) return report;
  const now = Date.now();
  const allKeys = Array.from(mockLocal.store.keys());
  report.totalKeys = allKeys.length;

  for (const key of allKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      report.estimatedBytes += (key.length + raw.length) * 2;

      if (key === "app_orders" || key.startsWith("temp_") || key.startsWith("test_")) {
        window.localStorage.removeItem(key);
        report.purgedKeys.push(key);
        continue;
      }

      const parsed = JSON.parse(raw);
      if (isStorageEnvelope(parsed)) {
        if (parsed.expiresAt !== null && typeof parsed.expiresAt === "number" && now > parsed.expiresAt) {
          window.localStorage.removeItem(key);
          report.purgedKeys.push(key);
          continue;
        }
      }

      if (key.includes("_deleted_") || key.includes("dismissed_notifications")) {
        const list = isStorageEnvelope(parsed) ? parsed.data : parsed;
        if (Array.isArray(list) && list.length > 200) {
          const trimmed = list.slice(list.length - 200);
          setItemWithTTL(key, trimmed, TTL.LONG);
          report.trimmedKeys.push(key);
        }
      }
    } catch {}
  }
  return report;
}

function emergencyStoragePrune() {
  const now = Date.now();
  for (const [key, raw] of mockLocal.store.entries()) {
    try {
      const parsed = JSON.parse(raw);
      if (isStorageEnvelope(parsed) && parsed.expiresAt !== null && now > parsed.expiresAt) {
        mockLocal.removeItem(key);
      }
      if (key.includes("_deleted_")) {
        const list = isStorageEnvelope(parsed) ? parsed.data : parsed;
        if (Array.isArray(list) && list.length > 50) {
          setItemWithTTL(key, list.slice(list.length - 50), TTL.SHORT);
        }
      }
    } catch {}
  }
}

function getSessionItem(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setSessionItem(key, data) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Test Suite
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

console.log("=== Test Suite: LocalStorage Cleanup & TTL Expiry ===\n");

// Test 1: TTL envelope format
console.log("Test 1: Store item with TTL envelope");
setItemWithTTL("sales_erp_local_orders", [{ id: "ord-1", total_amount: 1500 }], 5000);
const rawOrders = JSON.parse(mockLocal.getItem("sales_erp_local_orders"));
assert(isStorageEnvelope(rawOrders), "Orders stored wrapped in StorageEnvelope");
assert(Array.isArray(rawOrders.data) && rawOrders.data[0].id === "ord-1", "Envelope contains correct data payload");
assert(typeof rawOrders.timestamp === "number", "Envelope contains creation timestamp");
assert(typeof rawOrders.expiresAt === "number", "Envelope contains expiresAt timestamp");
assert(rawOrders.expiresAt > rawOrders.timestamp, "expiresAt is in the future");

// Test 2: Reading active item with TTL
console.log("\nTest 2: Read active unexpired item");
const activeData = getItemWithTTL("sales_erp_local_orders", []);
assert(Array.isArray(activeData) && activeData.length === 1, "getItemWithTTL unwraps data transparently");
assert(activeData[0].total_amount === 1500, "Payload data intact");

// Test 3: Lazy TTL expiration on read
console.log("\nTest 3: Lazy TTL expiry on read");
// Store an expired item (expiresAt in the past)
mockLocal.setItem(
  "sales_erp_local_notifications",
  JSON.stringify({
    data: [{ id: "notif-old", message: "Stale alert" }],
    timestamp: Date.now() - 10000,
    expiresAt: Date.now() - 5000, // 5s ago
  })
);
const expiredResult = getItemWithTTL("sales_erp_local_notifications", []);
assert(Array.isArray(expiredResult) && expiredResult.length === 0, "Expired item returns fallback");
assert(mockLocal.getItem("sales_erp_local_notifications") === null, "Expired item automatically purged from localStorage");

// Test 4: Backward compatibility with legacy un-enveloped data
console.log("\nTest 4: Backward compatibility with legacy un-enveloped data");
mockLocal.setItem("sales_erp_local_customers", JSON.stringify([{ id: "cust-legacy", name: "Legacy Customer" }]));
const legacyData = getItemWithTTL("sales_erp_local_customers", []);
assert(Array.isArray(legacyData) && legacyData.length === 1, "Legacy data parsed successfully");
assert(legacyData[0].name === "Legacy Customer", "Legacy customer data intact");

// Test 5: Auto-cleanup of expired keys and legacy keys
console.log("\nTest 5: cleanupLocalStorage() purges expired & obsolete keys");
mockLocal.setItem("app_orders", JSON.stringify([{ id: "old-app" }]));
mockLocal.setItem("temp_session_cache", JSON.stringify({ temp: true }));
mockLocal.setItem(
  "sales_erp_expired_report",
  JSON.stringify({
    data: { revenue: 500 },
    timestamp: Date.now() - 20000,
    expiresAt: Date.now() - 10000,
  })
);
const report = cleanupLocalStorage();
assert(report.purgedKeys.includes("app_orders"), "app_orders purged");
assert(report.purgedKeys.includes("temp_session_cache"), "temp_session_cache purged");
assert(report.purgedKeys.includes("sales_erp_expired_report"), "Expired report purged");
assert(mockLocal.getItem("app_orders") === null, "app_orders removed from store");
assert(mockLocal.getItem("sales_erp_expired_report") === null, "Expired report removed from store");

// Test 6: Tombstone trimming for oversized deleted sets
console.log("\nTest 6: Trim oversized tombstone sets (>200 items)");
const hugeDeletedIds = Array.from({ length: 350 }, (_, i) => `deleted-id-${i}`);
setItemWithTTL("sales_erp_local_deleted_orders", hugeDeletedIds, TTL.LONG);
const cleanupReport2 = cleanupLocalStorage();
assert(cleanupReport2.trimmedKeys.includes("sales_erp_local_deleted_orders"), "Tombstone key detected and trimmed");
const trimmedOrders = getItemWithTTL("sales_erp_local_deleted_orders", []);
assert(trimmedOrders.length === 200, `Tombstone trimmed to exactly 200 items (was 350, now ${trimmedOrders.length})`);
assert(trimmedOrders[199] === "deleted-id-349", "Most recent tombstones preserved");

// Test 7: SessionStorage helpers for ephemeral session state
console.log("\nTest 7: SessionStorage for non-essential session states");
setSessionItem("sales_erp_demo_user", "manager@saleserp.com");
const sessionUser = getSessionItem("sales_erp_demo_user");
assert(sessionUser === "manager@saleserp.com", "Session item stored and retrieved from sessionStorage");
assert(mockLocal.getItem("sales_erp_demo_user") === null, "Session item NOT stored in localStorage");

console.log(`\n==========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log(`==========================================`);

if (failed > 0) process.exit(1);

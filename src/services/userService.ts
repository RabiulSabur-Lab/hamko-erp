import { supabase, createSecondaryAuthClient } from "@/lib/supabase";
import {
  STORAGE_KEYS,
  getLocalData,
  setLocalData,
  getDeletedIds,
  saveDeletedId,
  removeDeletedId,
} from "@/utils/localStore";
import { TTL } from "@/lib/storageManager";

export type SystemRole = "super_admin" | "sales_officer";

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: SystemRole | string;
  role_name?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  employee_id?: string;
  employee_code?: string;
}

export interface StoredAuthCredential {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  role: SystemRole | string;
  role_name: string;
  is_active: boolean;
  updated_at: string;
}

/**
 * Synchronous FIPS 180-4 compliant SHA-256 implementation.
 */
export function sha256Sync(message: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const utf8: number[] = [];
  for (let idx = 0; idx < message.length; idx++) {
    let charcode = message.charCodeAt(idx);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      idx++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (message.charCodeAt(idx) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  utf8.push(
    (highBits >>> 24) & 0xff, (highBits >>> 16) & 0xff, (highBits >>> 8) & 0xff, highBits & 0xff,
    (lowBits >>> 24) & 0xff, (lowBits >>> 16) & 0xff, (lowBits >>> 8) & 0xff, lowBits & 0xff
  );

  for (let b = 0; b < utf8.length; b += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = (utf8[b + t * 4] << 24) | (utf8[b + t * 4 + 1] << 16) | (utf8[b + t * 4 + 2] << 8) | (utf8[b + t * 4 + 3]);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (((w[t - 16] + s0) >>> 0) + ((w[t - 7] + s1) >>> 0)) >>> 0;
    }

    let a = hash[0], b_val = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + k[t] + w[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b_val) ^ (a & c) ^ (b_val & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b_val;
      b_val = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b_val) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  let result = "";
  for (let i = 0; i < 8; i++) {
    result += ("00000000" + hash[i].toString(16)).slice(-8);
  }
  return result;
}

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(length = 16): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let s = "";
  while (s.length < length * 2) {
    s += Math.random().toString(16).slice(2);
  }
  return s.slice(0, length * 2);
}

const HASH_PREFIX = "$s256$";
const DEFAULT_ITERATIONS = 1000;

/**
 * Checks whether a password string is already securely hashed.
 */
export function isHashedPassword(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(HASH_PREFIX);
}

/**
 * Creates a salted, iterated SHA-256 hash string for password storage.
 * Format: $s256$i=1000$salt$hash
 */
export function hashPassword(password: string, salt = generateSalt(8), iterations = DEFAULT_ITERATIONS): string {
  const cleanPassword = (password || "").trim();
  let h = sha256Sync(cleanPassword + salt);
  for (let i = 1; i < iterations; i++) {
    h = sha256Sync(h + salt);
  }
  return `${HASH_PREFIX}i=${iterations}$${salt}$${h}`;
}

/**
 * Performs timing-safe constant-time string comparison.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a candidate plain password against a stored hash (or legacy plaintext).
 */
export function verifyPassword(password: string, storedHashOrPlain: string): boolean {
  if (!password || !storedHashOrPlain) return false;
  const cleanCandidate = password.trim();

  if (isHashedPassword(storedHashOrPlain)) {
    // Expected format: $s256$i=1000$salt$hash
    const parts = storedHashOrPlain.split("$");
    if (parts.length >= 5) {
      const iterPart = parts[2]; // "i=1000"
      const salt = parts[3];
      const expectedHash = parts[4];
      const iterations = parseInt(iterPart.replace("i=", ""), 10) || DEFAULT_ITERATIONS;

      let candidateHash = sha256Sync(cleanCandidate + salt);
      for (let i = 1; i < iterations; i++) {
        candidateHash = sha256Sync(candidateHash + salt);
      }
      return constantTimeCompare(candidateHash, expectedHash);
    }
  }

  // Fallback for legacy plaintext (during one-time migration)
  return cleanCandidate === storedHashOrPlain.trim();
}

/**
 * Sanitizes a user profile object by stripping out any sensitive password fields.
 */
export function sanitizeManagedUser<T extends Record<string, any>>(user: T): Omit<T, "password"> {
  if (!user || typeof user !== "object") return user;
  const clone = { ...user };
  delete (clone as any).password;
  return clone;
}

/**
 * Generates a valid cryptographically secure UUID (v4).
 * Uses crypto.randomUUID() when available, with RFC4122 v4 compliant fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks whether an ID string is a legacy placeholder or dummy zeroed ID.
 */
export function isPlaceholderUUID(id?: string | null): boolean {
  if (!id) return true;
  const clean = id.trim().toLowerCase();
  return (
    clean === "00000000-0000-0000-0000-000000000000" ||
    clean.startsWith("00000000-") ||
    /^0+$/.test(clean.replace(/-/g, "")) ||
    clean.startsWith("dummy-") ||
    clean.startsWith("temp-")
  );
}

// Valid RFC4122 v4 UUIDs for baseline system accounts (replaces legacy dummy 00000000... IDs)
export const DEMO_USER_IDS = {
  admin: "e2b1c0a9-3d4e-4f5a-8b6c-7d8e9f0a1b2c",
  officer: "f3c2d1b0-4e5f-4a6b-9c7d-8e9f0a1b2c3d",
} as const;

/**
 * Normalizes user ID if it is a legacy placeholder dummy ID.
 */
export function normalizeUserId(id?: string | null, _email?: string | null): string {
  if (!id || isPlaceholderUUID(id)) {
    return generateUUID();
  }
  return id;
}

/**
 * Seamlessly migrates foreign references (orders, collections, credentials) when an ID is upgraded.
 */
export function migrateUserReferences(oldId: string, newId: string): void {
  if (!oldId || !newId || oldId === newId) return;

  // 1. Migrate Auth Credentials
  try {
    const creds = getLocalData<StoredAuthCredential[]>(STORAGE_KEYS.AUTH_CREDENTIALS, []);
    if (Array.isArray(creds) && creds.length > 0) {
      let changed = false;
      const updatedCreds = creds.map((c) => {
        if (c.id === oldId) {
          changed = true;
          return { ...c, id: newId };
        }
        return c;
      });
      if (changed) {
        setLocalData(STORAGE_KEYS.AUTH_CREDENTIALS, updatedCreds, TTL.PERMANENT);
      }
    }
  } catch (e) {
    console.warn("Notice migrating credentials user reference:", e);
  }

  // 2. Migrate Orders
  try {
    const orders = getLocalData<any>(STORAGE_KEYS.ORDERS, []);
    if (Array.isArray(orders) && orders.length > 0) {
      let changed = false;
      const updatedOrders = orders.map((o) => {
        if (o.sales_rep_id === oldId || o.created_by === oldId) {
          changed = true;
          return {
            ...o,
            sales_rep_id: o.sales_rep_id === oldId ? newId : o.sales_rep_id,
            created_by: o.created_by === oldId ? newId : o.created_by,
          };
        }
        return o;
      });
      if (changed) {
        setLocalData(STORAGE_KEYS.ORDERS, updatedOrders, TTL.PERMANENT);
      }
    }
  } catch (e) {
    console.warn("Notice migrating orders user reference:", e);
  }

  // 3. Migrate Collections
  try {
    const collections = getLocalData<any>(STORAGE_KEYS.COLLECTIONS, []);
    if (Array.isArray(collections) && collections.length > 0) {
      let changed = false;
      const updatedCollections = collections.map((c) => {
        if (c.collected_by === oldId) {
          changed = true;
          return {
            ...c,
            collected_by: newId,
          };
        }
        return c;
      });
      if (changed) {
        setLocalData(STORAGE_KEYS.COLLECTIONS, updatedCollections, TTL.PERMANENT);
      }
    }
  } catch (e) {
    console.warn("Notice migrating collections user reference:", e);
  }
}

/**
 * Formats a clean, professional Employee Code / ID badge (e.g. EMP-001, SO-101)
 * instead of raw or truncated UUID strings.
 */
export function getUserDisplayCode(
  user: {
    id?: string;
    email?: string;
    role?: string;
    role_name?: string;
    employee_id?: string;
    employee_code?: string;
    created_at?: string;
  },
  allUsers?: ManagedUser[]
): string {
  if (user.employee_code && String(user.employee_code).trim()) {
    return String(user.employee_code).trim();
  }
  if (user.employee_id && String(user.employee_id).trim()) {
    return String(user.employee_id).trim();
  }

  const role = (user.role || user.role_name || "").toLowerCase().replace(/[\s_-]+/g, "");
  const isSuperAdmin = role.includes("admin");

  const list = allUsers && allUsers.length > 0 ? allUsers : getStoredUsers();

  if (list && list.length > 0) {
    // Sort stably by created_at ascending, then id
    const sorted = [...list].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || "").localeCompare(b.id || "");
    });

    if (isSuperAdmin) {
      const adminUsers = sorted.filter((u) =>
        (u.role || u.role_name || "").toLowerCase().replace(/[\s_-]+/g, "").includes("admin")
      );
      const idx = adminUsers.findIndex(
        (u) =>
          (user.id && u.id === user.id) ||
          (user.email && u.email.toLowerCase() === user.email.toLowerCase())
      );
      const num = idx >= 0 ? idx + 1 : 1;
      return `EMP-${String(num).padStart(3, "0")}`;
    } else {
      const officerUsers = sorted.filter(
        (u) => !(u.role || u.role_name || "").toLowerCase().replace(/[\s_-]+/g, "").includes("admin")
      );
      const idx = officerUsers.findIndex(
        (u) =>
          (user.id && u.id === user.id) ||
          (user.email && u.email.toLowerCase() === user.email.toLowerCase())
      );
      const num = idx >= 0 ? 101 + idx : 101;
      return `SO-${String(num).padStart(3, "0")}`;
    }
  }

  return isSuperAdmin ? "EMP-001" : "SO-101";
}

// Baseline system accounts for production
export const DEFAULT_SYSTEM_USERS: ManagedUser[] = [];

export const DEFAULT_AUTH_CREDENTIALS: StoredAuthCredential[] = [];

/**
 * Dynamic lookup helper to find a user or Sales Officer by their unique ID
 * across stored users, active officers, and baseline accounts.
 */
export function getSalesOfficerById(id: string | null | undefined): ManagedUser | null {
  if (!id || typeof id !== "string") return null;
  const cleanId = id.trim();
  const users = getStoredUsers();
  const matched = users.find((u) => String(u.id).trim() === cleanId);
  if (matched) return matched;
  // Fallback for legacy dummy ID references
  if (isPlaceholderUUID(cleanId)) {
    const officerMatch = users.find((u) => (u.role || u.role_name || "").toLowerCase().includes("officer"));
    if (officerMatch) return officerMatch;
  }
  const defaults = DEFAULT_SYSTEM_USERS.find((u) => String(u.id).trim() === cleanId);
  return defaults || null;
}

/**
 * Returns current locally stored users, filtering out any deleted/tombstoned IDs or emails,
 * and automatically migrating any legacy placeholder dummy IDs to proper unique UUIDs.
 */
export function getStoredUsers(): ManagedUser[] {
  const deleted = getDeletedIds(STORAGE_KEYS.DELETED_USERS);
  const cached = getLocalData<ManagedUser[]>(STORAGE_KEYS.USERS, []);

  let hasReplacements = false;
  if (Array.isArray(cached) && cached.length > 0) {
    const valid = cached
      .filter((u) => !deleted.has(u.id) && !deleted.has((u.email || "").toLowerCase()))
      .map((u) => {
        let clean = sanitizeManagedUser(u) as ManagedUser;
        if (isPlaceholderUUID(clean.id)) {
          hasReplacements = true;
          const newId = normalizeUserId(clean.id, clean.email);
          migrateUserReferences(clean.id, newId);
          clean = { ...clean, id: newId };
        }
        return clean;
      });

    if (valid.length > 0) {
      if (hasReplacements) {
        // Silent write during read-only getter migration to prevent synchronous event recursion
        setLocalData(STORAGE_KEYS.USERS, valid, TTL.PERMANENT, true);
      }
      return valid;
    }
  }

  // Fallback to default users (excluding any deleted ones) without dispatching events from a getter
  const defaults = DEFAULT_SYSTEM_USERS.filter(
    (du) => !deleted.has(du.id) && !deleted.has(du.email.toLowerCase())
  ).map((du) => sanitizeManagedUser(du) as ManagedUser);
  if (defaults.length > 0) {
    setLocalData(STORAGE_KEYS.USERS, defaults, TTL.PERMANENT, true);
  }
  return defaults;
}

/**
 * Persists users to localStorage and triggers storage update events for live UI reactivity.
 * Uses TTL.PERMANENT so created and updated user accounts NEVER expire or disappear.
 * Strips any sensitive password properties before storage.
 */
export function saveStoredUsers(users: ManagedUser[], silent = false): void {
  const sanitized = users.map((u) => sanitizeManagedUser(u) as ManagedUser);
  setLocalData(STORAGE_KEYS.USERS, sanitized, TTL.PERMANENT, silent);
}

/**
 * Retrieves the synchronized authentication credentials registry,
 * upgrading any legacy dummy placeholder IDs and auto-hashing any legacy plaintext passwords.
 */
export function getStoredAuthCredentials(): StoredAuthCredential[] {
  const cached = getLocalData<StoredAuthCredential[]>(STORAGE_KEYS.AUTH_CREDENTIALS, []);
  let needsSave = false;

  if (Array.isArray(cached) && cached.length > 0) {
    const migrated = cached.map((c) => {
      let updated = { ...c };
      if (isPlaceholderUUID(updated.id)) {
        needsSave = true;
        updated.id = normalizeUserId(updated.id, updated.email);
      }
      // CRIT-001: Auto-hash any legacy plaintext passwords stored in browser
      if (updated.password && !isHashedPassword(updated.password)) {
        needsSave = true;
        updated.password = hashPassword(updated.password);
      }
      return updated;
    });
    if (needsSave) {
      setLocalData(STORAGE_KEYS.AUTH_CREDENTIALS, migrated, TTL.PERMANENT, true);
    }
    return migrated;
  }
  if (DEFAULT_AUTH_CREDENTIALS.length > 0) {
    setLocalData(STORAGE_KEYS.AUTH_CREDENTIALS, DEFAULT_AUTH_CREDENTIALS, TTL.PERMANENT, true);
  }
  return DEFAULT_AUTH_CREDENTIALS;
}

/**
 * Persists updated authentication credentials into local store permanently.
 */
export function saveStoredAuthCredentials(creds: StoredAuthCredential[]): void {
  setLocalData(STORAGE_KEYS.AUTH_CREDENTIALS, creds, TTL.PERMANENT);
}

/**
 * Synchronizes a user's login credentials in the local credentials database.
 */
export function syncAuthCredential(cred: {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  role: SystemRole | string;
  role_name: string;
  is_active: boolean;
  oldEmail?: string;
}): void {
  const list = getStoredAuthCredentials();
  const cleanEmail = cred.email.trim().toLowerCase();
  const cleanOldEmail = cred.oldEmail ? cred.oldEmail.trim().toLowerCase() : cleanEmail;

  const idx = list.findIndex(
    (c) =>
      c.id === cred.id ||
      c.email.toLowerCase() === cleanEmail ||
      c.email.toLowerCase() === cleanOldEmail
  );

  const existingPassword = idx >= 0 ? list[idx].password : undefined;
  let resolvedHashedPassword: string;

  if (cred.password && cred.password.trim().length >= 6) {
    resolvedHashedPassword = isHashedPassword(cred.password)
      ? cred.password
      : hashPassword(cred.password.trim());
  } else if (existingPassword) {
    resolvedHashedPassword = isHashedPassword(existingPassword)
      ? existingPassword
      : hashPassword(existingPassword);
  } else {
    resolvedHashedPassword = hashPassword("123456");
  }

  const updatedEntry: StoredAuthCredential = {
    id: cred.id,
    email: cleanEmail,
    password: resolvedHashedPassword,
    full_name: cred.full_name,
    role: cred.role,
    role_name: cred.role_name,
    is_active: cred.is_active,
    updated_at: new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = updatedEntry;
  } else {
    list.push(updatedEntry);
  }

  saveStoredAuthCredentials(list);
}

/**
 * Removes credentials upon user deletion.
 */
export function removeAuthCredential(id: string, email?: string): void {
  const list = getStoredAuthCredentials();
  const cleanEmail = (email || "").trim().toLowerCase();
  const remaining = list.filter(
    (c) => c.id !== id && (!cleanEmail || c.email.toLowerCase() !== cleanEmail)
  );
  saveStoredAuthCredentials(remaining);
}

/**
 * Finds credential by email.
 */
export function findAuthCredentialByEmail(email: string): StoredAuthCredential | undefined {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return undefined;
  const list = getStoredAuthCredentials();
  return list.find((c) => c.email.toLowerCase() === cleanEmail);
}

/**
 * Verifies credentials against the synchronized local auth credentials store.
 * Authenticates using salted SHA-256 hash comparison and returns a sanitized user profile.
 */
export function verifyLocalCredential(
  email: string,
  password: string
): { valid: boolean; user?: StoredAuthCredential; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cred = findAuthCredentialByEmail(cleanEmail);

  if (!cred) {
    return { valid: false, error: "Invalid login credentials" };
  }

  if (cred.is_active === false) {
    return {
      valid: false,
      error: "Your account is currently inactive. Please contact Super Admin.",
    };
  }

  if (cred.password && !verifyPassword(password.trim(), cred.password)) {
    return { valid: false, error: "Invalid login credentials" };
  }

  // If password was legacy unhashed, upgrade it now to secure hash
  if (cred.password && !isHashedPassword(cred.password)) {
    try {
      syncAuthCredential({
        ...cred,
        password: hashPassword(password.trim()),
      });
    } catch {}
  }

  // Return sanitized user object with password stripped
  const sanitizedUser = sanitizeManagedUser(cred) as StoredAuthCredential;

  return { valid: true, user: sanitizedUser };
}

/**
 * Merges remote Supabase users with local user changes.
 */
export function mergeAndEnrichUsers(
  remoteUsers: ManagedUser[],
  localUsers?: ManagedUser[]
): ManagedUser[] {
  const deleted = getDeletedIds(STORAGE_KEYS.DELETED_USERS);
  const currentLocal = localUsers || getStoredUsers();

  const localById = new Map<string, ManagedUser>();
  const localByEmail = new Map<string, ManagedUser>();
  currentLocal.forEach((u) => {
    localById.set(u.id, u);
    localByEmail.set(u.email.toLowerCase(), u);
  });

  const mergedMap = new Map<string, ManagedUser>();

  // Process remote users
  (remoteUsers || []).forEach((ru) => {
    if (deleted.has(ru.id) || deleted.has((ru.email || "").toLowerCase())) {
      return; // Skip deleted users
    }

    const rawId = ru.id;
    const resolvedId = normalizeUserId(rawId, ru.email);
    if (rawId && resolvedId !== rawId) {
      migrateUserReferences(rawId, resolvedId);
    }

    const localMatch = localById.get(resolvedId) || localById.get(rawId) || localByEmail.get((ru.email || "").toLowerCase());

    if (localMatch) {
      // Local changes take precedence over stale remote tables (especially if RLS prevented remote update)
      const merged: ManagedUser = {
        ...ru,
        ...localMatch,
        id: localMatch.id || resolvedId,
        email: localMatch.email || ru.email,
        full_name: localMatch.full_name || ru.full_name,
        phone: localMatch.phone !== undefined ? localMatch.phone : ru.phone,
        role: localMatch.role || ru.role,
        role_name: localMatch.role_name || ru.role_name,
        is_active: localMatch.is_active !== undefined ? localMatch.is_active : ru.is_active,
        updated_at: localMatch.updated_at || ru.updated_at || new Date().toISOString(),
      };
      mergedMap.set(merged.id, merged);
    } else {
      mergedMap.set(resolvedId, { ...ru, id: resolvedId });
    }
  });

  // Preserve local users that weren't in remote (e.g. newly created or offline)
  currentLocal.forEach((lu) => {
    if (deleted.has(lu.id) || deleted.has((lu.email || "").toLowerCase())) {
      return;
    }
    const resolvedLocalId = normalizeUserId(lu.id, lu.email);
    if (resolvedLocalId !== lu.id) {
      migrateUserReferences(lu.id, resolvedLocalId);
    }
    const normalizedUser = { ...lu, id: resolvedLocalId };
    if (!mergedMap.has(resolvedLocalId) && !Array.from(mergedMap.values()).some((m) => m.email.toLowerCase() === lu.email.toLowerCase())) {
      mergedMap.set(resolvedLocalId, normalizedUser);
    }
  });

  // Ensure default system accounts exist if neither present nor deleted
  DEFAULT_SYSTEM_USERS.forEach((du) => {
    if (deleted.has(du.id) || deleted.has(du.email.toLowerCase())) {
      return;
    }
    const hasEmail = Array.from(mergedMap.values()).some(
      (m) => m.email.toLowerCase() === du.email.toLowerCase()
    );
    if (!mergedMap.has(du.id) && !hasEmail) {
      mergedMap.set(du.id, du);
    }
  });

  const result = Array.from(mergedMap.values()).map((u) => sanitizeManagedUser(u) as ManagedUser);
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Save the reconciled state silently to prevent event recursion
  saveStoredUsers(result, true);
  return result;
}

/**
 * Fetches user accounts from Supabase (`profiles` and `users` tables) with graceful RLS error handling.
 */
export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const remoteList: ManagedUser[] = [];

  // 1. Try querying `profiles` table
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.warn("Supabase profiles query notice (RLS or missing table):", profilesError.message);
    } else if (Array.isArray(profilesData)) {
      profilesData.forEach((p: any) => {
        const rawRole = (p.role || p.role_name || "").toLowerCase().replace(/[\s_-]+/g, "");
        const normalizedRole: SystemRole = rawRole.includes("admin") ? "super_admin" : "sales_officer";
        const resolvedId = normalizeUserId(p.id, p.email);
        remoteList.push({
          id: resolvedId,
          email: p.email,
          full_name: p.full_name || p.name || "User",
          phone: p.phone || p.phone_number || p.contact_no || null,
          role: normalizedRole,
          role_name: normalizedRole === "super_admin" ? "Super Admin" : "Sales Officer",
          is_active: p.is_active ?? true,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at,
        });
      });
    }
  } catch (err) {
    console.warn("Could not query profiles table:", err);
  }

  // 2. Try querying `users` table
  try {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) {
      console.warn("Supabase users query notice (RLS or missing table):", usersError.message);
    } else if (Array.isArray(usersData)) {
      const existingIds = new Set(remoteList.map((u) => u.id));
      const existingEmails = new Set(remoteList.map((u) => u.email.toLowerCase()));

      usersData.forEach((u: any) => {
        const resolvedId = normalizeUserId(u.id, u.email);
        if (!existingIds.has(resolvedId) && !existingEmails.has((u.email || "").toLowerCase())) {
          const rawRole = (u.role_name || u.role || "").toLowerCase().replace(/[\s_-]+/g, "");
          const normalizedRole: SystemRole = rawRole.includes("admin") ? "super_admin" : "sales_officer";
          remoteList.push({
            id: resolvedId,
            email: u.email,
            full_name: u.full_name || u.name || "User",
            phone: u.phone || u.phone_number || u.contact_no || null,
            role: normalizedRole,
            role_name: normalizedRole === "super_admin" ? "Super Admin" : "Sales Officer",
            is_active: u.is_active ?? true,
            created_at: u.created_at || new Date().toISOString(),
            updated_at: u.updated_at,
          });
        }
      });
    }
  } catch (err) {
    console.warn("Could not query users table:", err);
  }

  // Reconcile and enrich with local storage
  return mergeAndEnrichUsers(remoteList);
}

/**
 * Updates a user's profile and credentials across Supabase Auth, profiles/users tables, and localStorage.
 */
export async function updateManagedUser(
  editingUser: ManagedUser,
  updates: {
    fullName: string;
    email: string;
    phone?: string;
    role: SystemRole;
    is_active: boolean;
    newPassword?: string;
  },
  currentAuthUser?: any
): Promise<{ success: boolean; user: ManagedUser; warning?: string; credentialsUpdated?: boolean }> {
  const roleLabel = updates.role === "super_admin" ? "Super Admin" : "Sales Officer";
  const now = new Date().toISOString();

  // Ensure unique ID is maintained (or normalized if legacy placeholder)
  const targetId = normalizeUserId(editingUser.id, editingUser.email);
  if (targetId !== editingUser.id) {
    migrateUserReferences(editingUser.id, targetId);
  }

  const isEditingSelf =
    currentAuthUser?.email?.toLowerCase() === editingUser.email.toLowerCase() ||
    currentAuthUser?.id === editingUser.id ||
    currentAuthUser?.id === targetId;

  let warning: string | undefined;

  // 1. Supabase Auth Credentials Update (if password or email changed)
  const emailChanged = updates.email.toLowerCase() !== editingUser.email.toLowerCase();
  const passwordChanged = Boolean(updates.newPassword && updates.newPassword.trim().length >= 6);
  const credentialsUpdated = emailChanged || passwordChanged;

  // Always sync local/mock auth credentials store so immediate login succeeds
  syncAuthCredential({
    id: targetId,
    email: updates.email,
    password: updates.newPassword,
    full_name: updates.fullName,
    role: updates.role,
    role_name: roleLabel,
    is_active: updates.is_active,
    oldEmail: editingUser.email,
  });

  // Attempt live Supabase Auth update
  if (credentialsUpdated) {
    try {
      if (isEditingSelf) {
        const payload: { email?: string; password?: string } = {};
        if (passwordChanged) payload.password = updates.newPassword!.trim();
        if (emailChanged) payload.email = updates.email;
        const { error } = await supabase.auth.updateUser(payload);
        if (error) {
          console.warn("Supabase auth.updateUser notice:", error.message);
          warning = `Auth update notice: ${error.message}`;
        }
      } else {
        const authAdmin = (supabase.auth as any).admin;
        if (authAdmin && typeof authAdmin.updateUserById === "function") {
          const payload: { email?: string; password?: string } = {};
          if (passwordChanged) payload.password = updates.newPassword!.trim();
          if (emailChanged) payload.email = updates.email;
          const { error } = await authAdmin.updateUserById(targetId, payload);
          if (error) {
            console.warn("Supabase admin.updateUserById notice:", error.message);
          }
        }

        // Also attempt secondary client sign-up if the user was never registered in Supabase Auth
        if (passwordChanged) {
          try {
            const secondaryAuthClient = createSecondaryAuthClient();
            await secondaryAuthClient.auth.signUp({
              email: updates.email,
              password: updates.newPassword!.trim(),
              options: {
                data: {
                  full_name: updates.fullName,
                  role: updates.role,
                  role_name: roleLabel,
                },
              },
            });
          } catch (signUpErr) {
            console.info("Notice syncing secondary auth sign-up:", signUpErr);
          }
        }
      }
    } catch (authErr: any) {
      console.warn("Auth update exception (RLS / admin limit):", authErr?.message);
    }
  }

  // 2. Update Supabase `profiles` table
  try {
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: targetId,
      email: updates.email,
      full_name: updates.fullName,
      phone: updates.phone || null,
      role: updates.role,
      role_name: roleLabel,
      is_active: updates.is_active,
      updated_at: now,
    });
    if (profileErr) {
      console.warn("Supabase profiles update notice (RLS):", profileErr.message);
    }
  } catch (err: any) {
    console.warn("Profiles table update error:", err?.message);
  }

  // 3. Update Supabase `users` table
  try {
    const { error: usersErr } = await supabase.from("users").upsert({
      id: targetId,
      email: updates.email,
      full_name: updates.fullName,
      phone: updates.phone || null,
      role_name: roleLabel,
      is_active: updates.is_active,
      updated_at: now,
    });
    if (usersErr) {
      console.warn("Supabase users update notice (RLS):", usersErr.message);
    }
  } catch (err: any) {
    console.warn("Users table update error:", err?.message);
  }

  // 4. Update Local Storage Persistence immediately (guarantees zero UI lag & RLS resilience)
  const currentList = getStoredUsers();
  const updatedUser: ManagedUser = {
    ...editingUser,
    id: targetId,
    email: updates.email,
    full_name: updates.fullName,
    phone: updates.phone || null,
    role: updates.role,
    role_name: roleLabel,
    is_active: updates.is_active,
    updated_at: now,
  };

  let found = false;
  const updatedList = currentList.map((u) => {
    if (
      u.id === targetId ||
      u.id === editingUser.id ||
      u.email.toLowerCase() === editingUser.email.toLowerCase()
    ) {
      found = true;
      return updatedUser;
    }
    return u;
  });

  if (!found) {
    updatedList.unshift(updatedUser);
  }

  saveStoredUsers(updatedList);

  return { success: true, user: updatedUser, warning, credentialsUpdated };
}

/**
 * Deletes a user record, records tombstones in DELETED_USERS to prevent zombie resurrection,
 * removes auth credentials, and updates local and Supabase stores immediately.
 */
export async function deleteManagedUser(
  user: ManagedUser,
  currentAuthUser?: any
): Promise<{ success: boolean }> {
  const isSelf =
    currentAuthUser?.email?.toLowerCase() === user.email.toLowerCase() ||
    currentAuthUser?.id === user.id;

  if (isSelf) {
    throw new Error("Safety Guard: You cannot delete your own active Super Admin account.");
  }

  // 1. Tombstone user ID and email to prevent re-query resurrection
  saveDeletedId(STORAGE_KEYS.DELETED_USERS, user.id);
  if (user.email) {
    saveDeletedId(STORAGE_KEYS.DELETED_USERS, user.email.toLowerCase());
  }

  // 2. Remove from auth credentials store
  removeAuthCredential(user.id, user.email);

  // 3. Remove from Supabase `profiles` table
  try {
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) console.warn("Supabase profiles delete notice (RLS):", error.message);
  } catch (err: any) {
    console.warn("Profiles delete notice:", err?.message);
  }

  // 4. Remove from Supabase `users` table
  try {
    const { error } = await supabase.from("users").delete().eq("id", user.id);
    if (error) console.warn("Supabase users delete notice (RLS):", error.message);
  } catch (err: any) {
    console.warn("Users delete notice:", err?.message);
  }

  // 5. Update local storage persistence immediately
  const currentList = getStoredUsers();
  const remaining = currentList.filter(
    (u) => u.id !== user.id && u.email.toLowerCase() !== user.email.toLowerCase()
  );

  saveStoredUsers(remaining);

  return { success: true };
}

/**
 * Creates a new user record via isolated Supabase Auth client, records to DB, and persists to local state.
 */
export async function createManagedUser(formData: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: SystemRole;
  is_active: boolean;
}): Promise<{ success: boolean; user: ManagedUser }> {
  const name = formData.fullName.trim();
  const email = formData.email.trim().toLowerCase();
  const phone = formData.phone.trim();
  const password = formData.password.trim();
  const role: SystemRole = formData.role === "super_admin" ? "super_admin" : "sales_officer";
  const roleLabel = role === "super_admin" ? "Super Admin" : "Sales Officer";
  const now = new Date().toISOString();

  // If this email was previously deleted/tombstoned, untombstone it
  removeDeletedId(STORAGE_KEYS.DELETED_USERS, email);

  // 1. Isolated Supabase Auth Client for sign-up without clearing admin session
  const secondaryAuthClient = createSecondaryAuthClient();

  let newUserId: string = generateUUID();
  try {
    const { data: authData, error: authError } = await secondaryAuthClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || null,
          role: role,
          role_name: roleLabel,
        },
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("taken")
      ) {
        throw new Error("This email is already registered in the system.");
      }
      console.warn("Supabase auth.signUp notice:", authError.message);
    } else if (authData.user?.id) {
      newUserId = authData.user.id;
    }
  } catch (err: any) {
    if (err.message.includes("already registered")) {
      throw err;
    }
    console.warn("Secondary auth client notice:", err.message);
  }

  // Remove potential tombstone on the new UUID
  removeDeletedId(STORAGE_KEYS.DELETED_USERS, newUserId);

  const newUser: ManagedUser = {
    id: newUserId,
    email,
    full_name: name,
    phone: phone || null,
    role,
    role_name: roleLabel,
    is_active: formData.is_active,
    created_at: now,
    updated_at: now,
  };

  // Synchronize local auth credentials store
  syncAuthCredential({
    id: newUserId,
    email,
    password,
    full_name: name,
    role,
    role_name: roleLabel,
    is_active: formData.is_active,
  });

  // 2. Insert into `profiles` table
  try {
    await supabase.from("profiles").upsert({
      id: newUserId,
      email,
      full_name: name,
      phone: phone || null,
      role,
      role_name: roleLabel,
      is_active: formData.is_active,
      created_at: now,
      updated_at: now,
    });
  } catch (err: any) {
    console.info("Notice inserting into profiles table:", err?.message);
  }

  // 3. Insert into `users` table
  try {
    await supabase.from("users").upsert({
      id: newUserId,
      email,
      full_name: name,
      phone: phone || null,
      role_name: roleLabel,
      is_active: formData.is_active,
      created_at: now,
    });
  } catch (err: any) {
    console.info("Notice inserting into users table:", err?.message);
  }

  // 4. Update local storage
  const currentList = getStoredUsers();
  const updatedList = [newUser, ...currentList.filter((u) => u.id !== newUserId && u.email.toLowerCase() !== email)];
  saveStoredUsers(updatedList);

  return { success: true, user: newUser };
}

/**
 * Updates a user's password directly by email in the local authentication store.
 * Guarantees zero-cost, zero-configuration local/demo login support across any domain.
 */
export function updatePasswordByEmail(email: string, newPassword: string): boolean {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !newPassword || newPassword.trim().length < 6) return false;

  const creds = getStoredAuthCredentials();
  const existingIndex = creds.findIndex((c) => c.email.toLowerCase() === cleanEmail);
  const hashedPassword = hashPassword(newPassword.trim());

  if (existingIndex >= 0) {
    creds[existingIndex].password = hashedPassword;
    creds[existingIndex].updated_at = new Date().toISOString();
    saveStoredAuthCredentials(creds);
  } else {
    // If not found in credentials list, look up user from stored users list
    const users = getStoredUsers();
    const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

    const newCred: StoredAuthCredential = {
      id: matchedUser?.id || generateUUID(),
      email: cleanEmail,
      password: hashedPassword,
      full_name: matchedUser?.full_name || "User",
      role: matchedUser?.role || "super_admin",
      role_name: matchedUser?.role_name || "Super Admin",
      is_active: matchedUser?.is_active ?? true,
      updated_at: new Date().toISOString(),
    };
    creds.push(newCred);
    saveStoredAuthCredentials(creds);
  }

  // Also sanitize and update users list
  try {
    const users = getStoredUsers();
    const updatedUsers = users.map((u) => {
      const sanitized = sanitizeManagedUser(u) as ManagedUser;
      return sanitized.email.toLowerCase() === cleanEmail
        ? { ...sanitized, updated_at: new Date().toISOString() }
        : sanitized;
    });
    saveStoredUsers(updatedUsers);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sales_erp_storage_update"));
  }

  return true;
}

/**
 * Dynamically fetches active Sales Officers directly from the users table
 * where role/role_name IN ('sales_officer', 'sales_rep', 'Sales Officer').
 */
export async function fetchActiveSalesOfficers(): Promise<ManagedUser[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role_name, is_active")
      .eq("is_active", true);

    if (!error && Array.isArray(data) && data.length > 0) {
      const officers: ManagedUser[] = [];
      data.forEach((u: any) => {
        const rawRole = (u.role_name || u.role || "").toLowerCase().replace(/[\s_-]+/g, "");
        const isSalesOfficer =
          rawRole === "salesofficer" ||
          rawRole === "salesrep" ||
          rawRole.includes("officer") ||
          rawRole.includes("rep") ||
          (rawRole !== "superadmin" && !rawRole.includes("admin") && rawRole !== "accountant");

        if (isSalesOfficer) {
          officers.push({
            id: u.id,
            email: u.email,
            full_name: u.full_name || u.name || "",
            phone: u.phone || null,
            role: "sales_officer",
            role_name: u.role_name || "Sales Officer",
            is_active: true,
            created_at: u.created_at || new Date().toISOString(),
          });
        }
      });
      if (officers.length > 0) {
        return officers;
      }
    }
  } catch (err) {
    console.warn("Direct query for active sales officers notice:", err);
  }

  // Fallback to fetchManagedUsers and DEFAULT_SYSTEM_USERS
  const all: ManagedUser[] = await fetchManagedUsers();
  const filtered = all.filter((u: ManagedUser) => {
    const rawRole = (u.role_name || u.role || "").toLowerCase().replace(/[\s_-]+/g, "");
    return (
      (u.is_active ?? true) &&
      (rawRole === "salesofficer" ||
        rawRole === "salesrep" ||
        rawRole.includes("officer") ||
        rawRole.includes("rep") ||
        (!rawRole.includes("admin") && rawRole !== "accountant"))
    );
  });

  return filtered.length > 0
    ? filtered
    : DEFAULT_SYSTEM_USERS.filter((u) => u.role === "sales_officer");
}

/**
 * Returns currently cached sales officers synchronously for zero-lag UI render.
 */
export function getLocalSalesOfficers(): ManagedUser[] {
  const localUsers = getStoredUsers();
  const officers = localUsers.filter((u: ManagedUser) => {
    const rawRole = (u.role_name || u.role || "").toLowerCase().replace(/[\s_-]+/g, "");
    return (
      (u.is_active ?? true) &&
      (rawRole === "salesofficer" ||
        rawRole === "salesrep" ||
        rawRole.includes("officer") ||
        rawRole.includes("rep") ||
        (!rawRole.includes("admin") && rawRole !== "accountant"))
    );
  });
  if (officers.length > 0) return officers;
  return DEFAULT_SYSTEM_USERS.filter((u) => u.role === "sales_officer");
}

export interface UserLookupInfo {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  role_name?: string;
}

/**
 * Builds a comprehensive User Lookup Map synchronously from all available local data
 * (stored users, stored orders with embedded sales reps/names, stored collections, and auth profile).
 * Ensures instant correct display on page reload before any asynchronous network fetch completes.
 */
export function buildUserLookupMap(
  initialProfile?: { id?: string; full_name?: string; email?: string; role_name?: string } | null
): Record<string, UserLookupInfo> {
  const map: Record<string, UserLookupInfo> = {};

  // 1. From local stored users
  try {
    const stored = getStoredUsers();
    stored.forEach((u) => {
      if (u.id) {
        map[String(u.id)] = {
          id: String(u.id),
          full_name: u.full_name || (u as any).name || "",
          email: u.email,
          role: u.role,
          role_name: u.role_name,
        };
      }
    });
  } catch (e) {
    console.warn("Notice building user lookup map from stored users:", e);
  }

  // 2. From stored orders (preserving sales_rep / sales_rep_name / created_by_name)
  try {
    const orders = getLocalData<any>(STORAGE_KEYS.ORDERS, []);
    if (Array.isArray(orders)) {
      orders.forEach((o) => {
        const repId = o.sales_rep_id;
        const repName = o.sales_rep?.full_name || o.sales_rep_name || o.created_by_name;
        if (repId && repName && typeof repName === "string" && repName.trim()) {
          const trimmed = repName.trim();
          if (
            !map[String(repId)] ||
            !map[String(repId)].full_name ||
            map[String(repId)].full_name === "Sales Officer" ||
            map[String(repId)].full_name === "Unknown Officer"
          ) {
            map[String(repId)] = {
              id: String(repId),
              full_name: trimmed,
              email: o.sales_rep?.email || map[String(repId)]?.email,
            };
          }
        }
      });
    }
  } catch (e) {
    console.warn("Notice building user lookup map from stored orders:", e);
  }

  // 3. From stored collections (preserving collector / collector_name / collected_by_name)
  try {
    const collections = getLocalData<any>(STORAGE_KEYS.COLLECTIONS, []);
    if (Array.isArray(collections)) {
      collections.forEach((c) => {
        const colId = c.collected_by;
        const colName = c.collector?.full_name || c.collector_name || c.collected_by_name;
        if (colId && colName && typeof colName === "string" && colName.trim()) {
          const trimmed = colName.trim();
          if (
            !map[String(colId)] ||
            !map[String(colId)].full_name ||
            map[String(colId)].full_name === "Sales Officer" ||
            map[String(colId)].full_name === "Unknown Officer"
          ) {
            map[String(colId)] = {
              id: String(colId),
              full_name: trimmed,
              email: c.collector?.email || map[String(colId)]?.email,
            };
          }
        }
      });
    }
  } catch (e) {
    console.warn("Notice building user lookup map from stored collections:", e);
  }

  // 4. From current authenticated user profile
  if (initialProfile?.id) {
    map[String(initialProfile.id)] = {
      id: String(initialProfile.id),
      full_name: initialProfile.full_name || map[String(initialProfile.id)]?.full_name || "",
      email: initialProfile.email || map[String(initialProfile.id)]?.email,
      role_name: initialProfile.role_name || map[String(initialProfile.id)]?.role_name,
    };
  }

  return map;
}

/**
 * Fetches users directly from Supabase users/profiles table and merges into the user lookup map,
 * while also synchronizing with local user store for persistence across page reloads.
 */
export async function fetchAllUsersMap(
  existingMap: Record<string, UserLookupInfo> = {}
): Promise<Record<string, UserLookupInfo>> {
  const nextMap: Record<string, UserLookupInfo> = { ...existingMap };
  try {
    const { data: usersData, error: usersErr } = await supabase
      .from("users")
      .select("id, full_name, email, role_name")
      .order("full_name");

    if (!usersErr && Array.isArray(usersData) && usersData.length > 0) {
      usersData.forEach((u: any) => {
        if (u.id) {
          nextMap[String(u.id)] = {
            id: String(u.id),
            full_name: u.full_name || u.name || nextMap[String(u.id)]?.full_name || "",
            email: u.email || nextMap[String(u.id)]?.email,
            role_name: u.role_name || nextMap[String(u.id)]?.role_name,
          };
        }
      });

      // Synchronize with stored users
      const currentStored = getStoredUsers();
      const storedMap = new Map(currentStored.map((cu) => [String(cu.id), cu]));
      usersData.forEach((u: any) => {
        if (u.id) {
          storedMap.set(String(u.id), {
            id: String(u.id),
            email: u.email || "",
            full_name: u.full_name || u.name || "",
            phone: u.phone || null,
            role: (u.role_name || "").toLowerCase().includes("admin") ? "super_admin" : "sales_officer",
            role_name: u.role_name || "Sales Officer",
            is_active: u.is_active ?? true,
            created_at: u.created_at || new Date().toISOString(),
          });
        }
      });
      saveStoredUsers(Array.from(storedMap.values()));
    } else {
      // Fallback: fetchManagedUsers
      const managed = await fetchManagedUsers();
      managed.forEach((u) => {
        if (u.id) {
          nextMap[String(u.id)] = {
            id: String(u.id),
            full_name: u.full_name || nextMap[String(u.id)]?.full_name || "",
            email: u.email || nextMap[String(u.id)]?.email,
            role_name: u.role_name || nextMap[String(u.id)]?.role_name,
          };
        }
      });
    }
  } catch (err) {
    console.warn("Notice fetching all users map:", err);
  }

  return nextMap;
}

/**
 * Dynamically resolves an officer's display name via sales_rep_id / collected_by relationship.
 * Displays full_name if available; falls back to embedded name, user map, email, or 'Sales Officer'.
 * Never falls back to 'Unknown Officer'.
 */
export function resolveOfficerName(
  userId: string | null | undefined,
  officersListOrMap?: ManagedUser[] | Map<string, ManagedUser | any> | Record<string, any>,
  embeddedUser?: { full_name?: string | null; email?: string | null } | null,
  fallbackName?: string | null
): string {
  // 1. Dynamic lookup by ID first (reflects recent user name changes immediately)
  if (userId) {
    const cleanId = String(userId).trim();
    if (officersListOrMap) {
      if (officersListOrMap instanceof Map) {
        const match = officersListOrMap.get(cleanId);
        if (match?.full_name?.trim()) return match.full_name.trim();
        if (match?.email?.trim()) return match.email.trim();
      } else if (Array.isArray(officersListOrMap)) {
        const match = officersListOrMap.find((u) => String(u.id) === cleanId);
        if (match?.full_name?.trim()) return match.full_name.trim();
        if (match?.email?.trim()) return match.email.trim();
      } else if (typeof officersListOrMap === "object") {
        const match = (officersListOrMap as any)[cleanId];
        if (match?.full_name?.trim()) return match.full_name.trim();
        if (match?.email?.trim()) return match.email.trim();
      }
    }
    const storedUser = getSalesOfficerById(cleanId);
    if (storedUser?.full_name?.trim()) return storedUser.full_name.trim();
  }

  // 2. Embedded user info from joined record
  if (embeddedUser?.full_name && typeof embeddedUser.full_name === "string" && embeddedUser.full_name.trim()) {
    return embeddedUser.full_name.trim();
  }

  // 3. Fallback name
  if (fallbackName && typeof fallbackName === "string" && fallbackName.trim() && fallbackName !== "Unknown Officer") {
    return fallbackName.trim();
  }

  if (embeddedUser?.email && typeof embeddedUser.email === "string" && embeddedUser.email.trim()) {
    return embeddedUser.email.trim();
  }

  return "Sales Officer";
}




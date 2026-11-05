import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

export interface AppVersionMetadata {
  id?: string;
  version: string;
  versionCode: number;
  minSupportedVersion?: string;
  forceUpdate?: boolean;
  apkUrl: string;
  releaseNotes?: string;
  releasedAt?: string;
  platform?: "android" | "ios" | "all";
}

export interface CurrentAppInfo {
  name: string;
  id: string;
  version: string;
  build: string | number;
  isNative: boolean;
}

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  isForced: boolean;
  currentVersion: string;
  currentBuild: string | number;
  latestVersion: string;
  latestVersionCode: number;
  metadata: AppVersionMetadata | null;
  error?: string | null;
}

export const GITHUB_RAW_VERSION_URL =
  "https://raw.githubusercontent.com/RabiulSabur-Lab/hamko-erp/main/public/version.json";
export const GITHUB_ROOT_VERSION_URL =
  "https://raw.githubusercontent.com/RabiulSabur-Lab/hamko-erp/main/version.json";
export const HOSTED_VERSION_URL =
  "https://hamko-erp.vercel.app/version.json";
export const GITHUB_PAGES_VERSION_URL =
  "https://rabiulsabur-lab.github.io/hamko-erp/version.json";
export const GITHUB_LATEST_RELEASE_APK =
  "https://github.com/RabiulSabur-Lab/hamko-erp/releases/latest/download/app-release.apk";

export const DEFAULT_FALLBACK_METADATA: AppVersionMetadata = {
  version: "1.0.1",
  versionCode: 2,
  minSupportedVersion: "1.0.0",
  forceUpdate: false,
  apkUrl: GITHUB_LATEST_RELEASE_APK,
  releaseNotes: "• Real-time cross-device sync optimization\n• Offline cache persistence enhancements\n• Performance and UI improvements",
  releasedAt: "2026-11-05T12:00:00Z",
  platform: "android",
};

/**
 * Ensures APK URL is valid, clean, and points to a reachable GitHub Release or direct binary asset.
 * Prevents dead links or 404s from stale raw github paths.
 */
export function sanitizeApkUrl(url?: string | null): string {
  if (!url || typeof url !== "string") {
    return GITHUB_LATEST_RELEASE_APK;
  }
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.includes("raw.githubusercontent.com/hamko-erp") ||
    trimmed.includes("hamko-erp/releases/main")
  ) {
    return GITHUB_LATEST_RELEASE_APK;
  }
  return trimmed;
}

/**
 * Compares two semantic version strings (e.g., "1.2.0" vs "1.0.1").
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) =>
    (v || "")
      .replace(/^v/i, "")
      .trim()
      .split("-")[0]
      .split(".")
      .map((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) ? 0 : num;
      });

  const p1 = clean(v1);
  const p2 = clean(v2);
  const len = Math.max(p1.length, p2.length, 3);

  for (let i = 0; i < len; i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Retrieves current installed app info via Capacitor App plugin,
 * with graceful fallback for web/desktop browser environments.
 */
export async function getCurrentAppInfo(): Promise<CurrentAppInfo> {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      const info = await App.getInfo();
      return {
        name: info.name || "Hamko ERP",
        id: info.id || "com.hamko.erp",
        version: info.version || "1.0.0",
        build: info.build || "1",
        isNative: true,
      };
    } catch (err) {
      console.warn("[AppUpdate] Error reading native app info via @capacitor/app:", err);
    }
  }

  return {
    name: "Hamko ERP",
    id: "com.hamko.erp",
    version: "1.0.0",
    build: "1",
    isNative: false,
  };
}

/**
 * Fetches the latest version metadata by querying hosted dynamic endpoints,
 * with fallbacks to Supabase app_versions table and bundled asset fallbacks.
 */
export async function fetchLatestAppVersion(): Promise<AppVersionMetadata | null> {
  const candidateEndpoints = [
    GITHUB_RAW_VERSION_URL,
    GITHUB_ROOT_VERSION_URL,
    HOSTED_VERSION_URL,
    GITHUB_PAGES_VERSION_URL,
  ];

  // 1. Primary: Query hosted dynamic endpoints with timeout
  for (const endpoint of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-cache",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.version) {
          const apkUrl = sanitizeApkUrl(json.apkUrl);
          return {
            version: String(json.version).trim(),
            versionCode: Number(json.versionCode) || 1,
            minSupportedVersion: json.minSupportedVersion ? String(json.minSupportedVersion).trim() : undefined,
            forceUpdate: Boolean(json.forceUpdate),
            apkUrl,
            releaseNotes: json.releaseNotes || undefined,
            releasedAt: json.releasedAt || undefined,
            platform: json.platform || "android",
          };
        }
      }
    } catch (err) {
      // Continue to next candidate endpoint
      console.debug(`[AppUpdate] Endpoint ${endpoint} failed, trying next:`, err);
    }
  }

  // 2. Secondary: Query Supabase app_versions table
  try {
    if (supabase?.from) {
      const { data, error } = await supabase
        .from("app_versions")
        .select("id, version, version_code, min_supported_version, force_update, apk_url, release_notes, released_at, platform")
        .in("platform", ["android", "all"])
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.version) {
        return {
          id: data.id,
          version: String(data.version).trim(),
          versionCode: Number(data.version_code) || 1,
          minSupportedVersion: data.min_supported_version ? String(data.min_supported_version).trim() : undefined,
          forceUpdate: Boolean(data.force_update),
          apkUrl: sanitizeApkUrl(data.apk_url),
          releaseNotes: data.release_notes || undefined,
          releasedAt: data.released_at || undefined,
          platform: data.platform || "android",
        };
      }
    }
  } catch (err) {
    console.info("[AppUpdate] Supabase query notice:", err);
  }

  // 3. Tertiary: Local /version.json
  try {
    const res = await fetch("/version.json", {
      cache: "no-cache",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.version) {
        return {
          version: String(json.version).trim(),
          versionCode: Number(json.versionCode) || 1,
          minSupportedVersion: json.minSupportedVersion ? String(json.minSupportedVersion).trim() : undefined,
          forceUpdate: Boolean(json.forceUpdate),
          apkUrl: sanitizeApkUrl(json.apkUrl),
          releaseNotes: json.releaseNotes || undefined,
          releasedAt: json.releasedAt || undefined,
          platform: json.platform || "android",
        };
      }
    }
  } catch (err) {
    console.info("[AppUpdate] Local version.json fetch notice:", err);
  }

  // 4. Final: In-memory fallback
  return DEFAULT_FALLBACK_METADATA;
}

/**
 * Checks whether remote version is strictly newer than current installed version.
 */
export function isUpdateAvailable(
  remote: AppVersionMetadata,
  current: CurrentAppInfo,
): boolean {
  // If remote version code and local build are numbers and remoteCode > localBuild, definitely newer
  const rCode = Number(remote.versionCode);
  const lBuild = Number(current.build);
  if (!isNaN(rCode) && !isNaN(lBuild) && rCode > 0 && lBuild > 0) {
    if (rCode > lBuild) return true;
    if (rCode < lBuild) return false;
  }

  // Otherwise compare semantic version strings
  return compareSemver(remote.version, current.version) > 0;
}

/**
 * Checks whether the update is mandatory / non-dismissible.
 */
export function isForceUpdateRequired(
  remote: AppVersionMetadata,
  current: CurrentAppInfo,
): boolean {
  if (remote.forceUpdate) return true;
  if (remote.minSupportedVersion) {
    return compareSemver(remote.minSupportedVersion, current.version) > 0;
  }
  return false;
}

/**
 * High-level update checker that performs full discovery and comparison.
 * In web browsers, by default it avoids prompting unless allowWeb is explicitly passed.
 */
export async function checkForAppUpdate(options?: { allowWeb?: boolean }): Promise<AppUpdateCheckResult> {
  try {
    const isNative = Capacitor.isNativePlatform();
    const current = await getCurrentAppInfo();

    // If running in regular web / desktop browser and web updates are not enabled, return no update
    if (!isNative && !options?.allowWeb) {
      return {
        hasUpdate: false,
        isForced: false,
        currentVersion: current.version,
        currentBuild: current.build,
        latestVersion: current.version,
        latestVersionCode: Number(current.build) || 1,
        metadata: null,
      };
    }

    const latest = await fetchLatestAppVersion();

    if (!latest) {
      return {
        hasUpdate: false,
        isForced: false,
        currentVersion: current.version,
        currentBuild: current.build,
        latestVersion: current.version,
        latestVersionCode: Number(current.build) || 1,
        metadata: null,
      };
    }

    const hasUpdate = isUpdateAvailable(latest, current);
    const isForced = hasUpdate && isForceUpdateRequired(latest, current);

    return {
      hasUpdate,
      isForced,
      currentVersion: current.version,
      currentBuild: current.build,
      latestVersion: latest.version,
      latestVersionCode: latest.versionCode,
      metadata: latest,
    };
  } catch (err: any) {
    console.warn("[AppUpdate] Version check exception:", err);
    return {
      hasUpdate: false,
      isForced: false,
      currentVersion: "1.0.0",
      currentBuild: "1",
      latestVersion: "1.0.0",
      latestVersionCode: 1,
      metadata: null,
      error: err?.message || String(err),
    };
  }
}

/**
 * Triggers APK download directly in the system browser / download manager.
 * In Capacitor Android, opens via _system browser intent and fallback anchor.
 */
export function triggerApkDownload(apkUrl: string): void {
  const cleanUrl = sanitizeApkUrl(apkUrl);
  if (!cleanUrl) return;

  try {
    if (Capacitor.isNativePlatform() || (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.())) {
      // In Capacitor native Android, delegating to the system browser launches Android Download Manager
      window.open(cleanUrl, "_system");
      
      // Fallback synthetic link click with _system target
      try {
        const link = document.createElement("a");
        link.href = cleanUrl;
        link.target = "_system";
        link.rel = "noopener noreferrer";
        link.setAttribute("download", "hamko-erp-release.apk");
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 300);
      } catch {
        // Ignore fallback DOM error
      }
      return;
    }

    // Web fallback
    const link = document.createElement("a");
    link.href = cleanUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("download", "hamko-erp-release.apk");
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
  } catch {
    window.location.href = cleanUrl;
  }
}

/**
 * Closes the native application if update is mandatory and user opts to exit.
 */
export async function exitMobileApp(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await App.exitApp();
    } catch (e) {
      console.warn("[AppUpdate] exitApp failed:", e);
    }
  }
}

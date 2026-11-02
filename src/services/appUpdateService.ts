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

export const DEFAULT_FALLBACK_METADATA: AppVersionMetadata = {
  version: "1.0.1",
  versionCode: 2,
  minSupportedVersion: "1.0.0",
  forceUpdate: false,
  apkUrl: "https://raw.githubusercontent.com/hamko-erp/releases/main/hamko-erp-latest.apk",
  releaseNotes: "• Real-time cross-device sync optimization\n• Offline cache persistence enhancements\n• Performance and UI improvements",
  releasedAt: "2026-11-02T12:00:00Z",
  platform: "android",
};

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
 * Fetches the latest version metadata from Supabase with fallbacks to hosted JSON and safe defaults.
 */
export async function fetchLatestAppVersion(): Promise<AppVersionMetadata | null> {
  // 1. Primary: Query Supabase app_versions table
  try {
    if (supabase?.from) {
      const { data, error } = await supabase
        .from("app_versions")
        .select("id, version, version_code, min_supported_version, force_update, apk_url, release_notes, released_at, platform")
        .in("platform", ["android", "all"])
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.version && data.apk_url) {
        return {
          id: data.id,
          version: String(data.version).trim(),
          versionCode: Number(data.version_code) || 1,
          minSupportedVersion: data.min_supported_version ? String(data.min_supported_version).trim() : undefined,
          forceUpdate: Boolean(data.force_update),
          apkUrl: String(data.apk_url).trim(),
          releaseNotes: data.release_notes || undefined,
          releasedAt: data.released_at || undefined,
          platform: data.platform || "android",
        };
      }
    }
  } catch (err) {
    console.info("[AppUpdate] Supabase query notice (falling back to hosted version.json):", err);
  }

  // 2. Secondary: Query hosted version.json file
  try {
    const res = await fetch("/version.json", {
      cache: "no-cache",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.version && json.apkUrl) {
        return {
          version: String(json.version).trim(),
          versionCode: Number(json.versionCode) || 1,
          minSupportedVersion: json.minSupportedVersion ? String(json.minSupportedVersion).trim() : undefined,
          forceUpdate: Boolean(json.forceUpdate),
          apkUrl: String(json.apkUrl).trim(),
          releaseNotes: json.releaseNotes || undefined,
          releasedAt: json.releasedAt || undefined,
          platform: json.platform || "android",
        };
      }
    }
  } catch (err) {
    console.info("[AppUpdate] Hosted version.json fetch notice:", err);
  }

  // 3. Tertiary: In-memory fallback
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
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  try {
    const current = await getCurrentAppInfo();
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
 */
export function triggerApkDownload(apkUrl: string): void {
  if (!apkUrl) return;
  try {
    const link = document.createElement("a");
    link.href = apkUrl;
    link.target = "_system";
    link.rel = "noopener noreferrer";
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 150);
  } catch {
    window.location.href = apkUrl;
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


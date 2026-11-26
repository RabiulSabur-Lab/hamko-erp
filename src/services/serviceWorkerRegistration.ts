import { toast } from "sonner";

export const ACTIVE_SW_CACHE_NAME = "hamko-erp-cache-v20-20261126";
export const APP_BUNDLE_VERSION = "v20-20261126";
const BUNDLE_VERSION_STORAGE_KEY = "hamko_erp_bundle_version";
const RELOAD_GUARD_SESSION_KEY = "hamko_sw_reloaded_version";

/**
 * Purges ALL outdated Cache Storage buckets on both Web/PWA browsers and Capacitor WebViews
 * whenever a newer app bundle version boots, without clearing auth tokens or offline data.
 */
export function purgeStaleWebViewAndBrowserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const prevVersion = window.localStorage?.getItem(BUNDLE_VERSION_STORAGE_KEY);
    const versionChanged = prevVersion !== APP_BUNDLE_VERSION;

    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          return Promise.all(
            keys
              .filter((key) => key !== ACTIVE_SW_CACHE_NAME)
              .map((key) => {
                console.log("[CacheGuard] Purging outdated cache bucket:", key);
                return caches.delete(key);
              }),
          );
        })
        .catch(() => null);
    }

    if (versionChanged) {
      window.localStorage?.setItem(BUNDLE_VERSION_STORAGE_KEY, APP_BUNDLE_VERSION);
    }
  } catch (err) {
    console.warn("[CacheGuard] Boot cache purge notice:", err);
  }
}

/**
 * Registers the production service worker, configures aggressive update checks,
 * purges all legacy caches, and handles safe auto-reload for mobile/PWA browsers.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Avoid registering SW inside Capacitor native webviews where assets are local bundled files
  try {
    const isCapacitor = Boolean(
      (window as any).Capacitor?.isNativePlatform && (window as any).Capacitor.isNativePlatform(),
    );
    if (isCapacitor) return;
  } catch {
    // Safe fallback
  }

  const triggerSafeHardReload = (reason: string) => {
    try {
      const alreadyReloaded = window.sessionStorage?.getItem(RELOAD_GUARD_SESSION_KEY);
      if (alreadyReloaded === APP_BUNDLE_VERSION) return;
      window.sessionStorage?.setItem(RELOAD_GUARD_SESSION_KEY, APP_BUNDLE_VERSION);
    } catch {
      // Ignore sessionStorage restrictions
    }
    console.log(`[SW] ${reason}. Reloading page for fresh ${APP_BUNDLE_VERSION} bundle...`);
    window.location.reload();
  };

  window.addEventListener("load", async () => {
    try {
      // Wildcard purge of ALL non-current caches on load so stale desktop/mobile bundles never persist
      purgeStaleWebViewAndBrowserCaches();

      const registration = await navigator.serviceWorker.register("/sw.js?v=20", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("[SW] Registered with scope:", registration.scope);

      // Immediately probe server for newer sw.js rather than waiting for the periodic timer
      registration.update().catch(() => null);

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // 1. Check for updates on install and state change
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log("[SW] New update installed; activating immediately.");
              installingWorker.postMessage({ type: "SKIP_WAITING" });
              notifyNewVersionAvailable(installingWorker);
            }
          }
        };
      };

      // 2. Controller change & SW activation message auto-reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          triggerSafeHardReload("Controller changed");
        }
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_ACTIVATED" && event.data?.cacheName === ACTIVE_SW_CACHE_NAME) {
          const prev = (() => {
            try {
              return window.localStorage?.getItem(BUNDLE_VERSION_STORAGE_KEY);
            } catch {
              return APP_BUNDLE_VERSION;
            }
          })();
          if (prev && prev !== APP_BUNDLE_VERSION && !refreshing) {
            refreshing = true;
            triggerSafeHardReload("New service worker activated");
          }
        }
      });

      // 3. Foreground resume update checks (mobile unlock / tab focus / pageshow)
      const checkForUpdate = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        registration.update().catch((err) => {
          console.debug("[SW] Background update check notice:", err);
        });
      };

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      });
      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("pageshow", checkForUpdate);
      window.addEventListener("online", checkForUpdate);

      // 4. Periodic update check loop (every 60 seconds)
      setInterval(checkForUpdate, 60000);
    } catch (err) {
      console.warn("[SW] Registration notice:", err);
    }
  });
}

function notifyNewVersionAvailable(worker: ServiceWorker): void {
  toast.info("A new version of Hamko ERP is available!", {
    description: "Tap to reload and apply the latest update.",
    duration: 15000,
    action: {
      label: "Reload Now",
      onClick: () => {
        worker.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      },
    },
  });
}


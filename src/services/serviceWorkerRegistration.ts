import { toast } from "sonner";

/**
 * Registers the production service worker, configures update checks,
 * and handles aggressive new-version reload prompts for mobile browsers.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Avoid registering SW inside Capacitor native webviews where assets are local file:// bundles
  try {
    const isCapacitor = Boolean(
      (window as any).Capacitor?.isNativePlatform && (window as any).Capacitor.isNativePlatform(),
    );
    if (isCapacitor) return;
  } catch {
    // Safe fallback
  }

  window.addEventListener("load", async () => {
    try {
      // Purge any legacy caches on load so stale desktop/mobile bundles never persist
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (
              key === "hamko-erp-cache-v1" ||
              key === "hamko-erp-cache-v2" ||
              key === "hamko-erp-cache-v3-20261122" ||
              key === "hamko-erp-cache-v4-20261122" ||
              key === "hamko-erp-cache-v5-20261124" ||
              key === "hamko-erp-cache-v6-20261124" ||
              key === "hamko-erp-cache-v7-20261124" ||
              key === "hamko-erp-cache-v8-20261124" ||
              key === "hamko-erp-cache-v9-20261124"
            ) {
              caches.delete(key);
            }
          });
        }).catch(() => null);
      }

      const registration = await navigator.serviceWorker.register("/sw.js?v=10", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("[SW] Registered with scope:", registration.scope);

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

      // 2. Controller change auto-reload: When new SW activates, refresh page for fresh bundle
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[SW] Controller changed. Reloading page for new version...");
          window.location.reload();
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


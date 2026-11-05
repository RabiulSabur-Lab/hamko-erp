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
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("[SW] Registered with scope:", registration.scope);

      // 1. Check for updates on install and state change
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // New content is available; prompt or auto-reload
              console.log("[SW] New update installed and ready.");
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


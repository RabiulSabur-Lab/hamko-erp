import { useEffect, useRef } from "react";
import { pullFreshCloudStateToLocalStore } from "@/utils/cloudSync";

/**
 * Automatically triggers a Cloud-First data refresh when:
 * 1. Periodic background state convergence polling loop fires (every 7s)
 * 2. The mobile app/tab becomes visible again (visibilitychange)
 * 3. The window gains focus or restores from BFCache (focus / pageshow)
 * 4. Native Capacitor app resumes from background (resume)
 * 5. The device regains internet connectivity (online)
 */
export function useAutoSync(
  onSync: () => void | Promise<void>,
  enabled = true,
  debounceMs = 5000,
  pollIntervalMs = 0, // Disabled periodic polling loop to prevent Supabase Disk IO exhaustion; real-time CDC handles live updates
) {
  const lastSyncRef = useRef<number>(0);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const triggerSync = (forceCloudPull = false) => {
      const now = Date.now();
      if (now - lastSyncRef.current > debounceMs) {
        lastSyncRef.current = now;
        try {
          if (forceCloudPull) {
            void pullFreshCloudStateToLocalStore({ force: false, silent: true });
          }
          void onSyncRef.current();
        } catch (e) {
          console.warn("AutoSync trigger warning:", e);
        }
      }
    };

    // Periodic state convergence polling loop (disabled by default; runs only if explicitly configured >= 60s)
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (pollIntervalMs >= 60000) {
      intervalId = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        triggerSync(true);
      }, pollIntervalMs);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSync(true);
      }
    };

    const handleFocus = () => {
      triggerSync(true);
    };

    const handlePageShow = () => {
      triggerSync(true);
    };

    const handleResume = () => {
      triggerSync(true);
    };

    const handleOnline = () => {
      triggerSync(true);
    };

    const handleGlobalCloudUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const eventType = String(detail?.type || "");
      // When an authoritative global cloud pull, live sync, or cross-device broadcast finishes,
      // re-invoke the component's onSync callback without re-triggering another full cloud pull.
      if (
        eventType === "cloud_pull_completed" ||
        eventType === "cloud_sync_completed" ||
        eventType === "live_sync_forced" ||
        eventType === "erp_mutation"
      ) {
        const now = Date.now();
        if (now - lastSyncRef.current > 1200) {
          lastSyncRef.current = now;
          try {
            void onSyncRef.current();
          } catch (err) {
            console.warn("AutoSync cloud update warning:", err);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("resume", handleResume as EventListener);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("resume", handleResume as EventListener);
    window.addEventListener("online", handleOnline);
    window.addEventListener("sales_erp_storage_update", handleGlobalCloudUpdate);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("resume", handleResume as EventListener);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("resume", handleResume as EventListener);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("sales_erp_storage_update", handleGlobalCloudUpdate);
    };
  }, [enabled, debounceMs, pollIntervalMs]);
}

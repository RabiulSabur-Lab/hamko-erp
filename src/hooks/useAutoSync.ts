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
  debounceMs = 1200,
  pollIntervalMs = 7000,
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
            void pullFreshCloudStateToLocalStore({ force: true, silent: true });
          }
          void onSyncRef.current();
        } catch (e) {
          console.warn("AutoSync trigger warning:", e);
        }
      }
    };

    // Periodic state convergence polling loop
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (pollIntervalMs > 0) {
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("resume", handleResume as EventListener);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("resume", handleResume as EventListener);
    window.addEventListener("online", handleOnline);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("resume", handleResume as EventListener);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("resume", handleResume as EventListener);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, debounceMs, pollIntervalMs]);
}

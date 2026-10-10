import { useEffect, useRef } from "react";

/**
 * Automatically triggers a data refresh when:
 * 1. The mobile app/tab becomes visible again (visibilitychange)
 * 2. The window gains focus
 * 3. The device regains internet connectivity
 */
export function useAutoSync(onSync: () => void | Promise<void>, enabled = true, debounceMs = 2000) {
  const lastSyncRef = useRef<number>(Date.now());
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const triggerSync = () => {
      const now = Date.now();
      if (now - lastSyncRef.current > debounceMs) {
        lastSyncRef.current = now;
        try {
          onSyncRef.current();
        } catch (e) {
          console.warn("AutoSync trigger warning:", e);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSync();
      }
    };

    const handleFocus = () => {
      triggerSync();
    };

    const handleOnline = () => {
      triggerSync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, debounceMs]);
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Toaster } from "sonner";
import "./styles.css";
import { AuthProvider } from "./lib/auth";
import { UsersProvider } from "./context/UsersContext";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";
import { RouterProvider } from "./router";
import { App } from "./App";
import { cleanupLocalStorage } from "./lib/storageManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initRealtimeSync } from "./services/realtimeSync";
import { registerServiceWorker } from "./services/serviceWorkerRegistration";

// Run lightweight storage cleanup on boot to purge expired entries and prune tombstones
if (typeof window !== "undefined") {
  try {
    cleanupLocalStorage();
    void initRealtimeSync();
    registerServiceWorker();
  } catch (e) {
    console.warn("[app] Auto cleanup error:", e);
  }

  // Notify Capgo updater that the app initialized successfully
  try {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady().catch((err) => {
        console.warn("[Capgo] notifyAppReady notice:", err);
      });
    }
  } catch (err) {
    console.warn("[Capgo] Initialization notice:", err);
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UsersProvider>
            <ThemeProvider>
              <I18nProvider>
                <RouterProvider>
                  <App />
                  <Toaster position="top-right" richColors closeButton />
                </RouterProvider>
              </I18nProvider>
            </ThemeProvider>
          </UsersProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

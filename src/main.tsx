import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./styles.css";
import { AuthProvider } from "./lib/auth";
import { UsersProvider } from "./context/UsersContext";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";
import { RouterProvider } from "./router";
import { App } from "./App";
import { cleanupLocalStorage } from "./lib/storageManager";

// Run lightweight storage cleanup on boot to purge expired entries and prune tombstones
if (typeof window !== "undefined") {
  try {
    cleanupLocalStorage();
  } catch (e) {
    console.warn("[app] Auto cleanup error:", e);
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>,
);

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface RouterContextValue {
  path: string;
  fullPath: string;
  search: string;
  query: Record<string, string>;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function parseHashLocation() {
  const hashRaw = window.location.hash.replace(/^#+/, "") || "/";
  let pathname = hashRaw;
  let queryString = "";
  let fragmentString = "";

  const pathNameFromWindow = window.location.pathname || "";
  if (pathNameFromWindow.includes("reset-password") || pathNameFromWindow === "/reset-password") {
    pathname = "/reset-password";
    fragmentString = hashRaw.startsWith("/") ? hashRaw.slice(1) : hashRaw;
  } else if (pathname.includes("?")) {
    const parts = pathname.split("?");
    pathname = parts[0];
    queryString = parts[1] || "";
  } else if (pathname.includes("#")) {
    const parts = pathname.split("#");
    pathname = parts[0];
    fragmentString = parts[1] || "";
  }

  const base = pathname || "/";
  const cleanPath = base.startsWith("/") ? base : `/${base}`;
  const search = queryString ? `?${queryString}` : "";

  // Combine query and fragment parameters for easy token access
  const searchParams = new URLSearchParams(queryString);
  if (window.location.search) {
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (!searchParams.has(k)) searchParams.set(k, v);
    });
  }
  if (fragmentString) {
    new URLSearchParams(fragmentString).forEach((v, k) => {
      if (!searchParams.has(k)) searchParams.set(k, v);
    });
  }
  const query = Object.fromEntries(searchParams.entries());

  return {
    path: cleanPath,
    fullPath: `${cleanPath}${search}`,
    search,
    query,
  };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [routeState, setRouteState] = useState(parseHashLocation);

  useEffect(() => {
    const handler = () => {
      const raw = window.location.hash.replace("#", "");
      if (raw === "features" || raw === "stats" || raw === "roles") {
        return; // Ignore landing page in-page anchor jumps
      }
      setRouteState(parseHashLocation());
    };
    window.addEventListener("hashchange", handler);
    if (!window.location.hash) window.location.hash = "/";
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = (to: string) => {
    const clean = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = clean;
  };

  return (
    <RouterContext.Provider
      value={{
        path: routeState.path,
        fullPath: routeState.fullPath,
        search: routeState.search,
        query: routeState.query,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within RouterProvider");
  return ctx;
}

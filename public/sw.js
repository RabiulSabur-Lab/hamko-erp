/**
 * Hamko ERP - Production Mobile & PWA Service Worker
 * Network-First for Navigation & APIs, Stale-While-Revalidate for Static Assets
 */

const CACHE_NAME = "hamko-erp-cache-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/logo.png",
  "/Hamko.png",
  "/manifest.json",
  "/version.json",
];

// 1. Installation - Pre-cache core shell & skip waiting immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache non-critical notice:", err);
      });
    }),
  );
});

// 2. Activation - Claim active clients & purge outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[SW] Evicting legacy cache:", key);
              return caches.delete(key);
            }),
        );
      }),
    ]),
  );
});

// 3. Fetch Event Strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Bypass database, Supabase REST/Realtime, and authentication requests completely
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/realtime/") ||
    url.pathname.includes("googleapis.com")
  ) {
    return;
  }

  // Strategy A: HTML Documents / Page Navigations -> Strict NETWORK-FIRST
  // Guarantees users never get stuck on stale bundle hashes after new deployments
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match("/index.html") || caches.match("/"));
        }),
    );
    return;
  }

  // Strategy B: Static Hashed Assets (/assets/*.js, *.css) -> Cache-First with Background Revalidation
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => null);

        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Strategy C: Other local resources (images, icons, fonts) -> Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || networkFetch;
      }),
    );
  }
});

// 4. Message Listener - Skip waiting or purge caches on request
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

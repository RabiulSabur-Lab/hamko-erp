/**
 * Hamko ERP - Production Mobile & PWA Service Worker
 * Strict Network-First for HTML & Hashed Assets so new deployments take effect immediately
 */

const CACHE_NAME = "hamko-erp-cache-v21-20261126";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/logo.png",
  "/Hamko.png",
  "/manifest.json",
  "/version.json",
];

// 1. Installation - Bypass HTTP disk cache when pre-caching core shell & activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((assetUrl) =>
          fetch(new Request(assetUrl, { cache: "reload" }))
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(assetUrl, res);
              }
            })
            .catch((err) => {
              console.warn("[SW] Pre-cache non-critical notice:", assetUrl, err);
            }),
        ),
      );
    }),
  );
});

// 2. Activation - Claim active clients, purge ALL outdated caches, and notify clients
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
    ]).then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SW_ACTIVATED", cacheName: CACHE_NAME });
        });
      }),
    ),
  );
});

// 3. Fetch Event Strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;

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

  // Never serve cached service worker script or version manifest from cache when online
  if (url.pathname === "/sw.js" || url.pathname === "/version.json") {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match(req)),
    );
    return;
  }

  // Strategy A: HTML Documents, Page Navigations, and JS/CSS Bundles -> Strict NETWORK-FIRST (no-store)
  if (
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
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

  // Strategy B: Other local resources (images, icons, fonts) -> Network-First with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req)),
    );
  }
});

// 4. Message Listener - Skip waiting or purge caches on request
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    );
  }
});

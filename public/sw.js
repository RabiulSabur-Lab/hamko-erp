/**
 * Hamko ERP - Production Mobile & PWA Service Worker
 * Strict Network-First for HTML & Hashed Assets so new deployments take effect immediately
 */

const CACHE_NAME = "hamko-erp-cache-v12-20261125";

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

// 2. Activation - Claim active clients & purge all outdated caches immediately
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

  // Strategy A: HTML Documents, Page Navigations, and JS/CSS Bundles -> Strict NETWORK-FIRST
  if (
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    url.pathname.startsWith("/assets/")
  ) {
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

  // Strategy B: Other local resources (images, icons, fonts) -> Network-First with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
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
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

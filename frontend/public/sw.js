const CACHE_NAME = "dhm-factory-cache-v3";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/dhm-logo.jpg", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations (SPA); network-only passthrough for cross-origin/API GETs.
// Cache-first for same-origin static assets. Non-GET requests are never intercepted.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isCrossOrigin = url.origin !== self.location.origin;
  const isApiPath = url.pathname.startsWith("/api");
  const isNavigation = req.mode === "navigate";

  // Don't interfere with cross-origin or API requests; let the browser handle them.
  if (isCrossOrigin || isApiPath) return;

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy)).catch(() => null);
          }
          return res;
        })
        .catch(async () => {
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          return new Response("Offline", { status: 503, statusText: "Offline", headers: { "Content-Type": "text/plain" } });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
          }
          return res;
        })
        .catch(() => cached || Response.error());
    })
  );
});
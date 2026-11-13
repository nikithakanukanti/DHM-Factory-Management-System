const CACHE_NAME = "dhm-factory-cache-v2";
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

// Network-first for navigation and API requests; cache-first for same-origin static assets.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api") || url.origin !== self.location.origin;
  const isNavigation = req.mode === "navigate";

  if (isApi || isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isNavigation && res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy)).catch(() => null);
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
        }
        return res;
      }).catch(() => cached);
    })
  );
});
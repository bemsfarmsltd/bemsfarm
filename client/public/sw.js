const CACHE_NAME = "bemsfarms-storefront-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for storefront GET requests; never intercept /api or /admin
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/admin")) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match("/index.html")),
    );
  }
});

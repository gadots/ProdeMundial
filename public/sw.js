const CACHE = "prode-v4";
const PRECACHE = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Allow the client to trigger skipWaiting (used by the update banner)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Only intercept same-origin requests — never cache cross-origin API calls
  // (Supabase REST/realtime calls are cross-origin and must always hit the network)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first with 3s timeout, then fall back to cache
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
          const res = await fetch(req, { signal: controller.signal });
          clearTimeout(timeout);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        } catch {
          clearTimeout(timeout);
          const cached = await caches.match(req);
          return cached || await caches.match("/") || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Same-origin static assets: cache-first with network fallback
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

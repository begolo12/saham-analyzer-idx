/**
 * Service Worker untuk Saham Analyzer IDX
 *
 * Strategy:
 * - Cache-first untuk static assets (icons, JS, CSS) — cepat & offline
 * - Network-first untuk API calls — selalu dapat data terbaru
 * - Stale-while-revalidate untuk halaman HTML — cepat & fresh
 *
 * Install: register dari client-side component.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `saham-static-${CACHE_VERSION}`;
const PAGES_CACHE = `saham-pages-${CACHE_VERSION}`;
const API_CACHE = `saham-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/offline",
];

// ============ Install ============
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some static assets failed to cache:", err);
      });
    }),
  );
  self.skipWaiting();
});

// ============ Activate ============
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== STATIC_CACHE &&
              name !== PAGES_CACHE &&
              name !== API_CACHE
            );
          })
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// ============ Fetch ============
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin (e.g. Yahoo Finance, Google News) — let browser handle
  if (url.origin !== self.location.origin) return;

  // API calls — network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets — cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages — stale-while-revalidate
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }
});

// ============ Strategies ============

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Fallback to offline page if HTML
    if (request.headers.get("accept")?.includes("text/html")) {
      const offline = await caches.match("/offline");
      if (offline) return offline;
    }
    throw err;
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Cache for max 5 minutes for APIs
      cache.put(request, response.clone());
      // Auto-clean old entries (best-effort)
      cleanupCache(cacheName);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function cleanupCache(cacheName) {
  // Don't grow unbounded. Cap at 50 entries.
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > 50) {
      const toDelete = keys.length - 50;
      for (let i = 0; i < toDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // ignore
  }
}

// ============ Background Sync (placeholder) ============
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-watchlist") {
    // Future: sync watchlist to cloud
  }
});

// ============ Push Notifications (placeholder) ============
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Saham Analyzer", {
        body: data.body || "",
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: data.url || "/",
      }),
    );
  } catch (err) {
    console.warn("[SW] Push payload parse error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/";
  event.waitUntil(clients.openWindow(url));
});

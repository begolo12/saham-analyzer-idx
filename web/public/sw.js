/**
 * Service Worker untuk Saham Analyzer IDX
 *
 * Strategy:
 * - Cache-first untuk static assets (icons, JS, CSS) — cepat & offline
 * - Network-first untuk API calls — selalu dapat data terbaru
 * - Stale-while-revalidate untuk halaman HTML — cepat & fresh
 *
 * Features:
 * - Offline fallback to /offline page
 * - SKIP_WAITING message for instant updates
 * - Background sync preparation
 * - Precache critical assets on install
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `saham-static-${CACHE_VERSION}`;
const PAGES_CACHE = `saham-pages-${CACHE_VERSION}`;
const API_CACHE = `saham-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/offline",
];

// Max entries for API cache to prevent unbounded growth
const API_CACHE_MAX_ENTRIES = 80;
const PAGES_CACHE_MAX_ENTRIES = 30;

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

// ============ SKIP_WAITING for instant updates ============
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  // HTML pages — stale-while-revalidate with offline fallback
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
      cache.put(request, response.clone());
      // Auto-clean old entries
      cleanupCache(cacheName, API_CACHE_MAX_ENTRIES);
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
        // Auto-clean old entries
        cleanupCache(cacheName, PAGES_CACHE_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => {
      // If fetch fails and no cache, return offline page
      if (!cached) {
        return caches.match("/offline");
      }
      return cached;
    });
  return cached || fetchPromise;
}

async function cleanupCache(cacheName, maxEntries = 50) {
  // Don't grow unbounded. Cap at maxEntries.
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const toDelete = keys.length - maxEntries;
      for (let i = 0; i < toDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // ignore
  }
}

// ============ Background Sync ============
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-watchlist") {
    event.waitUntil(syncWatchlist());
  }
  if (event.tag === "sync-portfolio") {
    event.waitUntil(syncPortfolio());
  }
});

async function syncWatchlist() {
  // Future: read pending watchlist changes from IndexedDB and POST to server
  console.log("[SW] Background sync: watchlist");
}

async function syncPortfolio() {
  // Future: read pending portfolio transactions from IndexedDB and POST to server
  console.log("[SW] Background sync: portfolio");
}

// ============ Push Notifications ============
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
        tag: data.tag || "default",
        renotify: data.renotify || false,
        actions: data.actions || [],
      }),
    );
  } catch (err) {
    console.warn("[SW] Push payload parse error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    }),
  );
});

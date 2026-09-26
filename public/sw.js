/* BATT-X Service Worker
 * Caching strategy:
 *  - App shell (HTML pages) → Network first, fallback to cache
 *  - Static assets (JS/CSS/fonts/icons) → Cache first
 *  - API GETs → Network first, fallback to cached last-known data
 *  - All other requests → Network
 */

const VERSION = "battx-v1.0.1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;
const OFFLINE_URL = "/offline";

// Whitelist of API paths safe to cache. Anything not on this list
// (i.e. all authed/user-scoped endpoints) is fetched live and never
// written to the cache, so user A can never see user B's cached data.
const CACHEABLE_API = new Set([]);

const STATIC_ASSETS = [
  "/manifest.json",
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install: pre-cache the offline fallback and key static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error("[SW] Install failed:", err))
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: route requests to the right strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API → NEVER cache authed or user-scoped endpoints.
  //
  // The previous behavior was to network-first-cache-fallback every
  // /api/* response. That meant a logged-in user's response (e.g.
  // /api/devices, /api/alerts) could be served from cache to a *different*
  // user who later opened the same browser — a cross-user data leak.
  // Only an explicit allowlist of public, non-personal endpoints is cached.
  if (url.pathname.startsWith("/api/")) {
    if (CACHEABLE_API.has(url.pathname)) {
      event.respondWith(networkFirst(request, API_CACHE));
    } else {
      // Authed/user-scoped: go to network, do not touch the cache.
      event.respondWith(
        fetch(request).catch(
          () => new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
    }
    return;
  }

  // Static assets (images, fonts, JS, CSS) → cache first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|js|css|json|webmanifest)$/.test(
      url.pathname
    )
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages → network first, cache fallback, offline fallback last
  event.respondWith(networkFirstWithOffline(request, PAGES_CACHE));
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function networkFirstWithOffline(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response("Asset not available", { status: 404 });
  }
}

// Listen for messages from the app (skip waiting, cache clear, etc.)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// precache-manifest.js is generated post-build (scripts/generate-sw-precache.mjs)
// from the actual built output, so every route's exact JS/CSS chunks are
// known ahead of time instead of only getting cached after someone happens
// to visit that page online first. Missing at all only in local dev (no
// build step ran) — fall back to the old "just the offline page" install,
// same as before this existed, rather than a hard failure.
try {
  importScripts("/precache-manifest.js");
} catch {
  // ignored — see fallbacks below
}

const VERSION = self.__PRECACHE_VERSION || "v1";
const PRECACHE_PAGES = self.__PRECACHE_PAGES || [];
const PRECACHE_ASSETS = self.__PRECACHE_ASSETS || [];
const STATIC_CACHE = `mqi-static-${VERSION}`;
const PAGES_CACHE = `mqi-pages-${VERSION}`;
const API_CACHE = `mqi-api-${VERSION}`;
const CACHES = [STATIC_CACHE, PAGES_CACHE, API_CACHE];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest", ...PRECACHE_ASSETS]))
        .catch(() => {}),
      // Every known route, precached as of this build — not just whichever
      // pages someone happened to open online first — so a cold start (the
      // Android app relaunching after being killed, for instance) on a
      // scoring page nobody's visited yet on this device still works with
      // zero connectivity instead of hitting the offline fallback.
      caches
        .open(PAGES_CACHE)
        .then((cache) => cache.addAll(PRECACHE_PAGES))
        .catch(() => {}),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/tcf-logo.png" ||
    url.pathname === "/favicon.ico"
  );
}

// Cache-first: build assets are content-hashed and never change once built.
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// Network-first with cache fallback: prefer fresh data, fall back to the
// last-known-good copy when offline.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline and not cached");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // submissions are queued client-side, not intercepted here
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname === "/api/schools" || url.pathname === "/api/dashboard") {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGES_CACHE).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
    );
  }
});

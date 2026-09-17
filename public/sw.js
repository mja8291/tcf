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

// A minimal, dependency-free fallback baked directly into this script —
// the true last resort when even OFFLINE_URL itself isn't cached (install
// never got a chance to run, or failed outright). No fetch, no cache
// lookup, nothing that can itself fail — this is what stands between the
// surveyor and Chrome's own bare "This site can't be reached" page, which
// carries none of the app's own reassurance that in-progress work is safe.
const INLINE_FALLBACK_HTML = `<!doctype html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Offline — TCF MQI Survey</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;
justify-content:center;padding:24px;background:#f1f4ee;color:#1b241d;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center}
h1{font-size:20px;margin:0 0 8px;color:#123d24}p{font-size:14px;color:#4b5c50;max-width:320px;
line-height:1.5;margin:0 0 20px}button{appearance:none;border:none;border-radius:12px;
padding:13px 22px;font-size:14px;font-weight:600;background:#0e5c4d;color:#fff;cursor:pointer}
</style></head><body><h1>You're offline</h1>
<p>This page couldn't load with no connection right now. Any survey already open in another tab
keeps working and saving as normal.</p>
<button onclick="location.reload()">Try again</button></body></html>`;

function inlineFallbackResponse() {
  return new Response(INLINE_FALLBACK_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

// cache.addAll() is atomic — one failed request (a single flaky asset on a
// weak connection, entirely plausible mid-install on a real phone) throws
// away the *entire* batch, not just that one URL, leaving nothing cached
// at all — not even OFFLINE_URL. Confirmed live: a real device on a weak
// connection hit exactly this, and with nothing cached at all, the
// `catch(() => {})` below used to silently swallow it, so the very first
// offline navigation had nothing to fall back to but Chrome's own bare
// error page. Settling each request independently means one bad asset
// only costs that one asset.
async function cacheAllSettled(cache, urls) {
  await Promise.allSettled(urls.map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      // OFFLINE_URL first, on its own, *awaited* before anything else
      // starts — the one thing that must not be allowed to get caught up
      // in a larger batch's failure (see cacheAllSettled) or lose a race
      // for bandwidth against everything else (see below): it's small,
      // it's the fallback everything else here exists to protect, and it
      // needs to be secured within the first moment of install, not
      // whenever its turn happens to come up in a big parallel batch.
      await cacheAllSettled(staticCache, [OFFLINE_URL]);

      // Pages and static assets fire as ONE combined parallel batch, not
      // sequential stages — install used to fully finish all ~29 static
      // assets before even starting the 16 pages, and install itself runs
      // fully in the background, unrelated to the app's own UI already
      // being interactive (registering and installing costs nothing
      // blocking — see PwaBootstrap). On a weak connection, "open the app,
      // see it load, immediately go offline" was a completely realistic
      // sequence for a real surveyor — confirmed happening on a real
      // device — and staging things sequentially meant the pages (the
      // part that actually decides whether a later offline *navigation*
      // succeeds, not just whether some asset is cached) might never even
      // start downloading before connectivity dropped. Firing everything
      // together gives pages the same head start as static assets instead
      // of queuing behind them.
      const pagesCache = await caches.open(PAGES_CACHE);
      await Promise.allSettled([
        ...["/manifest.webmanifest", ...PRECACHE_ASSETS].map((url) => staticCache.add(url)),
        ...PRECACHE_PAGES.map((url) => pagesCache.add(url)),
      ]);
    })()
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
      networkFirst(request, PAGES_CACHE).catch(async () => (await caches.match(OFFLINE_URL)) || inlineFallbackResponse())
    );
  }
});

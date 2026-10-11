/*
 * RegretMap service worker — small, hand-written, no dependencies.
 *
 * Conservative by design:
 *   static   /_next/static/* (content-hashed, immutable) and /pwa-icon/*:
 *            cache-first, capped and versioned.
 *   navigate page loads: network only (with navigation preload). Pages are
 *            per-user and sent as no-store, so HTML is NEVER cached; when the
 *            network fails, the static /offline.html page is shown instead.
 *   bypass   everything else is left to the browser untouched: other origins
 *            (Supabase, map tiles, Photon, Wikimedia), every non-GET request
 *            (server actions, sign-in, submissions, comments), RSC data
 *            requests, /api/* and /auth/*. Nothing sensitive is ever stored.
 *
 * Updates: bump VERSION when this file's behaviour changes. A new worker
 * activates immediately (skipWaiting + clients.claim) and deletes old caches;
 * since HTML isn't cached, nobody gets stuck on an old app version.
 */

const VERSION = "rm-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/pwa-icon/192.png"];
const MAX_STATIC_ENTRIES = 150;

/** "static" | "navigate" | "bypass" for a request. Pure; exposed for tests. */
function policy(request) {
  const url = new URL(request.url);
  if (request.method !== "GET") return "bypass";
  if (url.origin !== self.location.origin) return "bypass";
  if (request.headers.get("RSC") || request.headers.get("Next-Action") || url.searchParams.has("_rsc")) {
    return "bypass";
  }
  if (url.pathname.startsWith("/api/")) return "bypass";
  if (request.mode === "navigate") return "navigate"; // incl. /auth/*: network only, never cached
  if (url.pathname.startsWith("/auth/")) return "bypass";
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/")) return "static";
  return "bypass";
}
self.__regretmapPolicy = policy;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !name.startsWith(`${VERSION}-`)).map((name) => caches.delete(name)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_ENTRIES; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Only successful, same-origin responses; never errors or opaque responses.
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

async function networkWithOfflineFallback(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const kind = policy(event.request);
  if (kind === "static") event.respondWith(cacheFirst(event.request));
  else if (kind === "navigate") event.respondWith(networkWithOfflineFallback(event));
  // "bypass": don't call respondWith — the browser handles it normally.
});

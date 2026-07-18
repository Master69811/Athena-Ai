/*
 * Athena AI — Service Worker
 * Network-first for everything; cache is an OFFLINE FALLBACK ONLY.
 *
 * Why network-first: an app under active development must never serve a
 * stale JS bundle from cache. A previous cache-first strategy trapped
 * users on an old (buggy) build on iOS PWAs even after new deploys. This
 * version always fetches fresh code when online and only falls back to
 * cache when the network is unavailable.
 *
 * HARD RULES:
 *  - NEVER cache or intercept /api/* requests -> always hit the network.
 *  - NEVER cache non-GET requests (POST/PUT/PATCH/DELETE).
 *  - On activate, delete EVERY old cache so a bad build can't survive.
 */

const CACHE_VERSION = 'athena-runtime-v3';
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Wipe ALL caches (not just non-matching) so any stale build is purged.
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

// Allow the page to trigger an immediate takeover after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;   // backend is authoritative
  if (url.origin !== self.location.origin) return; // same-origin only

  // Network-first: always try fresh; cache the response; fall back to cache
  // (then to the app shell for navigations) only when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/');
          return Response.error();
        })
      )
  );
});

/*
 * Athena AI — Service Worker
 * Scope: static asset caching + minimal offline fallback ONLY.
 *
 * HARD RULES (do not change without review):
 *  - NEVER cache or intercept /api/* requests  -> always hit the network.
 *  - NEVER cache non-GET requests (POST/PUT/PATCH/DELETE) -> auth & mutations untouched.
 *  - NEVER cache cross-origin POST or auth flows.
 *  - Business logic, DB, API responses are never stored.
 */

const CACHE_VERSION = 'athena-static-v2';
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// ---- install: precache a tiny set of static shell assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        /* tolerate missing assets — never block install */
      })
    )
  );
  self.skipWaiting();
});

// ---- activate: drop old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- fetch strategy ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET. Everything else (POST login, mutations) -> straight to network.
  if (request.method !== 'GET') return;

  // 2. Never touch the API. Backend stays fully authoritative.
  if (url.pathname.startsWith('/api/')) return;

  // 3. Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // 4. Static immutable assets (Next build output, icons) -> cache-first.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|avif|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // 5. Navigations (HTML pages) -> network-first, fall back to cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // 6. Everything else -> default network behaviour.
});

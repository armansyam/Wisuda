const CACHE_NAME = 'amsdev-pwa-v3';

// Esensial static assets untuk di-cache awal
const PRECACHE_URLS = [
  '/',
  '/tracking.html',
  '/freelance-portal.html',
  '/select-photos.html',
  '/css/tailwind.min.css',
  '/favicon.png',
  '/manifest.json',
  '/manifest-freelance.json',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.15.x/dist/cdn.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => console.warn('PWA Precache warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — Stale-While-Revalidate untuk static asset, Network-Only untuk /api/
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Requests -> Network-Only (data realtime selalu segar dari server)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Jaringan terputus. Periksa koneksi internet Anda.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 2. Static Assets & Web Pages -> Stale-While-Revalidate (Load Instan 0.1 detik)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise || fetch(event.request);
    })
  );
});

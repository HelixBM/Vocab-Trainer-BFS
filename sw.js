// Auto-generate cache version from timestamp to force updates on every deployment
const CACHE_NAME = 'vocab-bfp1-' + new Date().toISOString().split('T')[0];
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// UPDATED FETCH EVENT
self.addEventListener('fetch', event => {
  // Only handle GET requests (skip POSTs, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Always fetch the newest version from the network in the background
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update the cache with the fresh response
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
        // Network failed (user is offline), just silently fail the background fetch
        console.log('Offline: using cached version for', event.request.url);
      });

      // 2. Return the cached response immediately if we have it. 
      // If we don't have it in cache, wait for the network fetch to finish.
      return cachedResponse || fetchPromise;
    })
  );
});

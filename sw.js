// Raise this version every time you upload a new version of the app.
const CACHE_NAME = 'vocab-v12';
const ASSETS = [
  './',
  './index.html',
  './db.js',
  './answers.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
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

// Pages, scripts and data: network first, so students get updates on the first visit.
// Icons: cache first. Offline, everything comes from the cache.
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  const networkFirst = req.mode === 'navigate' || /\.(html|js|json)$/.test(url.pathname);
  event.respondWith(networkFirst
    ? fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    : caches.match(req).then(cached => cached || fetch(req))
  );
});

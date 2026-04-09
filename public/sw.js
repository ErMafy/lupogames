const CACHE_NAME = 'lupo-games-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy: always try network, fall back to cache for static assets only
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only cache static assets (images, fonts, CSS, JS bundles)
  const isStatic = /\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/i.test(url.pathname)
    || url.pathname.startsWith('/_next/static/');

  if (isStatic) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

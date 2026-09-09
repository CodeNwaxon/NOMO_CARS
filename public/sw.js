self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache static assets, let everything else go to the network
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js)$/);

  if (event.request.method === 'GET' && isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open('nomo-cars-static-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // All other requests (API calls, HTML pages, etc.) go straight to network — no interception
});

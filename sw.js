const CACHE_NAME = '3d-tour-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/tour-data.json',
  '/contact-config.json',
  '/contact-integration.js',
  '/temerlogo.png',
  '/auth-manager.js',
  '/firebase-service.js',
  '/availability-manager.js'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        // Continue even if some assets fail
        return Promise.resolve();
      });
    }).then(() => {
      return self.skipWaiting();
    }).catch(err => {
      // Don't fail installation due to cache errors
      return Promise.resolve();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // For API calls (contact form), use network-first
  if (url.pathname.includes('api') || request.headers.get('Accept')?.includes('application/json')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For same-origin requests, use cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache, fetch and cache if successful
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(err => {
              // Ignore cache errors (e.g., disk full)
            });
          });
          return response;
        });
      }).catch(() => {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
    return;
  }

  // For Firebase CDN requests, use cache-first
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // For third-party resources (CDN, etc.), use cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((response) => {
        // Don't cache third-party responses that aren't OK
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});
// Handle messages from clients
self.addEventListener('message', (event) => {

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_SYNC_STATUS') {
    self.getSyncQueue().then((queue) => {
      event.ports[0].postMessage({
        type: 'SYNC_STATUS',
        queueLength: queue.length
      });
    });
  }

  // Handle Firebase offline queue status
  if (event.data && event.data.type === 'GET_FIREBASE_QUEUE_STATUS') {
    const queueLength = (event.data.queue || []).length;
    event.ports[0].postMessage({
      type: 'FIREBASE_QUEUE_STATUS',
      queueLength: queueLength
    });
  }
});

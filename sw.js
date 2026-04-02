const CACHE_NAME = '3d-tour-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/tour-data.json',
  '/contact-config.json',
  // Core JavaScript files
  '/availability-system.js',
  '/availability-manager.js',
  '/firebase-service.js',
  '/auth-manager.js',
  '/contact-integration.js',
  '/sw.js',
  // Assets
  '/temerlogo.png'
];

// Model and project assets - cache these too
const MODEL_ASSETS = [
  '/model/building.glb'
];

const PROJECT_ASSETS = [
  // These will be cached dynamically when loaded
];

// Install event - cache core assets and model
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache core assets first
      return cache.addAll(ASSETS).then(() => {
        // Then try to cache model (might be large, so separate)
        return cache.addAll(MODEL_ASSETS).catch(err => {
          // Model caching is optional - continue even if it fails
          console.log('[SW] Model caching skipped (will cache on first load):', err);
          return Promise.resolve();
        });
      }).catch(err => {
        // Continue even if some assets fail
        console.log('[SW] Some assets failed to cache:', err);
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

// Fetch event - cache-first strategy for all requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // For navigation requests (HTML pages), use cache-first with network fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Try to fetch from network
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Offline fallback - serve index.html for navigation
          return caches.match('/index.html');
        });
      })
    );
    return;
  }

  // For all other requests (JS, CSS, images, data), use cache-first
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
          cache.put(request, responseToCache).catch(() => {
            // Ignore cache errors
          });
        });
        return response;
      }).catch(() => {
        // Offline fallback for JS/CSS files
        if (request.destination === 'script' || request.destination === 'style') {
          return caches.match(request);
        }
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

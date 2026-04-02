/**
 * Service Worker for 3D Tour PWA - Full Offline Support
 * Clean implementation with proper lifecycle management
 */

const CACHE_NAME = '3d-tour-v5';
const CACHE_VERSION = '20240402-v2';

// Core assets to cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/firebase-service.js',
  '/availability-system.js',
  '/availability-manager.js',
  '/auth-manager.js',
  '/contact-integration.js',
  '/tour-data.json',
  '/availability-data.json',
  '/contact-config.json'
];

// Media file extensions
const MEDIA_EXTENSIONS = ['.glb', '.gltf', '.hdr', '.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp4', '.webm', '.gif'];

// Track cached media for cleanup
let cachedMediaUrls = new Set();

// ============ INSTALL EVENT ============
self.addEventListener('install', (event) => {
  console.log('[SW] Install - caching core assets...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching', CORE_ASSETS.length, 'core assets');
        return cache.addAll(CORE_ASSETS.map(url => 
          fetch(url, { cache: 'reload' })
            .then(response => {
              if (!response.ok) throw new Error(`Failed: ${url}`);
              return response;
            })
            .catch(err => {
              console.warn('[SW] Core asset failed:', url);
              // Return empty response to not block install
              return new Response('', { status: 200 });
            })
        ));
      })
      .then(() => {
        console.log('[SW] Core assets cached - taking control');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install error:', err);
        return self.skipWaiting();
      })
  );
});

// ============ ACTIVATE EVENT ============
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - cleaning old caches');
  event.waitUntil(
    caches.keys()
      .then(names => names.filter(n => n !== CACHE_NAME))
      .then(oldNames => {
        console.log('[SW] Deleting', oldNames.length, 'old caches');
        return Promise.all(oldNames.map(n => caches.delete(n)));
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients that SW is ready
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_READY',
              status: 'Service worker activated and ready'
            });
          });
        });
      })
  );
});

// ============ MESSAGE HANDLER ============
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting().then(() => self.clients.claim());
      break;

    case 'CACHE_MEDIA':
      console.log('[SW] Cache media:', data.urls?.length, 'files');
      if (!data.urls || data.urls.length === 0) return;
      event.waitUntil(cacheMediaFiles(data.urls, data.currentMediaUrls));
      break;

    case 'CLEANUP_MEDIA':
      event.waitUntil(cleanupOldMedia(data.currentMediaUrls));
      break;

    case 'GET_CACHE_STATUS':
      event.waitUntil(
        getCacheStatus().then(status => {
          if (event.ports[0]) {
            event.ports[0].postMessage(status);
          }
        })
      );
      break;
  }
});

// ============ MEDIA CACHING ============
async function cacheMediaFiles(urls, currentMediaUrls) {
  console.log('[SW] cacheMediaFiles called with', urls?.length, 'urls');
  
  if (!urls || urls.length === 0) {
    console.log('[SW] No URLs provided');
    notifyComplete(0, 0, [], 'No media to cache');
    return;
  }

  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
  } catch (err) {
    console.error('[SW] Failed to open cache:', err);
    notifyError('Cache open failed', 0, 0);
    return;
  }

  const uniqueUrls = [...new Set(urls)].filter(u => u && u.length > 5);
  const total = uniqueUrls.length;

  console.log('[SW] Caching', total, 'media files');

  // Check quota
  try {
    const estimate = await navigator.storage.estimate();
    const remaining = estimate.quota - estimate.usage;
    const needed = total * 2 * 1024 * 1024; // ~2MB per file estimate

    if (needed > remaining) {
      console.warn('[SW] Low quota:', remaining, 'needed:', needed);
      notifyError('Insufficient storage', remaining, needed);
      return;
    }
  } catch (e) {
    console.log('[SW] Quota check skipped:', e.message);
  }

  let cached = 0;
  let failed = 0;
  const failedUrls = [];

  // Track for cleanup
  cachedMediaUrls = new Set([...cachedMediaUrls, ...uniqueUrls]);

  // Cache in batches
  const batchSize = 10;
  try {
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      console.log('[SW] Processing batch', Math.floor(i/batchSize)+1, ':', batch.length, 'files');

      await Promise.all(batch.map(async url => {
        try {
          // Validate with HEAD first
          const head = await fetch(url, { method: 'HEAD' });
          if (!head.ok) throw new Error(`HEAD ${head.status}`);

          // Fetch and cache
          const response = await fetch(url);
          if (!response.ok) throw new Error(`GET ${response.status}`);

          await cache.put(url, response);
          cached++;
          console.log('[SW] Cached:', url, '(', cached+'/'+total, ')');
        } catch (err) {
          console.log('[SW] Failed:', url, err.message);
          failed++;
          failedUrls.push(url);
        }
      }));

      // Progress update
      console.log('[SW] Batch complete, notifying progress:', cached, '/', total);
      notifyProgress(cached, total, failed);
    }
  } catch (err) {
    console.error('[SW] Fatal error in caching loop:', err);
  }

  console.log('[SW] Media caching done:', cached, '/', total);
  notifyComplete(cached, total, failedUrls, failed > 0 ? `Ready (${failed} failed)` : 'Ready for offline!');
}

// ============ MEDIA CLEANUP ============
async function cleanupOldMedia(currentUrls) {
  if (!currentUrls) return;
  
  const cache = await caches.open(CACHE_NAME);
  const currentSet = new Set(currentUrls);
  const keys = await cache.keys();
  let removed = 0;

  for (const key of keys) {
    if (isMediaUrl(key.url) && !currentSet.has(key.url)) {
      await cache.delete(key);
      cachedMediaUrls.delete(key.url);
      removed++;
    }
  }

  console.log('[SW] Cleaned up', removed, 'old media files');
  
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({
      type: 'MEDIA_CLEANUP_COMPLETE',
      removed
    }));
  });
}

// ============ FETCH HANDLER ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Only handle GET requests for same-origin or known domains
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // Cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // Return cached, update in background
          fetchAndCache(request).catch(() => {});
          return cached;
        }
        
        // Not cached, fetch and cache
        return fetchAndCache(request);
      })
      .catch(() => {
        // Offline fallback
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  
  // Cache successful responses
  if (response.ok && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  
  return response;
}

// ============ HELPERS ============
function isMediaUrl(url) {
  return MEDIA_EXTENSIONS.some(ext => url.toLowerCase().includes(ext));
}

function notifyProgress(cached, total, failed) {
  const msg = {
    type: 'MEDIA_CACHING_PROGRESS',
    percent: Math.round((cached / total) * 100),
    cached,
    total,
    failed,
    status: `Caching: ${cached}/${total}`
  };
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage(msg));
  });
}

function notifyComplete(cached, total, failedUrls, status) {
  const msg = {
    type: 'MEDIA_CACHING_COMPLETE',
    percent: 100,
    cached,
    total,
    failed: total - cached,
    failedUrls: failedUrls.slice(0, 10),
    status
  };
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage(msg));
  });
}

function notifyError(error, remaining, needed) {
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({
      type: 'MEDIA_CACHING_ERROR',
      error,
      remaining,
      needed
    }));
  });
}

async function getCacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let size = 0;
  
  for (const key of keys) {
    const res = await cache.match(key);
    if (res) {
      const blob = await res.blob();
      size += blob.size;
    }
  }

  let quota = {};
  try {
    const est = await navigator.storage.estimate();
    quota = {
      quota: est.quota,
      usage: est.usage,
      percentUsed: Math.round((est.usage / est.quota) * 100)
    };
  } catch (e) {}

  return {
    cachedCount: keys.length,
    totalSize: size,
    mediaCount: cachedMediaUrls.size,
    ...quota
  };
}

console.log('[SW] Service worker loaded');

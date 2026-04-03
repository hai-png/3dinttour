/*
 * Service Worker - Offline PWA Support
 * Cache-first strategy: serve from cache, fallback to network
 */

const CACHE_NAME = 'tour-v6';
const OFFLINE_PAGE = '/offline.html';

// Core files to pre-cache (small files only - model cached at runtime)
const CORE_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/availability-system.js',
  '/contact-integration.js',
  '/firebase-service.js',
  '/availability-manager.js',
  '/auth-manager.js',
  '/tour-data.json',
  // Draco decoder (needed for model loading)
  '/draco/draco_decoder.js',
  '/draco/draco_decoder.wasm',
];

// Install: pre-cache core files
self.addEventListener('install', (e) => {
  console.log('[SW] Installing');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Install warning:', err.message))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating');
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first, fallback to network
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and non-http(s)
  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Skip Firebase/Firestore requests
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) return;

  // Special handling for model files (use IndexedDB)
  if (url.pathname.includes('/model/') && url.pathname.endsWith('.glb')) {
    e.respondWith(
      caches.match(e.request)
        .then((cached) => {
          if (cached) return cached;
          // Try IndexedDB
          return getModelFromIndexedDB(url.href).then(blob => {
            if (blob) {
              console.log('[SW] Serving model from IndexedDB:', url.pathname);
              return new Response(blob, { headers: { 'Content-Type': 'model/gltf-binary' }});
            }
            // Fetch from network
            return fetch(e.request).then(resp => {
              if (resp.ok) {
                // Cache in IndexedDB for offline
                const clone = resp.clone();
                cacheModelBlob(url.href, clone.blob());
              }
              return resp;
            });
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request)
      .then((cached) => {
        if (cached) {
          console.log('[SW] Serving from cache:', url.pathname || url.href);
          return cached;
        }

        return fetch(e.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;

            // Cache ALL successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache).catch((err) => {
                console.warn('[SW] Cache put failed for:', url.pathname || url.href, err.message);
              });
            }).catch((err) => {
              console.warn('[SW] Cache open failed:', err.message);
            });
            
            return response;
          })
          .catch((fetchErr) => {
            console.warn('[SW] Fetch failed, trying cache:', url.pathname || url.href);
            // Offline: serve from cache or fallback
            if (e.request.mode === 'navigate' ||
                e.request.headers.get('accept')?.includes('text/html')) {
              return caches.match(OFFLINE_PAGE);
            }
            // For all other requests
            return caches.match(e.request)
              .then((cached) => {
                if (cached) {
                  console.log('[SW] Serving from cache (offline):', url.pathname || url.href);
                  return cached;
                }
                return new Response('', { status: 404, statusText: 'Not Found (Offline)' });
              });
          });
      })
  );
});

// IndexedDB helpers for model files
function getModelFromIndexedDB(url) {
  return openModelDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction('models', 'readonly');
      const req = tx.objectStore('models').get(url);
      req.onsuccess = () => {
        resolve(req.result ? req.result.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  }).catch(() => null);
}

function cacheModelBlob(url, blobPromise) {
  blobPromise.then(blob => {
    openModelDB().then(db => {
      const tx = db.transaction('models', 'readwrite');
      tx.objectStore('models').put({ url, blob, cached: Date.now() });
    });
  }).catch(() => {});
}

// Message handler: force cache everything
self.addEventListener('message', (e) => {
  if (e.data === 'CACHE_EVERYTHING') {
    console.log('[SW] Caching all tour assets...');
    
    // Cache Three.js CDN modules (small files via Cache API)
    const cdnAssets = [
      'https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/controls/OrbitControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/DRACOLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/RGBELoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/objects/Sky.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/meshopt_decoder.module.js',
      '/hdr/cobblestone_street_night_1k.hdr',
    ];
    
    // Cache CDN assets via Cache API
    caches.open(CACHE_NAME).then((cache) => {
      let cached = 0;
      const total = cdnAssets.length + 1; // +1 for model
      
      const cacheOne = (urls) => {
        if (urls.length === 0) {
          // Now cache model via IndexedDB
          cacheModelViaIndexedDB('/model/building.glb').then(() => {
            cached++;
            console.log(`[SW] Cached model via IndexedDB (${cached}/${total})`);
            console.log(`[SW] Cached ${cached}/${total} assets - offline ready!`);
            notifyOfflineReady();
          }).catch(err => {
            console.warn('[SW] Model cache failed:', err.message);
            console.log(`[SW] Cached ${cached}/${total} assets (model skipped) - partial offline`);
            notifyOfflineReady(true);
          });
          return;
        }
        
        const url = urls.shift();
        fetch(url).then(resp => {
          if (resp.status === 200) {
            return cache.put(url, resp).then(() => {
              cached++;
              console.log(`[SW] Cached (${cached}/${total}):`, url.split('/').pop());
              cacheOne(urls);
            });
          } else {
            console.warn('[SW] Failed to fetch:', url);
            cacheOne(urls);
          }
        }).catch(err => {
          console.warn('[SW] Fetch error:', url, err.message);
          cacheOne(urls);
        });
      };
      
      cacheOne(cdnAssets);
    }).catch((err) => {
      console.warn('[SW] Cache failed:', err.message);
      notifyOfflineReady(true);
    });
  }
  
  // Force skip waiting
  if (e.data === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating now');
    self.skipWaiting();
  }
});

// IndexedDB for large model files
function openModelDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tour-models', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cacheModelViaIndexedDB(url) {
  return fetch(url).then(resp => {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.blob().then(blob => {
      return openModelDB().then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction('models', 'readwrite');
          tx.objectStore('models').put({ url, blob, cached: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      });
    });
  });
}

function notifyOfflineReady(partial = false) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'OFFLINE_READY', partial });
    });
  });
}

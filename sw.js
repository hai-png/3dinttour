/*
 * Service Worker - Offline PWA Support
 * Cache-first strategy: serve from cache, fallback to network
 */

const CACHE_VERSION = 'v10';
const CACHE_NAME = `tour-${CACHE_VERSION}`;
const OFFLINE_PAGE = './offline.html';

// Configuration
const CONFIG = {
  // Maximum file size to cache (30MB) - files larger than this will be skipped
  MAX_CACHE_SIZE: 30 * 1024 * 1024,
  // Use IndexedDB for files larger than 5MB
  INDEXEDDB_THRESHOLD: 5 * 1024 * 1024,
};

// Core files to pre-cache (small files only - model cached at runtime)
const CORE_FILES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './brand-config.json',
  './project/Hosea-LOGO-12.png',
  './availability-system.js',
  './contact-integration.js',
  './firebase-service.js',
  './availability-manager.js',
  './auth-manager.js',
  './tour-data.json',
  // Draco decoder (needed for model loading)
  './draco/draco_decoder.js',
  './draco/draco_decoder.wasm',
];

// Install: pre-cache core files
self.addEventListener('install', (e) => {
  console.log('[SW] Installing');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Try to cache all files, but don't fail if some are missing
        const promises = CORE_FILES.map(url => {
          return fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
            console.warn('[SW] Could not cache:', url);
          }).catch(err => {
            console.warn('[SW] Failed to cache:', url, err.message);
          });
        });
        return Promise.all(promises);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
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

// Fetch: Use different strategies based on resource type
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and non-http(s)
  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Skip Firebase/Firestore requests
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) return;

  // Strategy 1: .glb model files (use IndexedDB + Cache API)
  if (url.pathname.endsWith('.glb')) {
    e.respondWith(handleModelRequest(e.request, url));
    return;
  }

  // Strategy 2: HTML pages (network-first with cache fallback for fresh content)
  if (e.request.headers.get('accept')?.includes('text/html') ||
      e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, clone).catch(err =>
                console.warn('[SW] HTML cache put failed:', err.message)
              );
            });
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => {
          if (cached) {
            console.log('[SW] Serving HTML from cache (offline):', url.pathname);
            return cached;
          }
          // Try alternate cache keys (pre-cached with relative URLs)
          return caches.match('./').then(c => {
            if (c) return c;
            return caches.match('./index.html').then(c2 => {
              if (c2) return c2;
              return caches.match(OFFLINE_PAGE);
            });
          });
        }))
    );
    return;
  }

  // Strategy 3: Images, videos, fonts (cache-first, fallback to network)
  if (e.request.destination === 'image' || 
      e.request.destination === 'video' ||
      e.request.destination === 'font' ||
      url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|woff2?|ttf|eot)$/i)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(e.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, clone).catch(err => 
                console.warn('[SW] Media cache put failed:', err.message)
              );
            });
          }
          return response;
        }).catch(() => {
          console.warn('[SW] Media fetch failed, offline:', url.pathname);
          return new Response('', { status: 404, statusText: 'Not Found (Offline)' });
        });
      })
    );
    return;
  }

  // Strategy 4: JS/CSS files (cache-first, version-based invalidation)
  if (e.request.destination === 'script' || 
      e.request.destination === 'style' ||
      url.pathname.match(/\.(js|css)$/i)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) {
          console.log('[SW] Serving JS/CSS from cache:', url.pathname);
          return cached;
        }
        return fetch(e.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, clone).catch(err => 
                console.warn('[SW] Script cache put failed:', err.message)
              );
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 5: CDN assets (cache-first with long TTL)
  if (url.hostname.includes('cdn') || url.hostname.includes('jsdelivr')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, clone).catch(err => 
                console.warn('[SW] CDN cache put failed:', err.message)
              );
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: Cache-first for all other requests
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

            // Cache successful responses
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

// Helper: Handle model file requests with IndexedDB + Cache API
function handleModelRequest(request, url) {
  return caches.match(request)
    .then((cached) => {
      if (cached) {
        console.log('[SW] Serving model from cache:', url.pathname);
        return cached;
      }
      // Try IndexedDB
      return getModelFromIndexedDB(url.href).then(blob => {
        if (blob) {
          console.log('[SW] Serving model from IndexedDB:', url.pathname);
          return new Response(blob, { headers: { 'Content-Type': 'model/gltf-binary' }});
        }
        // Fetch from network
        return fetch(request).then(resp => {
          if (!resp.ok) {
            console.error('[SW] Model fetch failed:', url.pathname, resp.status);
            return resp;
          }
          // Clone before using response body
          const cacheClone = resp.clone();
          const dbClone = resp.clone();

          // Store in IndexedDB
          cacheModelBlob(url.href, dbClone.blob());

          // Store in Cache API
          caches.open(CACHE_NAME).then(cache => cache.put(request, cacheClone))
            .catch(err => console.warn('[SW] Cache put failed:', url.pathname, err.message));

          return resp;
        }).catch(err => {
          console.error('[SW] Model fetch failed:', url.pathname, err.message);
          return new Response('', { status: 404, statusText: 'Model not available offline' });
        });
      });
    });
}

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
  // Verify origin for security
  if (e.origin !== self.location.origin && e.origin !== '') {
    console.warn('[SW] Ignoring message from unauthorized origin:', e.origin);
    return;
  }

  if (e.data === 'CACHE_EVERYTHING') {
    console.log('[SW] Caching all tour assets...');

    // Priority 1: Local media files (MUST be cached first - requested immediately by page)
    const priorityLocal = [
      // Model files (critical - requested on page load)
      './model/building.glb',
      './3d-floor-plan/1-bed-01.glb',
      './3d-floor-plan/2-bed-01.glb',
      './3d-floor-plan/3d-bed-01.glb',
    ];

    // Priority 2: Project media (requested shortly after)
    const projectMedia = [
      // Hero & gallery
      './project/hero-image-video/mainsowreel.mp4',
      './project/gallery/mainsowreel.mp4',
      // Gallery images
      './project/gallery/120.webp',
      './project/gallery/125.webp',
      './project/gallery/213.webp',
      './project/gallery/218.webp',
      './project/gallery/image17.webp',
      './project/gallery/image21.webp',
      './project/gallery/photo_6003679379009422639_y.webp',
      './project/gallery/Scene 34.webp',
      './project/gallery/Scene 36.webp',
      './project/gallery/Scene-27_1-enhanced.webp',
      // Floor plans & amenities
      './project/floor-plans/seken-Floorplan.jpg',
      './project/amenities/swimming-pool-amenity.webp',
      // Logos
      './project/temerlogo.png',
      // Hotspot media
      './project/hotspots/ev_charging/ev_charging.mp4',
      './project/hotspots/green_terrace/green_terrace.mp4',
      './project/hotspots/green_terrace/swimming-pool-amenity.webp',
    ];

    // Priority 3: Unit videos (requested when user opens unit details)
    const unitVideos = [
      './unit-image-video/3-bed-05/mainsowreel.mp4',
      './unit-image-video/3-bed-06/mainsowreel.mp4',
      './unit-image-video/3-bed-04/mainsowreel.mp4',
      './unit-image-video/1-bed-01/mainsowreel.mp4',
      './unit-image-video/3-bed-01/mainsowreel.mp4',
      './unit-image-video/3-bed-02/mainsowreel.mp4',
      './unit-image-video/2-bed-01/mainsowreel.mp4',
      './unit-image-video/3-bed-03/mainsowreel.mp4',
    ];

    // Priority 4: Panorama images (requested when user opens panorama view)
    const panoramaImages = [
      './panorama/1-bed-01.webp',
      './panorama/2-bed-01.webp',
      './panorama/3-bed-01.webp',
      './panorama/3-bed-02.webp',
      './panorama/3-bed-03.webp',
      './panorama/3-bed-04.webp',
      './panorama/3-bed-05.webp',
      './panorama/3-bed-06.webp',
    ];

    // Priority 5: 2D floor plan
    const floorPlan2D = [
      './2d-floor-plan/type2.webp',
    ];

    // Priority 6: Unit images (cached along with unit videos)
    const unitImages = [
      // 1-bed-01
      './unit-image-video/1-bed-01/1.webp',
      './unit-image-video/1-bed-01/4.webp',
      './unit-image-video/1-bed-01/Jambo - Marketing-0.webp',
      // 2-bed-01
      './unit-image-video/2-bed-01/ SALON.webp',
      './unit-image-video/2-bed-01/FF FAMILY ROOM DINING & OPEN KITCHEN 2.webp',
      './unit-image-video/2-bed-01/Scene 70.webp',
      // 3-bed-01
      './unit-image-video/3-bed-01/212.webp',
      './unit-image-video/3-bed-01/Scene 67.webp',
      './unit-image-video/3-bed-01/GF-OPEN KITCHEN 1.webp',
      // 3-bed-02
      './unit-image-video/3-bed-02/216.webp',
      './unit-image-video/3-bed-02/ Marketing-02.webp',
      './unit-image-video/3-bed-02/Jambo - Marketing-2.webp',
      // 3-bed-03
      './unit-image-video/3-bed-03/Scene 77.webp',
      './unit-image-video/3-bed-03/Scene 73.webp',
      // 3-bed-04
      './unit-image-video/3-bed-04/GF-DINING ROOM 2.webp',
      './unit-image-video/3-bed-04/D5_Image_20240321_163403.webp',
      './unit-image-video/3-bed-04/218.webp',
      // 3-bed-05
      './unit-image-video/3-bed-05/213.webp',
      './unit-image-video/3-bed-05/214.webp',
      // 3-bed-06
      './unit-image-video/3-bed-06/17.webp',
      './unit-image-video/3-bed-06/Scene 68.webp',
      './unit-image-video/3-bed-06/211.webp',
    ];

    // Priority 7: CDN assets (already cached from previous visits usually)
    const cdnAssets = [
      'https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/controls/OrbitControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/DRACOLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/RGBELoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/objects/Sky.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/meshopt_decoder.module.js',
    ];

    // Cache in priority order with yield points
    const allAssets = [...priorityLocal, ...projectMedia, ...unitVideos, ...panoramaImages, ...floorPlan2D, ...unitImages, ...cdnAssets];
    const totalKnown = allAssets.length;

    // Helper to send progress to page
    function sendProgress(cached, label) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_PROGRESS', cached, total: totalKnown, label });
        });
      });
    }

    caches.open(CACHE_NAME).then((cache) => {
      let cached = 0;
      let failed = 0;
      let skipped = 0;

      // Cache files sequentially with yield points to avoid blocking other requests
      const cacheOne = (urls) => {
        if (urls.length === 0) {
          console.log(`[SW] Pre-cached ${cached}/${totalKnown} known assets (${failed} failed, ${skipped} skipped)`);
          // All done - send final OFFLINE_READY
          sendProgress(cached, `✓ ${cached} assets cached`);
          notifyOfflineReady();
          return;
        }

        const url = urls.shift();

        // Add timeout to fetch (60 seconds for large model files)
        const controller = new AbortController();
        const isModelOrHdr = url.endsWith('.glb') || url.endsWith('.hdr');
        const timeoutMs = isModelOrHdr ? 60000 : 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        fetch(url, { signal: controller.signal }).then(resp => {
          clearTimeout(timeoutId);

          if (resp.ok) {
            // Skip caching partial responses (206 Range requests, e.g. videos)
            const isPartial = resp.status === 206;

            // Check file size - skip large files to avoid memory issues
            const contentLength = resp.headers.get('content-length');
            const fileSize = contentLength ? parseInt(contentLength) : 0;
            const isLargeFile = fileSize > CONFIG.MAX_CACHE_SIZE;

            if (isLargeFile) {
              console.log(`[SW] Skipping large file cache (${(fileSize / 1024 / 1024).toFixed(1)}MB):`, url.split('/').pop());
              skipped++;
              sendProgress(cached, `Skipped (large): ${url.split('/').pop()}`);
              cacheOne(urls);
              return;
            }

            // For files above threshold, also store in IndexedDB
            if (fileSize > CONFIG.INDEXEDDB_THRESHOLD || isModelOrHdr) {
              const dbClone = resp.clone();
              dbClone.blob().then(blob => {
                cacheModelBlob(url, Promise.resolve(blob));
              }).catch(err => {
                console.warn('[SW] IndexedDB store failed:', url, err.message);
              });
            }

            // Only cache if not a partial response
            if (!isPartial) {
              const cacheClone = resp.clone();
              return cache.put(url, cacheClone).then(() => {
                cached++;
                const fileName = url.split('/').pop();
                const label = `Caching ${cached}/${totalKnown}: ${fileName}`;
                if (cached <= priorityLocal.length) {
                  console.log(`[SW] ⚡ Priority cached (${cached}/${totalKnown}):`, fileName);
                } else {
                  console.log(`[SW] Cached (${cached}/${totalKnown}):`, fileName);
                }
                sendProgress(cached, label);

                // Yield after every 5 assets to allow other fetches
                if (cached % 5 === 0) {
                  setTimeout(() => cacheOne(urls), 100);
                } else {
                  cacheOne(urls);
                }
              }).catch(err => {
                // Cache.put failed - still count it
                console.warn('[SW] Cache put failed for:', url, err.message);
                failed++;
                sendProgress(cached, `Cache error: ${url.split('/').pop()}`);
                cacheOne(urls);
              });
            } else {
              // Partial response - still count as cached, just skip Cache API
              cached++;
              const fileName = url.split('/').pop();
              const label = `Caching ${cached}/${totalKnown}: ${fileName} (partial)`;
              sendProgress(cached, label);
              cacheOne(urls);
            }
          } else {
            console.warn('[SW] Failed to fetch:', url, resp.status);
            failed++;
            sendProgress(cached, `Failed: ${url.split('/').pop()}`);
            cacheOne(urls);
          }
        }).catch(err => {
          clearTimeout(timeoutId);
          console.warn('[SW] Fetch error:', url, err.message);
          failed++;
          sendProgress(cached, `Error: ${url.split('/').pop()}`);
          cacheOne(urls);
        });
      };

      // Start with priority files
      cacheOne(allAssets);
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
  // Check storage usage and warn if approaching quota
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(estimate => {
      const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(2);
      console.log(`[SW] Storage usage: ${usagePercent}% (${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB)`);
      
      if (usagePercent > 80) {
        console.warn('[SW] ⚠️ Storage usage above 80%! Consider reducing cached assets.');
      }
    }).catch(err => {
      console.warn('[SW] Could not estimate storage:', err);
    });
  }

  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'OFFLINE_READY', partial });
    });
  });
}

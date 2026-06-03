/*
 * Service Worker - Offline PWA Support
 *
 * Caching Strategy (industry standard for static hosting like GitHub Pages):
 * - Pre-cache: Core app shell (HTML, CSS, JS, manifest, icons) during install
 * - Runtime cache: Media assets cached on-demand via CACHE_EVERYTHING message
 * - Strategy by type:
 *   • HTML/Navigation: Network-first → Cache → Offline fallback
 *   • JS/CSS: Cache-first → Network (version-based invalidation via CACHE_VERSION)
 *   • Images/Video/Fonts: Cache-first → Network (stale-while-revalidate)
 *   • .glb/.hdr models: Cache API → IndexedDB → Network (large file support)
 *   • CDN assets: Cache-first with no revalidation (immutable)
 *
 * GitHub Pages considerations:
 * - GitHub Pages serves files with Cache-Control headers (typically 10min default)
 * - SW bypasses HTTP cache via Cache API, so version-based cache keys are essential
 * - Cache version must be bumped when any asset changes to ensure fresh content
 * - No server-side control over headers, so SW handles all caching logic
 */

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[SW]', ...args); }
function warn(...args) { console.warn('[SW]', ...args); }
function error(...args) { console.error('[SW]', ...args); }

const CACHE_VERSION = 'v13';
const CACHE_NAME = `tour-${CACHE_VERSION}`;
const OFFLINE_PAGE = './offline.html';

// Configuration
const CONFIG = {
  MAX_CACHE_SIZE: 30 * 1024 * 1024,       // 30MB - skip files larger than this
  INDEXEDDB_THRESHOLD: 5 * 1024 * 1024,   // 5MB - use IndexedDB for files above this
  CACHE_TTL_CDN: 7 * 24 * 60 * 60 * 1000, // 7 days for CDN assets
};

// Core app shell files (pre-cached during install — brand-agnostic, always exist)
const CORE_FILES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json?v=2',
  './brand-config.json',
  './tour-data.json',
  './availability-system.js',
  './contact-integration.js',
  './firebase-config.js',
  // Draco decoder (required for model loading)
  './draco/draco_decoder.js',
  './draco/draco_decoder.wasm',
];

// Install: pre-cache core app shell files
self.addEventListener('install', (e) => {
  log('Installing, cache version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use addAll for atomic caching - either all succeed or none
        // This prevents partial app shell installation
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        log('Core files pre-cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed - core files missing:', err.message);
        // Don't activate with partial cache - let the old SW continue serving
        // The new SW will retry on next page load
      })
  );
});

// Activate: clean old caches, claim all clients
self.addEventListener('activate', (e) => {
  log('Activating, taking control of all clients');
  e.waitUntil(
    caches.keys()
      .then((names) => {
        // Delete all caches that don't match current version
        return Promise.all(
          names
            .filter((n) => n !== CACHE_NAME)
            .map((n) => {
              log('Deleting old cache:', n);
              return caches.delete(n);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: route requests to appropriate caching strategies
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and non-http(s) requests
  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Skip Firebase/Firestore and other third-party API requests
  const FIREBASE_HOSTS = [
    'firebaseio.com', 'firebasestorage.googleapis.com',
    'firebaseapp.com', 'firebase.google.com',
    'securetoken.googleapis.com', 'www.googleapis.com',
    'identitytoolkit.googleapis.com'
  ];
  if (FIREBASE_HOSTS.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) return;

  // Strategy 1: .glb/.hdr model files (IndexedDB + Cache API)
  if (url.pathname.match(/\.(glb|hdr)$/i)) {
    e.respondWith(handleModelRequest(e.request, url));
    return;
  }

  // Strategy 2: HTML pages (network-first with cache fallback)
  if (e.request.mode === 'navigate' ||
      (e.request.headers.get('accept')?.includes('text/html') && !e.request.headers.get('sec-fetch-dest'))) {
    e.respondWith(handleNavigationRequest(e.request, url));
    return;
  }

  // Strategy 3: Images (stale-while-revalidate - serve cached, update in background)
  if (e.request.destination === 'image' ||
      url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i)) {
    e.respondWith(handleImageRequest(e.request, url));
    return;
  }

  // Strategy 4: Videos (cache-first, no background refresh - large files)
  if (e.request.destination === 'video' ||
      url.pathname.match(/\.(mp4|webm|ogg|mov)$/i)) {
    e.respondWith(handleVideoRequest(e.request, url));
    return;
  }

  // Strategy 5: Fonts (cache-first, long-lived)
  if (e.request.destination === 'font' ||
      url.pathname.match(/\.(woff2?|ttf|eot|otf)$/i)) {
    e.respondWith(handleFontRequest(e.request, url));
    return;
  }

  // Strategy 6: JS/CSS (cache-first with version-based invalidation)
  if (e.request.destination === 'script' ||
      e.request.destination === 'style' ||
      url.pathname.match(/\.(js|css)$/i)) {
    e.respondWith(handleScriptRequest(e.request, url));
    return;
  }

  // Strategy 7: CDN assets (cache-first, immutable)
  if (url.hostname.includes('cdn') || url.hostname.includes('jsdelivr') ||
      url.hostname.includes('unpkg') || url.hostname.includes('googleapis')) {
    e.respondWith(handleCdnRequest(e.request, url));
    return;
  }

  // Default: cache-first with network fallback
  e.respondWith(handleDefaultRequest(e.request, url));
});

// ─── Strategy: Navigation (network-first → cache → offline page) ───
function handleNavigationRequest(request, url) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('HTML cache put failed:', err.message)
          );
        });
      }
      return response;
    })
    .catch(() => caches.match(request).then(cached => {
      if (cached) return cached;
      // Try alternate cache keys
      return caches.match('./').then(c => {
        if (c) return c;
        return caches.match('./index.html').then(c2 => {
          if (c2) return c2;
          return caches.match(OFFLINE_PAGE);
        });
      });
    }));
}

// ─── Strategy: Images (stale-while-revalidate) ───
function handleImageRequest(request, url) {
  return caches.match(request).then(cached => {
    const networkFetch = fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('Image cache put failed:', err.message)
          );
        });
      }
      return response;
    }).catch(() => null); // Silently fail network fetch

    // Serve cached version immediately, update cache in background
    if (cached) {
      networkFetch.catch(() => {}); // Prevent unhandled rejection
      return cached;
    }

    // No cache yet - wait for network
    return networkFetch.then(response => {
      if (response) return response;
      return new Response('', { status: 404, statusText: 'Not Found (Offline)' });
    });
  });
}

// ─── Strategy: Videos (cache-first, handle range requests) ───
function handleVideoRequest(request, url) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      // Don't cache partial (206) range responses
      if (response.status === 206) return response;
      if (!response.ok) return response;

      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, clone).catch(err =>
          warn('Video cache put failed:', err.message)
        );
      });
      return response;
    }).catch(() => {
      return new Response('', { status: 404, statusText: 'Not Found (Offline)' });
    });
  });
}

// ─── Strategy: Fonts (cache-first, long-lived) ───
function handleFontRequest(request, url) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('Font cache put failed:', err.message)
          );
        });
      }
      return response;
    }).catch(() => {
      return new Response('', { status: 404, statusText: 'Font not available (Offline)' });
    });
  });
}

// ─── Strategy: JS/CSS (cache-first) ───
function handleScriptRequest(request, url) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('Script cache put failed:', err.message)
          );
        });
      }
      return response;
    });
  });
}

// ─── Strategy: CDN assets (cache-first, immutable) ───
function handleCdnRequest(request, url) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('CDN cache put failed:', err.message)
          );
        });
      }
      return response;
    }).catch(() => {
      return new Response('', { status: 404, statusText: 'CDN resource unavailable (Offline)' });
    });
  });
}

// ─── Strategy: Default (cache-first → network → 404) ───
function handleDefaultRequest(request, url) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clone).catch(err =>
            warn('Cache put failed:', err.message)
          );
        });
      }
      return response;
    }).catch(() => {
      return new Response('', { status: 404, statusText: 'Not Found (Offline)' });
    });
  });
}

// Helper: Handle model file requests with IndexedDB + Cache API
function handleModelRequest(request, url) {
  return caches.match(request)
    .then((cached) => {
      if (cached) {
        log('Serving model from cache:', url.pathname);
        return cached;
      }
      // Try IndexedDB
      return getModelFromIndexedDB(url.href).then(blob => {
        if (blob) {
          log('Serving model from IndexedDB:', url.pathname);
          return new Response(blob, { headers: { 'Content-Type': 'model/gltf-binary' }});
        }
        // Fetch from network
        return fetch(request).then(resp => {
          if (!resp.ok) {
            error('Model fetch failed:', url.pathname, resp.status);
            return resp;
          }
          // Clone before using response body
          const cacheClone = resp.clone();
          const dbClone = resp.clone();

          // Store in IndexedDB
          cacheModelBlob(url.href, dbClone.blob());

          // Store in Cache API
          caches.open(CACHE_NAME).then(cache => cache.put(request, cacheClone))
            .catch(err => warn('Cache put failed:', url.pathname, err.message));

          return resp;
        }).catch(err => {
          error('Model fetch failed:', url.pathname, err.message);
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

// Validate URLs before caching to prevent malformed or malicious entries
function isValidCacheUrl(url) {
  try {
    const u = new URL(url, self.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

// Message handler: force cache everything
self.addEventListener('message', (e) => {
  // Verify origin for security
  if (e.origin !== self.location.origin && e.origin !== '') {
    warn('Ignoring message from unauthorized origin:', e.origin);
    return;
  }

  if (e.data === 'CACHE_EVERYTHING') {
    log('Caching all tour assets...');

    // SECURITY: These CDN URLs should have their integrity verified.
    // If the CDN is compromised, cached assets could be tampered with.
    // Consider using importmap with integrity attributes when supported.
    const cdnAssets = [
      'https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/controls/OrbitControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/DRACOLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/RGBELoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/objects/Sky.js',
      'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/meshopt_decoder.module.js',
    ];

    // Fetch sw-manifest.json (generated at build time by scanning media folders)
    // This replaces the old hardcoded file lists — each brand gets its own manifest
    fetch('./sw-manifest.json')
      .then(r => {
        if (!r.ok) throw new Error('No manifest');
        return r.json();
      })
      .then(manifest => {
        const rawUrls = manifest.files ? manifest.files.map(f => f.url) : [];
        // Validate URLs before caching to prevent malformed or malicious entries
        const mediaUrls = rawUrls.filter(isValidCacheUrl);
        if (mediaUrls.length !== rawUrls.length) {
          warn(`Filtered ${rawUrls.length - mediaUrls.length} invalid URLs from manifest`);
        }
        log(`Loaded sw-manifest.json: ${mediaUrls.length} files`);

        const allAssets = [...mediaUrls, ...cdnAssets];
        startCaching(allAssets, cdnAssets.length);
      })
      .catch(err => {
        warn('No sw-manifest.json found, using minimal fallback');
        // Minimal fallback: just CDN + core media paths (no individual files)
        const fallback = [
          './model/building.glb',
          './project/logo.png',
          ...cdnAssets,
        ];
        startCaching(fallback, cdnAssets.length);
      });
  }

  // Force skip waiting
  if (e.data === 'SKIP_WAITING') {
    log('Skipping waiting, activating now');
    self.skipWaiting();
  }
});

// Shared caching engine (used by both manifest and fallback)
function startCaching(allAssets, cdnCount) {
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
        log(`Cached ${cached}/${totalKnown} assets (${failed} failed, ${skipped} skipped)`);
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

      // Explicit redirect:'follow' (default) — we rely on fetch following redirects
      // but the AbortController provides a timeout guard against hung connections
      fetch(url, { mode: 'cors', redirect: 'follow', signal: controller.signal }).then(resp => {
        clearTimeout(timeoutId);

        if (resp.ok) {
          const isPartial = resp.status === 206;
          const contentLength = resp.headers.get('content-length');
          const fileSize = contentLength ? parseInt(contentLength) : 0;
          const isLargeFile = fileSize > CONFIG.MAX_CACHE_SIZE;

          if (isLargeFile) {
            log(`Skipping large file cache (${(fileSize / 1024 / 1024).toFixed(1)}MB):`, url.split('/').pop());
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
              warn('IndexedDB store failed:', url, err.message);
            });
          }

          // Only cache if not a partial response
          if (!isPartial) {
            const cacheClone = resp.clone();
            return cache.put(url, cacheClone).then(() => {
              cached++;
              const fileName = url.split('/').pop();
              const label = `Caching ${cached}/${totalKnown}: ${fileName}`;
              if (cached <= totalKnown - cdnCount) {
                log(`⚡ Cached (${cached}/${totalKnown}):`, fileName);
              } else {
                log(`CDN cached (${cached}/${totalKnown}):`, fileName);
              }
              sendProgress(cached, label);

              // Yield after every 5 assets to allow other fetches
              if (cached % 5 === 0) {
                setTimeout(() => cacheOne(urls), 100);
              } else {
                cacheOne(urls);
              }
            }).catch(err => {
              warn('Cache put failed for:', url, err.message);
              failed++;
              sendProgress(cached, `Cache error: ${url.split('/').pop()}`);
              cacheOne(urls);
            });
          } else {
            cached++;
            const fileName = url.split('/').pop();
            const label = `Caching ${cached}/${totalKnown}: ${fileName} (partial)`;
            sendProgress(cached, label);
            cacheOne(urls);
          }
        } else {
          warn('Failed to fetch:', url, resp.status);
          failed++;
          sendProgress(cached, `Failed: ${url.split('/').pop()}`);
          cacheOne(urls);
        }
      }).catch(err => {
        clearTimeout(timeoutId);
        warn('Fetch error:', url, err.message);
        failed++;
        sendProgress(cached, `Error: ${url.split('/').pop()}`);
        cacheOne(urls);
      });
    };

    // Start caching in priority order (manifest already sorted by priority)
    cacheOne(allAssets);
  }).catch((err) => {
    warn('Cache failed:', err.message);
    notifyOfflineReady(true);
  });
}

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
      log(`Storage usage: ${usagePercent}% (${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB)`);
      
      if (usagePercent > 80) {
        warn('⚠️ Storage usage above 80%! Consider reducing cached assets.');
      }
    }).catch(err => {
      warn('Could not estimate storage:', err);
    });
  }

  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'OFFLINE_READY', partial });
    });
  });
}

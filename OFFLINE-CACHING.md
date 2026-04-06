# Offline Caching System

## How It Works

### Three-Tier Caching Strategy

1. **Install Time** (Core files cached immediately)
   - HTML pages, manifest, config files
   - JavaScript modules
   - Draco decoder
   - Logo/icon files

2. **Runtime Priority Caching** (CACHE_EVERYTHING triggered on page load)
   - **Priority 1** (cached FIRST): Model files (.glb) and HDR environment files
   - **Priority 2**: Project media (hero videos, gallery, hotspot videos)
   - **Priority 3**: Unit videos (cached when user opens unit details)
   - **Priority 4**: Three.js CDN libraries

3. **Dynamic Directory Scanning**
   - After known files are cached, scans media directories for additional files
   - Caches all found .glb, .hdr, .jpg, .png, .webp, .svg, .mp4, .webm files

### Race Condition Prevention

The page waits 500ms before loading the 3D model if the service worker is active. This gives the SW time to cache priority files (models, HDRIs) before they're requested, ensuring they're available for offline mode.

### Storage Strategy

| File Type | Storage Method | Reason |
|-----------|---------------|--------|
| HTML/JS/CSS | Cache API | Small files, fast access |
| Images | Cache API | Medium size, well-supported |
| Videos (.mp4/.webm) | Cache API | Large but manageable |
| Models (.glb) | IndexedDB + Cache API | Very large (10MB+), IndexedDB handles blobs better |
| HDR files | IndexedDB + Cache API | Large binary files |

## Testing Offline Mode

### Step 1: First Load (Online)
1. Open the app while online: `http://localhost:8000`
2. Wait for the 3D model to fully load
3. Wait ~10-30 seconds for CACHE_EVERYTHING to complete
4. Check browser console for `[SW] Cached (...)` messages
5. Look for the offline-ready notification

### Step 2: Go Offline
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. OR disable network adapter
4. Refresh the page

### Step 3: Verify
- ✅ 3D building model should load
- ✅ HDRI environment should work
- ✅ Gallery images should display
- ✅ Unit videos should play
- ✅ Hotspot media should load
- ❌ Firebase/auth features won't work (expected)

### Common Issues

**Model not loading offline:**
- Make sure you waited for the model to load fully while online
- Check console for `[SW] Serving model from IndexedDB` messages
- Clear site data and retry: DevTools → Application → Clear storage

**Videos not caching:**
- Large videos may take time to cache
- Check console for cache progress messages
- Some servers don't support directory listing (falls back to known file list)

**Service worker not installing:**
- Must use HTTPS or localhost
- Check console for registration errors
- Try clearing service workers: DevTools → Application → Service Workers → Unregister

## Cache Invalidation

The cache version is defined in `sw.js`:
```js
const CACHE_NAME = 'tour-v6';
```

To force a full cache refresh:
1. Change the cache version (e.g., `tour-v7`)
2. Reload the page
3. Old caches are automatically deleted during SW activation

## Manual Cache Clear

In browser console:
```js
// Clear all caches
caches.keys().then(names => names.forEach(n => caches.delete(n)));

// Clear IndexedDB models
indexedDB.deleteDatabase('tour-models');

// Unregister service worker
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));

// Reload
location.reload();
```

## Deployment Notes

- **HTTPS Required** for PWA features on production
- **Server must support directory listing** OR all files must be in the known file lists
- **Large files** (models, HDRs) use IndexedDB which has higher storage limits
- **First visit** must be online to cache everything
- **Subsequent visits** work fully offline

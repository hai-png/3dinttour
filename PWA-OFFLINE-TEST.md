# Testing PWA Offline - 3D Model Loading

## What Was Fixed (v6)

### Problem
- **26MB model file too large** for `cache.addAll()` during service worker install — it times out
- **Install prompt not showing** on localhost

### Solution (tour-v6)
✅ **Removed model from pre-cache** — now cached at runtime when tour loads
✅ **Sequential caching** — files cached one-by-one to handle large files
✅ **Better logging** — see exactly what's cached and when
✅ **Install prompt fixed** — better localhost handling + manual instructions

---

## How It Works Now

**When you load the app ONLINE:**
1. Service worker registers + caches small files (JS, icons, Draco)
2. Tour loads → model fetched from server
3. **Runtime caching** automatically caches model + HDR as they load
4. After 3 seconds → `CACHE_EVERYTHING` caches Three.js CDN modules
5. Green **"✓ Ready for offline use"** notification appears
6. **App is now fully ready for offline!**

**When you go OFFLINE:**
- Everything loads from cache (model, Three.js, Draco, HDR)
- No network needed

---

## How to Test

### Step 1: Clear Old Cache (Critical!)
```javascript
// In browser console (F12)
navigator.serviceWorker.getRegistrations().then(r => r.forEach(s => s.unregister()));
caches.keys().then(n => n.forEach(c => caches.delete(c)));
location.reload();
```

### Step 2: Start Server & Load App (ONLINE)
```bash
npx http-server -p 8080 -c-1 --cors
```
Open `http://localhost:8080`

### Step 3: Watch Console Output
You should see:
```
[SW] Installing
[SW] Activating
[PWA] Registered
[PWA] Triggered asset caching
[SW] Caching all tour assets...
[SW] Cached (1/9): three.module.js
[SW] Cached (2/9): OrbitControls.js
...
[SW] Cached (8/9): building.glb
[SW] Cached (9/9): cobblestone_street_night_1k.hdr
[SW] Cached 9/9 assets - offline ready!
[PWA] Offline ready notification shown
```

### Step 4: Verify Cache
DevTools → **Application** → **Cache Storage** → `tour-v6`

Should include:
- ✅ `/model/building.glb` (26MB)
- ✅ `/hdr/cobblestone_street_night_1k.hdr`
- ✅ `/draco/draco_decoder.js` + `.wasm`
- ✅ All `cdn.jsdelivr.net` Three.js files

### Step 5: Test Offline

**Option A: Stop Server (Best Test)**
1. Stop `http-server` (Ctrl+C)
2. Refresh page
3. **Expected**: App + 3D model load perfectly

**Option B: DevTools Offline**
1. DevTools → **Network** → Select **"Offline"**
2. Refresh page
3. **Expected**: App + 3D model load

**Option C: Installed PWA**
1. Install app (see below)
2. Stop server / go offline
3. Open installed app
4. **Expected**: 3D model loads

---

## Install Prompt

### On Localhost
The install button may not auto-show on localhost. Click it to see instructions:
- **Chrome**: Address bar → install icon (⊕)
- **DevTools**: Application → Manifest → "Add to Home Screen"
- **Menu**: ⋮ → "Install 3D Tour"

### On HTTPS (Production)
Install prompt should appear automatically after a few seconds.

### Manual Install (Any)
```javascript
// Force install prompt
navigator.serviceWorker.ready.then(reg => {
  reg.installing.postMessage('CACHE_EVERYTHING');
});
```

---

## Troubleshooting

### Model Still Doesn't Load Offline

**Check 1: Was it cached?**
```javascript
// In console
caches.open('tour-v6').then(cache => {
  cache.keys().then(reqs => {
    const urls = reqs.map(r => r.url);
    console.log('Has model:', urls.some(u => u.includes('building.glb')));
    console.log('Has HDR:', urls.some(u => u.includes('.hdr')));
    console.log('Has Three.js:', urls.some(u => u.includes('three')));
  });
});
```

**Check 2: Service worker active?**
- DevTools → **Application** → **Service Workers**
- Should show `sw.js` as **"Activated and is running"**

**Check 3: Console errors**
- Look for `[SW] Cache put failed` or `[SW] Fetch error`
- Large files may fail due to browser cache size limits

**Check 4: Browser cache quota**
- Chrome has ~6% of disk space for cache
- Check: DevTools → **Application** → **Storage** → **Cache Storage** size

### Install Prompt Not Showing
- **Localhost**: Chrome may not show auto-prompt. Use DevTools → Application → Manifest → "Add to Home Screen"
- **HTTPS required** for production installs
- Check console for `[PWA]` logs showing eligibility

### Cache Not Updating
```javascript
// Nuclear option - clear everything
caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister())));
location.reload();
```

---

## Files Changed
- `sw.js` - v6: sequential caching, better logging, model cached at runtime
- `index.html` - offline notification, install prompt improvements
- `draco/` - Draco decoder files for offline use

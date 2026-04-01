# Mobile & PWA Guide

## Overview
This is a **Progressive Web App (PWA)** that works on all mobile devices. No app store installation needed!

### Features
- ✅ **Works offline** after first visit (service worker caching)
- ✅ **Install to home screen** (like a native app)
- ✅ **Full-screen mode** (no browser UI)
- ✅ **Touch gestures** (swipe, pinch, tap)
- ✅ **Responsive design** (phones, tablets, desktops)
- ✅ **Fast loading** (cached assets)
- ✅ **iOS & Android support** (Safari, Chrome, Edge)
- ✅ **App shortcuts** (quick access to Tour & Floor Plans)

---

## PWA Features

### Service Worker (v2)
- **Cache-first strategy** for assets
- **Network-first** for API calls
- **Offline fallback** for navigation
- **Automatic cache cleanup** (old versions removed)
- **Third-party CDN caching** for external resources

### Cached Assets
- `index.html` - Main application
- `manifest.json` - PWA configuration
- `tour-data.json` - Tour configuration
- `icon-*.png`, `icon.svg` - App icons
- `contact-config.json`, `contact-integration.js` - Contact form
- `temerlogo.png` - Logo

### App Shortcuts (Android Chrome)
Long-press the app icon to access:
- **View Tour** - Open 3D tour directly
- **Floor Plans** - Quick access to floor plans

---

## Quick Start - Test on Mobile

### Option 1: Local Server (Development)

1. **Start the server:**
   ```bash
   cd "/home/gh/Downloads/New folder"
   python3 -m http.server 8080
   ```

2. **Find your IP address:**
   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```
   You'll see something like `192.168.1.100`

3. **On your mobile device:**
   - Connect to the same WiFi network
   - Open browser: `http://YOUR_IP:8080`
   - Example: `http://192.168.1.100:8080`

### Option 2: Deploy to Web (Production)

Deploy to any static hosting:
- **GitHub Pages** (free)
- **Netlify** (free)
- **Vercel** (free)
- **Cloudflare Pages** (free)

Then share the URL with users.

---

## Install PWA on Mobile

### Android (Chrome)

1. Open the app in Chrome
2. You'll see an **"Install" toast** at the bottom
3. Tap **"Install"**
4. Or: Tap menu (⋮) → **"Install app"** or **"Add to Home screen"**
5. The app icon appears on your home screen
6. Tap to open - runs in full-screen mode!

### iPhone/iPad (Safari)

1. Open the app in Safari
2. You'll see an **"Install on iPhone" toast**
3. Tap the **Share button** (square with arrow)
4. Scroll down → **"Add to Home Screen"**
5. Tap **"Add"** in the top right
6. The app icon appears on your home screen

### Desktop (Chrome/Edge)

1. Open the app
2. Look for the **install icon** in the address bar
3. Or: Click the **"Install" toast** when it appears
4. App opens in its own window

---

## Mobile Gestures

| Gesture | Action |
|---------|--------|
| **Single Tap** | Select unit/hotspot |
| **Double Tap** | Reset camera view |
| **One-Finger Drag** | Rotate camera |
| **Two-Finger Pinch** | Zoom in/out |
| **Swipe (horizontal)** | Quick rotate left/right |
| **Swipe (vertical)** | Look up/down |
| **Volume Up/Down** | Zoom in/out (mobile only) |

---

## PWA Features

### Offline Support
- After first visit, the app caches all assets
- Works without internet connection
- Service worker handles caching automatically

### Home Screen Icon
- Uses `icon-192.png` and `icon-512.png`
- Adapts to device theme (light/dark)

### Full-Screen Mode
- No browser address bar
- Immersive experience
- Status bar matches app theme

### Fast Loading
- Cached assets load instantly
- No network delay on repeat visits

---

## Testing Checklist

### Visual Tests
- [ ] Layout looks good on your screen size
- [ ] Text is readable without zooming
- [ ] Buttons are easy to tap (44px+ targets)
- [ ] Modals fill the screen appropriately
- [ ] Notch/dynamic island doesn't cover content

### Gesture Tests
- [ ] Single tap selects units/hotspots
- [ ] Double tap resets the view
- [ ] One-finger drag rotates smoothly
- [ ] Pinch zoom works correctly
- [ ] Swipes rotate the camera
- [ ] Volume buttons zoom in/out

### PWA Tests
- [ ] Install toast appears
- [ ] App installs to home screen
- [ ] Works offline after first load
- [ ] Launches in full-screen mode
- [ ] Icon displays correctly

### Performance Tests
- [ ] 3D model loads without long delays
- [ ] Camera movement is smooth (60fps)
- [ ] Images/videos load progressively
- [ ] No memory issues after extended use

---

## Troubleshooting

### Install Toast Not Showing

**Android/Chrome:**
- Must be served over **HTTPS** (localhost is OK for testing)
- Clear browser cache: `chrome://serviceworker-internals/`
- Check console for errors

**iOS/Safari:**
- iOS shows custom instructions toast
- Manual install: Share → Add to Home Screen
- Must be served over HTTPS

### Can't Access Local Server from Mobile

- Ensure both devices are on the **same WiFi network**
- Check firewall settings (allow port 8080)
- Linux: `sudo ufw allow 8080/tcp`
- Try accessing from the same computer first

### App Not Working Offline

- Service worker may not be registered
- Check browser console for errors
- Visit the app at least once while online
- Clear cache and reload: `chrome://serviceworker-internals/`

### Gestures Not Working

- Clear browser cache
- Ensure you're not in desktop mode
- Try a different browser (Chrome recommended)
- Check if touch events are enabled in browser settings

### Build/Deploy Errors

```bash
# Clean and rebuild
rm -rf www/*
cp index.html manifest.json sw.js tour-data.json www/
cp -r model gallery panorama unit-image-video 2d-floor-plan 3d-floor-plan www/
```

---

## Deploy to GitHub Pages

1. **Enable GitHub Pages:**
   - Go to your repo Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` → `/www` folder
   - Save

2. **Your app will be live at:**
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

3. **Update after changes:**
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```

---

## Deploy to Netlify

1. **Drag & Drop:**
   - Go to [netlify.com](https://netlify.com)
   - Drag the `www` folder to the deploy area
   - Done!

2. **Or connect Git:**
   - Connect your GitHub repo
   - Build command: (leave empty)
   - Publish directory: `www`

---

## File Structure

```
project/
├── index.html          # Main app (with mobile styles + gestures)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── tour-data.json      # Tour configuration
├── icon-192.png        # PWA icon
├── icon-512.png        # PWA icon
├── www/                # Deploy this folder
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── tour-data.json
│   ├── model/
│   ├── gallery/
│   ├── panorama/
│   └── ...
└── MOBILE-GUIDE.md     # This file
```

---

## PWA Requirements Met

✅ **HTTPS** (or localhost for testing)
✅ **manifest.json** with required fields
✅ **Service Worker** registered
✅ **Icon** (192x192, 512x512)
✅ **start_url** in manifest
✅ **display: standalone**
✅ **Install prompt** implemented
✅ **Offline support** via service worker

---

## Quick Commands

```bash
# Start local server
python3 -m http.server 8080

# Or with Node.js
npx http-server www -p 8080

# Copy files to www folder
cp index.html manifest.json sw.js tour-data.json www/

# Test PWA installability
# Open Chrome DevTools → Application → Manifest
# Check for errors
```

---

## Resources

- [PWA Basics](https://web.dev/progressive-web-apps/)
- [Add to Home Screen](https://web.dev/add-to-home-screen/)
- [Service Workers](https://web.dev/service-workers/)
- [PWA Checklist](https://web.dev/pwa-checklist/)

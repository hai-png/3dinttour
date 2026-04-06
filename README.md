# 3D Virtual Tour - PWA

A progressive web application for exploring 3D apartment tours with offline support, built with Three.js and Firebase.

## Features

- 🏠 **3D Virtual Tours** - Interactive 3D models of apartments and buildings
- 📱 **PWA Support** - Install on home screen, works offline
- 🌐 **Offline-First** - Full functionality without internet after first visit
- 🔥 **Firebase Integration** - Real-time availability management
- 📊 **Availability System** - Track unit availability status
- 🎨 **Customizable Branding** - Easy brand configuration

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project (for availability features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd 3dinttour
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local server**
   ```bash
   npm run serve
   ```
   
   Or use any static file server:
   ```bash
   npx http-server -p 8080 -c-1
   ```

4. **Open in browser**
   ```
   http://localhost:8080
   ```

## Project Structure

```
3dinttour/
├── index.html                 # Main application
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker (offline support)
├── offline.html               # Offline fallback page
├── tour-data.json             # Tour configuration
├── brand-config.json          # Branding settings
├── model/
│   └── building.glb           # 3D building model
├── project/                   # Project media (images, videos)
├── draco/                     # Draco decoder for GLB
├── panorama/                  # 360° panorama images
├── unit-image-video/          # Unit-specific media
└── *.js                       # Availability, contact, Firebase modules
```

## PWA Features

### Offline Support

The app caches all assets on first visit:
- 3D models (via IndexedDB for large files)
- Images and videos
- JavaScript and CSS files
- Three.js CDN libraries

### Installation

**Desktop (Chrome/Edge):**
- Click the install icon (⊕) in the address bar
- Or: Menu (⋮) → "Install 3D Tour"

**Mobile (Android Chrome):**
- Menu (⋮) → "Install app" or "Add to Home screen"

**Mobile (iOS Safari):**
- Tap Share button → "Add to Home Screen"

### Offline Testing

1. Load the app while online
2. Wait for caching to complete (check console for `[SW] Cached` messages)
3. Go offline (DevTools → Network → Offline)
4. Refresh the page - everything should still work!

## Configuration

### Brand Configuration

Edit `brand-config.json` to customize:
- Company name and logo
- Theme colors
- Contact information
- Social media links

### Tour Data

Edit `tour-data.json` to configure:
- Unit types and availability
- Floor plans
- Gallery images
- Hotspot locations

## Deployment

### Firebase Hosting

```bash
npm run deploy
```

### GitHub Pages

Use the provided deployment script:
```bash
./scripts/deploy-github-pages.sh
```

### Manual Deployment

Upload all files to your HTTPS-enabled hosting provider.

**Required files:**
- `index.html`
- `manifest.json`
- `sw.js`
- `offline.html`
- `tour-data.json`
- All media directories (`model/`, `project/`, `draco/`, etc.)

## Service Worker Cache Strategy

The app uses different caching strategies based on resource type:

| Resource Type | Strategy | Storage |
|--------------|----------|---------|
| 3D Models (.glb) | IndexedDB + Cache API | Both |
| HTML Pages | Network-first, cache fallback | Cache API |
| Images/Videos | Cache-first | Cache API |
| JS/CSS Files | Cache-first | Cache API |
| CDN Libraries | Cache-first | Cache API |

### Cache Version

Current version: `tour-v7`

To force cache refresh, update the version in `sw.js`:
```javascript
const CACHE_VERSION = 'v8'; // Change this
```

## Availability System

The app includes a Firebase-based availability management system for tracking unit status.

### Features
- Real-time availability updates
- Offline queue for changes
- Admin authentication
- Visual status indicators

### Setup

1. Create a Firebase project
2. Enable Realtime Database
3. Update Firebase configuration in `firebase-service.js`
4. Deploy security rules from `firebase-rules.json`

## Development

### Local Development

```bash
# Start development server
npm run serve

# Clear cache and reload
# In browser console:
caches.keys().then(n => n.forEach(c => caches.delete(c)));
navigator.serviceWorker.getRegistrations().then(r => r.forEach(s => s.unregister()));
location.reload();
```

### Testing PWA

1. Open DevTools → Application tab
2. Check Manifest and Service Worker sections
3. Use Lighthouse for PWA audit
4. Test offline functionality

## Troubleshooting

### Model Not Loading
- Ensure `model/building.glb` exists (26MB)
- Check browser console for errors
- Clear cache and reload

### Offline Not Working
- Make sure you waited for full caching on first visit
- Check console for `[SW]` messages
- Verify service worker is active (DevTools → Application → Service Workers)

### Install Prompt Not Showing
- Requires HTTPS (or localhost for development)
- iOS Safari doesn't support `beforeinstallprompt` event
- Use manual install instructions provided in the app

## Browser Support

- ✅ Chrome 67+
- ✅ Firefox 64+
- ✅ Safari 11.1+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Android Chrome)

## Technologies

- **Three.js** - 3D rendering
- **GLTFLoader** - GLB model loading
- **DRACOLoader** - Compressed model decoding
- **Firebase** - Real-time database & hosting
- **Service Workers** - Offline support
- **IndexedDB** - Large file storage
- **Cache API** - Asset caching

## License

ISC - Hosea Real Estate

## Support

For issues or questions, please contact the development team.

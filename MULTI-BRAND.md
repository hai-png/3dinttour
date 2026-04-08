# Multi-Brand Hosting Guide

Host rebranded 3D property tour instances for multiple real estate developers from a single codebase.

## Architecture

```
/
├── index.html                 ← Brand portal landing page
├── brands.json                ← Registry of all brands
│
├── _shared/                   ← Source of truth (app code, never served directly)
│   ├── index.html             ← Main 3D tour app (brand-agnostic)
│   ├── sw.js                  ← Service worker
│   ├── availability-system.js
│   ├── contact-integration.js
│   ├── firebase-config.js
│   ├── offline.html
│   └── draco/                 ← Three.js decoder
│
├── _brands/                   ← Brand source files (not served directly)
│   ├── hosea/                 ← Brand 1 source
│   │   ├── brand-config.json  ← Colors, contact info, PWA identity
│   │   ├── manifest.json      ← PWA manifest
│   │   ├── tour-data.json     ← 3D tour data (units, prices, hotspots)
│   │   ├── icon-192.png       ← PWA icons
│   │   ├── project/           ← Logos, gallery, floor plans, hotspot media
│   │   ├── model/             ← 3D building model (.glb)
│   │   ├── unit-image-video/  ← Unit photos & videos
│   │   ├── panorama/          ← 360° panoramas
│   │   └── hdr/               ← HDR environment maps
│   └── temer/                 ← Brand 2 source
│       └── ...
│
├── hosea/                     ← Built brand 1 (standalone PWA, served)
│   ├── index.html
│   ├── sw.js
│   ├── brand-config.json
│   └── ... (all media assets)
└── temer/                     ← Built brand 2 (standalone PWA, served)
    └── ...
```

Each brand folder (`hosea/`, `temer/`) is a **complete standalone PWA** with its own service worker scope. Upload any brand folder to any static host and it works independently.

## Quick Start

### Build a brand

```bash
./scripts/build-brand.sh hosea
```

Output: `hosea/` folder — a fully standalone PWA.

### Serve locally

```bash
python3 -m http.server 8080
# Root:       http://localhost:8080/          (brand portal)
# Hosea:      http://localhost:8080/hosea/    (Hosea PWA)
# Temer:      http://localhost:8080/temer/    (Temer PWA)
```

## Adding a New Brand

### 1. Create the brand source folder

```bash
mkdir -p _brands/<brand-name>/{project,project/gallery,project/floor-plans,project/amenities,project/hotspots,model,unit-image-video,panorama,3d-floor-plan,2d-floor-plan,hdr}
```

### 2. Add brand configuration files

**`_brands/<brand-name>/brand-config.json`** — Company identity:
- `brand.companyName`, `brand.logo` — Company name & logo
- `theme.*` — Full color palette (primary, background, text, borders)
- `contact.*` — Phones, emails, WhatsApp, social media, address
- `pwa.*` — PWA app name & description
- `project.*` — Default project metadata
- `auth.adminEmails` — Firebase admin emails
- `contactForm.endpoint` — Backend API for contact form
- `displaySettings.*` — Feature toggles

**`_brands/<brand-name>/manifest.json`** — PWA manifest:
- `name`, `short_name`, `description` — App identity
- `theme_color`, `background_color` — Must match brand theme
- `icons` — PWA install icons

**`_brands/<brand-name>/tour-data.json`** — 3D tour content:
- Project details, unit types, individual units, prices, statuses
- Hotspot definitions, amenities, gallery, nearby attractions
- 3D model paths, HDR environment map path

### 3. Add media assets

Copy into `_brands/<brand-name>/`:

| Folder | Contents |
|---|---|
| `project/` | Developer logo, gallery images, floor plans, hero video, hotspot media |
| `model/` | Main 3D building model (`building.glb`) |
| `unit-image-video/` | Per-unit-type photos & videos |
| `panorama/` | 360° panorama images per unit type |
| `3d-floor-plan/` | 3D floor plan GLB models |
| `2d-floor-plan/` | 2D floor plan images |
| `hdr/` | HDR environment maps |
| `icon-192.png` | PWA icon (192×192) |
| `icon-512.png` | PWA icon (512×512) |
| `favicon.ico` | Browser favicon |

### 4. Register the brand

Edit `brands.json` and add an entry:

```json
{
  "id": "brand-name",
  "name": "Brand Display Name",
  "tagline": "Marketing tagline",
  "path": "./brand-name/",
  "logo": "./brand-name/project/logo.png",
  "primaryColor": "#hexcolor",
  "projects": ["Project Name"]
}
```

### 5. Build

```bash
./scripts/build-brand.sh brand-name
```

### 6. Deploy

Upload the `brand-name/` folder contents to your hosting provider.

## Deploying to Different Platforms

### GitHub Pages

Each brand can be a separate repository, or all brands on one repo with a custom domain:

```
# Single repo, multiple brands:
yourdomain.com/hosea/   → hosea/ folder
yourdomain.com/temer/   → temer/ folder
```

Deploy script:
```bash
./scripts/build-brand.sh hosea
./scripts/build-brand.sh temer
# Push all to gh-pages branch
git add hosea/ temer/ brands.json index.html
git commit -m "Deploy brands"
git push origin gh-pages
```

### Firebase Hosting

`firebase.json`:
```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/_*", "**/.*"],
    "rewrites": [
      { "source": "/hosea/**", "destination": "/hosea/index.html" },
      { "source": "/temer/**", "destination": "/temer/index.html" }
    ]
  }
}
```

### Vercel / Netlify

Drop the entire project root. Each brand folder is self-contained and accessible via URL path.

### Standalone (single brand only)

If a client wants their own dedicated domain:

```bash
./scripts/build-brand.sh hosea
# Upload contents of hosea/ folder to the root of their domain
```

## Shared App Code

The `_shared/` directory contains the source of truth for all brand instances:

| File | Purpose |
|---|---|
| `index.html` | Main 3D tour app — reads `brand-config.json` from its own directory |
| `sw.js` | Service worker — scopes to its own directory |
| `availability-system.js` | Firebase availability management |
| `contact-integration.js` | Contact modals — reads from `window.BRAND` |
| `firebase-config.js` | Firebase initialization (shared config template) |
| `offline.html` | Offline fallback page |
| `draco/` | Three.js Draco decoder |

**When you update `_shared/index.html`**, rebuild all brands:
```bash
./scripts/build-brand.sh hosea
./scripts/build-brand.sh temer
```

## Brand Config Reference

### Per-Developer (change once, applies to all projects)

| Key | Example | Purpose |
|---|---|---|
| `brand.companyName` | `"Hosea Real Estate"` | Company display name |
| `brand.logo` | `"project/logo.png"` | Logo file path |
| `theme.primary` | `"#1a5276"` | Brand primary color |
| `theme.dark.*` | Full dark palette | Dark mode colors |
| `pwa.name` | `"Hosea Property Tours"` | PWA app name |
| `contact.phones` | Array of phone objects | Phone numbers |
| `contact.emails` | Array of email objects | Email addresses |
| `contact.whatsapp` | WhatsApp config | WhatsApp integration |
| `contact.social` | Social media profiles | Social links |
| `contactForm.endpoint` | API URL | Contact form backend |
| `auth.adminEmails` | Email array | Firebase admins |

### Per-Project (change for each building)

| Key | Example | Purpose |
|---|---|---|
| `project.name` | `"Yerer Apartment"` | Project display name |
| `project.description` | Text | Project description |
| `project.location` | `"Yerer, Addis Ababa"` | Location string |
| `project.buildingSize` | `"B+G+12"` | Building size |
| `project.deliveryTime` | `"24 Months"` | Delivery estimate |
| `project.coordinates` | `{lat, lng}` | Map coordinates |

## Troubleshooting

**Brand builds but assets are missing:**
- Check that media files exist in `_brands/<brand>/`
- Run `./scripts/build-brand.sh hosea` to rebuild

**Service Worker not working:**
- Each brand has its own SW scope — verify `sw.js` is in the brand folder root
- Clear browser cache for that specific URL path

**PWA install prompt not showing:**
- Ensure `manifest.json` is valid and icons exist
- Check that the site is served over HTTPS (or localhost)

**Colors not updating:**
- Verify `brand-config.json` theme values are valid hex colors
- Check `index.html` inline script defaults match your brand

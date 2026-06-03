# 3D Virtual Tour Platform — Multi-Brand PWA

A white-label progressive web application for hosting interactive 3D property tours, supporting multiple real estate developer brands from a single codebase.

## Architecture

```
/
├── index.html              ← Brand portal (lists all brands)
├── brands.json             ← Brand registry
│
├── _shared/                ← App source code (never served directly)
│   ├── index.html          ← 3D tour app (brand-agnostic)
│   ├── sw.js               ← Service worker
│   ├── availability-system.js
│   ├── contact-integration.js
│   ├── firebase-config.js  ← Centralized Firebase config
│   ├── offline.html
│   └── draco/              ← Draco decoder
│
├── _brands/                ← Brand source files
│   ├── ayat/               ← Brand config + media
│   ├── demahope/
│   ├── gift/
│   ├── hosea/
│   ├── metropolitan/
│   └── temer/
│
├── scripts/                ← Build & utility scripts
│   ├── build-brand.sh      ← Build one brand
│   ├── build-all-brands.sh ← Build all brands
│   ├── scaffold-brand.sh   ← Create new brand from template
│   ├── generate-sw-manifest.py
│   ├── generate-tour-data.js
│   ├── generate-icons.py   ← Generate PWA icons from logos
│   ├── init-availability.js
│   ├── optimize-images.sh
│   ├── optimize-videos.sh
│   ├── fix-brand-symlinks.sh
│   ├── scrape-brands.js    ← Scrape brand data from websites
│   ├── download-media.js   ← Download logos from websites
│   └── update-brands.sh    ← Bulk brand config updater
│
├── electron/               ← Electron desktop wrapper
├── docs/                   ← Documentation
│
├── ayat/                   ← Built brand output (standalone PWA)
├── demahope/               ← Built brand output
├── gift/                   ← Built brand output
├── hosea/                  ← Built brand output
├── metropolitan/           ← Built brand output
└── temer/                  ← Built brand output
```

Each brand folder (`ayat/`, `demahope/`, etc.) is a **complete standalone PWA** with its own service worker scope, deployable independently to any static host. These are build artifacts — rebuild from `_shared/` + `_brands/` using the build scripts.

## Quick Start

### Local Development

```bash
# Build all brands
./scripts/build-all-brands.sh

# Start server
python3 -m http.server 8080
```

| URL | Description |
|---|---|
| `http://localhost:8080/` | Brand portal |
| `http://localhost:8080/hosea/` | Hosea Real Estate PWA |
| `http://localhost:8080/temer/` | Temer Real Estate PWA |

### Adding a New Brand

```bash
# 1. Scaffold a new brand source
./scripts/scaffold-brand.sh newbrand

# 2. Edit the config files in _brands/newbrand/
#    - brand-config.json (identity, theme, contact)
#    - manifest.json (PWA metadata)
#    - tour-data.json (units, pricing, hotspots)

# 3. Add media assets (logo, 3D model, photos, etc.)

# 4. Register in brands.json

# 5. Build
./scripts/build-brand.sh newbrand
```

## Scripts

| Script | Purpose |
|---|---|
| `./scripts/build-brand.sh <name>` | Build one brand from source |
| `./scripts/build-all-brands.sh` | Build all brands |
| `./scripts/scaffold-brand.sh <name>` | Create new brand source with templates |
| `./scripts/generate-icons.py` | Generate PWA icons from brand logos |
| `./scripts/init-availability.js` | Initialize Firebase availability data |
| `./scripts/scrape-brands.js` | Scrape brand data from websites |
| `./scripts/download-media.js` | Download logos from brand websites |
| `./scripts/optimize-images.sh` | Optimize PNG/JPG/WEBP for web |
| `./scripts/optimize-videos.sh` | Optimize MP4 videos for web |

## Configuration

### Brand Identity (`_brands/<name>/brand-config.json`)

Company name, logo, color palette, contact info, social links, and PWA metadata.

### 3D Tour Content (`_brands/<name>/tour-data.json`)

Project details, unit types, individual units with pricing/availability, hotspots, amenities, gallery.

### Brand Registry (`brands.json`)

Lists all available brands for the root portal page. Each entry includes name, tagline, path, logo, and associated projects.

## Deployment

### Standalone (single brand per domain)

```bash
./scripts/build-brand.sh hosea
# Upload hosea/ contents to domain root
```

### Subdirectories (multiple brands, one domain)

```bash
./scripts/build-all-brands.sh
# Upload entire project root — each brand accessible at /brand-name/
```

### GitHub Pages

Automated via GitHub Actions on push to `master` (see `.github/workflows/deploy-pages.yml`).

### Firebase Hosting

Configure rewrites in `firebase.json`:
```json
{
  "hosting": {
    "public": ".",
    "rewrites": [
      { "source": "/hosea/**", "destination": "/hosea/index.html" },
      { "source": "/temer/**", "destination": "/temer/index.html" }
    ]
  }
}
```

## Updating Shared Code

When you modify `_shared/index.html` or other shared files, rebuild all brands:

```bash
./scripts/build-all-brands.sh
```

## Documentation

- **[docs/architecture.md](docs/architecture.md)** — Application architecture, data flows, state management
- **[docs/multi-brand.md](docs/multi-brand.md)** — Complete multi-brand hosting & configuration guide
- **[docs/build.md](docs/build.md)** — Build and deployment details (Electron, Windows)
- **[docs/mobile-guide.md](docs/mobile-guide.md)** — PWA features, mobile testing, gestures
- **[docs/firebase.md](docs/firebase.md)** — Firebase setup, security rules, deployment
- **[docs/brand-scraping-summary.md](docs/brand-scraping-summary.md)** — Brand data scraping results

## Technologies

Three.js · GLTFLoader · Draco · Firebase · Service Workers · IndexedDB · Cache API

## License

ISC

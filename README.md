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
│   └── draco/              ← Draco decoder
│
├── _brands/                ← Brand source files
│   ├── hosea/              ← Brand 1: config + media
│   └── temer/              ← Brand 2: config + media
│
├── hosea/                  ← Built brand 1 (standalone PWA)
└── temer/                  ← Built brand 2 (standalone PWA)
```

Each brand folder is a **complete standalone PWA** with its own service worker scope, deployable independently to any static host.

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

```bash
./scripts/build-all-brands.sh
git add hosea/ temer/ brands.json index.html
git commit -m "Deploy brands"
git push origin gh-pages
```

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

- **[MULTI-BRAND.md](MULTI-BRAND.md)** — Complete multi-brand hosting guide
- **[BUILD.md](BUILD.md)** — Build and deployment details
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Application architecture

## Technologies

Three.js · GLTFLoader · Draco · Firebase · Service Workers · IndexedDB · Cache API

## License

ISC

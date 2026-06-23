#!/usr/bin/env bash
#
# prepare-cloudflare.sh — Prepare a clean dist/ directory for Cloudflare Pages
#
# This script:
#   1. Builds all brands from _shared/ + _brands/ source
#   2. Assembles only the deployable files into dist/
#   3. Adds Cloudflare Pages _headers and _redirects
#
# Usage:
#   bash scripts/prepare-cloudflare.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$ROOT_DIR/dist"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[cloudflare]${NC} $*"; }
ok()    { echo -e "${GREEN}[cloudflare]${NC} ✓ $*"; }

# ─── Step 1: Build all brands ──────────────────────────────────────
info "Building all brands..."
bash "$SCRIPT_DIR/build-all-brands.sh"

# ─── Step 2: Clean and create dist directory ───────────────────────
info "Preparing dist/ directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# ─── Step 3: Copy root portal files ───────────────────────────────
info "Copying root portal files..."
cp "$ROOT_DIR/index.html"      "$DIST_DIR/"
cp "$ROOT_DIR/brands.json"     "$DIST_DIR/"
cp "$ROOT_DIR/favicon.ico"     "$DIST_DIR/" 2>/dev/null || true

ok "Root portal files copied"

# ─── Step 4: Copy brand output directories ────────────────────────
BRANDS=$(python3 -c "
import json
with open('$ROOT_DIR/brands.json') as f:
    data = json.load(f)
for b in data.get('brands', []):
    print(b['id'])
")

for brand in $BRANDS; do
  brand_dir="$ROOT_DIR/$brand"
  if [ -d "$brand_dir" ]; then
    info "  Copying brand: $brand"
    cp -r "$brand_dir" "$DIST_DIR/"
    ok "  $brand copied"
  else
    echo -e "${YELLOW}[cloudflare]${NC} ⚠ Brand directory not found: $brand_dir (skipping)"
  fi
done

# ─── Step 5: Copy Cloudflare Pages config files ───────────────────
info "Adding Cloudflare Pages configuration..."

# _headers — Controls HTTP response headers
cat > "$DIST_DIR/_headers" << 'HEADERS'
# Service Worker must be served with this MIME type
/sw.js
  Content-Type: application/javascript
  Service-Worker-Allowed: /

# 3D model files — allow cross-origin loading
/*.glb
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

/*.gltf
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

# Draco decoder files — cache aggressively
/draco/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

# HDR environment maps
/*.hdr
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

# Images — cache with content hash or long TTL
/*.png
  Cache-Control: public, max-age=86400
/*.jpg
  Cache-Control: public, max-age=86400
/*.jpeg
  Cache-Control: public, max-age=86400
/*.webp
  Cache-Control: public, max-age=86400
/*.svg
  Cache-Control: public, max-age=86400
/*.ico
  Cache-Control: public, max-age=604800

# Video files
/*.mp4
  Cache-Control: public, max-age=31536000, immutable
/*.webm
  Cache-Control: public, max-age=31536000, immutable

# JSON data files — short cache for freshness
/*.json
  Cache-Control: public, max-age=300
  Access-Control-Allow-Origin: *

# HTML — no cache for entry points (always serve latest)
/*.html
  Cache-Control: public, max-age=0, must-revalidate
/
  Cache-Control: public, max-age=0, must-revalidate

# Brand subdirectory HTML
/*/*.html
  Cache-Control: public, max-age=0, must-revalidate

# Brand subdirectory root
/*/
  Cache-Control: public, max-age=0, must-revalidate

# Security headers for all pages
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
HEADERS

ok "_headers created"

# _redirects — SPA-style routing for brand directories
cat > "$DIST_DIR/_redirects" << 'REDIRECTS'
# Each brand is a standalone PWA with its own service worker scope.
# Redirect all sub-paths of a brand back to its index.html so that
# direct navigation and refresh work correctly.

/hosea/* /hosea/index.html 200
/demahope/* /demahope/index.html 200
/metropolitan/* /metropolitan/index.html 200
/gift/* /gift/index.html 200
/ayat/* /ayat/index.html 200
/temer/* /temer/index.html 200
REDIRECTS

ok "_redirects created"

# ─── Step 6: Report ───────────────────────────────────────────────
echo ""
info "Cloudflare Pages build ready!"
info "Output directory: $DIST_DIR"
info ""
info "To deploy with Wrangler CLI:"
info "  npx wrangler pages deploy dist/ --project-name=3dinttour"
info ""
info "Or connect your GitHub repo to Cloudflare Pages with:"
info "  Build command:  bash scripts/prepare-cloudflare.sh"
info "  Output directory: dist"
echo ""

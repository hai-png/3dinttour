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

# ─── Step 5: Optimize GLB files for Cloudflare Pages (25 MiB limit) ─
info "Optimizing GLB files (Cloudflare Pages has 25 MiB file size limit)..."
GLB_FILES=$(find "$DIST_DIR" -name "*.glb" -type f 2>/dev/null || true)
if [ -n "$GLB_FILES" ]; then
  # Check if any GLB exceeds 24 MiB (leaving 1 MiB margin)
  OVERSIZED=$(echo "$GLB_FILES" | while read -r f; do
    size=$(stat -c%s "$f" 2>/dev/null || echo 0)
    if [ "$size" -gt 25165824 ]; then  # 24 MiB in bytes
      echo "$f"
    fi
  done)

  if [ -n "$OVERSIZED" ]; then
    info "  Found oversized GLB files, optimizing with Draco compression..."
    npx -y @gltf-transform/cli@latest --version >/dev/null 2>&1  # ensure installed
    echo "$OVERSIZED" | while read -r f; do
      info "  Optimizing: $(basename "$f") ($(du -h "$f" | cut -f1))"
      tmpf="${f%.glb}-tmp.glb"
      npx @gltf-transform/cli@latest optimize "$f" "$tmpf" --compress draco 2>&1 | tail -1 || true
      if [ -f "$tmpf" ]; then
        mv "$tmpf" "$f"
        ok "  → $(basename "$f") ($(du -h "$f" | cut -f1))"
      fi
    done
  else
    ok "All GLB files are within the 25 MiB limit"
  fi
else
  ok "No GLB files found"
fi

# ─── Step 6: Copy Cloudflare Pages config files ───────────────────
info "Adding Cloudflare Pages configuration..."

# _headers — Controls HTTP response headers
# IMPORTANT: Cloudflare Pages MERGES headers from ALL matching path rules.
# This means /hosea/sw.js matches BOTH /*/sw.js AND /*.js AND /*.
# We must NOT set conflicting Cache-Control values on different rules
# that could match the same path, or the browser gets confused.
cat > "$DIST_DIR/_headers" << 'HEADERS'
# ── Service Workers (MUST be listed FIRST — most specific) ───────
# These rules must come before any generic .js rules to avoid
# Cache-Control merging. We do NOT use generic /*.js rules.
/sw.js
  Content-Type: application/javascript
  Cache-Control: no-cache, no-store, must-revalidate

/*/sw.js
  Content-Type: application/javascript
  Cache-Control: no-cache, no-store, must-revalidate

# ── Brand JS/CSS files (NOT sw.js — no generic /*.js rule!) ─────
# We list specific JS files by name to avoid merging with SW rules.
/*/availability-system.js
  Cache-Control: public, max-age=3600
/*/contact-integration.js
  Cache-Control: public, max-age=3600
/*/firebase-config.js
  Cache-Control: public, max-age=3600

# ── 3D model files ──────────────────────────────────────────────
/*.glb
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

/*.gltf
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

/*/*.glb
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

/*/*.gltf
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

# ── Draco decoder files ─────────────────────────────────────────
/draco/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/*/draco/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

# ── HDR environment maps ────────────────────────────────────────
/*.hdr
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

/*/*.hdr
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable

# ── Images ──────────────────────────────────────────────────────
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
/*/*.png
  Cache-Control: public, max-age=86400
/*/*.jpg
  Cache-Control: public, max-age=86400
/*/*.jpeg
  Cache-Control: public, max-age=86400
/*/*.webp
  Cache-Control: public, max-age=86400
/*/*.svg
  Cache-Control: public, max-age=86400
/*/*.ico
  Cache-Control: public, max-age=604800

# ── Video files ─────────────────────────────────────────────────
/*.mp4
  Cache-Control: public, max-age=31536000, immutable
/*.webm
  Cache-Control: public, max-age=31536000, immutable
/*/*.mp4
  Cache-Control: public, max-age=31536000, immutable
/*/*.webm
  Cache-Control: public, max-age=31536000, immutable

# ── WASM files ──────────────────────────────────────────────────
/*.wasm
  Cache-Control: public, max-age=31536000, immutable
/*/*.wasm
  Cache-Control: public, max-age=31536000, immutable

# ── JSON data files ─────────────────────────────────────────────
/*.json
  Cache-Control: public, max-age=300
  Access-Control-Allow-Origin: *
/*/*.json
  Cache-Control: public, max-age=300
  Access-Control-Allow-Origin: *

# ── HTML entry points — no cache (always serve latest) ──────────
# NOTE: Cloudflare Pages auto-redirects /path/file.html to /path/file (308).
# We add _redirects rules below to prevent this for service worker files.
/*.html
  Cache-Control: public, max-age=0, must-revalidate
/
  Cache-Control: public, max-age=0, must-revalidate
/*/*.html
  Cache-Control: public, max-age=0, must-revalidate
/*/
  Cache-Control: public, max-age=0, must-revalidate

# ── Security headers for all responses ──────────────────────────
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
HEADERS

ok "_headers created"

# _redirects — Prevent Cloudflare's automatic 308 "pretty URL" redirects
# Cloudflare Pages auto-redirects /path/file.html → /path/file (308).
# This breaks cache.addAll() in service workers because the SW tries to
# cache './offline.html' but gets a 308 redirect instead of the content.
# By adding explicit rules, we tell Cloudflare to serve .html files directly.
BRANDS_LIST=$(python3 -c "
import json
with open('$ROOT_DIR/brands.json') as f:
    data = json.load(f)
for b in data.get('brands', []):
    print(b['id'])
")

{
  # Prevent pretty-URL redirects for .html files that SW needs to cache
  for brand in $BRANDS_LIST; do
    echo "/$brand/index.html /$brand/index.html 200"
    echo "/$brand/offline.html /$brand/offline.html 200"
  done
  # Root index.html
  echo "/index.html /index.html 200"
} > "$DIST_DIR/_redirects"

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

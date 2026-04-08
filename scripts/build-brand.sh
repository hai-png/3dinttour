#!/usr/bin/env bash
#
# build-brand.sh — Build a branded instance of the 3D tour app
#
# Usage:
#   ./scripts/build-brand.sh <brand-name> [--watch]
#
# Directory layout:
#   _shared/            ← Source of truth for app code
#   _brands/<brand>/    ← Brand-specific config + media
#   <brand>/            ← Output: complete standalone PWA
#
# The output folder is a fully self-contained PWA ready for static hosting.
# Each brand gets its own service worker scope.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_DIR="$ROOT_DIR/_shared"
BRANDS_DIR="$ROOT_DIR/_brands"
BRAND_NAME="${1:-}"
WATCH_MODE="${2:-}"

# ─── Color output helpers ───────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[build-brand]${NC} $*"; }
ok()    { echo -e "${GREEN}[build-brand]${NC} ✓ $*"; }
warn()  { echo -e "${YELLOW}[build-brand]${NC} ⚠ $*"; }
err()   { echo -e "${RED}[build-brand]${NC} ✗ $*" >&2; exit 1; }

# ─── Validate inputs ───────────────────────────────────────────────
if [ -z "$BRAND_NAME" ]; then
  echo ""
  echo "  Build a branded instance of the 3D tour app"
  echo ""
  echo "  Usage:  ./scripts/build-brand.sh <brand-name>"
  echo ""
  echo "  Available brands:"
  if [ -d "$BRANDS_DIR" ]; then
    for d in "$BRANDS_DIR"/*/; do
      [ -d "$d" ] && echo "    - $(basename "$d")"
    done
  else
    echo "    (none yet — create one in _brands/)"
  fi
  echo ""
  echo "  Create a new brand:"
  echo "    1. mkdir -p _brands/<brand-name>"
  echo "    2. Add brand-config.json, manifest.json, tour-data.json, media…"
  echo "    3. Run: ./scripts/build-brand.sh <brand-name>"
  echo ""
  exit 1
fi

BRAND_SRC="$BRANDS_DIR/$BRAND_NAME"
BRAND_OUT="$ROOT_DIR/$BRAND_NAME"

[ -d "$SHARED_DIR" ]    || err "Shared directory not found: $SHARED_DIR"
[ -d "$BRAND_SRC" ]     || err "Brand source not found: $BRAND_SRC (create it in _brands/$BRAND_NAME)"

# ─── Step 1: Clean output directory ────────────────────────────────
info "Cleaning output: $BRAND_OUT"
if [ -d "$BRAND_OUT" ]; then
  rm -rf "$BRAND_OUT"
fi
mkdir -p "$BRAND_OUT"

# ─── Step 2: Copy shared app files ─────────────────────────────────
info "Copying shared app files…"
SHARED_FILES=(
  "index.html"
  "sw.js"
  "availability-system.js"
  "contact-integration.js"
  "firebase-config.js"
  "offline.html"
  "draco"
)

for f in "${SHARED_FILES[@]}"; do
  src="$SHARED_DIR/$f"
  if [ -e "$src" ]; then
    if [ -d "$src" ]; then
      cp -Lr "$src" "$BRAND_OUT/"
    else
      cp -L "$src" "$BRAND_OUT/"
    fi
    ok "  $f"
  else
    warn "  $f (not found in _shared/, skipping)"
  fi
done

# ─── Step 3: Copy brand-specific files ─────────────────────────────
info "Copying brand assets from: $BRAND_SRC"
BRAND_FILES=(
  "brand-config.json"
  "manifest.json"
  "tour-data.json"
  "icon-192.png"
  "icon-512.png"
  "favicon.ico"
  "icon.svg"
  "project"
  "model"
  "unit-image-video"
  "panorama"
  "3d-floor-plan"
  "2d-floor-plan"
  "hdr"
)

for f in "${BRAND_FILES[@]}"; do
  src="$BRAND_SRC/$f"
  if [ -e "$src" ]; then
    if [ -d "$src" ]; then
      cp -Lr "$src" "$BRAND_OUT/"
    else
      cp -L "$src" "$BRAND_OUT/"
    fi
    ok "  $f"
  else
    warn "  $f (not found, skipping)"
  fi
done

# ─── Step 4: Validate required files ──────────────────────────────
REQUIRED=(
  "$BRAND_OUT/brand-config.json"
  "$BRAND_OUT/manifest.json"
  "$BRAND_OUT/index.html"
  "$BRAND_OUT/sw.js"
)

for f in "${REQUIRED[@]}"; do
  [ -f "$f" ] || err "Required file missing: $f"
done

ok "All required files present"

# ─── Step 5: Verify brand-config.json is valid JSON ────────────────
if command -v python3 &>/dev/null; then
  python3 -c "import json; json.load(open('$BRAND_OUT/brand-config.json'))" 2>/dev/null \
    || err "brand-config.json is not valid JSON"
  python3 -c "import json; json.load(open('$BRAND_OUT/manifest.json'))" 2>/dev/null \
    || err "manifest.json is not valid JSON"
  ok "JSON validation passed"
fi

# ─── Step 6: Generate sw-manifest.json (scan media folders) ────────
info "Generating sw-manifest.json (brand media inventory)…"
python3 "$SCRIPT_DIR/generate-sw-manifest.py" "$BRAND_OUT" 2>&1 || warn "sw-manifest.json generation failed"
ok "sw-manifest.json generated"

# ─── Step 7: Report ────────────────────────────────────────────────
echo ""
info "Brand '$BRAND_NAME' built successfully!"
info "Output: $BRAND_OUT"
info ""
info "To serve locally:"
info "  cd $ROOT_DIR && python3 -m http.server 8080"
info "  Then open: http://localhost:8080/$BRAND_NAME/"
info ""
info "To deploy:"
info "  Upload the contents of $BRAND_OUT to your hosting provider."
info "  Each brand is a standalone PWA."
echo ""

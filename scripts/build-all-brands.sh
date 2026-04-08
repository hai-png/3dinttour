#!/usr/bin/env bash
#
# build-all-brands.sh — Build all configured brands
#
# Usage:
#   ./scripts/build-all-brands.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BRANDS_DIR="$ROOT_DIR/_brands"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; NC='\033[0m'

if [ ! -d "$BRANDS_DIR" ]; then
  echo "No _brands/ directory found."
  exit 1
fi

count=0
for brand_dir in "$BRANDS_DIR"/*/; do
  [ -d "$brand_dir" ] || continue
  brand_name="$(basename "$brand_dir")"
  echo -e "\n${CYAN}══════════════════════════════════════${NC}"
  echo -e "${CYAN}  Building: $brand_name${NC}"
  echo -e "${CYAN}══════════════════════════════════════${NC}"
  "$SCRIPT_DIR/build-brand.sh" "$brand_name" && count=$((count + 1))
done

echo ""
echo -e "${GREEN}✓ Built $count brand(s)${NC}"

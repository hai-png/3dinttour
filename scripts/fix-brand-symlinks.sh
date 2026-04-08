#!/usr/bin/env bash
#
# fix-brand-symlinks.sh — Fix broken symlinks in brand source folders
#
# Usage:
#   ./scripts/fix-brand-symlinks.sh <brand-name> [reference-brand]
#
# This script finds all broken symlinks in a brand source folder and
# recreates them with correct relative paths to the reference brand.
# Default reference brand is 'hosea'.
#
# Common issue: Symlinks created with incorrect relative paths that point
# outside the _brands/ directory. This fixes them to point to the correct
# _brands/<reference>/ location.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BRANDS_DIR="$ROOT_DIR/_brands"
BRAND_NAME="${1:-}"
REFERENCE="${2:-hosea}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[fix-symlinks]${NC} $*"; }
ok()    { echo -e "${GREEN}[fix-symlinks]${NC} ✓ $*"; }
warn()  { echo -e "${YELLOW}[fix-symlinks]${NC} ⚠ $*"; }
err()   { echo -e "${RED}[fix-symlinks]${NC} ✗ $*" >&2; exit 1; }

if [ -z "$BRAND_NAME" ]; then
  echo ""
  echo "  Fix broken symlinks in a brand source folder"
  echo ""
  echo "  Usage:  ./scripts/fix-brand-symlinks.sh <brand-name> [reference-brand]"
  echo ""
  echo "  Examples:"
  echo "    ./scripts/fix-brand-symlinks.sh demahope"
  echo "    ./scripts/fix-brand-symlinks.sh metropolitan hosea"
  echo ""
  exit 1
fi

BRAND_DIR="$BRANDS_DIR/$BRAND_NAME"
[ -d "$BRAND_DIR" ] || err "Brand source not found: $BRAND_DIR"

REF_DIR="$BRANDS_DIR/$REFERENCE"
[ -d "$REF_DIR" ] || err "Reference brand not found: $REF_DIR"

info "Fixing symlinks for brand: $BRAND_NAME (reference: $REFERENCE)"

fixed=0
failed=0

# Find all broken symlinks
while IFS= read -r -d '' broken_link; do
  target=$(readlink "$broken_link")
  rel_path="${broken_link#$BRAND_DIR/}"
  folder_name=$(basename "$target")
  
  # Calculate correct relative path based on depth
  if [[ "$rel_path" == project/* ]]; then
    # Inside project/ subfolder: ../../reference/project/<folder>
    correct_target="../../$REFERENCE/project/$folder_name"
  else
    # In brand root: ../reference/<folder>
    correct_target="../$REFERENCE/$folder_name"
  fi
  
  # Verify target exists
  link_dir=$(dirname "$broken_link")
  resolved_path=$(cd "$link_dir" 2>/dev/null && realpath -m "$correct_target" 2>/dev/null || echo "")
  
  if [ -n "$resolved_path" ] && [ -e "$resolved_path" ]; then
    info "  Fixing: $rel_path"
    info "    Old: $target"
    info "    New: $correct_target"
    rm "$broken_link"
    ln -s "$correct_target" "$broken_link"
    ok "  Fixed!"
    fixed=$((fixed + 1))
  else
    warn "  Cannot fix: $rel_path"
    warn "    Target doesn't exist: $REFERENCE/$folder_name"
    failed=$((failed + 1))
  fi
done < <(find "$BRAND_DIR" -type l ! -exec test -e {} \; -print0 2>/dev/null)

echo ""
if [ $fixed -eq 0 ] && [ $failed -eq 0 ]; then
  ok "No broken symlinks found!"
  exit 0
elif [ $fixed -eq 0 ]; then
  warn "Failed to fix $failed symlink(s)"
else
  ok "Fixed $fixed symlink(s), $failed failed"
fi

# Final verification
broken_count=$(find "$BRAND_DIR" -type l ! -exec test -e {} \; -print | wc -l)
if [ "$broken_count" -gt 0 ]; then
  warn "$broken_count broken symlink(s) still remain:"
  find "$BRAND_DIR" -type l ! -exec test -e {} \; -print
  exit 1
else
  ok "All symlinks are now valid!"
fi

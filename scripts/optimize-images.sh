#!/bin/bash
# Media Optimization Script for GitHub Pages
# Optimizes PNG, JPG, and WEBP images for web delivery

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Counters
TOTAL_SAVED=0
TOTAL_ORIGINAL=0
PROCESSED=0

echo "=========================================="
echo "  Image Optimization for GitHub Pages"
echo "=========================================="
echo "Project directory: $PROJECT_DIR"
echo ""

# Function to get file size
get_size() {
    stat -c%s "$1" 2>/dev/null || echo 0
}

# Function to format bytes
format_size() {
    local size=$1
    if [ $size -ge 1048576 ]; then
        echo "$(echo "scale=2; $size/1048576" | bc)MB"
    elif [ $size -ge 1024 ]; then
        echo "$(echo "scale=2; $size/1024" | bc)KB"
    else
        echo "${size}B"
    fi
}

# Optimize PNG files
echo "🔍 Optimizing PNG files..."
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        original=$(get_size "$file")
        echo -n "  Processing: $(basename "$file")... "
        
        # Use optipng with moderate optimization (level 2 for speed)
        optipng -quiet -o2 "$file" 2>/dev/null || true
        
        # Use pngquant for better compression (quality 65-80 for web)
        if command -v pngquant &> /dev/null; then
            pngquant --quality=65-80 --force --ext .png "$file" 2>/dev/null || true
        fi
        
        optimized=$(get_size "$file")
        saved=$((original - optimized))
        if [ $saved -gt 0 ]; then
            TOTAL_SAVED=$((TOTAL_SAVED + saved))
        fi
        TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + original))
        PROCESSED=$((PROCESSED + 1))
        echo "✓"
    fi
done < <(find "$PROJECT_DIR" -path "*/node_modules" -prune -o -path "*/android" -prune -o -path "*/ios" -prune -o -type f -name "*.png" -print0 2>/dev/null)

# Optimize JPG/JPEG files
echo "🔍 Optimizing JPG/JPEG files..."
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        original=$(get_size "$file")
        echo -n "  Processing: $(basename "$file")... "
        
        # Use ffmpeg to optimize JPEG (quality 75 for web)
        ffmpeg -y -i "$file" -q:v 2 -progress pipe:1 "$file.tmp" 2>/dev/null && mv "$file.tmp" "$file" || rm -f "$file.tmp"
        
        optimized=$(get_size "$file")
        saved=$((original - optimized))
        if [ $saved -gt 0 ]; then
            TOTAL_SAVED=$((TOTAL_SAVED + saved))
        fi
        TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + original))
        PROCESSED=$((PROCESSED + 1))
        echo "✓"
    fi
done < <(find "$PROJECT_DIR" -path "*/node_modules" -prune -o -path "*/android" -prune -o -path "*/ios" -prune -o -type f \( -name "*.jpg" -o -name "*.jpeg" \) -print0 2>/dev/null)

# Optimize WEBP files (convert to optimized WEBP)
echo "🔍 Optimizing WEBP files..."
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        original=$(get_size "$file")
        echo -n "  Processing: $(basename "$file")... "
        
        # Use cwebp to re-compress with better settings (quality 75)
        cwebp -q 75 -m 4 -mt "$file" -o "$file.tmp" 2>/dev/null && mv "$file.tmp" "$file" || rm -f "$file.tmp"
        
        optimized=$(get_size "$file")
        saved=$((original - optimized))
        if [ $saved -gt 0 ]; then
            TOTAL_SAVED=$((TOTAL_SAVED + saved))
        fi
        TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + original))
        PROCESSED=$((PROCESSED + 1))
        echo "✓"
    fi
done < <(find "$PROJECT_DIR" -path "*/node_modules" -prune -o -path "*/android" -prune -o -path "*/ios" -prune -o -type f -name "*.webp" -print0 2>/dev/null)

echo ""
echo "=========================================="
echo "  Optimization Complete!"
echo "=========================================="
echo "  Files processed: $PROCESSED"
echo "  Original size:   $(format_size $TOTAL_ORIGINAL)"
echo "  Space saved:     $(format_size $TOTAL_SAVED)"
if [ $TOTAL_ORIGINAL -gt 0 ]; then
    PERCENT=$(echo "scale=1; $TOTAL_SAVED * 100 / $TOTAL_ORIGINAL" | bc)
    echo "  Reduction:       ${PERCENT}%"
fi
echo "=========================================="

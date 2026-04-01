#!/bin/bash
# Video Optimization Script for GitHub Pages
# Optimizes MP4 videos for web delivery

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Counters
TOTAL_SAVED=0
TOTAL_ORIGINAL=0
PROCESSED=0

echo "=========================================="
echo "  Video Optimization for GitHub Pages"
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

# Optimize MP4 files
echo "🔍 Optimizing MP4 video files..."
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        original=$(get_size "$file")
        filename=$(basename "$file")
        echo -n "  Processing: $filename... "
        
        # Get video duration
        duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$file" 2>/dev/null || echo "0")
        
        # Optimize for web with good quality/size balance
        # - H.264 codec (widely supported)
        # - CRF 23 (good quality, reasonable size)
        # - 720p max resolution for web
        # - AAC audio at 128kbps
        # - Fast start for web streaming
        ffmpeg -y \
            -i "$file" \
            -c:v libx264 \
            -crf 23 \
            -preset medium \
            -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
            -c:a aac -b:a 128k \
            -movflags +faststart \
            -progress pipe:1 \
            "$file.tmp" 2>/dev/null
        
        # Only replace if optimized is smaller or similar quality
        optimized=$(get_size "$file.tmp")
        if [ $optimized -lt $original ] || [ $optimized -le $((original * 110 / 100)) ]; then
            mv "$file.tmp" "$file"
            saved=$((original - optimized))
            if [ $saved -gt 0 ]; then
                TOTAL_SAVED=$((TOTAL_SAVED + saved))
            fi
            echo "✓ ($(format_size $optimized))"
        else
            rm -f "$file.tmp"
            echo "⊘ (kept original)"
        fi
        
        TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + original))
        PROCESSED=$((PROCESSED + 1))
    fi
done < <(find "$PROJECT_DIR" -path "*/node_modules" -prune -o -path "*/android" -prune -o -path "*/ios" -prune -o -type f -name "*.mp4" -print0 2>/dev/null)

echo ""
echo "=========================================="
echo "  Video Optimization Complete!"
echo "=========================================="
echo "  Files processed: $PROCESSED"
echo "  Original size:   $(format_size $TOTAL_ORIGINAL)"
echo "  Space saved:     $(format_size $TOTAL_SAVED)"
if [ $TOTAL_ORIGINAL -gt 0 ]; then
    PERCENT=$(echo "scale=1; $TOTAL_SAVED * 100 / $TOTAL_ORIGINAL" | bc)
    echo "  Reduction:       ${PERCENT}%"
fi
echo "=========================================="

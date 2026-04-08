#!/usr/bin/env python3
"""
generate-sw-manifest.py — Scan brand media folders and produce sw-manifest.json

The SW reads this at CACHE_EVERYTHING time to know what files to cache,
instead of having hardcoded file lists.

Usage:
    python3 scripts/generate-sw-manifest.py <brand-output-dir>

Output:
    <brand-output-dir>/sw-manifest.json
"""

import os
import sys
import json

# File extensions to include
MEDIA_EXTS = {
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico',
    '.mp4', '.webm', '.mov', '.ogg',
    '.glb', '.gltf',
    '.hdr',
    '.json',
}

# Skip these directories/prefixes
SKIP_DIRS = {'draco', '.git', 'node_modules', 'electron', 'firebase',
             '_brands', '_shared', 'scripts', '__pycache__'}

# Skip these individual files (app-level, not brand media)
SKIP_FILES = {
    'index.html', 'sw.js', 'sw-manifest.json',
    'availability-system.js', 'contact-integration.js',
    'firebase-config.js', 'offline.html',
    'package.json', 'package-lock.json',
}

# Priority ordering (lower = cached first)
PRIORITY_MAP = {
    'model/': 1,
    '3d-floor-plan/': 1,
    'project/hotspots/': 2,
    'project/amenities/': 2,
    'project/floor-plans/': 2,
    'project/hero-image-video/': 2,
    'project/gallery/': 2,
    'project/': 3,          # logos, misc
    'unit-image-video/': 4,
    'panorama/': 5,
    '2d-floor-plan/': 6,
    'hdr/': 3,
}


def scan_media_dirs(brand_dir):
    """Scan all media directories and return priority-ordered file list."""
    files = []

    for root, dirs, filenames in os.walk(brand_dir):
        # Skip hidden and excluded dirs
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in SKIP_DIRS]

        # Get relative path from brand_dir
        rel_root = os.path.relpath(root, brand_dir)
        if rel_root == '.':
            rel_root = ''

        for fname in filenames:
            # Skip hidden files and excluded files
            if fname.startswith('.') or fname in SKIP_FILES:
                continue

            ext = os.path.splitext(fname)[1].lower()
            if ext not in MEDIA_EXTS:
                continue

            # Build relative URL path
            if rel_root:
                rel_path = f'./{rel_root}/{fname}'
            else:
                rel_path = f'./{fname}'

            # Determine priority
            priority = 99  # default low priority
            for prefix, pri in sorted(PRIORITY_MAP.items(), key=lambda x: -len(x[0])):
                if rel_path.startswith(f'./{prefix}'):
                    priority = pri
                    break

            files.append({'url': rel_path, 'priority': priority})

    # Sort by priority, then by path
    files.sort(key=lambda f: (f['priority'], f['url']))
    return files


def main():
    if len(sys.argv) < 2:
        print("Usage: generate-sw-manifest.py <brand-output-dir>")
        sys.exit(1)

    brand_dir = sys.argv[1]

    if not os.path.isdir(brand_dir):
        print(f"Error: {brand_dir} is not a directory")
        sys.exit(1)

    files = scan_media_dirs(brand_dir)

    manifest = {
        'version': 1,
        'totalFiles': len(files),
        'files': files,
        # Grouped by priority for SW convenience
        'priorityGroups': {},
    }

    # Also build grouped version
    for f in files:
        pri = f['priority']
        key = str(pri)
        if key not in manifest['priorityGroups']:
            manifest['priorityGroups'][key] = []
        manifest['priorityGroups'][key].append(f['url'])

    out_path = os.path.join(brand_dir, 'sw-manifest.json')
    with open(out_path, 'w') as fp:
        json.dump(manifest, fp, indent=2)

    print(f"Generated sw-manifest.json: {len(files)} files")
    for pri_key in sorted(manifest['priorityGroups'].keys()):
        count = len(manifest['priorityGroups'][pri_key])
        print(f"  Priority {pri_key}: {count} files")


if __name__ == '__main__':
    main()

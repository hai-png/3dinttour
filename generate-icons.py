#!/usr/bin/env python3
"""Generate favicons and PWA icons from brand logos."""
import os, json
from PIL import Image

def generate_from_logo(brand, out_dir):
    base = os.path.dirname(os.path.abspath(__file__))
    cfg_path = os.path.join(base, f'_brands/{brand}/brand-config.json')
    with open(cfg_path) as f:
        cfg = json.load(f)
    logo_rel = cfg.get('brand', {}).get('logo', '')
    logo_path = os.path.join(base, '_brands', brand, logo_rel)
    if not os.path.exists(logo_path):
        print(f"  ✗ Logo not found: {logo_path}")
        return
    print(f"  Source: {logo_rel} ({os.path.getsize(logo_path)/1024:.1f} KB)")
    logo = Image.open(logo_path).convert('RGBA')
    bbox = logo.getbbox()
    if bbox:
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        side = max(w, h)
        cx, cy = bbox[0]+w//2, bbox[1]+h//2
        crop = (max(0,cx-side//2), max(0,cy-side//2),
                min(logo.width,cx+side//2), min(logo.height,cy+side//2))
        sq = logo.crop(crop)
    else:
        sq = logo
    for name, size in [('icon-192.png',192),('icon-512.png',512)]:
        sq.resize((size,size), Image.LANCZOS).save(os.path.join(out_dir,name),'PNG')
        print(f"  ✓ {name} ({size}x{size})")
    sq.resize((32,32), Image.LANCZOS).save(os.path.join(out_dir,'favicon.ico'),'ICO')
    print(f"  ✓ favicon.ico (32x32)")

base = os.path.dirname(os.path.abspath(__file__))
for brand in ['demahope','metropolitan','gift','ayat']:
    print(f"=== {brand} ===")
    generate_from_logo(brand, os.path.join(base, f'_brands/{brand}'))
    print()

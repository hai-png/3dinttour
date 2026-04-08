#!/usr/bin/env bash
#
# scaffold-brand.sh — Create a new brand source folder with template files
#
# Usage:
#   ./scripts/scaffold-brand.sh <brand-name>
#
# Creates _brands/<brand-name>/ with all required directories and
# template config files ready for customization.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BRANDS_DIR="$ROOT_DIR/_brands"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

info()  { echo -e "${CYAN}[scaffold]${NC} $*"; }
ok()    { echo -e "${GREEN}[scaffold]${NC} ✓ $*"; }
warn()  { echo -e "${YELLOW}[scaffold]${NC} ⚠ $*"; }
err()   { echo -e "${RED}[scaffold]${NC} ✗ $*" >&2; exit 1; }

BRAND_NAME="${1:-}"

if [ -z "$BRAND_NAME" ]; then
  echo ""
  echo "  Scaffold a new brand source folder"
  echo ""
  echo "  Usage:  ./scripts/scaffold-brand.sh <brand-name>"
  echo ""
  echo "  Creates: _brands/<brand-name>/ with template config files"
  echo ""
  exit 1
fi

BRAND_DIR="$BRANDS_DIR/$BRAND_NAME"

if [ -d "$BRAND_DIR" ]; then
  err "Brand already exists: $BRAND_DIR"
fi

info "Creating brand source: $BRAND_DIR"

# Create complete directory structure (all folders the manifest scanner expects)
mkdir -p "$BRAND_DIR"/{project/{gallery,floor-plans,amenities,hotspots,hero-image-video},model,unit-image-video,panorama,3d-floor-plan,2d-floor-plan,hdr}

ok "Directory structure created"

# Generate brand-config.json with placeholders
cat > "$BRAND_DIR/brand-config.json" << EOF
{
  "version": "1.0.0",

  "brand": {
    "companyName": "$(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')",
    "shortName": "$BRAND_NAME",
    "tagline": "Your tagline here",
    "logo": "project/logo.png",
    "developerLogo": "project/logo.png"
  },

  "theme": {
    "primary": "#1a5276",
    "primaryDark": "#0e3a56",
    "primaryLight": "#2980b9",
    "primaryAlpha": "rgba(26,82,118,.15)",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "info": "#3b82f6",
    "background": "#f4f5f7",
    "card": "#ffffff",
    "cardAlt": "#f9fafb",
    "input": "#ffffff",
    "textPrimary": "#1a1a2e",
    "textSecondary": "#555570",
    "textMuted": "#8888a0",
    "borderLight": "rgba(0,0,0,.08)",
    "borderMedium": "rgba(0,0,0,.14)",
    "dark": {
      "background": "#0a1628",
      "card": "#132238",
      "cardAlt": "#1a2d45",
      "input": "#1e3450",
      "textPrimary": "#e8e8e8",
      "textSecondary": "#b0b8c4",
      "textMuted": "#7a8594",
      "borderLight": "rgba(255,255,255,.08)",
      "borderMedium": "rgba(255,255,255,.15)"
    }
  },

  "pwa": {
    "name": "$(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g') Property Tours",
    "shortName": "$(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g') Tours",
    "description": "Explore properties with $(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')",
    "themeColor": "#0a1628",
    "backgroundColor": "#0a1628",
    "icon192": "icon-192.png",
    "icon512": "icon-512.png"
  },

  "contact": {
    "phones": [
      {
        "label": "Hotline",
        "value": "+251900000000",
        "tel": "tel:+251900000000",
        "display": "+251 900 000 000",
        "primary": true
      }
    ],
    "emails": [
      {
        "label": "General Inquiry",
        "value": "info@$(echo "$BRAND_NAME" | tr '[:upper:]' '[:lower:]').com",
        "mailto": "mailto:info@$(echo "$BRAND_NAME" | tr '[:upper:]' '[:lower:]').com",
        "primary": true
      }
    ],
    "whatsapp": {
      "enabled": true,
      "number": "+251900000000",
      "display": "+251 900 000 000",
      "message": "Hello $(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g'), I'm interested in learning more about your properties."
    },
    "social": {
      "facebook": { "enabled": false },
      "twitter": { "enabled": false },
      "youtube": { "enabled": false },
      "instagram": { "enabled": false },
      "tiktok": { "enabled": false }
    },
    "address": "Addis Ababa, Ethiopia",
    "website": "https://$(echo "$BRAND_NAME" | tr '[:upper:]' '[:lower:]').com",
    "businessHours": "Monday–Saturday: 8:00 AM – 5:00 PM | Sunday: Closed"
  },

  "project": {
    "name": "Project Name",
    "description": "Project description here",
    "location": "Addis Ababa",
    "buildingType": "Residential",
    "buildingSize": "B+G+10",
    "deliveryTime": "24 Months",
    "coordinates": { "lat": 9.0100, "lng": 38.7800 }
  },

  "auth": {
    "adminEmails": ["admin@$(echo "$BRAND_NAME" | tr '[:upper:]' '[:lower:]').com"],
    "note": "Demo credentials removed for security. Use Firebase Auth for production authentication. See firebase-config.js for Firebase setup."
  },

  "contactForm": {
    "enabled": true,
    "endpoint": "https://your-backend.com/api/contact",
    "fields": [
      { "name": "contact_name", "label": "Your Name", "type": "text", "required": true, "placeholder": "Your Name" },
      { "name": "contact_email", "label": "Your Email", "type": "email", "required": true, "placeholder": "Your Email" },
      { "name": "contact_phone", "label": "Your Phone", "type": "tel", "required": false, "placeholder": "Your Phone" },
      { "name": "contact_content", "label": "Message", "type": "textarea", "required": true, "placeholder": "Type your message..." }
    ],
    "submitButton": { "label": "Send Message", "icon": "send" }
  },

  "displaySettings": {
    "showPhones": true,
    "showEmails": true,
    "showSocial": true,
    "showWhatsApp": true,
    "showContactForm": true,
    "showBusinessHours": true
  },

  "ui": {
    "labels": {
      "detailsPanel": "Details",
      "searchPanel": "Unit Search",
      "searchPlaceholder": "Search units...",
      "searchButton": "Search",
      "resetButton": "Reset",
      "galleryLabel": "Gallery",
      "contactButton": "Contact",
      "detailsButton": "Details",
      "installButton": "Install",
      "adminLoginTitle": "Admin Login",
      "floorPlanTitle": "3D Floor Plan",
      "panoramaTitle": "Panorama",
      "adminAccessTitle": "Admin Access",
      "availabilityTitle": "Availability",
      "enterButton": "Explore Now",
      "loadingFloorPlan": "Loading 3D Floor Plan...",
      "loadingGeneric": "Loading..."
    },
    "filters": {
      "allTypes": "All Types",
      "allStatus": "All Status",
      "allFloors": "All Floors"
    },
    "statusLabels": {
      "available": "Available",
      "reserved": "Reserved",
      "sold": "Sold",
      "unavailable": "Unavailable"
    },
    "unitDetail": {
      "typeLabel": "Type",
      "floorLabel": "Floor",
      "areaLabel": "Area",
      "priceLabel": "Price",
      "viewAreaDetails": "View Area Details",
      "areaNet": "Net",
      "areaCommon": "Common",
      "areaTotal": "Total",
      "floorPlan": "Floor Plan",
      "panorama": "Panorama",
      "action3DPlan": "3D Plan"
    },
    "projectDetail": {
      "locationLabel": "Location",
      "structureLabel": "Structure",
      "lotLabel": "Lot",
      "deliveryLabel": "Delivery",
      "unitsLabel": "Units",
      "floorsLabel": "Floors",
      "parkingLabel": "Parking",
      "basementLabel": "Basement",
      "amenitiesSection": "Amenities & Features",
      "nearbySection": "Nearby",
      "contactSection": "Contact Us",
      "openInMaps": "Open in Maps",
      "callButton": "Call",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "shareButton": "Share"
    },
    "contact": {
      "sectionPhones": "Phone Numbers",
      "sectionEmail": "Email",
      "sectionWhatsApp": "WhatsApp",
      "sectionSocial": "Follow Us",
      "sectionForm": "Send Message",
      "chatWithUs": "Chat with us",
      "callNow": "Call Now",
      "whatsappLabel": "WhatsApp",
      "emailLabel": "Email",
      "shareLabel": "Share",
      "messageSuccess": "Thank you! Your message has been sent successfully.",
      "messageError": "Sorry, there was an error sending your message. Please try again."
    },
    "install": {
      "title": "Install This App",
      "description": "Add this app to your home screen or desktop for offline access anytime.",
      "button": "Install Now",
      "successMessage": "App installed successfully!",
      "dismissMessage": "Install dismissed. You can try again anytime."
    },
    "update": {
      "title": "New Version Available",
      "description": "Update to get the latest features and improvements.",
      "button": "Update Now"
    },
    "intro": {
      "loadingText": "Loading Tour...",
      "loadingLocation": "Loading...",
      "tagline": "Interactive 3D Tour"
    },
    "empty": {
      "noUnitsFound": "No units found",
      "noUnitsAdmin": "📭 No units found",
      "addDataHint": "Add data to Firebase /availability/ path"
    }
  },

  "seo": {
    "metaDescription": "Explore modern apartments with 3D interactive tours by $(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g'). View unit availability, floor plans, and amenities.",
    "offlinePageTitle": "Offline - $(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')"
  },

  "messages": {
    "auth": {
      "invalidEmail": "Invalid email address.",
      "accountDisabled": "Account disabled. Contact admin.",
      "authFailed": "Authentication failed.",
      "invalidCredentials": "Invalid credentials.",
      "signIn": "Sign In",
      "signingIn": "Signing in...",
      "signedIn": "Signed in successfully.",
      "signedOut": "Signed out successfully.",
      "signInBtn": "Sign In"
    },
    "availability": {
      "updating": "Updating...",
      "updated": "Availability updated.",
      "offline": "Offline - changes will sync when online.",
      "updateFailed": "Update failed.",
      "unsaved": "Unsaved",
      "statusLabel": "Status",
      "notesLabel": "Notes (optional)",
      "notesPlaceholder": "Add notes...",
      "loginBtn": "Login",
      "offlineMessage": "Offline - changes will sync when connection is restored"
    },
    "connection": {
      "restored": "Connection restored - syncing changes...",
      "offline": "You are now offline - changes will sync when connected.",
      "offlineReady": "Ready for offline"
    },
    "share": {
      "linkCopied": "Link copied to clipboard!"
    }
  }
}
EOF

ok "brand-config.json created"

# Generate manifest.json
cat > "$BRAND_DIR/manifest.json" << EOF
{
  "name": "$(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g') Property Tours",
  "short_name": "$(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')",
  "description": "Explore properties with $(echo "$BRAND_NAME" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')",
  "start_url": "./?utm_source=pwa",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0a1628",
  "theme_color": "#0a1628",
  "orientation": "any",
  "categories": ["business", "lifestyle"],
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
EOF

ok "manifest.json created"

# Generate minimal tour-data.json
cat > "$BRAND_DIR/tour-data.json" << 'EOF'
{
  "version": 4,
  "projectName": "Project Name",
  "projectDescription": "Project description",
  "projectDetails": {
    "location": "Addis Ababa",
    "buildingType": "Residential",
    "buildingSize": "B+G+10",
    "lotSize": "",
    "deliveryTime": "24 Months",
    "parking": "Underground",
    "garage": "1 per unit",
    "basement": "Yes",
    "unitsPerFloor": 6,
    "totalFloors": 10,
    "totalUnits": 60
  },
  "coordinates": { "lat": 9.0100, "lng": 38.7800 },
  "defaultCamera": { "x": 0, "y": 5, "z": 25 },
  "defaultTarget": { "x": 0, "y": 5, "z": 0 },
  "modelFile": "model/building.glb",
  "modelTransform": { "position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1] },
  "hdri": "hdr/environment.hdr",
  "statusColors": { "Available": "#22c55e", "Reserved": "#f59e0b", "Sold": "#ef4444" },
  "media": {
    "developerLogo": "project/logo.png",
    "heroImage": "",
    "heroVideo": "project/hero-image-video/mainsowreel.mp4",
    "projectFloorPlan": "project/floor-plans/floorplan.jpg",
    "amenityImages": [],
    "amenityVideos": [],
    "environmentMaps": [],
    "buildingModel": "model/building.glb"
  },
  "nearbyAttractions": [],
  "publicFacilities": {
    "schools": [],
    "hospitals": [],
    "shopping": [],
    "restaurants": [],
    "transport": []
  },
  "amenities": [],
  "features": [],
  "hotspots": [],
  "unitTypes": {},
  "units": [],
  "gallery": []
}
EOF

ok "tour-data.json created"

# Add placeholder icon files (1x1 pixel PNGs)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$BRAND_DIR/icon-192.png"
cp "$BRAND_DIR/icon-192.png" "$BRAND_DIR/icon-512.png"

ok "Placeholder icons created (replace with real icons)"

echo ""
info "Brand '$BRAND_NAME' scaffolded at: $BRAND_DIR"
info ""
info "Next steps:"
info "  1. Edit _brands/$BRAND_NAME/brand-config.json"
info "  2. Edit _brands/$BRAND_NAME/manifest.json"
info "  3. Edit _brands/$BRAND_NAME/tour-data.json"
info "  4. Add media: logo, 3D model, photos, videos…"
info "  5. Add to brands.json registry"
info "  6. Build: ./scripts/build-brand.sh $BRAND_NAME"
echo ""

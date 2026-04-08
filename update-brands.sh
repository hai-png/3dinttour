#!/bin/bash
# Update brand configurations with scraped data

set -e

echo "=========================================="
echo "Updating Brand Configurations"
echo "=========================================="

# Update Dema Hope
echo ""
echo "Updating Dema Hope Real Estate..."
cat > /tmp/demahope-config.json << 'EOF'
{
  "version": "1.1.0",
  "brand": {
    "companyName": "Dema Hope Real Estate",
    "shortName": "Dema Hope",
    "tagline": "Elevate Your Lifestyle",
    "logo": "project/demahope-logo.png",
    "developerLogo": "project/demahope-logo.png"
  },
  "theme": {
    "primary": "#1a472a",
    "primaryDark": "#0e2e1b",
    "primaryLight": "#2d6b3f",
    "primaryAlpha": "rgba(26,71,42,.15)",
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
      "background": "#0a1a0f",
      "card": "#13281a",
      "cardAlt": "#1a3324",
      "input": "#1e3d2a",
      "textPrimary": "#e8e8e8",
      "textSecondary": "#b0b8c4",
      "textMuted": "#7a8594",
      "borderLight": "rgba(255,255,255,.08)",
      "borderMedium": "rgba(255,255,255,.15)"
    }
  },
  "pwa": {
    "name": "Dema Hope Property Tours",
    "shortName": "Dema Hope",
    "description": "Explore luxury properties with Dema Hope Real Estate — Trust, Quality, Speed. The Reliable Leaders of Ethiopian Real Estate.",
    "themeColor": "#0a1a0f",
    "backgroundColor": "#0a1a0f",
    "icon192": "icon-192.png",
    "icon512": "icon-512.png"
  },
  "contact": {
    "phones": [
      {
        "label": "Hotline",
        "value": "+251951515174",
        "tel": "tel:+251951515174",
        "display": "+251 951 515 174",
        "primary": true
      },
      {
        "label": "Office",
        "value": "+251951515111",
        "tel": "tel:+251951515111",
        "display": "+251 9 51 51 51 11"
      },
      {
        "label": "Mobile",
        "value": "+251951515127",
        "tel": "tel:+251951515127",
        "display": "+251 9 51 51 51 27"
      }
    ],
    "emails": [
      {
        "label": "General Inquiry",
        "value": "info@demahoperealestate.com",
        "mailto": "mailto:info@demahoperealestate.com",
        "primary": true
      },
      {
        "label": "Sales",
        "value": "sales@demahoperealestate.com",
        "mailto": "mailto:sales@demahoperealestate.com"
      }
    ],
    "whatsapp": {
      "enabled": true,
      "number": "+251951515174",
      "display": "+251 951 515 174",
      "message": "Hello Dema Hope Real Estate, I'm interested in learning more about your properties."
    },
    "social": {
      "facebook": { "enabled": true, "url": "https://www.facebook.com/demahoperealestate/", "handle": "@demahoperealestate" },
      "instagram": { "enabled": true, "url": "https://www.instagram.com/demahoperealestate/", "handle": "@demahoperealestate" },
      "youtube": { "enabled": true, "url": "https://www.youtube.com/@demahoperealestate", "handle": "Dema Hope Real Estate" },
      "linkedin": { "enabled": true, "url": "https://www.linkedin.com/company/demahoperealestate", "handle": "Dema Hope Real Estate" },
      "twitter": { "enabled": false },
      "tiktok": { "enabled": false }
    },
    "address": "4th Floor, Dema Hope Prime, Signal Area, Addis Ababa, Ethiopia",
    "website": "https://demahoperealestate.com/",
    "businessHours": "Monday–Saturday: 8:00 AM – 5:00 PM | Sunday: Closed"
  },
  "project": {
    "name": "Dema Hope Prime",
    "description": "Premium residential and commercial spaces near Signal Area. 1, 2, and 3-bedroom apartments, luxury penthouses, and commercial retail shops. Features include EV charging, gym & spa, 24/7 water, standby generators, swimming pools, landscaped gardens, play areas, and 24/7 security.",
    "location": "Signal Area, Addis Ababa",
    "buildingType": "Residential & Commercial",
    "buildingSize": "B+G+15",
    "deliveryTime": "18 Months",
    "coordinates": { "lat": 9.0150, "lng": 38.7650 }
  },
  "projects": {
    "demahope-prime": {
      "name": "Dema Hope Prime",
      "location": "Signal Area, Addis Ababa",
      "description": "Flagship development with premium apartments and commercial spaces",
      "status": "selling",
      "buildingSize": "B+G+15",
      "deliveryTime": "18 Months"
    },
    "bole-downtown": {
      "name": "Bole Downtown",
      "location": "Bole Medhanialem / Edna Mall Area, Addis Ababa",
      "description": "Luxury development in the heart of Bole",
      "status": "selling",
      "buildingSize": "B+G+20",
      "deliveryTime": "24 Months"
    },
    "bole-adey-abeba": {
      "name": "Bole Adey Abeba",
      "location": "Bole Area, Addis Ababa",
      "description": "Modern apartments near Yellow Flower",
      "status": "selling",
      "buildingSize": "B+G+18",
      "deliveryTime": "20 Months"
    },
    "shola-mountain-view": {
      "name": "Shola Mountain View",
      "location": "Shola Area (Yeka Mountain slopes), Addis Ababa",
      "description": "Scenic residences with mountain views",
      "status": "selling",
      "buildingSize": "B+G+12",
      "deliveryTime": "18 Months"
    },
    "bole-central": {
      "name": "Bole Central",
      "location": "Bole Area, Addis Ababa",
      "description": "Announced luxury development",
      "status": "announced",
      "buildingSize": "TBA",
      "deliveryTime": "TBA"
    },
    "bole-skyline": {
      "name": "Bole Skyline",
      "location": "Bole Area, Addis Ababa",
      "description": "Announced premium tower",
      "status": "announced",
      "buildingSize": "TBA",
      "deliveryTime": "TBA"
    }
  },
  "amenities": [
    "EV Charging Station",
    "Gym & Spa",
    "24/7 Water Supply",
    "Standby Generator",
    "Swimming Pool",
    "Landscaped Gardens",
    "Children's Play Area",
    "24/7 Security",
    "Occasion Halls",
    "Commercial Retail Spaces",
    "Underground Parking"
  ],
  "unitTypes": {
    "1br": { "name": "1 Bedroom", "bedrooms": 1, "bathrooms": 1, "finish": "Full Finished / Semi-Finished" },
    "2br": { "name": "2 Bedroom", "bedrooms": 2, "bathrooms": 1, "finish": "Full Finished / Semi-Finished" },
    "3br": { "name": "3 Bedroom", "bedrooms": 3, "bathrooms": 2, "finish": "Full Finished / Semi-Finished" },
    "penthouse": { "name": "Luxury Penthouse", "bedrooms": 4, "bathrooms": 3, "finish": "Full Finished" },
    "commercial": { "name": "Commercial Shop", "bedrooms": 0, "bathrooms": 1, "finish": "Semi-Finished" }
  },
  "auth": {
    "adminEmails": ["admin@demahoperealestate.com"]
  },
  "contactForm": {
    "enabled": true,
    "endpoint": "https://demahoperealestate.com/wp-admin/admin-ajax.php",
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
  }
}
EOF

cp /tmp/demahope-config.json _brands/demahope/brand-config.json
echo "✓ Dema Hope updated"

# Update Metropolitan
echo ""
echo "Updating Metropolitan Real Estate..."
cat > /tmp/metropolitan-config.json << 'EOF'
{
  "version": "1.1.0",
  "brand": {
    "companyName": "Metropolitan Real Estate PLC",
    "shortName": "Metropolitan",
    "tagline": "Crafted to Perfection",
    "logo": "project/metropolitan-logo.png",
    "developerLogo": "project/metropolitan-logo.png"
  },
  "theme": {
    "primary": "#2c3e50",
    "primaryDark": "#1a252f",
    "primaryLight": "#34495e",
    "primaryAlpha": "rgba(44,62,80,.15)",
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
      "background": "#0f1520",
      "card": "#1a2332",
      "cardAlt": "#222d3d",
      "input": "#2a3545",
      "textPrimary": "#e8e8e8",
      "textSecondary": "#b0b8c4",
      "textMuted": "#7a8594",
      "borderLight": "rgba(255,255,255,.08)",
      "borderMedium": "rgba(255,255,255,.15)"
    }
  },
  "pwa": {
    "name": "Metropolitan Property Tours",
    "shortName": "Metropolitan",
    "description": "Explore extraordinary living experiences with Metropolitan Real Estate — Where attention to detail meets exceptional living",
    "themeColor": "#0f1520",
    "backgroundColor": "#0f1520",
    "icon192": "icon-192.png",
    "icon512": "icon-512.png"
  },
  "contact": {
    "phones": [
      {
        "label": "Ethiopia",
        "value": "+251973404040",
        "tel": "tel:+251973404040",
        "display": "+251 973 40 40 40",
        "primary": true
      },
      {
        "label": "Ethiopia Alt",
        "value": "+251973303030",
        "tel": "tel:+251973303030",
        "display": "+251 973 30 30 30"
      },
      {
        "label": "USA",
        "value": "+14802802242",
        "tel": "tel:+14802802242",
        "display": "+1 480 280 2242"
      },
      {
        "label": "Short Code",
        "value": "9896",
        "tel": "tel:9896",
        "display": "9896"
      }
    ],
    "emails": [
      {
        "label": "General Inquiry",
        "value": "info@metropolitanaddis.com",
        "mailto": "mailto:info@metropolitanaddis.com",
        "primary": true
      },
      {
        "label": "Marketing",
        "value": "marketing@metropolitanaddis.com",
        "mailto": "mailto:marketing@metropolitanaddis.com"
      }
    ],
    "whatsapp": {
      "enabled": true,
      "number": "+251973404040",
      "display": "+251 973 40 40 40",
      "message": "Hello Metropolitan Real Estate, I'm interested in learning more about your properties."
    },
    "social": {
      "facebook": { "enabled": true, "url": "https://www.facebook.com/metropolitanaddis/", "handle": "@metropolitanaddis" },
      "instagram": { "enabled": true, "url": "https://www.instagram.com/metropolitanaddis/", "handle": "@metropolitanaddis" },
      "twitter": { "enabled": true, "url": "https://twitter.com/metropolitanaddis", "handle": "@metropolitanaddis" },
      "youtube": { "enabled": true, "url": "https://www.youtube.com/@metropolitanaddis", "handle": "Metropolitan Real Estate" },
      "linkedin": { "enabled": true, "url": "https://www.linkedin.com/company/metropolitanaddis", "handle": "Metropolitan Real Estate PLC" },
      "tiktok": { "enabled": false }
    },
    "address": "Bole Rwanda, Infront of Mamokacha, Addis Ababa, Ethiopia | USA: 28775 W Ray Rd #6-444, Chandler, AZ 85224",
    "website": "https://metropolitanaddis.com/",
    "businessHours": "Monday–Saturday: 8:00 AM – 5:00 PM | Sunday: Closed"
  },
  "project": {
    "name": "Metropolitan Residence",
    "description": "Luxury Line — Where attention to detail meets exceptional living. Creating extraordinary living experiences in Addis Ababa's prime locations.",
    "location": "Bole Rwanda, Addis Ababa",
    "buildingType": "Luxury Residential",
    "buildingSize": "B+G+20",
    "deliveryTime": "12 Months",
    "coordinates": { "lat": 9.0100, "lng": 38.7800 }
  },
  "projects": {
    "metropolitan-residence": {
      "name": "Metropolitan Residence",
      "location": "Bole Rwanda, Addis Ababa",
      "description": "Luxury apartments in prime Bole location",
      "status": "selling",
      "line": "Luxury",
      "buildingSize": "B+G+20",
      "deliveryTime": "12 Months"
    },
    "metropolitan-tower": {
      "name": "Metropolitan Tower",
      "location": "Bole, Addis Ababa",
      "description": "Iconic luxury tower",
      "status": "selling",
      "line": "Luxury",
      "buildingSize": "B+G+25",
      "deliveryTime": "18 Months"
    },
    "bole-midtown": {
      "name": "Bole Midtown",
      "location": "Bole, Addis Ababa",
      "description": "Luxury development in central Bole",
      "status": "sold-out",
      "line": "Luxury"
    },
    "sarbet-gabriel": {
      "name": "Sarbet Gabriel",
      "location": "Sarbet, Addis Ababa",
      "description": "First luxury project - Sold out",
      "status": "sold-out",
      "line": "Luxury",
      "deliveryTime": "12 Months"
    },
    "central-tower": {
      "name": "Central Tower",
      "location": "Addis Ababa",
      "description": "Premium central location development",
      "status": "selling",
      "line": "Luxury"
    },
    "westview": {
      "name": "WestView",
      "location": "Addis Ababa",
      "description": "Quality standard line with affordability",
      "status": "selling",
      "line": "Standard"
    }
  },
  "auth": {
    "adminEmails": ["admin@metropolitanaddis.com"]
  },
  "contactForm": {
    "enabled": true,
    "endpoint": "https://metropolitanaddis.com/wp-admin/admin-ajax.php",
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
  }
}
EOF

cp /tmp/metropolitan-config.json _brands/metropolitan/brand-config.json
echo "✓ Metropolitan updated"

# Update GIFT Real Estate
echo ""
echo "Updating GIFT Real Estate..."
cat > /tmp/gift-config.json << 'EOF'
{
  "version": "1.1.0",
  "brand": {
    "companyName": "GIFT Real Estate P.L.C.",
    "shortName": "GIFT Real Estate",
    "tagline": "We Build Community!",
    "logo": "project/gift-logo.png",
    "developerLogo": "project/gift-logo.png"
  },
  "theme": {
    "primary": "#c0392b",
    "primaryDark": "#922b21",
    "primaryLight": "#e74c3c",
    "primaryAlpha": "rgba(192,57,43,.15)",
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
      "background": "#1a0a0a",
      "card": "#2a1313",
      "cardAlt": "#3a1a1a",
      "input": "#452020",
      "textPrimary": "#e8e8e8",
      "textSecondary": "#b0b8c4",
      "textMuted": "#7a8594",
      "borderLight": "rgba(255,255,255,.08)",
      "borderMedium": "rgba(255,255,255,.15)"
    }
  },
  "pwa": {
    "name": "GIFT Property Tours",
    "shortName": "GIFT Tours",
    "description": "Explore properties with GIFT Real Estate — Building communities since 2005. Part of GIFT Business Group.",
    "themeColor": "#1a0a0a",
    "backgroundColor": "#1a0a0a",
    "icon192": "icon-192.png",
    "icon512": "icon-512.png"
  },
  "contact": {
    "phones": [
      {
        "label": "Hotline",
        "value": "+251930076726",
        "tel": "tel:+251930076726",
        "display": "+251 930 076 726",
        "primary": true
      },
      {
        "label": "Office",
        "value": "+251912507906",
        "tel": "tel:+251912507906",
        "display": "+251 912 507 906"
      }
    ],
    "emails": [
      {
        "label": "General Inquiry",
        "value": "info@giftrealestate.com.et",
        "mailto": "mailto:info@giftrealestate.com.et",
        "primary": true
      },
      {
        "label": "Sales",
        "value": "sales@giftrealestate.com.et",
        "mailto": "mailto:sales@giftrealestate.com.et"
      }
    ],
    "whatsapp": {
      "enabled": true,
      "number": "+251930076726",
      "display": "+251 930 076 726",
      "message": "Hello GIFT Real Estate, I'm interested in learning more about your properties."
    },
    "social": {
      "facebook": { "enabled": true, "url": "https://www.facebook.com/giftrealestate", "handle": "@giftrealestate" },
      "twitter": { "enabled": true, "url": "https://twitter.com/giftrealestate", "handle": "@giftrealestate" },
      "youtube": { "enabled": true, "url": "https://www.youtube.com/@giftrealestate", "handle": "GIFT Real Estate" },
      "telegram": { "enabled": true, "url": "https://t.me/giftrealestate", "handle": "@giftrealestate" },
      "instagram": { "enabled": false },
      "linkedin": { "enabled": false },
      "tiktok": { "enabled": false }
    },
    "address": "Africa Avenue, Near To Getu Commercial, 5th & 6th Floor, Addis Ababa, Ethiopia",
    "website": "https://giftrealestate.com.et/",
    "businessHours": "Monday–Saturday: 8:00 AM – 5:00 PM | Sunday: Closed"
  },
  "project": {
    "name": "La Gare",
    "description": "Commercial & residential apartments in prime Addis Ababa locations. One of Ethiopia's pioneering real estate companies since 2005.",
    "location": "Addis Ababa",
    "buildingType": "Residential & Commercial",
    "buildingSize": "B+G+12",
    "deliveryTime": "24 Months",
    "coordinates": { "lat": 9.0300, "lng": 38.7500 }
  },
  "projects": {
    "la-gare-1br": {
      "name": "La Gare One Bedroom",
      "location": "La Gare, Addis Ababa",
      "description": "Residential/Commercial Apartment - 65.07 sq.mt",
      "status": "selling",
      "type": "Residential/Commercial Apartment",
      "size": "65.07 sq.mt",
      "layout": "1 Bed, 1 Bath",
      "mapsUrl": "https://maps.app.goo.gl/dtToLuWiNfy6tVNFA"
    },
    "la-gare-2br": {
      "name": "La Gare Two Bedroom",
      "location": "La Gare, Addis Ababa",
      "description": "Residential/Commercial Apartment - 108-141 sq.mt",
      "status": "selling",
      "type": "Residential/Commercial Apartment",
      "size": "108-141 sq.mt",
      "layout": "2 Beds, 2 Baths",
      "mapsUrl": "https://maps.app.goo.gl/dtToLuWiNfy6tVNFA"
    },
    "la-gare-3br": {
      "name": "La Gare Three Bedroom",
      "location": "La Gare, Addis Ababa",
      "description": "Residential/Commercial Apartment - 163 sq.mt",
      "status": "selling",
      "type": "Residential/Commercial Apartment",
      "size": "163 sq.mt",
      "layout": "3 Beds, 2 Baths",
      "mapsUrl": "https://maps.app.goo.gl/dtToLuWiNfy6tVNFA"
    },
    "la-gare-shops": {
      "name": "La Gare Shops",
      "location": "La Gare, Addis Ababa",
      "description": "Commercial Apartment - 60-108 sq.mt",
      "status": "selling",
      "type": "Commercial Apartment",
      "size": "60-108 sq.mt",
      "layout": "1 Bath",
      "mapsUrl": "https://maps.app.goo.gl/dtToLuWiNfy6tVNFA"
    },
    "ayat-feres-bet": {
      "name": "Ayat Feres Bet Four Bedroom",
      "location": "Ayat Feres Bet, Addis Ababa",
      "description": "Residential Apartment - 153 sq.mt",
      "status": "selling",
      "type": "Residential Apartment",
      "size": "153 sq.mt",
      "layout": "4 Beds, 3 Baths"
    },
    "bole-atlas-3br": {
      "name": "Bole Atlas Three Bedroom",
      "location": "Mike Leyland Street, Addis Ababa",
      "description": "Residential Apartment - 216.97 sq.mt",
      "status": "selling",
      "type": "Residential Apartment",
      "size": "216.97 sq.mt",
      "layout": "3 Beds, 3 Baths"
    },
    "bole-atlas-shops": {
      "name": "Bole Atlas Shops",
      "location": "Mike Leyland Street, Addis Ababa",
      "description": "Commercial Apartment - 40-173 sq.mt",
      "status": "selling",
      "type": "Commercial Apartment",
      "size": "40-173 sq.mt",
      "layout": "1 Bath"
    },
    "teklehaimanot-1br": {
      "name": "Teklehaimanot Site One Bedroom",
      "location": "2PGV+W8R Tekle Himanot Orthodox Church, Merkato, Addis Ababa",
      "description": "Residential Apartment - 81.66 sq.mt",
      "status": "selling",
      "type": "Residential Apartment",
      "size": "81.66 sq.mt",
      "layout": "1 Bed, 1 Bath"
    },
    "teklehaimanot-2br": {
      "name": "Teklehaimanot Site Two Bedroom",
      "location": "2PGV+W8R Tekle Himanot Orthodox Church, Merkato, Addis Ababa",
      "description": "Residential Apartment - 95.20 sq.mt",
      "status": "selling",
      "type": "Residential Apartment",
      "size": "95.20 sq.mt",
      "layout": "2 Beds, 1 Bath"
    }
  },
  "auth": {
    "adminEmails": ["admin@giftrealestate.com.et"]
  },
  "contactForm": {
    "enabled": true,
    "endpoint": "https://giftrealestate.com.et/wp-admin/admin-ajax.php",
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
  }
}
EOF

cp /tmp/gift-config.json _brands/gift/brand-config.json
echo "✓ GIFT Real Estate updated"

echo ""
echo "=========================================="
echo "Configuration updates complete!"
echo "=========================================="

# 🎨 Rebranding Guide - Single File Configuration

## Quick Start

To rebrand the entire app for a new company, edit **only one file**: `brand-config.json`

No need to touch `index.html`, CSS, JavaScript, or any other file.

---

## Current Brand: Hosea Real Estate

The app is currently configured for **Hosea Real Estate**.

---

## What's Configurable in `brand-config.json`

| Section | What It Controls |
|---------|-----------------|
| **`brand`** | Company name, logo, tagline, short name |
| **`theme`** | All colors (primary, dark mode, accents, backgrounds) |
| **`pwa`** | App name, description, install prompt, icons |
| **`contact`** | Phones, emails, WhatsApp, social media, address, website |
| **`project`** | Building name, description, location, type, size |
| **`auth`** | Demo login credentials, admin emails |
| **`contactForm`** | Form endpoint, fields, submit button |
| **`displaySettings`** | Toggle phones, emails, social, WhatsApp, contact form |

---

## Example: Rebrand for "Acme Real Estate"

Just replace `brand-config.json` with:

```json
{
  "brand": {
    "companyName": "Acme Real Estate",
    "shortName": "Acme Tours",
    "tagline": "Find your dream property with Acme",
    "logo": "project/acme-logo.png",
    "developerLogo": "project/acme-logo.png"
  },
  "theme": {
    "primary": "#1e88e5",
    "primaryDark": "#1565c0",
    "primaryLight": "#64b5f6",
    "primaryAlpha": "rgba(30,136,229,.15)"
  },
  "contact": {
    "phones": [
      { "label": "Office", "value": "+1-555-0100", "tel": "tel:+15550100", "primary": true }
    ],
    "emails": [
      { "label": "Sales", "value": "sales@acme.com", "mailto": "mailto:sales@acme.com", "primary": true }
    ],
    "whatsapp": { "enabled": true, "number": "+15550100", "message": "Hello Acme, I'm interested in your properties." },
    "social": {
      "facebook": { "enabled": true, "url": "https://facebook.com/acme", "handle": "@acme" }
    },
    "address": "123 Main Street, New York, NY",
    "website": "https://acme.com"
  },
  "auth": {
    "demoUsers": {
      "admin@acme.com": { "password": "admin123", "name": "Admin", "role": "admin" },
      "agent@acme.com": { "password": "agent123", "name": "Agent", "role": "agent" }
    },
    "adminEmails": ["admin@acme.com", "agent@acme.com"]
  },
  "project": {
    "name": "Skyline Towers",
    "description": "Luxury apartments in Manhattan.",
    "location": "Manhattan, New York",
    "buildingType": "Residential",
    "buildingSize": "B+G+30",
    "deliveryTime": "24 Months"
  }
}
```

**Refresh the page** → entire app rebranded automatically.

---

## What Updates Automatically

When you change `brand-config.json` and refresh:

✅ **Colors** — buttons, links, accents, dark mode  
✅ **Logo** — header, PWA, developer badge  
✅ **Company name** — title, contact modal, share dialogs  
✅ **Phone numbers** — call buttons, contact panel  
✅ **Emails** — email buttons, contact form  
✅ **WhatsApp** — chat links, contact panel  
✅ **Social media** — links in contact modal  
✅ **Address** — contact modal, project details  
✅ **Auth credentials** — login form hints, error messages  
✅ **Admin emails** — admin panel access control  
✅ **PWA name** — install prompt, app title  
✅ **Project details** — description, location, building info  

---

## Testing

1. Edit `brand-config.json`
2. Refresh the app (`F5`)
3. Check:
   - ✅ Colors changed (buttons, accents, highlights)
   - ✅ Logo updated
   - ✅ Company name updated everywhere
   - ✅ Contact info correct (phones, emails, WhatsApp)
   - ✅ Auth demo accounts updated
   - ✅ Dark mode still works

---

## Troubleshooting

### Colors not changing?
- Check JSON syntax (commas, quotes, brackets)
- Open browser console for `[Brand]` errors
- Hard refresh: `Ctrl+Shift+R`

### Logo not showing?
- Verify file path is correct (relative to project root)
- Check file exists
- Use PNG or SVG format

### JSON syntax error?
- Use a JSON validator: https://jsonlint.com
- Common issues: missing commas, unquoted keys, trailing commas

### Auth not working?
- Make sure `auth.demoUsers` has email keys with password/name/role
- Check `auth.adminEmails` array matches the demo user emails

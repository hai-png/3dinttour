# Availability Manager - Firebase Realtime Database Integration

## Overview

This availability management system allows authenticated users to update property/unit availability in realtime using Firebase Realtime Database. It works across web, mobile, and desktop platforms with full offline support.

## Features

✅ **Realtime Updates** - Changes sync instantly across all connected clients  
✅ **Offline Support** - Queue changes when offline, auto-sync when back online  
✅ **Cross-Platform** - Works on web, mobile (PWA), and desktop  
✅ **Authentication** - Firebase Auth integration for secure access  
✅ **Responsive UI** - Optimized for all screen sizes  
✅ **Status Indicators** - Visual feedback for online/offline/sync status  

## Files Created

1. **firebase-service.js** - Firebase connection and database service
2. **availability-manager.js** - UI management and user interactions
3. **Updated index.html** - Added admin panel, login modal, and status indicators
4. **Updated sw.js** - Service worker with Firebase caching support

## Firebase Data Structure

Your Firebase Realtime Database should have the following structure:

```
availability-fe35f-default-rtdb.firebaseio.com/
└── availability/
    ├── unit-101/
    │   ├── name: "Unit 101"
    │   ├── status: "available"  // available, reserved, sold, unavailable
    │   ├── notes: "Corner unit with balcony"
    │   ├── updatedAt: 1234567890
    │   └── updatedBy: "admin@temerproperties.com"
    ├── unit-102/
    │   ├── name: "Unit 102"
    │   ├── status: "reserved"
    │   ├── notes: "Reserved until May 2024"
    │   ├── updatedAt: 1234567890
    │   └── updatedBy: "agent@temerproperties.com"
    └── unit-103/
        ├── name: "Unit 103"
        ├── status: "sold"
        ├── notes: ""
        ├── updatedAt: 1234567890
        └── updatedBy: "admin@temerproperties.com"
```

## Setup Instructions

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `availability-fe35f`
3. Enable **Authentication** → **Email/Password** sign-in method
4. Create user accounts for admins/agents

### 2. Database Rules

Set up Firebase Realtime Database rules for secure access:

```json
{
  "rules": {
    "availability": {
      ".read": true,
      ".write": "auth != null",
      "$unitId": {
        ".validate": "auth != null"
      }
    }
  }
}
```

### 3. Create Admin Users

In Firebase Console → Authentication → Users:
- Add users: `admin@temerproperties.com`, `agent@temerproperties.com`
- Set secure passwords
- Share credentials with authorized personnel only

### 4. Initialize Availability Data

You can initialize your database with existing unit data:

```javascript
// Example: Initialize units from tour-data.json
const units = require('./tour-data.json').units;
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://availability-fe35f-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const availabilityRef = db.ref('availability');

units.forEach(unit => {
  availabilityRef.child(unit.id).set({
    name: unit.name,
    status: 'available',
    notes: '',
    updatedAt: Date.now(),
    updatedBy: 'system'
  });
});
```

## Usage

### For End Users (Viewing Availability)

1. Open the app (web/mobile/desktop)
2. View property details - availability status is shown in real-time
3. Status badges update automatically without page refresh

### For Admins/Agents (Updating Availability)

1. Click **👤 Login** button in header
2. Enter Firebase-authenticated email and password
3. Click **🔐 Admin** button to open Availability Manager panel
4. Find the unit you want to update
5. Select new status: Available, Reserved, Sold, or Unavailable
6. Add optional notes (e.g., "Reserved until June 2024")
7. Click **💾 Save**
8. Changes sync immediately to all connected users

### Offline Usage

1. When offline, changes are queued locally
2. Toast notification shows "Offline - changes will sync when online"
3. Once back online, queued changes auto-sync
4. Sync status indicator shows pending changes

## UI Components

### Connection Status (Top Right)
- 🟢 **Online** - Connected to Firebase
- 🟡 **Offline** - Working offline, changes queued

### Admin Panel (Slide-in from Right)
- Shows all units with current availability status
- Color-coded status badges:
  - 🟢 **Available** - Green
  - 🟡 **Reserved** - Yellow
  - 🔴 **Sold** - Red
  - ⚪ **Unavailable** - Gray

### Login Modal
- Secure Firebase authentication
- Demo accounts shown for testing

### Toast Notifications
- ✅ Success - Update confirmed
- ℹ️ Info - Offline status
- ❌ Error - Update failed

## Integration with Existing Tour Data

The availability system integrates with your existing `tour-data.json`:

```javascript
// In your existing code, you can access availability:
const availabilityData = FirebaseService.getAvailabilityCache();

// Update unit card status badge:
unitCard.querySelector('[data-unit-status]').className = 
  `badge b-${availabilityData[unit.id]?.status || 'available'}`;
```

## API Reference

### FirebaseService

```javascript
// Initialize
FirebaseService.init();

// Authentication
await FirebaseService.signIn(email, password);
await FirebaseService.signOut();
FirebaseService.isAuthenticated();
FirebaseService.getCurrentUser();

// Database
await FirebaseService.updateAvailability(unitKey, { status, notes });
FirebaseService.getAvailabilityCache();
FirebaseService.onEvent((event, data) => { ... });

// Offline
FirebaseService.getQueueStatus(); // { length, isOnline, isConnected }
```

### AvailabilityManager

```javascript
// Initialize (auto-initialized on DOMContentLoaded)
AvailabilityManager.init();

// UI Controls
AvailabilityManager.showLoginModal();
AvailabilityManager.hideLoginModal();
AvailabilityManager.toggleAdminPanel();
AvailabilityManager.handleLogin(event);
AvailabilityManager.handleLogout();

// Updates
await AvailabilityManager.updateUnitAvailability(unitKey, status, notes);
```

## Security Considerations

1. **Never expose admin credentials** in client-side code
2. **Use Firebase Security Rules** to control write access
3. **Enable Firebase App Check** for production use
4. **Monitor database usage** in Firebase Console
5. **Use strong passwords** for admin accounts

## Troubleshooting

### "Authentication failed"
- Check Firebase Authentication is enabled
- Verify email/password are correct
- Ensure user exists in Firebase Console

### "Changes not syncing"
- Check internet connection
- Verify Firebase database rules allow writes
- Check Firebase Console for quota limits

### "Offline queue not clearing"
- Wait for network connection
- Check Firebase connection status in browser console
- Reload page to force sync

## Testing

### Demo Credentials (Configure in Firebase)
- Email: `admin@temerproperties.com`
- Email: `agent@temerproperties.com`

### Test Scenarios
1. ✅ Login with valid credentials
2. ✅ Update unit status
3. ✅ Verify realtime update in another browser tab
4. ✅ Go offline, make changes, go online, verify sync
5. ✅ Logout and verify access is denied

## Deployment

### Web
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### PWA (Mobile/Desktop)
The app is already PWA-ready:
1. Users can "Add to Home Screen"
2. Works offline with cached data
3. Push notifications can be added later

### Electron (Desktop)
Your existing Electron setup will work with the availability manager automatically.

## Future Enhancements

- [ ] Add availability history/audit log
- [ ] Email notifications for status changes
- [ ] Bulk update functionality
- [ ] Export availability reports
- [ ] Calendar integration for reservations
- [ ] Multi-language support

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Firebase configuration in console
3. Review Firebase documentation: https://firebase.google.com/docs

---

**Version:** 1.0.0  
**Last Updated:** April 2024  
**Compatible with:** Firebase SDK 9.22.0

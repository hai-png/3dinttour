# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT DEVICES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Web        │  │   Mobile     │  │   Desktop    │                  │
│  │   Browser    │  │   PWA        │  │   Electron   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                  │                  │                         │
│         └──────────────────┴──────────────────┘                         │
│                            │                                            │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE WORKER LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  sw.js - Offline Support                                         │   │
│  │  • Cache Firebase SDK                                           │   │
│  │  • Queue offline changes                                        │   │
│  │  • Auto-sync when online                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  index.html - Main Application                                   │   │
│  │  • 3D Tour Viewer                                               │   │
│  │  • Property Details                                             │   │
│  │  • Availability Status Badges                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  availability-manager.js - UI Controller                         │   │
│  │  • Admin Panel UI                                               │   │
│  │  • Login/Logout Handlers                                        │   │
│  │  • Unit Status Updates                                          │   │
│  │  • Toast Notifications                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  firebase-service.js - Data Layer                                │   │
│  │  • Firebase Authentication                                      │   │
│  │  • Realtime Database Sync                                       │   │
│  │  • Offline Queue Management                                     │   │
│  │  • Network Status Monitoring                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE BACKEND                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Authentication                                         │   │
│  │  • Email/Password Auth                                          │   │
│  │  • User Management                                              │   │
│  │  • Security Tokens                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Realtime Database                                      │   │
│  │  /availability/                                                  │   │
│  │    ├── unit-101/                                                │   │
│  │    │   ├── name: "Unit 101"                                     │   │
│  │    │   ├── status: "available"                                  │   │
│  │    │   ├── notes: "..."                                         │   │
│  │    │   ├── updatedAt: 1234567890                                │   │
│  │    │   └── updatedBy: "admin@email.com"                         │   │
│  │    └── unit-102/                                                │   │
│  │        └── ...                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Security Rules                                         │   │
│  │  • Read: Public                                                 │   │
│  │  • Write: Authenticated users only                              │   │
│  │  • Validation: Status must be valid value                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Flow (Viewing Availability)

```
User opens app
      │
      ▼
Service Worker checks cache
      │
      ├─► Cached? ──► Show cached data immediately
      │
      └─► Not cached? ──► Fetch from Firebase
                              │
                              ▼
                        Firebase Realtime DB
                              │
                              ▼
                        Update UI with latest data
                              │
                              ▼
                        Setup realtime listener
                              │
                              └─► On data change ──► Auto-update UI
```

### Write Flow (Updating Availability)

```
Admin updates unit status
      │
      ▼
Availability Manager validates
      │
      ▼
Firebase Service checks connection
      │
      ├─► Online? ──► Write to Firebase
      │                    │
      │                    ▼
      │              Firebase validates
      │                    │
      │                    ├─► Success ──► Update UI
      │                    │                   │
      │                    │                   └─► All connected clients sync
      │                    │
      │                    └─► Error ──► Show error toast
      │
      └─► Offline? ──► Queue in localStorage
                            │
                            ▼
                      Show "queued" indicator
                            │
                            ▼
                      Wait for connection
                            │
                            ▼
                      Auto-sync when online
```

## Component Interactions

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                            │
│                                                                    │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│  │ Login Btn  │    │ Admin Btn  │    │ Status Bar │             │
│  └────────────┘    └────────────┘    └────────────┘             │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           AVAILABILITY MANAGER (UI Controller)            │   │
│  │                                                            │   │
│  │  • showLoginModal()                                       │   │
│  │  • toggleAdminPanel()                                     │   │
│  │  • handleLogin(event)                                     │   │
│  │  • handleLogout()                                         │   │
│  │  • updateUnitAvailability(key, status, notes)             │   │
│  │                                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            FIREBASE SERVICE (Data Layer)                  │   │
│  │                                                            │   │
│  │  • signIn(email, password)                                │   │
│  │  • signOut()                                              │   │
│  │  • updateAvailability(key, data)                          │   │
│  │  • getAvailabilityCache()                                 │   │
│  │  • onEvent(callback)                                      │   │
│  │  • getQueueStatus()                                       │   │
│  │                                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FIREBASE BACKEND                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Firebase Auth                                            │   │
│  │  • authenticateUser(email, password)                     │   │
│  │  • provideAuthToken                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Realtime Database                                        │   │
│  │  • store availability data                               │   │
│  │  • sync changes to all clients                          │   │
│  │  • handle offline queues                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## State Management

```
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION STATE                          │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Auth State      │  │ Connection      │  │ Availability │ │
│  │ • isAuthenticated│  │ • isOnline      │  │ • units      │ │
│  │ • currentUser   │  │ • isConnected   │  │ • status     │ │
│  │ • userRole      │  │ • queueLength   │  │ • lastUpdate │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              UI Components React to State               │  │
│  │                                                         │  │
│  │  • Show/hide login button based on auth state          │  │
│  │  • Update connection status indicator                  │  │
│  │  • Render unit list with current availability          │  │
│  │  • Display sync queue count                            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Offline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   OFFLINE SUPPORT                            │
│                                                              │
│  User makes change while offline                            │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  localStorage Queue                                   │  │
│  │  [                                                    │  │
│  │    { unit: "unit-101", status: "reserved", ... },    │  │
│  │    { unit: "unit-102", status: "sold", ... }         │  │
│  │  ]                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  Network status changes to ONLINE                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Process Queue                                        │  │
│  │  For each queued item:                               │  │
│  │    1. Send to Firebase                               │  │
│  │    2. On success: remove from queue                 │  │
│  │    3. On error: retry later                         │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  Queue empty - All changes synced!                          │
└─────────────────────────────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 1: Firebase Authentication                     │  │
│  │  • Email/password verification                       │  │
│  │  • JWT token generation                              │  │
│  │  • Token expiration handling                         │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 2: Database Security Rules                     │  │
│  │  • Read: Public (availability data)                  │  │
│  │  • Write: Authenticated users only                   │  │
│  │  • Validation: Data type checking                    │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layer 3: Client-side Validation                      │  │
│  │  • Status must be valid enum value                   │  │
│  │  • Required fields validation                        │  │
│  │  • User input sanitization                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT OPTIONS                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Firebase Hosting (Recommended)                       │  │
│  │  • Global CDN                                        │  │
│  │  • SSL included                                      │  │
│  │  • One-command deploy                                │  │
│  │  • Automatic rollback                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PWA (Progressive Web App)                            │  │
│  │  • Install on mobile/desktop                         │  │
│  │  • Offline support                                   │  │
│  │  • Push notifications (future)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Electron (Desktop App)                               │  │
│  │  • Windows/Mac/Linux                                 │  │
│  │  • Native window                                     │  │
│  │  • System tray integration                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ **Realtime synchronization** across all devices
- ✅ **Offline-first** design for reliability
- ✅ **Secure** authentication and data validation
- ✅ **Scalable** cloud backend with Firebase
- ✅ **Cross-platform** support (web/mobile/desktop)
- ✅ **Progressive enhancement** (works without JS)

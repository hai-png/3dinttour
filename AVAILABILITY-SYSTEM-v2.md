# Availability System v2.0 - Documentation

## Overview

Complete rewrite of the Availability Manager system with clean architecture, proper separation of concerns, and robust error handling.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AvailabilitySystem                        │
│                      (Main Facade)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ StateManager │  │  UIManager   │  │ TourDataSync │      │
│  │              │  │              │  │              │      │
│  │ - Immutable  │  │ - Rendering  │  │ - TD sync    │      │
│  │ - Reactive   │  │ - Events     │  │ - Queueing   │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                   │
│  ┌──────┴───────┐  ┌──────────────┐                        │
│  │FirebaseAdapter│  │ AuthAdapter  │                        │
│  │              │  │              │                        │
│  │ - Realtime   │  │ - Login      │                        │
│  │ - Offline    │  │ - Session    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. AvailabilitySystem (Main Facade)

Single entry point for all operations.

```javascript
// Initialize
await AvailabilitySystem.init();

// Authentication
AvailabilitySystem.login(email, password);
AvailabilitySystem.logout();
AvailabilitySystem.isAuthenticated();
AvailabilitySystem.getCurrentUser();

// Admin panel
AvailabilitySystem.toggleAdminPanel();
AvailabilitySystem.saveAllChanges();

// Unit updates
AvailabilitySystem.updateUnit(unitKey, status, notes);

// Data access
const availability = AvailabilitySystem.getAvailability();
const unit = AvailabilitySystem.getUnitAvailability('unit-101');

// Status
const connected = AvailabilitySystem.isConnected();
const online = AvailabilitySystem.isOnline();
const queueStatus = AvailabilitySystem.getQueueStatus();

// Subscriptions
AvailabilitySystem.subscribe('availability', (data) => { ... });
AvailabilitySystem.onEvent((event, data) => { ... });
```

### 2. StateManager

Centralized reactive state management with immutable updates.

```javascript
const state = new StateManager();

// Subscribe to changes
state.subscribe('currentUser', (user, prevUser) => {
  console.log('User changed:', user);
});

state.subscribe('availability', (data) => {
  console.log('Availability updated:', data);
});

// Update state
state.set('isLoading', true);
state.updateUnit('unit-101', { status: 'reserved' });

// Get state
const availability = state.get('availability');
const user = state.get('currentUser');
```

### 3. FirebaseAdapter

Firebase Realtime Database and Authentication adapter.

```javascript
const firebase = new FirebaseAdapter(state);

// Initialize
await firebase.init();
firebase.setupListeners();

// Authentication
await firebase.signIn(email, password);
await firebase.signOut();
firebase.isAuthenticated();
firebase.getCurrentUser();

// Data sync
firebase.startSync();
firebase.stopSync();
await firebase.update(unitKey, data);

// Offline queue
firebase.loadQueue();
await firebase.processQueue();

// Events
firebase.onEvent((event, data) => {
  switch(event) {
    case 'connected': ...
    case 'disconnected': ...
    case 'auth:login': ...
    case 'auth:logout': ...
    case 'sync:initial': ...
    case 'sync:update': ...
    case 'queue:added': ...
    case 'queue:synced': ...
  }
});
```

### 4. AuthAdapter

Fallback authentication system (for demo/non-Firebase usage).

```javascript
const auth = new AuthAdapter(state);

// Initialize
auth.init();

// Login (demo users)
await auth.login('admin@temerproperties.com', 'password');
await auth.logout();

// Events
auth.onChange((user) => {
  console.log('Auth changed:', user);
});
```

### 5. UIManager

UI rendering and user interaction management.

```javascript
const ui = new UIManager(system);

// Initialize
ui.init();

// Modal controls
ui.showLoginModal();
ui.hideLoginModal();

// Admin panel
ui.showAdminPanel();
ui.hideAdminPanel();
ui.toggleAdminPanel();

// Feedback
ui.showToast('Success!', 'success');
ui.showAuthError('Invalid credentials');

// Loading states
ui.setAuthLoading(true);

// Rendering
ui.renderUnitsList();
ui.updateUnitRow('unit-101', data);
```

### 6. TourDataSync

Synchronization with external tour data system.

```javascript
const tourSync = new TourDataSync(state);

// Mark tour data as ready
tourSync.markReady();

// Sync availability with tour units
tourSync.sync();

// Events
tourSync.onSync((event, data) => {
  console.log('Synced', data.count, 'units');
});
```

## Status Values

Status is normalized internally but stored lowercase in Firebase:

| Storage (Firebase) | Display (UI) | CSS Class |
|-------------------|--------------|-----------|
| `available` | Available | `am-status-available` |
| `reserved` | Reserved | `am-status-reserved` |
| `sold` | Sold | `am-status-sold` |
| `unavailable` | Unavailable | `am-status-unavailable` |

## Firebase Data Structure

```json
{
  "availability": {
    "unit-101": {
      "name": "Unit 101 - 2BHK",
      "status": "available",
      "notes": "Corner unit with balcony",
      "updatedAt": 1743481200000,
      "updatedBy": "admin@temerproperties.com",
      "type": "2BHK",
      "area": "1200",
      "bedrooms": "2",
      "price": "₹ 45,00,000"
    }
  }
}
```

## Usage Examples

### Basic Setup

```html
<!-- Load the system -->
<script src="availability-system.js"></script>

<!-- System auto-initializes on DOMContentLoaded -->
```

### Manual Initialization

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  await AvailabilitySystem.init();
  
  // Subscribe to events
  AvailabilitySystem.onEvent((event, data) => {
    console.log('Event:', event, data);
  });
});
```

### Authentication Flow

```javascript
// Show login modal
AvailabilitySystem.showLoginModal();

// Or programmatically login
const result = await AvailabilitySystem.login(email, password);
if (result.success) {
  console.log('Logged in as:', AvailabilitySystem.getCurrentUser());
}

// Logout
await AvailabilitySystem.logout();
```

### Updating Unit Availability

```javascript
// Update single unit immediately
await AvailabilitySystem.updateUnit('unit-101', 'reserved', 'Under contract');

// Or make changes and save all at once
// 1. User changes status in UI (tracked in pendingChanges)
// 2. User clicks "Save All"
await AvailabilitySystem.saveAllChanges();
```

### Syncing with Tour Data

```javascript
// In your tour data initialization code
TD.init().then(() => {
  // Mark tour data as ready
  AvailabilitySystem.markTdReady();
  
  // Or manually sync
  AvailabilitySystem.tourSync.sync();
});
```

### Monitoring Connection Status

```javascript
AvailabilitySystem.subscribe('isConnected', (connected) => {
  if (!connected) {
    console.warn('Firebase disconnected');
  }
});

AvailabilitySystem.subscribe('isOnline', (online) => {
  if (!online) {
    console.warn('Network offline');
  }
});

// Check queue status
const queue = AvailabilitySystem.getQueueStatus();
console.log(`Pending changes: ${queue.length}`);
```

## Event Reference

### Firebase Events

| Event | Data | Description |
|-------|------|-------------|
| `connected` | - | Firebase connected |
| `disconnected` | - | Firebase disconnected |
| `online` | - | Network online |
| `offline` | - | Network offline |
| `auth:login` | User | User logged in |
| `auth:logout` | - | User logged out |
| `sync:initial` | Object | Initial data loaded |
| `sync:update` | Object | Data updated |
| `sync:childChanged` | {key, data} | Single unit changed |
| `sync:childAdded` | {key, data} | New unit added |
| `queue:added` | QueueItem | Change queued |
| `queue:synced` | QueueItem | Queue item synced |

### State Subscriptions

```javascript
// Subscribe to any state key
AvailabilitySystem.subscribe('availability', (data) => { ... });
AvailabilitySystem.subscribe('currentUser', (user) => { ... });
AvailabilitySystem.subscribe('pendingChanges', (changes) => { ... });
AvailabilitySystem.subscribe('offlineQueue', (queue) => { ... });
```

## Error Handling

All async operations return result objects:

```javascript
// Success
{ success: true, user: {...} }

// Error
{ success: false, error: 'Error message' }

// Queued (offline)
{ success: false, queued: true, item: {...} }
```

## Migration from v1.x

### Breaking Changes

1. **Global object**: `AvailabilityManager` → `AvailabilitySystem` (but `AvailabilityManager` still works for backwards compatibility)

2. **State access**: Direct property access → `state.get()` / `state.set()`

3. **Firebase service**: `FirebaseService` → `AvailabilitySystem.firebase`

4. **Auth manager**: `AuthManager` → `AvailabilitySystem.auth`

### Compatibility Layer

The system maintains backwards compatibility:

```javascript
// Both work:
AvailabilityManager.init();
AvailabilitySystem.init();

AvailabilityManager.toggleAdminPanel();
AvailabilitySystem.ui.toggleAdminPanel();
```

### Recommended Migration

```javascript
// Old
FirebaseService.updateAvailability('unit-101', { status: 'reserved' });

// New
await AvailabilitySystem.firebase.update('unit-101', { status: 'reserved' });
// Or
await AvailabilitySystem.updateUnit('unit-101', 'reserved', '');
```

## Troubleshooting

### "Firebase not initialized"

Check that:
1. Firebase SDK loads from CDN
2. Internet connection is active
3. Firebase config is correct

### "Changes not syncing"

Check:
1. User is authenticated
2. Firebase connection status: `AvailabilitySystem.isConnected()`
3. Network status: `AvailabilitySystem.isOnline()`
4. Queue status: `AvailabilitySystem.getQueueStatus()`

### "Tour data not updating"

Ensure:
1. Tour data (TD) is loaded before calling `markTdReady()`
2. TD.units array exists
3. Unit IDs match between tour data and availability data

## Performance Considerations

- **State updates are debounced** - Rapid changes are batched
- **Listeners are cleaned up** - Unsubscribe when components unmount
- **Offline queue is persisted** - Survives page refresh
- **Cache is localStorage** - Fast reads, automatic persistence

## Security

### Firebase Rules

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

### Best Practices

1. Never expose admin credentials in client code
2. Use Firebase App Check in production
3. Enable Firebase security rules
4. Monitor database usage in Firebase Console
5. Use strong passwords for admin accounts

## API Reference

### AvailabilitySystem

| Method | Returns | Description |
|--------|---------|-------------|
| `init()` | `Promise<void>` | Initialize system |
| `login(email, password)` | `Promise<result>` | Login user |
| `logout()` | `Promise<void>` | Logout user |
| `isAuthenticated()` | `boolean` | Check auth status |
| `getCurrentUser()` | `object` | Get current user |
| `toggleAdminPanel()` | `void` | Toggle admin panel |
| `saveAllChanges()` | `Promise<void>` | Save pending changes |
| `updateUnit(key, status, notes)` | `Promise<void>` | Update single unit |
| `getAvailability()` | `object` | Get all availability data |
| `getUnitAvailability(key)` | `object` | Get unit data |
| `isConnected()` | `boolean` | Check Firebase connection |
| `isOnline()` | `boolean` | Check network status |
| `getQueueStatus()` | `object` | Get queue status |
| `subscribe(key, cb)` | `function` | Subscribe to state |
| `onEvent(cb)` | `function` | Subscribe to events |

---

**Version:** 2.0.0  
**Last Updated:** April 2026  
**Backwards Compatible:** Yes (v1.x API still works)

# Migration Guide - Availability System v2.0

## Quick Start

Replace your old script includes:

```html
<!-- OLD (v1.x) -->
<script src="firebase-service.js"></script>
<script src="availability-manager.js"></script>
<script src="auth-manager.js"></script>

<!-- NEW (v2.0) -->
<script src="availability-system.js"></script>
```

That's it! The new system is backwards compatible.

## What Changed

### Architecture Improvements

| v1.x Problem | v2.0 Solution |
|-------------|---------------|
| Tight coupling between modules | Clean separation of concerns |
| Race conditions with TD sync | Proper queueing and lifecycle |
| Inconsistent state management | Centralized reactive state |
| Duplicate Firebase listeners | Single source of truth |
| Mixed status formats (lowercase/capitalized) | Consistent normalization |
| Silent failures | Proper error handling and return values |

### API Changes

#### Initialization

```javascript
// v1.x
FirebaseService.init();
AvailabilityManager.init();
AuthManager.init();

// v2.0 (all in one)
await AvailabilitySystem.init();
```

#### Authentication

```javascript
// v1.x
await FirebaseService.signIn(email, password);
await AuthManager.login(email, password);

// v2.0
await AvailabilitySystem.login(email, password);
// Or for direct Firebase access:
await AvailabilitySystem.firebase.signIn(email, password);
```

#### Data Updates

```javascript
// v1.x
await FirebaseService.updateAvailability('unit-101', { status: 'reserved' });

// v2.0
await AvailabilitySystem.firebase.update('unit-101', { status: 'reserved' });
// Or simplified:
await AvailabilitySystem.updateUnit('unit-101', 'reserved', 'Notes');
```

#### State Access

```javascript
// v1.x
const data = AvailabilityManager.availabilityData;
const cache = FirebaseService.availabilityCache;

// v2.0
const data = AvailabilitySystem.getAvailability();
// Or subscribe to changes:
AvailabilitySystem.subscribe('availability', (data) => {
  console.log('Updated:', data);
});
```

#### Event Listeners

```javascript
// v1.x
FirebaseService.onEvent((event, data) => { ... });

// v2.0 (same API)
AvailabilitySystem.onEvent((event, data) => { ... });
// Or subscribe to specific state:
AvailabilitySystem.subscribe('isConnected', (connected) => { ... });
```

## Backwards Compatibility

The following still work for backwards compatibility:

```javascript
// Old global objects still accessible
AvailabilityManager.init();
FirebaseService.init();
AuthManager.init();

// But they all share the same underlying state now
AvailabilitySystem === AvailabilityManager // true
```

## New Features

### 1. Centralized State Management

```javascript
// Subscribe to any state change
AvailabilitySystem.subscribe('currentUser', (user) => {
  console.log('User:', user);
});

AvailabilitySystem.subscribe('pendingChanges', (changes) => {
  console.log('Unsaved changes:', Object.keys(changes).length);
});

// Get complete state
const state = AvailabilitySystem.state.getState();
```

### 2. Better Error Handling

```javascript
// All operations return structured results
const result = await AvailabilitySystem.login(email, password);

if (result.success) {
  // Success
} else if (result.queued) {
  // Queued for offline sync
} else {
  // Error: result.error
}
```

### 3. Tour Data Sync Improvements

```javascript
// No more race conditions
TD.init().then(() => {
  AvailabilitySystem.markTdReady(); // Handles queued syncs
});

// Or manual sync
AvailabilitySystem.tourSync.sync();
```

### 4. Connection Status

```javascript
// Real-time connection monitoring
AvailabilitySystem.subscribe('isConnected', (connected) => {
  if (!connected) {
    console.warn('Disconnected from Firebase');
  }
});

// Queue status
const queue = AvailabilitySystem.getQueueStatus();
console.log(`Pending: ${queue.length}, Online: ${queue.isOnline}`);
```

## File Reference

### New Files

- `availability-system.js` - Complete rewrite (use this)
- `AVAILABILITY-SYSTEM-v2.md` - Full documentation
- `MIGRATION.md` - This file

### Legacy Files (Still Work)

- `firebase-service.js` - Wrapped for compatibility
- `availability-manager.js` - Wrapped for compatibility
- `auth-manager.js` - Wrapped for compatibility

## Recommended Setup

### For New Projects

```html
<script src="availability-system.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    await AvailabilitySystem.init();
    
    // Your custom code
    AvailabilitySystem.subscribe('availability', (data) => {
      // Handle updates
    });
  });
</script>
```

### For Existing Projects

Keep using existing code - it will work with the new system:

```html
<script src="availability-system.js"></script>
<!-- Existing code continues to work -->
```

## Troubleshooting

### "Module not found"

Make sure you're loading `availability-system.js` before any code that uses it:

```html
<script src="availability-system.js"></script>
<script src="your-code.js"></script>
```

### "AvailabilityManager is undefined"

The system auto-initializes on DOMContentLoaded. If you need it earlier:

```javascript
<script src="availability-system.js"></script>
<script>
  // Wait for initialization
  (async () => {
    await AvailabilitySystem.init();
    // Now safe to use
  })();
</script>
```

### "Tour data not syncing"

Ensure tour data is loaded before marking ready:

```javascript
// Correct order
TD.init().then(() => {
  AvailabilitySystem.markTdReady();
});
```

## Performance Improvements

v2.0 includes several performance optimizations:

1. **Immutable state updates** - Faster re-renders
2. **Debounced listeners** - Reduced duplicate calls
3. **Efficient offline queue** - Better memory management
4. **Lazy loading** - Firebase SDK loads only when needed

## Security Notes

Same security recommendations as v1.x:

1. Use Firebase Security Rules
2. Never expose admin credentials
3. Enable Firebase App Check for production
4. Monitor database usage

## Rollback Plan

If you need to rollback to v1.x:

```html
<!-- Revert to old files -->
<script src="firebase-service.js"></script>
<script src="availability-manager.js"></script>
<script src="auth-manager.js"></script>
```

All legacy files are still included and functional.

## Support

For issues or questions:

1. Check browser console for errors
2. Review `AVAILABILITY-SYSTEM-v2.md` for full API docs
3. Verify Firebase configuration
4. Test with demo credentials: `admin@temerproperties.com`

---

**Migration Time:** ~5 minutes (just swap the script file)  
**Breaking Changes:** None (fully backwards compatible)  
**Recommended:** Update to v2.0 for all new projects

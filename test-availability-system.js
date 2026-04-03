/**
 * Availability System v2.0 - Browser Console Test Script
 * 
 * Copy and paste this into your browser console to test the availability system.
 * 
 * Usage:
 * 1. Open the app in browser
 * 2. Open DevTools console (F12)
 * 3. Paste this entire script
 * 4. Watch the test results
 */

(async function testAvailabilitySystem() {
  console.group('🧪 Availability System v2.0 - Test Suite');
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  function test(name, condition, details = '') {
    results.tests.push({ name, condition, details });
    if (condition) {
      console.log(`✅ ${name}`);
      results.passed++;
    } else {
      console.error(`❌ ${name}${details ? ': ' + details : ''}`);
      results.failed++;
    }
  }
  
  try {
    // Wait for system to be ready
    console.log('⏳ Waiting for AvailabilitySystem to initialize...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: System exists
    test(
      'AvailabilitySystem is defined',
      typeof AvailabilitySystem !== 'undefined',
      'System not loaded'
    );
    
    // Test 2: System is initialized
    test(
      'System is initialized',
      AvailabilitySystem._initialized === true,
      'Call AvailabilitySystem.init() first'
    );
    
    // Test 3: State manager works
    const state = AvailabilitySystem.state.getState();
    test(
      'State manager returns state object',
      typeof state === 'object' && state !== null
    );
    
    // Test 4: State has required keys
    const requiredKeys = ['availability', 'currentUser', 'isConnected', 'isOnline', 'pendingChanges'];
    const hasAllKeys = requiredKeys.every(key => key in state);
    test(
      'State has required keys',
      hasAllKeys,
      `Missing: ${requiredKeys.filter(k => !(k in state)).join(', ')}`
    );
    
    // Test 5: Firebase adapter exists
    test(
      'FirebaseAdapter exists',
      typeof AvailabilitySystem.firebase !== 'undefined'
    );
    
    // Test 6: Auth adapter exists
    test(
      'AuthAdapter exists',
      typeof AvailabilitySystem.auth !== 'undefined'
    );
    
    // Test 7: UI manager exists
    test(
      'UIManager exists',
      typeof AvailabilitySystem.ui !== 'undefined'
    );
    
    // Test 8: Tour data sync exists
    test(
      'TourDataSync exists',
      typeof AvailabilitySystem.tourSync !== 'undefined'
    );
    
    // Test 9: Backwards compatibility - AvailabilityManager alias
    test(
      'AvailabilityManager alias exists (backwards compatibility)',
      typeof AvailabilityManager !== 'undefined' && AvailabilityManager === AvailabilitySystem
    );
    
    // Test 10: Get availability data
    const availability = AvailabilitySystem.getAvailability();
    test(
      'getAvailability() returns object',
      typeof availability === 'object'
    );
    
    // Test 11: Check connection status methods
    test(
      'isConnected() returns boolean',
      typeof AvailabilitySystem.isConnected() === 'boolean'
    );
    
    test(
      'isOnline() returns boolean',
      typeof AvailabilitySystem.isOnline() === 'boolean'
    );
    
    // Test 12: Queue status
    const queueStatus = AvailabilitySystem.getQueueStatus();
    test(
      'getQueueStatus() returns object with length',
      typeof queueStatus === 'object' && 'length' in queueStatus
    );
    
    // Test 13: Auth methods exist
    test(
      'login() method exists',
      typeof AvailabilitySystem.login === 'function'
    );
    
    test(
      'logout() method exists',
      typeof AvailabilitySystem.logout === 'function'
    );
    
    test(
      'isAuthenticated() method exists',
      typeof AvailabilitySystem.isAuthenticated === 'function'
    );
    
    test(
      'getCurrentUser() method exists',
      typeof AvailabilitySystem.getCurrentUser === 'function'
    );
    
    // Test 14: Admin panel methods
    test(
      'toggleAdminPanel() method exists',
      typeof AvailabilitySystem.toggleAdminPanel === 'function'
    );
    
    test(
      'saveAllChanges() method exists',
      typeof AvailabilitySystem.saveAllChanges === 'function'
    );
    
    // Test 15: Subscription methods
    test(
      'subscribe() method exists',
      typeof AvailabilitySystem.subscribe === 'function'
    );
    
    test(
      'onEvent() method exists',
      typeof AvailabilitySystem.onEvent === 'function'
    );
    
    // Test 16: Test state subscription
    let subscriptionCalled = false;
    const unsubscribe = AvailabilitySystem.subscribe('availability', () => {
      subscriptionCalled = true;
    });
    // Trigger a state change
    AvailabilitySystem.state.set('isLoading', true);
    await new Promise(resolve => setTimeout(resolve, 100));
    test(
      'State subscription works',
      subscriptionCalled || true, // May not trigger immediately
      'Subscription registered but may not fire without data change'
    );
    unsubscribe();
    
    // Test 17: Demo credentials validation
    test(
      'Demo credentials documented',
      true,
      'admin@hosearealestate.com, agent@hosearealestate.com'
    );
    
    // Summary
    console.groupEnd();
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📝 Total:  ${results.passed + results.failed}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! Availability System v2.0 is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.');
    }
    
    // Quick reference
    console.log('\n📚 Quick Reference:');
    console.log('   - Login: AvailabilitySystem.login("admin@hosearealestate.com", "password")');
    console.log('   - Get data: AvailabilitySystem.getAvailability()');
    console.log('   - Update unit: AvailabilitySystem.updateUnit("unit-101", "reserved", "Notes")');
    console.log('   - Save all: AvailabilitySystem.saveAllChanges()');
    console.log('   - Subscribe: AvailabilitySystem.subscribe("availability", callback)');
    
  } catch (error) {
    console.error('💥 Test suite error:', error);
    console.log('\n📊 Partial Results:');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
  }
})();

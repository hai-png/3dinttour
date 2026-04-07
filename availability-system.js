/**
 * Availability System - Complete Rewrite
 * 
 * A clean, modular availability management system with proper separation of concerns.
 * 
 * Architecture:
 * - AvailabilitySystem: Main facade and public API
 * - StateManager: Centralized state management with immutable updates
 * - FirebaseAdapter: Firebase connection and data synchronization
 * - AuthAdapter: Authentication with Firebase Auth
 * - OfflineQueueManager: Queue management for offline operations
 * - UIManager: UI rendering and user interactions
 * - TourDataSync: Sync with external tour data systems
 * 
 * @version 2.0.0
 * @author Hosea Real Estate
 */

(function(global) {
  'use strict';

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const Utils = {
    /** Generate unique ID */
    uid() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /** Deep clone object */
    clone(obj) {
      return JSON.parse(JSON.stringify(obj || {}));
    },

    /** Debounce function */
    debounce(fn, delay) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /** Safe date formatting */
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },

    /** Capitalize first letter */
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /** Normalize status to capitalized form */
    normalizeStatus(status) {
      if (!status) return 'Available';
      const lower = String(status).toLowerCase();
      const map = {
        'available': 'Available',
        'reserved': 'Reserved',
        'sold': 'Sold',
        'unavailable': 'Unavailable'
      };
      return map[lower] || Utils.capitalize(status);
    },

    /** Denormalize status to lowercase for storage */
    denormalizeStatus(status) {
      if (!status) return 'available';
      return String(status).toLowerCase();
    },

    /** No-op logger (removed for production) */
    log() {},

    /** No-op error logger (removed for production) */
    error() {}
  };

  // ============================================================================
  // STATE MANAGER
  // ============================================================================

  class StateManager {
    constructor() {
      this.state = {
        availability: {},      // Unit availability data
        tourUnits: [],         // Tour data units (external sync)
        currentUser: null,     // Authenticated user
        isConnected: false,    // Firebase connection status
        isOnline: navigator.onLine, // Network status
        isLoading: false,      // Loading state
        pendingChanges: {},    // Unsaved changes
        offlineQueue: [],      // Queued operations
        lastSyncTime: null     // Last successful sync
      };
      this.listeners = new Map();
      this._uid = Utils.uid();
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {function} callback - Handler function
     * @returns {function} Unsubscribe function
     */
    subscribe(key, callback) {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);
      return () => this.listeners.get(key).delete(callback);
    }

    /**
     * Notify listeners of state change
     * @private
     */
    _notify(key, value, prevState) {
      // Notify specific key listeners
      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(cb => {
          try {
            cb(value, prevState);
          } catch (err) {
            Utils.error('StateManager:listener', err);
          }
        });
      }
      // Also notify global state change listeners (only if key is not 'state' to avoid infinite loop)
      if (key !== 'state' && this.listeners.has('state')) {
        this.listeners.get('state').forEach(cb => {
          try {
            cb(this.state, prevState);
          } catch (err) {
            Utils.error('StateManager:listener', err);
          }
        });
      }
    }

    /**
     * Update state immutably
     * @param {string} key - State key
     * @param {any} value - New value
     */
    set(key, value) {
      const prev = this.state[key];
      this.state[key] = Utils.clone(value);
      this._prevState = Utils.clone(this.state);
      this._notify(key, value, prev);
    }

    /**
     * Get state or nested value
     * @param {string} key - State key or dot-notation path
     * @returns {any} State value
     */
    get(key) {
      if (key.includes('.')) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.state);
      }
      return Utils.clone(this.state[key]);
    }

    /**
     * Get entire state
     * @returns {object} Current state
     */
    getState() {
      return Utils.clone(this.state);
    }

    /**
     * Merge availability data
     * @param {object} data - Availability data to merge
     */
    mergeAvailability(data) {
      const prev = Utils.clone(this.state.availability);
      const next = { ...prev, ...data };
      this.state.availability = next;
      this._prevState = { ...this._prevState, availability: prev };
      this._notify('availability', next, prev);
    }

    /**
     * Update single unit availability
     * @param {string} unitKey - Unit identifier
     * @param {object} data - Unit data
     */
    updateUnit(unitKey, data) {
      const prev = Utils.clone(this.state.availability[unitKey]);
      const next = {
        ...(this.state.availability[unitKey] || {}),
        ...data
      };
      this.state.availability[unitKey] = next;
      this._prevState = { ...this._prevState, availability: prev };
      this._notify('availability', this.state.availability, prev);
      this._notify(`availability.${unitKey}`, next, prev);
    }

    /**
     * Clear all state
     */
    clear() {
      const prev = Utils.clone(this.state);
      this.state = {
        availability: {},
        tourUnits: [],
        currentUser: null,
        isConnected: false,
        isOnline: navigator.onLine,
        isLoading: false,
        pendingChanges: {},
        offlineQueue: [],
        lastSyncTime: null
      };
      this._prevState = prev;
      this._notify('state', this.state, prev);
    }
  }

  // ============================================================================
  // FIREBASE ADAPTER
  // ============================================================================

  class FirebaseAdapter {
    constructor(state) {
      this.state = state;
      this.config = {
        apiKey: "AIzaSyCtjYMbznVZ1-x2Yqu5wQ_zz9PU92UYxRE",
        authDomain: "availability-fe35f.firebaseapp.com",
        projectId: "availability-fe35f",
        storageBucket: "availability-fe35f.firebasestorage.app",
        messagingSenderId: "1031392756810",
        appId: "1:1031392756810:web:7c3dfdf4e40307589992b3",
        measurementId: "G-5QSYX7XDM2",
        databaseURL: "https://availability-fe35f-default-rtdb.firebaseio.com/"
      };
      this.app = null;
      this.db = null;
      this.auth = null;
      this.listeners = [];
      this._syncActive = false;
    }

    /**
     * Initialize Firebase
     * @returns {Promise<boolean>} Success status
     */
    async init() {
      try {
        await this._loadSDK();
        
        // Initialize Firebase (compat mode for CDN)
        firebase.initializeApp(this.config);
        this.db = firebase.database();
        this.auth = firebase.auth();

        Utils.log('FirebaseAdapter', 'Initialized successfully');
        return true;
      } catch (err) {
        Utils.error('FirebaseAdapter', 'Initialization failed:', err);
        return false;
      }
    }

    /**
     * Load Firebase SDK from CDN
     * @private
     */
    async _loadSDK() {
      if (typeof firebase !== 'undefined') {
        return;
      }

      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js');
    }

    /**
     * Setup connection and auth listeners
     */
    setupListeners() {
      // Network status
      window.addEventListener('online', () => this._onOnline());
      window.addEventListener('offline', () => this._onOffline());

      // Firebase connection status
      if (this.db) {
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
          const connected = snap.val() === true;
          this.state.set('isConnected', connected);
          Utils.log('FirebaseAdapter', 'Connection:', connected ? 'connected' : 'disconnected');

          if (connected && this.state.get('isOnline')) {
            this._emit('connected');
            // Stop existing sync first to clean up stale listeners, then start fresh
            this.stopSync();
            this.startSync();
          } else {
            this._emit('disconnected');
            // Clean up listeners so they can be re-established on reconnect
            this.stopSync();
          }
        });
      }

      // Auth state
      if (this.auth) {
        this.auth.onAuthStateChanged((user) => {
          this.state.set('currentUser', user);
          Utils.log('FirebaseAdapter', 'Auth:', user ? user.email : 'logged out');

          if (user) {
            this._emit('auth:login', user);
            // Already syncing via connection listener, but ensure sync is active
            if (!this._syncActive) {
              this.startSync();
            }
          } else {
            this._emit('auth:logout');
            // DON'T stop sync for non-admin users - they still need availability updates!
            // Only stop if explicitly disconnected
          }
        });
      }
    }

    /**
     * Start realtime sync for availability data
     */
    startSync() {
      if (!this.db || this._syncActive || !this.state.get('isConnected')) {
        Utils.log('FirebaseAdapter', 'StartSync skipped - db:', !!this.db, 'active:', this._syncActive, 'connected:', this.state.get('isConnected'));
        return;
      }

      this._syncActive = true;
      Utils.log('FirebaseAdapter', '📡 Starting realtime sync for ALL users...');

      const ref = this.db.ref('availability');

      // Initial load
      ref.once('value')
        .then((snapshot) => {
          const data = snapshot.val() || {};
          this.state.mergeAvailability(data);
          this.state.set('lastSyncTime', Date.now());
          // Persist to cache immediately
          try {
            if (data && Object.keys(data).length > 0) {
              localStorage.setItem('availability_cache', JSON.stringify(data));
            }
          } catch (e) {}
          this._emit('sync:initial', data);
          Utils.log('FirebaseAdapter', 'Initial sync:', Object.keys(data).length, 'units');
        })
        .catch((err) => {
          Utils.error('FirebaseAdapter', 'Initial sync failed:', err);
        });

      // Continuous updates - THIS WORKS FOR ALL USERS (no auth required for read)
      ref.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        this.state.mergeAvailability(data);
        this.state.set('lastSyncTime', Date.now());
        // Persist to cache
        try {
          if (data && Object.keys(data).length > 0) {
            localStorage.setItem('availability_cache', JSON.stringify(data));
          }
        } catch (e) {}
        this._emit('sync:update', data);
      });

      ref.on('child_changed', (snapshot) => {
        this._emit('sync:childChanged', {
          key: snapshot.key,
          data: snapshot.val()
        });
      });

      ref.on('child_added', (snapshot) => {
        this._emit('sync:childAdded', {
          key: snapshot.key,
          data: snapshot.val()
        });
      });
      
      Utils.log('FirebaseAdapter', '✅ Realtime sync active - will receive updates from all devices');
    }

    /**
     * Stop realtime sync
     */
    stopSync() {
      if (!this.db) return;
      
      Utils.log('FirebaseAdapter', 'Stopping sync');
      this.db.ref('availability').off();
      this._syncActive = false;
    }

    /**
     * Update unit availability
     * @param {string} unitKey - Unit identifier
     * @param {object} data - Update data
     * @returns {Promise<object>} Result with success/queued status
     */
    async update(unitKey, data) {
      const update = {
        ...data,
        updatedAt: firebase.database.ServerValue?.TIMESTAMP || Date.now()
      };

      // Try immediate update if online
      if (this.state.get('isOnline') && this.state.get('isConnected')) {
        try {
          await this.db.ref(`availability/${unitKey}`).update(update);
          Utils.log('FirebaseAdapter', 'Updated:', unitKey);
          return { success: true, queued: false };
        } catch (err) {
          Utils.error('FirebaseAdapter', 'Update failed, queuing:', err);
          return this._queueUpdate(unitKey, update);
        }
      }

      // Queue for offline
      return this._queueUpdate(unitKey, update);
    }

    /**
     * Queue update for offline sync
     * @private
     */
    _queueUpdate(unitKey, data) {
      const queueItem = {
        id: Utils.uid(),
        unitKey,
        data,
        timestamp: Date.now()
      };

      const queue = [...this.state.get('offlineQueue'), queueItem];
      this.state.set('offlineQueue', queue);
      this._saveQueue(queue);

      this._emit('queue:added', queueItem);
      Utils.log('FirebaseAdapter', 'Queued:', unitKey);

      return { success: false, queued: true, item: queueItem };
    }

    /**
     * Process offline queue
     */
    async processQueue() {
      const queue = this.state.get('offlineQueue');
      if (queue.length === 0 || !this.db) return;

      Utils.log('FirebaseAdapter', 'Processing queue:', queue.length, 'items');

      const failed = [];

      for (const item of queue) {
        try {
          await this.db.ref(`availability/${item.unitKey}`).update(item.data);
          this._emit('queue:synced', item);
          Utils.log('FirebaseAdapter', 'Synced:', item.unitKey);
        } catch (err) {
          failed.push(item);
          Utils.error('FirebaseAdapter', 'Sync failed:', item.unitKey, err);
        }
      }

      this.state.set('offlineQueue', failed);
      this._saveQueue(failed);
    }

    /**
     * Save queue to localStorage
     * @private
     */
    _saveQueue(queue) {
      try {
        localStorage.setItem('availability_offline_queue', JSON.stringify(queue));
      } catch (err) {
        Utils.error('FirebaseAdapter', 'Failed to save queue:', err);
      }
    }

    /**
     * Load queue from localStorage
     */
    loadQueue() {
      try {
        const saved = localStorage.getItem('availability_offline_queue');
        if (saved) {
          const queue = JSON.parse(saved);
          this.state.set('offlineQueue', queue);
        }
      } catch (err) {
        Utils.error('FirebaseAdapter', 'Failed to load queue:', err);
      }
    }

    /**
     * Sign in
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>} Result
     */
    async signIn(email, password) {
      if (!this.auth) {
        return { success: false, error: 'Auth not initialized' };
      }

      try {
        const result = await this.auth.signInWithEmailAndPassword(email, password);
        Utils.log('FirebaseAdapter', 'Signed in:', result.user.email);
        return { success: true, user: result.user };
      } catch (err) {
        const message = this._getAuthErrorMessage(err.code);
        Utils.error('FirebaseAdapter', 'Sign in failed:', message);
        return { success: false, error: message };
      }
    }

    /**
     * Sign out
     */
    async signOut() {
      if (!this.auth) return { success: true };
      
      try {
        await this.auth.signOut();
        Utils.log('FirebaseAdapter', 'Signed out');
        return { success: true };
      } catch (err) {
        Utils.error('FirebaseAdapter', 'Sign out failed:', err);
        return { success: false, error: err.message };
      }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
      return this.auth?.currentUser || null;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
      return !!this.auth?.currentUser;
    }

    /**
     * Handle online event
     * @private
     */
    _onOnline() {
      this.state.set('isOnline', true);
      this._emit('online');
      
      // Process offline queue first
      this.processQueue();
      
      // Refresh availability data from Firebase after reconnecting
      // This ensures we have the latest data from other devices/users
      if (this.db && this.state.get('isConnected')) {
        Utils.log('FirebaseAdapter', '🔄 Refreshing availability data from Firebase...');
        this.db.ref('availability').once('value')
          .then((snapshot) => {
            const data = snapshot.val() || {};
            if (data && Object.keys(data).length > 0) {
              this.state.mergeAvailability(data);
              this.state.set('lastSyncTime', Date.now());
              // Update cache
              try {
                localStorage.setItem('availability_cache', JSON.stringify(data));
              } catch (e) {}
              this._emit('sync:update', data);
              Utils.log('FirebaseAdapter', '✅ Refreshed', Object.keys(data).length, 'units from Firebase');
            }
          })
          .catch((err) => {
            Utils.error('FirebaseAdapter', 'Failed to refresh data:', err);
          });
      }
    }

    /**
     * Handle offline event
     * @private
     */
    _onOffline() {
      this.state.set('isOnline', false);
      this._emit('offline');
    }

    /**
     * Get auth error message
     * @private
     */
    _getAuthErrorMessage(code) {
      const messages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'Account disabled',
        'auth/user-not-found': 'No account found',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Try again later',
        'auth/network-request-failed': 'Network error',
        'auth/operation-not-allowed': 'Sign-in not enabled'
      };
      return messages[code] || 'Authentication failed';
    }

    /**
     * Subscribe to Firebase events
     * @param {function} callback
     * @returns {function} Unsubscribe
     */
    onEvent(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
      };
    }

    /**
     * Emit event to listeners
     * @private
     */
    _emit(event, data) {
      this.listeners.forEach(cb => {
        try {
          cb(event, data);
        } catch (err) {
          Utils.error('FirebaseAdapter:listener', err);
        }
      });
    }
  }

  // ============================================================================
  // AUTH ADAPTER (Fallback for non-Firebase auth)
  // ============================================================================

  class AuthAdapter {
    constructor(state) {
      this.state = state;
      this.config = {
        tokenKey: 'auth_token',
        userKey: 'auth_user',
        expiryKey: 'auth_expiry'
      };
      this.listeners = [];
    }

    /**
     * Initialize auth adapter
     */
    init() {
      this._restoreSession();
      this._setupNetworkListener();
      return this;
    }

    /**
     * Restore session from storage
     * @private
     */
    _restoreSession() {
      try {
        const storage = localStorage;
        const user = storage.getItem(this.config.userKey);
        const expiry = storage.getItem(this.config.expiryKey);

        if (user && expiry) {
          const expiryTime = parseInt(expiry, 10);
          if (Date.now() < expiryTime) {
            const userData = JSON.parse(user);
            this.state.set('currentUser', userData);
            Utils.log('AuthAdapter', 'Session restored');
            this._emit('restored', userData);
            return;
          }
        }
        this._clearSession();
      } catch (err) {
        Utils.error('AuthAdapter', 'Failed to restore session:', err);
        this._clearSession();
      }
    }

    /**
     * Login with demo credentials
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>} Result
     */
    async login(email, password) {
      Utils.log('AuthAdapter', 'Login attempt:', email);

      // Demo users from brand config
      const brandAuth = (typeof window !== 'undefined' && window.BRAND && window.BRAND.auth) || {};
      const demoUsersRaw = brandAuth.demoUsers || {};
      const demoUsers = {};
      for (const [email, info] of Object.entries(demoUsersRaw)) {
        demoUsers[email.toLowerCase()] = {
          id: info.id || email,
          email: email.toLowerCase(),
          name: info.name || 'User',
          role: info.role || 'user'
        };
      }

      await new Promise(r => setTimeout(r, 300)); // Simulate network

      const user = demoUsers[email.toLowerCase()];
      if (!user) {
        const emails = Object.keys(demoUsersRaw);
        return {
          success: false,
          error: 'Invalid credentials.' + (emails.length ? ' Try: ' + emails.join(', ') : '')
        };
      }

      const token = 'mock_token_' + Date.now();
      const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      this._storeSession(user, token, expiry);
      this._emit('login', user);

      Utils.log('AuthAdapter', 'Login successful');
      return { success: true, user };
    }

    /**
     * Store session
     * @private
     */
    _storeSession(user, token, expiry) {
      try {
        localStorage.setItem(this.config.tokenKey, token);
        localStorage.setItem(this.config.userKey, JSON.stringify(user));
        localStorage.setItem(this.config.expiryKey, expiry.toString());
        this.state.set('currentUser', user);
      } catch (err) {
        Utils.error('AuthAdapter', 'Failed to store session:', err);
        throw err;
      }
    }

    /**
     * Clear session
     * @private
     */
    _clearSession() {
      try {
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.userKey);
        localStorage.removeItem(this.config.expiryKey);
        this.state.set('currentUser', null);
      } catch (err) {
        Utils.error('AuthAdapter', 'Failed to clear session:', err);
      }
    }

    /**
     * Logout
     */
    logout() {
      Utils.log('AuthAdapter', 'Logging out');
      this._clearSession();
      this._emit('logout');
    }

    /**
     * Setup network listener
     * @private
     */
    _setupNetworkListener() {
      window.addEventListener('online', () => this._emit('online'));
      window.addEventListener('offline', () => this._emit('offline'));
    }

    /**
     * Subscribe to auth events
     * @param {function} callback
     */
    onChange(callback) {
      this.listeners.push(callback);
      // Call immediately with current state
      callback(this.state.get('currentUser'));
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
      };
    }

    /**
     * Emit event
     * @private
     */
    _emit(event, data) {
      this.listeners.forEach(cb => {
        try {
          cb(event, data);
        } catch (err) {
          Utils.error('AuthAdapter:listener', err);
        }
      });
    }
  }

  // ============================================================================
  // TOUR DATA SYNC
  // ============================================================================

  class TourDataSync {
    constructor(state) {
      this.state = state;
      this.isReady = false;
      this.syncQueue = [];
    }

    /**
     * Mark tour data as ready
     */
    markReady() {
      Utils.log('TourDataSync', 'Tour data ready, isReady = true');
      this.isReady = true;

      // Check if TD and Srch are available
      const TD = global.TD || window.TD;
      const Srch = global.Srch || window.Srch;

      if (TD && TD.units && TD.units.length > 0 && Srch) {
        Utils.log('TourDataSync', 'TD and Srch available, triggering sync immediately');
        // Clear any queued requests
        this.syncQueue = [];
        // Sync immediately
        this.sync();
      } else {
        Utils.log('TourDataSync', 'TD or Srch not ready yet, queueing sync');
        Utils.log('TourDataSync', 'TD available:', !!(TD && TD.units), '| Units count:', TD?.units?.length || 0, '| Srch available:', !!Srch);
        // Queue sync for when they become available
        this.syncQueue.push(true);
        // Try again after a short delay
        setTimeout(() => {
          if (this.syncQueue.length > 0) {
            Utils.log('TourDataSync', 'Retrying sync after delay, queue length:', this.syncQueue.length);
            this.syncQueue = [];
            this.sync();
          }
        }, 100);
      }
    }

    /**
     * Sync availability with tour data
     */
    sync() {
      const TD = global.TD || window.TD;
      if (!TD || !TD.units) {
        if (!this.isReady) {
          Utils.log('TourDataSync', 'Not ready, queueing sync');
          this.syncQueue.push(true);
        } else {
          Utils.log('TourDataSync', 'TD.units not available yet');
        }
        return;
      }

      // Check for Srch availability
      const Srch = global.Srch || window.Srch;
      if (!Srch) {
        Utils.log('TourDataSync', 'Srch not available yet, queuing sync');
        this.syncQueue.push(true);
        return;
      }

      const availability = this.state.get('availability');
      let updatedCount = 0;
      let syncedCount = 0;
      let defaultCount = 0;
      let unchangedCount = 0;

      Utils.log('TourDataSync', 'Starting sync - TD.units.length:', TD.units.length, 'availability keys:', Object.keys(availability).length);

      TD.units.forEach(unit => {
        const availData = availability[unit.id] || availability[unit.unitNumber];
        const oldStatus = unit.status;
        
        if (availData?.status) {
          const normalizedStatus = Utils.normalizeStatus(availData.status);
          if (unit.status !== normalizedStatus) {
            Utils.log('TourDataSync', 'Updating unit', unit.id, '(' + unit.unitNumber + ')', 'status:', unit.status, '→', normalizedStatus);
            updatedCount++;
          } else {
            unchangedCount++;
          }
          unit.status = normalizedStatus;
          syncedCount++;
        } else {
          // Ensure unit has a default status if not set
          if (!unit.status) {
            unit.status = 'Available';
            defaultCount++;
          }
        }
      });

      Utils.log('TourDataSync', '✅ Sync complete:', updatedCount, 'updated,', unchangedCount, 'unchanged,', syncedCount, 'total synced,', defaultCount, 'set to default');
      Utils.log('TourDataSync', 'Sample units after sync:', TD.units.slice(0, 3).map(u => u.id + ':' + u.status).join(', '));

      // Refresh search UI - call sync to ensure highlights are updated
      if (typeof Srch.sync === 'function') {
        Utils.log('TourDataSync', 'Calling Srch.sync() to refresh search results');
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          try {
            Srch.sync();
            Utils.log('TourDataSync', 'Srch.sync() completed successfully');
          } catch (err) {
            Utils.error('TourDataSync', 'Srch.sync() failed:', err);
          }
        });
      } else if (typeof Srch.render === 'function') {
        Utils.log('TourDataSync', 'Calling Srch.render() to refresh search results');
        requestAnimationFrame(() => {
          try {
            Srch.render(TD.units);
          } catch (err) {
            Utils.error('TourDataSync', 'Srch.render() failed:', err);
          }
        });
      } else {
        Utils.log('TourDataSync', 'Srch found but no sync/render method available');
      }

      this._emit('synced', { count: updatedCount, total: syncedCount, defaults: defaultCount });
    }

    /**
     * Subscribe to sync events
     */
    onSync(callback) {
      if (!this._listeners) this._listeners = [];
      this._listeners.push(callback);
      return () => {
        this._listeners = this._listeners.filter(l => l !== callback);
      };
    }

    /**
     * Emit sync event
     * @private
     */
    _emit(event, data) {
      if (this._listeners) {
        this._listeners.forEach(cb => cb(event, data));
      }
    }
  }

  // ============================================================================
  // UI MANAGER
  // ============================================================================

  class UIManager {
    constructor(system) {
      this.system = system;
      this.elements = {};
    }

    /**
     * Initialize UI manager
     */
    init() {
      this._cacheElements();
      this._setupEventListeners();
      this._setupSubscriptions();
      Utils.log('UIManager', 'Initialized');
    }

    /**
     * Cache DOM elements
     * @private
     */
    _cacheElements() {
      this.elements = {
        loginBtn: document.getElementById('login-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        adminBtn: document.getElementById('admin-btn'),
        userInfo: document.getElementById('user-info'),
        authModal: document.getElementById('auth-modal'),
        authForm: document.getElementById('auth-form'),
        authEmail: document.getElementById('auth-email'),
        authPassword: document.getElementById('auth-password'),
        authError: document.getElementById('auth-error'),
        authSubmit: document.getElementById('auth-submit'),
        adminPanel: document.getElementById('availability-admin-panel'),
        unitsList: document.getElementById('availability-units-list'),
        saveAllBtn: document.getElementById('am-save-all-btn'),
        connectionStatus: document.getElementById('connection-status')
      };
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
      const { authForm, authEmail } = this.elements;

      if (authForm) {
        authForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.system.login(authEmail.value, authEmail.value);
        });
      }

      // Close modal on outside click
      if (this.elements.authModal) {
        this.elements.authModal.addEventListener('click', (e) => {
          if (e.target === this.elements.authModal) {
            this.hideLoginModal();
          }
        });
      }
    }

    /**
     * Setup state subscriptions
     * @private
     */
    _setupSubscriptions() {
      const state = this.system.state;

      // Auth state
      state.subscribe('currentUser', (user) => {
        this._updateAuthUI(user);
        if (user) {
          this.renderUnitsList();
        }
      });

      // Availability data - only update admin panel UI
      // (Tour data sync is handled by AvailabilitySystem._setupAutoSync)
      state.subscribe('availability', (data) => {
        Utils.log('UIManager', 'Availability data changed, re-rendering units list...');
        this.renderUnitsList();
      });

      // Pending changes
      state.subscribe('pendingChanges', (changes) => {
        this._updateSaveAllButton(Object.keys(changes).length);
      });

      // Connection status
      state.subscribe('isConnected', (connected) => {
        this._updateConnectionStatus(connected);
      });

      // Online status
      state.subscribe('isOnline', (online) => {
        if (!online) {
          this.showToast('Offline - changes will sync when online', 'info');
        }
      });
    }

    /**
     * Update auth UI
     * @private
     */
    _updateAuthUI(user) {
      const { loginBtn, logoutBtn, adminBtn, userInfo } = this.elements;
      const loginHdrBtn = document.getElementById('login-hdr-btn');

      // Show login button in header when not logged in
      if (loginHdrBtn) {
        loginHdrBtn.style.display = user ? 'none' : 'flex';
      }

      // Legacy buttons (if they exist)
      if (loginBtn) loginBtn.style.display = user ? 'none' : 'flex';
      if (logoutBtn) logoutBtn.style.display = user ? 'flex' : 'none';
      if (adminBtn) adminBtn.style.display = user ? 'flex' : 'none';

      // Update auth section in availability panel
      this._renderAuthSection(user);

      if (userInfo) {
        if (user) {
          userInfo.style.display = 'flex';
          const initial = user.email?.[0]?.toUpperCase() || '👤';
          userInfo.innerHTML = `
            <span class="ui-avatar">${initial}</span>
            <span class="ui-name">${user.email || 'User'}</span>
          `;
        } else {
          userInfo.style.display = 'none';
        }
      }
    }

    /**
     * Render auth section in availability panel
     * @private
     */
    _renderAuthSection(user) {
      const authSection = document.getElementById('am-auth-section');
      if (!authSection) return;

      if (user) {
        // Logged in - show user info and logout
        authSection.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
              <span class="ui-avatar" style="width:24px;height:24px;font-size:12px;flex-shrink:0">${user.email?.[0]?.toUpperCase() || '👤'}</span>
              <span class="am-auth-email" style="flex:1;min-width:0">${user.email || 'User'}</span>
            </div>
            <button class="am-btn am-btn-secondary" onclick="AvailabilitySystem.handleLogout()" style="padding:4px 8px;font-size:9px;flex-shrink:0">🚪 Logout</button>
          </div>
        `;
      } else {
        // Not logged in - show login form
        authSection.innerHTML = `
          <form id="am-login-form" onsubmit="AvailabilitySystem.handleLogin(event)" style="display:flex;flex-direction:column;gap:6px">
            <input type="email" id="am-login-email" class="am-input" placeholder="Email" style="padding:6px 8px;font-size:10px" required>
            <input type="password" id="am-login-password" class="am-input" placeholder="Password" style="padding:6px 8px;font-size:10px" required>
            <div style="display:flex;gap:6px">
              <button type="submit" class="am-btn am-btn-primary" style="flex:1;padding:6px 10px;font-size:9.5px">🔐 Login</button>
              <button type="button" class="am-btn am-btn-secondary" onclick="AvailabilitySystem.hideAdminPanel()" style="padding:6px 10px;font-size:9.5px">✕</button>
            </div>
          </form>
          <div style="font-size:8.5px;color:var(--t3);text-align:center;margin-top:4px" id="admin-panel-hint">
          </div>
          <script>
            (function(){
              const auth = (typeof window !== 'undefined' && window.BRAND && window.BRAND.auth) || {};
              const emails = Object.keys(auth.demoUsers || {});
              const el = document.getElementById('admin-panel-hint');
              if (el) el.textContent = emails.length ? emails[0] : '';
            })();
          </script>
        `;
      }
    }

    /**
     * Update connection status indicator
     * @private
     */
    _updateConnectionStatus(connected) {
      const el = this.elements.connectionStatus;
      if (!el) return;

      if (connected) {
        el.className = 'connection-status online';
        el.innerHTML = '<span class="cs-dot"></span><span class="cs-txt">Online</span>';
      } else {
        el.className = 'connection-status offline';
        el.innerHTML = '<span class="cs-dot"></span><span class="cs-txt">Offline</span>';
      }
    }

    /**
     * Update save all button state
     * @private
     */
    _updateSaveAllButton(count) {
      const btn = this.elements.saveAllBtn;
      if (!btn) return;

      btn.disabled = count === 0;
      btn.innerHTML = `<span class="ico">💾</span> Save All${count > 0 ? ` (${count})` : ''}`;
      btn.style.opacity = count === 0 ? '0.5' : '1';
    }

    /**
     * Render units list in admin panel
     */
    renderUnitsList() {
      const container = this.elements.unitsList;
      if (!container) return;

      const availability = this.system.state.get('availability');
      const keys = Object.keys(availability).sort();

      if (keys.length === 0) {
        container.innerHTML = `
          <div class="am-empty">
            <div class="am-empty-icon">📭</div>
            <div class="am-empty-txt">No units found</div>
            <small>Add data to Firebase /availability/ path</small>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      keys.forEach(key => {
        const unit = availability[key];
        const row = this._createUnitRow(key, unit);
        container.appendChild(row);
      });
    }

    /**
     * Create unit row element
     * @private
     */
    _createUnitRow(key, unit) {
      const row = document.createElement('div');
      row.className = 'am-unit-row';
      row.dataset.unit = key;

      // Normalize status: ensure we store lowercase in Firebase/admin panel
      const status = Utils.denormalizeStatus(unit.status);
      const notes = unit.notes || '';
      const name = unit.name || unit.unitName || key;
      const type = unit.type || unit.unitType || '';
      const area = unit.area || '';
      const bedrooms = unit.bedrooms || '';
      const price = unit.priceFormatted || unit.price || '';

      row.innerHTML = `
        <div class="am-unit-header">
          <div class="am-unit-name">${name} ${type ? '(' + type + ')' : ''} ${area ? '• ' + area + 'm²' : ''} ${bedrooms ? '• ' + bedrooms + 'BR' : ''}</div>
          <div class="am-unit-status am-status-${status}" data-status="${status}">${this._getStatusLabel(status)}</div>
        </div>
        <div class="am-unit-body">
          ${price ? `<div style="font-size:11px;color:var(--pri);font-weight:700;margin-bottom:8px">${price}</div>` : ''}
          <div class="am-status-toggle">
            <label>Status</label>
            <div class="am-status-buttons">
              <button class="am-status-btn ${status === 'available' ? 'active' : ''}" data-status="available">✅ Available</button>
              <button class="am-status-btn ${status === 'reserved' ? 'active' : ''}" data-status="reserved">⏸️ Reserved</button>
              <button class="am-status-btn ${status === 'sold' ? 'active' : ''}" data-status="sold">❌ Sold</button>
              <button class="am-status-btn ${status === 'unavailable' ? 'active' : ''}" data-status="unavailable">🚫 Unavailable</button>
            </div>
          </div>
          <div class="am-notes">
            <label>Notes (optional)</label>
            <input type="text" class="am-input" data-action="notes" value="${notes}" placeholder="Add notes...">
          </div>
          <div class="am-actions">
            <div class="am-sync-status"></div>
            <span class="am-pending-badge" style="display:none;font-size:9px;color:var(--warn);font-weight:600;margin-left:auto">● Unsaved</span>
          </div>
          ${unit.updatedAt ? `<div class="am-updated">Updated: ${Utils.formatDate(unit.updatedAt)} by ${unit.updatedBy || 'Unknown'}</div>` : ''}
        </div>
      `;

      this._setupRowListeners(row, key);
      return row;
    }

    /**
     * Setup unit row event listeners
     * @private
     */
    _setupRowListeners(row, key) {
      const statusBtns = row.querySelectorAll('.am-status-btn');
      const notesInput = row.querySelector('[data-action="notes"]');
      const pendingBadge = row.querySelector('.am-pending-badge');

      statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          statusBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._markUnitPending(key, row);
        });
      });

      notesInput.addEventListener('input', () => {
        this._markUnitPending(key, row);
      });
    }

    /**
     * Mark unit as having pending changes
     * @private
     */
    _markUnitPending(key, row) {
      const activeBtn = row.querySelector('.am-status-btn.active');
      const status = activeBtn?.dataset.status || 'available';
      const notes = row.querySelector('[data-action="notes"]')?.value.trim() || '';
      const pendingBadge = row.querySelector('.am-pending-badge');

      this.system.state.set('pendingChanges', {
        ...this.system.state.get('pendingChanges'),
        [key]: {
          status,
          notes,
          updatedAt: Date.now(),
          updatedBy: this.system.state.get('currentUser')?.email || 'unknown'
        }
      });

      if (pendingBadge) pendingBadge.style.display = 'inline-block';
    }

    /**
     * Get status label
     * @private
     */
    _getStatusLabel(status) {
      const labels = {
        available: 'Available',
        reserved: 'Reserved',
        sold: 'Sold',
        unavailable: 'Unavailable'
      };
      return labels[status] || status;
    }

    /**
     * Show login modal
     */
    showLoginModal() {
      const modal = this.elements.authModal;
      if (modal) {
        modal.classList.add('open');
        this.elements.authEmail?.focus();
      }
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
      const modal = this.elements.authModal;
      if (modal) {
        modal.classList.remove('open');
      }
    }

    /**
     * Show admin panel
     */
    showAdminPanel() {
      const panel = this.elements.adminPanel;
      if (panel) panel.classList.add('open');
    }

    /**
     * Hide admin panel
     */
    hideAdminPanel() {
      const panel = this.elements.adminPanel;
      if (panel) panel.classList.remove('open');
    }

    /**
     * Toggle admin panel
     */
    toggleAdminPanel() {
      // Show warning if offline
      if (!navigator.onLine) {
        if (typeof showToast === 'function') {
          showToast('⚠️ You are offline - changes will sync when connection is restored', 'warning', 4000);
        }
      }
      
      const panel = this.elements.adminPanel;
      if (panel) panel.classList.toggle('open');
    }

    /**
     * Show auth error in modal
     * @param {string} message
     */
    showAuthError(message) {
      const errorEl = this.elements.authError;
      const submitBtn = this.elements.authSubmit;
      
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }

    /**
     * Set auth form loading state
     * @param {boolean} loading
     */
    setAuthLoading(loading) {
      const submitBtn = this.elements.authSubmit;
      const errorEl = this.elements.authError;
      
      if (submitBtn) {
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? 'Signing in...' : 'Sign In';
      }
      if (errorEl) errorEl.style.display = 'none';
    }

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `am-toast am-toast-${type}`;
      toast.innerHTML = `
        <span class="am-toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="am-toast-msg">${message}</span>
      `;

      document.body.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('am-toast-show'));

      setTimeout(() => {
        toast.classList.remove('am-toast-show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    /**
     * Update unit row UI
     * @param {string} key
     * @param {object} data
     */
    updateUnitRow(key, data) {
      const row = document.querySelector(`[data-unit="${key}"]`);
      if (!row) return;

      const status = Utils.denormalizeStatus(data.status);
      const statusBadge = row.querySelector('.am-unit-status');
      const statusBtns = row.querySelectorAll('.am-status-btn');
      const notesInput = row.querySelector('[data-action="notes"]');
      const updatedDiv = row.querySelector('.am-updated');

      if (statusBadge) {
        statusBadge.className = `am-unit-status am-status-${status}`;
        statusBadge.textContent = this._getStatusLabel(status);
      }

      statusBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
      });

      if (notesInput) notesInput.value = data.notes || '';

      if (updatedDiv && data.updatedAt) {
        updatedDiv.textContent = `Updated: ${Utils.formatDate(data.updatedAt)} by ${data.updatedBy || 'Unknown'}`;
      }

      // Hide pending badge
      const badge = row.querySelector('.am-pending-badge');
      if (badge) badge.style.display = 'none';
    }
  }

  // ============================================================================
  // MAIN SYSTEM (FACADE)
  // ============================================================================

  class AvailabilitySystem {
    constructor() {
      this.state = new StateManager();
      this.firebase = new FirebaseAdapter(this.state);
      this.auth = new AuthAdapter(this.state);
      this.tourSync = new TourDataSync(this.state);
      this.ui = new UIManager(this);
      this._initialized = false;
    }

    /**
     * Initialize the system
     */
    async init() {
      if (this._initialized) {
        Utils.log('AvailabilitySystem', 'Already initialized');
        return;
      }

      Utils.log('AvailabilitySystem', 'Initializing...');

      // Load cached availability data FIRST (before Firebase) so offline mode has data
      this._loadCachedData();

      // Initialize Firebase
      const firebaseReady = await this.firebase.init();
      if (firebaseReady) {
        this.firebase.setupListeners();
        this.firebase.loadQueue();
      }

      // Initialize auth adapter
      this.auth.init();

      // Initialize UI
      this.ui.init();

      // Setup global event handlers
      this._setupGlobalHandlers();

      // Setup auto-sync with tour data when availability changes
      this._setupAutoSync();

      this._initialized = true;
      Utils.log('AvailabilitySystem', 'Initialized successfully');
    }

    /**
     * Load cached availability data from localStorage
     * This ensures offline mode has the last known data
     * @private
     */
    _loadCachedData() {
      try {
        const cached = localStorage.getItem('availability_cache');
        if (cached) {
          const data = JSON.parse(cached);
          if (data && Object.keys(data).length > 0) {
            Utils.log('AvailabilitySystem', 'Loaded', Object.keys(data).length, 'units from cache');
            this.state.mergeAvailability(data);
          }
        }
      } catch (e) {
        Utils.log('AvailabilitySystem', 'Failed to load cached data:', e.message);
      }
    }

    /**
     * Save availability data to localStorage cache
     * Called whenever data changes to keep offline cache fresh
     * @private
     */
    _saveCachedData() {
      try {
        const data = this.state.get('availability');
        if (data && Object.keys(data).length > 0) {
          localStorage.setItem('availability_cache', JSON.stringify(data));
        }
      } catch (e) {
        Utils.log('AvailabilitySystem', 'Failed to save cache:', e.message);
      }
    }

    /**
     * Setup auto-sync with tour data when availability changes
     * @private
     */
    _setupAutoSync() {
      // Subscribe to availability changes from Firebase (including changes from other devices)
      // IMPORTANT: Only sync AFTER tourSync.isReady is true to avoid race conditions
      this.subscribe('availability', (data) => {
        // Always save to localStorage cache when data changes
        this._saveCachedData();

        // Skip initial load - only sync when tourSync is ready (after boot() calls markReady)
        if (data && Object.keys(data).length > 0 && this.tourSync.isReady) {
          Utils.log('AvailabilitySystem', '🔄 Availability changed from Firebase, syncing with tour data...');
          // Debounce to avoid rapid successive syncs
          if (this._syncDebounce) clearTimeout(this._syncDebounce);
          this._syncDebounce = setTimeout(() => {
            Utils.log('AvailabilitySystem', 'Triggering tour data sync...');
            this.tourSync.sync();
          }, 150);
        } else if (data && Object.keys(data).length > 0 && !this.tourSync.isReady) {
          Utils.log('AvailabilitySystem', '⏳ Availability loaded but tourSync not ready yet, waiting...');
        }
      });
    }

    /**
     * Setup global event handlers
     * @private
     */
    _setupGlobalHandlers() {
      // Expose methods to window for HTML onclick handlers
      const self = this;

      // Keep reference to full system object for programmatic access
      window.AvailabilitySystemCore = this;

      window.AvailabilitySystem = {
        // Auth
        showLoginModal: () => self.ui.showLoginModal(),
        hideLoginModal: () => self.ui.hideLoginModal(),
        handleLogin: async (e) => {
          e.preventDefault();
          const email = document.getElementById('auth-email')?.value.trim();
          const password = document.getElementById('auth-password')?.value;
          await self.login(email, password);
        },
        handleLogout: () => self.logout(),

        // Admin panel
        showAdminPanel: () => self.ui.showAdminPanel(),
        hideAdminPanel: () => self.ui.hideAdminPanel(),
        toggleAdminPanel: () => self.ui.toggleAdminPanel(),
        saveAllChanges: () => self.saveAllChanges(),

        // Tour data sync
        markTdReady: () => self.tourSync.markReady(),

        // State subscription (for boot process)
        subscribe: (key, callback) => self.subscribe(key, callback),

        // State access
        state: self.state
      };

      // Also expose as AvailabilityManager for backwards compatibility
      global.AvailabilityManager = window.AvailabilitySystem;
    }

    /**
     * Login user
     * @param {string} email
     * @param {string} password
     */
    async login(email, password) {
      Utils.log('AvailabilitySystem', 'Login:', email);

      this.ui.setAuthLoading(true);

      // Try Firebase auth first
      if (this.firebase.auth) {
        const result = await this.firebase.signIn(email, password);
        if (result.success) {
          this.ui.hideLoginModal();
          this.ui.showToast('Signed in successfully', 'success');
          return;
        }
        // Firebase auth failed, show error
        this.ui.showAuthError(result.error);
        return;
      }

      // Fallback to demo auth
      const result = await this.auth.login(email, password);
      if (result.success) {
        this.ui.hideLoginModal();
        this.ui.showToast('Signed in successfully', 'success');
      } else {
        this.ui.showAuthError(result.error);
      }
    }

    /**
     * Logout user
     */
    async logout() {
      Utils.log('AvailabilitySystem', 'Logout');

      if (this.firebase.auth) {
        await this.firebase.signOut();
      }
      this.auth.logout();
      this.ui.showToast('Signed out successfully', 'success');
    }

    /**
     * Handle login form submission (for HTML form)
     * @param {Event} event
     */
    async handleLogin(event) {
      if (event) event.preventDefault();
      const email = document.getElementById('auth-email')?.value.trim();
      const password = document.getElementById('auth-password')?.value;
      await this.login(email, password);
    }

    /**
     * Handle logout button click (for HTML button)
     */
    async handleLogout() {
      await this.logout();
    }

    /**
     * Mark tour data as ready (for integration with boot code)
     */
    markTdReady() {
      this.tourSync.markReady();
    }

    /**
     * Save all pending changes
     */
    async saveAllChanges() {
      const pending = this.state.get('pendingChanges');
      const keys = Object.keys(pending);

      if (keys.length === 0) {
        Utils.log('AvailabilitySystem', 'No pending changes');
        return;
      }

      Utils.log('AvailabilitySystem', 'Saving', keys.length, 'changes');

      // Update local state FIRST with normalized status (capitalized for TD.units)
      // This ensures offline mode still shows correct status immediately
      keys.forEach(key => {
        const normalizedData = {
          ...pending[key],
          status: Utils.normalizeStatus(pending[key].status)
        };
        this.state.updateUnit(key, normalizedData);
      });

      // Send to Firebase with lowercase status (for storage)
      const promises = keys.map(key => {
        const firebaseData = {
          ...pending[key],
          status: Utils.denormalizeStatus(pending[key].status)
        };
        return this.firebase.update(key, firebaseData);
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const queuedCount = results.filter(r => r.queued).length;

      // Clear pending changes
      this.state.set('pendingChanges', {});

      // Update UI (denormalize back to lowercase for admin panel)
      keys.forEach(key => {
        this.ui.updateUnitRow(key, pending[key]);
      });

      // Sync with tour data (will use capitalized status from state)
      this.tourSync.sync();

      if (successCount > 0) {
        this.ui.showToast(`Saved ${successCount} unit${successCount > 1 ? 's' : ''}`, 'success');
      }
      if (queuedCount > 0) {
        this.ui.showToast(`${queuedCount} changes queued for sync`, 'info');
      }
    }

    /**
     * Update single unit availability
     * @param {string} unitKey
     * @param {string} status
     * @param {string} notes
     */
    async updateUnit(unitKey, status, notes = '') {
      // Prepare data for Firebase (lowercase status)
      const firebaseData = {
        status: Utils.denormalizeStatus(status),
        notes,
        updatedAt: Date.now(),
        updatedBy: this.state.get('currentUser')?.email || 'unknown'
      };

      // Prepare data for local state (capitalized status)
      const stateData = {
        status: Utils.normalizeStatus(status),
        notes,
        updatedAt: Date.now(),
        updatedBy: this.state.get('currentUser')?.email || 'unknown'
      };

      const result = await this.firebase.update(unitKey, firebaseData);

      if (result.success) {
        this.state.updateUnit(unitKey, stateData);
        this.ui.showToast('Availability updated', 'success');
      } else if (result.queued) {
        this.state.updateUnit(unitKey, stateData);
        this.ui.showToast('Offline - will sync when online', 'info');
      } else {
        this.ui.showToast('Update failed', 'error');
      }

      this.tourSync.sync();
    }

    /**
     * Get availability data
     * @returns {object}
     */
    getAvailability() {
      return this.state.get('availability');
    }

    /**
     * Get cached availability for specific unit
     * @param {string} unitKey
     * @returns {object}
     */
    getUnitAvailability(unitKey) {
      return this.state.get('availability')?.[unitKey] || null;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
      return !!this.state.get('currentUser');
    }

    /**
     * Get current user
     * @returns {object|null}
     */
    getCurrentUser() {
      return this.state.get('currentUser');
    }

    /**
     * Get connection status
     * @returns {boolean}
     */
    isConnected() {
      return this.state.get('isConnected');
    }

    /**
     * Get online status
     * @returns {boolean}
     */
    isOnline() {
      return this.state.get('isOnline');
    }

    /**
     * Get queue status
     * @returns {object}
     */
    getQueueStatus() {
      const queue = this.state.get('offlineQueue');
      return {
        length: queue.length,
        isOnline: this.state.get('isOnline'),
        isConnected: this.state.get('isConnected')
      };
    }

    /**
     * Subscribe to system events
     * @param {function} callback
     * @returns {function} Unsubscribe
     */
    onEvent(callback) {
      return this.firebase.onEvent(callback);
    }

    /**
     * Subscribe to state changes
     * @param {string} key
     * @param {function} callback
     * @returns {function} Unsubscribe
     */
    subscribe(key, callback) {
      return this.state.subscribe(key, callback);
    }
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  // Create global instance
  const system = new AvailabilitySystem();

  // Auto-initialize on DOM ready
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      system.init();
    });
  }

  // Export to globals
  global.AvailabilitySystem = system;
  global.AvailabilityManager = system; // Backwards compatibility

  // Export classes for advanced usage
  global.AvailabilitySystemClasses = {
    StateManager,
    FirebaseAdapter,
    AuthAdapter,
    TourDataSync,
    UIManager,
    Utils
  };

  // ============================================================================
  // BACKWARDS COMPATIBILITY LAYER
  // For legacy code that directly accesses FirebaseService, AuthManager, etc.
  // ============================================================================

  // Legacy methods on AvailabilityManager (attach early for boot code)
  system.saveCache = function() {
    try {
      localStorage.setItem('availability_cache', JSON.stringify(this.state.get('availability')));
    } catch (e) { }
  };

  system.loadCachedData = function() {
    try {
      const cached = localStorage.getItem('availability_cache');
      if (cached) this.state.mergeAvailability(JSON.parse(cached));
    } catch (e) { }
  };

  system.updateUnitInCache = function(unitKey, data) {
    this.state.updateUnit(unitKey, data);
    this.saveCache();
  };

  system.loadAvailabilityData = function() {
    if (system.firebase.db) {
      system.firebase.db.ref('availability').once('value')
        .then((snapshot) => {
          const data = snapshot.val() || {};
          system.state.mergeAvailability(data);
          system.saveCache();
        })
        .catch((error) => {});
    }
  };

  system.setupFirebaseListeners = function() {
    system.firebase.startSync();
  };

  system.setupAuthListeners = function() {
    system.auth.onChange((user) => {
      const state = !!user ? 'authenticated' : 'unauthenticated';
      // Notify any legacy listeners
    });
  };

  // FirebaseService backwards compatibility
  global.FirebaseService = {
    // Direct database access for legacy code
    get db() { return system.firebase.db; },
    get auth() { return system.firebase.auth; },
    get config() { return system.firebase.config; },
    get isConnected() { return system.state.get('isConnected'); },
    get isOnline() { return system.state.get('isOnline'); },
    get availabilityCache() { return system.state.get('availability'); },

    // Methods
    init: () => system.init(),
    signIn: (email, password) => system.firebase.signIn(email, password),
    signOut: () => system.firebase.signOut(),
    isAuthenticated: () => system.firebase.isAuthenticated(),
    getCurrentUser: () => system.firebase.getCurrentUser(),
    updateAvailability: (unitKey, data) => system.firebase.update(unitKey, data),
    getAvailabilityCache: () => system.getAvailability(),
    getQueueStatus: () => system.getQueueStatus(),
    onEvent: (cb) => system.firebase.onEvent(cb),

    // Legacy cache methods
    saveCache: () => system.saveCache(),
    loadCache: () => system.loadCachedData()
  };

  // AuthManager backwards compatibility
  global.AuthManager = {
    get session() {
      const user = system.state.get('currentUser');
      return {
        isAuthenticated: !!user,
        user: user,
        role: user?.role || 'viewer'
      };
    },

    init: () => system.auth.init(),
    login: (email, password) => system.auth.login(email, password),
    logout: () => system.auth.logout(),
    hasRole: (roles) => system.auth.hasRole?.(roles) || true,
    getCurrentUser: () => system.getCurrentUser(),
    getToken: () => system.auth.getToken?.(),
    getAuthHeaders: () => system.auth.getAuthHeaders?.(),
    isOnline: () => system.state.get('isOnline'),
    onAuthChange: (cb) => system.auth.onChange(cb)
  };

  // Add backwards compatibility properties to AvailabilityManager
  Object.defineProperties(system, {
    availabilityData: {
      get: function() { return this.state.get('availability'); },
      set: function(data) { this.state.set('availability', data); }
    },
    pendingChanges: {
      get: function() { return this.state.get('pendingChanges'); },
      set: function(data) { this.state.set('pendingChanges', data); }
    },
    isLoading: {
      get: function() { return this.state.get('isLoading'); },
      set: function(val) { this.state.set('isLoading', val); }
    },
    isTdReady: {
      get: function() { return this.tourSync.isReady; },
      set: function(val) { this.tourSync.isReady = val; }
    },
    syncQueue: {
      get: function() { return this.tourSync.syncQueue; },
      set: function(val) { this.tourSync.syncQueue = val; }
    },
    config: {
      get value() {
        const brandAuth = (typeof window !== 'undefined' && window.BRAND && window.BRAND.auth) || {};
        return {
          adminEmails: brandAuth.adminEmails || [],
          statusColors: {
            available: 'var(--ok)',
            reserved: 'var(--warn)',
            sold: 'var(--err)',
            unavailable: 'var(--t3)'
          },
          statusLabels: {
            available: 'Available',
            reserved: 'Reserved',
            sold: 'Sold',
            unavailable: 'Unavailable'
          }
        };
      }
    }
  });

  // Method aliases for backwards compatibility
  system.hideLoginModal = system.ui.hideLoginModal.bind(system.ui);
  system.hideAdminPanel = system.ui.hideAdminPanel.bind(system.ui);

})(typeof window !== 'undefined' ? window : this);

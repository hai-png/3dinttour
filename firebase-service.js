/**
 * Firebase Service - Realtime Database Integration
 * 
 * Features:
 * - Firebase Realtime Database connection
 * - Realtime sync for availability data
 * - Offline-first with queue management
 * - Works on web/mobile/desktop PWA
 * - Authentication integration
 */

const FirebaseService = {
  // Firebase configuration
  config: {
    apiKey: "AIzaSyCtjYMbznVZ1-x2Yqu5wQ_zz9PU92UYxRE",
    authDomain: "availability-fe35f.firebaseapp.com",
    projectId: "availability-fe35f",
    storageBucket: "availability-fe35f.firebasestorage.app",
    messagingSenderId: "1031392756810",
    appId: "1:1031392756810:web:7c3dfdf4e40307589992b3",
    measurementId: "G-5QSYX7XDM2",
    databaseURL: "https://availability-fe35f-default-rtdb.firebaseio.com/"
  },

  // State
  db: null,
  auth: null,
  isConnected: false,
  isOnline: navigator.onLine,
  offlineQueue: [],
  listeners: [],
  availabilityCache: {},

  /**
   * Initialize Firebase
   */
  async init() {
    console.log('[FirebaseService] Initializing...');
    
    try {
      // Load Firebase SDK from CDN
      await this.loadFirebaseSDK();
      
      // Initialize Firebase
      firebase.initializeApp(this.config);
      this.db = firebase.database();
      this.auth = firebase.auth();
      
      // Setup network listeners
      this.setupNetworkListener();
      
      // Setup auth listeners
      this.setupAuthListener();
      
      console.log('[FirebaseService] Initialized successfully');
      this.isConnected = true;
      this.notifyListeners('init', { success: true });
      
      return true;
    } catch (error) {
      console.error('[FirebaseService] Initialization failed:', error);
      this.isConnected = false;
      this.notifyListeners('init', { success: false, error: error.message });
      return false;
    }
  },

  /**
   * Load Firebase SDK from CDN
   */
  loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (typeof firebase !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
      script.async = true;
      script.onload = () => {
        // Load additional Firebase services
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
        dbScript.async = true;
        dbScript.onload = () => {
          const authScript = document.createElement('script');
          authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
          authScript.async = true;
          authScript.onload = resolve;
          authScript.onerror = reject;
          document.head.appendChild(authScript);
        };
        dbScript.onerror = reject;
        document.head.appendChild(dbScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * Setup authentication state listener
   */
  setupAuthListener() {
    if (!this.auth) return;
    
    this.auth.onAuthStateChanged((user) => {
      console.log('[FirebaseService] Auth state changed:', user ? user.email : 'logged out');
      this.notifyListeners('auth', user);
      
      if (user) {
        this.startRealtimeSync();
      } else {
        this.stopRealtimeSync();
      }
    });
  },

  /**
   * Setup network status listener
   */
  setupNetworkListener() {
    window.addEventListener('online', () => {
      console.log('[FirebaseService] Network online');
      this.isOnline = true;
      this.notifyListeners('online', null);
      this.processOfflineQueue();
      this.startRealtimeSync();
    });

    window.addEventListener('offline', () => {
      console.log('[FirebaseService] Network offline');
      this.isOnline = false;
      this.notifyListeners('offline', null);
      this.stopRealtimeSync();
    });

    // Firebase built-in connection status
    if (this.db) {
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        const isConnected = snap.val() === true;
        console.log('[FirebaseService] Firebase connection:', isConnected ? 'connected' : 'disconnected');
        this.isConnected = isConnected;
        this.notifyListeners('connection', isConnected);
        
        if (isConnected && this.isOnline && this.isAuthenticated()) {
          console.log('[FirebaseService] Connection established, starting sync...');
          this.startRealtimeSync();
          this.processOfflineQueue();
        }
      });
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    console.log('[FirebaseService] Sign in attempt:', email);
    
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      console.log('[FirebaseService] Sign in successful:', userCredential.user.email);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[FirebaseService] Sign in failed:', error);
      return { 
        success: false, 
        error: this.getAuthErrorMessage(error.code) 
      };
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    console.log('[FirebaseService] Sign out');
    
    if (!this.auth) return;

    try {
      await this.auth.signOut();
      console.log('[FirebaseService] Sign out successful');
      return { success: true };
    } catch (error) {
      console.error('[FirebaseService] Sign out failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth ? this.auth.currentUser : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.auth && this.auth.currentUser !== null;
  },

  /**
   * Get auth error message
   */
  getAuthErrorMessage(code) {
    const messages = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/operation-not-allowed': 'This sign-in method is not enabled'
    };
    return messages[code] || 'Authentication failed. Please try again';
  },

  /**
   * Start realtime sync for availability data
   */
  startRealtimeSync() {
    if (!this.db || !this.isOnline) {
      console.log('[FirebaseService] Cannot start sync - DB:', !!this.db, 'Online:', this.isOnline);
      return;
    }

    // Prevent duplicate listeners
    if (this._syncActive) {
      console.log('[FirebaseService] Sync already active, skipping');
      return;
    }
    this._syncActive = true;

    console.log('[FirebaseService] Starting realtime sync... Connected:', this.isConnected);

    const availabilityRef = this.db.ref('availability');

    // First, get initial data
    availabilityRef.once('value').then((snapshot) => {
      const data = snapshot.val() || {};
      console.log('[FirebaseService] Initial availability data loaded:', Object.keys(data).length, 'units');
      this.availabilityCache = data;
      this.notifyListeners('availability', data);
    }).catch(err => {
      console.error('[FirebaseService] Failed to load initial data:', err);
    });

    // Then setup continuous listeners
    availabilityRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      console.log('[FirebaseService] Availability data updated:', Object.keys(data).length, 'units');
      this.availabilityCache = data;
      this.notifyListeners('availability', data);
    });

    availabilityRef.on('child_changed', (snapshot) => {
      const key = snapshot.key;
      const data = snapshot.val();
      console.log('[FirebaseService] Unit availability changed:', key, data);
      this.notifyListeners('unitChanged', { key, data });
    });

    availabilityRef.on('child_added', (snapshot) => {
      const key = snapshot.key;
      const data = snapshot.val();
      console.log('[FirebaseService] New unit added:', key, data);
      this.notifyListeners('unitAdded', { key, data });
    });
  },

  /**
   * Stop realtime sync
   */
  stopRealtimeSync() {
    if (!this.db) return;

    console.log('[FirebaseService] Stopping realtime sync');
    this.db.ref('availability').off();
    this._syncActive = false;
  },

  /**
   * Update unit availability
   */
  async updateAvailability(unitKey, availabilityData) {
    console.log('[FirebaseService] Updating availability:', unitKey, availabilityData);

    const update = {
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      ...availabilityData
    };

    // If online and connected, update immediately
    if (this.isOnline && this.isConnected) {
      try {
        await this.db.ref(`availability/${unitKey}`).update(update);
        console.log('[FirebaseService] Availability updated successfully');
        return { success: true };
      } catch (error) {
        console.error('[FirebaseService] Update failed:', error);
        
        // Queue for offline sync
        this.queueOfflineUpdate(unitKey, update);
        return { 
          success: false, 
          error: error.message,
          queued: true 
        };
      }
    } else {
      // Queue for offline sync
      this.queueOfflineUpdate(unitKey, update);
      return { 
        success: false, 
        error: 'Offline - changes queued for sync',
        queued: true 
      };
    }
  },

  /**
   * Queue offline update
   */
  queueOfflineUpdate(unitKey, data) {
    const queuedUpdate = {
      unitKey,
      data,
      timestamp: Date.now()
    };
    
    this.offlineQueue.push(queuedUpdate);
    this.saveOfflineQueue();
    
    console.log('[FirebaseService] Update queued for offline sync:', queuedUpdate);
    this.notifyListeners('queued', queuedUpdate);
  },

  /**
   * Save offline queue to localStorage
   */
  saveOfflineQueue() {
    try {
      localStorage.setItem('firebase_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('[FirebaseService] Failed to save offline queue:', error);
    }
  },

  /**
   * Load offline queue from localStorage
   */
  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem('firebase_offline_queue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[FirebaseService] Failed to load offline queue:', error);
    }
  },

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log('[FirebaseService] Processing offline queue:', this.offlineQueue.length, 'items');

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of queue) {
      try {
        await this.db.ref(`availability/${item.unitKey}`).update(item.data);
        console.log('[FirebaseService] Synced offline update:', item.unitKey);
        this.notifyListeners('synced', item);
      } catch (error) {
        console.error('[FirebaseService] Failed to sync offline update:', item.unitKey, error);
        this.offlineQueue.push(item); // Re-queue failed updates
      }
    }

    this.saveOfflineQueue();
  },

  /**
   * Get cached availability data
   */
  getAvailabilityCache() {
    return this.availabilityCache;
  },

  /**
   * Get offline queue status
   */
  getQueueStatus() {
    return {
      length: this.offlineQueue.length,
      isOnline: this.isOnline,
      isConnected: this.isConnected
    };
  },

  /**
   * Subscribe to events
   */
  onEvent(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[FirebaseService] Listener error:', error);
      }
    });
  }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    FirebaseService.init();
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseService;
}

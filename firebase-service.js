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
      
      this.isConnected = true;
      this.notifyListeners('init', { success: true });
      
      return true;
    } catch (error) {
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
      this.isOnline = true;
      this.notifyListeners('online', null);
      this.processOfflineQueue();
      this.startRealtimeSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline', null);
      this.stopRealtimeSync();
    });

    // Firebase built-in connection status
    if (this.db) {
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        const isConnected = snap.val() === true;
        this.isConnected = isConnected;
        this.notifyListeners('connection', isConnected);
        
        if (isConnected && this.isOnline && this.isAuthenticated()) {
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
    
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
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
    
    if (!this.auth) return;

    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
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
      return;
    }

    // Prevent duplicate listeners
    if (this._syncActive) {
      return;
    }
    this._syncActive = true;

    const availabilityRef = this.db.ref('availability');

    // First, get initial data
    availabilityRef.once('value').then((snapshot) => {
      const data = snapshot.val() || {};
      this.availabilityCache = data;
      this.notifyListeners('availability', data);
    }).catch(err => {
    });

    // Then setup continuous listeners
    availabilityRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      this.availabilityCache = data;
      this.notifyListeners('availability', data);
    });

    availabilityRef.on('child_changed', (snapshot) => {
      const key = snapshot.key;
      const data = snapshot.val();
      this.notifyListeners('unitChanged', { key, data });
    });

    availabilityRef.on('child_added', (snapshot) => {
      const key = snapshot.key;
      const data = snapshot.val();
      this.notifyListeners('unitAdded', { key, data });
    });
  },

  /**
   * Stop realtime sync
   */
  stopRealtimeSync() {
    if (!this.db) return;

    this.db.ref('availability').off();
    this._syncActive = false;
  },

  /**
   * Update unit availability
   */
  async updateAvailability(unitKey, availabilityData) {

    const update = {
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      ...availabilityData
    };

    // If online and connected, update immediately
    if (this.isOnline && this.isConnected) {
      try {
        await this.db.ref(`availability/${unitKey}`).update(update);
        return { success: true };
      } catch (error) {
        
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
    
    this.notifyListeners('queued', queuedUpdate);
  },

  /**
   * Save offline queue to localStorage
   */
  saveOfflineQueue() {
    try {
      localStorage.setItem('firebase_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
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
    }
  },

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of queue) {
      try {
        await this.db.ref(`availability/${item.unitKey}`).update(item.data);
        this.notifyListeners('synced', item);
      } catch (error) {
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

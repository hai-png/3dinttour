/**
 * Firebase Configuration
 * Centralized Firebase settings for the 3D Interactive Tour application.
 * 
 * This file is the single source of truth for all Firebase configuration.
 * Import this file wherever Firebase is needed instead of hardcoding config.
 * 
 * @version 1.0.0
 * @author Hosea Real Estate
 */

(function(global) {
  'use strict';

  const FirebaseConfig = {
    // Firebase project configuration
    // NOTE: Firebase API keys are not secrets - they are included in client-side code by design.
    // Security is enforced through Firebase Security Rules (see docs/firebase-rules.json).
    firebase: {
      apiKey: "AIzaSyCtjYMbznVZ1-x2Yqu5wQ_zz9PU92UYxRE",
      authDomain: "availability-fe35f.firebaseapp.com",
      databaseURL: "https://availability-fe35f-default-rtdb.firebaseio.com/",
      projectId: "availability-fe35f",
      storageBucket: "availability-fe35f.firebasestorage.app",
      messagingSenderId: "1031392756810",
      appId: "1:1031392756810:web:7c3dfdf4e40307589992b3",
      measurementId: "G-5QSYX7XDM2"
    },

    // Firebase SDK version to load from CDN
    sdkVersion: "9.22.0",

    // Database paths
    paths: {
      availability: '/availability',
      users: '/users',
      settings: '/settings',
      logs: '/logs'
    },

    // Connection monitoring
    connection: {
      pingInterval: 10000, // 10 seconds
      reconnectDelay: 5000 // 5 seconds
    }
  };

  // Export to global scope for backwards compatibility
  global.FirebaseConfig = FirebaseConfig;

  // Also export as module if available
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseConfig;
  }

})(typeof window !== 'undefined' ? window : global);

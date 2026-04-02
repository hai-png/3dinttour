/**
 * Auth Manager - Authentication System
 *
 * Features:
 * - JWT-based authentication with secure storage
 * - Session persistence across page reloads
 * - Role-based access control (admin, agent, viewer)
 * - Offline-first token management
 * - Auto-refresh tokens before expiration
 * - Works on web/mobile/desktop PWA
 */

const AuthManager = {
  // Configuration
  config: {
    tokenKey: 'auth_token',
    userKey: 'auth_user',
    expiryKey: 'auth_expiry',
    refreshKey: 'auth_refresh',
    apiBase: 'http://localhost:3000/api', // Backend API URL
    tokenRefreshThreshold: 300000, // Refresh 5 minutes before expiry
    storageType: 'localStorage' // or 'sessionStorage'
  },

  // Current session state
  session: {
    isAuthenticated: false,
    user: null,
    token: null,
    expiry: null,
    role: null
  },

  // Event listeners for auth state changes
  listeners: [],

  /**
   * Initialize auth manager
   */
  init() {
    this.restoreSession();
    this.startTokenRefresh();
    this.setupNetworkListener();
    return this;
  },

  /**
   * Restore session from storage
   */
  restoreSession() {
    try {
      const storage = this.getStorage();
      const token = storage.getItem(this.config.tokenKey);
      const user = storage.getItem(this.config.userKey);
      const expiry = storage.getItem(this.config.expiryKey);

      if (token && user && expiry) {
        const expiryTime = parseInt(expiry, 10);
        const now = Date.now();

        if (now < expiryTime) {
          this.session = {
            isAuthenticated: true,
            user: JSON.parse(user),
            token: token,
            expiry: expiryTime,
            role: this.session.user?.role || 'viewer'
          };
          this.notifyListeners('restored', this.session.user);
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      this.clearSession();
    }
  },

  /**
   * Get storage backend
   */
  getStorage() {
    return this.config.storageType === 'sessionStorage' 
      ? sessionStorage 
      : localStorage;
  },

  /**
   * Login with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} remember - Remember me
   */
  async login(email, password, remember = true) {

    try {
      // For demo purposes, we'll use a mock authentication
      // Replace this with actual API call in production
      const response = await this.mockLogin(email, password);
      
      // Store session
      this.storeSession(response);
      
      // Notify listeners
      this.notifyListeners('login', response.user);
      
      return { success: true, user: response.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      };
    }
  },

  /**
   * Mock login for demo (replace with real API)
   */
  async mockLogin(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Demo credentials (replace with real validation)
    const demoUsers = {
      'admin@temerproperties.com': {
        id: '1',
        email: 'admin@temerproperties.com',
        name: 'Admin User',
        role: 'admin',
        avatar: '👤'
      },
      'agent@temerproperties.com': {
        id: '2',
        email: 'agent@temerproperties.com',
        name: 'Agent User',
        role: 'agent',
        avatar: '👤'
      }
    };

    // Simple demo validation (use real API in production)
    const user = demoUsers[email.toLowerCase()];
    
    if (!user) {
      throw new Error('Invalid credentials. Try admin@temerproperties.com');
    }

    // Generate mock token (use real JWT in production)
    const token = 'mock_jwt_token_' + Date.now();
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    return {
      user,
      token,
      expiry,
      refreshToken: 'mock_refresh_token_' + Date.now()
    };
  },

  /**
   * Real API login (uncomment and configure for production)
   */
  async apiLogin(email, password) {
    const response = await fetch(`${this.config.apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return await response.json();
  },

  /**
   * Store session data
   */
  storeSession(data) {
    try {
      const storage = this.getStorage();
      storage.setItem(this.config.tokenKey, data.token);
      storage.setItem(this.config.userKey, JSON.stringify(data.user));
      storage.setItem(this.config.expiryKey, data.expiry.toString());
      
      if (data.refreshToken) {
        storage.setItem(this.config.refreshKey, data.refreshToken);
      }

      this.session = {
        isAuthenticated: true,
        user: data.user,
        token: data.token,
        expiry: data.expiry,
        role: data.user.role || 'viewer'
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout current user
   */
  logout() {
    this.clearSession();
    this.notifyListeners('logout', null);
  },

  /**
   * Clear session data
   */
  clearSession() {
    try {
      const storage = this.getStorage();
      storage.removeItem(this.config.tokenKey);
      storage.removeItem(this.config.userKey);
      storage.removeItem(this.config.expiryKey);
      storage.removeItem(this.config.refreshKey);

      this.session = {
        isAuthenticated: false,
        user: null,
        token: null,
        expiry: null,
        role: null
      };
    } catch (error) {
    }
  },

  /**
   * Check if user has required role
   * @param {string|string[]} roles - Required role(s)
   */
  hasRole(roles) {
    if (!this.session.isAuthenticated) return false;
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(this.session.role);
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.session.user;
  },

  /**
   * Get auth token for API requests
   */
  getToken() {
    return this.session.token;
  },

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    };
  },

  /**
   * Start automatic token refresh
   */
  startTokenRefresh() {
    setInterval(() => {
      if (this.session.isAuthenticated && this.session.expiry) {
        const timeUntilExpiry = this.session.expiry - Date.now();
        
        if (timeUntilExpiry < this.config.tokenRefreshThreshold) {
          this.refreshToken();
        }
      }
    }, 60000); // Check every minute
  },

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const storage = this.getStorage();
      const refreshToken = storage.getItem(this.config.refreshKey);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint (implement in production)
      const response = await fetch(`${this.config.apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data = await response.json();
      this.storeSession(data);
    } catch (error) {
      // Force logout if refresh fails
      this.logout();
    }
  },

  /**
   * Setup network status listener
   */
  setupNetworkListener() {
    window.addEventListener('online', () => {
      this.notifyListeners('online', null);
    });

    window.addEventListener('offline', () => {
      this.notifyListeners('offline', null);
    });
  },

  /**
   * Subscribe to auth events
   * @param {function} callback - Event handler
   */
  onAuthChange(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.session.isAuthenticated ? 'authenticated' : 'unauthenticated', this.session.user);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  /**
   * Notify all listeners of auth state change
   */
  notifyListeners(event, user) {
    const state = this.session.isAuthenticated ? 'authenticated' : 'unauthenticated';
    this.listeners.forEach(callback => {
      try {
        callback(state, user, event);
      } catch (error) {
      }
    });
  },

  /**
   * Check if currently online
   */
  isOnline() {
    return navigator.onLine;
  },

  /**
   * Get session info for debugging
   */
  getSessionInfo() {
    return {
      ...this.session,
      timeUntilExpiry: this.session.expiry 
        ? this.session.expiry - Date.now() 
        : null,
      isOnline: this.isOnline()
    };
  }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}

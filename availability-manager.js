/**
 * Availability Manager UI
 * 
 * Features:
 * - Authentication modal for admin access
 * - Unit availability management panel
 * - Realtime status indicators
 * - Offline queue management
 * - Works on web/mobile/desktop PWA
 */

const AvailabilityManager = {
  // Configuration - read from brand config
  get config() {
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
  },

  // State
  isAuthenticated: false,
  currentUser: null,
  availabilityData: {},
  pendingChanges: {},  // Track pending changes for bulk save
  isLoading: false,
  isTdReady: false,  // Track if TD (tour data) is loaded
  syncQueue: [],  // Queue sync requests until TD is ready

  /**
   * Initialize availability manager
   */
  init() {
    
    // Load cached data
    this.loadCachedData();
    
    // Setup Firebase listeners
    this.setupFirebaseListeners();
    
    // Setup auth manager listeners
    this.setupAuthListeners();
    
  },

  /**
   * Load cached availability data
   */
  loadCachedData() {
    try {
      const cached = localStorage.getItem('availability_cache');
      if (cached) {
        this.availabilityData = JSON.parse(cached);
      }
    } catch (error) {
    }
  },

  /**
   * Load availability data from Firebase
   */
  loadAvailabilityData() {
    if (typeof FirebaseService === 'undefined' || !FirebaseService.db) {
      return;
    }

    
    FirebaseService.db.ref('availability').once('value')
      .then((snapshot) => {
        const data = snapshot.val() || {};
        this.availabilityData = data;
        this.saveCache();
        this.updateUI();
      })
      .catch((error) => {
      });
  },

  /**
   * Setup Firebase event listeners
   */
  setupFirebaseListeners() {
    if (typeof FirebaseService !== 'undefined') {
      FirebaseService.onEvent((event, data) => {

        switch (event) {
          case 'availability':
            this.availabilityData = data || {};
            this.saveCache();
            // Sync with tour data (unit search) - will be queued if TD not ready
            this.syncWithTourData();
            break;
          case 'unitChanged':
          case 'unitAdded':
            this.updateUnitInCache(data.key, data.data);
            this.updateUnitUI(data.key, data.data);
            // Sync with tour data - will be queued if TD not ready
            this.syncWithTourData();
            break;
          case 'auth':
            if (data) {
              this.isAuthenticated = true;
              this.currentUser = data;
              this.updateAuthUI();
              // Force reload availability data
              this.loadAvailabilityData();
            } else {
              this.isAuthenticated = false;
              this.currentUser = null;
              this.updateAuthUI();
              this.hideAdminPanel();
            }
            break;
          case 'connection':
            if (data === true) {
              // If already authenticated, reload data
              if (this.isAuthenticated) {
                this.loadAvailabilityData();
              }
            }
            break;
          case 'online':
            this.showOnlineIndicator();
            break;
          case 'offline':
            this.showOfflineIndicator();
            break;
          case 'queued':
            this.showQueuedIndicator(data);
            break;
          case 'synced':
            this.showSyncedIndicator(data);
            // Queue UI refresh after sync
            this.syncWithTourData();
            break;
        }
      });
    }
  },

  /**
   * Sync availability data with tour data (unit search)
   * Delegates to AvailabilitySystem.tourSync for centralized sync
   */
  syncWithTourData() {
    // Queue sync requests until TD is ready
    if (!this.isTdReady) {
      this.syncQueue.push(true);
      return;
    }

    // Delegate to AvailabilitySystem.tourSync for centralized sync
    const sys = window.AvailabilitySystem;
    if (sys && sys.tourSync) {
      sys.tourSync.sync();
      return;
    }

    // Fallback to direct sync if AvailabilitySystem not available
    if (typeof window.TD === 'undefined' || !window.TD || !window.TD.units) {
      return;
    }

    let updatedCount = 0;
    // Update tour data units with availability status
    window.TD.units.forEach(unit => {
      const availData = this.availabilityData[unit.id] || this.availabilityData[unit.unitNumber];
      if (availData && availData.status) {
        // Normalize status to match TD.statusColors keys (capitalized)
        const normalizedStatus = this.normalizeStatus(availData.status);
        if (unit.status !== normalizedStatus) {
          updatedCount++;
        }
        unit.status = normalizedStatus;
      }
    });

    // Refresh the unit search display if it exists
    if (typeof Srch !== 'undefined') {
      // Use the sync method which re-renders and updates highlights
      Srch.sync();
    }

    // Also update any status badges in the detail panel
    this.updateStatusBadges();

  },

  /**
   * Mark TD as ready and process queued sync requests
   */
  markTdReady() {
    this.isTdReady = true;

    // Clear queue and trigger sync
    this.syncQueue = [];

    // Always trigger sync when TD becomes ready - delegate to AvailabilitySystem
    setTimeout(() => {
      this.syncWithTourData();
    }, 50);  // Small delay to ensure TD is fully populated
  },

  /**
   * Normalize status to match TD.statusColors format (capitalized)
   */
  normalizeStatus(status) {
    if (!status) return 'Available';
    const lower = status.toLowerCase();
    // Return capitalized version to match TD.statusColors keys
    if (lower === 'available') return 'Available';
    if (lower === 'reserved') return 'Reserved';
    if (lower === 'sold') return 'Sold';
    if (lower === 'unavailable') return 'Unavailable';
    // Default: capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  },

  /**
   * Convert normalized status back to lowercase for Firebase storage
   */
  denormalizeStatus(status) {
    if (!status) return 'available';
    return status.toLowerCase();
  },

  /**
   * Setup auth manager listeners
   */
  setupAuthListeners() {
    if (typeof AuthManager !== 'undefined') {
      AuthManager.onAuthChange((state, user, event) => {
        this.isAuthenticated = state === 'authenticated';
        this.currentUser = user;
        
        if (this.isAuthenticated) {
          this.showAdminPanel();
        } else {
          this.hideAdminPanel();
        }
        
        this.updateAuthUI();
      });
    }
  },

  /**
   * Show login modal
   */
  showLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('open');
      document.getElementById('auth-email').focus();
    }
  },

  /**
   * Hide login modal
   */
  hideLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('open');
    }
  },

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit');
    
    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
    try {
      // Try Firebase auth first
      if (typeof FirebaseService !== 'undefined' && FirebaseService.auth) {
        const result = await FirebaseService.signIn(email, password);
        
        if (result.success) {
          this.hideLoginModal();
          this.showSuccessToast('Signed in successfully');
        } else {
          errorDiv.textContent = result.error;
          errorDiv.style.display = 'block';
        }
      } else {
        // Fallback to AuthManager
        const result = await AuthManager.login(email, password);
        
        if (result.success) {
          this.hideLoginModal();
          this.showSuccessToast('Signed in successfully');
        } else {
          errorDiv.textContent = result.error;
          errorDiv.style.display = 'block';
        }
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Login failed';
      errorDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  },

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      if (typeof FirebaseService !== 'undefined' && FirebaseService.auth) {
        await FirebaseService.signOut();
      }
      AuthManager.logout();
      this.showSuccessToast('Signed out successfully');
    } catch (error) {
    }
  },

  /**
   * Show admin panel
   */
  showAdminPanel() {
    const panel = document.getElementById('availability-admin-panel');
    if (panel) {
      panel.classList.add('open');
    }
    
    // Show admin button in header
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
      adminBtn.style.display = 'flex';
    }
  },

  /**
   * Hide admin panel
   */
  hideAdminPanel() {
    const panel = document.getElementById('availability-admin-panel');
    if (panel) {
      panel.classList.remove('open');
    }
  },

  /**
   * Toggle admin panel
   */
  toggleAdminPanel() {
    const panel = document.getElementById('availability-admin-panel');
    if (panel) {
      panel.classList.toggle('open');
    }
  },

  /**
   * Update availability for a unit
   */
  async updateUnitAvailability(unitKey, status, notes = '') {
    const updateData = {
      status,
      notes,
      updatedAt: Date.now(),
      updatedBy: this.currentUser?.email || 'unknown'
    };

    this.isLoading = true;
    this.updateUnitLoadingState(unitKey, true);

    try {
      if (typeof FirebaseService !== 'undefined') {
        const result = await FirebaseService.updateAvailability(unitKey, updateData);

        if (result.success) {
          this.showSuccessToast('Availability updated');
          // Update local cache immediately
          this.updateUnitInCache(unitKey, updateData);
        } else if (result.queued) {
          this.showInfoToast('Offline - changes will sync when online');
          // Update local cache even when offline
          this.updateUnitInCache(unitKey, updateData);
        } else {
          this.showErrorToast('Failed to update');
        }
      } else {
        // No Firebase, just update local cache
        this.updateUnitInCache(unitKey, updateData);
        this.showSuccessToast('Updated locally');
      }

    } catch (error) {
      this.showErrorToast('Failed to update availability');
    } finally {
      this.isLoading = false;
      this.updateUnitLoadingState(unitKey, false);
    }
  },

  /**
   * Update unit loading state
   */
  updateUnitLoadingState(unitKey, isLoading) {
    const row = document.querySelector(`[data-unit="${unitKey}"]`);
    if (row) {
      const actions = row.querySelector('.am-actions');
      if (actions) {
        actions.style.pointerEvents = isLoading ? 'none' : 'auto';
        actions.style.opacity = isLoading ? '0.5' : '1';
      }
    }
  },

  /**
   * Update unit in cache
   */
  updateUnitInCache(unitKey, data) {
    if (!this.availabilityData[unitKey]) {
      this.availabilityData[unitKey] = {};
    }
    this.availabilityData[unitKey] = {
      ...this.availabilityData[unitKey],
      ...data
    };
    this.saveCache();
  },

  /**
   * Save cache to localStorage
   */
  saveCache() {
    try {
      localStorage.setItem('availability_cache', JSON.stringify(this.availabilityData));
    } catch (error) {
    }
  },

  /**
   * Update UI with current data
   */
  updateUI() {
    // Update admin panel list
    this.renderAdminPanel();

    // Update any status badges in the main UI
    this.updateStatusBadges();
    
    // Sync with tour data (will be queued if TD not ready)
    // Only sync if TD is ready, otherwise markTdReady() will handle it
    if (this.isTdReady) {
      this.syncWithTourData();
    }
  },

  /**
   * Update single unit UI
   */
  updateUnitUI(unitKey, data) {
    // Update specific unit row in admin panel
    const row = document.querySelector(`[data-unit="${unitKey}"]`);
    if (row) {
      this.updateUnitRow(row, data);
    }
    
    // Update status badges
    this.updateUnitBadge(unitKey, data.status);
  },

  /**
   * Render admin panel with all units
   */
  renderAdminPanel() {
    const container = document.getElementById('availability-units-list');
    if (!container) return;

    container.innerHTML = '';

    const units = Object.keys(this.availabilityData).sort();

    if (units.length === 0) {
      container.innerHTML = `
        <div class="am-empty">
          <div class="am-empty-icon">📭</div>
          <div class="am-empty-txt">No units found</div>
          <small>Make sure you have data in Firebase Realtime Database under /availability/</small>
        </div>
      `;
      return;
    }

    units.forEach(unitKey => {
      const unitData = this.availabilityData[unitKey] || {};
      const row = this.createUnitRow(unitKey, unitData);
      container.appendChild(row);
    });

    // Update save all button state after rendering
    this.updateSaveAllButtonState();
  },

  /**
   * Create unit row element
   */
  createUnitRow(unitKey, unitData) {
    const row = document.createElement('div');
    row.className = 'am-unit-row';
    row.setAttribute('data-unit', unitKey);

    // Normalize status to lowercase for internal use
    const status = (unitData.status || 'available').toLowerCase();
    const notes = unitData.notes || '';
    const updatedAt = unitData.updatedAt ? new Date(unitData.updatedAt) : null;
    const updatedBy = unitData.updatedBy || 'Unknown';
    const name = unitData.name || unitData.unitName || unitKey;
    const type = unitData.type || unitData.unitType || '';
    const area = unitData.area || '';
    const bedrooms = unitData.bedrooms || '';
    const price = unitData.priceFormatted || unitData.price || '';

    row.innerHTML = `
      <div class="am-unit-header">
        <div class="am-unit-name">${name} ${type ? '(' + type + ')' : ''} ${area ? '• ' + area + 'm²' : ''} ${bedrooms ? '• ' + bedrooms + 'BR' : ''}</div>
        <div class="am-unit-status am-status-${status}" data-status="${status}">${this.config.statusLabels[status] || status}</div>
      </div>
      <div class="am-unit-body">
        ${price ? `<div style="font-size:11px;color:var(--pri);font-weight:700;margin-bottom:8px">${price}</div>` : ''}
        <div class="am-status-toggle">
          <label>Status</label>
          <div class="am-status-buttons">
            <button class="am-status-btn ${status === 'available' ? 'active' : ''}" data-status="available" title="Available">✅ Available</button>
            <button class="am-status-btn ${status === 'reserved' ? 'active' : ''}" data-status="reserved" title="Reserved">⏸️ Reserved</button>
            <button class="am-status-btn ${status === 'sold' ? 'active' : ''}" data-status="sold" title="Sold">❌ Sold</button>
            <button class="am-status-btn ${status === 'unavailable' ? 'active' : ''}" data-status="unavailable" title="Unavailable">🚫 Unavailable</button>
          </div>
        </div>
        <div class="am-notes">
          <label>Notes (optional)</label>
          <input type="text" class="am-input" data-action="notes" value="${notes}" placeholder="Add notes...">
        </div>
        <div class="am-actions">
          <div class="am-sync-status" data-action="sync-status"></div>
          <span class="am-pending-badge" style="display:none;font-size:9px;color:var(--warn);font-weight:600;margin-left:auto">● Unsaved</span>
        </div>
        ${updatedAt ? `<div class="am-updated">Updated: ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString()} by ${updatedBy}</div>` : ''}
      </div>
    `;

    // Setup event listeners
    this.setupUnitRowListeners(row);

    return row;
  },

  /**
   * Setup unit row event listeners
   */
  setupUnitRowListeners(row) {
    const unitKey = row.getAttribute('data-unit');
    const notesInput = row.querySelector('[data-action="notes"]');
    const statusBtns = row.querySelectorAll('.am-status-btn');
    const pendingBadge = row.querySelector('.am-pending-badge');

    // Status button click handlers
    statusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        statusBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Mark as pending change
        this.markUnitAsPending(unitKey, row);
      });
    });

    // Notes input change handler
    notesInput.addEventListener('input', () => {
      this.markUnitAsPending(unitKey, row);
    });
  },

  /**
   * Mark unit as having pending changes
   */
  markUnitAsPending(unitKey, row) {
    const activeBtn = row.querySelector('.am-status-btn.active');
    const status = activeBtn ? activeBtn.getAttribute('data-status') : 'available';
    const notesInput = row.querySelector('[data-action="notes"]');
    const notes = notesInput.value.trim();
    const pendingBadge = row.querySelector('.am-pending-badge');

    // Track pending change (store with lowercase status for Firebase)
    this.pendingChanges[unitKey] = {
      status: status,  // lowercase for Firebase
      notes,
      updatedAt: Date.now(),
      updatedBy: this.currentUser?.email || 'unknown'
    };

    // Show pending indicator
    if (pendingBadge) {
      pendingBadge.style.display = 'inline-block';
    }

    // Update save all button state
    this.updateSaveAllButtonState();
  },

  /**
   * Update save all button state
   */
  updateSaveAllButtonState() {
    const saveAllBtn = document.getElementById('am-save-all-btn');
    const pendingCount = Object.keys(this.pendingChanges).length;
    
    if (saveAllBtn) {
      saveAllBtn.disabled = pendingCount === 0;
      saveAllBtn.innerHTML = `<span class="ico">💾</span> Save All${pendingCount > 0 ? ` (${pendingCount})` : ''}`;
      saveAllBtn.style.opacity = pendingCount === 0 ? '0.5' : '1';
    }
  },

  /**
   * Save all pending changes
   */
  async saveAllChanges() {
    const pendingKeys = Object.keys(this.pendingChanges);
    if (pendingKeys.length === 0) {
      return;
    }

    this.isLoading = true;

    // Disable save all button
    const saveAllBtn = document.getElementById('am-save-all-btn');
    if (saveAllBtn) {
      saveAllBtn.disabled = true;
      saveAllBtn.textContent = 'Saving...';
    }

    try {
      if (typeof FirebaseService !== 'undefined' && FirebaseService.db) {
        // Batch update to Firebase
        const updates = {};
        pendingKeys.forEach(key => {
          updates[`availability/${key}`] = this.pendingChanges[key];
        });

        await FirebaseService.db.ref().update(updates);
        
        this.showSuccessToast(`Saved ${pendingKeys.length} unit${pendingKeys.length > 1 ? 's' : ''}`);

        // Update local cache
        pendingKeys.forEach(key => {
          this.availabilityData[key] = {
            ...this.availabilityData[key],
            ...this.pendingChanges[key]
          };
        });
        this.saveCache();

        // Clear pending changes
        this.pendingChanges = {};

        // Update UI
        this.renderAdminPanel();
        this.updateStatusBadges();
        
        // Sync with tour data
        this.syncWithTourData();
        
      } else {
        // No Firebase, just update local cache
        pendingKeys.forEach(key => {
          this.availabilityData[key] = {
            ...this.availabilityData[key],
            ...this.pendingChanges[key]
          };
        });
        this.saveCache();

        // Clear pending changes
        this.pendingChanges = {};

        // Update UI
        this.renderAdminPanel();
        this.updateStatusBadges();
        
        // Sync with tour data
        this.syncWithTourData();

        this.showSuccessToast(`Saved ${pendingKeys.length} unit${pendingKeys.length > 1 ? 's' : ''} locally`);
      }
    } catch (error) {
      this.showErrorToast('Failed to save changes');
    } finally {
      this.isLoading = false;
      
      // Restore save all button
      if (saveAllBtn) {
        saveAllBtn.disabled = false;
        saveAllBtn.innerHTML = '<span class="ico">💾</span> Save All';
        saveAllBtn.style.opacity = '1';
      }
      
      this.updateSaveAllButtonState();
    }
  },

  /**
   * Update unit row with new data
   */
  updateUnitRow(row, data) {
    const statusBadge = row.querySelector('.am-unit-status');
    const statusBtns = row.querySelectorAll('.am-status-btn');
    const notesInput = row.querySelector('[data-action="notes"]');
    const updatedDiv = row.querySelector('.am-updated');

    // Handle both lowercase (Firebase) and capitalized (TD) status values
    const status = (data.status || 'available').toLowerCase();

    // Update badge - use CSS class with lowercase status
    statusBadge.className = `am-unit-status am-status-${status}`;
    // Display label with proper capitalization
    statusBadge.textContent = this.config.statusLabels[status] || data.status;
    statusBadge.setAttribute('data-status', status);

    // Update toggle buttons
    statusBtns.forEach(btn => {
      const btnStatus = btn.getAttribute('data-status');
      if (btnStatus === status) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    notesInput.value = data.notes || '';

    if (data.updatedAt) {
      const updatedAt = new Date(data.updatedAt);
      updatedDiv.innerHTML = `Updated: ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString()} by ${data.updatedBy || 'Unknown'}`;
      updatedDiv.style.display = 'block';
    }
  },

  /**
   * Update status badges in main UI
   */
  updateStatusBadges() {
    // Update any status badges in the main tour UI
    document.querySelectorAll('[data-unit-status]').forEach(el => {
      const unitKey = el.getAttribute('data-unit-status');
      const data = this.availabilityData[unitKey];
      if (data && data.status) {
        // Normalize to lowercase for CSS class
        const status = data.status.toLowerCase();
        el.className = `badge b-${status}`;
        el.textContent = this.config.statusLabels[status] || data.status;
      }
    });
  },

  /**
   * Update single unit badge
   */
  updateUnitBadge(unitKey, status) {
    const badge = document.querySelector(`[data-unit-status="${unitKey}"]`);
    if (badge) {
      // Normalize to lowercase for CSS class
      const normalizedStatus = status.toLowerCase();
      badge.className = `badge b-${normalizedStatus}`;
      badge.textContent = this.config.statusLabels[normalizedStatus] || status;
    }
  },

  /**
   * Update auth UI
   */
  updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-btn');
    const userInfo = document.getElementById('user-info');
    
    
    if (loginBtn) loginBtn.style.display = this.isAuthenticated ? 'none' : 'flex';
    if (logoutBtn) logoutBtn.style.display = this.isAuthenticated ? 'flex' : 'none';
    if (adminBtn) adminBtn.style.display = this.isAuthenticated ? 'flex' : 'none';
    
    if (userInfo && this.currentUser) {
      userInfo.style.display = 'flex';
      userInfo.innerHTML = `
        <span class="ui-avatar">${this.currentUser.email?.[0].toUpperCase() || '👤'}</span>
        <span class="ui-name">${this.currentUser.email || 'User'}</span>
      `;
    } else if (userInfo) {
      userInfo.style.display = 'none';
    }
  },

  /**
   * Show online indicator
   */
  showOnlineIndicator() {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.className = 'connection-status online';
      indicator.innerHTML = '<span class="cs-dot"></span><span class="cs-txt">Online</span>';
    }
  },

  /**
   * Show offline indicator
   */
  showOfflineIndicator() {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.className = 'connection-status offline';
      indicator.innerHTML = '<span class="cs-dot"></span><span class="cs-txt">Offline</span>';
    }
  },

  /**
   * Show queued indicator
   */
  showQueuedIndicator(data) {
    const syncStatus = document.getElementById('sync-queue-count');
    if (syncStatus && typeof FirebaseService !== 'undefined') {
      const status = FirebaseService.getQueueStatus();
      if (status.length > 0) {
        syncStatus.textContent = `${status.length} pending`;
        syncStatus.style.display = 'block';
      }
    }
  },

  /**
   * Show synced indicator
   */
  showSyncedIndicator(data) {
    this.showSuccessToast('Changes synced with server');
  },

  /**
   * Show success toast
   */
  showSuccessToast(message) {
    this.showToast(message, 'success');
  },

  /**
   * Show error toast
   */
  showErrorToast(message) {
    this.showToast(message, 'error');
  },

  /**
   * Show info toast
   */
  showInfoToast(message) {
    this.showToast(message, 'info');
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `am-toast am-toast-${type}`;
    toast.innerHTML = `
      <span class="am-toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="am-toast-msg">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('am-toast-show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('am-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AvailabilityManager.init();
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvailabilityManager;
}

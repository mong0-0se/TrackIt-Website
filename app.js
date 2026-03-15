/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Main Application
   Entry point that initializes all modules and loads data
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Load all application data
 */
async function loadAllData() {
  try {
    setDbStatus('', 'Connecting…');
    
    // Fetch all data in parallel
    const [positions, routes, vehicles, operatingHours] = await Promise.all([
      fetchGpsPositions(),
      fetchRoutes(),
      fetchVehicles(),
      fetchOperatingHours()
    ]);
    
    // Store vehicles globally
    window.allVehicles = vehicles;
    
    // Update status
    setDbStatus('connected', `Connected · ${positions.length} in-service GPS`);
    
    // Render all data
    renderBusData(positions);
    renderRoutes(routes);
    renderOperatingHours(operatingHours);
    
    // Setup real-time updates
    setupRealtimeSubscription();
    
  } catch (err) {
    console.error('Supabase load error:', err);
    setDbStatus('error', 'Connection failed — check RLS policies');
    
    // Show error messages
    document.getElementById('busCards').innerHTML = `<div class="empty">
      <i class="fa fa-triangle-exclamation" style="color:var(--danger)"></i>
      <h3>Connection Error</h3>
      <p style="color:var(--danger);font-weight:600">${err.message}</p>
      <p style="margin-top:6px">Ensure RLS allows anon reads on: gps_position, vehicle, routes, driver</p>
    </div>`;
    
    ['routeCards', 'scheduleList'].forEach(id => {
      document.getElementById(id).innerHTML = `<div class="empty">
        <i class="fa fa-triangle-exclamation"></i>
        <h3>Failed to load</h3>
      </div>`;
    });
  }
}

/**
 * Initialize all application modules
 */
function initializeApp() {
  console.log('🚀 Initializing TrackIt CDO...');
  
  // Initialize map controls
  if (typeof initMapControls === 'function') {
    initMapControls();
  }
  
  // Initialize search handlers
  if (typeof initSearchHandlers === 'function') {
    initSearchHandlers();
  }
  
  // Initialize tab handlers
  if (typeof initTabHandlers === 'function') {
    initTabHandlers();
  }
  
  // Initialize sidebar handlers
  if (typeof initSidebarHandlers === 'function') {
    initSidebarHandlers();
  }
  
  // Initialize route planning handlers
  if (typeof initRoutePlanningHandlers === 'function') {
    initRoutePlanningHandlers();
  }
  
  // Load all data
  loadAllData();
  
  console.log('✅ TrackIt CDO initialized');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for global access
window.loadAllData = loadAllData;
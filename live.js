/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Live Tracking Module
   Handles real-time vehicle tracking, GPS data, and bus markers
   ══════════════════════════════════════════════════════════════════════════ */

// ── State ──
let realtimeSub = null;
let pollTimer = null;
let allVehicles = [];

// ── Supabase Client ──
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Data Fetching ──

/**
 * Fetch GPS positions for in-service vehicles
 * @returns {Promise<Array>} Array of positions with vehicle data
 */
async function fetchGpsPositions() {
  // Get all in-service vehicles
  const { data: inService, error: vErr } = await sb
    .from('vehicle')
    .select('id, vehicle_name, plate_number, status, route:route_id(route_name, origin, destination), driver:driver_id(name, contact)')
    .eq('status', 'in_service');
    
  if (vErr) throw vErr;
  if (!inService?.length) return [];
  
  const vehicleMap = Object.fromEntries(inService.map(v => [v.id, v]));
  
  // Get GPS positions for these vehicles
  const { data: positions, error: pErr } = await sb
    .from('gps_position')
    .select('device_id, device_name, latitude, longitude, speed_kmh, heading, accuracy, updated_at, vehicle_id')
    .in('vehicle_id', Object.keys(vehicleMap));
    
  if (pErr) throw pErr;
  
  return (positions || [])
    .map(pos => ({ ...pos, vehicle: vehicleMap[pos.vehicle_id] || null }))
    .filter(pos => pos.vehicle && pos.latitude && pos.longitude);
}

// ── Rendering ──

/**
 * Render bus data to sidebar and map
 * @param {Array} positions - Array of GPS positions
 */
function renderBusData(positions) {
  const container = document.getElementById('busCards');
  document.getElementById('tabBusCount').textContent = positions.length;
  document.getElementById('liveCount').textContent = `${positions.length} In-Service`;
  
  if (!positions.length) {
    container.innerHTML = `<div class="empty">
      <i class="fa fa-bus"></i>
      <h3>No In-Service Vehicles</h3>
      <p>Only vehicles with status <strong>in_service</strong> appear here once GPS devices are transmitting.</p>
    </div>`;
    
    // Clear all bus markers
    Object.values(window.busMarkers).forEach(m => window.map.removeLayer(m));
    window.busMarkers = {};
    return;
  }
  
  const seen = new Set(positions.map(p => p.device_id));
  
  // Update or create markers
  positions.forEach(pos => {
    if (!pos.latitude || !pos.longitude) return;
    
    const id = pos.device_id;
    const latlng = [parseFloat(pos.latitude), parseFloat(pos.longitude)];
    
    if (window.busMarkers[id]) {
      // Update existing marker
      window.busMarkers[id].setLatLng(latlng);
      window.busMarkers[id].setIcon(makeBusIcon(id, pos.heading, false));
    } else {
      // Create new marker
      window.busMarkers[id] = L.marker(latlng, { 
        icon: makeBusIcon(id, pos.heading, true) 
      })
      .addTo(window.map)
      .on('click', () => openBusInfo(pos));
    }
    
    // Store position data on marker
    window.busMarkers[id]._posData = pos;
  });
  
  // Remove markers for devices no longer in service
  Object.keys(window.busMarkers).forEach(id => {
    if (!seen.has(id)) {
      window.map.removeLayer(window.busMarkers[id]);
      delete window.busMarkers[id];
    }
  });
  
  // Render sidebar cards
  container.innerHTML = positions.map(pos => {
    const v = pos.vehicle || {};
    const r = v.route || {};
    const d = v.driver || {};
    const color = '#2563eb'; 
    const name = v.vehicle_name || pos.device_name || pos.device_id;
    const speed = pos.speed_kmh != null ? `${parseFloat(pos.speed_kmh).toFixed(1)} km/h` : 'N/A';
    const updAt = pos.updated_at ? new Date(pos.updated_at).toLocaleTimeString() : '—';
    
return `<div class="card active-bus" onclick="focusBus('${pos.device_id}')">
  <div class="card-row">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="bus-icon-wrap" style="background:${color}20;color:${color}">
        <i class="fa fa-bus"></i>
      </div>
      <div>
        <div class="card-title" style="font-size:15px;font-weight:900;letter-spacing:-.4px">${v.plate_number || '—'}</div>
        <div class="card-sub" style="font-weight:600;color:var(--text-second)">${name}</div>
      </div>
    </div>
    <span class="badge green">in_service</span>
  </div>
  <div class="card-row">
    <div class="card-sub" style="display:flex;align-items:center;gap:5px">
      <i class="fa fa-route" style="font-size:9px;color:#94a3b8"></i>
      ${r.route_name || 'No route assigned'}
    </div>
  </div>
  <div class="card-row" style="margin-bottom:0">
    <div class="meta-row">
      <div class="meta-item"><i class="fa fa-gauge-high"></i> ${speed}</div>
      <div class="meta-item"><i class="fa fa-user"></i> ${d.name || 'Unassigned'}</div>
      <div class="meta-item"><i class="fa fa-clock"></i> ${updAt}</div>
    </div>
  </div>
</div>`;
  }).join('');
}

/**
 * Focus on a specific bus on the map
 * @param {String} deviceId - Device identifier
 */
function focusBus(deviceId) {
  const m = window.busMarkers[deviceId];
  if (!m) return;
  
  window.map.setView(m.getLatLng(), 17);
  openBusInfo(m._posData);
}

// Make focusBus globally accessible for onclick
window.focusBus = focusBus;

/**
 * Open info card for a bus
 * @param {Object} pos - Position object with vehicle data
 */
function openBusInfo(pos) {
  const v = pos.vehicle || {};
  const r = v.route || {};
  const d = v.driver || {};
  const name = v.vehicle_name || pos.device_name || pos.device_id;
  
  document.getElementById('micTitle').textContent = 
    `${v.plate_number || name}${v.plate_number ? ' · ' + name : ''}`;
  document.getElementById('micSub').textContent = 
    r.route_name ? `${r.origin} → ${r.destination}` : (d.name || 'No driver assigned');
  
  const speedEl = document.getElementById('micSpeed');
  if (pos.speed_kmh != null) {
    const hdgStr = pos.heading != null ? ` · Heading ${Math.round(pos.heading)}°` : '';
    speedEl.textContent = `⚡ ${parseFloat(pos.speed_kmh).toFixed(1)} km/h${hdgStr}`;
    speedEl.style.display = 'block';
  } else {
    speedEl.style.display = 'none';
  }
  
  window.currentInfoPlace = {
    lat: parseFloat(pos.latitude),
    lng: parseFloat(pos.longitude),
    name
  };
  
  document.getElementById('mapInfoCard').classList.add('show');
}

// ── Real-time Updates ──

/**
 * Refresh live data via polling
 */
async function refreshLiveData() {
  try {
    const positions = await fetchGpsPositions();
    renderBusData(positions);
    setDbStatus('connected', `Connected · ${positions.length} in-service · ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    console.error('Poll error:', e);
    setDbStatus('error', 'Refresh error — retrying…');
  }
}

/**
 * Start polling timer
 */
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshLiveData, POLLING_INTERVAL);
}

/**
 * Setup real-time subscription
 */
function setupRealtimeSubscription() {
  if (realtimeSub) sb.removeChannel(realtimeSub);
  
  realtimeSub = sb.channel('trackit-rt')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'gps_position' 
    }, async payload => {
      try {
        const positions = await fetchGpsPositions();
        renderBusData(positions);
        setDbStatus('connected', `Connected · ${positions.length} in-service · ${new Date().toLocaleTimeString()}`);
        
        if (payload.eventType === 'UPDATE') {
          showNotif(
            'GPS Update',
            `Position updated: ${payload.new.device_name || payload.new.device_id}`
          );
        }
      } catch (e) {
        console.error('Realtime GPS error:', e);
      }
    })
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'vehicle' 
    }, async payload => {
      try {
        const [positions, vehicles] = await Promise.all([
          fetchGpsPositions(),
          fetchVehicles()
        ]);
        
        allVehicles = vehicles;
        renderBusData(positions);
        
        if (typeof renderRoutes === 'function' && window.allRoutes) {
          renderRoutes(window.allRoutes);
        }
        
        setDbStatus('connected', `Connected · ${positions.length} in-service · ${new Date().toLocaleTimeString()}`);
        
        const name = payload.new?.vehicle_name || payload.new?.plate_number || 'Vehicle';
        const status = payload.new?.status;
        
        if (status === 'in_service') {
          showNotif('Vehicle Active', `${name} is now in service`);
        } else if (status) {
          showNotif('Vehicle Offline', `${name} is now ${status}`);
        }
      } catch (e) {
        console.error('Realtime vehicle error:', e);
      }
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        setDbStatus('connected', 'Connected · Real-time active', 'RT + Poll 10s');
      } else if (status === 'CHANNEL_ERROR') {
        setDbStatus('error', 'Real-time error — polling active', 'Poll 10s');
      }
    });
  
  startPolling();
  setDbStatus('connected', 'Polling every 10s for vehicle changes', 'Poll 10s');
}

/**
 * Fetch all vehicles (for route rendering)
 * @returns {Promise<Array>} Array of vehicles
 */
async function fetchVehicles() {
  const { data, error } = await sb
    .from('vehicle')
    .select('id, vehicle_name, plate_number, status, route_id, route:route_id(route_name, origin, destination), driver:driver_id(name, contact)')
    .order('vehicle_name');
    
  if (error) throw error;
  return data || [];
}

// Export functions and state
window.sb = sb;
window.allVehicles = allVehicles;
window.fetchGpsPositions = fetchGpsPositions;
window.fetchVehicles = fetchVehicles;
window.renderBusData = renderBusData;
window.setupRealtimeSubscription = setupRealtimeSubscription;
window.refreshLiveData = refreshLiveData;
/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Utility Functions
   ══════════════════════════════════════════════════════════════════════════ */

// ── Geometry Utilities ──

/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} point1 - [latitude, longitude]
 * @param {Array} point2 - [latitude, longitude]
 * @returns {Number} Distance in kilometers
 */
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * 
            Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
            
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate minimum distance from a point to a polyline
 * @param {Array} point - [latitude, longitude]
 * @param {Array} coords - Array of [latitude, longitude] coordinates
 * @returns {Number} Minimum distance in kilometers
 */
function minDistToPolyline(point, coords) {
  if (!coords || coords.length === 0) return Infinity;
  if (coords.length === 1) return haversine(point, coords[0]);
  
  let bestDist = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const dist = distToSegment(point, coords[i], coords[i + 1]);
    bestDist = Math.min(bestDist, dist);
  }
  return bestDist;
}

/**
 * Calculate distance from a point to a line segment
 * @param {Array} P - Point [latitude, longitude]
 * @param {Array} A - Segment start [latitude, longitude]
 * @param {Array} B - Segment end [latitude, longitude]
 * @returns {Number} Distance in kilometers
 */
function distToSegment(P, A, B) {
  const scale = Math.cos(P[0] * Math.PI / 180);
  
  const px = P[1] * scale, py = P[0];
  const ax = A[1] * scale, ay = A[0];
  const bx = B[1] * scale, by = B[0];
  
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  
  const projLat = ay + t * dy;
  const projLon = (ax + t * dx) / scale;
  
  return haversine(P, [projLat, projLon]);
}

// ── UI Utilities ──

/**
 * Show toast notification
 * @param {String} msg - Message to display
 * @param {String} type - Type of toast ('ok' or 'warn')
 */
function showToast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  const ico = document.getElementById('toastIco');
  
  ico.className = type === 'ok' ? 'fa fa-circle-check' : 'fa fa-circle-exclamation';
  ico.style.color = type === 'ok' ? '#4ade80' : '#fbbf24';
  document.getElementById('toastMsg').textContent = msg;
  
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

/**
 * Show notification banner
 * @param {String} title - Notification title
 * @param {String} sub - Notification subtitle
 */
function showNotif(title, sub) {
  document.getElementById('notifTitle').textContent = title;
  document.getElementById('notifSub').textContent = sub;
  
  const banner = document.getElementById('notifBanner');
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 6000);
}

/**
 * Set database status indicator
 * @param {String} state - Status state ('connected', 'error', '')
 * @param {String} msg - Status message
 * @param {String} mode - Optional mode description
 */
function setDbStatus(state, msg, mode) {
  document.getElementById('dbDot').className = `db-dot ${state}`;
  document.getElementById('dbStatusText').textContent = msg;
  if (mode !== undefined) {
    document.getElementById('dbMode').textContent = mode;
  }
}

/**
 * Get a unique color for a device
 * @param {String} id - Device ID
 * @returns {String} Color hex code
 */
const deviceColors = {};
let colorIdx = 0;

function getDeviceColor(id) {
  if (!deviceColors[id]) {
    deviceColors[id] = VEHICLE_COLORS[colorIdx++ % VEHICLE_COLORS.length];
  }
  return deviceColors[id];
}

/**
 * Switch between tabs
 * @param {String} name - Tab name ('live', 'routes', 'schedule')
 */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => 
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.tab-pane').forEach(p => 
    p.classList.toggle('active', p.id === `tab-${name}`)
  );
  
  if (name === 'routes') {
    setTimeout(() => {
      if (typeof fitAllRoutes === 'function') {
        fitAllRoutes();
      }
    }, 100);
  }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  const collapsed = document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('floatToggle').style.display = collapsed ? 'flex' : 'none';
}

// ── Geocode Utilities ──

const geocodeCache = {};

/**
 * Check if a string looks like coordinates
 * @param {String} str
 * @returns {Boolean}
 */
function isCoordString(str) {
  if (!str) return false;
  return /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(str.trim());
}

/**
 * Reverse geocode a coordinate string to a place name
 * @param {String} coordStr - "lat, lng" string
 * @returns {Promise<String>} Place name or original string
 */
async function reverseGeocode(coordStr) {
  if (!coordStr) return coordStr;
  if (!isCoordString(coordStr)) return coordStr;
  if (geocodeCache[coordStr]) return geocodeCache[coordStr];

  const [lat, lng] = coordStr.split(',').map(s => s.trim());

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'TrackItCDO/1.0' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const label = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.road || coordStr;
    geocodeCache[coordStr] = label;
    return label;
  } catch {
    geocodeCache[coordStr] = coordStr;
    return coordStr;
  }
}

/**
 * Get cached label or reverse geocode
 * @param {String} coord
 * @returns {Promise<String>}
 */
async function getLabel(coord) {
  if (!coord) return coord;
  if (geocodeCache[coord]) return geocodeCache[coord];
  return reverseGeocode(coord);
}

window.reverseGeocode = reverseGeocode;
window.getLabel = getLabel;
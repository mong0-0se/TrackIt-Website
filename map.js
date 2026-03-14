/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Map Module
   Handles Leaflet map initialization, layers, markers, and controls
   ══════════════════════════════════════════════════════════════════════════ */

// ── Map Initialization ──
const map = L.map('map', { zoomControl: false }).setView(CDO_CENTER, 14);

// Map layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
});

const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri',
  maxZoom: 19
});

// Add default layer
osmLayer.addTo(map);

// ── Map State ──
let curLayer = 'osm';
let placeMarkers = [];
let busMarkers = {};
let routePolylines = [];
let smartLineLayer = null;
let currentInfoPlace = null;

// ── Marker Creation ──

/**
 * Create a bus marker icon with optional heading arrow
 * @param {String} deviceId - Device identifier
 * @param {Number} heading - Heading in degrees (optional)
 * @param {Boolean} isNew - Whether this is a newly created marker
 * @returns {L.DivIcon} Leaflet divIcon
 */
function makeBusIcon(deviceId, heading, isNew) {
  const color = getDeviceColor(deviceId);
  const hasHeading = heading != null;
  
  const popAnim = isNew ? 'animation:markerPop .4s cubic-bezier(.34,1.56,.64,1) both;' : '';
  const transition = isNew ? '' : 'transition:transform .4s ease;';
  const wrapStyle = hasHeading ? `transform:rotate(${heading}deg);${transition}${popAnim}` : popAnim;
  const iconRot = hasHeading ? `transform:rotate(${-heading}deg);` : '';
  
  const arrowSvg = hasHeading 
    ? `<svg width="14" height="14" viewBox="0 0 14 14" style="position:absolute;top:-10px;left:50%;margin-left:-7px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55));" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 13,13 7,9 1,13" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/></svg>` 
    : '';
  
  return L.divIcon({
    html: `<div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;${wrapStyle}">${arrowSvg}<div style="width:38px;height:38px;border-radius:10px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid #fff;box-shadow:0 3px 14px rgba(0,0,0,.35);${iconRot}"><i class="fa fa-bus"></i></div></div>`,
    className: '',
    iconSize: [54, 54],
    iconAnchor: [27, 27]
  });
}

/**
 * Clear all place markers from map
 */
function clearPlaceMarkers() {
  placeMarkers.forEach(m => map.removeLayer(m));
  placeMarkers = [];
}

/**
 * Add place markers to map
 * @param {Array} places - Array of place objects
 * @param {Boolean} single - Whether this is a single place
 */
function pinPlaces(places, single) {
  clearPlaceMarkers();
  if (typeof closeMapInfo === 'function') closeMapInfo();
  
  if (!places.length) return;
  
  places.forEach((p, i) => {
    const c = CAT_INFO[p.cat] || CAT_INFO.default;
    const focused = i === 0;
    const sz = focused ? 38 : 30;
    
    const icon = L.divIcon({
      html: `<div style="width:${sz}px;height:${sz}px;border-radius:${(sz/2.8)|0}px;background:${focused?'#0f1f3d':'#1a3460'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${focused?15:12}px;border:2.5px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.4);"><i class="fa ${c.icon}"></i></div>`,
      className: '',
      iconSize: [sz, sz],
      iconAnchor: [sz/2, sz/2]
    });
    
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
    marker.on('click', () => {
      if (typeof openMapInfo === 'function') openMapInfo(p);
      if (typeof computeSuggestions === 'function' && typeof renderSuggestions === 'function') {
        const { routeMatches, vehicleMatches } = computeSuggestions(p);
        renderSuggestions(p, routeMatches, vehicleMatches);
      }
    });
    
    placeMarkers.push(marker);
  });
  
  if (single || places.length === 1) {
    map.setView([places[0].lat, places[0].lng], 17);
    if (typeof openMapInfo === 'function') openMapInfo(places[0]);
    if (typeof switchTab === 'function') switchTab('live');
  } else {
    map.fitBounds(L.latLngBounds(places.map(p => [p.lat, p.lng])), { padding: [50, 50] });
  }
}

// ── Map Info Card ──

/**
 * Open map info card with place/vehicle details
 * @param {Object} p - Place or position object
 */
function openMapInfo(p) {
  currentInfoPlace = p;
  document.getElementById('micTitle').textContent = p.name;
  document.getElementById('micSub').textContent = p.addr || '';
  document.getElementById('micSpeed').style.display = 'none';
  document.getElementById('mapInfoCard').classList.add('show');
}

/**
 * Close map info card
 */
function closeMapInfo() {
  document.getElementById('mapInfoCard').classList.remove('show');
  currentInfoPlace = null;
}

// Make closeMapInfo globally accessible for onclick handlers
window.closeMapInfo = closeMapInfo;

// ── Map Controls ──

/**
 * Initialize map control button handlers
 */
function initMapControls() {
  // Zoom controls
  document.getElementById('zoomIn').addEventListener('click', () => map.zoomIn());
  document.getElementById('zoomOut').addEventListener('click', () => map.zoomOut());
  
  // Locate me
  document.getElementById('locateMe').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => map.setView([p.coords.latitude, p.coords.longitude], 15),
        () => map.setView(CDO_CENTER, 14)
      );
    } else {
      map.setView(CDO_CENTER, 14);
    }
  });
  
  // Layer toggle
  document.getElementById('layerBtn').addEventListener('click', () => {
    if (curLayer === 'osm') {
      map.removeLayer(osmLayer);
      satLayer.addTo(map);
      curLayer = 'sat';
      showToast('Satellite view');
    } else {
      map.removeLayer(satLayer);
      osmLayer.addTo(map);
      curLayer = 'osm';
      showToast('Street map');
    }
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    showToast('Refreshing data…');
    if (typeof loadAllData === 'function') {
      loadAllData();
    }
  });
  
  // Map info card buttons
  document.getElementById('micDirections').addEventListener('click', () => {
    if (currentInfoPlace) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${currentInfoPlace.lat},${currentInfoPlace.lng}`,
        '_blank'
      );
    }
  });
  
  document.getElementById('micShare').addEventListener('click', () => {
    if (!currentInfoPlace) return;
    const { lat, lng } = currentInfoPlace;
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
    } else {
      showToast('Copy not supported', 'warn');
    }
  });
  
  // FAB button
  document.getElementById('fab').addEventListener('click', () => {
    showToast('Report traffic · Share location · Save stop');
  });
}

// Export functions for use in other modules
window.map = map;
window.busMarkers = busMarkers;
window.routePolylines = routePolylines;
window.placeMarkers = placeMarkers;
window.smartLineLayer = smartLineLayer;
window.currentInfoPlace = currentInfoPlace;
window.makeBusIcon = makeBusIcon;
window.clearPlaceMarkers = clearPlaceMarkers;
window.pinPlaces = pinPlaces;
window.openMapInfo = openMapInfo;

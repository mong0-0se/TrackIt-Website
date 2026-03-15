/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Operating Hours Module
   Handles route operating hours display
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert military time (HH:MM) to AM/PM format
 * @param {String} time - Time string in HH:MM format
 * @returns {String} Time in AM/PM format
 */
function formatAmPm(time) {
  if (!time) return 'Not set';
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

/**
 * Fetch operating hours for active routes
 * @returns {Promise<Array>} Array of routes with operating hours
 */
async function fetchOperatingHours() {
  const { data, error } = await sb
    .from('routes')
    .select('id, route_name, origin, destination, first_trip, last_trip, color')
    .eq('status', 'active')
    .order('route_name');
    
  if (error) throw error;
  return data || [];
}

/**
 * Render operating hours to sidebar
 * @param {Array} routes - Array of route objects
 */
async function renderOperatingHours(routes) {
  const container = document.getElementById('scheduleList');
  
  if (!routes.length) {
    container.innerHTML = `<div class="empty">
      <i class="fa fa-clock"></i>
      <h3>No Operating Hours</h3>
      <p>No active routes with operating hours configured.</p>
    </div>`;
    return;
  }

  // Geocode all origins and destinations in parallel
  const geocoded = await Promise.all(routes.map(async r => ({
    ...r,
    originLabel: await getLabel(r.origin),
    destLabel: await getLabel(r.destination)
  })));

  container.innerHTML = geocoded.map(r => {
    const color = r.color || '#2563eb';
    const firstTrip = formatAmPm(r.first_trip);
    const lastTrip = formatAmPm(r.last_trip);
    
    return `<div class="hours-card">
      <div class="hours-card-header">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div>
            <div class="hours-route-name">${r.route_name}</div>
            <div class="hours-route-path">
              <i class="fa fa-route"></i> ${r.originLabel || r.origin} → ${r.destLabel || r.destination}
            </div>
          </div>
        </div>
      </div>
      <div class="hours-times">
        <div class="hours-time-block">
          <div class="hours-time-label">First Trip</div>
          <div class="hours-time-value">${firstTrip}</div>
        </div>
        <div class="hours-time-block">
          <div class="hours-time-label">Last Trip</div>
          <div class="hours-time-value">${lastTrip}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Export functions
window.fetchOperatingHours = fetchOperatingHours;
window.renderOperatingHours = renderOperatingHours;
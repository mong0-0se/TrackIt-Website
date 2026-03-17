/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Route Module
   Handles route display, selection, and route suggestions
   ══════════════════════════════════════════════════════════════════════════ */

// ── State ──
let selectedRouteIdx = -1;
window.allRoutes = [];

// ── Data Fetching ──

/**
 * Fetch active routes from database
 * @returns {Promise<Array>} Array of routes
 */
async function fetchRoutes() {
  const { data, error } = await sb
    .from("routes")
    .select("*")
    .eq("status", "active")
    .order("route_name");

  if (error) throw error;
  return (data || []).map(r => ({
    ...r,
    coordinates: Array.isArray(r.coordinates)
      ? r.coordinates.map(([a, b]) => (a > 90 ? [b, a] : [a, b]))
      : []
  }));
}

// ── Rendering ──

/**
 * Render routes to sidebar and map
 * @param {Array} routes - Array of route objects
 */
async function renderRoutes(routes) {
  window.allRoutes = routes;
  document.getElementById("tabRouteCount").textContent = routes.length;

  const container = document.getElementById("routeCards");

  // Clear existing polylines
  window.routePolylines.forEach((pl) => pl && window.map.removeLayer(pl));
  window.routePolylines = [];
  selectedRouteIdx = -1;

  if (!routes.length) {
    container.innerHTML = `<div class="empty">
      <i class="fa fa-route"></i>
      <h3>No Active Routes</h3>
      <p>Routes must have status <strong>active</strong> to appear here.</p>
    </div>`;
    return;
  }

  // Create polylines for routes with coordinates
  routes.forEach((r, i) => {
    const color = r.color || VEHICLE_COLORS[i % VEHICLE_COLORS.length];

    if (r.coordinates?.length >= 2) {
      const pl = L.polyline(r.coordinates, {
        color,
        weight: 4.5,
        opacity: 0.75,
        lineCap: "round",
        lineJoin: "round",
      })
        .addTo(window.map)
        .bindPopup(
          `<div style="font-family:'DM Sans',sans-serif;min-width:160px">
        <div style="font-size:13px;font-weight:800;color:#0f1f3d;margin-bottom:4px">${r.route_name}</div>
        
      </div>`,
        )
        .on("click", () => selectRoute(i));

      window.routePolylines.push(pl);
    } else {
      window.routePolylines.push(null);
    }
  });

  // Geocode all origins and destinations in parallel
  // Also write labels back onto window.allRoutes so computeSuggestions can use them
  const geocoded = await Promise.all(routes.map(async (r, i) => {
    const originLabel = await getLabel(r.origin);
    const destLabel = await getLabel(r.destination);
    window.allRoutes[i].originLabel = originLabel;
    window.allRoutes[i].destLabel = destLabel;
    return { ...r, originLabel, destLabel };
  }));

  // Render sidebar cards
  container.innerHTML = geocoded
    .map((r, i) => {
      const color = r.color || VEHICLE_COLORS[i % VEHICLE_COLORS.length];
      const routeVehicles = window.allVehicles.filter(
        (v) => v.route_id === r.id && v.status === 'in_service',
      );
      const vehicleCount = routeVehicles.length;

      return `<div class="route-card" id="route-card-${i}">
      <div onclick="selectRoute(${i})">
        <div class="route-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="route-name">${r.route_name}</span>
          </div>
          <span class="badge blue">${r.distance_km ? r.distance_km + " km" : "—"}</span>
        </div>
        <div class="route-path-text">
          <i class="fa fa-circle" style="color:${color};font-size:7px"></i> ${r.originLabel || r.origin || "—"}
          <i class="fa fa-arrows-left-right" style="font-size:9px"></i>
          <i class="fa fa-flag-checkered" style="font-size:9px"></i> ${r.destLabel || r.destination || "—"}
        </div>
        <div style="margin-top:5px;font-size:10px;font-weight:700;color:var(--text-muted);font-style:italic;">
          <i class="fa fa-repeat" style="font-size:9px"></i> Vice Versa
        </div>
      </div>
      <div class="route-vehicles-toggle" onclick="toggleRouteVehicles(${i}, event)">
        <i class="fa fa-chevron-down"></i>
        <span>${vehicleCount} in-service vehicle${vehicleCount !== 1 ? "s" : ""}</span>
      </div>
      <div class="route-vehicles-list" id="route-vehicles-${i}">
        ${routeVehicles.length
          ? routeVehicles.map(v => `
            <div class="vehicle-item">
              <div class="vehicle-icon" style="background:${color}20;color:${color}">
                <i class="fa fa-bus"></i>
              </div>
              <div class="vehicle-details">
                <div class="vehicle-name" style="font-size:12px;font-weight:900;color:var(--navy)">${v.plate_number || '—'}</div>
                <div class="vehicle-plate">${v.vehicle_name}</div>
              </div>
              <span class="badge green">in_service</span>
            </div>`).join("")
          : '<div class="suggest-empty"><i class="fa fa-bus"></i> No in-service vehicles on this route</div>'
        }
      </div>
    </div>`;
    })
    .join("");
}

/**
 * Toggle vehicle list for a route
 * @param {Number} idx - Route index
 * @param {Event} event - Click event
 */
function toggleRouteVehicles(idx, event) {
  event.stopPropagation();
  const list = document.getElementById(`route-vehicles-${idx}`);
  const toggle = event.currentTarget;
  const isExpanded = list.classList.toggle("show");
  toggle.classList.toggle("expanded", isExpanded);
}

window.toggleRouteVehicles = toggleRouteVehicles;

/**
 * Select and focus on a route
 * @param {Number} idx - Route index
 */
function selectRoute(idx) {
  if (selectedRouteIdx >= 0) {
    document
      .getElementById(`route-card-${selectedRouteIdx}`)
      ?.classList.remove("active-route");
    window.routePolylines[selectedRouteIdx]?.setStyle({
      weight: 4.5,
      opacity: 0.75,
    });
  }

  selectedRouteIdx = idx;
  const card = document.getElementById(`route-card-${idx}`);
  card?.classList.add("active-route");
  card?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  const pl = window.routePolylines[idx];
  const r = window.allRoutes[idx];

  if (pl) {
    pl.setStyle({ weight: 6, opacity: 1 });
    window.map.fitBounds(pl.getBounds(), { padding: [60, 60] });
    pl.openPopup();
  } else if (r) {
    showToast(`"${r.route_name}" has no coordinates yet`, "warn");
  }

  if (r) {
    showToast(`${r.route_name}: ${r.origin} → ${r.destination}`);
  }
}

window.selectRoute = selectRoute;

/**
 * Fit all routes on map
 */
function fitAllRoutes() {
  const valid = window.routePolylines.filter(Boolean);
  if (!valid.length) return;
  window.map.fitBounds(L.featureGroup(valid).getBounds(), {
    padding: [50, 50],
  });
}

// ── Route Suggestions ──

/**
 * Compute route and vehicle suggestions for a place.
 * Vehicles are derived from suggested routes only — not GPS proximity.
 * @param {Object} place - Place object with lat/lng
 * @returns {Object} {routeMatches, vehicleMatches}
 */
function computeSuggestions(place) {
  const destPt = [place.lat, place.lng];

  // Step 1: find routes near the searched place
  const routeMatches = window.allRoutes
    .map((r, idx) => {
      const coords = Array.isArray(r.coordinates) ? r.coordinates : [];
      let dist = minDistToPolyline(destPt, coords);

      if (dist === Infinity) {
        // No coordinates — fall back to text match on route name/labels
        const haystack = [
          r.route_name, r.origin, r.destination,
          r.originLabel, r.destLabel
        ].filter(Boolean).join(' ').toLowerCase();
        const needle = place.name.toLowerCase();
        dist = haystack.includes(needle) ? 0.004 : 50;
      }

      return { route: r, routeIdx: idx, dist };
    })
    .filter((m) => m.dist < ROUTE_SUGGEST_THRESHOLD_KM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  // Step 2: collect in-service vehicles that belong to those suggested routes
  // Build a lookup of live GPS positions keyed by vehicle id
  const posByVehicleId = {};
  Object.values(window.busMarkers).forEach(marker => {
    const pos = marker._posData;
    if (pos?.vehicle_id) {
      posByVehicleId[pos.vehicle_id] = pos;
    }
  });

  const vehicleMatches = routeMatches.flatMap(m => {
    const routeVehicles = (window.allVehicles || []).filter(
      v => v.route_id === m.route.id && v.status === 'in_service'
    );

    return routeVehicles.map(v => ({
      vehicle: v,
      route: m.route,
      routeIdx: m.routeIdx,
      // Attach live GPS pos if this vehicle has an active marker
      pos: posByVehicleId[v.id] || null
    }));
  });

  return { routeMatches, vehicleMatches };
}

/**
 * Render route and vehicle suggestions.
 * Vehicle panel is hidden entirely when no routes are suggested.
 * @param {Object} place - Place object
 * @param {Array} routeMatches - Array of route matches
 * @param {Array} vehicleMatches - Array of vehicle matches (route-derived)
 */
function renderSuggestions(place, routeMatches, vehicleMatches) {
  const routePanel = document.getElementById("suggestedRoutesPanel");
  const routeList = document.getElementById("suggestedRoutesList");
  const routeCount = document.getElementById("suggestedRoutesCount");

  // Always remove the smart line — no longer used for distance display
  if (window.smartLineLayer) {
    window.map.removeLayer(window.smartLineLayer);
    window.smartLineLayer = null;
  }

  // ── Route Panel ──
  if (routeMatches.length) {
    routeCount.textContent = `${routeMatches.length} route${routeMatches.length !== 1 ? "s" : ""}`;

    routeList.innerHTML = routeMatches
      .map((m, i) => {
        const r = m.route;
        const color = r.color || VEHICLE_COLORS[m.routeIdx % VEHICLE_COLORS.length];
        const distLabel = `${(m.dist * 1000).toFixed(1)} m from route`;

        return `<div class="route-suggest-item ${i === 0 ? "best" : ""}" data-ridx="${m.routeIdx}">
          <div class="rsi-dot" style="background:${color}"></div>
          <div class="rsi-body">
            <div class="rsi-name">
              ${r.route_name}
              ${i === 0 ? '<span class="rsi-best-tag">Best match</span>' : ""}
            </div>
            <div class="rsi-path">${r.origin || "—"} → ${r.destination || "—"}</div>
            <div class="rsi-meta">
              <span><i class="fa fa-location-dot"></i> ${distLabel}</span>
              ${r.distance_km ? `<span><i class="fa fa-road"></i> ${r.distance_km} km</span>` : ""}
            </div>
          </div>
          <button class="rsi-action" data-ridx="${m.routeIdx}">View</button>
        </div>`;
      })
      .join("");

    routeList
      .querySelectorAll(".route-suggest-item, .rsi-action")
      .forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(
            el.dataset.ridx ?? el.closest("[data-ridx]").dataset.ridx,
          );
          switchTab("routes");
          setTimeout(() => selectRoute(idx), 80);
          showToast(`Showing route: ${window.allRoutes[idx].route_name}`);
        });
      });

    routePanel.style.display = "block";
  } else {
    routePanel.style.display = "none";
  }

  // ── Vehicle Panel ──
  const vPanel = document.getElementById("nearestVehiclesPanel");
  const vList = document.getElementById("nearestVehiclesList");
  const vCount = document.getElementById("nearestVehiclesCount");

  // No routes suggested → hide vehicle panel entirely
  if (!routeMatches.length) {
    vPanel.style.display = "none";
    return;
  }

  // Routes suggested but no in-service vehicles on any of them
  if (!vehicleMatches.length) {
    vCount.textContent = "0 vehicles";
    vList.innerHTML = `<div class="suggest-empty">
      <i class="fa fa-satellite-dish"></i> No in-service vehicles on suggested routes
    </div>`;
    vPanel.style.display = "block";
    return;
  }

  // Render vehicles grouped under their route
  vCount.textContent = `${vehicleMatches.length} vehicle${vehicleMatches.length !== 1 ? "s" : ""}`;

  vList.innerHTML = vehicleMatches.map((m, i) => {
    const v = m.vehicle;
    const r = m.route;
    const pos = m.pos;
    const color = r.color || VEHICLE_COLORS[m.routeIdx % VEHICLE_COLORS.length];
    const speed = pos?.speed_kmh != null
      ? `${parseFloat(pos.speed_kmh).toFixed(0)} km/h`
      : "—";
    const driverName = v.driver?.name || "No driver";
    const deviceId = pos?.device_id || '';

    return `<div class="vehicle-suggest-item" data-vid="${v.id}" data-device="${deviceId}">
      <div class="vsi-icon" style="background:${color}20;color:${color}">
        <i class="fa fa-bus"></i>
      </div>
      <div class="vsi-body">
        <div class="vsi-name">
          ${v.plate_number || v.vehicle_name || "—"}
          ${i === 0 ? '<span class="vsi-nearest-tag">On route</span>' : ""}
        </div>
        <div class="vsi-route">${r.origin || "—"} → ${r.destination || "—"}</div>
        <div class="vsi-meta">
          <span><i class="fa fa-gauge-high"></i> ${speed}</span>
          <span><i class="fa fa-user"></i> ${driverName}</span>
          <span style="color:${color};font-weight:700">
            <i class="fa fa-route"></i> ${r.route_name}
          </span>
        </div>
      </div>
      ${pos
        ? `<div class="vsi-dist" style="color:var(--success)"><i class="fa fa-circle" style="font-size:6px"></i> Live</div>`
        : `<div class="vsi-dist" style="color:var(--text-muted)"><i class="fa fa-circle" style="font-size:6px"></i> No GPS</div>`
      }
    </div>`;
  }).join("");

  vList.querySelectorAll(".vehicle-suggest-item").forEach((el) => {
    el.addEventListener("click", () => {
      const deviceId = el.dataset.device;
      const label = el.querySelector(".vsi-name").childNodes[0].textContent.trim();

      if (deviceId) {
        focusBus(deviceId);
        showToast(`Tracking ${label}`);
      } else {
        showToast(`${label} has no active GPS position`, "warn");
      }
    });
  });

  vPanel.style.display = "block";
}

// Export functions
window.fetchRoutes = fetchRoutes;
window.renderRoutes = renderRoutes;
window.fitAllRoutes = fitAllRoutes;
window.computeSuggestions = computeSuggestions;
window.renderSuggestions = renderSuggestions;
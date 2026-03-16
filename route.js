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
 * Compute route and vehicle suggestions for a place
 * @param {Object} place - Place object with lat/lng
 * @returns {Object} {routeMatches, vehicleMatches}
 */
function computeSuggestions(place) {
  const destPt = [place.lat, place.lng];

  const routeMatches = window.allRoutes
    .map((r, idx) => {
      const coords = Array.isArray(r.coordinates) ? r.coordinates : [];
      let dist = minDistToPolyline(destPt, coords);

if (dist === Infinity) {
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

  const positionsArr = Object.values(window.busMarkers)
    .map((m) => m._posData)
    .filter(Boolean);

  const vehicleMatches = positionsArr
    .map((pos) => ({
      pos,
      dist: haversine(destPt, [
        parseFloat(pos.latitude),
        parseFloat(pos.longitude),
      ]),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  return { routeMatches, vehicleMatches };
}

/**
 * Render route and vehicle suggestions
 * @param {Object} place - Place object
 * @param {Array} routeMatches - Array of route matches
 * @param {Array} vehicleMatches - Array of vehicle matches
 */
function renderSuggestions(place, routeMatches, vehicleMatches) {
  const routePanel = document.getElementById("suggestedRoutesPanel");
  const routeList = document.getElementById("suggestedRoutesList");
  const routeCount = document.getElementById("suggestedRoutesCount");

  if (routeMatches.length) {
    routeCount.textContent = `${routeMatches.length} route${routeMatches.length !== 1 ? "s" : ""}`;

    routeList.innerHTML = routeMatches
      .map((m, i) => {
        const r = m.route;
        const color =
          r.color || VEHICLE_COLORS[m.routeIdx % VEHICLE_COLORS.length];
        const distLabel = `${(m.dist * 1000).toFixed(1)} m from route`;
        const pts = r.coordinates?.length || 0;

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
            ${pts ? `<span><i class="fa fa-map-pin"></i> ${pts} pts</span>` : ""}
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

  const vPanel = document.getElementById("nearestVehiclesPanel");
  const vList = document.getElementById("nearestVehiclesList");
  const vCount = document.getElementById("nearestVehiclesCount");

  if (window.smartLineLayer) {
    window.map.removeLayer(window.smartLineLayer);
    window.smartLineLayer = null;
  }

  if (vehicleMatches.length) {
    vCount.textContent = `${vehicleMatches.length} vehicle${vehicleMatches.length !== 1 ? "s" : ""}`;

    const nearest = vehicleMatches[0];
    window.smartLineLayer = L.polyline(
      [
        [parseFloat(nearest.pos.latitude), parseFloat(nearest.pos.longitude)],
        [place.lat, place.lng],
      ],
      {
        color: getDeviceColor(nearest.pos.device_id),
        weight: 2,
        opacity: 0.6,
        dashArray: "6 8",
      },
    ).addTo(window.map);

    vList.innerHTML = vehicleMatches
      .map((m, i) => {
        const pos = m.pos;
        const v = pos.vehicle || {};
        const r = v.route || {};
        const d = v.driver || {};
        const color = getDeviceColor(pos.device_id);
        const name = v.vehicle_name || pos.device_name || pos.device_id;
        const distKm =
          m.dist < 1
            ? `${(m.dist * 1000).toFixed(0)} m away`
            : `${m.dist.toFixed(1)} km away`;
        const speed =
          pos.speed_kmh != null
            ? `${parseFloat(pos.speed_kmh).toFixed(0)} km/h`
            : "—";
        const route = r.route_name
          ? `${r.origin} → ${r.destination}`
          : "No route assigned";

        return `<div class="vehicle-suggest-item" data-vid="${pos.device_id}">
        <div class="vsi-icon" style="background:${color}20;color:${color}">
          <i class="fa fa-bus"></i>
        </div>
        <div class="vsi-body">
          <div class="vsi-name">
            ${name}
            ${i === 0 ? '<span class="vsi-nearest-tag">Nearest</span>' : ""}
          </div>
          <div class="vsi-route">${route}</div>
          <div class="vsi-meta">
            <span><i class="fa fa-gauge-high"></i> ${speed}</span>
            <span><i class="fa fa-user"></i> ${d.name || "No driver"}</span>
          </div>
        </div>
        <div class="vsi-dist">${distKm}</div>
      </div>`;
      })
      .join("");

    vList.querySelectorAll(".vehicle-suggest-item").forEach((el) => {
      el.addEventListener("click", () => {
        focusBus(el.dataset.vid);
        const vname = el
          .querySelector(".vsi-name")
          .childNodes[0].textContent.trim();
        showToast(`Tracking ${vname}`);
      });
    });

    vPanel.style.display = "block";
  } else {
    vList.innerHTML = `<div class="suggest-empty">
      <i class="fa fa-satellite-dish"></i> No live vehicles currently in service
    </div>`;
    vPanel.style.display = "block";
  }
}

// ── Route Planning Inputs ──

/**
 * Initialize route planning handlers
 */
function initRoutePlanningHandlers() {
  const originInp = document.getElementById("routeOrigin");
  const destInp = document.getElementById("routeDest");
  const swapBtn = document.getElementById("swapBtn");
  const dirBtn = document.getElementById("getDirectionsBtn");
  let debounceTimer = null;

  function bothFilled() {
    return originInp.value.trim() !== "" && destInp.value.trim() !== "";
  }

  function syncButton() {
    const ready = bothFilled();
    dirBtn.style.display = ready ? "flex" : "none";
    dirBtn.disabled = !ready;
  }

  function triggerRouteSearch(immediate = false) {
    clearTimeout(debounceTimer);
    if (!bothFilled()) return;
    if (immediate) {
      searchRouteByInputs();
    } else {
      debounceTimer = setTimeout(searchRouteByInputs, 800);
    }
  }

  function searchRouteByInputs() {
    const origin = originInp.value.trim().toLowerCase();
    const dest = destInp.value.trim().toLowerCase();

    if (!origin || !dest) return;

    const matches = window.allRoutes
      .map((r, idx) => {
        const rOrigin = (r.origin || "").toLowerCase();
        const rDest = (r.destination || "").toLowerCase();
        const rName = (r.route_name || "").toLowerCase();

        const originScore =
          rOrigin.includes(origin) || rName.includes(origin) ? 1 : 0;
        const destScore = rDest.includes(dest) || rName.includes(dest) ? 1 : 0;

        return { idx, score: originScore + destScore };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matches.length) {
      selectRoute(matches[0].idx);
      showToast(
        `Found ${matches.length} matching route${matches.length > 1 ? "s" : ""}`,
      );
      matches.forEach((m) => {
        const pl = window.routePolylines[m.idx];
        if (pl) pl.setStyle({ weight: 5, opacity: 0.9 });
      });
    } else {
      showToast("No routes found for that origin/destination", "warn");
    }
  }

  originInp.addEventListener("input", () => { syncButton(); triggerRouteSearch(); });
  destInp.addEventListener("input", () => { syncButton(); triggerRouteSearch(); });

  [originInp, destInp].forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && bothFilled()) triggerRouteSearch(true);
    });
  });

  dirBtn.addEventListener("click", () => triggerRouteSearch(true));

  swapBtn.addEventListener("click", () => {
    [originInp.value, destInp.value] = [destInp.value, originInp.value];
    syncButton();
    triggerRouteSearch(true);
  });

  document.getElementById("useLocBtn").addEventListener("click", function () {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported", "warn");
      return;
    }
    this.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span>Getting location…</span>';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        window.map.setView([lat, lng], 15);
        L.marker([lat, lng]).addTo(window.map).bindPopup("You are here!").openPopup();
        originInp.value = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        this.innerHTML = '<i class="fa fa-check"></i><span>Location set!</span>';
        showToast("Location set as starting point");
        syncButton();
        setTimeout(() => {
          this.innerHTML = '<i class="fa fa-location-arrow"></i><span>Use My Current Location</span>';
        }, 2000);
      },
      () => {
        this.innerHTML = '<i class="fa fa-location-arrow"></i><span>Use My Current Location</span>';
        originInp.value = "CDO City Center";
        window.map.setView(CDO_CENTER, 15);
        showToast("Using CDO City Center");
        syncButton();
      },
    );
  });
}

// Export functions
window.fetchRoutes = fetchRoutes;
window.renderRoutes = renderRoutes;
window.fitAllRoutes = fitAllRoutes;
window.computeSuggestions = computeSuggestions;
window.renderSuggestions = renderSuggestions;
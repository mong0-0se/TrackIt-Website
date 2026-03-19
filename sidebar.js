/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Sidebar Module
   Handles sidebar controls, tab switching, and UI interactions
   ══════════════════════════════════════════════════════════════════════════ */

// ── Tab Management ──

/**
 * Initialize tab switching handlers
 */
function initTabHandlers() {
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });
}

// ── Sidebar Toggle ──

/**
 * Initialize sidebar collapse/expand handlers
 */
function initSidebarHandlers() {
  document
    .getElementById("collapseBtn")
    .addEventListener("click", toggleSidebar);
  document
    .getElementById("floatToggle")
    .addEventListener("click", toggleSidebar);
}

// ── View Toggles ──

/**
 * Show live default view (in-service vehicles)
 */
function showLiveDefault() {
  document.getElementById("liveDefaultBlock").style.display = "block";
  document.getElementById("searchResultsBlock").style.display = "none";
  document.getElementById("suggestedRoutesPanel").style.display = "none";
  document.getElementById("nearestVehiclesPanel").style.display = "none";

  if (window.smartLineLayer) {
    window.map.removeLayer(window.smartLineLayer);
    window.smartLineLayer = null;
  }
}

/**
 * Show search results UI
 * @param {Array|null} places - Array of places or null for loading state
 * @param {String} query - Search query
 */
function showSearchUI(places, query) {
  document.getElementById("liveDefaultBlock").style.display = "none";
  document.getElementById("searchResultsBlock").style.display = "block";
  document.getElementById("suggestedRoutesPanel").style.display = "none";
  document.getElementById("nearestVehiclesPanel").style.display = "none";

  const list = document.getElementById("searchResultsList");

  if (places === null) {
    list.innerHTML = `<div class="loading-block"><div class="spinner"></div>Searching in CDO…</div>`;
    return;
  }

  if (!places.length) {
    list.innerHTML = `<div class="empty"><i class="fa fa-magnifying-glass"></i><h3>No Results</h3><p>No places matched "${query}"</p></div>`;
    return;
  }

  list.innerHTML =
    `<div class="sec-label"><i class="fa fa-list"></i> ${places.length} place${places.length !== 1 ? "s" : ""} found</div>` +
    places.map((p, i) => buildPlaceCard(p, i === 0)).join("");

  // Compute and render suggestions for first place
  if (
    typeof computeSuggestions === "function" &&
    typeof renderSuggestions === "function"
  ) {
    const { routeMatches, vehicleMatches } = computeSuggestions(places[0]);
    renderSuggestions(places[0], routeMatches, vehicleMatches);
  }

  // Attach event handlers
  attachPlaceCardHandlers(places);
}

/**
 * Build HTML for a place card
 * @param {Object} p - Place object
 * @param {Boolean} focused - Whether card is focused
 * @returns {String} HTML string
 */
function buildPlaceCard(p, focused = false) {
  const c = CAT_INFO[p.cat] || CAT_INFO.default;
  return `<div class="place-card ${focused ? "focused" : ""}">
    <div class="pc-row">
      <div class="pc-icon ${c.cls}"><i class="fa ${c.icon}"></i></div>
      <div class="pc-body">
        <div class="pc-name">${p.name}</div>
        <div class="pc-addr"><i class="fa fa-location-dot" style="font-size:9px;opacity:.4;margin-right:3px"></i>${p.addr}</div>
        <span class="pc-type"><i class="fa ${c.icon}" style="font-size:8px"></i>${c.label}</span>
      </div>
    </div>
  </div>`;
}

/**
 * Attach event handlers to place cards
 * @param {Array} places - Array of place objects
 */
function attachPlaceCardHandlers(places) {
  const list = document.getElementById("searchResultsList");

  // Click on card
  list.querySelectorAll(".place-card").forEach((card, i) => {
    card.addEventListener("click", () => {
      list
        .querySelectorAll(".place-card")
        .forEach((c) => c.classList.remove("focused"));
      card.classList.add("focused");
      window.map.setView([places[i].lat, places[i].lng], 17);

      if (typeof openMapInfo === "function") {
        openMapInfo(places[i]);
      }

      if (
        typeof computeSuggestions === "function" &&
        typeof renderSuggestions === "function"
      ) {
        const { routeMatches, vehicleMatches } = computeSuggestions(places[i]);
        renderSuggestions(places[i], routeMatches, vehicleMatches);
      }
    });
  });

  // Directions button
  list.querySelectorAll(".btn-directions").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${places[i].lat},${places[i].lng}`,
        "_blank",
      );
    });
  });

  // Map button
  list.querySelectorAll(".btn-map").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(
        `https://www.openstreetmap.org/?mlat=${places[i].lat}&mlon=${places[i].lng}#map=18/${places[i].lat}/${places[i].lng}`,
        "_blank",
      );
    });
  });

  // Route planning button
  list.querySelectorAll(".btn-route").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      switchTab("routes");
      document.getElementById("routeDest").value = places[i].name;
      showToast(`Destination set: ${places[i].name}`);
    });
  });
}

// Export functions
window.showLiveDefault = showLiveDefault;
window.showSearchUI = showSearchUI;
window.buildPlaceCard = buildPlaceCard;

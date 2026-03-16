/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Search Module
   Handles place search using Nominatim API and autocomplete
   ══════════════════════════════════════════════════════════════════════════ */

// ── Search State ──
let debTimer = null;
let acResults = [];
let hlIdx = -1;

// ── DOM Elements ──
const srchInput = document.getElementById("globalSearch");
const acDrop = document.getElementById("acDrop");
const srchClear = document.getElementById("srchClear");
const srchSpinner = document.getElementById("srchSpinner");

// ── Category Detection ──

/**
 * Guess category based on place type and name
 * @param {Object} r - Nominatim result object
 * @returns {String} Category key
 */
function guessCategory(r) {
  const type = (r.type || "").toLowerCase();
  const cls = (r.class || "").toLowerCase();
  const name = ((r.name || "") + (r.display_name || "")).toLowerCase();

  if (CAT_TYPE[type]) return CAT_TYPE[type];
  if (CAT_TYPE[cls]) return CAT_TYPE[cls];

  // Pattern-based detection
  const patterns = [
    [/restaurant|eatery|kainan|food|lutong/, "food"],
    [/cafe|coffee|milk tea|boba/, "food"],
    [/university|college|school|academy|liceo|xavier|cmu/, "edu"],
    [/hospital|medical|clinic|nmmc|cdmc/, "health"],
    [/pharmacy|drugstore|botika/, "health"],
    [/mall|plaza|limketkai|sm |gaisano|robinsons|centrio/, "shop"],
    [/market|palengke|cogon|agora/, "shop"],
    [/bank|bdo|bpi|metrobank|landbank/, "gov"],
    [/hotel|inn|lodge|resort/, "hotel"],
    [/park|garden|sports|gym/, "leisure"],
    [/church|chapel|cathedral|mosque/, "gov"],
    [/terminal|bus stop|jeepney|transport/, "transport"],
  ];

  for (const [re, cat] of patterns) {
    if (re.test(name)) return cat;
  }

  return "default";
}

/**
 * Build formatted address from Nominatim address object
 * @param {Object} r - Nominatim result object
 * @returns {String} Formatted address
 */
function buildAddress(r) {
  const a = r.address || {};
  return [
    a.road || a.pedestrian || a.footway,
    a.suburb || a.neighbourhood || a.quarter || a.village,
    a.city || a.town || "Cagayan de Oro",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Parse Nominatim result into standardized place object
 * @param {Object} r - Nominatim result
 * @returns {Object} Parsed place object
 */
function parsePlace(r) {
  return {
    id: r.place_id,
    name: r.name || r.display_name.split(",")[0].trim(),
    addr: buildAddress(r),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    cat: guessCategory(r),
    display_name: r.display_name,
  };
}

// ── API Calls ──

/**
 * Search Nominatim for places in CDO
 * @param {String} query - Search query
 * @param {Number} limit - Maximum results
 * @returns {Promise<Array>} Array of results
 */
async function searchNominatim(query, limit = 10) {
  const params = new URLSearchParams({
    q: `${query}, Cagayan de Oro, Philippines`,
    format: "json",
    addressdetails: "1",
    limit,
    viewbox: CDO_BBOX,
    bounded: "1",
    "accept-language": "en",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": "TrackItCDO/1.0" },
    },
  );

  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// ── Autocomplete ──

/**
 * Render autocomplete dropdown
 * @param {Array} places - Array of place objects
 */
function renderAcDrop(places) {
  if (!places.length) {
    acDrop.innerHTML = `<div class="ac-empty">No places found in CDO</div>`;
    acDrop.classList.add("open");
    return;
  }

  acDrop.innerHTML = places
    .map((p, i) => {
      const c = CAT_INFO[p.cat] || CAT_INFO.default;
      return `<div class="ac-item" data-idx="${i}">
      <i class="fa ${c.icon}"></i>
      <div class="ac-body">
        <div class="ac-name">${p.name}</div>
        <div class="ac-addr">${p.addr}</div>
      </div>
      <span class="ac-sub">${c.label}</span>
    </div>`;
    })
    .join("");

  acDrop.querySelectorAll(".ac-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pickPlace(acResults[+el.dataset.idx]);
    });
  });

  acDrop.classList.add("open");
}

/**
 * Handle place selection from autocomplete
 * @param {Object} p - Selected place object
 */
function pickPlace(p) {
  srchInput.value = p.name;
  srchClear.classList.add("show");
  acDrop.classList.remove("open");
  pinPlaces([p], true);
  if (typeof showSearchUI === "function") showSearchUI([p], p.name);
}

/**
 * Run full search and display results
 * @param {String} query - Search query
 */
async function runFullSearch(query) {
  if (!query) return;

  switchTab("live");
  srchSpinner.classList.add("show");

  if (typeof showSearchUI === "function") {
    showSearchUI(null);
  }

  try {
    const places = (await searchNominatim(query, 15)).map(parsePlace);
    pinPlaces(places, false);

    if (typeof showSearchUI === "function") {
      showSearchUI(places, query);
    }
  } catch (err) {
    console.error("Search error:", err);
    if (typeof showSearchUI === "function") {
      showSearchUI([], query);
    }
  } finally {
    srchSpinner.classList.remove("show");
  }
}

// ── Event Handlers ──

/**
 * Initialize search input handlers
 */
function initSearchHandlers() {
  // Input event for autocomplete
  srchInput.addEventListener("input", () => {
    const q = srchInput.value.trim();
    srchClear.classList.toggle("show", q.length > 0);
    hlIdx = -1;
    clearTimeout(debTimer);

    if (q.length < 2) {
      acDrop.classList.remove("open");
      return;
    }

    srchSpinner.classList.add("show");

    debTimer = setTimeout(async () => {
      try {
        acResults = (await searchNominatim(q, 8)).map(parsePlace);
        renderAcDrop(acResults);
      } catch (err) {
        acDrop.innerHTML = `<div class="ac-empty">No connection</div>`;
        acDrop.classList.add("open");
      } finally {
        srchSpinner.classList.remove("show");
      }
    }, 350);
  });

  // Keyboard navigation
  srchInput.addEventListener("keydown", (e) => {
    const items = acDrop.querySelectorAll(".ac-item");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      hlIdx = Math.min(hlIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle("highlighted", i === hlIdx));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hlIdx = Math.max(hlIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle("highlighted", i === hlIdx));
    } else if (e.key === "Enter") {
      e.preventDefault();
      acDrop.classList.remove("open");

      if (hlIdx >= 0 && items[hlIdx]) {
        items[hlIdx].dispatchEvent(new MouseEvent("mousedown"));
      } else {
        runFullSearch(srchInput.value.trim());
      }
    } else if (e.key === "Escape") {
      acDrop.classList.remove("open");
    }
  });

  // Clear button
  srchClear.addEventListener("click", () => {
    srchInput.value = "";
    srchClear.classList.remove("show");
    acDrop.classList.remove("open");
    clearPlaceMarkers();
    if (typeof closeMapInfo === "function") closeMapInfo();

    // Remove smart line if exists
    if (window.smartLineLayer) {
      window.map.removeLayer(window.smartLineLayer);
      window.smartLineLayer = null;
    }

    if (typeof showLiveDefault === "function") {
      showLiveDefault();
    }
  });

  // Close on blur
  srchInput.addEventListener("blur", () => {
    setTimeout(() => acDrop.classList.remove("open"), 200);
  });
}

// Export functions
window.searchNominatim = searchNominatim;
window.runFullSearch = runFullSearch;
window.pickPlace = pickPlace;
window.parsePlace = parsePlace;

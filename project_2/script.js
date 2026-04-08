import showCategories from "./editable_js/template_category.js";
import showStats from "./editable_js/template_stats.js";
import showTable from "./editable_js/template_table.js";
import showExternal from "./editable_js/template_external.js";

import loadData from "./editable_js/load_data.js";

// ============================================
// DISPLAY MANAGEMENT - PROVIDED
// ============================================

function updateDisplay(content) {
  document.getElementById("data-display").innerHTML = content;
}

function updateButtonStates(activeView) {
  document.querySelectorAll(".view-button").forEach((button) => {
    button.classList.remove("active");
  });
  document.getElementById(`btn-${activeView}`).classList.add("active");
}

function showLoading() {
  updateDisplay('<div class="loading">Loading data from API...</div>');
}

/*html*/
function showError(message) {
  updateDisplay(`
    <div class="error">
      <h3>Error Loading Data</h3>
      <p>${message}</p>
      <button class="error-button" onclick="location.reload()">Try Again :(</button>
    </div>
  `);
}

// ============================================
// SORTING FUNCTION - ADDED FOR TABLE VIEW
// ============================================

function sortTableByColumn(column, data, direction = "asc") {
  const sortedData = [...data].sort((a, b) => {
    const av = a?.properties?.[column];
    const bv = b?.properties?.[column];

    // Handle missing values (push to bottom)
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    // Numeric sort if both look like numbers
    const an = Number(av);
    const bn = Number(bv);
    const bothNumeric = !Number.isNaN(an) && !Number.isNaN(bn);

    let result;
    if (bothNumeric) {
      result = an - bn;
    } else {
      result = String(av).localeCompare(String(bv));
    }

    return direction === "asc" ? result : -result;
  });

  updateDisplay(showTable(sortedData));
  attachTableSortingListeners(sortedData); // reattach after re-render
}

function attachTableSortingListeners(data) {
  const headers = document.querySelectorAll(".data-table th[data-sort]");

  headers.forEach((header) => {
    header.onclick = () => {
      const column = header.getAttribute("data-sort");

      // Toggle direction using a data attribute on the header
      const current = header.getAttribute("data-direction") || "desc";
      const next = current === "asc" ? "desc" : "asc";
      header.setAttribute("data-direction", next);

      sortTableByColumn(column, data, next);
    };
  });
}

// ============================================
// CATEGORY VIEW - jump menu wiring (ADDED)
// ============================================

function attachCategoryJumpListener() {
  const container = document.getElementById("data-display");
  if (!container) return;

  const select = container.querySelector("#cityJump");
  if (!select) return;

  select.onchange = (e) => {
    const id = e.target.value;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

// ============================================
// MAP VIEW
// ============================================

function initExternalView(data) {
  if (!window.L) {
    console.error(
      "Leaflet (L) not found. Make sure leaflet.js is included in index.html."
    );
    return;
  }

  const mapEl = document.getElementById("map");
  if (!mapEl) return; // external view not currently displayed

  // If user clicks External multiple times, avoid "Map container is already initialized"
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = "";
  }

  const points = data.map((f) => {
    const p = f?.properties ?? {};
    return {
      name: p.name ?? "",
      category: p.category ?? "Unknown",
      inspection_results: p.inspection_results ?? "",
      address_line_1: p.address_line_1 ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      zip: p.zip ?? "",
      coords: f?.geometry?.coordinates ?? null, // [lng, lat]
    };
  });

  const map = L.map("map").setView([38.98, -76.94], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);

  function renderMarkers(category) {
    layer.clearLayers();

    points.filter((pt) => {
        if (!pt.coords || pt.coords.length !== 2) return false;
        if (category === "ALL") return true;
        return pt.category === category;
      }).forEach((pt) => {
        const [lng, lat] = pt.coords;

        const popup = `
          <strong>${pt.name}</strong><br/>
          Category: ${pt.category}<br/>
          Results: ${pt.inspection_results}<br/>
          ${pt.address_line_1}, ${pt.city}, ${pt.state} ${pt.zip}
        `;

        L.marker([lat, lng]).addTo(layer).bindPopup(popup);
      });
  }

  renderMarkers("ALL");

  const select = document.getElementById("categoryFilter");
  if (select) {
    select.onchange = (e) => renderMarkers(e.target.value);
  }
}

// ============================================
// APPLICATION INITIALIZATION - PROVIDED
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Starting application...");

  try {
    showLoading();
    const data = await loadData();
    console.log(`Loaded ${data.length} items from API`);

    document.getElementById("btn-external").onclick = () => {
      updateDisplay(showExternal(data));
      updateButtonStates("external");
      initExternalView(data);
    };

    document.getElementById("btn-table").onclick = () => {
      updateDisplay(showTable(data));
      updateButtonStates("table");

      // IMPORTANT: attach listeners AFTER the table HTML is in the DOM
      attachTableSortingListeners(data);
    };

    document.getElementById("btn-categories").onclick = () => {
      updateDisplay(showCategories(data));
      updateButtonStates("categories");

      // ADDED: attach jump menu listener after categories HTML is in the DOM
      attachCategoryJumpListener();
    };

    document.getElementById("btn-stats").onclick = () => {
      updateDisplay(showStats(data));
      updateButtonStates("stats");
    };

    // Initial view
    updateDisplay(showExternal(data));
    updateButtonStates("external");
    initExternalView(data);

    console.log("Application ready!");
  } catch (error) {
    console.error("Application failed to start:", error);
    showError(error.message);
  }
});
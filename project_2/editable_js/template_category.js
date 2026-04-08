/**
 * CATEGORY VIEW
 * Groups GeoJSON features by properties.city
 */
function showCategories(data) {
  const features = Array.isArray(data) ? data : (data?.features ?? []);

  const norm = (v) => {
    const s = (v ?? "").toString().trim();
    return s && s !== "------" ? s : "Unknown";
  };

  const slug = (s) =>
    (s ?? "unknown").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // 1) Group by city
  const groups = new Map(); // city -> features[]
  for (const f of features) {
    const p = f?.properties ?? {};
    const city = norm(p.city);
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(f);
  }

  // 2) Sort groups by size (desc), then city name
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const diff = b[1].length - a[1].length;
    return diff !== 0 ? diff : a[0].localeCompare(b[0]);
  });

  const total = features.length || 1;

  // Jump menu HTML (built from sorted groups)
  const cityMenuHtml = `
    <div class="category-jump">
      <label for="cityJump"><strong>Jump to city:</strong></label>
      <select id="cityJump">
        <option value="">Select a city…</option>
        ${sortedGroups.map(([city]) => {
            const id = `city-${slug(city)}`;
            return `<option value="${id}">${city}</option>`;
          }).join("")}
      </select>
    </div>
  `;

  // Helper: get top categories string for a group
  const topCategoriesFor = (cityFeatures, topN = 3) => {
    const catCounts = new Map();
    for (const f of cityFeatures) {
      const cat = norm(f?.properties?.category);
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    return [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([cat, c]) => `${cat} (${c})`).join(", ");
  };

  // 3a) Summary table (makes relationships between groups very clear)
  const summaryRowsHtml = sortedGroups.map(([city, cityFeatures]) => {
      const cityId = `city-${slug(city)}`;
      const pct = Math.round((cityFeatures.length / total) * 100);
      const topCats = topCategoriesFor(cityFeatures, 1) || "Unknown";

      return `
        <tr>
          <td><a href="#${cityId}">${city}</a></td>
          <td>${cityFeatures.length}</td>
          <td>${pct}%</td>
          <td>${topCats}</td>
        </tr>
      `;
    }).join("");

  const summaryHtml = `
    <div class="category-summary">
      <h3>City Summary</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>City</th>
            <th>Count</th>
            <th>% of total</th>
            <th>Top category</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRowsHtml}
        </tbody>
      </table>
      <p><small>Tip: use the dropdown or click a city in the table to jump.</small></p>
    </div>
  `;

  // 3b) Build per-city sections
  const sectionsHtml = sortedGroups.map(([city, cityFeatures]) => {
      const cityId = `city-${slug(city)}`;

      const topCats = topCategoriesFor(cityFeatures, 3);

      // sort items by name
      const sortedItems = [...cityFeatures].sort((a, b) =>
        norm(a?.properties?.name).localeCompare(norm(b?.properties?.name))
      );

      const itemsHtml = sortedItems.map((f) => {
          const p = f?.properties ?? {};
          const name = norm(p.name);
          const category = norm(p.category);
          const result = norm(p.inspection_results);
          const date = p.inspection_date ? String(p.inspection_date).slice(0, 10) : "";

          return `
            <div class="category-item">
              <div>
                <strong>${name}</strong><br/>
                <small>${category}${date ? ` • ${date}` : ""}</small>
              </div>
              <div>
                <small>${result}</small>
              </div>
            </div>
          `;
        }).join("");

      const pct = Math.round((cityFeatures.length / total) * 100);

      return `
        <section class="category-section" id="${cityId}">
          <h3 class="category-header">${city} (${cityFeatures.length}, ${pct}%)</h3>
          <div class="category-meta">
            <small><strong>Top categories:</strong> ${topCats || "Unknown"}</small>
          </div>
          <div class="category-items">${itemsHtml}</div>
        </section>
      `;
    }).join("");

  return `
    <h2 class="view-title">Category View</h2>
    <div class="todo-implementation">
      <h3>Grouped by City</h3>
      <p><strong>Total items:</strong> ${features.length}</p>
      ${cityMenuHtml}
    </div>

    ${summaryHtml}

    ${sectionsHtml}
  `;
}

export default showCategories;
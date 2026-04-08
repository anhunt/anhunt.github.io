/**
 * EXTERNAL LIBRARY VIEW
 * Pick an external library and pipe your data to it.
 */
function showExternal(data) {
  // Requirements:
  // - Show data using an external library, such as leaflet.js or chartsjs or similar.
  // - Make a filter on this page so your external library only shows useful data.

  /*
        javascript goes here! you can return it below
    */

  const categories = Array.from(
    new Set(
      data.map((f) => f?.properties?.category).filter((c) => c && c !== "------")
    )
  ).sort();

  const optionsHtml = [`<option value="ALL">All Categories</option>`].concat(categories.map((c) => `<option value="${c}">${c}</option>`)).join("");

  /*html*/
  return `
                <h2 class="view-title">Library View</h2>
                <div class="todo-implementation">
                    <h3>Leaflet Map (External Library)</h3>

                    <label for="categoryFilter"><strong>Filter by category:</strong></label>
                    <select id="categoryFilter">
                      ${optionsHtml}
                    </select>

                    <p style="margin-top: 10px;">
                      Click a marker for details.
                    </p>

                    <div id="map"></div>
                </div>
            `;
}

export default showExternal;
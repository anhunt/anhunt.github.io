/**
 * CATEGORY VIEW - STUDENTS IMPLEMENT
 * Group data by categories - good for understanding relationships and patterns
 */
function showCategories(data) {
  // TODO: Students implement this function
  // Requirements:
  // - Group data by a meaningful category (cuisine, neighborhood, price, etc.)
  // - Show items within each group
  // - Make relationships between groups clear
  // - Consider showing group statistics
  /*html*/
  return `
                <h2 class="view-title">📂 Category View</h2>
                <div class="todo-implementation">
                    <h3>TODO: Implement Category View</h3>
                    <p><strong>Your task:</strong> Group the data by categories to show relationships</p>
                    <p><strong>Good for:</strong> Understanding patterns, finding similar items, exploring by type</p>
                    <p><strong>Consider:</strong> Group by cuisine? Neighborhood? Price range? What tells the best story?</p>
                    <p><strong>Available categories:</strong> ${[
                      ...new Set(data.map((item) => item.cuisine)),
                    ].join(", ")}</p>
                </div>
            `;
}

export default showCategories;
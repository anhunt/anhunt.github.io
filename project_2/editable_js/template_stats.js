/**
 * STATS VIEW
 * Show aggregate statistics and insights - good for understanding the big picture
 */
function showStats(data) {
  // Requirements:
  // Replace the below "task" description with the following:
  // - One meaningful statistic calculation from the supplied dataset
  // ===- percent of restaurants not passing hand-washing, for example
  // - Present insights visually
  // - Show distributions, averages, counts, etc.
  // - Help users understand patterns in the data

  /* Javascript calculations here */

  const total = data.length;

  // Helper to safely read properties
  const getP = (item) => item?.properties ?? {};

  // 1) Count by category
  const categoryCounts = {};
  data.forEach((item) => {
    const p = getP(item);
    const category = p.category ?? "Unknown";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Find most common category
  let mostCommonCategory = "Unknown";
  let maxCategoryCount = 0;
  for (const cat in categoryCounts) {
    if (categoryCounts[cat] > maxCategoryCount) {
      maxCategoryCount = categoryCounts[cat];
      mostCommonCategory = cat;
    }
  }

  // 2) Hand washing compliance
  let handWashKnown = 0;
  let handWashOut = 0;
  data.forEach((item) => {
    const p = getP(item);
    const v = p.adequate_hand_washing;
    if (v && v !== "------") {
      handWashKnown++;
      if (String(v).toLowerCase().includes("out of compliance")) handWashOut++;
    }
  });

  const handWashOutPct =
    handWashKnown > 0 ? ((handWashOut / handWashKnown) * 100).toFixed(1) : "0.0";

  // 3) Inspection results distribution
  const resultCounts = {};
  data.forEach((item) => {
    const p = getP(item);
    const r = p.inspection_results ?? "Unknown";
    resultCounts[r] = (resultCounts[r] || 0) + 1;
  });

  // Turn counts into sorted arrays for display
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topResults = Object.entries(resultCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const maxTopCategory = topCategories.length ? topCategories[0][1] : 1;
  const maxTopResult = topResults.length ? topResults[0][1] : 1;

  console.log("Most common category:", mostCommonCategory, "with", maxCategoryCount, "establishments");

  /* html return */
  return `
    <h2 class="view-title">Stats View</h2>

    <div class="todo-implementation">
      <p><strong>Total establishments:</strong> ${total}</p>

      <p><strong>Most common category:</strong> ${mostCommonCategory} (${maxCategoryCount})</p>

      <p>
        <strong>Hand washing out of compliance:</strong>
        ${handWashOut} / ${handWashKnown} (${handWashOutPct}%)
      </p>

      <h3>Top Categories</h3>
      <div class="stats-bars">
        ${topCategories.map(([cat, count]) => {
            const width = Math.round((count / maxTopCategory) * 100);
            return `
              <div class="stats-row">
                <div class="stats-label">${cat}</div>
                <div class="stats-bar-wrap">
                  <div class="stats-bar" style="width:${width}%"></div>
                </div>
                <div class="stats-value">${count}</div>
              </div>
            `;
          }).join("")}
      </div>

      <h3>Top Inspection Results</h3>
      <div class="stats-bars">
        ${topResults.map(([res, count]) => {
            const width = Math.round((count / maxTopResult) * 100);
            return `
              <div class="stats-row">
                <div class="stats-label">${res}</div>
                <div class="stats-bar-wrap">
                  <div class="stats-bar" style="width:${width}%"></div>
                </div>
                <div class="stats-value">${count}</div>
              </div>
            `;
          }).join("")}
      </div>
    </div>
  `;
}

export default showStats;
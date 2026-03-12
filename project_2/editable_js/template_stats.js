/**
 * STATS VIEW - STUDENTS IMPLEMENT
 * Show aggregate statistics and insights - good for understanding the big picture
 */
function showStats(data) {
  // TODO: Students implement this function
  // Requirements:
  // - Calculate meaningful statistics from the dataset
  // - Present insights visually
  // - Show distributions, averages, counts, etc.
  // - Help users understand patterns in the data
  /*html*/
  return `
                <h2 class="view-title">📈 Statistics View</h2>
                <div class="todo-implementation">
                    <h3>TODO: Implement Statistics View</h3>
                    <p><strong>Your task:</strong> Calculate and display key insights from the data</p>
                    <p><strong>Good for:</strong> Understanding trends, making data-driven decisions, seeing the big picture</p>
                    <p><strong>Consider:</strong> Average ratings? Price distribution? Most common cuisines? Geographic spread?</p>
                    <p><strong>Total records:</strong> ${data.length} items to analyze</p>
                </div>
            `;
}

export default showStats
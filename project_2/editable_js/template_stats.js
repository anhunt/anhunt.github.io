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
  
  /* html return */
  return `
                <h2 class="view-title">Stats View</h2>
                <div class="todo-implementation">
                    <h3>TODO: Implement Statistics View Here</h3>
                    <p><strong>Total records:</strong> ${data.length} items to analyze</p>
                    <p><strong>Your task:</strong> Calculate and display key insights from the data</p>
                    <p><strong>Consider:</strong> Average ratings? Price distribution? Most common cuisines? Geographic spread?</p>
                    <p><strong>Good for:</strong> Understanding trends, making data-driven decisions, seeing the big picture</p>
                </div>
            `;
}

export default showStats
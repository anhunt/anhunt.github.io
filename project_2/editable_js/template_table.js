
/**
 * TABLE VIEW
 * Display data in sortable rows - good for scanning specific information
 */
function showTable(data) {
  // Requirements:
  // - Show data in a table format
  // - Include all important fields
  // - Make it easy to scan and compare
  // - Consider adding sorting functionality
  //   https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/

    /*
        javascript goes here! you can return it below
    */ 
  /*html*/ 
  return `
                <h2 class="view-title">Table View</h2>
                <div class="todo-implementation">
                    <h3>TODO: Implement Table View</h3>
                    <p><strong>Data available:</strong> ${data.length} items loaded</p>
                    <p><strong>Your task:</strong> Display the data as a sortable table</p>
                    <p><strong>Consider:</strong> Which columns are most important? How can you make scanning easy?</p>
                    <p><strong>Good for:</strong> Scanning specific data points, comparing values, finding specific information</p>
                </div>
            `;
}

export default showTable;

/**
 * EXTERNAL LIBRARY VIEW
 * Pick an external library and pipe your data to it.
 */
function showTable(data) {
  // Requirements:
  // - Show data using an external library, such as leaflet.js or chartsjs or similar.
  // - Make a filter on this page so your external library only shows useful data.

    /*
        javascript goes here! you can return it below
    */ 
  
        /*html*/ 
  return `
                <h2 class="view-title">Library View</h2>
                <div class="todo-implementation">
                    <h3>TODO: Implement Library View</h3>
                    <p><strong>Data available:</strong> ${data.length} items loaded</p>
                    <p><strong>Your task:</strong> Display the data using an external library</p>
                    <p><strong>Consider:</strong> What types of data do you have? Lat-long? Percentages from the stats page? Etc.</p>
                    <p><strong>Good for:</strong> User interpretability</p>
                </div>
            `;
}

export default showTable;
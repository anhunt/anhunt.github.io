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

  const rows = data.map((item) => {
      const p = item.properties ?? {};

      const address2 =
        p.address_line_2 && p.address_line_2 !== "------" ? `, ${p.address_line_2}` : "";

      const fullAddress =
        `${p.address_line_1 ?? ""}${address2}, ${p.city ?? ""}, ${p.state ?? ""} ${p.zip ?? ""}`.trim();

      const date = p.inspection_date ? String(p.inspection_date).slice(0, 10) : "";

      return `
        <tr>
          <td>${p.name ?? ""}</td>
          <td>${p.category ?? ""}</td>
          <td>${date}</td>
          <td>${p.inspection_results ?? ""}</td>
          <td>${fullAddress}</td>
        </tr>
      `;
    }).join("");

  /*html*/
  return `
                <h2 class="view-title">Table View</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th data-sort="name"><strong>Name</strong></th>
                            <th data-sort="category"><strong>Category</strong></th>
                            <th data-sort="inspection_date"><strong>Inspection Date</strong></th>
                            <th data-sort="inspection_results"><strong>Results</strong></th>
                            <th data-sort="address_line_1"><strong>Address</strong></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
}

export default showTable;
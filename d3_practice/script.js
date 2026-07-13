const FILE = "data.csv";

const elStatus = d3.select("#status");
const elSort = d3.select("#sort");
const elMetric = d3.select("#metric");
const elTitle = d3.select("#chart-title");
const elSubtitle = d3.select("#chart-subtitle");

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const fmtPct0 = d3.format(".0f");
const fmt1 = d3.format(".1f");
const fmt0 = d3.format(".0f");

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showTooltip(event, d) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(`
      <div class="title">${escapeHtml(d.task)}</div>
      <div class="kv">
        <div>Completion</div><div>${fmtPct0(d.completion)}%</div>
        <div>Avg completion time</div><div>${fmt0(d.avgTime)} s</div>
        <div>Avg errors/participant</div><div>${fmt1(d.avgErrors)}</div>
      </div>
    `);
}

function moveTooltip(event) {
  tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function sortData(data, mode) {
  const copy = data.slice();
  switch (mode) {
    case "completion_desc":
      return copy.sort((a, b) => d3.descending(a.completion, b.completion));
    case "completion_asc":
      return copy.sort((a, b) => d3.ascending(a.completion, b.completion));
    case "time_desc":
      return copy.sort((a, b) => d3.descending(a.avgTime, b.avgTime));
    case "time_asc":
      return copy.sort((a, b) => d3.ascending(a.avgTime, b.avgTime));
    case "errors_desc":
      return copy.sort((a, b) => d3.descending(a.avgErrors, b.avgErrors));
    case "errors_asc":
      return copy.sort((a, b) => d3.ascending(a.avgErrors, b.avgErrors));
    case "task_desc":
      return copy.sort((a, b) => d3.descending(a.task, b.task));
    case "task_asc":
    default:
      return copy.sort((a, b) => d3.ascending(a.task, b.task));
  }
}

function getMetricSpec(metric) {
  switch (metric) {
    case "time":
      return {
        key: "avgTime",
        title: "Average Completion Time by Task",
        subtitle: "Seconds to complete.",
        yLabel: "Avg Completion Time (s)",
        barClass: "time",
        valueFormat: (n) => `${fmt0(n)} s`,
        yDomain: null
      };
    case "errors":
      return {
        key: "avgErrors",
        title: "Average Errors per Participant by Task",
        subtitle: "Lower is better.",
        yLabel: "Avg Errors / Participant",
        barClass: "errors",
        valueFormat: (n) => fmt1(n),
        yDomain: null
      };
    case "completion":
    default:
      return {
        key: "completion",
        title: "Completion by Task",
        subtitle: "Percent completed successfully.",
        yLabel: "Completion (%)",
        barClass: "completion",
        valueFormat: (n) => `${fmtPct0(n)}%`,
        yDomain: [0, 100]
      };
  }
}

/**
 * Single bar chart renderer into #chart
 */
function renderBarChart({ data, metricSpec }) {
  const root = d3.select("#chart");
  root.selectAll("*").remove();

  const margin = { top: 16, right: 16, bottom: 140, left: 72 };
  const width = 1100;
  const height = 460;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const valueAccessor = (d) => d[metricSpec.key];

  const x = d3
    .scaleBand()
    .domain(data.map(d => d.task))
    .range([0, innerWidth])
    .padding(0.22);

  const maxVal = d3.max(data, valueAccessor) ?? 0;

  const y = d3
    .scaleLinear()
    .domain(metricSpec.yDomain ?? [0, maxVal])
    .nice()
    .range([innerHeight, 0]);

  // Gridlines
  g.append("g")
    .attr("class", "gridlines")
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat("")
    )
    .call(gg => gg.select(".domain").remove());

  // Axes
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-35)")
    .attr("dx", "-0.6em")
    .attr("dy", "0.2em");

  // Y label
  svg.append("text")
    .attr("x", 14)
    .attr("y", margin.top + innerHeight / 2)
    .attr("transform", `rotate(-90, 14, ${margin.top + innerHeight / 2})`)
    .attr("fill", "rgba(229,231,235,0.85)")
    .attr("font-size", 12)
    .text(metricSpec.yLabel);

  // Bars
  g.selectAll("rect")
    .data(data, d => d.task)
    .join("rect")
    .attr("class", `bar ${metricSpec.barClass}`)
    .attr("x", d => x(d.task))
    .attr("width", x.bandwidth())
    .attr("y", y(0))
    .attr("height", 0)
    .on("pointerenter", showTooltip)
    .on("pointermove", moveTooltip)
    .on("pointerleave", hideTooltip)
    .transition()
    .duration(600)
    .attr("y", d => y(valueAccessor(d)))
    .attr("height", d => innerHeight - y(valueAccessor(d)));

  // Value labels
  g.selectAll(".value-label")
    .data(data, d => d.task)
    .join("text")
    .attr("class", "value-label")
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "rgba(229,231,235,0.9)")
    .attr("x", d => x(d.task) + x.bandwidth() / 2)
    .attr("y", d => y(valueAccessor(d)) - 6)
    .text(d => metricSpec.valueFormat(valueAccessor(d)));
}

function render(data) {
  const metric = elMetric.property("value");
  const sortMode = elSort.property("value");

  const metricSpec = getMetricSpec(metric);

  // Title/subtitle
  elTitle.text(metricSpec.title);
  elSubtitle.text(metricSpec.subtitle);

  // Sort and render
  const sorted = sortData(data, sortMode);
  renderBarChart({ data: sorted, metricSpec });
}

async function main() {
  elStatus.text("Loading data…");

  const raw = await d3.csv(FILE, (d) => ({
    task: d.Task,
    completion: +d.Completion,
    avgTime: +d.AverageCompletionTime,
    avgErrors: +d.AverageErrorsPerParticipant
  }));

  const data = raw.filter(d =>
    d.task &&
    Number.isFinite(d.completion) &&
    Number.isFinite(d.avgTime) &&
    Number.isFinite(d.avgErrors)
  );

  elStatus.text(`Loaded ${data.length} tasks from ${FILE}.`);

  render(data);

  elMetric.on("change", () => render(data));
  elSort.on("change", () => render(data));
}

main().catch((err) => {
  console.error("Error:", err);
  elStatus.text("Failed to load data. Check console + Network tab.");
});
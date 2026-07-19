const DATA_PATH = "data.csv";
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const tooltip = d3.select("#tooltip");
let fullData = [];
let worldFeatures = [];
let currentContinent = "All";
let sortState = { key: "team", ascending: true };

const continentColors = d3.scaleOrdinal()
  .domain(["Europe", "South America", "North America", "Africa", "Asia", "Oceania"])
  .range(["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#7c3aed", "#14b8a6"]);

Promise.all([
  d3.csv(DATA_PATH, d => ({
    version: +d.version,
    team: d.team,
    continent: d.continent,
    is_host: +d.is_host,
    goals_scored_last_4y: +d.goals_scored_last_4y,
    goals_received_last_4y: +d.goals_received_last_4y,
    wins_last_4y: +d.wins_last_4y,
    losses_last_4y: +d.losses_last_4y,
    draws_last_4y: +d.draws_last_4y,
    world_cup_titles_before: +d.world_cup_titles_before,
    squad_total_market_value_eur: +d.squad_total_market_value_eur,
    fifa_rank_pre_tournament: +d.fifa_rank_pre_tournament,
    fifa_points_pre_tournament: +d.fifa_points_pre_tournament,
    squad_avg_age: +d.squad_avg_age,
    world_cup_participations_before: +d.world_cup_participations_before,
    groups_passed_before: +d.groups_passed_before,
    round16_before: +d.round16_before,
    quarterfinals_before: +d.quarterfinals_before,
    semifinals_before: +d.semifinals_before,
    finals_before: +d.finals_before
  })),
  d3.json(WORLD_ATLAS_URL)
]).then(([data, world]) => {
  fullData = data;
  worldFeatures = topojson.feature(world, world.objects.countries).features;

  populateFilter(data);
  bindControls();
  bindTableSorting();
  updateDashboard(getFilteredData());
}).catch(error => {
  console.error("Error loading data:", error);
});

function populateFilter(data) {
  const continents = [...new Set(data.map(d => d.continent))].sort();
  const select = d3.select("#continentFilter");

  continents.forEach(continent => {
    select.append("option")
      .attr("value", continent)
      .text(continent);
  });
}

function bindControls() {
  d3.select("#continentFilter").on("change", function () {
    currentContinent = this.value;
    updateDashboard(getFilteredData());
  });
}

function bindTableSorting() {
  d3.selectAll("#dataTable th").on("click", function () {
    const key = this.dataset.key;

    if (sortState.key === key) {
      sortState.ascending = !sortState.ascending;
    } else {
      sortState.key = key;
      sortState.ascending = true;
    }

    drawSortableTable(getFilteredData());
  });
}

function getFilteredData() {
  return currentContinent === "All"
    ? fullData
    : fullData.filter(d => d.continent === currentContinent);
}

function updateDashboard(data) {
  updateKPIs(data);
  drawWorldMap(data);
  drawBarChart(data);
  drawComparisonChart(data);
  drawBubbleChart(data);
  drawTopTables(data);
  drawSortableTable(data);
}

function updateKPIs(data) {
  d3.select("#kpiTeams").text(data.length);

  const maxTitles = d3.max(data, d => d.world_cup_titles_before);
  const titleTeam = data.find(d => d.world_cup_titles_before === maxTitles);

  const maxValue = d3.max(data, d => d.squad_total_market_value_eur);
  const valueTeam = data.find(d => d.squad_total_market_value_eur === maxValue);

  d3.select("#kpiTitles").text(titleTeam ? `${titleTeam.team} (${titleTeam.world_cup_titles_before})` : "-");
  d3.select("#kpiMarketValue").text(valueTeam ? `${valueTeam.team}` : "-");
}

function drawWorldMap(data) {
  d3.select("#worldMap").selectAll("*").remove();

  const width = 700;
  const height = 390;

  const svg = d3.select("#worldMap")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height], { type: "FeatureCollection", features: worldFeatures });

  const path = d3.geoPath().projection(projection);

  const teamMap = new Map(data.map(d => [normalizeCountryName(d.team), d]));

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#eef6ff");

  svg.selectAll("path")
    .data(worldFeatures)
    .enter()
    .append("path")
    .attr("class", d => {
      const name = getCountryName(d);
      return teamMap.has(normalizeCountryName(name)) ? "country in-data" : "country";
    })
    .attr("d", path)
    .attr("fill", d => {
      const name = getCountryName(d);
      const match = teamMap.get(normalizeCountryName(name));
      return match ? continentColors(match.continent) : "#dbe4ee";
    })
    .on("mousemove", (event, d) => {
      const name = getCountryName(d);
      const match = teamMap.get(normalizeCountryName(name));

      if (match) {
        showTooltip(event, `
          <strong>${match.team}</strong><br>
          Continent: ${match.continent}<br>
          Titles: ${match.world_cup_titles_before}<br>
          Participations: ${match.world_cup_participations_before}<br>
          Market value: ${formatEuro(match.squad_total_market_value_eur)}
        `);
      } else {
        showTooltip(event, `<strong>${name}</strong><br>Not in dataset`);
      }
    })
    .on("mouseleave", hideTooltip);

  const legend = d3.select("#worldMap")
    .append("div")
    .attr("class", "legend-wrap");

  continentColors.domain().forEach(continent => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("span")
      .attr("class", "legend-color")
      .style("background-color", continentColors(continent));
    item.append("span").text(continent);
  });
}

function drawBarChart(data) {
  d3.select("#barChart").selectAll("*").remove();

  const topData = [...data]
    .sort((a, b) => d3.descending(a.goals_scored_last_4y, b.goals_scored_last_4y))
    .slice(0, 10);

  const margin = { top: 20, right: 20, bottom: 90, left: 65 };
  const width = 640 - margin.left - margin.right;
  const height = 390 - margin.top - margin.bottom;

  const svg = d3.select("#barChart")
    .append("svg")
    .attr("viewBox", `0 0 640 390`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(topData.map(d => d.team))
    .range([0, width])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.goals_scored_last_4y)]).nice()
    .range([height, 0]);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.selectAll("rect")
    .data(topData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.team))
    .attr("y", d => y(d.goals_scored_last_4y))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.goals_scored_last_4y))
    .attr("rx", 6)
    .attr("fill", d => continentColors(d.continent))
    .on("mousemove", (event, d) => {
      showTooltip(event, `
        <strong>${d.team}</strong><br>
        Goals scored: ${d.goals_scored_last_4y}<br>
        Goals received: ${d.goals_received_last_4y}<br>
        Continent: ${d.continent}
      `);
    })
    .on("mouseleave", hideTooltip);

  svg.selectAll(".bar-label")
    .data(topData)
    .enter()
    .append("text")
    .attr("x", d => x(d.team) + x.bandwidth() / 2)
    .attr("y", d => y(d.goals_scored_last_4y) - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .attr("fill", "#334155")
    .text(d => d.goals_scored_last_4y);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));
}

function drawComparisonChart(data) {
  d3.select("#comparisonChart").selectAll("*").remove();

  const topData = [...data]
    .sort((a, b) => d3.descending(
      a.goals_scored_last_4y - a.goals_received_last_4y,
      b.goals_scored_last_4y - b.goals_received_last_4y
    ))
    .slice(0, 12);

  const margin = { top: 20, right: 20, bottom: 100, left: 65 };
  const width = 640 - margin.left - margin.right;
  const height = 390 - margin.top - margin.bottom;

  const svg = d3.select("#comparisonChart")
    .append("svg")
    .attr("viewBox", `0 0 640 390`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(topData.map(d => d.team))
    .range([0, width])
    .padding(0.2);

  const x1 = d3.scaleBand()
    .domain(["Scored", "Received"])
    .range([0, x0.bandwidth()])
    .padding(0.12);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topData, d => Math.max(d.goals_scored_last_4y, d.goals_received_last_4y))]).nice()
    .range([height, 0]);

  const grouped = topData.map(d => ({
    team: d.team,
    values: [
      { key: "Scored", value: d.goals_scored_last_4y, raw: d },
      { key: "Received", value: d.goals_received_last_4y, raw: d }
    ]
  }));

  const color = d3.scaleOrdinal()
    .domain(["Scored", "Received"])
    .range(["#16a34a", "#ef4444"]);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  const groups = svg.selectAll(".group")
    .data(grouped)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${x0(d.team)},0)`);

  groups.selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => x1(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.value))
    .attr("rx", 4)
    .attr("fill", d => color(d.key))
    .on("mousemove", (event, d) => {
      showTooltip(event, `
        <strong>${d.raw.team}</strong><br>
        ${d.key}: ${d.value}<br>
        Goal difference: ${d.raw.goals_scored_last_4y - d.raw.goals_received_last_4y}
      `);
    })
    .on("mouseleave", hideTooltip);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

  const legend = d3.select("#comparisonChart")
    .append("div")
    .attr("class", "legend-wrap");

  ["Scored", "Received"].forEach(key => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("span")
      .attr("class", "legend-color")
      .style("background-color", color(key));
    item.append("span").text(`Goals ${key}`);
  });
}

function drawBubbleChart(data) {
  d3.select("#bubbleChart").selectAll("*").remove();

  const filtered = data
    .filter(d => d.world_cup_titles_before > 0)
    .sort((a, b) => d3.descending(a.world_cup_titles_before, b.world_cup_titles_before));

  const margin = { top: 20, right: 40, bottom: 75, left: 80 };
  const width = 640 - margin.left - margin.right;
  const height = 390 - margin.top - margin.bottom;

  const svg = d3.select("#bubbleChart")
    .append("svg")
    .attr("viewBox", `0 0 640 390`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.squad_total_market_value_eur) * 1.05])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.world_cup_participations_before) + 1])
    .nice()
    .range([height, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(filtered, d => d.world_cup_titles_before))
    .range([10, 30]);

  chart.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

  chart.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  const nodes = filtered.map(d => ({
    ...d,
    x: x(d.squad_total_market_value_eur),
    y: y(d.world_cup_participations_before)
  }));

  const simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX(d => x(d.squad_total_market_value_eur)).strength(1))
    .force("y", d3.forceY(d => y(d.world_cup_participations_before)).strength(1))
    .force("collide", d3.forceCollide(d => r(d.world_cup_titles_before) + 2))
    .stop();

  for (let i = 0; i < 200; i++) simulation.tick();

  const bubbleGroup = chart.append("g");

  const bubbles = bubbleGroup.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => r(d.world_cup_titles_before))
    .attr("fill", d => continentColors(d.continent))
    .attr("opacity", 0.82)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      d3.select(event.currentTarget)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 2.5)
        .attr("opacity", 1);

      showTooltip(event, `
        <strong>${d.team}</strong><br>
        Market value: ${formatEuro(d.squad_total_market_value_eur)}<br>
        Participations: ${d.world_cup_participations_before}<br>
        Titles: ${d.world_cup_titles_before}<br>
        Continent: ${d.continent}
      `);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.82);

      hideTooltip();
    });

  chart.selectAll(".bubble-value")
    .data(nodes)
    .enter()
    .append("text")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 4)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "700")
    .style("fill", "#ffffff")
    .style("pointer-events", "none")
    .text(d => d.world_cup_titles_before);

  const labels = chart.append("g")
    .selectAll(".bubble-label")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", "bubble-label")
    .attr("x", d => d.x)
    .attr("y", d => d.y - r(d.world_cup_titles_before) - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "600")
    .style("fill", "#334155")
    .text(d => d.team);

  labels.each(function(d, i) {
    const current = d3.select(this);
    const offset = i % 2 === 0 ? -4 : 10;
    current.attr("dy", offset);
  });

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x)
        .ticks(6)
        .tickFormat(d => {
          if (d >= 1000000000) return `€${(d / 1000000000).toFixed(1)}B`;
          if (d >= 1000000) return `€${Math.round(d / 1000000)}M`;
          return d3.format(",")(d);
        })
    );

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format("d")));

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .style("font-size", "13px")
    .text("Squad Total Market Value");

  chart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -58)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .style("font-size", "13px")
    .text("World Cup Participations Before");

  const legend = d3.select("#bubbleChart")
    .append("div")
    .attr("class", "legend-wrap");

  [1, 3, 6].forEach(titleCount => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("span")
      .attr("class", "legend-color")
      .style("width", `${Math.max(12, r(titleCount) * 0.9)}px`)
      .style("height", `${Math.max(12, r(titleCount) * 0.9)}px`)
      .style("border-radius", "50%")
      .style("display", "inline-block")
      .style("background-color", "#94a3b8");
    item.append("span").text(`${titleCount} title${titleCount > 1 ? "s" : ""}`);
  });
}

function drawTopTables(data) {
  drawMiniTable(
    "#topTitlesTable",
    [...data]
      .sort((a, b) => d3.descending(a.world_cup_titles_before, b.world_cup_titles_before))
      .slice(0, 5),
    [
      { label: "Team", key: "team" },
      { label: "Titles", key: "world_cup_titles_before" }
    ]
  );

  drawMiniTable(
    "#topParticipationsTable",
    [...data]
      .sort((a, b) => d3.descending(a.world_cup_participations_before, b.world_cup_participations_before))
      .slice(0, 5),
    [
      { label: "Team", key: "team" },
      { label: "Participations", key: "world_cup_participations_before" }
    ]
  );

  drawMiniTable(
    "#topMarketValueTable",
    [...data]
      .sort((a, b) => d3.descending(a.squad_total_market_value_eur, b.squad_total_market_value_eur))
      .slice(0, 5),
    [
      { label: "Team", key: "team" },
      { label: "Market Value", key: "squad_total_market_value_eur", format: formatEuro }
    ]
  );
}

function drawMiniTable(containerSelector, rows, columns) {
  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  const table = container.append("table");
  const thead = table.append("thead");
  const tbody = table.append("tbody");

  thead.append("tr")
    .selectAll("th")
    .data(columns)
    .enter()
    .append("th")
    .text(d => d.label);

  const tr = tbody.selectAll("tr")
    .data(rows)
    .enter()
    .append("tr");

  columns.forEach(col => {
    tr.append("td")
      .text(d => col.format ? col.format(d[col.key]) : d[col.key]);
  });
}

function drawSortableTable(data) {
  const tbody = d3.select("#dataTable tbody");
  tbody.selectAll("*").remove();

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortState.key];
    const bVal = b[sortState.key];

    let result;
    if (typeof aVal === "string") {
      result = d3.ascending(aVal, bVal);
    } else {
      result = d3.ascending(aVal, bVal);
    }

    return sortState.ascending ? result : -result;
  });

  sorted.forEach(d => {
    const row = tbody.append("tr");

    row.append("td").text(d.team);
    row.append("td").text(d.continent);
    row.append("td").text(d.is_host ? "Yes" : "No");
    row.append("td").text(d.goals_scored_last_4y);
    row.append("td").text(d.goals_received_last_4y);
    row.append("td").text(d.wins_last_4y);
    row.append("td").text(d.draws_last_4y);
    row.append("td").text(d.losses_last_4y);
    row.append("td").text(d.world_cup_titles_before);
    row.append("td").text(d.world_cup_participations_before);
    row.append("td").text(d.fifa_rank_pre_tournament);
    row.append("td").text(formatEuro(d.squad_total_market_value_eur));
  });
}

function formatEuro(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function getCountryName(feature) {
  return feature.properties.name || feature.properties.ADMIN || feature.properties.admin || `Country ${feature.id}`;
}

function normalizeCountryName(name) {
  const map = {
    "United States of America": "United States",
    "USA": "United States",
    "Czechia": "Czech Republic",
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    "Bosnia and Herzegovina": "Bosnia and Herzegovina",
    "Côte d’Ivoire": "Ivory Coast",
    "Côte d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Democratic Republic of the Congo": "DR Congo",
    "Dem. Rep. Congo": "DR Congo",
    "Republic of Korea": "South Korea",
    "Korea, Republic of": "South Korea",
    "South Korea": "South Korea",
    "Iran": "Iran",
    "Curacao": "Curacao"
  };

  const cleaned = name.trim();
  return map[cleaned] || cleaned;
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.pageX + 14}px`)
    .style("top", `${event.pageY - 24}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}
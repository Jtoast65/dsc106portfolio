import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let data = await d3.csv('loc.csv', (row) => ({
  ...row,
  line: +row.line,
  depth: +row.depth,
  length: +row.length,
  datetime: new Date(row.datetime),
}));

let commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
  let first = lines[0];

  return {
    id: commit,
    url: `https://github.com/Jtoast65/dsc106portfolio/commit/${commit}`,
    author: first.author,
    date: first.datetime,
    time: first.datetime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    timezone: first.timezone,
    datetime: first.datetime,
    hourFrac:
      first.datetime.getHours() + first.datetime.getMinutes() / 60,
    totalLines: lines.length,
    lines,
  };
});

let selectedCommits = [];

let stats = [
  { label: 'Total LOC', value: data.length },
  { label: 'Total commits', value: commits.length },
  { label: 'Number of files', value: d3.group(data, (d) => d.file).size },
  { label: 'Longest file', value: d3.max(data, (d) => d.line) },
  {
    label: 'Average commit size',
    value: d3.mean(commits, (d) => d.totalLines).toFixed(1),
  },
  { label: 'Most active time of day', value: mostActivePeriod(commits) },
];

let dl = d3.select('.stats');

stats.forEach((stat) => {
  let div = dl.append('div');
  div.append('dt').text(stat.label);
  div.append('dd').text(stat.value);
});

function mostActivePeriod(commits) {
  let counts = d3.rollup(
    commits,
    (v) => v.length,
    (d) => new Date(d.datetime).getHours()
  );

  let maxHour = d3.greatest(counts, (d) => d[1])?.[0];

  if (maxHour === undefined) return 'N/A';
  if (maxHour < 12) return 'Morning';
  if (maxHour < 17) return 'Afternoon';
  return 'Evening';
}

const width = 1000;
const height = 400;
const margin = { top: 10, right: 10, bottom: 30, left: 40 };

const usableArea = {
  left: margin.left,
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

const svg = d3
  .select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const xScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([usableArea.left, usableArea.right])
  .nice();

const yScale = d3
  .scaleLinear()
  .domain([0, 24])
  .range([usableArea.bottom, usableArea.top]);

const rScale = d3
  .scaleSqrt()
  .domain([0, d3.max(commits, (d) => d.totalLines)])
  .range([2, 30]);

const xAxis = d3.axisBottom(xScale);
const yAxis = d3
  .axisLeft(yScale)
  .tickFormat((d) => `${String(d).padStart(2, '0')}:00`);

svg
  .append('g')
  .attr('transform', `translate(0, ${usableArea.bottom})`)
  .call(xAxis);

svg
  .append('g')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .call(yAxis);

svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .call(
    d3
      .axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );

const tooltip = document.getElementById('commit-tooltip');

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.time;
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  let [[x0, y0], [x1, y1]] = selection;
  let x = xScale(commit.datetime);
  let y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function updateSelection() {
  const selectionCount = document.getElementById('selection-count');

  if (selectedCommits.length === 0) {
    selectionCount.textContent = 'No commits selected';
  } else {
    selectionCount.textContent = `${selectedCommits.length} commits selected`;
  }

  updateLanguageBreakdown();
}

function updateLanguageBreakdown() {
  const container = d3.select('#language-breakdown');
  container.selectAll('*').remove();

  let lines = selectedCommits.flatMap((d) => d.lines);

  if (lines.length === 0) {
    container
      .append('div')
      .attr('class', 'empty-state')
      .text('Brush commits to see language breakdown.');
    return;
  }

  let breakdown = d3.rollups(
    lines,
    (v) => v.length,
    (d) => d.type
  ).sort((a, b) => b[1] - a[1]);

  breakdown.forEach(([language, count]) => {
    let div = container.append('div');
    div.append('dt').text(language);
    div.append('dd').text(count);
  });
}

// Brush layer behind circles
const interactionLayer = svg.append('g').attr('class', 'interaction-layer');

interactionLayer
  .append('rect')
  .attr('x', usableArea.left)
  .attr('y', usableArea.top)
  .attr('width', usableArea.width)
  .attr('height', usableArea.height)
  .attr('fill', 'transparent');

const brush = d3
  .brush()
  .extent([
    [usableArea.left, usableArea.top],
    [usableArea.right, usableArea.bottom],
  ])
  .on('start brush end', brushed);

interactionLayer.call(brush);

// Circles above brush layer so hover still works
const dots = svg.append('g');

const circles = dots
  .selectAll('circle')
  .data(commits)
  .join('circle')
  .attr('cx', (d) => xScale(d.datetime))
  .attr('cy', (d) => yScale(d.hourFrac))
  .attr('r', (d) => rScale(d.totalLines))
  .attr('fill', 'steelblue')
  .attr('fill-opacity', 0.7)
  .sort((a, b) => b.totalLines - a.totalLines)
  .on('mouseenter', (event, commit) => {
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
  })
  .on('mousemove', (event) => {
    updateTooltipPosition(event);
  })
  .on('mouseleave', () => {
    updateTooltipVisibility(false);
  });

function brushed(event) {
  const selection = event.selection;

  selectedCommits = selection
    ? commits.filter((commit) => isCommitSelected(selection, commit))
    : [];

  circles.classed('selected', (d) => selectedCommits.includes(d));

  updateSelection();
}
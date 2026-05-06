import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const sortedProjects = projects.sort((a, b) => Number(b.year) - Number(a.year));

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

let query = '';
let selectedIndex = -1;
let currentPieData = [];

function getFilteredProjects() {
  let filteredProjects = sortedProjects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  if (selectedIndex !== -1 && currentPieData[selectedIndex]) {
    let selectedYear = currentPieData[selectedIndex].label;
    filteredProjects = filteredProjects.filter(
      (project) => project.year === selectedYear
    );
  }

  return filteredProjects;
}

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  currentPieData = data;

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(30);
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  arcData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', d3.schemeTableau10[i % 10])
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updatePage();
      });
  });

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color: ${d3.schemeTableau10[i % 10]}`)
      .attr('class', i === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        updatePage();
      });
  });

  if (selectedIndex >= data.length) {
    selectedIndex = -1;
  }
}

function updatePage() {
  const filteredProjects = getFilteredProjects();
  renderProjects(filteredProjects, projectsContainer, 'h2');
  projectsTitle.textContent = `${filteredProjects.length} Projects`;

  const pieProjects = sortedProjects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderPieChart(pieProjects);
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updatePage();
});

updatePage();

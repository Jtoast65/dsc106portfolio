import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const sortedProjects = projects.sort((a, b) => Number(b.year) - Number(a.year));
renderProjects(sortedProjects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `${sortedProjects.length} Projects`;
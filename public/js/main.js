const grid = document.getElementById('project-grid');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const template = document.getElementById('card-template');

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();

    loading.hidden = true;

    if (projects.length === 0) {
      empty.hidden = false;
      return;
    }

    grid.hidden = false;
    projects.forEach(project => grid.appendChild(buildCard(project)));
  } catch (err) {
    loading.hidden = true;
    empty.textContent = 'Failed to load projects. Please refresh the page.';
    empty.hidden = false;
  }
}

function buildCard(project) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector('.card');

  const img = card.querySelector('.card-thumbnail img');
  const placeholder = card.querySelector('.card-thumbnail-placeholder');

  if (project.thumbnail) {
    img.src = project.thumbnail;
    img.alt = project.title;
    placeholder.remove();
  } else {
    img.remove();
  }

  card.querySelector('.card-title').textContent = project.title;
  card.querySelector('.card-description').textContent = project.description;

  const demoLink = card.querySelector('.demo-link');
  const blogLink = card.querySelector('.blog-link');

  if (project.demo_url) {
    demoLink.href = project.demo_url;
  } else {
    demoLink.remove();
  }

  if (project.blog_url) {
    blogLink.href = project.blog_url;
  } else {
    blogLink.remove();
  }

  return clone;
}

loadProjects();

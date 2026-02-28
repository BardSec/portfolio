// ── State ──────────────────────────────────────────────────────────────────
let token = localStorage.getItem('portfolio_token');
let projects = [];
let editingId = null;
let deletingId = null;
let selectedFile = null;
let existingThumbnail = null; // URL of thumbnail already saved (edit mode)

// ── DOM refs ───────────────────────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

const projectModal = document.getElementById('project-modal');
const projectForm = document.getElementById('project-form');
const modalTitle = document.getElementById('modal-title');
const formError = document.getElementById('form-error');
const saveBtn = document.getElementById('save-btn');

const passwordModal = document.getElementById('password-modal');
const passwordForm = document.getElementById('password-form');
const pwError = document.getElementById('pw-error');

const deleteModal = document.getElementById('delete-modal');
const deleteProjectName = document.getElementById('delete-project-name');

const adminGrid = document.getElementById('admin-project-grid');
const projectCount = document.getElementById('project-count');

// Form fields
const projTitle = document.getElementById('proj-title');
const projDesc = document.getElementById('proj-description');
const projDemo = document.getElementById('proj-demo');
const projBlog = document.getElementById('proj-blog');
const projThumbnail = document.getElementById('proj-thumbnail');
const dropZone = document.getElementById('drop-zone');
const dropZoneContent = document.getElementById('drop-zone-content');
const thumbnailPreview = document.getElementById('thumbnail-preview');
const previewImg = document.getElementById('preview-img');

// ── Auth ───────────────────────────────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
function hideError(el) { el.hidden = true; }

async function apiRequest(method, path, body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.original = btn.dataset.original || btn.textContent;
  btn.textContent = loading ? 'Loading…' : btn.dataset.original;
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  if (token) {
    try {
      await loadProjects();
      showAdmin();
    } catch {
      token = null;
      localStorage.removeItem('portfolio_token');
      showLogin();
    }
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
}
function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
}

// ── Login ──────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideError(loginError);
  const submitBtn = loginForm.querySelector('[type="submit"]');
  setLoading(submitBtn, true);
  try {
    const data = await (await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    })).json();
    if (data.error) { showError(loginError, data.error); return; }
    token = data.token;
    localStorage.setItem('portfolio_token', token);
    await loadProjects();
    showAdmin();
  } catch (err) {
    showError(loginError, err.message || 'Login failed');
  } finally {
    setLoading(submitBtn, false);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  token = null;
  localStorage.removeItem('portfolio_token');
  showLogin();
});

// ── Load Projects ──────────────────────────────────────────────────────────
async function loadProjects() {
  projects = await apiRequest('GET', '/api/projects');
  renderAdminGrid();
}

function renderAdminGrid() {
  adminGrid.innerHTML = '';
  projectCount.textContent = projects.length;
  projects.forEach(p => adminGrid.appendChild(buildAdminCard(p)));
}

function buildAdminCard(project) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = project.id;

  const thumbHtml = project.thumbnail
    ? `<img src="${project.thumbnail}" alt="${escHtml(project.title)}" loading="lazy" />`
    : `<div class="card-thumbnail-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;

  const demoHtml = project.demo_url
    ? `<a class="btn btn-primary" href="${escHtml(project.demo_url)}" target="_blank" rel="noopener">Live Demo</a>` : '';
  const blogHtml = project.blog_url
    ? `<a class="btn btn-secondary" href="${escHtml(project.blog_url)}" target="_blank" rel="noopener">Blog Post</a>` : '';

  card.innerHTML = `
    <div class="card-thumbnail">
      ${thumbHtml}
      <div class="card-admin-actions">
        <button class="card-action-btn edit-btn">Edit</button>
        <button class="card-action-btn delete delete-btn">Delete</button>
      </div>
    </div>
    <div class="card-body">
      <h2 class="card-title">${escHtml(project.title)}</h2>
      <p class="card-description">${escHtml(project.description)}</p>
      <div class="card-links">${demoHtml}${blogHtml}</div>
    </div>`;

  card.querySelector('.edit-btn').addEventListener('click', () => openEdit(project));
  card.querySelector('.delete-btn').addEventListener('click', () => openDelete(project));
  return card;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Add / Edit Modal ───────────────────────────────────────────────────────
document.getElementById('add-project-btn').addEventListener('click', openAdd);

function openAdd() {
  editingId = null;
  existingThumbnail = null;
  modalTitle.textContent = 'Add Project';
  projectForm.reset();
  clearThumbnailPreview();
  hideError(formError);
  projectModal.hidden = false;
}

function openEdit(project) {
  editingId = project.id;
  existingThumbnail = project.thumbnail;
  modalTitle.textContent = 'Edit Project';
  projTitle.value = project.title;
  projDesc.value = project.description;
  projDemo.value = project.demo_url || '';
  projBlog.value = project.blog_url || '';
  selectedFile = null;
  hideError(formError);

  if (project.thumbnail) {
    showThumbnailPreview(project.thumbnail);
  } else {
    clearThumbnailPreview();
  }
  projectModal.hidden = false;
}

function closeProjectModal() {
  projectModal.hidden = true;
  editingId = null;
  selectedFile = null;
  existingThumbnail = null;
}

document.getElementById('modal-close-btn').addEventListener('click', closeProjectModal);
document.getElementById('cancel-btn').addEventListener('click', closeProjectModal);
projectModal.addEventListener('click', e => { if (e.target === projectModal) closeProjectModal(); });

projectForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideError(formError);

  if (!projTitle.value.trim()) { showError(formError, 'Title is required.'); return; }
  if (!projDesc.value.trim()) { showError(formError, 'Description is required.'); return; }

  const fd = new FormData();
  fd.append('title', projTitle.value.trim());
  fd.append('description', projDesc.value.trim());
  fd.append('demo_url', projDemo.value.trim());
  fd.append('blog_url', projBlog.value.trim());
  if (selectedFile) fd.append('thumbnail', selectedFile);

  setLoading(saveBtn, true);
  try {
    if (editingId) {
      const updated = await apiRequest('PUT', `/api/projects/${editingId}`, fd);
      const idx = projects.findIndex(p => p.id === editingId);
      if (idx !== -1) projects[idx] = updated;
    } else {
      const created = await apiRequest('POST', '/api/projects', fd);
      projects.unshift(created);
    }
    renderAdminGrid();
    closeProjectModal();
  } catch (err) {
    showError(formError, err.message || 'Failed to save project.');
  } finally {
    setLoading(saveBtn, false);
  }
});

// ── Thumbnail Upload ───────────────────────────────────────────────────────
projThumbnail.addEventListener('change', e => handleFileSelect(e.target.files[0]));

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFileSelect(file);
});

function handleFileSelect(file) {
  if (!file) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  showThumbnailPreview(url);
}

function showThumbnailPreview(url) {
  previewImg.src = url;
  thumbnailPreview.hidden = false;
  dropZoneContent.hidden = true;
}

function clearThumbnailPreview() {
  selectedFile = null;
  previewImg.src = '';
  thumbnailPreview.hidden = true;
  dropZoneContent.hidden = false;
  projThumbnail.value = '';
}

document.getElementById('remove-thumbnail-btn').addEventListener('click', e => {
  e.stopPropagation();
  existingThumbnail = null;
  clearThumbnailPreview();
});

// ── Delete Modal ───────────────────────────────────────────────────────────
function openDelete(project) {
  deletingId = project.id;
  deleteProjectName.textContent = project.title;
  deleteModal.hidden = false;
}
function closeDeleteModal() { deleteModal.hidden = true; deletingId = null; }

document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
  if (!deletingId) return;
  const btn = document.getElementById('delete-confirm-btn');
  setLoading(btn, true);
  try {
    await apiRequest('DELETE', `/api/projects/${deletingId}`);
    projects = projects.filter(p => p.id !== deletingId);
    renderAdminGrid();
    closeDeleteModal();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  } finally {
    setLoading(btn, false);
  }
});

// ── Change Password Modal ──────────────────────────────────────────────────
document.getElementById('change-password-btn').addEventListener('click', () => {
  passwordForm.reset();
  hideError(pwError);
  passwordModal.hidden = false;
});

function closePasswordModal() { passwordModal.hidden = true; }

document.getElementById('pw-modal-close').addEventListener('click', closePasswordModal);
document.getElementById('pw-cancel-btn').addEventListener('click', closePasswordModal);
passwordModal.addEventListener('click', e => { if (e.target === passwordModal) closePasswordModal(); });

passwordForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideError(pwError);
  const currentPw = document.getElementById('current-password').value;
  const newPw = document.getElementById('new-password').value;
  const submitBtn = passwordForm.querySelector('[type="submit"]');
  setLoading(submitBtn, true);
  try {
    await apiRequest('PUT', '/api/auth/password', { currentPassword: currentPw, newPassword: newPw });
    closePasswordModal();
    alert('Password updated successfully.');
  } catch (err) {
    showError(pwError, err.message || 'Failed to update password.');
  } finally {
    setLoading(submitBtn, false);
  }
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!projectModal.hidden) closeProjectModal();
    else if (!deleteModal.hidden) closeDeleteModal();
    else if (!passwordModal.hidden) closePasswordModal();
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
init();

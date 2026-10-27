(() => {
  const tools = Array.isArray(window.TOOLS) ? window.TOOLS : [];
  const grid = document.getElementById('tools-grid');
  const filterRow = document.getElementById('filter-row');
  const searchInput = document.getElementById('search-input');
  const emptyState = document.getElementById('empty-state');
  const totalStat = document.getElementById('stat-total');
  const readyStat = document.getElementById('stat-ready');
  const buildingStat = document.getElementById('stat-building');
  const resetButton = document.getElementById('reset-filters');
  let activeCategory = 'Semua';

  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const categoryList = ['Semua', ...new Set(tools.map((tool) => tool.category).filter(Boolean))];
  totalStat.textContent = String(tools.length).padStart(2, '0');
  readyStat.textContent = String(tools.filter((tool) => tool.status === 'ready' && tool.url).length).padStart(2, '0');
  buildingStat.textContent = String(tools.filter((tool) => tool.status !== 'ready' || !tool.url).length).padStart(2, '0');

  filterRow.innerHTML = categoryList.map((category, index) => `
    <button class="filter-chip${index === 0 ? ' active' : ''}" type="button" data-category="${safe(category)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${safe(category)}</button>
  `).join('');

  function thumbnail(tool) {
    const art = ['youtube', 'trading', 'data', 'dev'].includes(tool.art) ? tool.art : 'default';
    return `
      <div class="tool-thumb thumb-${art}" aria-hidden="true">
        <div class="preview-window">
          <div class="preview-bar"><span></span><span></span><span></span></div>
          <div class="preview-content"><div class="preview-symbol">${safe(tool.symbol || '✳')}</div><div class="preview-lines"><i></i><i></i><i></i></div></div>
          <div class="preview-bottom"><span></span><span></span><span></span></div>
        </div>
        <span class="thumb-label">${safe(tool.category || 'TOOL')}</span>
      </div>`;
  }

  function card(tool) {
    const ready = tool.status === 'ready' && /^https?:\/\//i.test(tool.url || '');
    const statusClass = ready ? 'ready' : 'building';
    const label = ready ? (tool.statusLabel || 'Siap digunakan') : (tool.statusLabel || 'Segera hadir');
    const action = ready
      ? `<a class="launch-link" href="${safe(tool.url)}" target="_blank" rel="noopener noreferrer">Buka tools <span aria-hidden="true">↗</span></a>`
      : `<span class="launch-link disabled" aria-label="Tools belum tersedia">Segera <span aria-hidden="true">↗</span></span>`;
    return `
      <article class="tool-card">
        ${thumbnail(tool)}
        <div class="card-body">
          <div class="card-topline"><span class="category-label">${safe(tool.category || 'Tools')}</span><span class="status-pill ${statusClass}">${safe(label)}</span></div>
          <h3>${safe(tool.name || 'Untitled tool')}</h3>
          <p>${safe(tool.description || '')}</p>
          <div class="card-footer"><span class="tool-meta">${safe(tool.tag || 'Web tool')}</span>${action}</div>
        </div>
      </article>`;
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = tools.filter((tool) => {
      const matchesCategory = activeCategory === 'Semua' || tool.category === activeCategory;
      const searchable = [tool.name, tool.category, tool.description, tool.tag].join(' ').toLowerCase();
      return matchesCategory && searchable.includes(query);
    });
    grid.innerHTML = filtered.map(card).join('');
    emptyState.hidden = filtered.length > 0;
    grid.hidden = filtered.length === 0;
  }

  filterRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    filterRow.querySelectorAll('[data-category]').forEach((chip) => {
      const isActive = chip.dataset.category === activeCategory;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
    render();
  });
  searchInput.addEventListener('input', render);
  resetButton.addEventListener('click', () => {
    activeCategory = 'Semua';
    searchInput.value = '';
    filterRow.querySelectorAll('[data-category]').forEach((chip) => {
      const isActive = chip.dataset.category === 'Semua';
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
    render();
    searchInput.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      render();
      searchInput.blur();
    }
  });
  render();
})();

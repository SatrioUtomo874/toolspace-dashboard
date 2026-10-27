(() => {
  const grid = document.getElementById('tools-grid');
  const filterRow = document.getElementById('filter-row');
  const searchInput = document.getElementById('search-input');
  const emptyState = document.getElementById('empty-state');
  const totalStat = document.getElementById('stat-total');
  const readyStat = document.getElementById('stat-ready');
  const buildingStat = document.getElementById('stat-building');
  const resetButton = document.getElementById('reset-filters');
  const catalogState = document.getElementById('catalog-state');
  let tools = [];
  let activeCategory = 'Semua';

  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function thumbnail(tool) {
    const art = ['youtube', 'trading', 'data', 'dev'].includes(tool.art) ? tool.art : 'default';
    const image = tool.thumbnail
      ? `<img class="tool-thumb-image" src="${safe(tool.thumbnail)}" alt="" loading="lazy" onerror="this.remove()">`
      : '';
    return `
      <div class="tool-thumb thumb-${art}" aria-hidden="true">
        <div class="preview-window">
          <div class="preview-bar"><span></span><span></span><span></span></div>
          <div class="preview-content"><div class="preview-symbol">${safe(tool.symbol || '✳')}</div><div class="preview-lines"><i></i><i></i><i></i></div></div>
          <div class="preview-bottom"><span></span><span></span><span></span></div>
        </div>
        ${image}
        <span class="thumb-label">${safe(tool.category || 'TOOL')}</span>
      </div>`;
  }

  function card(tool) {
    const ready = tool.status === 'ready' && /^(https?:\/\/|\/)/i.test(tool.url || '');
    const statusClass = ready ? 'ready' : 'building';
    const label = ready ? (tool.statusLabel || 'Siap digunakan') : (tool.statusLabel || 'Dalam pengembangan');
    const external = /^https?:\/\//i.test(tool.url || '');
    const action = ready
      ? `<a class="launch-link" href="${safe(tool.url)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''}>Buka tools <span aria-hidden="true">↗</span></a>`
      : `<span class="launch-link disabled" aria-label="Tools belum tersedia">Segera hadir</span>`;
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

  function renderStats() {
    totalStat.textContent = String(tools.length).padStart(2, '0');
    readyStat.textContent = String(tools.filter((tool) => tool.status === 'ready' && tool.url).length).padStart(2, '0');
    buildingStat.textContent = String(tools.filter((tool) => tool.status !== 'ready' || !tool.url).length).padStart(2, '0');
  }

  function renderFilters() {
    const categories = [...new Set(tools.map((tool) => tool.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const categoryList = ['Semua', ...categories];
    if (!categoryList.includes(activeCategory)) activeCategory = 'Semua';
    filterRow.innerHTML = categoryList.map((category, index) => `
      <button class="filter-chip${category === activeCategory ? ' active' : ''}" type="button" data-category="${safe(category)}" aria-pressed="${category === activeCategory ? 'true' : 'false'}">${safe(category)}</button>
    `).join('');
    filterRow.hidden = tools.length === 0;
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = tools.filter((tool) => {
      const matchesCategory = activeCategory === 'Semua' || tool.category === activeCategory;
      const searchable = [tool.name, tool.category, tool.description, tool.tag].join(' ').toLowerCase();
      return matchesCategory && searchable.includes(query);
    });
    grid.innerHTML = filtered.map(card).join('');
    emptyState.hidden = filtered.length > 0 || tools.length === 0;
    grid.hidden = filtered.length === 0;
  }

  async function loadTools() {
    try {
      const response = await fetch('/tools.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      const manifest = await response.json();
      tools = Array.isArray(manifest.tools) ? manifest.tools : [];
      tools.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      renderStats();
      renderFilters();
      render();
      catalogState.hidden = tools.length > 0;
      catalogState.textContent = tools.length ? '' : 'Belum ada tools yang ditemukan. Coba tambahkan folder tool yang berisi index.html.';
      if (tools.length === 0) catalogState.hidden = false;
    } catch (error) {
      console.error('Gagal memuat tools.json:', error);
      catalogState.hidden = false;
      catalogState.innerHTML = 'Koleksi belum bisa dimuat. Pastikan manifest <code>tools.json</code> sudah dibuat saat build dan muat ulang halaman.';
      totalStat.textContent = readyStat.textContent = buildingStat.textContent = '—';
    }
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
    renderFilters();
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
  loadTools();
})();

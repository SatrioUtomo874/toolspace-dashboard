(() => {
  'use strict';

  const C = window.UploadFitCore;
  const byId = (id) => document.getElementById(id);
  const els = {
    input: byId('file-input'), dropzone: byId('dropzone'), uploadError: byId('upload-error'),
    fileCount: byId('file-count'), rulesSection: byId('rules-section'), fileList: byId('file-list'),
    preset: byId('preset-select'), applyPreset: byId('apply-preset'), clear: byId('clear-files'),
    processAll: byId('process-all'), processStatus: byId('process-status'), progressLabel: byId('progress-label'),
    progressValue: byId('progress-value'), progressBar: byId('progress-bar'), resultsSection: byId('results-section'),
    resultList: byId('result-list'), summaryReady: byId('summary-ready'), summaryWarn: byId('summary-warn'),
    summaryFail: byId('summary-fail'), summarySize: byId('summary-size'), downloadZip: byId('download-zip'), toast: byId('toast')
  };

  const state = { items: [], nextId: 1, busy: false, toastTimer: null, totalOutputBytes: 0 };
  const PDF_RASTER_MAX_PAGES = 20;
  const PDF_RASTER_MAX_PIXELS = 50_000_000;
  const PDF_RASTER_MAX_EDGE = 2400;
  let pdfjsPromise = null;
  const libraryPromises = new Map();

  function loadClassicLibrary(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (!libraryPromises.has(globalName)) {
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error(`${globalName} dimuat tetapi tidak tersedia.`));
        script.onerror = () => reject(new Error(`Library ${globalName} tidak dapat dimuat dari CDN. Periksa koneksi internet atau pemblokir script.`));
        document.head.appendChild(script);
      }).catch((error) => { libraryPromises.delete(globalName); throw error; });
      libraryPromises.set(globalName, promise);
    }
    return libraryPromises.get(globalName);
  }

  function loadPdfLib() { return loadClassicLibrary('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'PDFLib'); }
  function loadJSZip() { return loadClassicLibrary('https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js', 'JSZip'); }

  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (!pdfjsPromise) {
      pdfjsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.min.mjs')
        .then((library) => {
          library.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs';
          window.pdfjsLib = library;
          return library;
        })
        .catch((error) => { pdfjsPromise = null; throw new Error(`PDF.js tidak dapat dimuat: ${friendlyError(error)}`); });
    }
    return pdfjsPromise;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle('error', isError);
    els.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3500);
  }

  function showUploadError(message) {
    els.uploadError.textContent = message;
    els.uploadError.classList.remove('hidden');
  }

  function clearUploadError() {
    els.uploadError.textContent = '';
    els.uploadError.classList.add('hidden');
  }

  function formatShortDate() {
    return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  }

  function sourceKind(item) {
    return item.mime === 'application/pdf' ? 'pdf' : 'image';
  }

  function sourceTypeLabel(item) {
    if (item.mime === 'application/pdf') return 'PDF';
    if (item.mime === 'image/jpeg') return 'JPG';
    if (item.mime === 'image/png') return 'PNG';
    if (item.mime === 'image/webp') return 'WEBP';
    return 'FILE';
  }

  function targetFormatOptions(item) {
    if (sourceKind(item) === 'pdf') {
      return [
        ['original', 'PDF asli · tanpa perubahan'],
        ['pdf-optimize', 'Optimasi ringan PDF · coba pertahankan teks'],
        ['pdf-raster', 'Kompres PDF raster · teks tidak lagi dapat dipilih']
      ];
    }
    return [
      ['original', 'Format asli'],
      ['image/jpeg', 'JPG'],
      ['image/png', 'PNG'],
      ['image/webp', 'WEBP'],
      ['application/pdf', 'PDF · satu halaman']
    ];
  }

  function displayStatus(item) {
    if (item.fileError) return { label: 'File bermasalah', cls: 'fail', reason: item.fileError };
    if (item.processError) return { label: 'Gagal', cls: 'fail', reason: item.processError };
    if (!item.outputBlob) return { label: 'Belum diproses', cls: 'warn', reason: 'Atur aturan lalu siapkan file untuk melihat hasil pemeriksaan.' };
    const maxKB = item.rule.maxKB ? Number(item.rule.maxKB) : null;
    const expectedMime = C.getOutputMime(item.rule, item.mime);
    const result = C.readiness({ outputSize: item.outputBlob.size, maxKB, outputMime: item.outputMime, expectedMime });
    if (item.note && result.status === 'ready' && item.rule.outputFormat === 'pdf-optimize') {
      return { label: 'Siap · lihat catatan', cls: 'ready', reason: item.note };
    }
    return { label: result.label, cls: result.status === 'ready' ? 'ready' : result.status === 'fail' ? 'fail' : 'warn', reason: item.note ? `${result.reason} ${item.note}` : result.reason };
  }

  function resetItemOutput(item) {
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    item.outputUrl = null;
    item.outputBlob = null;
    item.outputMime = null;
    item.outputName = null;
    item.processError = '';
    item.note = '';
    item.processedAt = null;
  }

  function renderFileList() {
    els.rulesSection.classList.toggle('hidden', state.items.length === 0);
    els.fileCount.textContent = `${state.items.length} file${state.items.length === 1 ? '' : ''}`;
    els.fileList.innerHTML = '';
    if (state.items.length === 0) return;

    for (const item of state.items) {
      const status = displayStatus(item);
      const metaBits = [C.formatBytes(item.file.size)];
      if (item.meta?.width && item.meta?.height) metaBits.push(`${item.meta.width} × ${item.meta.height} px`);
      if (item.meta?.pages) metaBits.push(`${item.meta.pages} halaman`);
      if (item.meta?.metaNote) metaBits.push(item.meta.metaNote);
      const detail = item.outputBlob ? `Hasil ${C.formatBytes(item.outputBlob.size)}${item.outputMime !== item.mime ? ` · ${sourceTypeLabel({ mime: item.outputMime })} dibuat` : ''}` : '';
      const options = targetFormatOptions(item).map(([value, label]) => `<option value="${value}" ${item.rule.outputFormat === value ? 'selected' : ''}>${label}</option>`).join('');
      const isPdfRaster = item.rule.outputFormat === 'pdf-raster';
      const isImage = sourceKind(item) === 'image';
      const qualityMime = item.rule.outputFormat === 'original' ? item.mime : item.rule.outputFormat;
      const showImageQuality = isImage && (['image/jpeg', 'image/webp'].includes(qualityMime) || item.rule.outputFormat === 'application/pdf');
      const card = document.createElement('article');
      card.className = 'file-card';
      card.dataset.id = String(item.id);
      card.innerHTML = `
        <div class="file-summary">
          <div class="file-type">${sourceTypeLabel(item)}</div>
          <div class="file-main">
            <div class="file-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</div>
            <div class="file-meta">${metaBits.map(escapeHtml).join(' · ')}${detail ? ` <span>· ${escapeHtml(detail)}</span>` : ''}</div>
            <div class="file-badges"><span class="status-chip ${status.cls}">${escapeHtml(status.label)}</span>${item.outputBlob ? `<span class="status-chip">${escapeHtml(C.formatBytes(item.outputBlob.size))} hasil</span>` : ''}</div>
          </div>
          <div class="file-actions">
            ${item.outputBlob ? `<button type="button" class="icon-button" data-action="download" aria-label="Unduh ${escapeHtml(item.file.name)}" title="Unduh hasil"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"/></svg></button>` : ''}
            <button type="button" class="button button-secondary" data-action="toggle">${item.expanded ? 'Tutup aturan' : 'Atur file'}</button>
            <button type="button" class="icon-button" data-action="remove" aria-label="Hapus ${escapeHtml(item.file.name)}" title="Hapus file"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
          </div>
        </div>
        ${item.expanded ? `
          <div class="item-settings">
            ${item.fileError ? `<div class="inline-alert" role="alert">${escapeHtml(item.fileError)}</div>` : ''}
            <div class="settings-grid">
              <div class="item-field"><label for="outname-${item.id}">Nama file hasil (tanpa ekstensi)</label><input id="outname-${item.id}" data-field="outputName" value="${escapeHtml(item.outputNameBase)}" maxlength="140" autocomplete="off"></div>
              <div class="item-field"><label for="format-${item.id}">Format hasil</label><select id="format-${item.id}" data-field="outputFormat">${options}</select></div>
              <div class="item-field"><label for="maxkb-${item.id}">Batas ukuran hasil (KB)</label><div class="unit"><input id="maxkb-${item.id}" data-field="maxKB" type="number" min="1" max="1000000" step="1" placeholder="Tanpa batas" value="${item.rule.maxKB ?? ''}"><span>KB</span></div></div>
              ${isImage ? `
                <div class="item-field"><label for="maxw-${item.id}">Lebar maksimum (px)</label><input id="maxw-${item.id}" data-field="maxWidth" type="number" min="1" max="20000" placeholder="Asli" value="${item.rule.maxWidth ?? ''}"></div>
                <div class="item-field"><label for="maxh-${item.id}">Tinggi maksimum (px)</label><input id="maxh-${item.id}" data-field="maxHeight" type="number" min="1" max="20000" placeholder="Asli" value="${item.rule.maxHeight ?? ''}"></div>
                ${showImageQuality ? `<div class="item-field"><label for="quality-${item.id}">Kualitas gambar</label><div class="range-wrap"><input id="quality-${item.id}" data-field="quality" type="range" min="40" max="95" value="${item.rule.quality}"><output id="quality-output-${item.id}">${item.rule.quality}%</output></div></div>` : ''}
              ` : ''}
              ${isPdfRaster ? `
                <div class="item-field"><label for="dpi-${item.id}">Resolusi raster PDF</label><select id="dpi-${item.id}" data-field="pdfDpi"><option value="96" ${item.rule.pdfDpi === 96 ? 'selected' : ''}>96 DPI · lebih kecil</option><option value="120" ${item.rule.pdfDpi === 120 ? 'selected' : ''}>120 DPI · seimbang</option><option value="150" ${item.rule.pdfDpi === 150 ? 'selected' : ''}>150 DPI · lebih tajam</option></select></div>
                <div class="item-field"><label for="pdfquality-${item.id}">Kualitas gambar dalam PDF</label><div class="range-wrap"><input id="pdfquality-${item.id}" data-field="quality" type="range" min="40" max="95" value="${item.rule.quality}"><output id="pdfquality-output-${item.id}">${item.rule.quality}%</output></div></div>
                <div class="item-field checkbox-field"><label><input data-field="grayscale" type="checkbox" ${item.rule.grayscale ? 'checked' : ''}> Ubah halaman menjadi grayscale</label></div>
              ` : ''}
            </div>
            ${isPdfRaster ? `<div class="item-notice warning"><b>Perhatian:</b> mode ini merender setiap halaman menjadi gambar. Teks tidak lagi bisa dipilih/dicari; tautan, formulir, metadata dan aksesibilitas PDF mungkin hilang. Maksimal ${PDF_RASTER_MAX_PAGES} halaman per file. Centang persetujuan di bawah sebelum memproses.</div><label class="confirm-raster"><input data-field="confirmRaster" type="checkbox" ${item.rule.confirmRaster ? 'checked' : ''}> Saya mengerti PDF akan dirasterisasi dan memilih mode ini secara sadar.</label>` : ''}
            ${item.rule.outputFormat === 'pdf-optimize' ? `<div class="item-notice">Optimasi ringan hanya mencoba menyimpan ulang struktur PDF. Ukuran belum tentu mengecil; jika hasil membesar, file asli akan dipertahankan. Untuk PDF scan yang besar, rasterisasi adalah opsi terpisah dengan kehilangan teks yang dapat dipilih.</div>` : ''}
            ${isImage && item.rule.outputFormat === 'application/pdf' ? `<div class="item-notice">Gambar akan menjadi PDF satu halaman. Area transparan akan diratakan ke latar putih dan gambar disisipkan sebagai JPG sesuai kualitas yang dipilih. Untuk beberapa gambar menjadi satu PDF multi-halaman, proses itu belum tersedia pada versi ini.</div>` : ''}
            ${item.meta?.metaNote ? `<div class="item-notice warning">${escapeHtml(item.meta.metaNote)}</div>` : ''}
            <div class="item-bottom"><small>${escapeHtml(status.reason)}</small><button type="button" class="button button-primary" data-action="process-one" ${state.busy ? 'disabled' : ''}>Siapkan file ini</button></div>
          </div>
        ` : ''}
      `;
      if (state.busy) card.querySelectorAll('input, select, [data-action=\"process-one\"]').forEach((control) => { control.disabled = true; });
      els.fileList.appendChild(card);
    }
  }

  function renderResults() {
    const processed = state.items.filter((item) => item.outputBlob || item.processError || item.fileError);
    const ready = state.items.filter((item) => displayStatus(item).cls === 'ready').length;
    const failed = state.items.filter((item) => displayStatus(item).cls === 'fail').length;
    const warning = processed.length - ready - failed;
    const bytes = state.items.reduce((sum, item) => sum + (item.outputBlob?.size || 0), 0);
    els.summaryReady.textContent = String(ready);
    els.summaryWarn.textContent = String(Math.max(0, warning));
    els.summaryFail.textContent = String(failed);
    els.summarySize.textContent = bytes > 0 ? C.formatBytes(bytes) : '—';
    els.resultList.innerHTML = '';
    for (const item of state.items) {
      if (!item.outputBlob && !item.processError && !item.fileError) continue;
      const status = displayStatus(item);
      const row = document.createElement('div');
      row.className = 'result-item';
      row.innerHTML = `
        <div class="file-type">${sourceTypeLabel(item)}</div>
        <div class="result-detail"><b>${escapeHtml(item.outputName || item.file.name)}</b><small><span class="status-chip ${status.cls}">${escapeHtml(status.label)}</span> ${escapeHtml(status.reason)}${item.outputBlob ? ` · ${C.formatBytes(item.file.size)} → ${C.formatBytes(item.outputBlob.size)}` : ''}</small></div>
        ${item.outputBlob ? `<button type="button" class="button button-secondary" data-result-download="${item.id}">Unduh</button>` : ''}
      `;
      els.resultList.appendChild(row);
    }
    els.resultsSection.classList.toggle('hidden', processed.length === 0);
    els.downloadZip.disabled = !state.items.some((item) => item.outputBlob);
  }

  function renderAll() {
    renderFileList();
    renderResults();
  }

  async function readHeader(file, length = 16) {
    return new Uint8Array(await file.slice(0, length).arrayBuffer());
  }

  async function inspectFile(item) {
    try {
      const header = await readHeader(item.file, 16);
      if (!C.signatureMatches(header, item.mime)) {
        item.fileError = `Isi file tidak cocok dengan ekstensi ${C.extensionFromName(item.file.name).toUpperCase() || 'yang dikenali'}. File tidak akan diproses.`;
        return;
      }
      if (sourceKind(item) === 'image') {
        const image = await loadImageBitmap(item.file);
        item.meta = { width: image.width, height: image.height };
        image.close?.();
      } else {
        try {
          const pdfjsLib = await loadPdfJs();
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await item.file.arrayBuffer()) }).promise;
          item.meta = { pages: pdf.numPages };
          await pdf.destroy();
        } catch (error) {
          item.meta = { metaNote: `Halaman PDF belum bisa dibaca (${friendlyError(error)}). File asli masih dapat disiapkan tanpa perubahan.` };
        }
      }
    } catch (error) {
      item.fileError = `File tidak dapat dibaca: ${friendlyError(error)}`;
    }
  }

  function friendlyError(error) {
    const message = error?.message || String(error || 'kesalahan tidak diketahui');
    if (/password|encrypted/i.test(message)) return 'PDF terlindungi kata sandi';
    if (/worker|fetch|network|loading/i.test(message)) return 'library atau pembacaan dokumen tidak tersedia';
    return message.length > 140 ? `${message.slice(0, 137)}…` : message;
  }

  async function loadImageBitmap(file) {
    if ('createImageBitmap' in window) return createImageBitmap(file);
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight, image, close() {} }); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibuka.')); };
      image.src = url;
    });
  }

  function getImageSource(imageBitmap) { return imageBitmap.image || imageBitmap; }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Browser tidak dapat membuat file hasil untuk format ini.')), mime, quality);
    });
  }

  function createCanvas(width, height, image, mime) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: mime !== 'image/jpeg' });
    if (!context) throw new Error('Canvas tidak tersedia di browser ini.');
    if (mime === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  async function encodeImage(file, item, options = {}) {
    const bitmap = await loadImageBitmap(file);
    const image = getImageSource(bitmap);
    try {
      const rule = C.normalizeRule(item.rule);
      const sourceMime = item.mime;
      const requestedMime = rule.outputFormat === 'original' ? sourceMime : rule.outputFormat;
      const initial = C.scaleDimensions(bitmap.width, bitmap.height, rule.maxWidth, rule.maxHeight);
      let width = initial.width;
      let height = initial.height;
      let targetBytes = rule.maxKB ? Math.floor(rule.maxKB * 1024) : null;
      const isQualityMime = requestedMime === 'image/jpeg' || requestedMime === 'image/webp';
      let attempts = 0;
      let blob = null;
      let chosenQuality = rule.quality / 100;
      const qualityChanged = rule.quality !== 82 && isQualityMime;
      const mustTransform = rule.outputFormat !== 'original' || Boolean(rule.maxWidth || rule.maxHeight || targetBytes) || options.forceEncode || qualityChanged;
      if (!mustTransform) return { blob: file, mime: sourceMime, width: bitmap.width, height: bitmap.height, note: '' };

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(requestedMime)) throw new Error('Format gambar tujuan tidak didukung.');
      if (requestedMime === 'image/webp' && !supportsCanvasMime('image/webp')) throw new Error('Browser ini tidak mendukung encoding WEBP. Pilih JPG atau PNG.');
      const minEdge = 96;
      while (attempts < 12) {
        attempts += 1;
        const canvas = createCanvas(width, height, image, requestedMime);
        if (!targetBytes || !isQualityMime) {
          blob = await canvasToBlob(canvas, requestedMime, isQualityMime ? chosenQuality : undefined);
          canvas.width = 1; canvas.height = 1;
          if (!targetBytes || blob.size <= targetBytes || (width <= minEdge && height <= minEdge)) break;
        } else {
          let low = 0.4;
          let high = chosenQuality;
          let best = null;
          const lowest = await canvasToBlob(canvas, requestedMime, low);
          if (lowest.size <= targetBytes) best = { blob: lowest, q: low };
          for (let n = 0; n < 7; n += 1) {
            const middle = (low + high) / 2;
            const candidate = await canvasToBlob(canvas, requestedMime, middle);
            if (candidate.size <= targetBytes) { best = { blob: candidate, q: middle }; low = middle; }
            else high = middle;
          }
          if (best) { blob = best.blob; chosenQuality = best.q; canvas.width = 1; canvas.height = 1; break; }
          blob = lowest;
          canvas.width = 1; canvas.height = 1;
          if (width <= minEdge && height <= minEdge) break;
        }
        const scale = 0.82;
        const nextW = Math.max(minEdge, Math.floor(width * scale));
        const nextH = Math.max(minEdge, Math.floor(height * scale));
        if (nextW === width && nextH === height) break;
        width = nextW; height = nextH;
      }
      if (!blob) throw new Error('Tidak berhasil membuat hasil gambar.');
      const notes = [];
      if (blob.type && blob.type !== requestedMime) notes.push(`Browser menghasilkan ${blob.type} alih-alih ${requestedMime}.`);
      if (targetBytes && blob.size > targetBytes) notes.push(`Ukuran belum bisa mencapai batas ${C.formatBytes(targetBytes)}. Coba batas lebih longgar atau format JPG/WEBP.`);
      if (width !== bitmap.width || height !== bitmap.height) notes.push(`Dimensi hasil ${width} × ${height} px.`);
      if (isQualityMime) notes.push(`Kualitas encoding sekitar ${Math.round(chosenQuality * 100)}%.`);
      return { blob, mime: blob.type || requestedMime, width, height, note: notes.join(' ') };
    } finally {
      bitmap.close?.();
    }
  }

  function supportsCanvasMime(mime) {
    const canvas = document.createElement('canvas');
    try { return canvas.toDataURL(mime).startsWith(`data:${mime}`); } catch { return false; }
  }

  async function imageToPdf(file, item) {
    await loadPdfLib();
    const jpegBudgetKB = item.rule.maxKB ? Math.max(1, Number(item.rule.maxKB) * 0.88) : null;
    const imageResult = await encodeImage(file, { ...item, rule: { ...item.rule, outputFormat: 'image/jpeg', maxWidth: item.rule.maxWidth, maxHeight: item.rule.maxHeight, maxKB: jpegBudgetKB } }, { forceEncode: true });
    const bytes = new Uint8Array(await imageResult.blob.arrayBuffer());
    const pdf = await window.PDFLib.PDFDocument.create();
    const embedded = await pdf.embedJpg(bytes);
    const widthPt = imageResult.width * 0.75;
    const heightPt = imageResult.height * 0.75;
    const page = pdf.addPage([widthPt, heightPt]);
    page.drawImage(embedded, { x: 0, y: 0, width: widthPt, height: heightPt });
    const result = await pdf.save({ useObjectStreams: true });
    return { blob: new Blob([result], { type: 'application/pdf' }), mime: 'application/pdf', width: null, height: null, note: 'Gambar dikonversi menjadi PDF satu halaman.' };
  }

  async function optimizePdf(file) {
    await loadPdfLib();
    const input = new Uint8Array(await file.arrayBuffer());
    let pdf;
    try { pdf = await window.PDFLib.PDFDocument.load(input, { updateMetadata: false }); }
    catch (error) { throw new Error(`PDF tidak bisa dibuka untuk optimasi: ${friendlyError(error)}`); }
    const pageCount = pdf.getPageCount();
    const output = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
    if (output.byteLength >= file.size) {
      return { blob: file, mime: 'application/pdf', pages: pageCount, note: 'Optimasi tidak mengecilkan file; file asli dipertahankan agar tidak bertambah besar.' };
    }
    return { blob: new Blob([output], { type: 'application/pdf' }), mime: 'application/pdf', pages: pageCount, note: `PDF disimpan ulang; ukuran berkurang ${C.formatBytes(file.size - output.byteLength)}. Hasil tetap perlu ditinjau.` };
  }

  async function rasterizePdf(file, item) {
    if (!item.rule.confirmRaster) throw new Error('Centang persetujuan rasterisasi sebelum memproses PDF ini.');
    await loadPdfLib();
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const loaded = await pdfjsLib.getDocument({ data }).promise;
    if (loaded.numPages > PDF_RASTER_MAX_PAGES) {
      const pages = loaded.numPages;
      await loaded.destroy();
      throw new Error(`PDF memiliki ${pages} halaman. Mode raster dibatasi ${PDF_RASTER_MAX_PAGES} halaman per file agar browser tidak kehabisan memori.`);
    }
    const outPdf = await window.PDFLib.PDFDocument.create();
    const dpi = Number(item.rule.pdfDpi || 120);
    const quality = Number(item.rule.quality || 82) / 100;
    let totalPixels = 0;
    try {
      for (let pageNo = 1; pageNo <= loaded.numPages; pageNo += 1) {
        const page = await loaded.getPage(pageNo);
        const originalViewport = page.getViewport({ scale: 1 });
        let scale = dpi / 72;
        scale = Math.min(scale, PDF_RASTER_MAX_EDGE / originalViewport.width, PDF_RASTER_MAX_EDGE / originalViewport.height);
        let viewport = page.getViewport({ scale });
        const pagePixels = viewport.width * viewport.height;
        const remaining = PDF_RASTER_MAX_PIXELS - totalPixels;
        if (pagePixels > remaining) {
          if (remaining < 200_000) throw new Error('Batas pemrosesan gambar PDF tercapai. Pilih DPI lebih rendah atau bagi PDF menjadi beberapa file.');
          scale *= Math.sqrt(remaining / pagePixels);
          viewport = page.getViewport({ scale });
        }
        totalPixels += viewport.width * viewport.height;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas tidak tersedia untuk rasterisasi PDF.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;
        if (item.rule.grayscale) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          for (let i = 0; i < pixels.length; i += 4) {
            const gray = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
            pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        const jpg = await canvasToBlob(canvas, 'image/jpeg', quality);
        const embedded = await outPdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const outPage = outPdf.addPage([originalViewport.width, originalViewport.height]);
        outPage.drawImage(embedded, { x: 0, y: 0, width: originalViewport.width, height: originalViewport.height });
        canvas.width = 1; canvas.height = 1;
        page.cleanup();
      }
      const bytes = await outPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const outBlob = new Blob([bytes], { type: 'application/pdf' });
      const notes = ['Halaman dirender menjadi gambar; teks, hyperlink, formulir, bookmark, metadata khusus, dan aksesibilitas mungkin hilang.'];
      if (item.rule.grayscale) notes.push('Mode grayscale diterapkan.');
      if (item.rule.maxKB && outBlob.size > Number(item.rule.maxKB) * 1024) notes.push(`Ukuran tetap di atas target ${item.rule.maxKB} KB; coba DPI atau kualitas lebih rendah.`);
      return { blob: outBlob, mime: 'application/pdf', pages: loaded.numPages, note: notes.join(' ') };
    } finally {
      await loaded.destroy();
    }
  }

  async function processItem(item, usedNames = new Set()) {
    resetItemOutput(item);
    if (item.fileError) throw new Error(item.fileError);
    const ruleErrors = C.validateRule(item.rule);
    if (ruleErrors.length) throw new Error(ruleErrors.join(' '));
    const rule = C.normalizeRule(item.rule);
    let result;
    const kind = sourceKind(item);
    if (kind === 'image') {
      if (rule.outputFormat === 'application/pdf') result = await imageToPdf(item.file, { ...item, rule });
      else result = await encodeImage(item.file, { ...item, rule });
    } else {
      if (rule.outputFormat === 'pdf-raster') result = await rasterizePdf(item.file, { ...item, rule });
      else if (rule.outputFormat === 'pdf-optimize') result = await optimizePdf(item.file);
      else if (rule.outputFormat === 'original') result = { blob: item.file, mime: 'application/pdf', pages: item.meta?.pages || null, note: 'PDF dipertahankan tanpa perubahan.' };
      else throw new Error('Format output yang dipilih tidak sesuai untuk PDF.');
    }
    item.outputBlob = result.blob;
    item.outputMime = result.mime || C.getOutputMime(rule, item.mime);
    item.outputName = C.safeOutputFilename(item.outputNameBase, item.outputMime, usedNames);
    item.note = result.note || '';
    item.resultMeta = { ...(item.meta || {}), ...(result.pages ? { pages: result.pages } : {}), ...(result.width ? { width: result.width, height: result.height } : {}) };
    item.outputUrl = URL.createObjectURL(item.outputBlob);
    item.processedAt = new Date().toISOString();
    return item;
  }

  function setBusy(busy) {
    state.busy = busy;
    els.processAll.disabled = busy || state.items.length === 0;
    els.applyPreset.disabled = busy || state.items.length === 0;
    els.clear.disabled = busy || state.items.length === 0;
    els.input.disabled = busy;
    els.preset.disabled = busy;
  }

  function setProgress(done, total, label) {
    const percent = total > 0 ? Math.round(done / total * 100) : 0;
    els.processStatus.classList.remove('hidden');
    els.progressLabel.textContent = label;
    els.progressValue.textContent = `${percent}%`;
    els.progressBar.style.width = `${percent}%`;
  }

  async function processItems(items) {
    if (state.busy) return;
    const selectedIds = new Set(items.map((item) => item.id));
    const uniqueUsedNames = new Set(state.items.filter((item) => !selectedIds.has(item.id) && item.outputName).map((item) => item.outputName.toLowerCase()));
    for (const item of items) resetItemOutput(item);
    setBusy(true);
    els.processStatus.classList.remove('hidden');
    setProgress(0, items.length, 'Menyiapkan berkas…');
    renderAll();
    let done = 0;
    for (const item of items) {
      try {
        await processItem(item, uniqueUsedNames);
      } catch (error) {
        item.processError = friendlyError(error);
      }
      done += 1;
      setProgress(done, items.length, `Memproses ${done} dari ${items.length} file…`);
      renderAll();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    setBusy(false);
    setProgress(items.length, items.length, 'Selesai. Periksa status sebelum mengunduh paket.');
    renderAll();
    const failed = items.filter((item) => !item.outputBlob).length;
    const warning = items.filter((item) => item.outputBlob && displayStatus(item).cls === 'warn').length;
    showToast(failed ? `Selesai dengan ${failed} file gagal. ${warning} hasil masih perlu diperiksa.` : warning ? `Pemrosesan selesai. ${warning} file masih perlu diperiksa.` : 'Semua file berhasil disiapkan.');
  }

  async function handleFiles(fileList) {
    if (state.busy) return;
    clearUploadError();
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    let batchBytes = state.items.reduce((sum, item) => sum + item.file.size, 0);
    const accepted = [];
    const rejected = [];
    for (const file of incoming) {
      if (!C.isSupportedName(file.name, file.type)) {
        rejected.push(`${file.name}: format tidak didukung.`);
        continue;
      }
      if (file.size > C.MAX_FILE_BYTES) {
        rejected.push(`${file.name}: lebih besar dari ${C.formatBytes(C.MAX_FILE_BYTES)}.`);
        continue;
      }
      if (state.items.length + accepted.length >= C.MAX_FILES) {
        rejected.push(`${file.name}: batas ${C.MAX_FILES} file per batch.`);
        continue;
      }
      if (batchBytes + file.size > C.MAX_BATCH_BYTES) {
        rejected.push(`${file.name}: total batch akan melebihi ${C.formatBytes(C.MAX_BATCH_BYTES)}.`);
        continue;
      }
      batchBytes += file.size;
      accepted.push(file);
    }
    if (rejected.length) showUploadError(rejected.slice(0, 5).join(' ') + (rejected.length > 5 ? ` Dan ${rejected.length - 5} file lainnya ditolak.` : ''));
    if (!accepted.length) return;
    for (const file of accepted) {
      const mime = C.mimeFromName(file.name, file.type);
      const base = C.safeFilename(file.name.replace(/\.[^.]+$/, ''), 'berkas');
      state.items.push({
        id: state.nextId++, file, mime, outputNameBase: base,
        rule: { outputFormat: 'original', maxKB: '', maxWidth: '', maxHeight: '', quality: 82, pdfDpi: 120, grayscale: false, pdfMode: 'keep', confirmRaster: false },
        expanded: true, fileError: '', processError: '', outputBlob: null, outputMime: null, outputName: null,
        outputUrl: null, note: '', meta: null, resultMeta: null
      });
    }
    renderAll();
    const newItems = state.items.filter((item) => accepted.includes(item.file));
    await Promise.all(newItems.map((item) => inspectFile(item)));
    renderAll();
    els.rulesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`${accepted.length} file ditambahkan. Atur aturan masing-masing sebelum memproses.`);
  }

  function applyPreset() {
    const preset = els.preset.value;
    if (!state.items.length) return;
    for (const item of state.items) {
      resetItemOutput(item);
      item.rule = C.applyPresetToRule(item.rule, preset, sourceKind(item) === 'image');
      item.rule.confirmRaster = false;
      item.expanded = true;
    }
    renderAll();
    showToast(preset === 'custom' ? 'Aturan contoh dibersihkan; format asli dipilih tanpa batas ukuran.' : 'Preset diterapkan. Periksa ulang aturan per file sebelum memproses.');
  }

  function clearAll() {
    if (state.busy || state.items.length === 0) return;
    if (!window.confirm('Hapus semua file dari sesi UploadFit? File asli di perangkat tidak akan dihapus.')) return;
    for (const item of state.items) resetItemOutput(item);
    state.items = [];
    els.processStatus.classList.add('hidden');
    els.resultsSection.classList.add('hidden');
    els.preset.value = 'custom';
    clearUploadError();
    renderAll();
    showToast('Daftar file dibersihkan. File di perangkat tetap aman.');
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function downloadItem(item) {
    if (!item?.outputBlob) return;
    downloadBlob(item.outputBlob, item.outputName || item.file.name);
  }

  function createReport() {
    const lines = [
      'UPLOADFIT — LAPORAN PERSIAPAN BERKAS',
      `Waktu: ${new Date().toLocaleString('id-ID')}`,
      'Catatan: Status hanya berdasarkan aturan yang dimasukkan pengguna; bukan jaminan penerimaan oleh situs tujuan.',
      ''
    ];
    for (const item of state.items) {
      const status = displayStatus(item);
      lines.push(`File sumber: ${item.file.name}`);
      lines.push(`Status: ${status.label}`);
      lines.push(`Alasan/catatan: ${status.reason}`);
      lines.push(`Ukuran sumber: ${C.formatBytes(item.file.size)}`);
      lines.push(`Ukuran hasil: ${item.outputBlob ? C.formatBytes(item.outputBlob.size) : 'Tidak tersedia'}`);
      lines.push(`Nama hasil: ${item.outputName || 'Tidak tersedia'}`);
      lines.push(`Format yang dipilih: ${item.rule.outputFormat}`);
      lines.push(`Batas ukuran: ${item.rule.maxKB ? `${item.rule.maxKB} KB` : 'Tidak ditentukan'}`);
      if (item.resultMeta?.pages || item.meta?.pages) lines.push(`Jumlah halaman: ${item.resultMeta?.pages || item.meta?.pages}`);
      if (item.resultMeta?.width) lines.push(`Dimensi hasil: ${item.resultMeta.width} x ${item.resultMeta.height} px`);
      lines.push('');
    }
    return lines.join('\n');
  }

  async function downloadZip() {
    if (state.busy) return;
    const outputItems = state.items.filter((item) => item.outputBlob);
    if (!outputItems.length) { showToast('Proses setidaknya satu file terlebih dahulu.', true); return; }
    let JSZipClass;
    try { JSZipClass = await loadJSZip(); } catch (error) { showToast(friendlyError(error), true); return; }
    els.downloadZip.disabled = true;
    els.downloadZip.textContent = 'Menyiapkan ZIP…';
    try {
      const zip = new JSZipClass();
      for (const item of outputItems) zip.file(item.outputName || item.file.name, item.outputBlob);
      zip.file('UploadFit-report.txt', createReport());
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } });
      downloadBlob(blob, `UploadFit-${formatShortDate()}.zip`);
      showToast(`ZIP berisi ${outputItems.length} file hasil dan laporan siap diunduh.`);
    } catch (error) {
      showToast(`ZIP gagal dibuat: ${friendlyError(error)}`, true);
    } finally {
      els.downloadZip.disabled = false;
      els.downloadZip.textContent = 'Unduh ZIP';
    }
  }

  function updateRuleFromField(item, field, target) {
    if (field === 'outputName') {
      item.outputNameBase = C.safeFilename(target.value, 'berkas');
      return false;
    }
    if (field === 'grayscale' || field === 'confirmRaster') item.rule[field] = Boolean(target.checked);
    else if (['maxKB', 'maxWidth', 'maxHeight'].includes(field)) item.rule[field] = target.value === '' ? '' : Number(target.value);
    else if (field === 'quality' || field === 'pdfDpi') item.rule[field] = Number(target.value);
    else if (field === 'outputFormat') {
      item.rule.outputFormat = target.value;
      if (target.value === 'pdf-raster') item.rule.confirmRaster = false;
    }
    return true;
  }

  function handleFileListChange(event) {
    const field = event.target.dataset.field;
    if (!field) return;
    const card = event.target.closest('.file-card');
    const item = card && state.items.find((candidate) => candidate.id === Number(card.dataset.id));
    if (!item) return;
    const reset = updateRuleFromField(item, field, event.target);
    if (field === 'quality') {
      const output = byId(`quality-output-${item.id}`) || byId(`pdfquality-output-${item.id}`);
      if (output) output.value = `${event.target.value}%`;
    }
    if (reset) resetItemOutput(item);
    renderResults();
    if (field !== 'outputName') renderFileListPreserveFocus(item.id, field, event.target.value);
  }

  function renderFileListPreserveFocus(itemId, field, value) {
    renderFileList();
    const target = els.fileList.querySelector(`.file-card[data-id="${itemId}"] [data-field="${field}"]`);
    if (target) {
      target.focus({ preventScroll: true });
      if (target.type === 'text' || target.type === 'number') {
        const end = target.value.length;
        try { target.setSelectionRange(end, end); } catch { /* some inputs don't support selection */ }
      }
      if (target.type === 'range') {
        const out = byId(field === 'quality' && sourceKind(state.items.find((item) => item.id === itemId)) === 'pdf' ? `pdfquality-output-${itemId}` : `${field}-output-${itemId}`);
        if (out) out.value = `${value}%`;
      }
    }
  }

  els.input.addEventListener('change', (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  });
  els.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.input.click(); }
  });
  els.dropzone.addEventListener('dragover', (event) => { event.preventDefault(); els.dropzone.classList.add('dragover'); });
  els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('dragover'));
  els.dropzone.addEventListener('drop', (event) => { event.preventDefault(); els.dropzone.classList.remove('dragover'); handleFiles(event.dataTransfer?.files); });
  els.applyPreset.addEventListener('click', applyPreset);
  els.clear.addEventListener('click', clearAll);
  els.processAll.addEventListener('click', () => processItems([...state.items]));
  els.downloadZip.addEventListener('click', downloadZip);

  els.fileList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || state.busy) return;
    const card = button.closest('.file-card');
    const item = state.items.find((candidate) => candidate.id === Number(card?.dataset.id));
    if (!item) return;
    const action = button.dataset.action;
    if (action === 'toggle') { item.expanded = !item.expanded; renderFileList(); }
    if (action === 'remove') {
      resetItemOutput(item);
      state.items = state.items.filter((candidate) => candidate.id !== item.id);
      renderAll();
    }
    if (action === 'download') downloadItem(item);
    if (action === 'process-one') await processItems([item]);
  });

  els.fileList.addEventListener('change', handleFileListChange);
  els.fileList.addEventListener('input', (event) => {
    if (event.target.dataset.field === 'quality') {
      const id = event.target.closest('.file-card')?.dataset.id;
      const output = byId(`quality-output-${id}`) || byId(`pdfquality-output-${id}`);
      if (output) output.value = `${event.target.value}%`;
    }
  });

  els.resultList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-result-download]');
    if (!button) return;
    downloadItem(state.items.find((item) => item.id === Number(button.dataset.resultDownload)));
  });

  renderAll();
})();

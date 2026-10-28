(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const LIMIT_BYTES = 12 * 1024 * 1024;
  const PDF_MAX_PAGES = 8;
  const OCR_MAX_PAGES = 5;
  const state = { file: null, text: '', extractionMethod: '', pageCount: null, report: null, warnings: [], busy: false };
  const els = {
    fileInput: $('fileInput'), dropzone: $('dropzone'), fileInfo: $('fileInfo'), fileType: $('fileType'), fileName: $('fileName'), fileSize: $('fileSize'), removeFile: $('removeFile'),
    targetRole: $('targetRole'), jobDescription: $('jobDescription'), analyzeBtn: $('analyzeBtn'), progressWrap: $('progressWrap'), progressText: $('progressText'), progressPct: $('progressPct'), progressBar: $('progressBar'), errorBox: $('errorBox'),
    results: $('results'), reportIntro: $('reportIntro'), overallScore: $('overallScore'), scoreLabel: $('scoreLabel'), scoreHeadline: $('scoreHeadline'), scoreDescription: $('scoreDescription'), scoreBreakdown: $('scoreBreakdown'), priorityList: $('priorityList'), strengthList: $('strengthList'), roleMatchContent: $('roleMatchContent'), rewriteList: $('rewriteList'), extractedText: $('extractedText'), extractionBadge: $('extractionBadge'), extractionMeta: $('extractionMeta'), reportFootnote: $('reportFootnote'),
    copyReportBtn: $('copyReportBtn'), downloadReportBtn: $('downloadReportBtn'), newReviewBtn: $('newReviewBtn'), reanalyzeBtn: $('reanalyzeBtn')
  };

  function fmtBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  function setProgress(text, pct) {
    els.progressWrap.hidden = false;
    els.progressText.textContent = text;
    const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    els.progressPct.textContent = `${safePct}%`;
    els.progressBar.style.width = `${safePct}%`;
  }
  function clearError() { els.errorBox.hidden = true; els.errorBox.textContent = ''; }
  function showError(message) { els.errorBox.textContent = message; els.errorBox.hidden = false; }
  function setBusy(busy) {
    state.busy = busy;
    els.analyzeBtn.disabled = busy || !state.file;
    els.analyzeBtn.querySelector('span').textContent = busy ? 'Sedang memeriksa…' : 'Periksa CV-ku';
    els.fileInput.disabled = busy;
    els.removeFile.disabled = busy;
    els.reanalyzeBtn.disabled = busy;
  }
  function niceFileType(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'PDF';
    if (name.endsWith('.webp')) return 'WEBP';
    if (name.endsWith('.png')) return 'PNG';
    return 'JPG';
  }
  function setFile(file) {
    clearError();
    if (!file) return;
    const extOk = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
    if (!extOk) { showError('Format belum didukung. Pilih PDF, JPG, JPEG, PNG, atau WEBP.'); return; }
    if (file.size > LIMIT_BYTES) { showError('Ukuran file melebihi 12 MB. Kompres file atau ekspor ulang dengan ukuran lebih kecil.'); return; }
    if (!file.size) { showError('File kosong atau tidak dapat dibaca. Pilih file lain.'); return; }
    state.file = file;
    state.text = ''; state.extractionMethod = ''; state.pageCount = null; state.report = null; state.warnings = [];
    els.fileInput.value = '';
    els.fileInfo.hidden = false;
    els.fileType.textContent = niceFileType(file);
    els.fileName.textContent = file.name;
    els.fileSize.textContent = fmtBytes(file.size);
    els.analyzeBtn.disabled = false;
    els.results.hidden = true;
    els.progressWrap.hidden = true;
  }
  function removeFile() {
    state.file = null; state.text = ''; state.report = null; state.warnings = [];
    els.fileInput.value = ''; els.fileInfo.hidden = true; els.analyzeBtn.disabled = true; els.results.hidden = true; els.progressWrap.hidden = true; clearError();
  }
  function pdfLineText(items) {
    const bits = items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => ({ text: item.str.trim(), y: Array.isArray(item.transform) ? item.transform[5] : 0, x: Array.isArray(item.transform) ? item.transform[4] : 0 }));
    bits.sort((a,b) => b.y - a.y || a.x - b.x);
    const lines = [];
    bits.forEach(bit => {
      let line = lines.find(item => Math.abs(item.y - bit.y) < 2.5);
      if (!line) { line = { y: bit.y, items: [] }; lines.push(line); }
      line.items.push(bit);
    });
    return lines.sort((a,b)=>b.y-a.y).map(line=>line.items.sort((a,b)=>a.x-b.x).map(bit=>bit.text).join(' ')).join('\n');
  }
  async function loadPdfJs() {
    if (!window.pdfjsLib) throw new Error('Library pembaca PDF belum termuat. Periksa koneksi internet/CDN lalu muat ulang halaman.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  }
  async function extractPdf(file) {
    const pdfjs = await loadPdfJs();
    setProgress('Membaca struktur PDF…', 8);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    state.pageCount = pdf.numPages;
    const pagesToRead = Math.min(pdf.numPages, PDF_MAX_PAGES);
    const pageTexts = [];
    for (let pageNo = 1; pageNo <= pagesToRead; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      pageTexts.push(`--- Halaman ${pageNo} ---\n${pdfLineText(content.items)}`);
      setProgress(`Membaca teks PDF · halaman ${pageNo}/${pagesToRead}`, 8 + (pageNo / pagesToRead) * 34);
    }
    let text = pageTexts.join('\n\n').trim();
    const warnings = [];
    if (pdf.numPages > PDF_MAX_PAGES) warnings.push(`PDF memiliki ${pdf.numPages} halaman. Versi ini menganalisis maksimal ${PDF_MAX_PAGES} halaman pertama agar browser tetap ringan.`);
    const hasEnoughText = text.replace(/--- Halaman \d+ ---/g, '').replace(/\s/g, '').length >= Math.max(160, pagesToRead * 70);
    if (hasEnoughText) {
      state.extractionMethod = 'pdf-text';
      state.warnings.push(...warnings);
      return { text, warnings, method: 'pdf-text', pageCount: pdf.numPages };
    }
    // Text layer is empty/too thin: render scanned pages and OCR in-browser.
    if (!window.Tesseract) throw new Error('PDF ini tampaknya berupa scan. Library OCR belum termuat. Periksa koneksi internet, lalu coba lagi.');
    warnings.push(`Teks PDF sangat sedikit, sehingga OCR digunakan pada maksimal ${Math.min(pagesToRead, OCR_MAX_PAGES)} halaman pertama. Periksa kembali hasil OCR.`);
    const ocrPageCount = Math.min(pagesToRead, OCR_MAX_PAGES);
    const worker = await createOcrWorker();
    const ocrTexts = [];
    try {
      for (let pageNo = 1; pageNo <= ocrPageCount; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const naturalViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.7, 1500 / naturalViewport.width, 1900 / naturalViewport.height);
        const viewport = page.getViewport({ scale: Math.max(1, scale) });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        setProgress(`OCR PDF · halaman ${pageNo}/${ocrPageCount}`, 45 + (pageNo / ocrPageCount) * 45);
        const result = await worker.recognize(canvas);
        ocrTexts.push(`--- Halaman ${pageNo} (OCR) ---\n${result.data.text || ''}`);
        canvas.width = 1; canvas.height = 1;
      }
    } finally { await worker.terminate().catch(() => {}); }
    text = ocrTexts.join('\n\n').trim();
    state.extractionMethod = 'ocr-pdf'; state.warnings.push(...warnings);
    return { text, warnings, method: 'ocr-pdf', pageCount: pdf.numPages };
  }
  async function createOcrWorker() {
    if (!window.Tesseract) throw new Error('Library OCR belum termuat. Coba muat ulang halaman dengan koneksi internet.');
    return window.Tesseract.createWorker('ind+eng', 1, {
      logger: (message) => {
        if (message && message.status && /loading|recognizing|initializ/i.test(message.status)) {
          const pct = typeof message.progress === 'number' ? Math.round(message.progress * 25) : 0;
          setProgress(`OCR: ${message.status}…`, Math.min(90, 48 + pct));
        }
      }
    });
  }
  async function extractImage(file) {
    setProgress('Menyiapkan OCR gambar…', 10);
    const worker = await createOcrWorker();
    let bitmap;
    let canvas;
    try {
      setProgress('Membaca gambar…', 20);
      bitmap = await createImageBitmap(file);
      // Bound canvas size to reduce memory pressure on mobile devices.
      const scale = Math.min(1, 1900 / bitmap.width, 2400 / bitmap.height);
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setProgress('Membaca teks dari gambar…', 30);
      const result = await worker.recognize(canvas);
      setProgress('Menyusun hasil OCR…', 90);
      state.extractionMethod = 'ocr-image'; state.pageCount = 1;
      return { text: result.data.text || '', warnings: ['Teks dibaca dari gambar menggunakan OCR. Periksa kembali nama, angka, tanda baca, dan tanggal sebelum mempercayai analisis.'], method: 'ocr-image', pageCount: 1 };
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      if (canvas) { canvas.width = 1; canvas.height = 1; }
      await worker.terminate().catch(() => {});
    }
  }
  async function extractFile(file) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    return isPdf ? extractPdf(file) : extractImage(file);
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function renderScore(report) {
    const score = report.score.overall;
    els.overallScore.textContent = score;
    let label = 'Perlu dibangun', headline = 'Mulai dari fondasi', description = 'Perbaiki masalah penting terlebih dahulu.';
    if (score >= 85) { label = 'Fondasi kuat'; headline = 'Fondasinya sudah kuat'; description = 'Fokus pada relevansi lowongan dan pemeriksaan detail.'; }
    else if (score >= 70) { label = 'Cukup solid'; headline = 'Ada dasar yang baik'; description = 'Beberapa perubahan terarah bisa memperjelas nilai kandidat.'; }
    else if (score >= 50) { label = 'Perlu dipoles'; headline = 'Masih ada ruang perbaikan'; description = 'Prioritaskan struktur, keterbacaan, dan bukti kontribusi.'; }
    els.scoreLabel.textContent = label; els.scoreHeadline.textContent = headline; els.scoreDescription.textContent = description;
    els.scoreBreakdown.replaceChildren();
    report.score.categories.forEach(category => {
      const row = el('div', 'breakdown-row');
      row.append(el('span', '', category.name));
      const bar = el('div', 'bar'); const fill = el('i'); fill.style.width = `${category.percent}%`; bar.append(fill); row.append(bar);
      row.append(el('strong', '', `${category.points}/${category.max}`));
      els.scoreBreakdown.append(row);
    });
  }
  function renderFindingList(container, items, emptyText, type) {
    container.replaceChildren();
    if (!items.length) { container.append(el('p','muted small-copy',emptyText)); return; }
    items.forEach(item => {
      const severity = type === 'strength' ? 'good' : (item.severity || 'medium');
      const row = el('div', `finding ${severity}`);
      row.append(el('span','finding-icon-mini',type === 'strength' ? '✓' : (severity === 'high' ? '!' : severity === 'low' ? 'i' : '↗')));
      const body = el('div','finding-body'); body.append(el('strong','',item.title)); body.append(el('p','',item.description));
      if (item.evidence) body.append(el('p','',`Bukti/area: ${item.evidence}`));
      row.append(body); container.append(row);
    });
  }
  function renderKeywordMatch(report) {
    els.roleMatchContent.replaceChildren();
    const match = report.keywordMatch;
    if (!report.relevanceAssessed) {
      els.roleMatchContent.append(el('p','keyword-summary','Pilih target posisi atau tempel deskripsi lowongan untuk mengukur kecocokan istilah. Tidak ada penalti karena kamu belum memilih target.'));
      return;
    }
    els.roleMatchContent.append(el('p','keyword-summary', report.targetKeywords.length ? `Ditemukan ${match.matched.length} dari ${report.targetKeywords.length} istilah yang diperiksa (${match.percent}%). Ini hanya pemeriksaan tumpang tindih kata, bukan skor ATS dan bukan pengukuran kompetensi.` : 'Tidak ada istilah target yang cukup untuk dibandingkan.'));
    if (match.matched.length) {
      els.roleMatchContent.append(el('p','micro-copy','DITEMUKAN DI CV'));
      const yes = el('div','keyword-chips'); match.matched.slice(0,12).forEach(k=>yes.append(el('span','keyword-chip',k))); els.roleMatchContent.append(yes);
    }
    if (match.missing.length) {
      els.roleMatchContent.append(el('p','micro-copy','BELUM DITEMUKAN · CEK RELEVANSINYA'));
      const no = el('div','keyword-chips'); match.missing.slice(0,12).forEach(k=>no.append(el('span','keyword-chip missing',k))); els.roleMatchContent.append(no);
    }
  }
  function renderRewrites(items) {
    els.rewriteList.replaceChildren();
    items.forEach(item => {
      const card = el('article','rewrite-item');
      card.append(el('span','rewrite-kind',item.kind));
      card.append(el('blockquote','',item.original));
      card.append(el('p','suggested',item.suggested));
      card.append(el('p','small-copy',item.note));
      els.rewriteList.append(card);
    });
  }
  function renderReport(report, text) {
    state.report = report; state.text = text;
    els.reportIntro.textContent = `${state.file ? state.file.name : 'Teks yang diperiksa'} · ${report.wordCount.toLocaleString('id-ID')} kata terdeteksi · target: ${report.roleLabel}.`;
    renderScore(report);
    renderFindingList(els.priorityList, report.priorities, 'Tidak ada temuan mayor dari checklist dasar.', 'finding');
    renderFindingList(els.strengthList, report.strengths, 'Belum ada indikator positif yang dapat dipastikan dari teks.', 'strength');
    renderKeywordMatch(report);
    renderRewrites(report.rewriteSuggestions);
    els.extractedText.value = text;
    const extractionLabels = { 'pdf-text':'PDF · teks asli', 'ocr-pdf':'PDF · OCR', 'ocr-image':'Gambar · OCR', manual:'Teks manual' };
    els.extractionBadge.textContent = extractionLabels[report.extractionMethod] || report.extractionMethod;
    els.extractionMeta.textContent = `${report.lineCount} baris · ${report.pageCount ? `${report.pageCount} halaman sumber` : 'jumlah halaman tidak diketahui'}`;
    const footnotes = [...report.limitations];
    if (state.warnings.length) footnotes.push(...state.warnings);
    els.reportFootnote.textContent = footnotes.join(' ');
    els.results.hidden = false;
    els.progressWrap.hidden = true;
    setTimeout(()=>els.results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}),50);
  }
  function runAnalysis(text, method, pageCount) {
    const role = els.targetRole.value;
    const jobDescription = els.jobDescription.value;
    state.extractionMethod = method || state.extractionMethod || 'manual';
    state.pageCount = pageCount === undefined ? state.pageCount : pageCount;
    const report = window.CVAnalyzer.analyze(text, { role, jobDescription, pageCount:state.pageCount, extractionMethod:state.extractionMethod });
    renderReport(report, text);
  }
  async function analyzeFile() {
    if (!state.file || state.busy) return;
    clearError(); setBusy(true); state.warnings = [];
    try {
      const result = await extractFile(state.file);
      state.warnings = result.warnings || [];
      const text = window.CVAnalyzer.cleanText(result.text);
      if (text.replace(/\s/g,'').length < 30) throw new Error('Teks CV belum berhasil dibaca. Coba PDF yang berisi teks, gambar dengan resolusi lebih tinggi, atau periksa apakah dokumen terlindungi password.');
      setProgress('Mengevaluasi struktur dan isi CV…', 96);
      await new Promise(resolve=>setTimeout(resolve,80));
      setProgress('Selesai', 100);
      runAnalysis(text, result.method, result.pageCount);
    } catch (error) {
      console.error('[Kritik CV]', error);
      showError(error && error.message ? error.message : 'Dokumen gagal diproses. Coba file PDF/JPG lain.');
      els.progressWrap.hidden = true;
    } finally { setBusy(false); }
  }
  function reportAsText() {
    const report = state.report;
    if (!report) return '';
    const lines = [
      'KRITIK CV — LAPORAN REVIEW',
      `Target posisi: ${report.roleLabel}`,
      `Skor checklist: ${report.score.overall}/100`,
      `Jumlah kata terbaca: ${report.wordCount}`,
      '',
      'CATATAN PENTING',
      ...report.limitations.map(x=>`- ${x}`),
      '',
      'RINGKASAN', report.summary, '',
      'SKOR PER BAGIAN',
      ...report.score.categories.map(x=>`- ${x.name}: ${x.points}/${x.max} (${x.percent}%)\n  ${x.details.join(' ')}`),
      '', 'PRIORITAS PERBAIKAN',
      ...report.priorities.map((x,i)=>`${i+1}. [${x.severity.toUpperCase()}] ${x.title}\n   ${x.description}${x.evidence?`\n   Bukti/area: ${x.evidence}`:''}`),
      '', 'KEKUATAN YANG TERDETEKSI',
      ...report.strengths.map(x=>`- ${x.title}: ${x.description}`),
      '', 'RELEVANSI TARGET',
      report.relevanceAssessed ? `Kata kunci ditemukan: ${report.keywordMatch.matched.join(', ') || 'tidak ada'}\nBelum ditemukan: ${report.keywordMatch.missing.join(', ') || 'tidak ada'}` : 'Belum dinilai karena target/lowongan belum spesifik.',
      '', 'SARAN PENULISAN (TEMPLATE, BUKAN FAKTA BARU)',
      ...report.rewriteSuggestions.map(x=>`- ${x.kind}\n  Teks: ${x.original}\n  Saran: ${x.suggested}\n  Catatan: ${x.note}`),
      '', 'Teks sumber hasil ekstraksi ada pada laporan browser; periksa OCR sebelum memakai saran.'
    ];
    if (state.warnings.length) lines.push('', 'PERINGATAN EKSTRAKSI', ...state.warnings.map(x=>`- ${x}`));
    return lines.join('\n');
  }
  async function copyReport() {
    const text = reportAsText(); if (!text) return;
    try { await navigator.clipboard.writeText(text); els.copyReportBtn.textContent = 'Tersalin ✓'; }
    catch (_) { const area = document.createElement('textarea'); area.value=text; document.body.append(area); area.select(); const ok=document.execCommand('copy'); area.remove(); els.copyReportBtn.textContent=ok?'Tersalin ✓':'Salin gagal'; }
    setTimeout(()=>els.copyReportBtn.textContent='Salin ringkasan',1800);
  }
  function downloadReport() {
    const text = reportAsText(); if (!text) return;
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`kritik-cv-laporan-${new Date().toISOString().slice(0,10)}.txt`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  function onRoleChange() {
    // Let the user explicitly rerun after changing the target; avoid showing stale scores as if up to date.
    if (state.report) { els.reportIntro.textContent = 'Target posisi berubah. Klik “Analisis ulang teks” untuk memperbarui laporan.'; els.reanalyzeBtn.classList.add('needs-update'); }
  }
  function bindEvents() {
    els.fileInput.addEventListener('change', e=>setFile(e.target.files && e.target.files[0]));
    els.removeFile.addEventListener('click', removeFile);
    els.dropzone.addEventListener('keydown', e=>{ if (e.key==='Enter'||e.key===' ') { e.preventDefault(); els.fileInput.click(); } });
    ['dragenter','dragover'].forEach(type=>els.dropzone.addEventListener(type,e=>{e.preventDefault();els.dropzone.classList.add('dragover');}));
    ['dragleave','drop'].forEach(type=>els.dropzone.addEventListener(type,e=>{e.preventDefault();els.dropzone.classList.remove('dragover');}));
    els.dropzone.addEventListener('drop',e=>{const file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];setFile(file);});
    els.analyzeBtn.addEventListener('click', analyzeFile);
    els.copyReportBtn.addEventListener('click', copyReport);
    els.downloadReportBtn.addEventListener('click', downloadReport);
    els.newReviewBtn.addEventListener('click',()=>{removeFile();els.targetRole.value='general';els.jobDescription.value='';window.scrollTo({top:0,behavior:'smooth'});});
    els.reanalyzeBtn.addEventListener('click',()=>{
      clearError(); const text=window.CVAnalyzer.cleanText(els.extractedText.value);
      if (text.replace(/\s/g,'').length<30) { showError('Teks terlalu pendek untuk dianalisis. Periksa hasil ekstraksi.'); return; }
      state.warnings = state.warnings.filter(w=>!w.startsWith('Teks dikoreksi oleh pengguna.'));
      state.warnings.push('Teks sumber diedit secara manual sebelum analisis ulang.');
      runAnalysis(text,state.extractionMethod,state.pageCount); els.reanalyzeBtn.classList.remove('needs-update');
    });
    els.targetRole.addEventListener('change',onRoleChange);
    els.jobDescription.addEventListener('input',()=>{if(state.report){els.reportIntro.textContent='Deskripsi lowongan berubah. Klik “Analisis ulang teks” untuk memperbarui laporan.';els.reanalyzeBtn.classList.add('needs-update');}});
  }
  bindEvents();
})();

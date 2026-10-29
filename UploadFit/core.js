(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.UploadFitCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUPPORTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);
  const MIME_BY_EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const EXT_BY_MIME = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const MAX_FILES = 25;
  const MAX_FILE_BYTES = 40 * 1024 * 1024;
  const MAX_BATCH_BYTES = 120 * 1024 * 1024;

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = n / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: value >= 10 ? 1 : 2 })} ${units[unit]}`;
  }

  function extensionFromName(name) {
    const clean = String(name || '').split(/[?#]/, 1)[0];
    const dot = clean.lastIndexOf('.');
    return dot < 0 ? '' : clean.slice(dot + 1).toLowerCase();
  }

  function isSupportedName(name, type) {
    const ext = extensionFromName(name);
    return SUPPORTED_EXTENSIONS.has(ext) || ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(String(type || '').toLowerCase());
  }

  function mimeFromName(name, fallback = '') {
    return MIME_BY_EXT[extensionFromName(name)] || String(fallback || '').toLowerCase() || 'application/octet-stream';
  }

  function safeFilename(input, fallback = 'berkas') {
    let name = String(input ?? '').normalize('NFKC').trim();
    name = name.replace(/^[./\\\s]+/g, '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/:*?"<>|]/g, '-');
    name = name.replace(/\s+/g, ' ').replace(/\.+$/g, '').trim();
    name = name.replace(/^(\.+|\s+)+/g, '').slice(0, 140).trim();
    return name || fallback;
  }

  function safeOutputFilename(baseName, mime, usedNames = new Set()) {
    const base = safeFilename(String(baseName || '').replace(/\.(pdf|jpe?g|png|webp)$/i, ''), 'berkas');
    const ext = EXT_BY_MIME[mime] || extensionFromName(baseName) || 'bin';
    let candidate = `${base}.${ext}`;
    let counter = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      candidate = `${base} (${counter}).${ext}`;
      counter += 1;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  function signatureMatches(buffer, expectedMime) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || new ArrayBuffer(0));
    const at = (i) => bytes[i] ?? -1;
    if (expectedMime === 'application/pdf') return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
    if (expectedMime === 'image/jpeg') return at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff;
    if (expectedMime === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => at(i) === b);
    if (expectedMime === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    return false;
  }

  function normalizeRule(rule = {}) {
    const maxKB = rule.maxKB === '' || rule.maxKB == null ? null : Number(rule.maxKB);
    const maxWidth = rule.maxWidth === '' || rule.maxWidth == null ? null : Number(rule.maxWidth);
    const maxHeight = rule.maxHeight === '' || rule.maxHeight == null ? null : Number(rule.maxHeight);
    const quality = Number(rule.quality ?? 82);
    const dpi = Number(rule.dpi ?? 120);
    return {
      outputFormat: rule.outputFormat || 'original',
      maxKB: Number.isFinite(maxKB) && maxKB > 0 ? maxKB : null,
      maxWidth: Number.isFinite(maxWidth) && maxWidth > 0 ? Math.floor(maxWidth) : null,
      maxHeight: Number.isFinite(maxHeight) && maxHeight > 0 ? Math.floor(maxHeight) : null,
      quality: Number.isFinite(quality) ? Math.max(40, Math.min(95, Math.round(quality))) : 82,
      pdfDpi: [96, 120, 150].includes(dpi) ? dpi : 120,
      grayscale: Boolean(rule.grayscale),
      pdfMode: rule.pdfMode || 'keep',
      confirmRaster: Boolean(rule.confirmRaster)
    };
  }

  function validateRule(rule = {}) {
    const errors = [];
    const maxKB = rule.maxKB === '' || rule.maxKB == null ? null : Number(rule.maxKB);
    const maxWidth = rule.maxWidth === '' || rule.maxWidth == null ? null : Number(rule.maxWidth);
    const maxHeight = rule.maxHeight === '' || rule.maxHeight == null ? null : Number(rule.maxHeight);
    if (maxKB !== null && (!Number.isFinite(maxKB) || maxKB <= 0)) errors.push('Batas ukuran harus angka positif atau dikosongkan.');
    for (const [label, value] of [['Lebar', maxWidth], ['Tinggi', maxHeight]]) {
      if (value !== null && (!Number.isInteger(value) || value <= 0 || value > 20000)) errors.push(`${label} maksimal harus bilangan bulat antara 1 dan 20.000 px.`);
    }
    if (!['original', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'pdf-optimize', 'pdf-raster'].includes(rule.outputFormat || 'original')) errors.push('Format output tidak dikenali.');
    if (rule.quality != null && (!Number.isFinite(Number(rule.quality)) || Number(rule.quality) < 40 || Number(rule.quality) > 95)) errors.push('Kualitas harus 40–95.');
    if (rule.pdfDpi != null && ![96, 120, 150].includes(Number(rule.pdfDpi))) errors.push('DPI PDF harus 96, 120, atau 150.');
    return errors;
  }

  function scaleDimensions(width, height, maxWidth, maxHeight) {
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const bounds = [];
    if (Number(maxWidth) > 0) bounds.push(Number(maxWidth) / w);
    if (Number(maxHeight) > 0) bounds.push(Number(maxHeight) / h);
    const scale = Math.min(1, ...(bounds.length ? bounds : [1]));
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scale };
  }

  function readiness({ outputSize, maxKB, outputMime, expectedMime, error } = {}) {
    if (error) return { status: 'fail', label: 'Gagal', reason: String(error) };
    if (!outputSize || outputSize < 0) return { status: 'warn', label: 'Belum diproses', reason: 'File belum diproses.' };
    if (maxKB != null && Number(maxKB) > 0 && outputSize > Number(maxKB) * 1024) {
      return { status: 'warn', label: 'Belum memenuhi', reason: `Ukuran ${formatBytes(outputSize)} melebihi batas ${formatBytes(Number(maxKB) * 1024)}.` };
    }
    if (expectedMime && outputMime && expectedMime !== outputMime) {
      return { status: 'warn', label: 'Perlu diperiksa', reason: 'Format hasil berbeda dari format yang dipersyaratkan.' };
    }
    return { status: 'ready', label: 'Siap', reason: 'Lolos aturan ukuran dan format yang dipilih.' };
  }

  function applyPresetToRule(rule, preset, isImage) {
    const next = { ...normalizeRule(rule) };
    if (preset === 'custom') {
      return { ...next, outputFormat: 'original', maxKB: null, maxWidth: null, maxHeight: null, quality: 82, pdfDpi: 120, grayscale: false, pdfMode: 'keep' };
    }
    if (preset === 'photo') {
      if (!isImage) return next;
      return { ...next, outputFormat: 'image/jpeg', maxKB: 500, maxWidth: 1600, maxHeight: 1600, quality: 82 };
    }
    if (preset === 'pdf') {
      return { ...next, outputFormat: isImage ? 'application/pdf' : 'pdf-optimize', maxKB: 2048, maxWidth: null, maxHeight: null, quality: 82, pdfMode: 'optimize', confirmRaster: false };
    }
    if (preset === 'light') {
      return { ...next, maxKB: 2048 };
    }
    return next;
  }

  function getOutputMime(rule, sourceMime) {
    const format = rule.outputFormat || 'original';
    if (format === 'original') return sourceMime;
    if (format === 'pdf-optimize' || format === 'pdf-raster' || format === 'application/pdf') return 'application/pdf';
    return format;
  }

  function getOutputExtension(mime) { return EXT_BY_MIME[mime] || 'bin'; }

  return {
    SUPPORTED_EXTENSIONS, MIME_BY_EXT, EXT_BY_MIME,
    MAX_FILES, MAX_FILE_BYTES, MAX_BATCH_BYTES,
    formatBytes, extensionFromName, isSupportedName, mimeFromName,
    safeFilename, safeOutputFilename, signatureMatches,
    normalizeRule, validateRule, scaleDimensions, readiness,
    applyPresetToRule, getOutputMime, getOutputExtension
  };
});

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('formatBytes handles bytes, kilobytes, megabytes', () => {
  assert.equal(C.formatBytes(0), '0 B');
  assert.equal(C.formatBytes(1024), '1 KB');
  assert.match(C.formatBytes(1024 * 1024), /1 MB/);
});

test('supported file types include PDF and common web images only', () => {
  for (const name of ['resume.pdf', 'photo.jpg', 'photo.jpeg', 'scan.png', 'image.webp']) assert.equal(C.isSupportedName(name, ''), true);
  assert.equal(C.isSupportedName('script.js', ''), false);
});

test('file names are sanitized against path traversal and invalid characters', () => {
  assert.equal(C.safeFilename('../folder/name?.pdf'), 'folder-name-.pdf');
  assert.equal(C.safeFilename('   '), 'berkas');
  assert.ok(!C.safeFilename('../../secret').includes('/'));
});

test('safeOutputFilename adds extension and prevents case-insensitive collisions', () => {
  const used = new Set();
  assert.equal(C.safeOutputFilename('CV Final.pdf', 'application/pdf', used), 'CV Final.pdf');
  assert.equal(C.safeOutputFilename('CV Final', 'application/pdf', used), 'CV Final (2).pdf');
});

test('signatureMatches recognizes common PDF and image headers', () => {
  assert.equal(C.signatureMatches(Uint8Array.from([37, 80, 68, 70, 45, 49]), 'application/pdf'), true);
  assert.equal(C.signatureMatches(Uint8Array.from([255, 216, 255, 0]), 'image/jpeg'), true);
  assert.equal(C.signatureMatches(Uint8Array.from([137,80,78,71,13,10,26,10]), 'image/png'), true);
  assert.equal(C.signatureMatches(new TextEncoder().encode('RIFFxxxxWEBP'), 'image/webp'), true);
  assert.equal(C.signatureMatches(new TextEncoder().encode('not pdf'), 'application/pdf'), false);
});

test('normalizes limits while keeping explicit raster consent', () => {
  const rule = C.normalizeRule({ maxKB: '500', maxWidth: '1600', maxHeight: '', quality: 101, pdfDpi: 100, confirmRaster: true });
  assert.equal(rule.maxKB, 500);
  assert.equal(rule.maxWidth, 1600);
  assert.equal(rule.maxHeight, null);
  assert.equal(rule.quality, 95);
  assert.equal(rule.pdfDpi, 120);
  assert.equal(rule.confirmRaster, true);
});

test('rule validation catches invalid limits and unknown formats', () => {
  assert.equal(C.validateRule({ maxKB: -3 }).length > 0, true);
  assert.equal(C.validateRule({ maxWidth: 20001 }).length > 0, true);
  assert.equal(C.validateRule({ outputFormat: 'video/mp4' }).length > 0, true);
  assert.deepEqual(C.validateRule({ outputFormat: 'image/jpeg', maxKB: '500', maxWidth: '1200', maxHeight: '1200', quality: 82 }), []);
});

test('scaleDimensions preserves aspect ratio and never upscales', () => {
  assert.deepEqual(C.scaleDimensions(4000, 2000, 1600, 1600), { width: 1600, height: 800, scale: 0.4 });
  assert.deepEqual(C.scaleDimensions(800, 600, 1600, 1600), { width: 800, height: 600, scale: 1 });
});

test('readiness distinguishes unprocessed, ready, oversize and error', () => {
  assert.equal(C.readiness({ outputSize: 0 }).status, 'warn');
  assert.equal(C.readiness({ outputSize: 400 * 1024, maxKB: 500, outputMime: 'image/jpeg', expectedMime: 'image/jpeg' }).status, 'ready');
  assert.equal(C.readiness({ outputSize: 700 * 1024, maxKB: 500 }).status, 'warn');
  assert.equal(C.readiness({ outputSize: 100, error: 'failed' }).status, 'fail');
});

test('photo preset affects image only and remains editable', () => {
  const result = C.applyPresetToRule({ outputFormat: 'original', maxKB: '', quality: 82 }, 'photo', true);
  assert.equal(result.outputFormat, 'image/jpeg');
  assert.equal(result.maxKB, 500);
  assert.equal(result.maxWidth, 1600);
  const pdfRule = C.applyPresetToRule({ outputFormat: 'original', maxKB: '' }, 'photo', false);
  assert.equal(pdfRule.outputFormat, 'original');
  assert.equal(pdfRule.maxKB, null);
});

test('PDF preset selects conversion and the example size limit', () => {
  const result = C.applyPresetToRule({ outputFormat: 'original' }, 'pdf', true);
  assert.equal(result.outputFormat, 'application/pdf');
  assert.equal(result.maxKB, 2048);
  const pdfResult = C.applyPresetToRule({ outputFormat: 'original' }, 'pdf', false);
  assert.equal(pdfResult.outputFormat, 'pdf-optimize');
});

test('output mime matches transformations', () => {
  assert.equal(C.getOutputMime({ outputFormat: 'original' }, 'image/png'), 'image/png');
  assert.equal(C.getOutputMime({ outputFormat: 'image/jpeg' }, 'image/png'), 'image/jpeg');
  assert.equal(C.getOutputMime({ outputFormat: 'pdf-raster' }, 'application/pdf'), 'application/pdf');
});

test('limits protect browser workload', () => {
  assert.equal(C.MAX_FILES, 25);
  assert.equal(C.MAX_FILE_BYTES, 40 * 1024 * 1024);
  assert.equal(C.MAX_BATCH_BYTES, 120 * 1024 * 1024);
});

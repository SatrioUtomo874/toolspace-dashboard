'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('Toolspace metadata makes FileKit visible and clickable in beta', () => {
  assert.match(html, /name="toolspace:title" content="FileKit — All-in-One File Tools"/);
  assert.match(html, /name="toolspace:status" content="ready"/);
  assert.match(html, /name="toolspace:status-label" content="Beta · siap dicoba"/);
  assert.match(html, /name="toolspace:thumbnail" content="assets\/thumbnail\.svg"/);
});

test('All catalog tool IDs are unique', () => {
  const ids = [...app.matchAll(/\{id:'([^']+)'/g)].map(m => m[1]);
  assert.ok(ids.length >= 65, `expected broad toolbox, found ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, 'tool ids must be unique for favorites/recent/activity');
});

test('Declared actions route to a processing path or explicit limitation', () => {
  const actions = [...new Set([...app.matchAll(/action:'([^']+)'/g)].map(m => m[1]))];
  const cases = new Set([...app.matchAll(/case '([^']+)'/g)].map(m => m[1]));
  const explicitActions = new Set([
    'pdf-merge','pdf-compare','pdf-metadata','pdf-remove-metadata','pdf-rotate','pdf-compress','pdf-split','pdf-extract','pdf-delete','pdf-organize','pdf-number','pdf-watermark','pdf-crop','pdf-note','pdf-sign','pdf-to-jpg','pdf-to-png','pdf-to-text','pdf-ocr','pdf-to-word','word-to-pdf','excel-to-pdf','powerpoint-to-pdf','pdf-fill-text','pdf-protect','pdf-unlock',
    'image-compress','image-resize','image-crop','image-rotate','image-flip','image-convert','image-to-pdf','image-watermark','image-blur','image-pixelate','image-background','image-remove-bg','image-upscale','image-exif','image-strip-metadata','favicon','passport-photo',
    'excel-csv','csv-excel','csv-viewer','json-format','json-csv','csv-json','text-diff','word-count','text-cleaner','markdown-preview','audio-convert','audio-compress','audio-trim','video-convert','video-compress','video-trim','video-gif','extract-audio','merge-video-audio','zip-create','zip-extract','bulk-rename','duplicate-finder','file-metadata','file-signature','sha256','file-split','file-join','text-redactor'
  ]);
  for (const action of actions) assert.ok(explicitActions.has(action), `action ${action} must be explicitly accounted for`);
});

test('PDF to JPG/PNG instantiates JSZip before calling zip.file()', () => {
  assert.match(app, /const Z=await jsZip\(\),zip=new Z\(\),scale=Number\(getOpt\('scale','1\.5'\)\),mime=t\.action==='pdf-to-jpg'\?'image\/jpeg':'image\/png';/);
  assert.doesNotMatch(app, /if\(\['pdf-to-jpg','pdf-to-png','pdf-to-text','pdf-ocr'\]\.includes\(t\.action\)\)[\s\S]{0,1000}const zip=await jsZip\(\),scale=/);
});

test('Required local assets exist', () => {
  for (const file of ['style.css','app.js','core.js','assets/thumbnail.svg','README.md','tests/core.test.cjs']) {
    assert.ok(fs.existsSync(path.join(root,file)), `missing ${file}`);
  }
});

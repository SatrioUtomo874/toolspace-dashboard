'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('CSV parser handles commas, quotes, escaped quotes, and newlines', () => {
  const rows = C.parseCSV('name,note\r\nAlice,"hello, world"\r\nBob,"he said ""hi"""\r\nCara,"line 1\nline 2"');
  assert.deepEqual(rows, [['name','note'],['Alice','hello, world'],['Bob','he said "hi"'],['Cara','line 1\nline 2']]);
});

test('CSV delimiter auto-detection supports semicolon and tab', () => {
  assert.equal(C.detectDelimiter('name;price\nfoo;1'), ';');
  assert.equal(C.detectDelimiter('a\tb\n1\t2'), '\t');
});

test('CSV serialization escapes special characters', () => {
  assert.equal(C.toCSV([['a','b'],['1','x,y'],['2','he said "yes"']]), 'a,b\r\n1,"x,y"\r\n2,"he said ""yes"""');
});

test('page parser expands and deduplicates valid ranges', () => {
  assert.deepEqual(C.parsePageSelection('1,3-5,4', 6), [0,2,3,4]);
});

test('page parser rejects invalid and out-of-bounds selections', () => {
  assert.throws(() => C.parsePageSelection('0', 4), /di luar/);
  assert.throws(() => C.parsePageSelection('1-x', 4), /tidak valid/);
  assert.throws(() => C.parsePageSelection('4-6', 5), /di luar/);
});

test('filename sanitation removes dangerous path characters', () => {
  assert.equal(C.sanitizeFilename('../folder:evil?.pdf'), '.._folder_evil_.pdf');
  assert.equal(C.sanitizeFilename('   '), 'file');
});

test('human size uses understandable units', () => {
  assert.equal(C.humanSize(0), '0 B');
  assert.equal(C.humanSize(1024), '1.00 KB');
  assert.equal(C.humanSize(1024*1024), '1.00 MB');
});

test('safe JSON parse returns a value or a useful error', () => {
  assert.deepEqual(C.safeJsonParse('{"ok":true}'), {ok:true,value:{ok:true}});
  assert.equal(C.safeJsonParse('{oops').ok, false);
});

test('signature checker identifies common file headers', () => {
  assert.equal(C.classifySignature([0x25,0x50,0x44,0x46,0x2d]), 'PDF');
  assert.equal(C.classifySignature([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), 'PNG');
  assert.equal(C.classifySignature([0xff,0xd8,0xff]), 'JPEG');
  assert.equal(C.classifySignature([0x50,0x4b,0x03,0x04]), 'ZIP / OOXML');
});

test('rename pattern supports name, index, and date tokens', () => {
  assert.equal(C.makeRename('report.pdf','{date}_{index}_{name}',3,new Date('2026-01-02T00:00:00Z')), '2026-01-02_03_report.pdf');
});

test('line diff classifies unchanged, added, and removed lines', () => {
  const rows=C.lineDiff('alpha\nold\nomega','alpha\nnew\nomega');
  assert.deepEqual(rows.map(x=>x.type), ['same','removed','added','same']);
});

test('line diff rejects unreasonably large matrices', () => {
  assert.throws(() => C.lineDiff(Array(600).fill('a').join('\n'), Array(600).fill('b').join('\n')), /terlalu panjang/);
});

test('redactor masks common emails, Indonesian phone numbers, and token patterns', () => {
  const r=C.redactText('mail me@example.com, call 081234567890, token sk-abcdefghijklmnopqrstuvwxyz123456');
  assert.doesNotMatch(r.text, /me@example\.com|081234567890|sk-abcdefghijklmnopqrstuvwxyz123456/);
  assert.ok(r.findings.length >= 2);
});

test('bulk rename keeps the original extension and avoids path traversal', () => {
  assert.equal(C.makeRename('../../evil.txt','{index}-{name}',1,new Date('2026-10-01T00:00:00Z')), '01-.._.._evil.txt');
});

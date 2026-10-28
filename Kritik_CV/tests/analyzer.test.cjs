const assert = require('node:assert/strict');
const analyzer = require('../analyzer.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('normalizes whitespace and line breaks', () => {
  assert.equal(analyzer.cleanText('  A\r\n\n\nB  '), 'A\n\nB');
});
test('detects common Indonesian and English CV headings', () => {
  const sections = analyzer.findSections('PENGALAMAN KERJA\nPendidikan\nKeahlian\nProjects');
  assert.equal(sections.experience, true);
  assert.equal(sections.education, true);
  assert.equal(sections.skills, true);
  assert.equal(sections.projects, true);
});
test('detects email address', () => {
  assert.equal(analyzer.hasEmail('Kontak: satria@example.com'), true);
  assert.equal(analyzer.hasEmail('Tidak ada email'), false);
});
test('detects Indonesian phone formats', () => {
  assert.equal(analyzer.hasPhone('Telepon: 0812-3456-7890'), true);
  assert.equal(analyzer.hasPhone('Telepon belum ditulis'), false);
});
test('generates job-description keywords without common stop words', () => {
  const keys = analyzer.jobKeywords('Dibutuhkan teknisi maintenance PLC dan preventive maintenance untuk mesin produksi.');
  assert.ok(keys.includes('teknisi'));
  assert.ok(keys.includes('maintenance'));
  assert.ok(!keys.includes('untuk'));
});
test('compares keywords transparently', () => {
  const result = analyzer.matchKeywords('Mengelola data menggunakan Excel dan membuat laporan.', ['excel','python','laporan']);
  assert.deepEqual(result.matched.sort(), ['excel','laporan']);
  assert.deepEqual(result.missing, ['python']);
  assert.equal(result.percent, 67);
});
test('builds a report with a bounded score and clear categories', () => {
  const text = `SATRIO UTOMO\nsatrio@example.com | 081234567890 | Sidoarjo\nPROFIL\nLulusan Teknik Elektro dan tertarik pada posisi maintenance.\nPENGALAMAN KERJA\n- Memelihara 12 mesin produksi melalui pemeriksaan rutin dan pencatatan kondisi.\n- Mengurangi waktu perbaikan 20 persen dengan menata daftar pemeriksaan.\nPENDIDIKAN\nSMK Teknik Elektronika Audio Video 2023\nKEAHLIAN\nPLC, troubleshooting, wiring, Microsoft Excel\nSERTIFIKASI\nPelatihan PLC dan K3.`;
  const report = analyzer.analyze(text, {role:'electrical', extractionMethod:'pdf-text', pageCount:1});
  assert.ok(report.score.overall >= 0 && report.score.overall <= 100);
  assert.equal(report.contact.email, true);
  assert.equal(report.contact.phone, true);
  assert.equal(report.sections.experience, true);
  assert.equal(report.sections.education, true);
  assert.equal(report.sections.skills, true);
  assert.ok(report.score.categories.length >= 3);
  assert.ok(report.priorities.length > 0);
  assert.ok(report.rewriteSuggestions.length > 0);
});
test('does not give a fake target match when target is unspecified', () => {
  const report = analyzer.analyze('Nama Kandidat\nPendidikan\nKeahlian', {role:'general', extractionMethod:'manual'});
  assert.equal(report.relevanceAssessed, false);
  assert.equal(report.score.categories.some(c => c.name === 'Kecocokan target'), false);
});
test('job description adds a target match category', () => {
  const report = analyzer.analyze('Pengalaman menggunakan Excel, mengolah laporan dan administrasi.', {role:'general', jobDescription:'Menguasai Excel dan administrasi data laporan.', extractionMethod:'manual'});
  assert.equal(report.relevanceAssessed, true);
  assert.equal(report.score.categories.some(c => c.name === 'Kecocokan target'), true);
  assert.ok(report.keywordMatch.percent >= 0 && report.keywordMatch.percent <= 100);
});
test('detects generic responsibility phrasing without inventing rewritten metrics', () => {
  const report = analyzer.analyze('saya@example.com\n081234567890\nPengalaman Kerja\nBertanggung jawab atas administrasi dan membantu dalam kegiatan kantor.\nPendidikan\nKeahlian', {role:'admin', extractionMethod:'pdf-text'});
  assert.ok(report.metrics.weakPhraseCount >= 1);
  assert.ok(report.rewriteSuggestions.some(r=>r.suggested.includes('[Kata kerja aktif]') || r.suggested.includes('[proses/aktivitas]')));
});
test('limitations clearly distinguish checklist from ATS outcome', () => {
  const report = analyzer.analyze('Nama\nPendidikan\nKeahlian\nPengalaman kerja', {role:'general', extractionMethod:'manual'});
  assert.ok(report.limitations.some(t => /bukan prediksi penerimaan kerja/.test(t)));
  assert.ok(report.limitations.some(t => /bukan skor resmi ATS/.test(t)));
});


test('does not mistake bare dates for measurable achievements', () => {
  const report = analyzer.analyze('Nama Kandidat\nPengalaman Kerja\nOperator 2023 - 2024\nPendidikan\nSMK 2022\nKeahlian', {role:'general', extractionMethod:'manual'});
  assert.equal(report.metrics.quantifiedLines, 0);
});
test('recognizes numeric scope and percentages as measurable context', () => {
  const report = analyzer.analyze('Nama Kandidat\nsaya@example.com\n081234567890\nPengalaman Kerja\n- Mengelola 120 data pelanggan per hari.\n- Mengurangi waktu proses sebesar 20%.\nPendidikan\nKeahlian', {role:'general', extractionMethod:'manual'});
  assert.ok(report.metrics.quantifiedLines >= 2);
});

console.log(`\n${passed} tests passed.`);

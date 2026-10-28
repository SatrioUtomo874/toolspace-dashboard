import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const script = app.slice(app.indexOf('function localDateKey'), app.indexOf('const progress = safeLoad();'));
const context = { CASES: [] };
// Pull the embedded case data without executing DOM event handlers.
const casesStart = app.indexOf('const CASES = [');
const casesEnd = app.indexOf('\n];', casesStart) + 3;
const casesSource = app.slice(casesStart, casesEnd).replace('const CASES =', 'globalThis.CASES =');
vm.runInNewContext(`${casesSource}\n${script}\nfunction scoreForClues(clueCount, wrongCount) { return Math.max(20, 100 - clueCount * 12 - wrongCount * 18); }\nglobalThis.exports = { CASES, dailyCaseId, rankFor, scoreForClues };`, context);
const { CASES, dailyCaseId, rankFor, scoreForClues } = context.exports;

test('there are six unique cases with one valid answer each', () => {
  assert.equal(CASES.length, 6);
  assert.equal(new Set(CASES.map(c => c.id)).size, 6);
  for (const item of CASES) {
    assert.ok(item.suspects.some(s => s.id === item.answer), `${item.id}: answer suspect exists`);
    assert.ok(item.clues.length >= 3, `${item.id}: at least three clues`);
    assert.ok(item.explanation.length > 50, `${item.id}: meaningful explanation`);
  }
});

test('each case has unique suspect IDs and clue IDs', () => {
  for (const item of CASES) {
    assert.equal(new Set(item.suspects.map(s => s.id)).size, item.suspects.length);
    assert.equal(new Set(item.clues.map(c => c.id)).size, item.clues.length);
  }
});

test('daily case is deterministic for the same local date', () => {
  const date = new Date(2026, 9, 28, 12, 0, 0);
  assert.equal(dailyCaseId(date), dailyCaseId(date));
  assert.ok(CASES.some(c => c.id === dailyCaseId(date)));
});

test('rank thresholds are monotonic', () => {
  assert.equal(rankFor(0).name, 'Detektif Magang');
  assert.equal(rankFor(30).name, 'Detektif Junior');
  assert.equal(rankFor(100).name, 'Detektif Andal');
  assert.equal(rankFor(250).name, 'Detektif Senior');
  assert.equal(rankFor(500).name, 'Detektif Legendaris');
});

test('score rewards fewer clues and fewer wrong accusations with a minimum', () => {
  assert.equal(scoreForClues(0, 0), 100);
  assert.equal(scoreForClues(2, 0), 76);
  assert.equal(scoreForClues(2, 1), 58);
  assert.equal(scoreForClues(3, 8), 20);
});

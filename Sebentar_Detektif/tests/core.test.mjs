import test from 'node:test';
import assert from 'node:assert/strict';
import Engine from '../engine.js';

const { generateCase, validateCase, scoreCase, rankFor, getDailySeed } = Engine;

test('same seed and difficulty recreate the same case exactly', () => {
  const a = generateCase('case-shareable-123', { difficulty: 'hard' });
  const b = generateCase('case-shareable-123', { difficulty: 'hard' });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('shareable seed stays the same when difficulty is supplied on open', () => {
  const a = generateCase('case-shareable-123');
  const b = generateCase('case-shareable-123', { difficulty: a.difficultyKey });
  assert.equal(a.title, b.title);
  assert.equal(a.answer, b.answer);
  assert.equal(a.clues.map(c => c.detail).join('|'), b.clues.map(c => c.detail).join('|'));
  assert.equal(a.id, b.id);
});

test('daily seed uses a stable UTC date', () => {
  const d1 = new Date('2026-10-28T00:01:00.000Z');
  const d2 = new Date('2026-10-28T23:58:00.000Z');
  assert.equal(getDailySeed(d1), getDailySeed(d2));
  assert.notEqual(getDailySeed(d1), getDailySeed(new Date('2026-10-29T00:01:00.000Z')));
});

test('difficulty controls suspect count and evidence count', () => {
  assert.equal(generateCase('same', { difficulty: 'easy' }).suspects.length, 3);
  assert.equal(generateCase('same', { difficulty: 'medium' }).suspects.length, 4);
  assert.equal(generateCase('same', { difficulty: 'hard' }).suspects.length, 5);
  assert.equal(generateCase('same', { difficulty: 'easy' }).clues.length, 4);
  assert.equal(generateCase('same', { difficulty: 'hard' }).clues.length, 5);
});

test('generated cases pass logic validation with independent supporting evidence', () => {
  for (let i = 0; i < 500; i += 1) {
    const item = generateCase(`case-${i}`);
    const validation = validateCase(item);
    assert.equal(validation.valid, true, `${item.seed}: ${validation.errors.join(', ')}`);
    assert.ok(item.clues.filter(clue => clue.supports === item.answer).length >= 2);
    assert.ok(item.clues.some(clue => clue.clears && clue.clears !== item.answer));
    assert.ok(item.suspects.some(suspect => suspect.id === item.answer));
  }
});

test('generated seeds produce varied titles, suspects and settings', () => {
  const items = Array.from({ length: 100 }, (_, i) => generateCase(`variety-${i}`));
  assert.ok(new Set(items.map(item => item.title)).size > 20);
  assert.ok(new Set(items.map(item => item.location)).size > 5);
  assert.ok(new Set(items.map(item => item.answer)).size > 20);
  assert.ok(new Set(items.map(item => item.theme)).size >= 4);
});

test('score changes with difficulty, hints and incorrect accusations', () => {
  assert.ok(scoreCase({ difficulty: 'hard' }) > scoreCase({ difficulty: 'medium' }));
  assert.ok(scoreCase({ difficulty: 'easy', revealedHints: 1 }) < scoreCase({ difficulty: 'easy' }));
  assert.ok(scoreCase({ difficulty: 'easy', wrongAttempts: 1 }) < scoreCase({ difficulty: 'easy' }));
  assert.ok(scoreCase({ difficulty: 'easy', revealedHints: 9, wrongAttempts: 9 }) >= 15);
  assert.ok(scoreCase({ difficulty: 'medium', daily: true }) > scoreCase({ difficulty: 'medium' }));
});

test('rank thresholds stay ordered', () => {
  const xp = [0, 30, 100, 220, 400, 700];
  const names = xp.map(value => rankFor(value).name);
  assert.equal(names[0], 'Detektif Magang');
  assert.equal(names[1], 'Detektif Junior');
  assert.equal(names[2], 'Detektif Andal');
  assert.equal(names[3], 'Detektif Senior');
  assert.equal(names[4], 'Detektif Legendaris');
  assert.equal(names[5], 'Legenda Kota');
});

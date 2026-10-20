import './setup.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
const store = await import('../src/js/store.js');
const { marks, where } = await import('../src/js/progress.js');

beforeEach(() => store.wipe());

test('before the practice the line is walk-through progress, with no score', () => {
  store.setPlace('hangeul/a3', 16);
  assert.deepEqual(marks('hangeul/a3', 21, undefined), { line: 16 / 22, done: false, score: null });
});

test('after the practice the line is the score, and only 100% is done', () => {
  assert.deepEqual(marks('hangeul/a8', 21, { score: 0.78 }), { line: 0.78, done: false, score: '78%' });
  assert.deepEqual(marks('hangeul/a1', 21, { score: 1 }), { line: 1, done: true, score: '100%' });
});

test('a record without a number falls back to progress rather than tinting', () => {
  assert.equal(marks('course/g01', 10, { at: '2026-10-20' }).done, false);
});

test('where says the card you are on, then what is next, then nothing', () => {
  assert.equal(where('hangeul/a3', 21), '');
  store.setPlace('hangeul/a3', 5);
  assert.equal(where('hangeul/a3', 21), ' · card 6 of 21');
  store.setPlace('hangeul/a3', 0);
  store.markWalked('hangeul/a3');
  assert.equal(where('hangeul/a3', 21), ' · practice next');
  assert.equal(where('hangeul/a3', 21, 'drillNext'), ' · drill next');
  // Walked before, being walked again: the card wins, because that is where it reopens.
  store.setPlace('hangeul/a3', 3);
  assert.equal(where('hangeul/a3', 21), ' · card 4 of 21');
});

test('a place past the end is shown as the last card', () => {
  store.setPlace('vocab/v01', 40);
  assert.equal(where('vocab/v01', 18), ' · card 18 of 18');
});

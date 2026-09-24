import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romanize, romanizeWord } from '../tools/romanize.mjs';
import { romanize as syllable } from '../src/js/hangul.js';

test('a single syllable romanizes the same as hangul.js says it', () => {
  for (const s of ['가', '밥', '옷', '닭', '꽃', '의', '뭐']) assert.equal(romanizeWord(s), syllable(s));
});

test('연음: a final carries over to a following vowel', () => {
  assert.equal(romanizeWord('한국어'), 'hangugeo');
  assert.equal(romanizeWord('없어요'), 'eopseoyo');   // a double final hands on its second letter
  assert.equal(romanizeWord('많이'), 'mani');         // and a ㅎ is simply not said
  assert.equal(romanizeWord('같이'), 'gachi');        // ㅌ before 이 becomes ㅊ
});

test('ㄹ: ll where two meet, r before a vowel', () => {
  assert.equal(romanizeWord('달러'), 'dalleo');
  assert.equal(romanizeWord('설날'), 'seollal');
  assert.equal(romanizeWord('사람'), 'saram');
  assert.equal(romanizeWord('일요일'), 'iryoil');
});

test('비음화: a stop before ㄴ or ㅁ is written as the nasal it becomes', () => {
  assert.equal(romanizeWord('합니다'), 'hamnida');
  assert.equal(romanizeWord('작년'), 'jangnyeon');
  assert.equal(romanizeWord('끝나다'), 'kkeunnada');
});

test('ㄹ is n after most consonants and l after ㄴ', () => {
  assert.equal(romanizeWord('종로'), 'jongno');
  assert.equal(romanizeWord('독립'), 'dongnip');
  assert.equal(romanizeWord('신라'), 'silla');
  assert.equal(romanizeWord('연락'), 'yeollak');
});

test('tensification is not written', () => {
  assert.equal(romanizeWord('식당'), 'sikdang');
  assert.equal(romanizeWord('학교'), 'hakgyo');
  assert.equal(romanizeWord('물질'), 'muljil');
});

test('ㅎ aspirates a neighbouring ㄱ ㄷ ㅂ ㅈ', () => {
  assert.equal(romanizeWord('좋다'), 'jota');
  assert.equal(romanizeWord('넣다'), 'neota');
  assert.equal(romanizeWord('많다'), 'manta');
});

test('the three known errors come out right', () => {
  assert.equal(romanizeWord('주의'), 'juui');         // ㅢ is always ui
  assert.equal(romanizeWord('체류'), 'cheryu');       // ㄹ before a vowel is r
  assert.equal(romanizeWord('그라인더'), 'geuraindeo');
});

test('the house convention is an exception, not the rule', () => {
  // The data keeps the h (makhida) and check-content.mjs lists it as an
  // exception. The romanizer itself stays strict, so the exception is visible.
  assert.equal(romanizeWord('막히다'), 'makida');
});

test('text: each word on its own, spaces and punctuation kept', () => {
  assert.equal(romanize('저는 공장에서 일해요.'), 'jeoneun gongjangeseo ilhaeyo.');
  assert.equal(romanize('작업 끝났어요?'), 'jageop kkeunnasseoyo?');
});

test('anything that is not a syllable is refused', () => {
  assert.equal(romanizeWord('ㄱ'), null);
  assert.equal(romanizeWord('abc'), null);
});

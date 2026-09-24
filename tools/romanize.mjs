// Whole-word Revised Romanization, for checking the `rom` fields in data/.
//
// src/js/hangul.js romanizes one syllable said on its own, which is all the
// alphabet lessons need. A word needs more: the sounds change where two blocks
// meet, and Revised Romanization spells some of those changes and not others.
// This file applies the ones it spells —
//
//   연음         a final carries over to a following vowel     한국어 → hangugeo
//   ㄹ           ㄹㄹ is ll, ㄹ before a vowel is r              달러 → dalleo, 체류 → cheryu
//   비음화        a stop before ㄴ or ㅁ becomes a nasal          합니다 → hamnida, 작년 → jangnyeon
//   ㄹ after ㄴ   lateralises, after any other consonant is n   신라 → silla, 종로 → jongno
//   구개음화      ㄷ ㅌ before 이 become ㅈ ㅊ                   같이 → gachi
//   ㅎ            aspirates a neighbouring ㄱ ㄷ ㅂ ㅈ            좋다 → jota, 막히다 → makida
//
// — and does NOT write tensification, which RR leaves out (식당 → sikdang).
//
// It is a checker, not part of the app: nothing in src/ imports it. It uses
// hangul.js for the syllable split so the two can never disagree about what a
// block is made of. Rules it cannot know — ㄴ inserted in a compound, a noun
// keeping its h — are exceptions in check-content.mjs, one line each, rather
// than bends in the rules here.

import { split, INITIALS, FINALS } from '../src/js/hangul.js';

const INITIAL_ROM = { 'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'pp','ㅅ':'s','ㅆ':'ss','ㅇ':'','ㅈ':'j','ㅉ':'jj','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h' };
const VOWEL_ROM = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const I_VOWEL = 20;   // ㅣ

// A double final keeps its first letter and hands the second to a following vowel.
const DOUBLE = { 'ㄳ':['ㄱ','ㅅ'],'ㄵ':['ㄴ','ㅈ'],'ㄶ':['ㄴ','ㅎ'],'ㄺ':['ㄹ','ㄱ'],'ㄻ':['ㄹ','ㅁ'],'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅅ'],'ㄾ':['ㄹ','ㅌ'],'ㄿ':['ㄹ','ㅍ'],'ㅀ':['ㄹ','ㅎ'],'ㅄ':['ㅂ','ㅅ'] };
// Before a consonant, which of the seven final sounds each final is said as.
const SAID = { '':'','ㄱ':'ㄱ','ㄲ':'ㄱ','ㅋ':'ㄱ','ㄳ':'ㄱ','ㄺ':'ㄱ','ㄴ':'ㄴ','ㄵ':'ㄴ','ㄶ':'ㄴ','ㄷ':'ㄷ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅎ':'ㄷ','ㄹ':'ㄹ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㅀ':'ㄹ','ㅁ':'ㅁ','ㄻ':'ㅁ','ㅂ':'ㅂ','ㅍ':'ㅂ','ㄿ':'ㅂ','ㅄ':'ㅂ','ㅇ':'ㅇ' };
const FINAL_ROM = { '':'','ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng' };
const ASPIRATE = { 'ㄱ':'ㅋ','ㄷ':'ㅌ','ㅂ':'ㅍ','ㅈ':'ㅊ' };
const NASAL = { 'ㄱ':'ㅇ','ㄷ':'ㄴ','ㅂ':'ㅁ' };

/** One word of Hangul, no spaces. Returns null if any character is not a syllable. */
export function romanizeWord(word) {
  const s = [];
  for (const ch of word) {
    const p = split(ch);
    if (!p) return null;
    s.push({ i: INITIALS[p.i], v: p.v, f: FINALS[p.f] });
  }
  // Settle each boundary left to right. After this every final is one of the
  // seven sounds (or empty), and every initial is what is actually said.
  for (let k = 0; k < s.length; k++) {
    const a = s[k], b = s[k + 1];
    if (!b) { a.f = SAID[a.f]; break; }
    if (!a.f) continue;                                      // nothing to carry: 사람 saram
    const hFinal = a.f === 'ㅎ' || a.f === 'ㄶ' || a.f === 'ㅀ';
    const kept = DOUBLE[a.f] ? DOUBLE[a.f][0] : (a.f === 'ㅎ' ? '' : a.f);

    if (b.i === 'ㅇ') {                                     // 연음
      if (a.f === 'ㅇ' || a.f === '') continue;
      if (hFinal) { a.f = kept; continue; }                 // 좋아 joa, 많이 mani
      const moved = DOUBLE[a.f] ? DOUBLE[a.f][1] : a.f;
      a.f = DOUBLE[a.f] ? DOUBLE[a.f][0] : '';
      b.i = moved;
      if ((moved === 'ㄷ' || moved === 'ㅌ') && b.v === I_VOWEL) b.i = moved === 'ㄷ' ? 'ㅈ' : 'ㅊ';  // 같이 gachi
      continue;
    }
    if (hFinal && ASPIRATE[b.i]) { a.f = kept; b.i = ASPIRATE[b.i]; continue; }   // 좋다 jota
    if (hFinal && b.i === 'ㅅ') { a.f = kept; b.i = 'ㅆ'; continue; }             // 좋습니다 josseumnida
    if (hFinal && b.i === 'ㄴ') {                                                 // 놓는 nonneun, 않는 anneun, 싫네 sille
      if (kept === 'ㄹ') { a.f = 'ㄹ'; b.i = 'ㄹ'; } else a.f = 'ㄴ';
      continue;
    }

    let f = SAID[a.f];
    if (b.i === 'ㅎ' && ASPIRATE[f]) {                      // 막히다 makida
      b.i = ASPIRATE[f];
      if (f === 'ㄷ' && b.v === I_VOWEL) b.i = 'ㅊ';        // 굳히다 guchida
      a.f = ''; continue;
    }
    if (b.i === 'ㄹ') {
      if (f === 'ㄴ' || f === 'ㄹ') { f = 'ㄹ'; }            // 신라 silla, 달러 dalleo
      else b.i = 'ㄴ';                                       // 종로 jongno, 독립 dongnip
    } else if (f === 'ㄹ' && b.i === 'ㄴ') {
      b.i = 'ㄹ';                                            // 설날 seollal
    }
    if ((b.i === 'ㄴ' || b.i === 'ㅁ') && NASAL[f]) f = NASAL[f];   // 합니다 hamnida
    a.f = f;
  }
  let out = '';
  s.forEach((x, k) => {
    let ini = INITIAL_ROM[x.i];
    if (x.i === 'ㄹ' && k > 0 && s[k - 1].f === 'ㄹ') ini = 'l';
    out += ini + VOWEL_ROM[x.v] + FINAL_ROM[x.f];
  });
  return out;
}

/**
 * Any text: each run of Hangul is one word and romanized on its own, since RR
 * does not carry a sound change across a space; everything else — spaces,
 * punctuation — is kept as it is.
 */
export function romanize(text) {
  return text.replace(/[가-힣]+/g, w => romanizeWord(w));
}

/** The Hangul words in a text, each paired with its romanization. */
export const words = (text) => (text.match(/[가-힣]+/g) || []).map(w => [w, romanizeWord(w)]);

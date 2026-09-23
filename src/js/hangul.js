// Syllable arithmetic, for the alphabet lessons.
//
// A Hangul syllable is a code point computed from its three parts, so the
// practice sets can be BUILT from the letters a learner has met so far rather
// than listed by hand — and each wrong option can differ from the right one by
// exactly one letter, which is the only kind of wrong option that teaches
// anything: 자 against 차 against 짜 is the lesson, 자 against 무 is a guess.
//
// Romanization is the Revised Romanization of Korean, the one on road signs and
// in passports, applied to a single syllable said on its own.

const BASE = 0xAC00;

export const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const INITIAL_ROM = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];

export const VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const VOWEL_ROM = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];

// Index 0 is "no closing letter". Only the single letters are listed by name;
// the double ones (ㄳ ㄵ …) exist in the code table but are not taught here.
export const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// What each closing letter is actually SAID as — the seven sounds.
const FINAL_ROM = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
// What a learner who has not met the rule would guess from the letter itself.
// Where it differs from FINAL_ROM it makes the most useful wrong option there is.
const FINAL_NAIVE = ['','g','kk','','n','','','d','l','','','','','','','','m','b','','s','ss','ng','j','ch','k','t','p','h'];

export function compose(initial, vowel, final = '') {
  const i = INITIALS.indexOf(initial), v = VOWELS.indexOf(vowel), f = FINALS.indexOf(final);
  if (i < 0 || v < 0 || f < 0) return null;
  return String.fromCharCode(BASE + (i * 21 + v) * 28 + f);
}

export function split(syl) {
  const n = syl.charCodeAt(0) - BASE;
  if (!(n >= 0 && n < 11172)) return null;
  return { i: Math.floor(n / 588), v: Math.floor((n % 588) / 28), f: n % 28 };
}

export const parts = (syl) => {
  const p = split(syl);
  return p && { initial: INITIALS[p.i], vowel: VOWELS[p.v], final: FINALS[p.f] };
};

export function romanize(syl) {
  const p = split(syl);
  if (!p) return null;
  return INITIAL_ROM[p.i] + VOWEL_ROM[p.v] + FINAL_ROM[p.f];
}

// The spelling-out a learner would guess for a syllable with a closing letter,
// if it differs from how it is really said: 옷 → "os". Null when it does not.
export function naive(syl) {
  const p = split(syl);
  if (!p || !p.f || !FINAL_NAIVE[p.f] || FINAL_NAIVE[p.f] === FINAL_ROM[p.f]) return null;
  return INITIAL_ROM[p.i] + VOWEL_ROM[p.v] + FINAL_NAIVE[p.f];
}

// Every syllable that differs from `syl` in exactly one of its parts, using
// only the letters in `known` — the neighbours a learner could confuse it with.
export function neighbours(syl, known) {
  const p = parts(syl);
  if (!p) return [];
  const out = new Set();
  for (const c of INITIALS) if (c !== p.initial && known.has(c)) out.add(compose(c, p.vowel, p.final));
  for (const v of VOWELS) if (v !== p.vowel && known.has(v)) out.add(compose(p.initial, v, p.final));
  if (p.final) {
    for (const f of FINALS) if (f && f !== p.final && known.has(f) && FINAL_ROM[FINALS.indexOf(f)] !== FINAL_ROM[FINALS.indexOf(p.final)]) out.add(compose(p.initial, p.vowel, f));
  }
  out.delete(null);
  // Two syllables that are romanized alike cannot both be options on a
  // "how is this said?" question, so neighbours that sound the same are dropped.
  const r = romanize(syl);
  return [...out].filter(x => romanize(x) !== r);
}

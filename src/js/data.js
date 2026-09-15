// Loads the content files once and indexes them. Content is plain JSON on
// purpose: adding a unit or a word is editing a file, not writing code.

const FILES = {
  hangeul: ['data/hangeul.json'],
  pictures: ['data/pictures.json'],
  course:  ['data/course-1.json', 'data/course-2.json', 'data/course-3.json', 'data/course-4.json'],
  vocab:   ['data/vocab-1.json', 'data/vocab-2.json'],
  drills:  ['data/exam-drills.json'],
  mocks:   ['data/exam-mock-1.json'],
  listening: ['content/listening/manifest.json'],
  images: ['content/images/manifest.json'],
};

export const LEVELS = [
  { id: 'L1', title: 'First words',     titleKo: '첫걸음', blurb: 'Enough to say who you are, where you work and what you need.' },
  { id: 'L2', title: 'Everyday',        titleKo: '일상',   blurb: 'The past, the future, asking for things, saying no.' },
  { id: 'L3', title: 'At work',         titleKo: '직장',   blurb: 'Rules, permissions, conditions, and the formal register an office expects.' },
  { id: 'L4', title: 'Going further',   titleKo: '더 깊이', blurb: 'Where the exam stops and real Korean carries on — clauses, reported speech, nuance, documents.' },
];

let cache = null;

async function grab(path) {
  try {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function load() {
  if (cache) return cache;
  const [hangeul, pictures, course, vocab, drills, mocks, listening, images] = await Promise.all([
    Promise.all(FILES.hangeul.map(grab)),
    Promise.all(FILES.pictures.map(grab)),
    Promise.all(FILES.course.map(grab)),
    Promise.all(FILES.vocab.map(grab)),
    Promise.all(FILES.drills.map(grab)),
    Promise.all(FILES.mocks.map(grab)),
    Promise.all(FILES.listening.map(grab)),
    Promise.all(FILES.images.map(grab)),
  ]);

  const units = course.filter(Boolean).flatMap(f => f.units).sort((a, b) => a.order - b.order);
  const sets = vocab.filter(Boolean).flatMap(f => f.sets).sort((a, b) => a.order - b.order);

  cache = {
    hangeul: hangeul[0],
    pics: (pictures[0] && pictures[0].pics) ? pictures[0].pics : {},
    // Official pictures the owner of this build dropped into content/images.
    // An id here shadows the drawing of the same name — see that folder's README.
    images: (images[0] && images[0].images) ? images[0].images : {},
    units,
    unitById: Object.fromEntries(units.map(u => [u.id, u])),
    sets,
    setById: Object.fromEntries(sets.map(s => [s.id, s])),
    drills: drills.filter(Boolean).flatMap(f => f.drills),
    mocks: mocks.filter(Boolean),
    listening: (listening[0] && Array.isArray(listening[0].sets)) ? listening[0].sets : [],
  };
  cache.drillById = Object.fromEntries(cache.drills.map(d => [d.id, d]));
  cache.mockById = Object.fromEntries(cache.mocks.map(m => [m.id, m]));
  return cache;
}

export const data = () => cache;

// Every reviewable item in the app carries a stable key, so the review deck can
// rebuild the question from the key alone after a reload.
export const unitKey  = (unitId, i) => `u:${unitId}:${i}`;
export const vocabKey = (word) => `w:${word}`;
export const drillKey = (drillId, i) => `d:${drillId}:${i}`;

export function resolve(key) {
  const d = cache;
  if (!d) return null;
  const [kind, a, b] = key.split(':');
  if (kind === 'u') {
    const u = d.unitById[a];
    if (!u || !u.exercises[+b]) return null;
    return { key, kind, ex: u.exercises[+b], from: u.title };
  }
  if (kind === 'w') {
    for (const s of d.sets) {
      const w = s.words.find(x => x.ko === a);
      if (w) return { key, kind, word: w, set: s, from: s.title };
    }
    return null;
  }
  if (kind === 'd') {
    const dr = d.drillById[a];
    if (!dr || !dr.items[+b]) return null;
    return { key, kind, item: dr.items[+b], drill: dr, from: dr.title };
  }
  return null;
}

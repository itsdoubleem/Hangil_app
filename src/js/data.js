// Loads the content files once and indexes them. Content is plain JSON on
// purpose: adding a unit or a word is editing a file, not writing code.

const FILES = {
  hangeul: ['data/hangeul.json'],
  pictures: ['data/pictures.json'],
  course:  ['data/course-1.json', 'data/course-2.json', 'data/course-3.json', 'data/course-4.json'],
  vocab:   ['data/vocab-1.json', 'data/vocab-2.json'],
  drills:  ['data/exam-drills.json'],
  trades:  ['data/trades-1.json', 'data/trades-2.json'],
  guide:   ['data/guide.json'],
  tags:    ['data/tags.json'],
  mocks:   ['data/exam-mock-1.json', 'data/exam-mock-2.json'],
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
  const [hangeul, pictures, course, vocab, drills, mocks, listening, images, trades, guide, tags] = await Promise.all([
    Promise.all(FILES.hangeul.map(grab)),
    Promise.all(FILES.pictures.map(grab)),
    Promise.all(FILES.course.map(grab)),
    Promise.all(FILES.vocab.map(grab)),
    Promise.all(FILES.drills.map(grab)),
    Promise.all(FILES.mocks.map(grab)),
    Promise.all(FILES.listening.map(grab)),
    Promise.all(FILES.images.map(grab)),
    Promise.all(FILES.trades.map(grab)),
    Promise.all(FILES.guide.map(grab)),
    Promise.all(FILES.tags.map(grab)),
  ]);

  const units = course.filter(Boolean).flatMap(f => f.units).sort((a, b) => a.order - b.order);
  const sets = vocab.filter(Boolean).flatMap(f => f.sets).sort((a, b) => a.order - b.order);
  // The eight job groups the EPS-TOPIK draws its 업종별 questions from. These are
  // not a menu of topics someone thought would be useful: an applicant for a
  // manufacturing job picks ONE of the eight when they apply, and the job-related
  // questions on their paper come from that one. Applicants outside manufacturing
  // get common questions in their place — which is why choosing a trade in this
  // app is optional and why nothing here assumes you have chosen one.
  const trds = trades.filter(Boolean).flatMap(f => f.trades).sort((a, b) => a.order - b.order);

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
    // Kept so the Listening screen can name the source and the licence. The
    // material is someone else's and the attribution is a condition of using it.
    listeningMeta: listening[0] || {},
    trades: trds,
    tradeById: Object.fromEntries(trds.map(x => [x.id, x])),
    guide: (guide[0] && Array.isArray(guide[0].sections)) ? guide[0] : { sections: [] },
    tags: (tags[0] && tags[0].tags) ? tags[0].tags : {},
  };
  // One index for every word in the app, whichever file it came from, so a
  // review key of `w:<word>` resolves the same whether the word was learned in a
  // vocabulary set or in a trade. Sets win a collision, because that is where
  // the everyday sense of a word lives; the trade list repeats a few of them on
  // purpose, and a learner meeting 검사 in two places should get one deck entry.
  cache.wordIndex = {};
  for (const group of [...trds, ...cache.sets]) {
    for (const w of group.words) cache.wordIndex[w.ko] = { word: w, group };
  }
  stampTags(cache);
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
export const tradeKey = (tradeId, i) => `t:${tradeId}:${i}`;


/* ---- tags ---------------------------------------------------------------

   A tag is declared ONCE, on a unit, drill, trade or vocabulary set, and every
   item inside inherits it. Writing a tag onto each of four hundred items would
   be four hundred chances to forget one, and the thing a unit teaches is a
   property of the unit, not of its sixth exercise.

   On top of the inherited tags, each item gets a SHAPE tag worked out from its
   own fields — a stem with a gap in it is a gap-fill wherever it lives. That is
   derived rather than authored for the same reason: it is already knowable from
   the data, so asking a person to restate it only creates a way to be wrong.

   An individual item may still carry its own `tags`, and they are added on top.  */

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

// The shape of an exam-style item, from the fields it happens to have.
function examShape(it) {
  const out = [];
  if (it.picOptions) out.push('listening-picture');
  else if (it.lines) out.push(/이어지는/.test(it.stem || '') ? 'listening-reply' : 'listening-dialogue');
  else if (it.audio) out.push('listening-word');
  if (it.pic) out.push('reading-picture');
  if (it.display) out.push('reading-sign');
  if (it.passage) out.push('reading-passage');
  if (/\(\s*\)/.test(it.stem || '')) out.push('reading-blank');
  if (/다음과 같은 뜻/.test(it.stem || '')) out.push('reading-meaning');
  return out;
}

function exerciseShape(ex) {
  if (ex.type === 'build') return ['word-order'];
  if (ex.type === 'listen') return ['listening-word'];
  return [];
}

function stampTags(d) {
  // tag -> the review keys that carry it, so a weak spot can be practised.
  const by = {};
  const add = (tags, key) => {
    if (!key) return;
    for (const t of tags) (by[t] || (by[t] = new Set())).add(key);
  };

  for (const u of d.units) {
    u.exercises.forEach((ex, i) => {
      ex.tags = uniq([...(u.tags || []), ...exerciseShape(ex), ...(ex.tags || [])]);
      add(ex.tags, unitKey(u.id, i));
    });
  }
  for (const dr of d.drills) {
    dr.items.forEach((it, i) => {
      it.tags = uniq([...(dr.tags || []), ...examShape(it), ...(it.tags || [])]);
      add(it.tags, drillKey(dr.id, i));
    });
  }
  for (const tr of d.trades) {
    tr.items.forEach((it, i) => {
      it.tags = uniq([...(tr.tags || []), ...examShape(it), ...(it.tags || [])]);
      add(it.tags, tradeKey(tr.id, i));
    });
    for (const w of tr.words) {
      w.tags = uniq([...(tr.tags || []), ...(w.tags || [])]);
      add(w.tags, vocabKey(w.ko));
    }
  }
  for (const set of d.sets) {
    for (const w of set.words) {
      w.tags = uniq([...(set.tags || []), ...(w.tags || [])]);
      add(w.tags, vocabKey(w.ko));
    }
  }
  // Paper items are tagged so a paper still tells you where you are losing
  // marks, but they carry no review key — nothing in a timed paper is scheduled.
  for (const m of d.mocks) {
    for (const section of ['listening', 'reading']) {
      for (const it of (m[section] || [])) it.tags = uniq([...examShape(it), ...(it.tags || [])]);
    }
  }

  d.byTag = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v]]));
}

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
    const hit = d.wordIndex[a];
    if (!hit) return null;
    return { key, kind, word: hit.word, set: hit.group, from: hit.group.title };
  }
  if (kind === 't') {
    const tr = d.tradeById[a];
    if (!tr || !tr.items[+b]) return null;
    return { key, kind, item: tr.items[+b], trade: tr, from: tr.title };
  }
  if (kind === 'd') {
    const dr = d.drillById[a];
    if (!dr || !dr.items[+b]) return null;
    return { key, kind, item: dr.items[+b], drill: dr, from: dr.title };
  }
  return null;
}

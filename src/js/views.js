import { h, clear, shuffle, icon, today } from './util.js';
import * as store from './store.js';
import * as tts from './tts.js';
import { load, data, LEVELS, unitKey, vocabKey, drillKey, tradeKey, isExamKey, isKoreanKey, resolve } from './data.js';
import { Quiz, fromExercise, fromExamItem, fromWord, speakBtn } from './quiz.js';
import { lessons as alphabetLessons, lessonCards, lessonQuestions, letterQuestion, readQuestion, syllableQuestion, changeQuestion, syllableKey } from './alphabet.js';
import { t } from './i18n.js';
import { runMock } from './mock.js';
import { Deck, unitCards, hidden } from './deck.js';

const nav = (to) => { location.hash = to; };

// Who made it — the copyright holder in LICENSE. One place, so the credit on
// screen and the licence can never name two different people.
const AUTHOR = 'DOUBLEEM';

function head(root, title, opts = {}) {
  if (opts.tone) root.style.setProperty('--c', `var(--c-${opts.tone})`);
  if (opts.tone) root.style.setProperty('--cw', `var(--cw-${opts.tone})`);
  const bar = h('div', { class: 'topbar' });
  // No wordmark. The app's name is on the icon you tapped to get here, and
  // repeating it above every screen only pushes the thing you came for further
  // down. Screens that can go back get the back button; the rest get nothing on
  // the left, and the bar stays for its height and the safe-area padding.
  if (opts.back) {
    bar.append(h('button', { class: 'back', 'aria-label': t('back'), onclick: () => nav(opts.back) }, icon('back')));
  }
  bar.append(h('span', { class: 'spacer' }));
  if (opts.right) bar.append(opts.right);
  root.append(bar);
  if (title) root.append(h('h2', {}, title));
  return root;
}

/* One card, used everywhere.
 *
 * The old design had three shapes doing this job — a text card, a row, and a
 * hero — which is most of why the app looked unplanned. This is the only card:
 * an icon tile in the section's colour, a title, an optional subtitle, and a
 * chevron. `tone` sets --c and --cw so everything inside follows one colour.
 */
function tile({ tone = 'today', icon: ic, glyph, meta, title, sub, subKo, desc, onclick, hero, i, progress }) {
  const el = h('button', {
    class: `card pressable${hero ? ' card--hero' : ''}`,
    style: `--c: var(--c-${tone}); --cw: var(--cw-${tone}); --i:${i ?? 0}`,
    onclick,
  });
  // A glyph rather than an icon, for the one card where the subject IS a
  // letter. Set as real text in the Korean font: drawn as SVG strokes it comes
  // out as a syllable that does not exist, which is exactly the thing a learner
  // of 한글 should never be shown.
  if (glyph && !hero) {
    el.append(h('span', { class: 'card__icon' }, h('span', { class: 'glyph ko' }, glyph)));
  } else if (ic && !hero) {
    const box = h('span', { class: 'card__icon' });
    box.append(icon(ic));
    el.append(box);
  }
  const body = h('span', { class: 'card__body' });
  if (meta) body.append(h('span', { class: 'card__meta' }, meta));
  body.append(h('span', { class: 'card__title' }, title));
  if (subKo) body.append(h('span', { class: 'card__sub ko' }, subKo));
  if (sub) body.append(h('span', { class: 'card__desc' }, sub));
  if (desc) body.append(h('span', { class: 'card__desc' }, desc));
  el.append(body);
  if (progress !== undefined) {
    body.append(h('span', { class: 'bar', style: 'display:block' }, h('i', { style: `width:${Math.round(progress * 100)}%` })));
  }
  if (!hero) {
    const c = icon('chev'); c.setAttribute('class', 'card__chev'); el.append(c);
  }
  return el;
}

// A ring rather than a bar, once, on the home screen. It is the only place the
// app shows overall progress, so it is allowed to be the biggest thing there.
function ring(done, total, label) {
  const R = 39, C = 2 * Math.PI * R;
  const pct = total ? done / total : 0;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 96 96');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    `<circle class="track" cx="48" cy="48" r="${R}"/>` +
    `<circle class="fill" cx="48" cy="48" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="--dash:${C}"/>`;
  return h('div', { class: 'ring', style: '--c: var(--c-course)' }, svg,
    h('div', {},
      h('p', { class: 'ring__pct' }, `${done} / ${total}`),
      h('p', { class: 'ring__label' }, label)));
}

// The list row: a number or marker, a title, a subtitle, a chevron. Used for
// course units and vocabulary sets so both read as one list idiom.
function row({ num, done, title, sub, subMuted, onclick }) {
  return h('button', { class: 'row', onclick },
    num !== undefined ? h('span', { class: 'row__num', 'data-done': done ? '1' : '0' }, num) : null,
    h('span', { class: 'row__body' },
      h('span', { class: 'row__title' }, title),
      sub ? h('span', { class: subMuted ? 'row__sub row__sub--muted' : 'row__sub ko' }, sub) : null),
    (() => { const s = icon('chev'); s.setAttribute('class', 'row__chev'); return s; })());
}

// The word list, shared by the vocabulary sets and the trades. Both show the
// same four things — the Korean with a speaker, the romanization if it is
// switched on, the English, and one example sentence.
function wordList(words, { hide = false } = {}) {
  const list = h('div');
  for (const w of words) {
    list.append(h('div', { class: 'word' },
      h('div', { class: 'word__ko ko' }, w.ko, speakBtn(w.ko)),
      (w.rom && store.get().rom) ? h('div', { class: 'word__rom' }, w.rom) : null,
      // Covered, the English is something you ask for; uncovered it is something
      // you read instead of the Korean. Which one this is, is the learner's call.
      hide ? hidden(w.en, { cls: 'reveal reveal--sm' }) : h('div', { class: 'word__en' }, w.en),
      // The example's English has to go behind the same tap. Covering only the
      // gloss leaves the answer sitting one line below it, which makes the whole
      // exercise pointless — the Korean still never has to be read.
      w.ex
        ? (hide
            ? h('div', { class: 'word__ex' }, h('b', { class: 'ko' }, w.ex), hidden(w.exEn, { cls: 'reveal reveal--sm' }))
            : h('div', { class: 'word__ex' }, h('b', { class: 'ko' }, w.ex), ' — ', w.exEn))
        : null,
    ));
  }
  return list;
}

/* ---------------- today ---------------- */

/* The path through the app.
 *
 * Alphabet, then the course, then the exam. Nothing is locked — someone who
 * can already read can go straight to unit one — but the home screen always
 * names ONE next thing, because "what do I do now?" is the question a tired
 * learner opening the app actually has. The alphabet comes first because every
 * other screen is written in it.
 */
function nextStep(d, s) {
  const ls = alphabetLessons(d);
  const n = ls.findIndex(l => !s.letters[l.id]);
  if (n >= 0) {
    return {
      tone: 'hangeul', route: `#/hangeul/lesson/${ls[n].id}`,
      meta: `The alphabet · lesson ${n + 1} of ${ls.length}`,
      title: ls[n].title,
      desc: n === 0
        ? 'Start here. Every other screen in this app is written in 한글, and a few short lessons are enough to read it.'
        : 'Finish the alphabet and the rest of the app opens up.',
    };
  }
  const u = d.units.find(x => !s.done[x.id]);
  if (u) {
    return {
      tone: 'course', route: `#/course/${u.id}`,
      meta: `Course · unit ${u.order} of ${d.units.length}`,
      title: u.title, desc: u.goal,
    };
  }
  return {
    tone: 'exam', route: '#/exam',
    meta: 'The course is done',
    title: 'Practise for the paper',
    desc: 'The question types, then a full paper against the clock.',
  };
}

export async function home(root) {
  const d = await load();
  const s = store.get();
  const due = store.dueCount(isKoreanKey);
  const doneCount = d.units.filter(u => s.done[u.id]).length;
  const ls = alphabetLessons(d);
  const lettersDone = ls.filter(l => s.letters[l.id]).length;
  const words = d.sets.reduce((n, x) => n + x.words.length, 0);
  const examDue = store.dueCount(isExamKey);
  const next = nextStep(d, s);

  head(root, null, {
    right: s.streak.count
      ? h('span', { class: 'streak' }, icon('flame'), `${s.streak.count}`)
      : null,
  });

  const wrap = h('div', { class: 'stagger' });
  root.append(wrap);

  const fresh = !lettersDone && !doneCount && !Object.keys(s.srs).length;
  wrap.append(h('h2', { style: '--i:0' }, due ? t('reviewNow', due) : fresh ? '어서 오세요 — welcome' : 'What shall we do today?'));
  wrap.append(h('p', { class: 'lead', style: '--i:1' }, due
    ? 'These are the things you got wrong, or learned a while ago. Five minutes here is worth an hour of new material.'
    : fresh
      ? 'Start with the alphabet, then the course. The exam practice is there when you are ready for it.'
      : 'Nothing is due for review. Here is the next thing to learn.'));

  if (due) {
    wrap.append(tile({
      tone: 'review', hero: true, i: 2,
      meta: `${due} ${due === 1 ? 'item' : 'items'} due`,
      title: 'Review now',
      desc: 'What you have learned, brought back at widening gaps.',
      onclick: () => nav('#/review'),
    }));
  }
  // With a review waiting, that is the hero and the next lesson waits its turn
  // as an ordinary card — two heroes is no hero.
  wrap.append(tile({
    tone: next.tone, hero: !due, i: 2,
    icon: due ? (next.tone === 'hangeul' ? null : next.tone) : null,
    glyph: due && next.tone === 'hangeul' ? '가' : null,
    meta: `Next · ${next.meta}`, title: next.title,
    desc: due ? null : next.desc, sub: due ? next.desc : null,
    onclick: () => nav(next.route),
  }));
  // "Carry on" is for somewhere you left off. An alphabet lesson already
  // finished is not that — it is where you last WERE, which is not the same.
  const lastLesson = s.last && s.last.route.match(/^#\/hangeul\/lesson\/([\w-]+)$/);
  const stale = lastLesson && s.letters[lastLesson[1]];
  if (s.last && s.last.route !== next.route && !stale) {
    wrap.append(tile({
      tone: 'today', icon: 'play', i: 2,
      meta: t('carryOn'), title: s.last.label,
      onclick: () => nav(s.last.route),
    }));
  }

  // In the order they are meant to be learned.
  const grid = h('div', { class: 'grid2', style: '--i:3' });
  grid.append(
    tile({ tone: 'hangeul', glyph: '가', title: t('letters'),
           meta: `${lettersDone} of ${ls.length} lessons`,
           sub: lettersDone === ls.length ? 'Done. The chart is there to look things up.' : 'Learn to read first.',
           onclick: () => nav('#/hangeul') }),
    tile({ tone: 'course', icon: 'course', title: t('course'),
           meta: `${doneCount} of ${d.units.length} units`, sub: 'Grammar, first sentence to contract.',
           onclick: () => nav('#/course') }),
  );
  wrap.append(grid);

  const grid2 = h('div', { class: 'grid2', style: '--i:4' });
  grid2.append(
    tile({ tone: 'vocab', icon: 'vocab', title: t('vocab'), meta: `${words} words`,
           sub: 'Work, safety, money, the body.', onclick: () => nav('#/vocab') }),
    tile({ tone: 'exam', icon: 'exam', title: 'EPS-TOPIK',
           meta: examDue ? `${examDue} to go over` : 'Exam practice',
           sub: 'The paper\u2019s question types, and timed papers.',
           onclick: () => nav('#/exam') }),
  );
  wrap.append(grid2);

  // Only once a trade is set. Before that it is one of eight groups most people
  // do not need, and it belongs behind the exam screen rather than on the home
  // page competing with the course.
  const myTrade = s.trade ? d.tradeById[s.trade] : null;
  // The stagger delay is --i * 42ms, so the indices from here down have to stay
  // contiguous whether or not the trade card is there — a gap reads as a stutter.
  let i = 5;
  if (myTrade) {
    wrap.append(tile({
      tone: 'trade', icon: myTrade.icon || 'trade', i: i++,
      meta: `${myTrade.titleKo} · ${t('trade')}`,
      title: myTrade.title, sub: myTrade.blurb,
      onclick: () => nav(`#/trade/${myTrade.id}`),
    }));
  }

  // Only once it can name something, and only the single worst — a list of
  // failings on the home screen is a reason to close the app.
  const spots = store.tagStats();
  const top = spots.find(x => d.tags[x.id] && x.pct < 0.8);
  if (top) {
    wrap.append(tile({
      tone: 'review', icon: 'target', i: i++,
      meta: `${Math.round(top.pct * 100)}% right · ${top.n} answers`,
      title: 'Weak spot: ' + d.tags[top.id].label,
      sub: 'The app has been counting what each question was about. This is the one you miss most.',
      onclick: () => nav('#/weak'),
    }));
  }

  wrap.append(h('h3', { style: `--i:${i++}` }, 'Your progress'));
  const ringRow = h('div', { class: 'card', style: `--i:${i++}; --c: var(--c-course); display:block; padding: var(--s5)` });
  ringRow.append(ring(doneCount, d.units.length, 'units finished'));
  wrap.append(ringRow);

  const stats = h('div', { class: 'stats', style: `--i:${i++}` });
  stats.append(
    h('div', { class: 'stat', style: '--c: var(--c-review)' }, h('b', {}, s.answered.right), h('span', {}, t('correct'))),
    h('div', { class: 'stat', style: '--c: var(--c-today)' }, h('b', {}, s.streak.best || 0), h('span', {}, t('best'))),
    h('div', { class: 'stat', style: '--c: var(--c-vocab)' }, h('b', {}, Object.keys(s.srs).length), h('span', {}, 'in the deck')),
  );
  wrap.append(stats);

  const warn = tts.missingVoiceNote();
  if (warn) wrap.append(h('div', { class: 'note', style: `--i:${i++}; --c: var(--c-exam); margin-top: var(--s5)` }, warn));
}

/* ---------------- hangeul ---------------- */

// Every letter, by its character, so a chart cell can find its own detail.
function letterIndex(d) {
  const m = {};
  for (const g of d.hangeul.groups) for (const L of g.letters) m[L.ch] = L;
  return m;
}

/* What a letter opens into.
 *
 * A tile that only plays a sound teaches the sound and nothing else. This shows
 * the three things that actually make a letter stick: what it is built from,
 * what it sounds like, and one real word you will meet it in.
 */
function letterSheet(L, idx) {
  const wrap = h('div', { class: 'sheetcard' });
  wrap.append(h('div', { class: 'sheetcard__glyph ko' }, L.ch));
  wrap.append(h('p', { class: 'sheetcard__rom' }, L.rom));
  if (L.say) {
    wrap.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn btn--ghost', onclick: () => tts.say(L.say || L.ch) },
        'Say it — ', h('span', { class: 'ko' }, L.say))));
  }
  wrap.append(h('p', { class: 'deck__text' }, L.hint));
  if (L.from && idx[L.from]) {
    wrap.append(h('p', { class: 'tiny' },
      'Built from ', h('b', { class: 'ko' }, L.from), ` — ${idx[L.from].rom}.`));
  }
  if (L.ex) {
    wrap.append(h('hr', { class: 'hr' }));
    wrap.append(h('p', { class: 'deck__label' }, 'In a word'));
    wrap.append(h('div', { class: 'deck__ko ko' }, h('span', {}, L.ex.ko), speakBtn(L.ex.ko)));
    if (store.get().rom) wrap.append(h('p', { class: 'deck__rom' }, L.ex.rom));
    wrap.append(h('p', { class: 'deck__text' }, L.ex.en));
  }
  return wrap;
}

export async function hangeul(root) {
  const d = await load();
  const s = store.get();
  head(root, t('letters'), { back: '#/', tone: 'hangeul' });
  root.append(h('p', { class: 'lead' }, d.hangeul.intro));

  // The lessons come first: they are how the alphabet is learned. Everything
  // below them — the chart, the families, the rules — is for looking things up.
  const ls = alphabetLessons(d);
  if (ls.length) {
    const done = ls.filter(l => s.letters[l.id]).length;
    const nextIdx = ls.findIndex(l => !s.letters[l.id]);
    root.append(h('h3', {}, `Lessons · ${done} of ${ls.length}`));
    root.append(h('div', { class: 'bar', style: '--c: var(--c-hangeul)' }, h('i', { style: `width:${(done / ls.length) * 100}%` })));
    ls.forEach((l, n) => {
      const rec = s.letters[l.id];
      const first = (d.hangeul.groups.find(g => g.id === l.groups[0]) || {}).letters;
      root.append(tile({
        tone: 'hangeul', i: n, hero: n === nextIdx,
        glyph: first && first.length ? first[0].ch : l.kind === 'changes' ? '음' : '받',
        meta: `Lesson ${n + 1}${rec ? ` · done · ${Math.round(rec.score * 100)}%` : n === nextIdx ? ' · up next' : ''}`,
        title: l.title, subKo: l.titleKo,
        onclick: () => nav(`#/hangeul/lesson/${l.id}`),
      }));
    });
    root.append(h('h3', {}, 'Look it up'));
  }

  if (d.hangeul.chart) {
    root.append(tile({
      tone: 'hangeul', glyph: '한', hero: true,
      meta: '40 letters, one page',
      title: 'The chart',
      desc: 'Every letter laid out by family, so you can see which ones are the same shape with something added.',
      onclick: () => nav('#/hangeul/chart'),
    }));
  }

  const idx = letterIndex(d);
  const detail = h('div', { class: 'detail' });

  for (const g of d.hangeul.groups) {
    root.append(h('h3', {}, `${g.title} · `, h('span', { class: 'ko' }, g.titleKo)));
    root.append(h('p', { class: 'tiny' }, g.blurb));
    const tiles = h('div', { class: 'tiles' });
    for (const L of g.letters) {
      tiles.append(h('button', {
        class: 'tile', type: 'button', title: L.hint,
        onclick: () => { tts.say(L.say || L.ch); clear(detail).append(letterSheet(L, idx)); detail.scrollIntoView({ block: 'nearest' }); },
      }, h('b', {}, L.ch), h('span', {}, L.rom)));
    }
    root.append(tiles);
  }
  root.append(detail);

  for (const b of d.hangeul.blocks) {
    root.append(h('h3', {}, b.title));
    for (const r of b.rules) root.append(h('p', { class: 'note' }, r));
  }

  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--wide', onclick: () => nav('#/hangeul/drill') }, 'Mixed reading practice')));
  store.markSeen('hangeul');
}

export async function hangeulLesson(root, id) {
  const d = await load();
  const ls = alphabetLessons(d);
  const n = ls.findIndex(l => l.id === id);
  if (n < 0) return nav('#/hangeul');
  const l = ls[n];
  store.setLast(`#/hangeul/lesson/${id}`, `${t('letters')} · ${l.title}`);
  head(root, null, { back: '#/hangeul', tone: 'hangeul' });
  root.append(h('p', { class: 'kicker' }, `Lesson ${n + 1} of ${ls.length}`));
  const box = h('div', { class: 'deck' });
  root.append(box);
  new Deck(box, lessonCards(d, l), { onDone: () => nav(`#/hangeul/lesson/${id}/practice`) });
}

export async function hangeulPractice(root, id) {
  const d = await load();
  const ls = alphabetLessons(d);
  const n = ls.findIndex(l => l.id === id);
  if (n < 0) return nav('#/hangeul');
  head(root, null, { back: `#/hangeul/lesson/${id}`, tone: 'hangeul' });
  root.append(h('p', { class: 'kicker' }, ls[n].title));
  const box = h('div', { class: 'q' });
  root.append(box);
  new Quiz(box, lessonQuestions(d, n), {
    title: ls[n].title,
    onDone: (r) => {
      store.markLetters(id, r.right / r.total);
      // Straight on to the next lesson's walk-through; after the last one,
      // back to the alphabet page, where the course is the next thing named.
      const next = ls[n + 1];
      nav(next ? `#/hangeul/lesson/${next.id}` : '#/hangeul');
    },
  });
}

export async function hangeulChart(root) {
  const d = await load();
  const ch = d.hangeul.chart;
  if (!ch) return nav('#/hangeul');
  head(root, 'The chart', { back: '#/hangeul', tone: 'hangeul' });
  root.append(h('p', { class: 'lead' }, ch.note));

  const idx = letterIndex(d);
  const detail = h('div', { class: 'detail' });

  for (const sec of ch.sections) {
    root.append(h('h3', {}, `${sec.title} · `, h('span', { class: 'ko' }, sec.titleKo)));
    const grid = h('div', { class: 'chart' });
    sec.rows.forEach((row, r) => {
      grid.append(h('div', { class: 'chart__lab' }, sec.rowLabels[r] || ''));
      const line = h('div', { class: 'chart__row', style: `--cols:${row.length}` });
      for (const c of row) {
        if (!c) { line.append(h('span', { class: 'chart__gap' })); continue; }
        const L = idx[c];
        line.append(h('button', {
          class: 'chart__cell', type: 'button', title: L ? L.hint : c,
          onclick: () => {
            tts.say((L && L.say) || c);
            clear(detail).append(letterSheet(L || { ch: c, rom: '', hint: '' }, idx));
            detail.scrollIntoView({ block: 'nearest' });
          },
        }, h('b', { class: 'ko' }, c), h('span', {}, L ? L.rom : '')));
      }
      grid.append(line);
    });
    root.append(grid);
  }

  root.append(detail);
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--wide', onclick: () => nav('#/hangeul/drill') }, 'Read these out loud')));
}

export async function hangeulDrill(root) {
  const d = await load();
  head(root, null, { back: '#/hangeul' });
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = shuffle(d.hangeul.drills).slice(0, 12).map(x => readQuestion(d, x.ko, syllableKey(x.ko))).filter(Boolean);
  new Quiz(box, qs, { title: 'Reading practice', onDone: () => nav('#/hangeul') });
}

/* ---------------- course ---------------- */

export async function course(root) {
  const d = await load();
  const s = store.get();
  head(root, t('course'), { back: '#/', tone: 'course' });
  root.append(h('p', { class: 'lead' }, 'Twenty-four units. Each one is a short explanation, five real sentences, then practice. Work through them in order — later units lean on earlier ones.'));

  // Not a lock. Someone who reads already can start at unit one; someone who
  // cannot should be told plainly where to begin.
  const ls = alphabetLessons(d);
  const lettersLeft = ls.filter(l => !s.letters[l.id]).length;
  if (lettersLeft) {
    root.append(tile({
      tone: 'hangeul', glyph: '가',
      meta: 'Before unit 1',
      title: 'Learn to read 한글 first',
      sub: `Every sentence here is in 한글. ${lettersLeft === ls.length ? `${ls.length} short lessons` : `${lettersLeft} lesson${lettersLeft === 1 ? '' : 's'} left`} — skip this if you can already read it.`,
      onclick: () => nav('#/hangeul'),
    }));
  }
  const upNext = d.units.find(u => !s.done[u.id]);
  if (upNext && !lettersLeft) {
    root.append(tile({
      tone: 'course', hero: true,
      meta: `Up next · unit ${upNext.order}`,
      title: upNext.title, desc: upNext.goal,
      onclick: () => nav(`#/course/${upNext.id}`),
    }));
  }

  for (const lv of LEVELS) {
    const units = d.units.filter(u => u.level === lv.id);
    const done = units.filter(u => s.done[u.id]).length;
    root.append(h('h3', {}, `${lv.title} · `, h('span', { class: 'ko' }, lv.titleKo)));
    root.append(h('p', { class: 'tiny' }, lv.blurb));
    root.append(h('div', { class: 'bar', style: '--c: var(--c-course)' }, h('i', { style: `width:${(done / units.length) * 100}%` })));
    units.forEach((u, n) => {
      root.append(tile({
        tone: 'course', i: n,
        meta: `${t('unit') || 'Unit'} ${String(u.order).padStart(2, '0')}${s.done[u.id] ? ' · done' : ''}`,
        title: u.title, subKo: u.form,
        icon: s.done[u.id] ? 'check' : 'course',
        onclick: () => nav(`#/course/${u.id}`),
      }));
    });
  }
}

export async function lesson(root, id) {
  const d = await load();
  const u = d.unitById[id];
  if (!u) return nav('#/course');
  store.setLast(`#/course/${id}`, u.title);
  head(root, u.title, { back: '#/course' });

  const box = h('div', { class: 'lesson' });
  box.append(h('p', { class: 'lesson__form ko' }, u.form));
  box.append(h('p', { class: 'lead' }, u.goal));

  // The walk-through is the way in; this page stays as the reference you come
  // back to. Both exist because they are for different moments — meeting the
  // grammar, and looking it up again three weeks later.
  box.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--accent btn--wide', onclick: () => nav(`#/course/${id}/learn`) },
      'Walk me through it')));

  for (const p of u.explain) box.append(h('p', {}, p));

  if (u.table) {
    const tb = h('table');
    tb.append(h('thead', {}, h('tr', {}, ...u.table.head.map(x => h('th', {}, x)))));
    tb.append(h('tbody', {}, ...u.table.rows.map(r => h('tr', {}, ...r.map(c => h('td', {}, c))))));
    box.append(h('div', { class: 'tablewrap' }, tb));
  }

  if (u.pairs && u.pairs.length) {
    box.append(h('h3', {}, 'What changes'));
    for (const pr of u.pairs) {
      box.append(h('div', { class: 'ex' },
        h('div', { class: 'ex__ko ko' }, h('span', {}, pr.a), speakBtn(pr.a)),
        h('div', { class: 'ex__en' }, pr.aEn),
        h('div', { class: 'ex__ko ko' }, h('span', {}, pr.b), speakBtn(pr.b)),
        h('div', { class: 'ex__en' }, pr.bEn),
        h('p', { class: 'tiny' }, pr.note),
      ));
    }
  }

  box.append(h('h3', {}, 'Sentences'));
  for (const ex of u.examples) {
    box.append(h('div', { class: 'ex' },
      h('div', { class: 'ex__ko ko' }, h('span', {}, ex.ko), speakBtn(ex.ko)),
      (ex.rom && store.get().rom) ? h('div', { class: 'ex__rom' }, ex.rom) : null,
      h('div', { class: 'ex__en' }, ex.en),
    ));
  }

  if (u.notes && u.notes.length) {
    box.append(h('h3', {}, 'Worth knowing'));
    for (const n of u.notes) box.append(h('p', { class: 'note' }, n));
  }

  box.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--wide', onclick: () => nav(`#/course/${id}/practice`) }, t('practice'))));
  root.append(box);
}

export async function lessonLearn(root, id) {
  const d = await load();
  const u = d.unitById[id];
  if (!u) return nav('#/course');
  store.setLast(`#/course/${id}/learn`, u.title);
  head(root, null, { back: `#/course/${id}`, tone: 'course' });
  root.append(h('p', { class: 'kicker' }, u.title));
  const box = h('div', { class: 'deck' });
  root.append(box);
  new Deck(box, unitCards(u), { onDone: () => nav(`#/course/${id}/practice`) });
}

export async function lessonPractice(root, id) {
  const d = await load();
  const u = d.unitById[id];
  if (!u) return nav('#/course');
  head(root, null, { back: `#/course/${id}` });
  root.append(h('p', { class: 'kicker ko' }, u.form));
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = shuffle(u.exercises.map((ex, i) => fromExercise(ex, unitKey(u.id, i))));
  new Quiz(box, qs, {
    title: u.title,
    onDone: (r) => { store.markLesson(u.id, r.right / r.total); nav('#/course'); },
  });
}

/* ---------------- vocabulary ---------------- */

export async function vocab(root) {
  const d = await load();
  head(root, t('vocab'), { back: '#/' });
  const st = store.get();
  root.append(h('p', { class: 'lead' }, 'Grouped by where you will hear them. Learn a set alongside the course — the first few are the ones a workplace needs soonest.'));
  d.sets.forEach((set, n) => {
    // A word counts once it has been answered: that is when it enters review.
    const met = set.words.filter(w => st.srs[vocabKey(w.ko)]).length;
    root.append(tile({
      tone: 'vocab', i: n, icon: met === set.words.length ? 'check' : 'vocab',
      meta: `${set.words.length} ${t('words')}${met ? ` · ${met} practised` : ''}`,
      progress: met ? met / set.words.length : undefined,
      title: set.title, subKo: set.titleKo,
      onclick: () => nav(`#/vocab/${set.id}`),
    }));
  });
}

export async function vocabSet(root, id) {
  const d = await load();
  const s = d.setById[id];
  if (!s) return nav('#/vocab');
  store.setLast(`#/vocab/${id}`, s.title);
  head(root, s.title, { back: '#/vocab' });
  root.append(h('p', { class: 'kicker ko' }, s.titleKo));
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--accent btn--wide', onclick: () => nav(`#/vocab/${id}/learn`) }, 'Learn these')));
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn', onclick: () => nav(`#/vocab/${id}/drill`) }, 'Drill these'),
    h('button', { class: 'btn btn--ghost', onclick: () => nav(`#/vocab/${id}/listen`) }, 'Listening drill')));

  // Redrawn rather than toggled with a class, because the covered English is a
  // button and the shown one is not — they are different elements, not one
  // element in two states.
  const listBox = h('div');
  let covered = false;
  const toggle = h('button', { class: 'btn btn--ghost' });
  const paint = () => {
    clear(listBox).append(wordList(s.words, { hide: covered }));
    clear(toggle).append(h('span', {}, covered ? 'Show the English' : 'Cover the English'));
  };
  toggle.addEventListener('click', () => { covered = !covered; paint(); });
  paint();
  root.append(h('div', { class: 'btnrow' }, toggle));
  root.append(listBox);
  store.markSeen(s.id);
}

export async function vocabLearn(root, id) {
  const d = await load();
  const set = d.setById[id];
  if (!set) return nav('#/vocab');
  store.setLast(`#/vocab/${id}/learn`, set.title);
  head(root, null, { back: `#/vocab/${id}`, tone: 'vocab' });
  root.append(h('p', { class: 'kicker' }, set.title));
  const box = h('div', { class: 'deck' });
  root.append(box);
  const cards = set.words.map(w => ({ kind: 'word', word: w }));
  new Deck(box, cards, { onDone: () => nav(`#/vocab/${id}/drill`), doneLabel: 'Drill them' });
}

export async function vocabDrill(root, id, mode) {
  const d = await load();
  const s = d.setById[id];
  if (!s) return nav('#/vocab');
  head(root, null, { back: `#/vocab/${id}` });
  root.append(h('p', { class: 'kicker' }, s.title));
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = shuffle(s.words).slice(0, 12).map(w => fromWord(w, s.words, vocabKey(w.ko), mode));
  new Quiz(box, qs, { title: s.title, onDone: () => nav(`#/vocab/${id}`) });
}

/* ---------------- exam ---------------- */

/* The exam section is a different job from the course.
 *
 * The course teaches Korean. This teaches the PAPER: its question types, its
 * timing, the job-related questions. So it is laid out as exam preparation —
 * the shapes first, then whole papers — and what you get wrong here is gone
 * over here, not mixed into the Review tab with the language itself.
 */
export async function exam(root) {
  const d = await load();
  const s = store.get();
  head(root, 'EPS-TOPIK', { back: '#/', tone: 'exam' });
  root.append(h('p', { class: 'lead' }, 'Practice for the paper itself: forty questions, twenty listening and twenty reading, in fifty minutes. The Korean is taught in the course; this is where you learn the test.'));

  const ls = alphabetLessons(d);
  if (ls.some(l => !s.letters[l.id])) {
    root.append(h('div', { class: 'note', style: '--c: var(--c-hangeul)' },
      'The paper is written entirely in 한글, with no English and no romanization. If you cannot read it yet, the alphabet lessons come first.',
      h('div', { class: 'btnrow' }, h('button', { class: 'btn btn--ghost', onclick: () => nav('#/hangeul') }, 'Go to the alphabet'))));
  }

  const due = store.dueCount(isExamKey);
  if (due) {
    root.append(tile({
      tone: 'exam', hero: true,
      meta: `${due} ${due === 1 ? 'question' : 'questions'} to go over`,
      title: 'Go over what you missed',
      desc: 'Exam questions you got wrong, or answered a while ago, come back here at widening gaps.',
      onclick: () => nav('#/exam/review'),
    }));
  }

  if (d.guide.sections.length) {
    root.append(tile({
      tone: 'exam', icon: 'clock',
      meta: `${d.guide.sections.length} short reads`,
      title: t('guide'),
      sub: 'What is on the paper, how it is marked, and where the fifty minutes go.',
      onclick: () => nav('#/guide'),
    }));
  }

  // Step 1: the question types, each with your best score so far.
  const tried = d.drills.filter(dr => s.drills[dr.id]).length;
  root.append(h('h3', {}, `1 · ${t('drills')}`));
  root.append(h('p', { class: 'tiny' }, `Every question on the paper is one of these ${d.drills.length} shapes. ${tried ? `You have tried ${tried} of them.` : 'Learn each shape before sitting a whole paper.'}`));
  d.drills.forEach((dr, n) => {
    const rec = s.drills[dr.id];
    root.append(tile({
      tone: 'exam', i: n,
      icon: rec && rec.best === rec.total ? 'check' : dr.section === 'listening' ? 'sound' : 'target',
      meta: `${dr.section === 'listening' ? '듣기 listening' : '읽기 reading'} · ${dr.items.length}${rec ? ` · best ${rec.best}/${rec.total}` : ''}`,
      title: dr.title, sub: dr.blurb,
      onclick: () => nav(`#/exam/drill/${dr.id}`),
    }));
  });

  if (d.trades.length) {
    const mine = s.trade ? d.tradeById[s.trade] : null;
    const qs = d.trades.reduce((a, x) => a + x.items.length, 0);
    root.append(h('h3', {}, `${t('trades')} · 업종별`));
    root.append(tile({
      tone: 'trade', icon: mine ? (mine.icon || 'trade') : 'trade',
      meta: mine ? `${mine.titleKo} — ${t('trade')}` : `${d.trades.length} groups · ${qs} ${t('questions')}`,
      title: mine ? mine.title : 'The eight job groups',
      sub: mine
        ? 'Your trade. The practice paper adds questions from it.'
        : 'Only for manufacturing applicants, who answer job-related questions from one of these. Pick yours in Settings.',
      onclick: () => nav('#/trades'),
    }));
  }

  // Step 2: whole papers, against the clock.
  root.append(h('h3', {}, `2 · ${t('paper')}`));
  d.mocks.forEach((m, n) => {
    const prev = s.mocks.find(x => x.id === m.id);
    root.append(tile({
      tone: 'exam', hero: true, i: n,
      meta: `40 ${t('questions')} · ${m.minutes} ${t('minutes')}${prev ? ` · last ${prev.score}/${prev.max}` : ''}`,
      title: m.title, desc: 'A full paper against a clock that does not stop.',
      onclick: () => nav(`#/exam/paper/${m.id}`),
    }));
  });

  if (s.mocks.length) {
    root.append(h('p', { class: 'kicker', style: 'margin-top: var(--s5)' }, 'Your papers'));
    for (const m of s.mocks.slice(0, 8)) {
      root.append(h('p', { class: 'tiny' }, `${m.at} — ${m.score}/${m.max} (listening ${m.listening}/100, reading ${m.reading}/100)`));
    }
  }

  if (d.listening.length) {
    const n = d.listening.reduce((a, x) => a + (x.tracks || []).length, 0);
    root.append(h('h3', {}, t('listening')));
    root.append(tile({
      tone: 'exam', icon: 'sound',
      meta: `${n} ${n === 1 ? 'track' : 'tracks'} · 한국산업인력공단`,
      title: 'Official listening files',
      sub: 'The EPS-TOPIK listening set from every unit of the standard textbook, as published.',
      onclick: () => nav('#/listening'),
    }));
  }

  root.append(h('hr', { class: 'hr' }));
  root.append(h('div', { class: 'note', style: '--c: var(--c-exam)' }, 'These questions were written for this app in the shapes the real paper uses. They are practice, not a leaked paper, and the cut score is set by HRD Korea for each round — so the app scores you out of 200 and does not tell you whether you passed.'));
}

export async function examDrill(root, id) {
  const d = await load();
  const dr = d.drillById[id];
  if (!dr) return nav('#/exam');
  store.setLast(`#/exam/drill/${id}`, dr.title);
  head(root, null, { back: '#/exam' });
  root.append(h('p', { class: 'kicker' }, dr.title));
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = dr.items.map((it, i) => fromExamItem(it, drillKey(dr.id, i)));
  new Quiz(box, qs, { title: dr.title, onDone: (r) => { store.recordDrill(dr.id, r.right, r.total); nav('#/exam'); } });
}

export async function examPaper(root, id) {
  const d = await load();
  const m = d.mockById[id];
  if (!m) return nav('#/exam');
  runMock(root, m, { head, nav });
}

/* ---------------- trades (업종별) ---------------- */

/* The eight job groups the exam draws its job-related questions from.
 *
 * Choosing one is optional and the app never nags for it: only manufacturing
 * applicants get these questions at all, and someone going into agriculture or
 * construction would be revising the wrong thing. When a trade IS chosen it is
 * shown first here and its questions are added to the practice paper, which is
 * the arrangement the real paper has.
 */
export async function trades(root) {
  const d = await load();
  const s = store.get();
  head(root, t('trades'), { back: '#/exam', tone: 'trade' });
  root.append(h('p', { class: 'lead' },
    'Eight job groups. An applicant for manufacturing work picks one when they apply, and the job-related questions on their paper come from that one — so revise yours and leave the rest.'));
  root.append(h('div', { class: 'note', style: '--c: var(--c-trade)' },
    'If you are applying for agriculture, fishing, construction or service work, these questions do not appear on your paper: you get common questions in their place. The vocabulary is still worth having if you end up on a factory floor.'));

  const mine = s.trade ? d.tradeById[s.trade] : null;
  if (mine) {
    root.append(h('h3', {}, 'Yours'));
    root.append(tradeTile(mine, 0, true));
  }

  root.append(h('h3', {}, mine ? 'The others' : 'The eight groups'));
  d.trades.filter(x => !mine || x.id !== mine.id).forEach((tr, n) => root.append(tradeTile(tr, n + 1, false)));

  root.append(h('hr', { class: 'hr' }));
  root.append(h('p', { class: 'tiny' },
    'You set your trade in Settings. Nothing here depends on it — it only decides which one is shown first, and which questions the practice paper adds.'));
}

function tradeTile(tr, i, hero) {
  const s = store.get();
  const done = tr.items.filter((_, n) => s.srs[tradeKey(tr.id, n)]).length;
  return tile({
    tone: 'trade', icon: tr.icon || 'trade', hero, i,
    meta: `${tr.titleKo} · ${tr.words.length} ${t('words')} · ${tr.items.length} ${t('questions')}`,
    title: tr.title,
    desc: hero ? tr.about : tr.blurb,
    progress: done / tr.items.length,
    onclick: () => nav(`#/trade/${tr.id}`),
  });
}

export async function trade(root, id) {
  const d = await load();
  const tr = d.tradeById[id];
  if (!tr) return nav('#/trades');
  const s = store.get();
  store.setLast(`#/trade/${id}`, tr.title);

  head(root, null, { back: '#/trades', tone: 'trade' });
  root.append(h('p', { class: 'kicker ko' }, tr.titleKo));
  root.append(h('h2', {}, tr.title));
  root.append(h('p', { class: 'lead' }, tr.about));

  if (s.trade !== tr.id) {
    root.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn btn--ghost', onclick: () => { store.set({ trade: tr.id }); trade(clear(root), id); } },
        'This is my trade')));
  } else {
    root.append(h('div', { class: 'note', style: '--c: var(--c-trade)' },
      'This is the trade you have set. The practice paper adds questions from it, the way the real paper does.'));
  }

  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--accent btn--wide', onclick: () => nav(`#/trade/${id}/drill`) }, t('tradeDrill'))));

  root.append(h('h3', {}, t('tradeWords')));
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--ghost', onclick: () => nav(`#/trade/${id}/words`) }, `Drill the ${tr.words.length} words`)));
  root.append(wordList(tr.words));
}

export async function tradeDrill(root, id) {
  const d = await load();
  const tr = d.tradeById[id];
  if (!tr) return nav('#/trades');
  head(root, null, { back: `#/trade/${id}`, tone: 'trade' });
  root.append(h('p', { class: 'kicker' }, tr.title));
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = tr.items.map((it, i) => fromExamItem(it, tradeKey(tr.id, i)));
  new Quiz(box, shuffle(qs), { title: tr.title, onDone: () => nav(`#/trade/${id}`) });
}

export async function tradeWords(root, id) {
  const d = await load();
  const tr = d.tradeById[id];
  if (!tr) return nav('#/trades');
  head(root, null, { back: `#/trade/${id}`, tone: 'trade' });
  root.append(h('p', { class: 'kicker' }, tr.title));
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = shuffle(tr.words.map(w => fromWord(w, tr.words, vocabKey(w.ko), Math.random() < 0.3 ? 'listen' : 'recall')));
  new Quiz(box, qs, { title: tr.title, onDone: () => nav(`#/trade/${id}`) });
}

/* ---------------- the guide ---------------- */

export async function guide(root) {
  const d = await load();
  head(root, t('guide'), { back: '#/exam', tone: 'exam' });
  if (!d.guide.sections.length) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'The guide is not in this build.')));
    return;
  }
  root.append(h('p', { class: 'lead' }, 'What the paper is, how it is put together, and where the fifty minutes go.'));
  d.guide.sections.forEach((sec, i) => {
    const card = h('div', { class: 'card', style: `--c: var(--c-exam); --cw: var(--cw-exam); --i:${i}; display:block` });
    card.append(h('p', { class: 'card__meta' }, sec.title));
    for (const para of sec.body) card.append(h('p', {}, para));
    root.append(card);
  });
  root.append(h('div', { class: 'note', style: '--c: var(--c-exam)' }, d.guide.note));
}

/* ---------------- building a question from a review key ---------------- */

// One place that turns a stored key back into a question, for the review deck
// and the weak-spot practice alike. `key` is what the answer is scheduled
// under; pass null to ask the question without touching the deck.
function questionFor(r, key) {
  if (r.kind === 'u') return { ...fromExercise(r.ex, key), from: r.from };
  if (r.kind === 'w') return { ...fromWord(r.word, r.set.words, key, Math.random() < 0.3 ? 'listen' : 'recall'), from: r.from };
  if (r.kind === 'd' || r.kind === 't') return { ...fromExamItem(r.item, key), from: r.from };
  if (r.kind === 'h') { const q = syllableQuestion(data(), r.syl, key); return q && { ...q, from: r.from }; }
  if (r.kind === 'l') { const q = letterQuestion(data(), r.ch, key); return q && { ...q, from: r.from }; }
  if (r.kind === 's') { const q = changeQuestion(data(), r.ko, key); return q && { ...q, from: r.from }; }
  return null;
}

/* ---------------- weak spots ---------------- */

/* What you actually get wrong, named.
 *
 * The review deck already brings back the items you missed. It cannot tell you
 * WHY you missed them, because it works on items and an item is just a key. This
 * works on tags, and a tag is a thing you can go and fix: not "you got 14 wrong"
 * but "에 against 에서, four right out of eleven".
 *
 * Two rules keep it honest. Nothing appears until there are enough answers
 * behind it to mean anything — see MIN_ATTEMPTS — and the app never calls a
 * number good or bad, it shows the number and orders the list by it.
 */
export async function weak(root) {
  const d = await load();
  head(root, 'Weak spots', { back: '#/', tone: 'review' });

  const stats = store.tagStats();
  const named = stats.filter(x => d.tags[x.id]);

  if (!named.length) {
    root.append(h('div', { class: 'empty' },
      h('p', {}, 'Not enough answers yet to say anything useful.'),
      h('p', {}, `Every question you answer is counted against what it was about — the grammar it tested, the kind of question it was, the words it used. Once a topic has ${store.MIN_ATTEMPTS} answers behind it, it shows up here with your score on it. Anything less than that is a small sample, not a weak spot.`),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--wide', onclick: () => nav('#/course') }, 'Go and answer some')),
    ));
    return;
  }

  const worst = named.filter(x => x.pct < 0.8);
  root.append(h('p', { class: 'lead' }, worst.length
    ? `${worst.length === 1 ? 'One topic is' : `${worst.length} topics are`} costing you more than the rest. They are ordered worst first.`
    : 'Nothing is standing out as a weak spot. The list is ordered worst first anyway.'));

  const KIND = { grammar: 'Grammar', shape: 'Question type', topic: 'Vocabulary' };
  for (const x of named) {
    const meta = d.tags[x.id];
    const pct = Math.round(x.pct * 100);
    const keys = (d.byTag && d.byTag[x.id]) ? d.byTag[x.id] : [];
    const card = h('div', {
      class: 'card weak',
      style: `--c: var(--c-${x.pct < 0.6 ? 'exam' : x.pct < 0.8 ? 'today' : 'review'})`,
    });
    card.append(h('p', { class: 'card__meta' }, `${KIND[meta.kind] || ''} · ${x.right} of ${x.n} right`));
    card.append(h('p', { class: 'weak__title' }, meta.label));
    if (meta.ko) card.append(h('p', { class: 'weak__ko ko' }, meta.ko));
    card.append(h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })));
    card.append(h('p', { class: 'weak__pct' }, `${pct}%`));
    if (keys.length) {
      card.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost', onclick: () => nav(`#/weak/${x.id}`) },
          `Practise ${Math.min(keys.length, 12)} of these`)));
    }
    root.append(card);
  }

  root.append(h('hr', { class: 'hr' }));
  root.append(h('p', { class: 'tiny' }, `Only topics with at least ${store.MIN_ATTEMPTS} answers behind them appear here. A paper counts too, except for questions you left blank — running out of time is not the same as not knowing the answer, and counting it as one would put the blame in the wrong place.`));
}

export async function weakDrill(root, id) {
  const d = await load();
  const meta = d.tags[id];
  const keys = (d.byTag && d.byTag[id]) ? d.byTag[id] : [];
  if (!meta || !keys.length) return nav('#/weak');
  head(root, null, { back: '#/weak', tone: 'review' });
  root.append(h('p', { class: 'kicker' }, meta.label));

  // Drawn from everywhere that tag appears — a unit exercise, an exam drill, a
  // trade question, a word — because that is what makes it a weak spot rather
  // than one bad afternoon on one screen.
  //
  // Items you have already met come first, and only those are rescheduled.
  // Anything new is asked for practice but kept OUT of the review deck: this
  // screen used to enrol every item it showed, which is how exam and trade
  // questions turned up in the review of someone who had never opened either.
  const srs = store.get().srs;
  const met = shuffle(keys.filter(k => srs[k]));
  const unmet = shuffle(keys.filter(k => !srs[k]));
  const qs = [];
  for (const k of [...met, ...unmet]) {
    if (qs.length >= 12) break;
    const r = resolve(k);
    if (!r) continue;
    const q = questionFor(r, srs[k] ? k : null);
    if (q) qs.push(q);
  }
  if (!qs.length) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'Nothing to practise here any more.')));
    return;
  }
  const box = h('div', { class: 'q' });
  root.append(box);
  new Quiz(box, qs, { title: meta.label, onDone: () => nav('#/weak') });
}

/* ---------------- review ---------------- */

// One runner for both decks. `which` says whose keys it takes.
async function runReview(root, { which, back, title, empty }) {
  await load();
  head(root, title, { back });
  const keys = store.dueKeys(30, which);
  if (!keys.length) {
    root.append(h('div', { class: 'empty' }, ...empty.map(p => h('p', {}, p))));
    return;
  }
  const qs = [];
  for (const k of keys) {
    const r = resolve(k);
    // Content that has gone can never be shown; drop it rather than let it
    // hold the due count up for ever.
    if (!r) { store.forget(k); continue; }
    const q = questionFor(r, k);
    if (q) qs.push(q);
  }
  if (!qs.length) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'Nothing to show — the items due came from content that is no longer here.')));
    return;
  }
  const box = h('div', { class: 'q' });
  root.append(box);
  new Quiz(box, shuffle(qs), { title, onDone: () => nav(back) });
}

// The Korean: alphabet, course and vocabulary. Exam practice is kept apart —
// see exam() — so this deck is only ever the language you have been learning.
export function review(root) {
  return runReview(root, {
    which: isKoreanKey, back: '#/', title: t('review'),
    empty: [
      'Nothing is due today.',
      'Everything you answer in the alphabet, the course and the vocabulary comes back here at a widening gap — one day, three, a week, a fortnight. Get one wrong and it starts again from today.',
      'Exam practice is kept separately, on the EPS-TOPIK screen.',
    ],
  });
}

export function examReview(root) {
  return runReview(root, {
    which: isExamKey, back: '#/exam', title: 'Go over what you missed',
    empty: ['Nothing to go over today.', 'Exam questions you answer come back here at widening gaps, apart from your Korean review.'],
  });
}

/* ---------------- listening library ---------------- */

export async function listening(root) {
  const d = await load();
  head(root, t('listening'), { back: '#/exam', tone: 'exam' });

  if (!d.listening.length) {
    root.append(h('div', { class: 'empty' },
      h('p', {}, 'No official audio is in this build.'),
      h('p', {}, 'Every Korean sentence elsewhere in the app is spoken by your phone, so you do not need these to study. This shelf is for the EPS-TOPIK listening files, which 한국산업인력공단 publishes free at epstopik.hrdkorea.or.kr.'),
      h('p', {}, 'Download 표준교재 1 and 2 듣기파일, then run ', h('code', {}, 'python3 tools/import-eps-audio.py <folder>'), ' and rebuild.'),
    ));
    return;
  }

  const meta = d.listeningMeta || {};
  root.append(h('p', { class: 'lead' },
    'Published by 한국산업인력공단 and used exactly as published — not re-cut, not re-encoded.'));
  if (meta.source) {
    root.append(h('p', { class: 'tiny' }, `${meta.source}${meta.licence ? ' · ' + meta.licence : ''}`));
  }

  for (const set of d.listening) {
    root.append(h('h3', {}, set.title));
    if (set.note) root.append(h('p', { class: 'tiny' }, set.note));

    // Each track is its own block. It used to be built inside a `.card`, which
    // became a flex ROW in the redesign — so every title and player laid itself
    // out as a column and the screen turned into unreadable vertical text.
    (set.tracks || []).forEach((tr, n) => {
      const row = h('div', { class: 'track' });
      row.append(h('p', { class: 'track__name' }, `Unit ${n + 1}`));
      row.append(h('p', { class: 'track__file ko' }, tr.title));
      row.append(h('audio', { controls: true, preload: 'none', src: `content/listening/${tr.file}` }));
      if (tr.script) {
        row.append(h('details', {},
          h('summary', { class: 'tiny' }, 'Script'),
          h('div', { class: 'q__passage' }, tr.script)));
      }
      root.append(row);
    });
  }
}

/* ---------------- settings ---------------- */

export async function me(root, { onLang, onTheme }) {
  await load();
  const s = store.get();
  head(root, t('me'), { back: '#/' });

  root.append(h('label', { class: 'field' }, h('span', {}, 'App language'),
    h('select', { onchange: e => onLang(e.target.value) },
      h('option', { value: 'en', selected: s.lang === 'en' }, 'English'),
      h('option', { value: 'ko', selected: s.lang === 'ko' }, '한국어'))));
  root.append(h('p', { class: 'tiny' }, 'This switches the app’s own buttons and headings. The grammar explanations are written in English — they were written by hand, and a machine translation of a grammar explanation is worse than none.'));

  // Optional, and it says so. Only manufacturing applicants answer job-related
  // questions, so a required picker here would be asking most people to declare
  // something that does not apply to them.
  if (data().trades.length) {
    root.append(h('label', { class: 'field' }, h('span', {}, `${t('trade')} — 업종`),
      h('select', { onchange: e => { store.set({ trade: e.target.value }); } },
        h('option', { value: '', selected: !s.trade }, t('noTrade')),
        ...data().trades.map(tr => h('option', { value: tr.id, selected: s.trade === tr.id },
          `${tr.titleKo} — ${tr.title}`)))));
    root.append(h('p', { class: 'tiny' }, 'If you are applying for a manufacturing job you choose one of these eight groups on your application, and the job-related questions on your paper come from it. Set the same one here and the practice paper will do likewise. Leave it unset for any other kind of work — those papers use common questions instead.'));
  }

  root.append(h('label', { class: 'field' }, h('span', {}, 'Theme'),
    h('select', { onchange: e => onTheme(e.target.value) },
      h('option', { value: 'auto', selected: s.theme === 'auto' }, 'Match the phone'),
      h('option', { value: 'light', selected: s.theme === 'light' }, 'Light'),
      h('option', { value: 'dark', selected: s.theme === 'dark' }, 'Dark'))));

  // Voice and engine, on a phone that has more than one of either.
  if (tts.isNative()) {
    const voiceBox = h('div');
    const drawVoices = () => {
      clear(voiceBox);
      const engs = tts.engines();
      const list = tts.voiceList();
      const now = tts.currentVoice();

      if (engs.length > 1) {
        voiceBox.append(h('label', { class: 'field' }, h('span', {}, 'Speech engine'),
          h('select', { onchange: e => { tts.useEngine(e.target.value); } },
            ...engs.map(en => h('option', {
              value: en.pkg,
              selected: (now.chosenEngine || now.engine) === en.pkg,
            }, en.label)))));
      }

      if (list.length > 1) {
        voiceBox.append(h('label', { class: 'field' }, h('span', {}, 'Korean voice'),
          h('select', { onchange: e => { tts.useVoice(e.target.value); setTimeout(() => tts.say('안녕하세요. 오늘도 수고하셨습니다.'), 350); } },
            ...list.map(v => h('option', { value: v.name, selected: v.name === now.voice },
              `${v.name}${v.quality >= 400 ? ' — high quality' : ''}`)))));
        voiceBox.append(h('p', { class: 'tiny' }, 'Picking one plays it, so you can hear the difference. The app starts on whichever voice the engine rates highest, but that rating is the engine\u2019s opinion — trust your ears over it.'));
      } else if (list.length === 1) {
        voiceBox.append(h('p', { class: 'tiny' }, `One Korean voice is installed on this phone: ${list[0].name}. More arrive with the speech engine — Settings › General management › Text-to-speech.`));
      } else {
        // An engine can be installed, be listed, and still have no Korean —
        // or refuse to start at all. Say so, and give the way back, rather than
        // leaving a silent app and a picker that looks like it worked.
        voiceBox.append(h('div', { class: 'empty' },
          h('p', {}, 'This engine has no Korean voice available, so nothing will be spoken.'),
          h('p', {}, 'Either install Korean for it under the phone\u2019s Settings › General management › Text-to-speech, or go back to the engine the phone came with.'),
          h('div', { class: 'btnrow' },
            h('button', { class: 'btn', onclick: () => tts.useEngine('') }, 'Use the default engine'))));
      }
    };
    drawVoices();
    tts.onVoicesChanged(drawVoices);
    root.append(voiceBox);
  } else if (tts.available()) {
    // The same choice in a browser. Automatic is the right answer for nearly
    // everyone, and the note under it says what automatic actually does.
    const voiceBox = h('div');
    const drawWeb = () => {
      clear(voiceBox);
      const list = tts.webVoices();
      const chosen = tts.webVoiceChoice();
      if (list.length) {
        const label = (v) => `${v.name.replace(/\s*\(Korean.*\)$/, '')}${tts.isOnline(v) ? ' — online' : ''}`;
        voiceBox.append(h('label', { class: 'field' }, h('span', {}, 'Korean voice'),
          h('select', { onchange: e => { store.set({ webVoice: e.target.value }); drawWeb(); setTimeout(() => tts.say('안녕하세요. 오늘도 수고하셨습니다.'), 150); } },
            h('option', { value: '', selected: !chosen }, `Automatic — ${list[0] ? list[0].name.replace(/\s*\(Korean.*\)$/, '') : 'the best available'}`),
            ...list.map(v => h('option', { value: v.voiceURI, selected: !!chosen && chosen.voiceURI === v.voiceURI }, label(v))))));
        const speaking = chosen || list[0];
        voiceBox.append(h('p', { class: 'tiny' }, speaking && tts.isOnline(speaking)
          ? 'This is an online voice, the best Korean this browser has. It works by sending each sentence the app speaks to Google\u2019s or Microsoft\u2019s servers — the app\u2019s own Korean, never anything about you or your progress. Without a connection, a voice on this device takes over. Pick a voice without "online" to keep even the sentences here.'
          : 'Automatic picks the best voice this browser has, so you should not need to change it. Picking one plays it.'));
      }
      if (tts.onlyNovelty()) {
        voiceBox.append(h('div', { class: 'note' },
          'The only Korean voices on this device are novelty ones, which are not fit to learn from. On a Mac, add Yuna: System Settings › Accessibility › Spoken Content › System voice › Manage Voices › Korean — the Premium version sounds best. Then reload this page.'));
      }
    };
    drawWeb();
    tts.onVoicesChanged(drawWeb);
    root.append(voiceBox);
  }

  root.append(h('label', { class: 'field' }, h('span', {}, `Speech speed — ${s.rate.toFixed(2)}×`),
    h('input', {
      type: 'range', min: '0.6', max: '1.3', step: '0.05', value: s.rate,
      oninput: e => { store.set({ rate: +e.target.value }); e.target.previousSibling.textContent = `Speech speed — ${(+e.target.value).toFixed(2)}×`; },
    })));
  root.append(h('p', { class: 'tiny' }, 'Leave this at 1.00 unless you have a reason not to. Slowing a voice down does not make it clearer — it smears the consonants, which are the part of Korean you are trying to hear.'));
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--ghost', onclick: () => tts.say('안녕하세요. 오늘도 수고하셨습니다.') }, 'Test the voice')));

  root.append(h('label', { class: 'field' }, h('span', {}, 'Romanization'),
    h('select', { onchange: e => { store.set({ rom: e.target.value === '1' }); } },
      h('option', { value: '1', selected: s.rom }, 'Show it under the Korean'),
      h('option', { value: '0', selected: !s.rom }, 'Hide it'))));
  root.append(h('p', { class: 'tiny' }, 'Hide it as soon as you can read 한글 without help. It is a crutch, and it is the reason people stall at reading speed.'));

  const note = tts.missingVoiceNote();
  if (note) root.append(h('div', { class: 'note' }, note));

  root.append(h('hr', { class: 'hr' }));
  root.append(h('h3', {}, 'Your progress'));
  root.append(h('p', { class: 'tiny' }, 'Everything this app knows about you is in this browser, on this device. There is no account and no server: nothing is uploaded, because there is nowhere to upload it to. The trade-off is that clearing this browser’s data deletes your progress, so take a backup.'));
  // Said on the page rather than with alert()/confirm(): the Android app has
  // no dialogs, so there both returned at once and did nothing — a failed
  // restore said nothing, and Erase everything could never be confirmed.
  const said = h('p', { class: 'tiny', role: 'status' });
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--ghost', onclick: () => {
      const name = `hangil-backup-${today()}.json`;
      // A download link means nothing inside the app; the phone's own
      // save-as sheet is asked for instead, so the file lands where you choose.
      if (tts.isNative() && window.HangilNative.saveFile) {
        window.HangilNative.saveFile(name, store.exportAll());
        return;
      }
      const blob = new Blob([store.exportAll()], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a); a.click(); a.remove();
    } }, 'Save a backup'),
    h('button', { class: 'btn btn--ghost', onclick: () => {
      const input = h('input', { type: 'file', accept: 'application/json,.json' });
      input.addEventListener('change', async () => {
        const f = input.files[0]; if (!f) return;
        try { store.importAll(await f.text()); location.reload(); }
        catch (err) { said.textContent = `That file could not be restored: ${err.message}`; }
      });
      input.click();
    } }, 'Restore a backup'),
  ));
  const erase = h('button', { class: 'btn btn--ghost', type: 'button' }, 'Erase everything');
  let disarm = 0;
  erase.addEventListener('click', () => {
    if (erase.dataset.armed === '1') { clearTimeout(disarm); store.wipe(); location.reload(); return; }
    erase.dataset.armed = '1';
    erase.textContent = 'Tap again to erase all progress';
    said.textContent = 'This deletes everything on this device and cannot be undone.';
    disarm = setTimeout(() => { erase.dataset.armed = '0'; erase.textContent = 'Erase everything'; said.textContent = ''; }, 5000);
  });
  root.append(h('div', { class: 'btnrow' }, erase));
  root.append(said);

  root.append(h('hr', { class: 'hr' }));
  root.append(h('h3', {}, t('about')));
  // The credit, as LOGGER has it: the app's name, then who made it, in plain
  // type. The name is a proper noun and is never translated; the sentence
  // around it follows the app's language. (LOGGER tried the brand mark here and
  // went back to the word — a logo under a logo is one too many.)
  root.append(h('p', { style: 'margin:0; font-weight:700' }, '한길 HANGIL'));
  root.append(h('p', { class: 'tiny', style: 'margin-top:2px' }, t('madeBy', AUTHOR)));
  root.append(h('p', { class: 'tiny' }, 'HANGIL is free and stays free. The practice questions were written for this app in the shapes the EPS-TOPIK paper uses; it is not affiliated with HRD Korea, the EPS programme, or any exam body, and it cannot tell you whether you will pass.'));
  root.append(h('p', { class: 'tiny' }, 'If a document affects your pay or your visa, understanding the sentence is not the same as advice: 고용노동부 고객상담센터 ☎ 1350 is free and has interpreters.'));
  root.append(h('p', { class: 'tiny' }, h('a', { href: 'https://itsdoubleem.github.io', style: 'color:var(--accent)' }, 'itsdoubleem.github.io')));
}

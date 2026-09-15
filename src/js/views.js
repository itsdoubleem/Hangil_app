import { h, clear, shuffle, icon, today } from './util.js';
import * as store from './store.js';
import * as tts from './tts.js';
import { load, data, LEVELS, unitKey, vocabKey, drillKey, resolve } from './data.js';
import { Quiz, fromExercise, fromExamItem, fromWord, speakBtn } from './quiz.js';
import { t } from './i18n.js';
import { runMock } from './mock.js';

const nav = (to) => { location.hash = to; };

function head(root, title, opts = {}) {
  if (opts.tone) root.style.setProperty('--c', `var(--c-${opts.tone})`);
  if (opts.tone) root.style.setProperty('--cw', `var(--cw-${opts.tone})`);
  const bar = h('div', { class: 'topbar' });
  if (opts.back) {
    bar.append(h('button', { class: 'back', 'aria-label': t('back'), onclick: () => nav(opts.back) }, icon('back')));
  } else {
    bar.append(h('h1', {}, 'HANGIL'), h('span', { class: 'sub ko' }, '한길'));
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
function tile({ tone = 'today', icon: ic, meta, title, sub, subKo, desc, onclick, hero, i, progress }) {
  const el = h('button', {
    class: `card pressable${hero ? ' card--hero' : ''}`,
    style: `--c: var(--c-${tone}); --cw: var(--cw-${tone}); --i:${i ?? 0}`,
    onclick,
  });
  if (ic && !hero) {
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

/* ---------------- today ---------------- */

export async function home(root) {
  const d = await load();
  const s = store.get();
  const due = store.dueCount();
  const doneCount = Object.keys(s.done).length;
  const words = d.sets.reduce((n, x) => n + x.words.length, 0);

  head(root, null, {
    right: s.streak.count
      ? h('span', { class: 'streak' }, icon('flame'), `${s.streak.count}`)
      : null,
  });

  const wrap = h('div', { class: 'stagger' });
  root.append(wrap);

  wrap.append(h('h2', { style: '--i:0' }, due ? t('reviewNow', due) : 'What shall we do today?'));
  wrap.append(h('p', { class: 'lead', style: '--i:1' }, due
    ? 'These are the things you got wrong, or learned a while ago. Five minutes here is worth an hour of new material.'
    : 'Nothing is due for review. Pick up where you left off, or start something new.'));

  if (due) {
    wrap.append(tile({
      tone: 'review', hero: true, i: 2,
      meta: `${due} ${due === 1 ? 'item' : 'items'} due`,
      title: 'Review now',
      desc: 'The deck brings back what you missed, at widening gaps.',
      onclick: () => nav('#/review'),
    }));
  } else if (s.last) {
    wrap.append(tile({
      tone: 'course', hero: true, i: 2,
      meta: t('carryOn'), title: s.last.label,
      onclick: () => nav(s.last.route),
    }));
  }

  const grid = h('div', { class: 'grid2', style: '--i:3' });
  grid.append(
    tile({ tone: 'course', icon: 'course', title: t('course'),
           meta: `${doneCount} of ${d.units.length} units`, sub: 'Grammar, first sentence to contract.',
           onclick: () => nav('#/course') }),
    tile({ tone: 'exam', icon: 'exam', title: t('exam'),
           meta: 'EPS-TOPIK', sub: 'The paper\u2019s question types, and a timed paper.',
           onclick: () => nav('#/exam') }),
  );
  wrap.append(grid);

  const grid2 = h('div', { class: 'grid2', style: '--i:4' });
  grid2.append(
    tile({ tone: 'hangeul', icon: 'hangeul', title: t('letters'), meta: '한글',
           sub: 'Start here if you cannot read yet.', onclick: () => nav('#/hangeul') }),
    tile({ tone: 'vocab', icon: 'vocab', title: t('vocab'), meta: `${words} words`,
           sub: 'Work, safety, money, the body.', onclick: () => nav('#/vocab') }),
  );
  wrap.append(grid2);

  wrap.append(h('h3', { style: '--i:5' }, 'Your progress'));
  const ringRow = h('div', { class: 'card', style: '--i:6; --c: var(--c-course); display:block; padding: var(--s5)' });
  ringRow.append(ring(doneCount, d.units.length, 'units finished'));
  wrap.append(ringRow);

  const stats = h('div', { class: 'stats', style: '--i:7' });
  stats.append(
    h('div', { class: 'stat', style: '--c: var(--c-review)' }, h('b', {}, s.answered.right), h('span', {}, t('correct'))),
    h('div', { class: 'stat', style: '--c: var(--c-today)' }, h('b', {}, s.streak.best || 0), h('span', {}, t('best'))),
    h('div', { class: 'stat', style: '--c: var(--c-vocab)' }, h('b', {}, Object.keys(s.srs).length), h('span', {}, 'in the deck')),
  );
  wrap.append(stats);

  const warn = tts.missingVoiceNote();
  if (warn) wrap.append(h('div', { class: 'note', style: '--i:8; --c: var(--c-exam); margin-top: var(--s5)' }, warn));
}

/* ---------------- hangeul ---------------- */

export async function hangeul(root) {
  const d = await load();
  head(root, t('letters'), { back: '#/' });
  root.append(h('p', { class: 'lead' }, d.hangeul.intro));

  for (const g of d.hangeul.groups) {
    root.append(h('h3', {}, `${g.title} · `, h('span', { class: 'ko' }, g.titleKo)));
    root.append(h('p', { class: 'tiny' }, g.blurb));
    const tiles = h('div', { class: 'tiles' });
    for (const L of g.letters) {
      tiles.append(h('button', {
        class: 'tile', type: 'button', title: L.hint,
        onclick: () => tts.say(L.say || L.ch),
      }, h('b', {}, L.ch), h('span', {}, L.rom)));
    }
    root.append(tiles);
  }

  for (const b of d.hangeul.blocks) {
    root.append(h('h3', {}, b.title));
    for (const r of b.rules) root.append(h('p', { class: 'note' }, r));
  }

  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--wide', onclick: () => nav('#/hangeul/drill') }, 'Read these out loud')));
  store.markSeen('hangeul');
}

export async function hangeulDrill(root) {
  const d = await load();
  head(root, null, { back: '#/hangeul' });
  const box = h('div', { class: 'q' });
  root.append(box);
  const qs = shuffle(d.hangeul.drills).slice(0, 12).map((x, n) => {
    const wrong = shuffle(d.hangeul.drills.filter(y => y.rom !== x.rom)).slice(0, 3);
    const opts = shuffle([x, ...wrong]);
    return {
      key: `h:${x.ko}`, type: 'choice', audio: x.ko,
      stem: x.ko, stemEn: 'How is this said?',
      options: opts.map(o => o.rom), answer: opts.indexOf(x),
    };
  });
  new Quiz(box, qs, { title: 'Reading practice', onDone: () => nav('#/hangeul') });
}

/* ---------------- course ---------------- */

export async function course(root) {
  const d = await load();
  const s = store.get();
  head(root, t('course'), { back: '#/', tone: 'course' });
  root.append(h('p', { class: 'lead' }, 'Twenty-four units. Each one is a short explanation, five real sentences, then practice. Work through them in order — later units lean on earlier ones.'));

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
  for (const p of u.explain) box.append(h('p', {}, p));

  if (u.table) {
    const tb = h('table');
    tb.append(h('thead', {}, h('tr', {}, ...u.table.head.map(x => h('th', {}, x)))));
    tb.append(h('tbody', {}, ...u.table.rows.map(r => h('tr', {}, ...r.map(c => h('td', {}, c))))));
    box.append(h('div', { class: 'tablewrap' }, tb));
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
  root.append(h('p', { class: 'lead' }, 'Grouped by where you will hear them. Tap a word to hear it; tap the set to drill it.'));
  d.sets.forEach((set, n) => {
    root.append(tile({
      tone: 'vocab', i: n, icon: 'vocab',
      meta: `${set.words.length} ${t('words')}`,
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
    h('button', { class: 'btn', onclick: () => nav(`#/vocab/${id}/drill`) }, 'Drill these'),
    h('button', { class: 'btn btn--ghost', onclick: () => nav(`#/vocab/${id}/listen`) }, 'Listening drill')));
  const list = h('div');
  for (const w of s.words) {
    list.append(h('div', { class: 'word' },
      h('div', { class: 'word__ko ko' }, w.ko, speakBtn(w.ko)),
      (w.rom && store.get().rom) ? h('div', { class: 'word__rom' }, w.rom) : null,
      h('div', { class: 'word__en' }, w.en),
      w.ex ? h('div', { class: 'word__ex' }, h('b', { class: 'ko' }, w.ex), ' — ', w.exEn) : null,
    ));
  }
  root.append(list);
  store.markSeen(s.id);
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

export async function exam(root) {
  const d = await load();
  const s = store.get();
  head(root, t('exam'), { back: '#/', tone: 'exam' });
  root.append(h('p', { class: 'lead' }, 'The EPS-TOPIK paper is forty questions — twenty listening, twenty reading — at five points each. Learn the shapes first, then sit a whole paper against the clock.'));

  root.append(h('h3', {}, t('paper')));
  d.mocks.forEach((m, n) => {
    const prev = s.mocks.find(x => x.id === m.id);
    root.append(tile({
      tone: 'exam', hero: true, i: n,
      meta: `40 ${t('questions')} · ${m.minutes} ${t('minutes')}${prev ? ` · last ${prev.score}/${prev.max}` : ''}`,
      title: m.title, desc: 'A full paper against a clock that does not stop.',
      onclick: () => nav(`#/exam/paper/${m.id}`),
    }));
  });

  root.append(h('h3', {}, t('drills')));
  d.drills.forEach((dr, n) => {
    root.append(tile({
      tone: 'exam', i: n,
      icon: dr.section === 'listening' ? 'sound' : 'target',
      meta: `${dr.section === 'listening' ? '듣기 listening' : '읽기 reading'} · ${dr.items.length}`,
      title: dr.title, sub: dr.blurb,
      onclick: () => nav(`#/exam/drill/${dr.id}`),
    }));
  });

  if (s.mocks.length) {
    root.append(h('h3', {}, 'Your papers'));
    for (const m of s.mocks.slice(0, 8)) {
      root.append(h('p', { class: 'tiny' }, `${m.at} — ${m.score}/${m.max} (listening ${m.listening}/100, reading ${m.reading}/100)`));
    }
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
  new Quiz(box, qs, { title: dr.title, onDone: () => nav('#/exam') });
}

export async function examPaper(root, id) {
  const d = await load();
  const m = d.mockById[id];
  if (!m) return nav('#/exam');
  runMock(root, m, { head, nav });
}

/* ---------------- review ---------------- */

export async function review(root) {
  await load();
  head(root, t('review'), { back: '#/' });
  const keys = store.dueKeys(30);
  if (!keys.length) {
    root.append(h('div', { class: 'empty' },
      h('p', {}, 'Nothing is due today.'),
      h('p', {}, 'The review deck fills itself: every question you answer here goes into it, and comes back at a widening gap — one day, three, a week, a fortnight. Get one wrong and it starts again from today.'),
    ));
    return;
  }
  const qs = [];
  for (const k of keys) {
    const r = resolve(k);
    if (!r) continue;
    if (r.kind === 'u') qs.push({ ...fromExercise(r.ex, k), from: r.from });
    else if (r.kind === 'w') qs.push({ ...fromWord(r.word, r.set.words, k, Math.random() < 0.3 ? 'listen' : 'recall'), from: r.from });
    else if (r.kind === 'd') qs.push({ ...fromExamItem(r.item, k), from: r.from });
  }
  if (!qs.length) {
    root.append(h('div', { class: 'empty' }, h('p', {}, 'Nothing to show — the items due came from content that is no longer here.')));
    return;
  }
  const box = h('div', { class: 'q' });
  root.append(box);
  new Quiz(box, shuffle(qs), { title: 'Review', onDone: () => nav('#/') });
}

/* ---------------- listening library ---------------- */

export async function listening(root) {
  const d = await load();
  head(root, t('listening'), { back: '#/' });
  if (!d.listening.length) {
    root.append(h('div', { class: 'empty' },
      h('p', {}, 'No audio files have been added to this build.'),
      h('p', {}, 'Every Korean sentence elsewhere in the app is spoken by your phone, so you do not need these to study. This shelf is for official EPS-TOPIK listening material, which HRD Korea publishes free on the EPS programme site.'),
      h('p', {}, 'To add some: put the audio files in ', h('code', {}, 'content/listening/'), ' and list them in ', h('code', {}, 'content/listening/manifest.json'), '. The format is in the README.'),
    ));
    return;
  }
  for (const s of d.listening) {
    const card = h('div', { class: 'card' },
      h('p', { class: 'card__meta' }, s.source || 'audio'),
      h('p', { class: 'card__title' }, s.title),
      s.note ? h('p', { class: 'card__desc' }, s.note) : null);
    for (const tr of (s.tracks || [])) {
      const audio = h('audio', { controls: true, preload: 'none', src: `content/listening/${tr.file}`, style: 'width:100%;margin-top:8px' });
      card.append(h('p', { class: 'tiny', style: 'margin:10px 0 0' }, tr.title), audio);
      if (tr.script) card.append(h('details', {}, h('summary', { class: 'tiny' }, 'Script'), h('div', { class: 'q__passage' }, tr.script)));
    }
    root.append(card);
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
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--ghost', onclick: () => {
      const blob = new Blob([store.exportAll()], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `hangil-backup-${today()}.json` });
      document.body.append(a); a.click(); a.remove();
    } }, 'Save a backup'),
    h('button', { class: 'btn btn--ghost', onclick: () => {
      const input = h('input', { type: 'file', accept: 'application/json' });
      input.addEventListener('change', async () => {
        const f = input.files[0]; if (!f) return;
        try { store.importAll(await f.text()); location.reload(); }
        catch (err) { alert(err.message); }
      });
      input.click();
    } }, 'Restore a backup'),
  ));
  root.append(h('div', { class: 'btnrow' },
    h('button', { class: 'btn btn--ghost', onclick: () => {
      if (confirm('Delete all progress on this device? This cannot be undone.')) { store.wipe(); location.reload(); }
    } }, 'Erase everything')));

  root.append(h('hr', { class: 'hr' }));
  root.append(h('h3', {}, 'About'));
  root.append(h('p', { class: 'tiny' }, 'HANGIL is free and stays free. The practice questions were written for this app in the shapes the EPS-TOPIK paper uses; it is not affiliated with HRD Korea, the EPS programme, or any exam body, and it cannot tell you whether you will pass.'));
  root.append(h('p', { class: 'tiny' }, 'If a document affects your pay or your visa, understanding the sentence is not the same as advice: 고용노동부 고객상담센터 ☎ 1350 is free and has interpreters.'));
  root.append(h('p', { class: 'tiny' }, h('a', { href: 'https://itsdoubleem.github.io', style: 'color:var(--accent)' }, 'itsdoubleem.github.io')));
}

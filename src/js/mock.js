// The timed paper. Unlike the drills it gives no feedback while you are in it —
// that is the point. You find out what you got wrong at the end, which is the
// only way to learn what running out of time feels like.

import { h, clear, mmss, today, shuffle } from './util.js';
import { mix, mixPics, picture, picName } from './quiz.js';
import * as store from './store.js';
import * as tts from './tts.js';
import { data } from './data.js';

/* The reading half, with the job-related questions folded in.
 *
 * The real paper is 32 common questions and 8 job-related ones, and the
 * job-related ones sit in the reading half — so a paper here that ignores a
 * chosen trade is the wrong shape by eight questions. This swaps eight of the
 * short reading items for eight from the trade and leaves the passages alone,
 * because a passage carries two or three questions and pulling one out of the
 * middle strands the rest.
 *
 * With no trade set, nothing happens: the paper is the twenty common reading
 * questions it always was, which is what a non-manufacturing applicant sits.
 */
const JOB_ITEMS = 8;

function readingFor(m) {
  const d = data();
  const chosen = store.get().trade;
  const trade = d && chosen ? d.tradeById[chosen] : null;
  if (!trade || m.reading.length < JOB_ITEMS) return { reading: m.reading, trade: null };

  const short = m.reading.filter(it => !it.passage);
  const long = m.reading.filter(it => it.passage);
  if (short.length < JOB_ITEMS) return { reading: m.reading, trade: null };

  const keep = short.slice(0, short.length - JOB_ITEMS);
  const job = shuffle(trade.items.slice()).slice(0, JOB_ITEMS).map(it => ({ ...it, job: true }));
  return { reading: [...keep, ...long, ...job], trade };
}

export function runMock(root, m, { head, nav }) {
  const { reading, trade } = readingFor(m);
  // Shuffled once, at the top, so the answer sheet, the marking and the
  // walk-through afterwards all agree about which option was which.
  const shuffled = (it) => (it.picOptions ? mixPics(it.picOptions, it.a) : mix(it.options, it.a));
  const items = [
    ...m.listening.map((it, i) => ({ ...it, ...shuffled(it), section: 'listening', n: i + 1 })),
    ...reading.map((it, i) => ({ ...it, ...shuffled(it), section: 'reading', n: m.listening.length + i + 1 })),
  ];
  const answers = new Array(items.length).fill(null);
  let i = 0, left = m.minutes * 60, tick = null;

  intro();

  function stop() { clearInterval(tick); tts.stop(); }

  function intro() {
    clear(root);
    head(root, m.title, { back: '#/exam' });
    root.append(
      h('p', { class: 'kicker ko' }, m.titleKo),
      h('p', { class: 'lead' }, `Forty questions in ${m.minutes} minutes: twenty listening, then twenty reading. Five points each, two hundred in total.`),
      h('p', {}, 'Nothing is marked until you hand it in, and the clock does not stop. If it runs out, whatever you have answered is scored and the rest count as wrong — the same as the real thing.'),
      trade
        ? h('p', {}, `Eight of the twenty reading questions come from your trade, ${trade.title} (${trade.titleKo}) — the same split the real paper uses for a manufacturing applicant. Change or clear it in Settings.`)
        : h('p', {}, 'All forty are common questions. If you are applying for manufacturing work, set your trade in Settings and eight of the reading questions will come from it, as they do on the real paper.'),
      h('div', { class: 'note' }, m.note),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--accent btn--wide', onclick: () => { start(); } }, 'Start the paper')),
    );
  }

  function start() {
    tick = setInterval(() => {
      left -= 1;
      const el = document.getElementById('clock');
      if (el) { el.textContent = mmss(left); el.dataset.low = left <= 300 ? '1' : '0'; }
      if (left <= 0) { stop(); submit(true); }
    }, 1000);
    draw();
  }

  function draw() {
    const it = items[i];
    clear(root);
    head(root, null, {
      back: null,
      right: h('span', { class: 'timer', id: 'clock', 'data-low': left <= 300 ? '1' : '0' }, mmss(left)),
    });
    root.append(
      h('p', { class: 'q__count' }, `${it.section === 'listening' ? '듣기' : '읽기'} · ${it.n} / ${items.length}`),
      h('div', { class: 'bar' }, h('i', { style: `width:${(i / items.length) * 100}%` })),
    );

    // Both shapes of audio: a two-speaker dialogue, and a single spoken line —
    // the picture items use the latter, and without this they were listening
    // questions with nothing to listen to.
    if (it.lines) {
      root.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost', onclick: () => tts.sayLines(it.lines) }, 'Play')));
    } else if (it.audio) {
      root.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost', onclick: () => tts.say(it.audio) }, 'Play')));
    }
    if (it.pic) root.append(h('div', { class: 'q__picbox' }, picture(it.pic, 'pic pic--big')));
    if (it.display) root.append(h('div', { class: 'q__display' }, it.display));
    if (it.passage) root.append(h('div', { class: 'q__passage' }, it.passage));
    root.append(h('p', { class: 'q__stem' }, it.stem));

    if (it.picOptions) {
      const grid = h('div', { class: 'picopts' });
      it.picOptions.forEach((id, idx) => {
        const b = h('button', { class: 'picopt', type: 'button', 'aria-label': `Option ${'ABCD'[idx]}` },
          h('i', {}, 'ABCD'[idx] || String(idx + 1)), picture(id, 'pic'));
        if (answers[i] === idx) b.dataset.state = 'sel';
        b.addEventListener('click', () => { answers[i] = idx; if (i < items.length - 1) { i++; draw(); } else draw(); });
        grid.append(b);
      });
      root.append(grid);
    } else {
      const list = h('div', { class: 'opts' });
      it.options.forEach((opt, idx) => {
        const b = h('button', { class: 'opt', type: 'button' },
          h('i', {}, 'ABCD'[idx] || String(idx + 1)), h('span', {}, opt));
        if (answers[i] === idx) b.dataset.state = 'sel';
        b.addEventListener('click', () => { answers[i] = idx; if (i < items.length - 1) { i++; draw(); } else draw(); });
        list.append(b);
      });
      root.append(list);
    }

    root.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn btn--ghost', disabled: i === 0, onclick: () => { i--; draw(); } }, 'Back'),
      h('button', { class: 'btn btn--ghost', disabled: i >= items.length - 1, onclick: () => { i++; draw(); } }, 'Skip'),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'btn btn--accent', onclick: () => { if (confirm('Hand in the paper now?')) { stop(); submit(false); } } }, 'Hand in'),
    ));

    const sheet = h('div', { class: 'sheet' });
    items.forEach((x, n) => {
      sheet.append(h('button', {
        type: 'button',
        'data-done': answers[n] !== null ? '1' : '0',
        'data-here': n === i ? '1' : '0',
        onclick: () => { i = n; draw(); },
      }, String(x.n)));
    });
    root.append(h('p', { class: 'kicker', style: 'margin-top:20px' }, 'Answer sheet'), sheet);
  }

  function submit(ranOut) {
    stop();
    let lis = 0, read = 0;
    items.forEach((it, n) => {
      const ok = answers[n] === it.answer;
      if (ok) { if (it.section === 'listening') lis += 1; else read += 1; }
      // A blank is not a wrong answer about the grammar — it is usually the clock.
      if (answers[n] !== null) store.recordTags(it.tags, ok);
    });
    const score = (lis + read) * m.pointsPerItem;
    store.recordMock({
      id: m.id, at: today(), score, max: items.length * m.pointsPerItem,
      listening: lis * m.pointsPerItem, reading: read * m.pointsPerItem,
    });

    clear(root);
    head(root, null, { back: '#/exam' });
    root.append(
      h('p', { class: 'kicker' }, ranOut ? 'Time ran out' : 'Handed in'),
      h('h2', {}, m.title),
      h('p', { class: 'result__score' }, String(score)),
      h('p', { class: 'result__out' }, `out of ${items.length * m.pointsPerItem}`),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, `${lis * m.pointsPerItem}`), h('span', {}, '듣기 listening')),
        h('div', { class: 'stat' }, h('b', {}, `${read * m.pointsPerItem}`), h('span', {}, '읽기 reading')),
        h('div', { class: 'stat' }, h('b', {}, `${items.length - answers.filter(a => a !== null).length}`), h('span', {}, 'left blank')),
      ),
      h('div', { class: 'note', style: 'margin-top:18px' }, 'This app does not tell you whether that is a pass. The cut score is set by HRD Korea for each round and is not a fixed number — what it does tell you is which questions you got wrong, which is the useful part.'),
    );

    root.append(h('h3', {}, 'Every question'));
    items.forEach((it, n) => {
      const ok = answers[n] === it.answer;
      const card = h('div', { class: 'card' },
        h('p', { class: 'card__meta' }, `${it.n} · ${it.section === 'listening' ? '듣기' : '읽기'}${it.job ? ' · 업종별' : ''} · ${answers[n] === null ? 'blank' : ok ? 'correct' : 'wrong'}`),
      );
      if (it.pic) card.append(h('div', { class: 'q__picbox' }, picture(it.pic, 'pic')));
      if (it.display) card.append(h('p', { class: 'ko', style: 'font-size:20px' }, it.display));
      if (it.lines) card.append(h('div', { class: 'q__passage' }, it.lines.map(l => `${l.spk}: ${l.text}`).join('\n')));
      if (!it.lines && it.audio) card.append(h('div', { class: 'q__passage' }, it.audio));
      if (it.passage) card.append(h('div', { class: 'q__passage' }, it.passage));
      card.append(h('p', { class: 'ko', style: 'white-space:pre-wrap' }, it.stem));
      const label = (k) => it.picOptions ? picName(it.picOptions[k]).ko : it.options[k];
      card.append(h('p', { class: 'tiny' }, h('b', { class: 'ko' }, `정답: ${label(it.answer)}`)));
      if (answers[n] !== null && !ok) card.append(h('p', { class: 'tiny', style: 'color:var(--bad)' }, h('span', { class: 'ko' }, `골랐던 답: ${label(answers[n])}`)));
      if (it.why) card.append(h('p', { class: 'tiny' }, it.why));
      if (it.lines) card.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn btn--ghost', onclick: () => tts.sayLines(it.lines) }, 'Play it again')));
      else if (it.audio) card.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn btn--ghost', onclick: () => tts.say(it.audio) }, 'Play it again')));
      root.append(card);
    });

    root.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn btn--wide', onclick: () => nav('#/exam') }, 'Back to the exam menu')));
  }
}

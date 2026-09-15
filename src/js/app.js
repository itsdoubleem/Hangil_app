// Router and boot. Hash routes only — the app is one file served from a static
// host and must work when opened at any depth with no server rewriting URLs.

import { h, clear, icon } from './util.js';
import * as store from './store.js';
import { setLang, t } from './i18n.js';
import * as tts from './tts.js';
import * as V from './views.js';

const root = document.getElementById('app');

function applyTheme(mode) {
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
}

const TABS = [
  ['#/',        'today',  'today'],
  ['#/course',  'course', 'course'],
  ['#/exam',    'exam',   'exam'],
  ['#/review',  'review', 'review'],
  ['#/me',      'me',     'me'],
];

function bar() {
  const here = location.hash || '#/';
  const nav = h('nav', { class: 'nav', 'aria-label': 'Sections' });
  for (const [href, key, ic] of TABS) {
    const on = href === '#/' ? here === '#/' || here === '' : here.startsWith(href);
    const badge = key === 'review' ? store.dueCount() : 0;
    const link = h('a', { href, 'aria-current': on ? 'page' : null }, icon(ic), h('span', {}, t(key)));
    if (badge) link.append(h('span', { class: 'dot', 'aria-label': `${badge} due` }, badge > 99 ? '99+' : badge));
    nav.append(link);
  }
  const old = document.querySelector('.nav');
  if (old) old.replaceWith(nav); else document.body.append(nav);
}

const ROUTES = [
  [/^#\/$/,                      () => V.home(root)],
  [/^#\/hangeul$/,               () => V.hangeul(root)],
  [/^#\/hangeul\/drill$/,        () => V.hangeulDrill(root)],
  [/^#\/course$/,                () => V.course(root)],
  [/^#\/course\/([\w-]+)$/,      (m) => V.lesson(root, m[1])],
  [/^#\/course\/([\w-]+)\/practice$/, (m) => V.lessonPractice(root, m[1])],
  [/^#\/vocab$/,                 () => V.vocab(root)],
  [/^#\/vocab\/([\w-]+)$/,       (m) => V.vocabSet(root, m[1])],
  [/^#\/vocab\/([\w-]+)\/drill$/,  (m) => V.vocabDrill(root, m[1], 'recall')],
  [/^#\/vocab\/([\w-]+)\/listen$/, (m) => V.vocabDrill(root, m[1], 'listen')],
  [/^#\/exam$/,                  () => V.exam(root)],
  [/^#\/exam\/drill\/([\w-]+)$/, (m) => V.examDrill(root, m[1])],
  [/^#\/exam\/paper\/([\w-]+)$/, (m) => V.examPaper(root, m[1])],
  [/^#\/review$/,                () => V.review(root)],
  [/^#\/listening$/,             () => V.listening(root)],
  [/^#\/me$/,                    () => V.me(root, {
                                       onLang: (l) => { store.set({ lang: l }); setLang(l); route(); },
                                       onTheme: (x) => { store.set({ theme: x }); applyTheme(x); route(); },
                                     })],
];

async function route() {
  const hash = location.hash || '#/';
  clear(root);
  window.scrollTo(0, 0);
  for (const [re, fn] of ROUTES) {
    const m = hash.match(re);
    if (m) { try { await fn(m); } catch (e) { fail(e); } bar(); return; }
  }
  location.hash = '#/';
}

function fail(e) {
  console.error(e);
  clear(root).append(
    h('div', { class: 'topbar' }, h('h1', {}, 'HANGIL')),
    h('h2', {}, 'Something broke'),
    h('p', { class: 'lead' }, 'That screen would not load. Your progress is safe — it is stored separately.'),
    h('p', { class: 'tiny' }, String(e && e.message || e)),
    h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/', onclick: () => setTimeout(() => location.reload(), 10) }, 'Back to the start')),
  );
}

const s = store.get();
setLang(s.lang);
applyTheme(s.theme);
store.touchDay();
window.addEventListener('hashchange', route);
route();

// The service worker exists so the *web* app keeps working with the network off.
// Inside the Android app every file is already in the APK, so registering one
// would cache a copy of something that cannot go missing — and its install fetch
// would fail anyway, since the app ships with no INTERNET permission.
// ?nosw=1 skips registration, for working on the app locally. Without it every
// reload re-registers the worker, the worker serves the build it precached, and
// you spend an afternoon looking at changes you already made and shipped.
const noSW = location.search.includes('nosw');
if ('serviceWorker' in navigator && !tts.isNative() && !noSW) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
} else if (noSW && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
}

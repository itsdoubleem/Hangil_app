// Offline. The whole app is precached on first load, so after that it opens with
// the network off — which is the condition it is actually used in.
//
// The two placeholders below are filled in by tools/build.mjs. Do not write their
// names anywhere else in this file, comments included: the build stamps them by
// text, and an earlier version of this comment spelled them out, so the build
// replaced the comment and left the code holding raw placeholders. The service
// worker then failed to parse and the app quietly stopped working offline.

const VERSION = '__VERSION__';
const CACHE = `hangil-${VERSION}`;
const FILES = __FILES__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ignoreVary is not optional, and this cost an afternoon. A module script is
// fetched in CORS mode and therefore carries an Origin header; the precache
// request does not. A host that answers static files with `Vary: Origin` — astro
// preview does, and it is a common enough header — makes those two requests fail
// to match, so js/app.js missed the cache, fell through to the network, and was
// answered with the index.html fallback. Offline then looked like a page stuck on
// "Loading…" with one MIME-type error, which points nowhere near the real cause.
const MATCH = { ignoreVary: true, ignoreSearch: false };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Content added after install (listening audio) is cached the first time it
  // is played, so a file dropped in later still works offline afterwards.
  e.respondWith(
    caches.match(req, MATCH).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.pathname.includes('/content/') || url.pathname.includes('/data/'))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      // Only a navigation may fall back to the shell. Answering a missing script
      // or JSON file with HTML is what turned a cache miss into a silent failure.
      req.mode === 'navigate' ? caches.match('index.html', MATCH) : Response.error()
    ))
  );
});

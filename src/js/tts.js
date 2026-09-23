// Korean audio, spoken by the phone. The browser's own speech engine reads
// every Korean sentence in the app, which is why there is no audio to download
// and why it still works with the network off.

import { get } from './store.js';

/* Two engines, one interface.
 *
 * In a browser this is the Web Speech API. Inside the Android app it is the
 * phone's own TextToSpeech, reached through a bridge — the WebView does not
 * implement speechSynthesis at all, so without this every play button in the
 * app would do nothing and say nothing about why.
 */
const native = (() => {
  try {
    return (window.HangilNative && window.HangilNative.isNative && window.HangilNative.isNative())
      ? window.HangilNative : null;
  } catch { return null; }
})();

export const isNative = () => !!native;

/* Which voice speaks.
 *
 * Android hands out a default engine and, inside it, usually the cheapest
 * embedded voice it owns. The app now asks for every Korean voice on the device,
 * drops the ones needing a network (there is no INTERNET permission), and takes
 * the best quality the engine reports — and lets you override both the engine
 * and the voice, because "best" here is the engine's own opinion and your ears
 * are the better judge.
 */
const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

export const engines = () => native ? parse(native.engines(), []) : [];
export const voiceList = () => native ? parse(native.voices(), []) : [];
export const currentVoice = () => native ? parse(native.current(), {}) : {};
export function useEngine(pkg) { if (native) native.useEngine(pkg || ''); }
export function useVoice(name) { if (native) native.useVoice(name || ''); }

// The engine reloads asynchronously after a change; this lets Settings redraw
// once the new voice list actually exists.
const listeners = new Set();
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }
if (native) window.__hangilVoices = () => listeners.forEach(fn => { try { fn(); } catch {} });

// Android speaks asynchronously and calls back when an utterance ends, which is
// how a two-speaker dialogue stays in order instead of talking over itself.
const waiting = new Map();
let seq = 0;
if (native) {
  window.__hangilSpoke = (id) => {
    const done = waiting.get(id);
    if (done) { waiting.delete(id); done(true); }
  };
}

let voices = [];
let current = null;   // the utterance being spoken — see speak()
let warned = false;

function refresh() {
  try { voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch { voices = []; }
  // Browsers fill the list late, so Settings redraws when it arrives.
  if (!native) listeners.forEach(fn => { try { fn(); } catch {} });
}
if (window.speechSynthesis) {
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
}

export function korean() {
  return voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('ko'));
}

export const available = () => !!native || !!window.speechSynthesis;
export const hasKorean = () => native ? native.koreanAvailable() : korean().length > 0;

/* Which browser voice speaks.
 *
 * This used to be simply the FIRST Korean voice the browser listed. On a Mac
 * that list is alphabetical and opens with Eddy, Flo, Grandma, Grandpa — Apple's
 * novelty voices, built to sound like cartoon characters — while Yuna, the real
 * Korean voice, sits at the end. So the web app read every sentence in a joke
 * voice and gave the second speaker another one.
 *
 * Now the voices are ranked, and the best one speaks without anyone having to
 * find a setting. Novelty voices are never chosen. With a connection, an online
 * voice ranks first — Chrome's "Google 한국의", Edge's "Online (Natural)" ones —
 * because they are plainly the best Korean a browser can produce. That is a
 * decision with a cost, made knowingly: an online voice works by sending each
 * sentence to Google's or Microsoft's servers to be spoken. The sentences are the
 * app's own Korean, never anything about the learner, and Settings says so.
 * Offline, or if an online voice fails, the best on-device voice takes over.
 * Safari and Android browsers only have on-device voices, so nothing changes
 * there.
 */
const NOVELTY = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
export const isNovelty = (v) => NOVELTY.test(v.name || '');
export const isOnline = (v) => v.localService === false;
const connected = () => navigator.onLine !== false;

function score(v) {
  const n = v.name || '';
  let s = 0;
  if (isOnline(v)) s += connected() ? 100 : -100;
  if (/premium/i.test(n)) s += 40;
  else if (/enhanced|neural|natural/i.test(n)) s += 30;
  if (v.default) s += 2;
  return s;
}

// Every Korean voice worth offering, best first.
export function webVoices() {
  return korean().filter(v => !isNovelty(v)).sort((a, b) => score(b) - score(a));
}

// What speaks when nobody has chosen. If the only Korean voices on the device
// are novelty ones, one of those still beats silence — and Settings says how to
// install a real one.
function automatic() {
  const good = webVoices().filter(v => connected() || !isOnline(v));
  if (good.length) return good;
  return korean().filter(v => !isOnline(v));
}

// The best voice that does not need a connection — what an online voice falls
// back to when it cannot be reached.
const bestLocal = () => webVoices().find(v => !isOnline(v)) || korean().find(v => !isOnline(v)) || null;

export const webVoiceChoice = () => {
  const want = get().webVoice;
  return want ? korean().find(v => v.voiceURI === want) || null : null;
};

// Only novelty voices on this device (and perhaps online ones): worth saying so.
export const onlyNovelty = () => !native && korean().length > 0 && !korean().some(v => !isNovelty(v) && !isOnline(v));

// The narrator is voice 0; a dialogue's second speaker is voice 1 — a
// different good voice where there is one, and otherwise the same voice, never
// a novelty one drafted in just to sound different.
function pick(nth = 0) {
  let first = webVoiceChoice() || automatic()[0] || null;
  // A chosen online voice cannot speak offline; do not leave the app mute.
  if (first && isOnline(first) && !connected()) first = bestLocal() || first;
  if (!first || nth % 2 === 0) return first;
  const other = automatic().find(v => v.voiceURI !== first.voiceURI && !isNovelty(v));
  return other || first;
}

// Bumped by anything that should silence what came before — a new line, a
// new dialogue, leaving the question. A dialogue checks it between lines, so
// moving on stops the conversation rather than just the sentence in progress.
let gen = 0;

// Flushing the engine cuts the utterance off without an onDone, so whoever was
// waiting on it is told now instead of after the four-second fallback.
function hush() {
  if (native) {
    try { native.stop(); } catch {}
    for (const done of waiting.values()) done(false);
    waiting.clear();
    return;
  }
  try { window.speechSynthesis.cancel(); } catch {}
}

export function stop() { gen += 1; hush(); }

// Speak one Korean string. `voiceIndex` lets a two-speaker dialogue use two
// different voices when the phone has more than one installed.
export function say(text, opts = {}) {
  gen += 1;
  return utter(text, opts);
}

function utter(text, { voiceIndex = 0, rate } = {}) {
  if (!available()) return Promise.resolve(false);

  if (native) {
    hush();
    return new Promise(resolve => {
      const id = 'u' + (++seq);
      waiting.set(id, resolve);
      // The second speaker gets a genuinely different voice where the phone has
      // one. This used to shift the pitch of a single voice instead, which is
      // the fastest way to make a good neural voice sound like a bad one.
      try {
        native.speak(text, rate ?? get().rate ?? 1, voiceIndex % 2, id);
      } catch { waiting.delete(id); resolve(false); return; }
      // If the engine never calls back — a missing voice, a killed service — the
      // dialogue must not stall for ever behind an utterance that never ends.
      setTimeout(() => {
        if (waiting.has(id)) { waiting.delete(id); resolve(false); }
      }, Math.max(4000, text.length * 220));
    });
  }

  return new Promise(resolve => {
    hush();
    const speak = (voice, retry) => {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = 'ko-KR';
      u.rate = rate ?? get().rate ?? 1;
      // Held on purpose: Chrome can garbage-collect an utterance nobody
      // references and stop it mid-sentence.
      current = u;
      u.onend = () => resolve(true);
      u.onerror = (e) => {
        // An online voice that cannot be reached says so with an error rather
        // than silence; the sentence is said again by the device's own voice.
        // Being cut off by the next sentence is not a failure.
        if (retry && voice && isOnline(voice) && e.error !== 'interrupted' && e.error !== 'canceled') {
          const local = bestLocal();
          if (local) return speak(local, false);
        }
        resolve(false);
      };
      try { window.speechSynthesis.speak(u); } catch { resolve(false); }
    };
    speak(pick(voiceIndex), true);
  });
}

// Speak a dialogue, one line after another, alternating voice per speaker.
export async function sayLines(lines, opts = {}) {
  const mine = ++gen;
  const spk = [];
  for (const line of lines) {
    if (gen !== mine) return;
    if (!spk.includes(line.spk)) spk.push(line.spk);
    await utter(line.text, { ...opts, voiceIndex: spk.indexOf(line.spk) });
  }
}

export function missingVoiceNote() {
  if (!available()) return 'This browser has no speech engine, so the audio buttons will do nothing. The written Korean still works.';
  if (native && !hasKorean()) {
    warned = true;
    return 'Your phone has no Korean voice installed, so the audio will be wrong or silent. Settings › General management › Text-to-speech › install Korean, then reopen HANGIL.';
  }
  if (!hasKorean()) {
    warned = true;
    return 'No Korean voice is installed on this device, so audio may be wrong or silent. On Android: Settings › Accessibility › Text-to-speech › install Korean. On iPhone: Settings › Accessibility › Spoken Content › Voices › Korean.';
  }
  return null;
}
export const wasWarned = () => warned;

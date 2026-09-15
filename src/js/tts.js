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
let warned = false;

function refresh() {
  try { voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch { voices = []; }
}
if (window.speechSynthesis) {
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
}

export function korean() {
  return voices.filter(v => (v.lang || '').toLowerCase().startsWith('ko'));
}

export const available = () => !!native || !!window.speechSynthesis;
export const hasKorean = () => native ? native.koreanAvailable() : korean().length > 0;

function pick(nth = 0) {
  const ko = korean();
  if (!ko.length) return null;
  return ko[nth % ko.length];
}

export function stop() {
  if (native) { try { native.stop(); } catch {} return; }
  try { window.speechSynthesis.cancel(); } catch {}
}

// Speak one Korean string. `voiceIndex` lets a two-speaker dialogue use two
// different voices when the phone has more than one installed.
export function say(text, { voiceIndex = 0, rate } = {}) {
  if (!available()) return Promise.resolve(false);

  if (native) {
    stop();
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
    stop();
    const u = new SpeechSynthesisUtterance(text);
    const v = pick(voiceIndex);
    if (v) u.voice = v;
    u.lang = 'ko-KR';
    u.rate = rate ?? get().rate ?? 0.85;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    try { window.speechSynthesis.speak(u); } catch { resolve(false); }
  });
}

// Speak a dialogue, one line after another, alternating voice per speaker.
export async function sayLines(lines, opts = {}) {
  const spk = [];
  for (const line of lines) {
    if (!spk.includes(line.spk)) spk.push(line.spk);
    await say(line.text, { ...opts, voiceIndex: spk.indexOf(line.spk) });
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

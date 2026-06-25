// Harit Pathsala — procedural sound engine (Web Audio API).
// Zero audio files: every effect and the ambient music bed are synthesized, so the game has
// rich, responsive sound that works fully offline. A single shared AudioContext is created on
// the first user gesture (the language-select tap), satisfying browser autoplay rules.
import { audio } from './audio.ts';

let ctx = null;
let master = null;
let musicBus = null;     // ambient music sub-mix
let muted = false;
let music = null;        // active ambient nodes, or null
const MUSIC_VOL = 0.075; // ambient bed is intentionally quiet

try { muted = localStorage.getItem('harit_sound') === 'off'; } catch (_) { /* */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor(); // keeps stacked sounds from clipping
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = muted ? 0 : MUSIC_VOL;
    musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// one shared noise buffer for whooshes / ticks
let noiseBuf = null;
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// a single enveloped oscillator voice
function voice({ freq = 440, type = 'sine', dur = 0.15, vol = 0.2, attack = 0.005, glideTo = null, detune = 0, dest = null, delay = 0 }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);
  if (detune) o.detune.value = detune;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || master);
  o.start(t); o.stop(t + dur + 0.03);
}

// warm bell = fundamental + a couple of fast-decaying partials
function bell(freq, dur = 0.5, vol = 0.22, delay = 0) {
  voice({ freq, type: 'sine', dur, vol, delay });
  voice({ freq: freq * 2.01, type: 'sine', dur: dur * 0.66, vol: vol * 0.4, delay });
  voice({ freq: freq * 3.02, type: 'sine', dur: dur * 0.42, vol: vol * 0.16, delay });
}

function noiseSweep({ dur = 0.18, from = 500, to = 2400, vol = 0.12, q = 1 }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noise(c);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t); src.stop(t + dur + 0.02);
}

// notes (Hz)
const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5 };

export const sfx = {
  resume() { ac(); try { audio.init(); } catch (_) { /* */ } },
  isMuted() { return muted; },
  setMuted(m) {
    muted = m;
    try { localStorage.setItem('harit_sound', m ? 'off' : 'on'); } catch (_) { /* */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
    if (musicBus) musicBus.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ctx.currentTime, 0.05);
    try { window.dispatchEvent(new CustomEvent('harit-mute', { detail: m })); } catch (_) { /* */ }
  },
  toggleMuted() { this.setMuted(!muted); return muted; },

  // --- UI ---
  click() { voice({ freq: 680, type: 'triangle', dur: 0.05, vol: 0.09, glideTo: 520 }); },
  select() { voice({ freq: 560, type: 'triangle', dur: 0.06, vol: 0.09 }); voice({ freq: 840, type: 'sine', dur: 0.07, vol: 0.07, delay: 0.035 }); },
  tab() { noiseSweep({ dur: 0.14, from: 700, to: 2000, vol: 0.05, q: 0.8 }); voice({ freq: 520, type: 'sine', dur: 0.1, vol: 0.05, glideTo: 760 }); },
  pop() { voice({ freq: 900, type: 'sine', dur: 0.07, vol: 0.12, glideTo: 320 }); },
  toggle() { voice({ freq: 640, type: 'square', dur: 0.04, vol: 0.05 }); },

  // --- feedback ---
  correct() { bell(N.E5, 0.28, 0.16); bell(N.A5, 0.4, 0.16, 0.09); },
  wrong() { const c = ac(); if (!c || muted) return; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(master); voice({ freq: 220, type: 'sawtooth', dur: 0.22, vol: 0.12, glideTo: 150, dest: f }); voice({ freq: 214, type: 'sawtooth', dur: 0.22, vol: 0.08, glideTo: 150, dest: f, delay: 0.02 }); },
  collect() { voice({ freq: N.A5, type: 'square', dur: 0.06, vol: 0.1 }); voice({ freq: N.E5 * 2, type: 'square', dur: 0.09, vol: 0.1, delay: 0.05 }); },

  // --- outcomes ---
  win() { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, 0.5, 0.18, i * 0.1)); },
  levelUp() { [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6].forEach((f, i) => bell(f, 0.45, 0.15, i * 0.075)); voice({ freq: N.C6, type: 'sine', dur: 1.1, vol: 0.06, delay: 0.45 }); },
  lose() { [N.A4, N.F4, N.D4].forEach((f, i) => voice({ freq: f, type: 'triangle', dur: 0.5, vol: 0.13, glideTo: f * 0.96, delay: i * 0.16 })); voice({ freq: 110, type: 'sine', dur: 0.9, vol: 0.07, delay: 0.32 }); },
  start() { voice({ freq: 300, type: 'sawtooth', dur: 0.4, vol: 0.07, glideTo: 760 }); bell(N.G5, 0.5, 0.14, 0.12); bell(N.C6, 0.6, 0.12, 0.22); },

  // Background music is intentionally disabled — it was distracting. Discrete
  // sound effects (clicks, points, win) and story narration are unaffected.
  startMusic() { return; },
  stopMusic() {
    if (!music) return; const c = ac(); const m = music; music = null;
    clearInterval(m.chordIv); clearInterval(m.melIv);
    try { m.voices.forEach((o) => { o.stop(c.currentTime + 0.8); }); m.lfo.stop(c.currentTime + 0.8); } catch (_) { /* */ }
  },
};

// keep in sync with the cue engine / per-mission mute toggles (they dispatch the same event)
if (typeof window !== 'undefined') {
  window.addEventListener('harit-mute', (e) => {
    const m = !!e.detail; if (m === muted) return; muted = m;
    try { localStorage.setItem('harit_sound', m ? 'off' : 'on'); } catch (_) { /* */ }
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
    if (musicBus && ctx) musicBus.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ctx.currentTime, 0.05);
  });
}

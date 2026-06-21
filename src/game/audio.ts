// audio.ts — small cue engine. Plays short feedback sounds for the game.
// Howler.js drives any sound that has a real asset `src`; everything else is
// synthesised with the Web Audio API so the game is audible with zero binary
// assets (drop files into the registry later to upgrade). Gradual-TS module.
import { Howl } from 'howler';

export type Voice = 'restore' | 'thud' | 'sparkle' | 'tap';

interface SoundDef { src?: string }
// To use a recorded file, set `src: '/audio/restore.webm'` and drop it in public/.
const REGISTRY: Record<Voice, SoundDef> = { restore: {}, thud: {}, sparkle: {}, tap: {} };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const howls: Partial<Record<Voice, Howl>> = {};

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* ignore */ });
  return ctx;
}

function synth(v: Voice): void {
  const ac = ensure();
  if (!ac || !master) return;
  const now = ac.currentTime;
  const note = (freq: number, t0: number, dur: number, type: OscillatorType = 'sine', gain = 0.16) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + t0);
    g.gain.exponentialRampToValueAtTime(gain, now + t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
    o.connect(g);
    g.connect(master as GainNode);
    o.start(now + t0);
    o.stop(now + t0 + dur + 0.03);
  };
  if (v === 'restore') [523.25, 659.25, 783.99].forEach((f, i) => note(f, i * 0.08, 0.5, 'sine', 0.15));
  else if (v === 'sparkle') [880, 1318.5].forEach((f, i) => note(f, i * 0.05, 0.25, 'triangle', 0.09));
  else if (v === 'thud') { note(110, 0, 0.3, 'sine', 0.2); note(80, 0, 0.36, 'sine', 0.12); }
  else if (v === 'tap') note(660, 0, 0.08, 'square', 0.06);
}

// ── adaptive ambient bed (looping filtered noise) ───────────────────────
interface Ambient { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode }
let amb: Ambient | null = null;

function ensureAmbient(): Ambient | null {
  const ac = ensure();
  if (!ac || !master) return null;
  if (amb) return amb;
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 700;
  const gain = ac.createGain(); gain.gain.value = 0;
  src.connect(filter); filter.connect(gain); gain.connect(master);
  src.start();
  amb = { src, filter, gain };
  return amb;
}

export const audio = {
  /** Call on the first user gesture to unlock the AudioContext. */
  init(): void { ensure(); },
  setMuted(m: boolean): void { muted = m; if (master) master.gain.value = m ? 0 : 0.55; },
  isMuted(): boolean { return muted; },
  play(v: Voice): void {
    if (muted) return;
    const def = REGISTRY[v];
    if (def && def.src) {
      let h = howls[v];
      if (!h) { h = new Howl({ src: [def.src], volume: 0.7 }); howls[v] = h; }
      h.play();
      return;
    }
    synth(v);
  },
  /** Adaptive ambient bed: weather + valley clarity shape the air/wind/rain. */
  setAmbient(profile: { weather?: string; clarity?: number }): void {
    const a = ensureAmbient();
    if (!a || !ctx) return;
    const weather = profile.weather || 'clear';
    let g = 0.035, cut = 650;
    if (weather === 'monsoon' || weather === 'rain') { g = 0.11; cut = 2400; }
    else if (weather === 'snow') { g = 0.05; cut = 480; }
    else if (weather === 'dust') { g = 0.055; cut = 900; }
    const clarity = profile.clarity == null ? 0.6 : profile.clarity;
    cut *= 0.7 + clarity * 0.6;            // clearer valley → brighter air
    const now = ctx.currentTime;
    a.gain.gain.linearRampToValueAtTime(muted ? 0 : g, now + 0.8);
    a.filter.frequency.linearRampToValueAtTime(cut, now + 0.8);
  },
  stopAmbient(): void {
    if (amb && ctx) amb.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  },
  /** A struck temple bell (inharmonic partials, long decay). */
  bell(): void {
    const ac = ensure();
    if (!ac || !master || muted) return;
    const now = ac.currentTime;
    ([[440, 0.12], [880, 0.06], [1320, 0.045], [587.33, 0.05]] as [number, number][]).forEach(([f, gn]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gn, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      o.connect(g); g.connect(master as GainNode);
      o.start(now); o.stop(now + 2.5);
    });
  },
};

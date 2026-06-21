import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EXPLORER_LEVELS, completeLevel } from '../logic.js';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

/* ── helpers ───────────────────────────────────────────────────────────── */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// gentle undulation, but FLATTENED into a town square near the centre and
// rising into hills outward — a Nepali valley-town ringed by hills.
function terrainH(x, z) {
  return Math.sin(x * 0.18) * Math.cos(z * 0.16) * 0.55
    + Math.sin(x * 0.07 + z * 0.05) * 0.7
    + Math.cos(z * 0.23) * 0.25;
}
function flatness(x, z) { return clamp((Math.hypot(x, z) - 32) / 16, 0, 1); }
function groundH(x, z) { return terrainH(x, z) * flatness(x, z); }

// the river runs east–west (along X) on the north edge of the flat town
const RIVER_Z = 30;
const RIVER_HW = 3.2;          // half-width
function onRiver(x, z) { return Math.abs(z - RIVER_Z) < RIVER_HW + 0.9; }

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...opts });
function mesh(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, color instanceof THREE.Material ? color : std(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const box = (w, h, d, color, o) => mesh(new THREE.BoxGeometry(w, h, d), color, o);
const cyl = (rt, rb, h, seg, color, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, o);

/* palette */
const C = {
  mud: 0xcf9457, white: 0xece4d2, roof: 0x9c4434, tin: 0x6f7a80, wood: 0x6b4a2f, brick: 0x8a4a32,
  steel: 0x9aa7ad, green: 0x4caf50, leaf: 0x2f7d4f, water: 0x57b6dd, ice: 0xe1f1f6, stone: 0x8b8a86,
  blue: 0x2f6cb0, saffron: 0xe98a2b, crimson: 0xdc143c, concrete: 0xb9b2a5, glass: 0x9fd6e6, dark: 0x40463f,
};
const DEADRED = new THREE.Color(0x9a3b22);

/* ── the rigged, animated student (unchanged — you liked this) ──────────── */
function makeStudent() {
  const g = new THREE.Group();
  const skin = std(0xe6b08a, { roughness: 0.8 });
  const navy = std(0x2b4c8c);
  const navyD = std(0x223d70);
  const hair = std(0x241712, { roughness: 1 });
  const bagC = std(0xd1492f);
  const shoe = std(0x39281b);
  const mkLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.11 * side, 0.5, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8), navyD);
    thigh.position.y = -0.21; thigh.castShadow = true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.24), shoe);
    foot.position.set(0, -0.46, 0.05); foot.castShadow = true;
    pivot.add(thigh, foot); g.add(pivot); return pivot;
  };
  const legL = mkLeg(-1); const legR = mkLeg(1);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.52, 10), navy);
  torso.position.y = 0.78; torso.castShadow = true;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 10), std(0xf3f4ec));
  collar.position.y = 1.05; collar.castShadow = true;
  g.add(torso, collar);
  const mkArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.26 * side, 1.0, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.46, 8), navy);
    upper.position.y = -0.22; upper.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    hand.position.y = -0.47; hand.castShadow = true;
    pivot.add(upper, hand); g.add(pivot); return pivot;
  };
  const armL = mkArm(-1); const armR = mkArm(1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 14), skin);
  head.position.y = 1.32; head.castShadow = true;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  hairCap.position.y = 1.34;
  const ear = (s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin); e.position.set(0.22 * s, 1.31, 0); return e; };
  const eyeW = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.4 });
  const eye = (s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeW); e.position.set(0.08 * s, 1.34, 0.205); return e; };
  g.add(head, hairCap, ear(-1), ear(1), eye(-1), eye(1));
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.16), bagC);
  bag.position.set(0, 0.82, -0.26); bag.castShadow = true;
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.04), std(0xb83a23));
  flap.position.set(0, 0.96, -0.34);
  g.add(bag, flap);
  g.scale.set(1.15, 1.15, 1.15);
  g.userData = { legL, legR, armL, armR, head };
  return g;
}

/* ── natural trees / rocks / clouds ────────────────────────────────────── */
function makeTree(kind = 'broad', scale = 1) {
  const g = new THREE.Group();
  const trunkH = rand(0.5, 0.85) * scale;
  const trunk = mesh(new THREE.CylinderGeometry(0.05 * scale, 0.09 * scale, trunkH, 6), C.wood, { flatShading: true });
  trunk.position.y = trunkH / 2; trunk.rotation.z = rand(-0.08, 0.08);
  g.add(trunk);
  const canopy = new THREE.Group(); canopy.position.y = trunkH;
  const base = new THREE.Color().setHSL(0.33 + rand(-0.04, 0.05), rand(0.42, 0.6), rand(0.26, 0.42));
  if (kind === 'conifer') {
    for (let i = 0; i < 3; i += 1) {
      const c = mesh(new THREE.ConeGeometry((0.42 - i * 0.1) * scale, 0.6 * scale, 7), base.clone().offsetHSL(0, 0, -i * 0.03), { flatShading: true });
      c.position.y = i * 0.34 * scale + 0.2; c.rotation.y = rand(0, Math.PI); canopy.add(c);
    }
  } else if (kind === 'bush') {
    for (let i = 0; i < 3; i += 1) {
      const b = mesh(new THREE.IcosahedronGeometry(rand(0.18, 0.28) * scale, 0), base, { flatShading: true });
      b.position.set(rand(-0.18, 0.18), rand(0, 0.12), rand(-0.18, 0.18)); canopy.add(b);
    }
    canopy.position.y = trunkH * 0.3;
  } else {
    const blobs = 2 + Math.floor(rand(0, 2));
    for (let i = 0; i < blobs; i += 1) {
      const b = mesh(new THREE.IcosahedronGeometry(rand(0.32, 0.46) * scale, 0), base.clone().offsetHSL(rand(-0.02, 0.02), 0, rand(-0.04, 0.04)), { flatShading: true });
      b.position.set(rand(-0.22, 0.22), rand(-0.05, 0.28), rand(-0.22, 0.22)); b.scale.y = rand(0.85, 1.05); canopy.add(b);
    }
  }
  g.add(canopy);
  g.rotation.y = rand(0, Math.PI * 2);
  g.userData = { canopy, sway: rand(0, Math.PI * 2) };
  return g;
}
function makeRock(scale = 1) {
  const r = mesh(new THREE.DodecahedronGeometry(rand(0.18, 0.34) * scale, 0), C.stone, { flatShading: true, roughness: 1 });
  r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); r.scale.y = rand(0.6, 0.9); return r;
}
function makeCloud() {
  const g = new THREE.Group();
  const m = std(0xffffff, { roughness: 1, emissive: 0xdfeefc, emissiveIntensity: 0.15 });
  for (let i = 0; i < 4; i += 1) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.8, 1.5), 0), m);
    p.position.set(rand(-1.6, 1.6), rand(-0.2, 0.2), rand(-0.8, 0.8)); g.add(p);
  }
  return g;
}

/* ── floating name label (high-res canvas sprite, always faces camera) ─── */
function makeLabel(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 160;
  const ctx = cv.getContext('2d');
  ctx.font = '800 60px Baloo 2, Nunito, sans-serif';
  const w = Math.min(496, ctx.measureText(text).width + 64);
  const x = (512 - w) / 2; const top = 18; const bot = 104; const rr = 30;
  // rounded pill
  ctx.fillStyle = 'rgba(20,42,28,.92)';
  ctx.beginPath();
  ctx.moveTo(x + rr, top); ctx.arcTo(x + w, top, x + w, bot, rr); ctx.arcTo(x + w, bot, x, bot, rr);
  ctx.arcTo(x, bot, x, top, rr); ctx.arcTo(x, top, x + w, top, rr); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(149,213,178,.9)'; ctx.stroke();
  // little downward pointer
  ctx.fillStyle = 'rgba(20,42,28,.92)';
  ctx.beginPath(); ctx.moveTo(256 - 16, bot); ctx.lineTo(256 + 16, bot); ctx.lineTo(256, bot + 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, (top + bot) / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  spr.scale.set(6.4, 2.0, 1);
  spr.userData.tex = tex;
  return spr;
}

/* ── result mark: green check (correct) or red cross (wrong) ───────────── */
function makeMark(correct) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = correct ? '#2f9e57' : '#d8442a';
  ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath();
  if (correct) { ctx.moveTo(40, 66); ctx.lineTo(58, 84); ctx.lineTo(90, 44); }
  else { ctx.moveTo(46, 46); ctx.lineTo(82, 82); ctx.moveTo(82, 46); ctx.lineTo(46, 82); }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  spr.scale.set(1.7, 1.7, 1); spr.userData.mark = true; spr.userData.tex = tex;
  return spr;
}

/* ── LANDMARK BUILDERS — the building you walk up to for each question ─── */
function makeLandmark(type) {
  const g = new THREE.Group();
  const A = (...m) => g.add(...m);
  const win = std(C.glass, { emissive: 0x9fd6e6, emissiveIntensity: 0.25 });

  switch (type) {
    case 'house': {
      const b = box(1.2, 1.0, 1.0, C.mud); b.position.y = 0.5; A(b);
      const roof = mesh(new THREE.ConeGeometry(1.0, 0.55, 4), C.roof, { flatShading: true });
      roof.position.y = 1.28; roof.rotation.y = Math.PI / 4; A(roof);
      const door = box(0.3, 0.5, 0.06, C.wood); door.position.set(0, 0.3, 0.52); A(door);
      const w1 = box(0.26, 0.26, 0.05, win); w1.position.set(-0.36, 0.62, 0.52); A(w1);
      const chimney = box(0.16, 0.4, 0.16, C.brick); chimney.position.set(0.4, 1.45, 0); A(chimney);
      break;
    }
    case 'school': {
      const b = box(1.9, 1.0, 1.0, C.white); b.position.y = 0.5; A(b);
      const stripe = box(1.92, 0.18, 1.02, C.blue); stripe.position.y = 0.34; A(stripe);
      const roof = box(2.05, 0.16, 1.15, C.tin); roof.position.y = 1.05; A(roof);
      for (let i = -1; i <= 1; i += 1) { const w = box(0.26, 0.3, 0.05, win); w.position.set(i * 0.55, 0.66, 0.52); A(w); }
      const pole = cyl(0.03, 0.03, 1.5, 6, C.steel); pole.position.set(1.0, 0.95, 0.4); A(pole);
      const flag = box(0.38, 0.26, 0.03, C.crimson); flag.position.set(1.2, 1.5, 0.4); A(flag);
      g.userData.flag = flag;
      break;
    }
    case 'shop': {
      const b = box(1.2, 0.9, 0.95, C.white); b.position.y = 0.45; A(b);
      const counter = box(1.1, 0.4, 0.2, C.wood); counter.position.set(0, 0.22, 0.52); A(counter);
      const sign = box(1.25, 0.28, 0.08, C.blue); sign.position.set(0, 1.02, 0.35); A(sign);
      for (let i = 0; i < 5; i += 1) { const s = box(0.24, 0.34, 0.02, i % 2 ? C.saffron : C.white); s.position.set(-0.5 + i * 0.25, 0.78, 0.56); s.rotation.x = -0.5; A(s); }
      break;
    }
    case 'building': {
      const storeys = 3;
      for (let i = 0; i < storeys; i += 1) {
        const fl = box(1.2 - i * 0.08, 0.7, 1.1 - i * 0.06, C.concrete); fl.position.y = 0.35 + i * 0.7; A(fl);
        for (let j = -1; j <= 1; j += 1) { const w = box(0.2, 0.26, 0.04, win); w.position.set(j * 0.34, 0.4 + i * 0.7, (1.1 - i * 0.06) / 2 + 0.01); A(w); }
      }
      const roof = box(1.05, 0.1, 0.95, C.tin); roof.position.y = 2.2; A(roof); // empty roof (solar prompt)
      break;
    }
    case 'busstop': {
      const pole = cyl(0.04, 0.04, 1.6, 6, C.steel); pole.position.set(-0.5, 0.8, 0); A(pole);
      const sign = box(0.5, 0.34, 0.05, C.blue); sign.position.set(-0.5, 1.5, 0); A(sign);
      const roof = box(1.2, 0.06, 0.5, C.tin); roof.position.set(0.2, 1.2, 0); A(roof);
      const back = box(1.2, 0.7, 0.06, C.glass); back.position.set(0.2, 0.85, -0.22); A(back);
      const bench = box(1.0, 0.08, 0.28, C.wood); bench.position.set(0.2, 0.5, 0); A(bench);
      break;
    }
    case 'signpost': {
      const post = cyl(0.05, 0.06, 1.5, 6, C.wood); post.position.y = 0.75; A(post);
      const a1 = box(0.7, 0.22, 0.05, C.green); a1.position.set(0.22, 1.25, 0); A(a1);
      const a2 = box(0.6, 0.2, 0.05, C.saffron); a2.position.set(-0.2, 0.95, 0); A(a2);
      const stone = mesh(new THREE.DodecahedronGeometry(0.28, 0), C.stone, { flatShading: true }); stone.position.set(0.4, 0.2, 0.3); A(stone);
      break;
    }
    case 'dustbin': {
      const colors = [C.green, C.blue];
      colors.forEach((col, i) => {
        const x = (i - 0.5) * 0.7;
        const body = cyl(0.26, 0.22, 0.6, 12, col); body.position.set(x, 0.3, 0); A(body);
        const lid = cyl(0.29, 0.27, 0.08, 12, C.dark); lid.position.set(x, 0.64, 0); A(lid);
      });
      break;
    }
    case 'waterstation': {
      const stand = box(0.5, 0.7, 0.5, C.concrete); stand.position.y = 0.35; A(stand);
      const tank = cyl(0.34, 0.34, 0.5, 16, C.steel, { metalness: 0.3, roughness: 0.4 }); tank.position.y = 0.95; A(tank);
      const tap = cyl(0.04, 0.04, 0.3, 6, C.steel); tap.rotation.z = Math.PI / 2; tap.position.set(0.3, 0.5, 0.26); A(tap);
      break;
    }
    case 'toilet': {
      const b = box(0.8, 1.1, 0.8, C.white); b.position.y = 0.55; A(b);
      const roof = mesh(new THREE.ConeGeometry(0.7, 0.35, 4), C.tin, { flatShading: true }); roof.position.y = 1.27; roof.rotation.y = Math.PI / 4; A(roof);
      const door = box(0.34, 0.7, 0.05, C.green); door.position.set(0, 0.45, 0.41); A(door);
      const vent = cyl(0.05, 0.05, 0.5, 6, C.dark); vent.position.set(0.3, 1.4, -0.2); A(vent);
      break;
    }
    case 'tent': {
      const t = mesh(new THREE.ConeGeometry(0.7, 0.95, 4), C.saffron, { flatShading: true }); t.position.y = 0.47; t.rotation.y = Math.PI / 4; A(t);
      const door = box(0.22, 0.4, 0.02, C.dark); door.position.set(0, 0.25, 0.5); A(door);
      const fire = new THREE.Group();
      for (let i = 0; i < 5; i += 1) { const lg = cyl(0.03, 0.03, 0.34, 5, C.wood); lg.rotation.z = (i / 5) * Math.PI; lg.rotation.x = 1.3; fire.add(lg); }
      const flame = mesh(new THREE.ConeGeometry(0.12, 0.3, 6), 0xffa033, { emissive: 0xff7a1a, emissiveIntensity: 0.7 }); flame.position.y = 0.2; fire.add(flame);
      fire.position.set(0.9, 0.05, 0.2); A(fire);
      break;
    }
    case 'paddy': {
      const w = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 24), C.water, { roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.92 });
      w.position.y = 0.06; A(w);
      const bund = mesh(new THREE.TorusGeometry(1.2, 0.07, 6, 28), C.wood); bund.rotation.x = Math.PI / 2; bund.position.y = 0.08; A(bund);
      for (let i = 0; i < 26; i += 1) {
        const a = rand(0, Math.PI * 2); const r = rand(0.2, 1.0);
        const blade = cyl(0.005, 0.03, rand(0.18, 0.3), 4, C.green); blade.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r); A(blade);
      }
      break;
    }
    case 'compost': {
      const m = mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x5b3f23, { flatShading: true }); m.position.y = 0.02; A(m);
      for (let i = 0; i < 10; i += 1) { const l = box(rand(0.08, 0.16), 0.02, rand(0.08, 0.16), i % 2 ? C.leaf : 0x8a6a2a); l.position.set(rand(-0.5, 0.5), rand(0.1, 0.5), rand(-0.5, 0.5)); l.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); A(l); }
      break;
    }
    case 'leafpile': {
      const m = mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x9a7b2e, { flatShading: true }); m.position.y = 0.02; A(m);
      for (let i = 0; i < 14; i += 1) { const l = box(0.12, 0.02, 0.16, [0xb08b2e, 0xc89a3a, 0x8a6a2a][i % 3]); l.position.set(rand(-0.45, 0.45), rand(0.05, 0.45), rand(-0.45, 0.45)); l.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); A(l); }
      const rake = cyl(0.025, 0.025, 1.0, 5, C.wood); rake.position.set(0.55, 0.5, 0); rake.rotation.z = 0.5; A(rake);
      break;
    }
    case 'stubble': {
      const field = mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 24), 0xc8a05a); field.position.y = 0.03; A(field);
      for (let i = 0; i < 30; i += 1) { const a = rand(0, Math.PI * 2); const r = rand(0.2, 1.0); const s = cyl(0.02, 0.02, rand(0.1, 0.2), 4, 0xd9c07a); s.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r); A(s); }
      break;
    }
    case 'tractor': {
      const body = box(0.7, 0.36, 0.4, C.crimson); body.position.set(0, 0.42, 0); A(body);
      const cab = box(0.34, 0.3, 0.36, C.blue); cab.position.set(-0.18, 0.72, 0); A(cab);
      const rear = (s) => { const w = cyl(0.32, 0.32, 0.12, 16, C.dark); w.rotation.x = Math.PI / 2; w.position.set(-0.2, 0.32, s * 0.28); return w; };
      const front = (s) => { const w = cyl(0.18, 0.18, 0.1, 14, C.dark); w.rotation.x = Math.PI / 2; w.position.set(0.28, 0.2, s * 0.24); return w; };
      A(rear(1), rear(-1), front(1), front(-1));
      const pipe = cyl(0.04, 0.04, 0.3, 6, C.steel); pipe.position.set(0.2, 0.75, 0); A(pipe);
      break;
    }
    case 'pump': {
      const house = box(0.7, 0.7, 0.7, C.concrete); house.position.y = 0.35; A(house);
      const pipe = cyl(0.07, 0.07, 1.0, 8, C.blue); pipe.rotation.z = Math.PI / 2.4; pipe.position.set(0.55, 0.5, 0); A(pipe);
      const panelStand = cyl(0.04, 0.04, 0.6, 5, C.steel); panelStand.position.set(-0.55, 0.3, 0); A(panelStand);
      const panel = box(0.7, 0.04, 0.45, 0x1e3a6b, { metalness: 0.4, roughness: 0.3 }); panel.position.set(-0.55, 0.6, 0); panel.rotation.x = -0.5; A(panel);
      break;
    }
    case 'nursery': {
      const frame = box(1.4, 0.04, 0.9, C.wood); frame.position.y = 0.7; frame.material.transparent = true; frame.material.opacity = 0.5; A(frame);
      [-0.04, 0.04].forEach((s) => { const p = cyl(0.03, 0.03, 0.7, 5, C.wood); p.position.set(s > 0 ? 0.6 : -0.6, 0.35, 0); A(p); });
      for (let i = 0; i < 4; i += 1) for (let j = 0; j < 3; j += 1) {
        const pot = cyl(0.07, 0.05, 0.1, 8, 0x9a5a3a); pot.position.set(-0.5 + i * 0.33, 0.07, -0.3 + j * 0.3); A(pot);
        const sap = mesh(new THREE.ConeGeometry(0.07, 0.2, 6), C.green, { flatShading: true }); sap.position.set(-0.5 + i * 0.33, 0.22, -0.3 + j * 0.3); A(sap);
      }
      break;
    }
    case 'stones': {
      for (let i = 0; i < 5; i += 1) { const s = mesh(new THREE.DodecahedronGeometry(rand(0.18, 0.3), 0), C.stone, { flatShading: true }); s.position.set(rand(-0.5, 0.1), rand(0.1, 0.35), rand(-0.4, 0.4)); A(s); }
      for (let i = 0; i < 3; i += 1) { const bag = box(0.34, 0.18, 0.24, 0xcfcabb); bag.position.set(0.45, 0.1 + i * 0.18, rand(-0.1, 0.1)); bag.rotation.y = rand(-0.3, 0.3); A(bag); }
      break;
    }
    case 'construction': {
      [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].forEach(([x, z]) => { const p = cyl(0.04, 0.04, 1.4, 6, 0xb98b3a); p.position.set(x, 0.7, z); A(p); });
      [0.45, 0.95].forEach((y) => { const bx = box(1.1, 0.05, 0.05, 0xb98b3a); bx.position.set(0, y, -0.4); A(bx); const bz = box(0.05, 0.05, 0.9, 0xb98b3a); bz.position.set(-0.5, y, 0); A(bz); });
      const drum = cyl(0.22, 0.22, 0.34, 12, 0xe2a23a); drum.rotation.z = 0.5; drum.position.set(0.2, 0.4, 0); A(drum);
      const cone = mesh(new THREE.ConeGeometry(0.16, 0.34, 12), 0xff7a1a); cone.position.set(0.7, 0.17, 0.5); A(cone);
      break;
    }
    case 'powerplant': {
      const house = box(1.3, 0.9, 0.9, C.concrete); house.position.y = 0.45; A(house);
      const roof = box(1.4, 0.12, 1.0, C.tin); roof.position.y = 0.96; A(roof);
      const pen = cyl(0.16, 0.16, 1.6, 12, C.steel, { metalness: 0.3 }); pen.rotation.z = 0.9; pen.position.set(-1.0, 0.7, 0); A(pen);
      const door = box(0.4, 0.5, 0.05, C.blue); door.position.set(0, 0.3, 0.46); A(door);
      const flag = box(0.34, 0.22, 0.03, C.green); flag.position.set(0.7, 1.3, 0); A(flag);
      const pole = cyl(0.03, 0.03, 0.8, 5, C.steel); pole.position.set(0.6, 1.2, 0); A(pole);
      g.userData.flag = flag;
      break;
    }
    case 'riverbank': {
      const bank = box(1.6, 0.3, 1.0, 0x9a8b5a); bank.position.y = 0.15; A(bank);
      const edge = mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4, 1, 1, 1), C.water, { roughness: 0.2, metalness: 0.2 }); edge.position.set(0, 0.04, 0.6); A(edge);
      for (let i = -1; i <= 1; i += 1) { const t = makeTree('broad', rand(0.7, 1.0)); t.position.set(i * 0.5, 0.3, -0.1); g.add(t); }
      break;
    }
    case 'glaciallake': {
      const lake = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28), 0x49c4d6, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.92 }); lake.position.y = 0.05; A(lake);
      const moraine = mesh(new THREE.TorusGeometry(1.22, 0.16, 6, 28, Math.PI), C.stone, { flatShading: true }); moraine.rotation.x = Math.PI / 2; moraine.position.y = 0.12; A(moraine);
      for (let i = 0; i < 5; i += 1) { const ice = mesh(new THREE.IcosahedronGeometry(rand(0.12, 0.22), 0), C.ice, { flatShading: true, roughness: 0.4 }); ice.position.set(rand(-0.8, 0.8), 0.12, rand(-0.8, 0.8)); A(ice); }
      break;
    }
    case 'timbertruck': {
      const bed = box(1.3, 0.2, 0.6, C.dark); bed.position.set(0, 0.5, 0); A(bed);
      const cab = box(0.45, 0.5, 0.6, C.blue); cab.position.set(0.78, 0.65, 0); A(cab);
      for (let i = 0; i < 3; i += 1) { const lg = cyl(0.11, 0.11, 1.2, 10, C.wood); lg.rotation.z = Math.PI / 2; lg.position.set(-0.1, 0.7 + (i % 2) * 0.18, -0.2 + i * 0.2); A(lg); }
      [[-0.4, 0.32], [0.2, 0.32], [0.78, 0.32]].forEach(([x]) => { [-0.32, 0.32].forEach((s) => { const w = cyl(0.18, 0.18, 0.1, 12, 0x222); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, s); A(w); }); });
      break;
    }
    default: { const b = box(0.8, 0.8, 0.8, C.stone); b.position.y = 0.4; A(b); }
  }
  return g;
}

/* ── distant terrain: hills / valley rim / canyon walls / snow peaks ───── */
function makeHills(level, scene) {
  const spec = {
    1: { n: 14, rIn: 50, rOut: 66, hMin: 12, hMax: 24, rad: 12, col: 0x4f7a44, snow: false, seg: 6 }, // Baglung hills
    2: { n: 10, rIn: 56, rOut: 70, hMin: 6, hMax: 11, rad: 15, col: 0x3f6b3a, snow: false, seg: 7 },  // Terai: low, flat
    3: { n: 20, rIn: 48, rOut: 62, hMin: 12, hMax: 19, rad: 11, col: 0x5a7d4e, snow: false, seg: 6 }, // KTM valley rim
    4: { n: 16, rIn: 38, rOut: 58, hMin: 20, hMax: 36, rad: 12, col: 0x7a6f63, snow: true, seg: 5 },  // gorge walls
    5: { n: 16, rIn: 46, rOut: 66, hMin: 24, hMax: 42, rad: 13, col: 0x8a93a3, snow: true, seg: 6 },  // Himalaya peaks
  }[level];
  for (let i = 0; i < spec.n; i += 1) {
    const a = (i / spec.n) * Math.PI * 2 + rand(-0.12, 0.12);
    const r = rand(spec.rIn, spec.rOut);
    const h = rand(spec.hMin, spec.hMax);
    const rad = spec.rad * rand(0.7, 1.2);
    const hill = mesh(new THREE.ConeGeometry(rad, h, spec.seg), spec.col, { flatShading: true });
    hill.position.set(Math.cos(a) * r, h / 2 - 1.2, Math.sin(a) * r);
    hill.rotation.y = rand(0, Math.PI); hill.castShadow = false; hill.receiveShadow = false;
    scene.add(hill);
    if (spec.snow) {
      const capH = h * rand(0.3, 0.42);
      const cap = mesh(new THREE.ConeGeometry(rad * (capH / h) * 1.04, capH, spec.seg), 0xeef4f7, { flatShading: true, roughness: 0.6 });
      cap.position.set(hill.position.x, h - capH / 2 - 1.2, hill.position.z); cap.rotation.y = hill.rotation.y;
      cap.castShadow = false; cap.receiveShadow = false; scene.add(cap);
    }
  }
}

/* ── ambient per-level set dressing, clustered around each checkpoint ───── */
function dressLevel(level, scene, decor, smoke, marks, blocked) {
  const place = (obj, x, z, yOff = -0.15) => { if (blocked(x, z)) return obj; obj.position.set(x, groundH(x, z) + yOff, z); scene.add(obj); return obj; };
  const pick = (cx, cz, rMin, rMax) => { for (let k = 0; k < 8; k += 1) { const a = rand(0, Math.PI * 2); const r = rand(rMin, rMax); const x = cx + Math.cos(a) * r; const z = cz + Math.sin(a) * r; if (!blocked(x, z)) return [x, z]; } return null; };
  const ring = (n, rMin, rMax, fn) => { for (let i = 0; i < n; i += 1) { const p = pick(0, 0, rMin, rMax); if (p) fn(p[0], p[1]); } };
  // scatter around a given checkpoint (keeps clear of the building + the river)
  const around = (m, n, rMin, rMax, fn) => { for (let i = 0; i < n; i += 1) { const p = pick(m.x, m.z, rMin, rMax); if (p) fn(p[0], p[1]); } };

  // ONE suspension bridge that actually crosses the river (deck spans Z)
  const bridge = () => {
    const g = new THREE.Group();
    const span = RIVER_HW * 2 + 2.6;
    [-(RIVER_HW + 0.7), RIVER_HW + 0.7].forEach((z) => { const tw = box(0.26, 2.3, 0.26, C.wood); tw.position.set(0, 1.15, z); g.add(tw); });
    const deck = box(2.0, 0.16, span, C.wood); deck.position.y = 0.58; g.add(deck);
    [-0.98, 0.98].forEach((x) => { const cable = box(0.05, 0.05, span + 0.5, 0x555555); cable.position.set(x, 1.95, 0); g.add(cable); });
    for (let i = -2; i <= 2; i += 1) { [-0.98, 0.98].forEach((x) => { const h = box(0.03, 0.85, 0.03, 0x555555); h.position.set(x, 1.5, i * (span / 5)); g.add(h); }); }
    g.position.set(0, 0.12, RIVER_Z); scene.add(g);
  };
  bridge();
  const prayerFlags = (x, z, len = 5) => {
    const g = new THREE.Group();
    const cols = [0x2f6cb0, 0xffffff, 0xdc143c, 0x4caf50, 0xe9b020];
    const line = box(len, 0.02, 0.02, 0x444444); line.position.y = 1.5; g.add(line);
    for (let i = 0; i < len * 3; i += 1) { const f = box(0.18, 0.22, 0.01, cols[i % cols.length]); f.position.set(-len / 2 + i * 0.33, 1.36, 0); g.add(f); }
    g.position.set(x, groundH(x, z), z); scene.add(g);
  };
  const kiln = (x, z) => {
    const g = new THREE.Group();
    const base = box(1.8, 1.1, 1.8, C.brick); base.position.y = 0.55; g.add(base);
    const stack = cyl(0.24, 0.34, 2.4, 10, 0x6e3a26); stack.position.y = 2.1; g.add(stack);
    g.position.set(x, groundH(x, z) - 0.15, z); scene.add(g);
    for (let i = 0; i < 3; i += 1) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.35, 0.6), 0), new THREE.MeshStandardMaterial({ color: 0x8a8079, transparent: true, opacity: 0.5, roughness: 1 })); p.position.set(x + rand(-0.2, 0.2), groundH(x, z) + 3.4 + i * 0.5, z); scene.add(p); smoke.push({ m: p, base: groundH(x, z) + 3.4 }); }
  };
  const grass = (x, z) => { const t = cyl(0.01, 0.05, rand(0.3, 0.6), 4, 0x8fae5a); place(t, x, z, 0.1); };

  if (level === 1) { // Baglung village — houses + trees clustered around each spot
    marks.forEach((m) => {
      around(m, 2 + Math.floor(rand(0, 2)), 3.0, 6.0, (x, z) => place(makeLandmark('house'), x, z));
      around(m, 3, 3.5, 7.5, (x, z) => place(makeTree(['broad', 'broad', 'conifer'][Math.floor(rand(0, 3))], rand(0.8, 1.4)), x, z));
    });
    marks.slice(0, 2).forEach((m) => prayerFlags(m.x * 0.5, m.z * 0.5, 4));
    ring(40, 30, 52, (x, z) => place(makeTree(['broad', 'conifer'][Math.floor(rand(0, 2))], rand(0.9, 1.6)), x, z)); // forested hills
    ring(16, 14, 48, (x, z) => place(makeRock(rand(0.8, 1.8)), x, z, -0.05));
  } else if (level === 2) { // Chitwan Terai — paddies + farmhouse + dense national-park forest
    marks.forEach((m) => {
      around(m, 3, 3.0, 7.0, (x, z) => { const p = makeLandmark('paddy'); p.scale.setScalar(rand(0.8, 1.2)); place(p, x, z, -0.12); });
      around(m, 1, 4.0, 6.0, (x, z) => place(makeLandmark('house'), x, z));
      around(m, 2, 4.0, 8.0, (x, z) => place(makeTree(['broad', 'bush'][Math.floor(rand(0, 2))], rand(0.9, 1.4)), x, z));
      around(m, 8, 2.5, 8.0, grass);
    });
    ring(70, 14, 52, (x, z) => place(makeTree(['broad', 'broad', 'bush'][Math.floor(rand(0, 3))], rand(0.9, 1.6)), x, z)); // dense Chitwan NP forest
    ring(30, 12, 48, grass);
  } else if (level === 3) { // Kathmandu city — a block of buildings around each spot
    marks.forEach((m) => {
      around(m, 4, 3.2, 7.5, (x, z) => { const b = makeLandmark('building'); b.scale.setScalar(rand(0.85, 1.3)); b.rotation.y = rand(0, Math.PI); place(b, x, z); });
      around(m, 1, 3.0, 5.0, (x, z) => place(makeLandmark('dustbin'), x, z));
    });
    kiln(-30, -20); kiln(28, -26); kiln(-24, 30);
    ring(10, 16, 46, (x, z) => place(makeTree('broad', rand(0.7, 1.1)), x, z)); // sparse street trees
  } else if (level === 4) { // Kali Gandaki canyon — rocks/lodges around each spot
    marks.forEach((m) => {
      around(m, 3, 3.0, 7.0, (x, z) => place(makeLandmark('stones'), x, z));
      around(m, 2, 3.5, 8.0, (x, z) => place(makeTree('conifer', rand(0.9, 1.4)), x, z));
      around(m, 1, 4.0, 6.0, (x, z) => place(makeLandmark('house'), x, z));
    });
    ring(22, 24, 52, (x, z) => place(makeRock(rand(2.4, 4.6)), x, z, -0.4)); // canyon walls
  } else { // Khumbu Himalaya — tents/pines/rocks around each spot
    marks.forEach((m) => {
      around(m, 2, 3.0, 7.0, (x, z) => place(makeLandmark('tent'), x, z));
      around(m, 3, 3.5, 8.0, (x, z) => place(makeTree('conifer', rand(0.8, 1.3)), x, z));
      around(m, 4, 2.5, 8.0, (x, z) => place(makeRock(rand(0.8, 2.0)), x, z, -0.1));
    });
    marks.slice(0, 3).forEach((m) => prayerFlags(m.x * 0.55, m.z * 0.55, 4));
    ring(26, 18, 52, (x, z) => place(makeRock(rand(1.0, 3.0)), x, z, -0.1));
  }
}

/* ── road network: town square + spokes + ring linking checkpoints ─────── */
function roadSegments(points) {
  const segs = [];
  points.forEach((p) => segs.push([0, 0, p.x, p.z]));
  const sorted = [...points].sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z));
  for (let i = 0; i < sorted.length; i += 1) { const a = sorted[i]; const b = sorted[(i + 1) % sorted.length]; segs.push([a.x, a.z, b.x, b.z]); }
  return segs;
}
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax; const dz = bz - az; const l2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
function buildRoads(scene, segs) {
  const roadMat = std(0x55534d, { roughness: 1 });
  const lineMat = std(0xd9c98a, { roughness: 1 });
  const plaza = mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.08, 32), 0x6a6760, { roughness: 1 });
  plaza.position.set(0, -0.06, 0); scene.add(plaza);
  const seg = (ax, az, bx, bz, width, y, mat) => {
    const len = Math.hypot(bx - ax, bz - az);
    const g = new THREE.PlaneGeometry(width, len); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.rotation.y = Math.atan2(bx - ax, bz - az);
    m.position.set((ax + bx) / 2, y, (az + bz) / 2); m.receiveShadow = true; scene.add(m);
  };
  segs.forEach((s, i) => {
    seg(s[0], s[1], s[2], s[3], 1.6, -0.05, roadMat);
    if (i < segs.length) seg(s[0], s[1], s[2], s[3], 0.1, -0.04, lineMat); // dashed centre line
  });
}

export default function ExplorerGamePage() {
  const { t, lang } = useLang();
  const L = (o, k) => (lang === 'ne' && o && o[k + '_ne']) ? o[k + '_ne'] : (o ? o[k] : '');
  const mountRef = useRef(null);
  const wrapRef = useRef(null);
  const api = useRef({});
  const [level, setLevel] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  const [event, setEvent] = useState(null);
  const [conseq, setConseq] = useState(null);
  const [summary, setSummary] = useState(null);
  const [touch] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState({ co2: 0, done: 0 });
  const [fs, setFs] = useState(false);
  const decisions = useRef([]);
  const co2 = useRef(0);

  const startLevel = (lv) => {
    setEvent(null); setConseq(null); setSummary(null);
    decisions.current = []; co2.current = 0; setHud({ co2: 0, done: 0 });
    setLevel(lv); setRunId((x) => x + 1);
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
    };
    const onFs = () => setFs(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const data = EXPLORER_LEVELS[level - 1];
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(data.theme.sky);
    scene.background = skyColor.clone();
    scene.fog = new THREE.Fog(skyColor.clone(), 70, 200);

    const W = mount.clientWidth || 600;
    const H = mount.clientHeight || 400;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);

    const aspect = W / H;
    let FR = 20;                       // orthographic zoom (mutable: pinch / wheel)
    let camAzim = Math.PI / 4;         // orbit angle (drag)
    let camElev = 25;                  // camera height / pitch (drag)
    const camDist = 35;                // horizontal distance
    const camera = new THREE.OrthographicCamera(-FR * aspect / 2, FR * aspect / 2, FR / 2, -FR / 2, 0.1, 320);
    camera.position.set(25, 25, 25);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xdff1ff, data.theme.ground, 0.95);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
    sun.position.set(16, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 95;
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    // ground (flattened town, hills outward)
    const groundCol = new THREE.Color(data.theme.ground);
    const geo = new THREE.PlaneGeometry(150, 150, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = [];
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i); const z = pos.getZ(i);
      const h = groundH(x, z);
      pos.setY(i, h - 0.2);
      const shade = 0.84 + (h + 0.6) * 0.08 + rand(-0.02, 0.02);
      const c = groundCol.clone().multiplyScalar(shade);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    ground.receiveShadow = true;
    scene.add(ground);

    // river (east–west band on the north edge; nothing is placed in it)
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(66, RIVER_HW * 2, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4fb6dd, roughness: 0.22, metalness: 0.25, transparent: true, opacity: 0.9 }),
    );
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, RIVER_Z);
    scene.add(river);

    // distant hills / valley rim / peaks
    makeHills(level, scene);

    // checkpoint positions — spread far apart so the world is worth exploring
    const evCount = data.events.length;
    const markPos = data.events.map((_, i) => {
      let ang = (i / evCount) * Math.PI * 2 - Math.PI / 2 + rand(-0.18, 0.18);
      let r = 24 + rand(-3.5, 3.5);
      let x = Math.cos(ang) * r; let z = Math.sin(ang) * r;
      let guard = 0;
      while (onRiver(x, z) && guard < 12) { ang += 0.35; x = Math.cos(ang) * r; z = Math.sin(ang) * r; guard += 1; }
      return { x, z };
    });

    // road network + combined keep-out (river + roads) so nothing lands on a road or in the water
    const roadSegs = roadSegments(markPos);
    const blocked = (x, z) => onRiver(x, z) || roadSegs.some((s) => distToSeg(x, z, s[0], s[1], s[2], s[3]) < 1.3) || Math.hypot(x, z) < 3.4;

    // set dressing + smoke buffer (clustered around the checkpoints)
    const decor = [];
    const smoke = [];
    dressLevel(level, scene, decor, smoke, markPos, blocked);

    // landmark markers (one per decision) with tall beacon, pin and big label
    const markers = markPos.map((mp, i) => {
      const def = data.events[i];
      const { x, z } = mp;
      const y = groundH(x, z) - 0.05;
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = Math.atan2(-x, -z); // face the town square
      const lm = makeLandmark(def.landmark);
      grp.add(lm);
      const ring = mesh(new THREE.TorusGeometry(1.4, 0.11, 8, 32), 0xffe08a, { emissive: 0xffd166, emissiveIntensity: 0.7 });
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; grp.add(ring);
      const beam = mesh(new THREE.CylinderGeometry(0.1, 0.1, 7.5, 8), 0xffe08a, { emissive: 0xffd166, emissiveIntensity: 0.85, transparent: true, opacity: 0.3 });
      beam.position.y = 3.7; grp.add(beam);
      const pin = mesh(new THREE.ConeGeometry(0.5, 1.0, 4), 0xffcf4d, { emissive: 0xffb703, emissiveIntensity: 0.75 });
      pin.rotation.x = Math.PI; pin.position.y = 5.4; grp.add(pin);
      const label = makeLabel(L(def, 'spot') || 'Decision');
      label.position.y = 6.5; grp.add(label);
      grp.userData = { idx: i, done: false, ring, beam, pin, label, accent: lm.userData.flag, x, z };
      scene.add(grp);
      return grp;
    });
    buildRoads(scene, roadSegs);

    const player = makeStudent();
    player.position.set(0, groundH(0, 0) - 0.05, 0);
    scene.add(player);

    const keys = {};
    const paused = { v: false };
    const kd = (e) => { keys[e.key.toLowerCase()] = true; };
    const ku = (e) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    let heading = 0;
    let walkPhase = 0;

    api.current = {
      move: (d, on) => { keys['__' + d] = on; },
      applyEffect: (eff) => {
        if (eff === 'smog_on') { scene.fog = new THREE.FogExp2(0xb9a17e, 0.022); hemi.intensity = 0.55; }
        if (eff === 'sky_hazy') scene.background = new THREE.Color(0xcdbb95);
        if (eff === 'sky_clear') { scene.background = skyColor.clone(); scene.fog = new THREE.Fog(skyColor.clone(), 70, 200); hemi.intensity = 0.95; }
        if (eff === 'river_clean') river.material.color.setHex(0x4fb6dd);
        if (eff === 'river_dirty') river.material.color.setHex(0x8a7233);
      },
      // correct → a tree grows nearby + green tick; wrong → a nearby tree withers + red cross
      resolve: (idx, correct) => {
        const mk = markers.find((m) => m.userData.idx === idx);
        if (!mk) return;
        const ud = mk.userData;
        ud.done = true;
        ud.ring.material.color.setHex(correct ? 0x52b788 : 0xe0573a);
        ud.ring.material.emissive.setHex(correct ? 0x2d6a4f : 0x8a2d1c);
        ud.pin.material.color.setHex(correct ? 0x52b788 : 0xe0573a);
        ud.pin.material.emissive.setHex(correct ? 0x2d6a4f : 0x8a2d1c);
        ud.beam.visible = false;
        if (ud.label) ud.label.material.opacity = 0.5;
        const mark = makeMark(correct);
        mark.position.set(ud.x, groundH(ud.x, ud.z) + 3.6, ud.z);
        scene.add(mark); decor.push(mark);
        if (correct) {
          let placed = false;
          for (let k = 0; k < 14; k += 1) {
            const a = rand(0, Math.PI * 2); const r = rand(2.6, 4.2);
            const tx = ud.x + Math.cos(a) * r; const tz = ud.z + Math.sin(a) * r;
            if (blocked(tx, tz)) continue;
            // full-size geometry; only the GROUP scale animates 0 → 1 (no double-shrink)
            const t = makeTree(level === 5 ? 'conifer' : 'broad', rand(1.5, 2.0));
            t.position.set(tx, groundH(tx, tz) - 0.05, tz);
            t.scale.setScalar(0.01);
            scene.add(t); decor.push(t); t.userData.grow = { t: 0, target: 1 };
            placed = true; break;
          }
          if (!placed) { // fallback directly beside the building
            const tx = ud.x + 2.8; const tz = ud.z;
            const t = makeTree(level === 5 ? 'conifer' : 'broad', 1.7);
            t.position.set(tx, groundH(tx, tz) - 0.05, tz); t.scale.setScalar(0.01);
            scene.add(t); decor.push(t); t.userData.grow = { t: 0, target: 1 };
          }
        } else {
          let best = null; let bd = 9;
          decor.forEach((d) => {
            if (!d.userData || !d.userData.canopy || d.userData.dying || d.userData.dead) return;
            const dd = Math.hypot(d.position.x - ud.x, d.position.z - ud.z);
            if (dd < bd) { bd = dd; best = d; }
          });
          if (!best) { // no tree nearby → spawn one just to fell it
            const tx = ud.x + 2.8; const tz = ud.z;
            best = makeTree(level === 5 ? 'conifer' : 'broad', 1.5);
            best.position.set(tx, groundH(tx, tz) - 0.05, tz); scene.add(best); decor.push(best);
          }
          best.userData.dying = { t: 0 }; // topple + redden, then lie as a dead trunk
        }
      },
      pause: (v) => { paused.v = v; },
      resize: () => {
        const w = mount.clientWidth; const h = mount.clientHeight;
        if (!w || !h) return;
        const asp = w / h;
        camera.left = -FR * asp / 2; camera.right = FR * asp / 2; camera.top = FR / 2; camera.bottom = -FR / 2;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
      },
    };

    let raf;
    const t0 = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;
      let moving = false;
      if (!paused.v) {
        const sp = 0.18;
        const fx = -Math.cos(camAzim); const fz = -Math.sin(camAzim); // screen "up"
        const rx = Math.sin(camAzim); const rz = -Math.cos(camAzim);  // screen "right"
        let mx = 0; let mz = 0;
        if (keys.w || keys.arrowup || keys.__up) { mx += fx; mz += fz; }
        if (keys.s || keys.arrowdown || keys.__down) { mx -= fx; mz -= fz; }
        if (keys.d || keys.arrowright || keys.__right) { mx += rx; mz += rz; }
        if (keys.a || keys.arrowleft || keys.__left) { mx -= rx; mz -= rz; }
        if (mx || mz) {
          moving = true;
          const len = Math.hypot(mx, mz) || 1; mx = (mx / len) * sp; mz = (mz / len) * sp;
          player.position.x = clamp(player.position.x + mx, -50, 50);
          player.position.z = clamp(player.position.z + mz, -50, 50);
          heading = Math.atan2(mx, mz);
        }
        const gy = groundH(player.position.x, player.position.z) - 0.05;
        player.position.y = gy + (moving ? Math.abs(Math.sin(walkPhase * 2)) * 0.04 : Math.sin(t * 2.2) * 0.025);

        for (const mk of markers) {
          if (mk.userData.done) continue;
          const d = Math.hypot(player.position.x - mk.userData.x, player.position.z - mk.userData.z);
          if (d < 1.7) { paused.v = true; setEvent({ idx: mk.userData.idx, def: data.events[mk.userData.idx] }); break; }
        }
      }
      let diff = heading - player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation.y += diff * 0.2;
      const r = player.userData;
      if (moving) {
        walkPhase += 0.28;
        const s = Math.sin(walkPhase) * 0.7;
        r.legL.rotation.x = s; r.legR.rotation.x = -s;
        r.armL.rotation.x = -s * 0.8; r.armR.rotation.x = s * 0.8;
      } else {
        walkPhase = 0;
        r.legL.rotation.x *= 0.8; r.legR.rotation.x *= 0.8;
        r.armL.rotation.x *= 0.8; r.armR.rotation.x *= 0.8;
      }

      markers.forEach((m) => {
        const u = m.userData;
        if (!u.done) {
          u.ring.rotation.z += 0.025;
          u.beam.material.opacity = 0.22 + Math.sin(t * 3 + u.idx) * 0.12;
          u.pin.position.y = 5.4 + Math.sin(t * 2.2 + u.idx) * 0.18;
          u.pin.rotation.y += 0.03;
        }
        if (u.label) u.label.position.y = 6.5 + Math.sin(t * 1.5 + u.idx) * 0.08;
        if (u.accent) u.accent.rotation.y = Math.sin(t * 2 + u.idx) * 0.3;
      });
      decor.forEach((d) => {
        if (!d.userData) return;
        if (d.userData.mark) { d.position.y += Math.sin(t * 2 + d.position.x) * 0.0008; return; }
        if (d.userData.dead) return;
        if (d.userData.canopy && !d.userData.dying) d.userData.canopy.rotation.z = Math.sin(t * 0.8 + d.userData.sway) * 0.04;
        if (d.userData.grow) {
          const gr = d.userData.grow; gr.t = Math.min(1, gr.t + 0.04);
          const e = 1 - (1 - gr.t) * (1 - gr.t); d.scale.setScalar(e * gr.target);
          if (gr.t >= 1) delete d.userData.grow;
        }
        if (d.userData.dying) {
          const dy = d.userData.dying; dy.t = Math.min(1, dy.t + 0.02);
          d.rotation.z = -dy.t * 1.45;                       // fall over
          d.scale.setScalar(Math.max(0.85, 1 - dy.t * 0.12)); // slight slump, stays clearly visible
          if (d.userData.canopy) d.userData.canopy.children.forEach((c) => { if (c.material && c.material.color) c.material.color.lerp(DEADRED, 0.06); });
          if (dy.t >= 1) { d.userData.dead = true; d.userData.dying = null; } // remains as a fallen, reddened tree
        }
      });
      smoke.forEach((p) => { p.m.position.y += 0.012; p.m.material.opacity *= 0.992; if (p.m.position.y > p.base + 2.2) { p.m.position.y = p.base; p.m.material.opacity = 0.5; } });

      const offX = Math.cos(camAzim) * camDist;
      const offZ = Math.sin(camAzim) * camDist;
      const target = new THREE.Vector3(player.position.x + offX, camElev, player.position.z + offZ);
      camera.position.lerp(target, 0.12);
      camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);
      sun.position.set(player.position.x + 16, 28, player.position.z + 12);
      sun.target.position.copy(player.position);
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => api.current.resize && api.current.resize());
    ro.observe(mount);

    // ── player camera control: drag to orbit, wheel / pinch to zoom ──
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    const ptrs = new Map();
    let pinchPrev = 0;
    const onPD = (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { dom.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } };
    const onPM = (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x; const dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size >= 2) {
        const a = [...ptrs.values()]; const dist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        if (pinchPrev) { FR = clamp(FR - (dist - pinchPrev) * 0.06, 11, 34); api.current.resize && api.current.resize(); }
        pinchPrev = dist;
      } else {
        camAzim -= dx * 0.008;
        camElev = clamp(camElev - dy * 0.12, 10, 46);
      }
    };
    const onPU = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinchPrev = 0; try { dom.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ } };
    const onWheel = (e) => { e.preventDefault(); FR = clamp(FR + e.deltaY * 0.02, 11, 34); api.current.resize && api.current.resize(); };
    dom.addEventListener('pointerdown', onPD);
    dom.addEventListener('pointermove', onPM);
    dom.addEventListener('pointerup', onPU);
    dom.addEventListener('pointercancel', onPU);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      dom.removeEventListener('pointerdown', onPD);
      dom.removeEventListener('pointermove', onPM);
      dom.removeEventListener('pointerup', onPU);
      dom.removeEventListener('pointercancel', onPU);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
      scene.clear();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      api.current = {};
    };
  }, [level, runId]);

  const choose = (ci) => {
    const def = event.def;
    const ch = def.choices[ci];
    decisions.current.push({ isCorrect: ch.correct, co2Impact: ch.co2Impact });
    co2.current += ch.correct ? -ch.co2Impact : ch.co2Impact;
    setHud({ co2: co2.current, done: decisions.current.length });
    if (api.current.applyEffect) api.current.applyEffect(ch.effect);
    if (api.current.resolve) api.current.resolve(event.idx, ch.correct);
    setConseq({
      correct: ch.correct,
      text: ch.correct ? L(def, 'explainRight') : (lang === 'ne' ? 'सबैभन्दा राम्रो छनोट होइन। ' : 'Not the greenest choice. ') + L(def, 'explainRight'),
      delta: ch.correct ? -ch.co2Impact : ch.co2Impact,
    });
    setEvent(null);
  };

  const dismissConseq = () => {
    setConseq(null);
    if (decisions.current.length >= EXPLORER_LEVELS[level - 1].events.length) {
      const r = completeLevel(decisions.current);
      setSummary(r);
      if (r.unlockNext && level < 5) setMaxUnlocked((m) => Math.max(m, level + 1));
    } else if (api.current.pause) {
      api.current.pause(false);
    }
  };

  const data = EXPLORER_LEVELS[level - 1];
  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="compass" size={15} /> {t('nav.explore')} · {t('explore.level')} {level}/5</span>
        <h1 style={{ marginTop: 8 }}>{L(data, 'name')}</h1>
        <p>{L(data, 'blurb')}{t('explore.blurbAdd')}</p>
      </div>
      <div className="level-pills">
        {EXPLORER_LEVELS.map((l) => (
          <button
            key={l.id}
            className={'level-pill' + (l.id === level ? ' active' : '') + (l.id > maxUnlocked ? ' locked' : l.id < level ? ' done' : '')}
            disabled={l.id > maxUnlocked}
            onClick={() => startLevel(l.id)}
          >
            Lv {l.id}{l.id < level && l.id <= maxUnlocked ? <Icon name="check" size={14} /> : null}
          </button>
        ))}
      </div>
      <div className={'stage' + (fs ? ' is-fs' : '')} ref={wrapRef}>
        <div className="stage-canvas" ref={mountRef} />
        <div className="hud">
          <span className="chip"><Icon name="smog" size={16} /> CO₂ {hud.co2 >= 0 ? '+' : ''}{hud.co2.toFixed(1)} kg</span>
          <div className="hud-right">
            <span className="chip"><Icon name="check" size={16} /> {hud.done}/{data.events.length}</span>
            <button className="chip icon-chip" title="Fullscreen (F)" onClick={toggleFullscreen}>
              <Icon name={fs ? 'collapse' : 'expand'} size={16} />
            </button>
          </div>
        </div>
        {touch ? (
          <div className="dpad">
            <button className="up" onPointerDown={() => api.current.move('up', true)} onPointerUp={() => api.current.move('up', false)} onPointerLeave={() => api.current.move('up', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(90deg)' }} /></button>
            <button className="left" onPointerDown={() => api.current.move('left', true)} onPointerUp={() => api.current.move('left', false)} onPointerLeave={() => api.current.move('left', false)}><Icon name="arrowLeft" size={20} /></button>
            <button className="right" onPointerDown={() => api.current.move('right', true)} onPointerUp={() => api.current.move('right', false)} onPointerLeave={() => api.current.move('right', false)}><Icon name="arrowRight" size={20} /></button>
            <button className="down" onPointerDown={() => api.current.move('down', true)} onPointerUp={() => api.current.move('down', false)} onPointerLeave={() => api.current.move('down', false)}><Icon name="arrowRight" size={20} style={{ transform: 'rotate(90deg)' }} /></button>
          </div>
        ) : null}

        {event ? (
          <div className="event-popup fade-in">
            <div className="bana"><BanaFace size={44} /><div className="bana-bubble"><b style={{ color: 'var(--primary)' }}>{L(event.def, 'spot')}</b><br />{L(event.def, 'prompt')}</div></div>
            <div className="choices-list">
              {event.def.choices.map((c, i) => (
                <button key={i} className="choice-btn" onClick={() => choose(i)}>{L(c, 'label')}</button>
              ))}
            </div>
          </div>
        ) : null}

        {conseq ? (
          <div className={'consequence fade-in ' + (conseq.correct ? 'correct' : 'wrong')} onClick={dismissConseq}>
            <div className="ico"><Icon name={conseq.correct ? 'leaf' : 'smog'} size={26} /></div>
            <div style={{ fontWeight: 700 }}>{conseq.text}</div>
            <div className="delta">{conseq.delta <= 0 ? `${conseq.delta.toFixed(2)} ${t('explore.heals')}` : `+${conseq.delta.toFixed(2)} ${t('explore.added')}`}</div>
            <div className="muted" style={{ fontWeight: 800, marginTop: 8, fontSize: '.8rem' }}>{t('explore.tapContinue')}</div>
          </div>
        ) : null}

        {summary ? (
          <div className="event-popup fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Baloo 2', fontSize: '2rem', color: summary.passed ? 'var(--primary)' : 'var(--danger)' }}>{summary.scorePercent}%</div>
            <div style={{ fontWeight: 800 }}>{summary.correct}/{summary.total} right · net {summary.co2Delta <= 0 ? '' : '+'}{summary.co2Delta} kg CO₂</div>
            <div className="bana" style={{ margin: '12px 0' }}>
              <BanaFace size={44} />
              <div className="bana-bubble">{summary.passed ? (level < 5 ? t('explore.cleared') : t('explore.clearedAll')) : t('explore.failAgain')}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn ghost" onClick={() => startLevel(level)}><Icon name="refresh" size={18} /> {t('explore.replay')}</button>
              {summary.passed && level < 5 ? <button className="btn" onClick={() => startLevel(level + 1)}>{t('explore.nextLevel')} <Icon name="arrowRight" size={18} /></button> : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className="muted center" style={{ fontWeight: 700, marginTop: 10 }}>
        <span className="kbd">W A S D</span> · {t('explore.instr')}
      </div>
    </div>
  );
}

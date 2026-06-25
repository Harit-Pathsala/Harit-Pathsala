import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, std, makeStudent, animateStudent, makeSkyTexture, makeGroundTexture, makePrayerFlags } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';

const SPEED = 7, PR = 0.5, REACH = 2.7, BOUND = 40;

/* ── jungle flora ───────────────────────────────────────────────────────── */
function makeSalTree(s = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.18, 0.3, 4.4, 7, 0x6e4a2c); trunk.position.y = 2.2; g.add(trunk);
  const greens = [0x2f6e3a, 0x357a42, 0x276030];
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.SphereGeometry(1.7 - i * 0.28, 8, 7), greens[i % 3], { flatShading: true }); c.position.y = 4.3 + i * 1.0; c.scale.y = 0.82; g.add(c); }
  g.scale.setScalar(s); g.userData.radius = 0.9 * s; return g;
}
function makeGrassClump(s = 1) {
  const g = new THREE.Group(); const greens = [0x7aa53a, 0x6b9a32, 0x86b545];
  for (let i = 0; i < 7; i++) { const h = 1.4 + Math.random() * 1.1; const bl = cone(0.06, h, 4, greens[i % 3]); bl.position.set((Math.random() - 0.5) * 0.6, h / 2, (Math.random() - 0.5) * 0.6); bl.rotation.z = (Math.random() - 0.5) * 0.35; g.add(bl); }
  g.scale.setScalar(s); return g;
}

/* ── wildlife (simple, readable low-poly) ───────────────────────────────── */
function makeRhino() {
  const g = new THREE.Group(); const c = 0x8a8d86;
  const body = mesh(new THREE.SphereGeometry(1.1, 10, 8), c, { flatShading: true }); body.scale.set(1.7, 1.0, 1.0); body.position.y = 1.1; g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.62, 8, 7), c, { flatShading: true }); head.scale.set(1.2, 0.9, 0.9); head.position.set(2.0, 1.0, 0); g.add(head);
  const horn = cone(0.16, 0.6, 7, 0xd8d2c4); horn.position.set(2.6, 1.4, 0); horn.rotation.z = -0.5; g.add(horn);
  for (const [ex, ez] of [[1.0, 0.5], [1.0, -0.5], [-1.0, 0.5], [-1.0, -0.5]]) { const leg = cyl(0.22, 0.22, 1.0, 6, c); leg.position.set(ex, 0.5, ez); g.add(leg); }
  return g;
}
function makeElephant() {
  const g = new THREE.Group(); const c = 0x8d8f8a;
  const body = mesh(new THREE.SphereGeometry(1.5, 10, 8), c, { flatShading: true }); body.scale.set(1.5, 1.2, 1.1); body.position.y = 2.0; g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.95, 8, 7), c, { flatShading: true }); head.position.set(2.0, 2.1, 0); g.add(head);
  for (const sgn of [1, -1]) { const ear = box(0.1, 1.1, 0.9, c); ear.position.set(1.9, 2.1, sgn * 0.95); g.add(ear); }
  for (let i = 0; i < 4; i++) { const t = cyl(0.18 - i * 0.02, 0.22 - i * 0.02, 0.5, 6, c); t.position.set(2.6 + i * 0.06, 1.7 - i * 0.42, 0); t.rotation.z = 0.35; g.add(t); }
  for (const sgn of [1, -1]) { const tusk = cone(0.08, 0.6, 6, 0xeee4cf); tusk.position.set(2.7, 1.5, sgn * 0.35); tusk.rotation.z = 0.9; g.add(tusk); }
  for (const [ex, ez] of [[1.0, 0.7], [1.0, -0.7], [-1.0, 0.7], [-1.0, -0.7]]) { const leg = cyl(0.3, 0.32, 1.4, 7, c); leg.position.set(ex, 0.7, ez); g.add(leg); }
  return g;
}
function makeDeer() {
  const g = new THREE.Group(); const c = 0xb0834e;
  const body = mesh(new THREE.SphereGeometry(0.6, 9, 7), c, { flatShading: true }); body.scale.set(1.6, 0.9, 0.8); body.position.y = 1.3; g.add(body);
  const neck = cyl(0.16, 0.2, 0.9, 6, c); neck.position.set(0.85, 1.7, 0); neck.rotation.z = -0.6; g.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.3, 7, 6), c, { flatShading: true }); head.position.set(1.25, 2.1, 0); g.add(head);
  for (const sgn of [1, -1]) { const ant = cone(0.05, 0.5, 4, 0x6e4a2c); ant.position.set(1.3, 2.5, sgn * 0.12); ant.rotation.z = sgn * 0.2; g.add(ant); }
  for (const [ex, ez] of [[0.7, 0.3], [0.7, -0.3], [-0.7, 0.3], [-0.7, -0.3]]) { const leg = cyl(0.08, 0.08, 1.0, 5, c); leg.position.set(ex, 0.5, ez); g.add(leg); }
  return g;
}
function makeRangerPost() {
  const g = new THREE.Group(); const wood = 0x8a5a2b, wood2 = 0x6e4a2c;
  for (const [ex, ez] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { const st = cyl(0.14, 0.16, 2.4, 6, wood2); st.position.set(ex, 1.2, ez); g.add(st); }
  const floor = box(3.8, 0.25, 3.8, wood); floor.position.y = 2.4; g.add(floor);
  for (const [ex, ez, w, d] of [[0, -1.9, 3.8, 0.15], [0, 1.9, 3.8, 0.15], [-1.9, 0, 0.15, 3.8], [1.9, 0, 0.15, 3.8]]) { const rail = box(w, 0.7, d, wood2); rail.position.set(ex, 2.9, ez); g.add(rail); }
  const roof = cone(3.2, 1.7, 4, 0x9c6b3a); roof.position.y = 4.1; roof.rotation.y = Math.PI / 4; g.add(roof);
  const flag = makePrayerFlags(6, 0.7); flag.position.set(0, 4.6, 0); g.add(flag);
  g.userData.radius = 2.2; return g;
}
function makeSapling() {
  const g = new THREE.Group(); const stem = cyl(0.04, 0.05, 0.5, 5, 0x6e8b3a); stem.position.y = 0.25; g.add(stem);
  for (let i = 0; i < 3; i++) { const lf = cone(0.12, 0.3, 5, 0x4caf50); lf.position.y = 0.4 + i * 0.12; lf.scale.y = 0.6; g.add(lf); }
  return g;
}
function makeCampfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const log = cyl(0.08, 0.1, 0.9, 6, 0x5a3a1e); log.rotation.z = Math.PI / 2; log.rotation.y = i * Math.PI / 4; log.position.y = 0.1; g.add(log); }
  const flames = []; const fc = [0xff7a1a, 0xffb020, 0xffd84a], fe = [0xff5a00, 0xff8a00, 0xffc000];
  for (let i = 0; i < 3; i++) { const f = mesh(new THREE.ConeGeometry(0.18 - i * 0.04, 0.6 - i * 0.12, 6), fc[i], { emissive: fe[i], emissiveIntensity: 0.6, noOutline: true }); f.position.y = 0.3 + i * 0.1; g.add(f); flames.push(f); }
  g.userData.flames = flames; return g;
}

/* ── floating text label (so the player knows what each target is) ──────── */
function makeLabel(text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(20,42,28,0.88)';
  const r = 16; x.beginPath();
  x.moveTo(r, 2); x.lineTo(256 - r, 2); x.quadraticCurveTo(256, 2, 256, 18); x.lineTo(256, 46);
  x.quadraticCurveTo(256, 62, 256 - r, 62); x.lineTo(r, 62); x.quadraticCurveTo(0, 62, 0, 46); x.lineTo(0, 18);
  x.quadraticCurveTo(0, 2, r, 2); x.fill();
  x.fillStyle = '#eaffe9'; x.font = 'bold 29px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.9, 0.72, 1);
  return spr;
}
/* ── objective marker: ring + glowing locator beam + bobbing chevron + label */
function makeMarker(color, label) {
  const g = new THREE.Group();
  const ring = mesh(new THREE.RingGeometry(0.9, 1.3, 28), color, { noOutline: true }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.material.transparent = true; ring.material.opacity = 0.78; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 7, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14 })); beam.position.y = 3.5; g.add(beam);
  const chev = cone(0.32, 0.62, 4, color, { emissive: color, emissiveIntensity: 0.55, noOutline: true }); chev.rotation.x = Math.PI; chev.position.y = 2.4; g.add(chev);
  if (label) { const l = makeLabel(label); l.position.y = 3.15; g.add(l); }
  g.userData.chev = chev; return g;
}

export default function JungleMission({ onWin, onMap }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [phase, setPhase] = useState('play');
  const [hud, setHud] = useState({ idx: 0, dist: 0 });
  const [bana, setBana] = useState(tt('Welcome, ranger! Follow the glowing arrow to each task. First, let\u2019s check on the wildlife.', 'स्वागत छ, रेन्जर! चम्किलो तीरलाई पछ्याउँदै हरेक काम गर्नुहोस्। पहिले, वन्यजन्तु हेरौं।'));
  const [result, setResult] = useState(null);
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const camModeRef = useRef(0);
  const [view, setView] = useState(0);
  const mountRef = useRef(null), stageRef = useRef(null);
  const activeRef = useGameActiveRef();
  const runRef = useRef(0);
  const restart = () => { setResult(null); setHud({ idx: 0, dist: 0 }); setBana(tt('Welcome back, ranger! Follow the arrow.', 'फेरि स्वागत छ, रेन्जर! तीर पछ्याउनुहोस्।')); setPhase('play'); runRef.current++; };

  // ordered patrol: observe wildlife -> stop the threat -> replant -> report back
  const TASKS = [
    { id: 'deer', kind: 'spot', x: -19, z: 12, icon: 'deer', ml: ['Deer', '\u092e\u0943\u0917'], sh: ['Find the spotted deer', '\u091a\u093f\u0924\u094d\u0924\u0932 \u092e\u0943\u0917 \u0916\u094b\u091c\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], en: 'Spotted deer! Healthy herds mean the forest is in good shape \u2014 and the trees keep pulling carbon from the air.', ne: '\u091a\u093f\u0924\u094d\u0924\u0932 \u092e\u0943\u0917! \u0938\u094d\u0935\u0938\u094d\u0925 \u092e\u0943\u0917 \u092d\u0928\u0947\u0915\u094b \u091c\u0902\u0917\u0932 \u0930\u093e\u092e\u094d\u0930\u094b \u091b \u2014 \u0930 \u0930\u0941\u0916\u0932\u0947 \u0939\u093e\u0935\u093e\u092c\u093e\u091f \u0915\u093e\u0930\u094d\u092c\u0928 \u0924\u093e\u0928\u093f\u0930\u0939\u0928\u094d\u091b\u0964' },
    { id: 'rhino', kind: 'spot', x: -15, z: -11, icon: 'deer', ml: ['Rhino', '\u0917\u0948\u0901\u0921\u093e'], sh: ['Check on the rhino', '\u0917\u0948\u0901\u0921\u093e \u0939\u0947\u0930\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], en: 'A one-horned rhino! These rare giants only thrive where the sal forest stays protected.', ne: '\u090f\u0915\u0938\u093f\u0919\u0947 \u0917\u0948\u0901\u0921\u093e! \u092f\u0940 \u0926\u0941\u0930\u094d\u0932\u092d \u091c\u0928\u093e\u0935\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0938\u093e\u0932\u0935\u0928\u092e\u093e \u092e\u093e\u0924\u094d\u0930 \u092b\u0938\u094d\u091f\u093e\u0909\u0901\u091b\u0928\u094d\u0964' },
    { id: 'elephant', kind: 'spot', x: 17, z: -13, icon: 'deer', ml: ['Elephants', '\u0939\u093e\u0924\u094d\u0924\u0940'], sh: ['Visit the elephant herd', '\u0939\u093e\u0924\u094d\u0924\u0940 \u0939\u0947\u0930\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], en: 'Wild elephants! A forest like this stores huge amounts of carbon in its wood and soil.', ne: '\u091c\u0902\u0917\u0932\u0940 \u0939\u093e\u0924\u094d\u0924\u0940! \u092f\u0938\u094d\u0924\u094b \u091c\u0902\u0917\u0932\u0932\u0947 \u0915\u093e\u0920 \u0930 \u092e\u093e\u091f\u094b\u092e\u093e \u092a\u094d\u0930\u0936\u0938\u094d\u0924 \u0915\u093e\u0930\u094d\u092c\u0928 \u092d\u0923\u094d\u0921\u093e\u0930\u0923 \u0917\u0930\u094d\u091b\u0964' },
    { id: 'fire', kind: 'fire', x: 12, z: 15, icon: 'flame', ml: ['Put out fire', '\u0906\u0917\u094b \u0928\u093f\u092d\u093e\u0909\u0928\u0941\u0939\u094b\u0938\u094d'], sh: ['Put out the campfire', '\u0906\u0917\u094b \u0928\u093f\u092d\u093e\u0909\u0928\u0941\u0939\u094b\u0938\u094d'], en: 'Fire out! Forest fires release all the carbon the trees stored \u2014 straight back into the sky.', ne: '\u0906\u0917\u094b \u0928\u093f\u092d\u094d\u092f\u094b! \u091c\u0902\u0917\u0932\u0915\u094b \u0906\u0917\u094b\u0932\u0947 \u0930\u0941\u0916\u0932\u0947 \u091c\u092e\u094d\u092e\u093e \u0917\u0930\u0947\u0915\u094b \u0915\u093e\u0930\u094d\u092c\u0928 \u0906\u0915\u093e\u0936\u092e\u093e \u092b\u0930\u094d\u0915\u093e\u0909\u0901\u091b\u0964' },
    { id: 'sap1', kind: 'sap', x: -6, z: 5, icon: 'sprout', ml: ['Plant here', '\u092f\u0939\u093e\u0901 \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], sh: ['Plant a sal sapling (1 of 3)', '\u0938\u093e\u0932\u0915\u094b \u092c\u093f\u0930\u0941\u0935\u093e \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d (\u0967/\u0969)'], en: 'One sapling planted! Young trees soak up CO2 as they grow.', ne: '\u090f\u0915 \u092c\u093f\u0930\u0941\u0935\u093e \u0930\u094b\u092a\u093f\u092f\u094b! \u092c\u0922\u094d\u0926\u0948 \u0917\u0930\u094d\u0926\u093e \u0930\u0941\u0916\u0932\u0947 CO2 \u0938\u094b\u0938\u094d\u091b\u0964' },
    { id: 'sap2', kind: 'sap', x: 5, z: -4, icon: 'sprout', ml: ['Plant here', '\u092f\u0939\u093e\u0901 \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], sh: ['Plant a sal sapling (2 of 3)', '\u0938\u093e\u0932\u0915\u094b \u092c\u093f\u0930\u0941\u0935\u093e \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d (\u0968/\u0969)'], en: 'Two down! Replanting is one of the cheapest ways to fight climate change.', ne: '\u0926\u0941\u0908 \u0938\u0915\u093f\u092f\u094b! \u092a\u0941\u0928\u0903\u0930\u094b\u092a\u0923 \u091c\u0932\u0935\u093e\u092f\u0941 \u092a\u0930\u093f\u0935\u0930\u094d\u0924\u0928 \u0930\u094b\u0915\u094d\u0928\u0947 \u0938\u0938\u094d\u0924\u094b \u0909\u092a\u093e\u092f \u0939\u094b\u0964' },
    { id: 'sap3', kind: 'sap', x: -3, z: 19, icon: 'sprout', ml: ['Plant here', '\u092f\u0939\u093e\u0901 \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d'], sh: ['Plant a sal sapling (3 of 3)', '\u0938\u093e\u0932\u0915\u094b \u092c\u093f\u0930\u0941\u0935\u093e \u0930\u094b\u092a\u094d\u0928\u0941\u0939\u094b\u0938\u094d (\u0969/\u0969)'], en: 'Three saplings in the ground \u2014 a future carbon sink. Patrol complete!', ne: '\u0924\u0940\u0928 \u092c\u093f\u0930\u0941\u0935\u093e \u0930\u094b\u092a\u093f\u092f\u094b \u2014 \u092d\u0935\u093f\u0937\u094d\u092f\u0915\u094b \u0915\u093e\u0930\u094d\u092c\u0928 \u092d\u0923\u094d\u0921\u093e\u0930\u0964 \u0917\u0938\u094d\u0924\u0940 \u092a\u0942\u0930\u093e!' },
  ];
  const FINISH = { x: 0, z: -23, icon: 'backpack' };

  useEffect(() => {
    if (phase !== 'play') return;
    const mount = mountRef.current; if (!mount) return;
    const myRun = runRef.current; let raf = 0, ended = false;
    const W = mount.clientWidth || 760, H = mount.clientHeight || 460;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture(0x86c8d0);
    scene.fog = new THREE.Fog(0xcfe3d6, 40, 100);
    const camera = new THREE.PerspectiveCamera(56, W / H, 0.1, 400);
    camera.position.set(0, 8, 12);

    scene.add(new THREE.HemisphereLight(0xdaf0e2, 0x33502a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.5); sun.position.set(-30, 50, -20); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50; scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshToonMaterial({ map: makeGroundTexture(0x5f7e3e, { lines: false }) }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(7, 120), std(0x4eaeac, { transparent: true, opacity: 0.85, roughness: 0.25, noOutline: true }));
    river.rotation.x = -Math.PI / 2; river.position.set(30, 0.06, 0); river.rotation.z = 0.12; scene.add(river);

    const colliders = [];
    const add = (o, x, z, ry = 0) => { o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); if (o.userData.radius > 0) colliders.push({ x, z, r: o.userData.radius }); return o; };

    const clears = [...TASKS.map((t) => ({ x: t.x, z: t.z })), FINISH, { x: 0, z: 24 }];
    const nearClear = (x, z, r) => clears.some((c) => Math.hypot(x - c.x, z - c.z) < r);

    let placed = 0, tries = 0;
    while (placed < 52 && tries < 2200) {
      tries++; const x = (Math.random() * 2 - 1) * 38, z = (Math.random() * 2 - 1) * 38;
      if (x > 25) continue; if (nearClear(x, z, 5.0)) continue;
      add(makeSalTree(0.8 + Math.random() * 0.8), x, z, Math.random() * Math.PI * 2); placed++;
    }
    for (let i = 0; i < 36; i++) { const x = (Math.random() * 2 - 1) * 38, z = (Math.random() * 2 - 1) * 38; if (x > 26 || nearClear(x, z, 2.6)) continue; add(makeGrassClump(0.8 + Math.random() * 0.7), x, z); }

    add(makeRangerPost(), FINISH.x, FINISH.z);
    const rhino = add(makeRhino(), -15, -11, 0.7);
    const eleph = add(makeElephant(), 17, -13, -0.5);
    const deer = add(makeDeer(), -19, 12, 1.3);
    const idlers = [rhino, eleph, deer];
    const fire = makeCampfire(); add(fire, 12, 15);

    const markers = {};
    TASKS.forEach((t, i) => {
      const col = t.kind === 'spot' ? 0x7fe39a : t.kind === 'fire' ? 0xff7a2a : 0x6fc8ff;
      const m = makeMarker(col, tt(t.ml[0], t.ml[1])); add(m, t.x, t.z); m.visible = (i === 0); markers[t.id] = m;
    });
    const finishMarker = makeMarker(0xf2c14a, tt('Ranger post', '\u0930\u0947\u0928\u094d\u091c\u0930 \u092a\u094b\u0938\u094d\u091f')); add(finishMarker, FINISH.x, FINISH.z + 3.4); finishMarker.visible = false;

    // guiding arrow that floats above the player and points at the current objective
    const guide = new THREE.Group();
    const gArrow = cone(0.34, 0.95, 4, 0xffd54a, { emissive: 0xffae00, emissiveIntensity: 0.55, noOutline: true });
    gArrow.rotation.x = Math.PI / 2; gArrow.position.z = 0.55; guide.add(gArrow);
    scene.add(guide);

    const student = makeStudent(); student.scale.setScalar(0.78); add(student, 0, 24); student.rotation.y = Math.PI;

    const state = { won: false };
    let idx = 0;
    function activate() { TASKS.forEach((tk, i) => { markers[tk.id].visible = (i === idx); }); finishMarker.visible = (idx >= TASKS.length); }
    function complete() {
      const tk = TASKS[idx];
      markers[tk.id].visible = false;
      if (tk.kind === 'sap') { const sp = makeSapling(); sp.position.set(tk.x, 0, tk.z); scene.add(sp); }
      if (tk.kind === 'fire') fire.userData.flames.forEach((f) => (f.visible = false));
      setBana(lang === 'ne' ? tk.ne : tk.en);
      if (audio && audio.play) audio.play(tk.kind === 'fire' ? 'sparkle' : 'tap');
      idx++;
      if (idx >= TASKS.length) { finishMarker.visible = true; setBana(tt('Patrol complete \u2014 head back to the ranger post to finish!', '\u0917\u0938\u094d\u0924\u0940 \u092a\u0942\u0930\u093e \u2014 \u0938\u0915\u094d\u0928 \u0930\u0947\u0928\u094d\u091c\u0930 \u092a\u094b\u0938\u094d\u091f\u092e\u093e \u092b\u0930\u094d\u0915\u0928\u0941\u0939\u094b\u0938\u094d!')); }
      else activate();
      setHud((h) => ({ ...h, idx }));
    }
    function win() {
      if (state.won) return; state.won = true; if (onWin) onWin();
      const store = useGameStore.getState();
      if (store.addEcoPoints) store.addEcoPoints(80);
      if (store.addRestoration) store.addRestoration(3, 63);
      if (audio && audio.play) audio.play('sparkle');
      setResult({ win: true, points: 80 }); setPhase('done');
    }

    const ro = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); } });
    ro.observe(mount);

    let camYaw = 0, heading = 0, dragging = false, lastX = 0; const camOffset = new THREE.Vector3();
    const px = (e) => (e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
    const onDown = (e) => { dragging = true; lastX = px(e); };
    const onMoveP = (e) => { if (!dragging) return; const x = px(e); camYaw -= (x - lastX) * 0.01; lastX = x; };
    const onUpP = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMoveP); window.addEventListener('pointerup', onUpP);

    const clock = new THREE.Clock(); let t = 0, hudAcc = 0;
    const step = () => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      const dt = Math.min(clock.getDelta(), 0.05); t += dt;
      const active = activeRef.current !== false;
      const target = idx < TASKS.length ? TASKS[idx] : FINISH;

      if (active && !state.won) {
        const mv = moveRef.current;
        const fwd = (mv.up ? 1 : 0) - (mv.down ? 1 : 0);
        const str = (mv.right ? 1 : 0) - (mv.left ? 1 : 0);
        let moving = false, mx = 0, mz = 0;
        const resolveMove = () => {
          let nx = student.position.x + mx * SPEED * dt, nz = student.position.z + mz * SPEED * dt;
          for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), min = c.r + PR; if (d < min && d > 0.001) { nx = c.x + dx / d * min; nz = c.z + dz / d * min; } }
          nx = Math.max(-BOUND, Math.min(BOUND, nx)); nz = Math.max(-BOUND, Math.min(BOUND, nz));
          student.position.x = nx; student.position.z = nz;
        };
        if (camModeRef.current === 1) {
          if (str !== 0) heading -= str * 2.3 * dt; student.rotation.y = heading;
          if (fwd !== 0) { moving = true; mx = Math.sin(heading) * fwd; mz = Math.cos(heading) * fwd; resolveMove(); }
        } else if (fwd !== 0 || str !== 0) {
          moving = true; const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
          mx = -str * cosY - fwd * sinY; mz = -str * sinY + fwd * cosY; const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
          resolveMove(); student.rotation.y = Math.atan2(mx, mz); heading = student.rotation.y;
        }
        animateStudent(student, moving, t);

        const dx = student.position.x - target.x, dz = student.position.z - target.z; const dist = Math.hypot(dx, dz);
        if (idx < TASKS.length) { if (dist < REACH) complete(); }
        else if (dist < REACH + 0.6) win();
        hudAcc += dt; if (hudAcc > 0.15) { hudAcc = 0; setHud((h) => ({ ...h, dist: Math.round(dist) })); }
      }

      // guiding arrow
      const gx = student.position.x, gz = student.position.z;
      guide.position.set(gx, 3.1 + Math.sin(t * 4) * 0.12, gz);
      guide.rotation.y = Math.atan2(target.x - gx, target.z - gz);
      guide.visible = !state.won && Math.hypot(gx - target.x, gz - target.z) > 3.4;

      idlers.forEach((a, i) => { a.position.y = Math.sin(t * 1.5 + i) * 0.06; });
      if (fire.userData.flames[0].visible) fire.userData.flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.25; });
      for (const id in markers) { const m = markers[id]; if (m.visible && m.userData.chev) m.userData.chev.position.y = 2.4 + Math.sin(t * 3) * 0.22; }
      if (finishMarker.visible && finishMarker.userData.chev) finishMarker.userData.chev.position.y = 2.4 + Math.sin(t * 3) * 0.22;

      if (camModeRef.current === 1) {
        let dyaw = (-student.rotation.y) - camYaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        camYaw += dyaw * Math.min(1, dt * 2.6);
        camOffset.set(Math.sin(camYaw) * 5.0, 1.95, -Math.cos(camYaw) * 5.0);
        const gp = student.position.clone(); gp.y = 0; camera.position.lerp(gp.add(camOffset), 0.14); camera.lookAt(student.position.x, 1.15, student.position.z);
      } else {
        camOffset.set(Math.sin(camYaw) * 9.5, 4.2, -Math.cos(camYaw) * 9.5);
        const gp = student.position.clone(); gp.y = 0; camera.position.lerp(gp.add(camOffset), 0.1); camera.lookAt(student.position.x, 1.8, student.position.z);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMoveP); window.removeEventListener('pointerup', onUpP);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'play') return;
    const set = (code, on) => {
      if (code === 'ArrowUp' || code === 'KeyW') moveRef.current.up = on;
      else if (code === 'ArrowDown' || code === 'KeyS') moveRef.current.down = on;
      else if (code === 'ArrowLeft' || code === 'KeyA') moveRef.current.left = on;
      else if (code === 'ArrowRight' || code === 'KeyD') moveRef.current.right = on;
    };
    const kd = (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); set(e.code, true); };
    const ku = (e) => set(e.code, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); moveRef.current = { up: false, down: false, left: false, right: false }; };
  }, [phase]);

  const press = (dir, on) => { moveRef.current[dir] = on; };
  const toggleCam = () => { camModeRef.current = camModeRef.current ? 0 : 1; setView(camModeRef.current); };
  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };
  const dpad = { width: 54, height: 54, borderRadius: 14, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
  const done = phase === 'play' ? hud.idx : TASKS.length;
  const cur = hud.idx < TASKS.length ? TASKS[hud.idx] : null;

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill"><Icon name="forest" size={16} /> {tt('Bardiya \u00b7 Sal Forest Patrol', '\u092c\u0930\u094d\u0926\u093f\u092f\u093e \u00b7 \u0938\u093e\u0932\u0935\u0928 \u0917\u0938\u094d\u0924\u0940')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Patrol the jungle, guard the climate', '\u091c\u0902\u0917\u0932 \u0917\u0938\u094d\u0924\u0940, \u091c\u0932\u0935\u093e\u092f\u0941 \u0930\u0915\u094d\u0937\u093e')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">{phase === 'play' ? bana : (result?.win ? tt('Sal forests are vast carbon sinks. Protecting and replanting them is one of Nepal\u2019s strongest climate defences.', '\u0938\u093e\u0932\u0915\u093e \u091c\u0902\u0917\u0932 \u0935\u093f\u0936\u093e\u0932 \u0915\u093e\u0930\u094d\u092c\u0928 \u092d\u0923\u094d\u0921\u093e\u0930 \u0939\u0941\u0928\u094d\u0964 \u0924\u093f\u0928\u0932\u093e\u0908 \u091c\u094b\u0917\u093e\u0909\u0928\u0941 \u0930 \u092a\u0941\u0928\u0903\u0930\u094b\u092a\u0923 \u0917\u0930\u094d\u0928\u0941 \u0928\u0947\u092a\u093e\u0932\u0915\u094b \u092c\u0932\u093f\u092f\u094b \u091c\u0932\u0935\u093e\u092f\u0941 \u0930\u0915\u094d\u0937\u093e \u0939\u094b\u0964') : '')}</div>
        </div>
      </div>

      {phase === 'play' && (
        <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 900, margin: '0 auto', height: 'clamp(360px, 60vh, 600px)', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#cfe6dc,#eef6f1)' }}>
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
          {/* objective banner */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,42,28,.86)', color: '#eaffe9', borderRadius: 12, padding: '7px 14px', textAlign: 'center', minWidth: 230, boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: '.7rem', opacity: .8, fontWeight: 700, letterSpacing: '.04em' }}>{cur ? tt(`OBJECTIVE ${done + 1} / ${TASKS.length}`, `\u0915\u093e\u092e ${done + 1} / ${TASKS.length}`) : tt('FINAL STEP', '\u0905\u0928\u094d\u0924\u093f\u092e')}</div>
            <div style={{ fontWeight: 800, fontSize: '.96rem', marginTop: 1 }}>
              <Icon name={cur ? cur.icon : 'backpack'} size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              {cur ? tt(cur.sh[0], cur.sh[1]) : tt('Return to the ranger post', '\u0930\u0947\u0928\u094d\u091c\u0930 \u092a\u094b\u0938\u094d\u091f\u092e\u093e \u092b\u0930\u094d\u0915\u0928\u0941\u0939\u094b\u0938\u094d')}
              {hud.dist > 0 && <span style={{ opacity: .7, fontWeight: 700 }}> \u00b7 {hud.dist} m</span>}
            </div>
            <div style={{ fontSize: '.66rem', opacity: .72, marginTop: 2 }}>{tt('Follow the yellow arrow above you', '\u092e\u093e\u0925\u093f\u0915\u094b \u092a\u0939\u0947\u0902\u0932\u094b \u0924\u0940\u0930 \u092a\u091b\u094d\u092f\u093e\u0909\u0928\u0941\u0939\u094b\u0938\u094d')}</div>
          </div>
          <button onClick={toggleCam} title={view === 1 ? tt('Follow camera', '\u092b\u0932\u094b \u0915\u094d\u092f\u093e\u092e\u0947\u0930\u093e') : tt('Wide camera', '\u0935\u093e\u0907\u0921 \u0915\u094d\u092f\u093e\u092e\u0947\u0930\u093e')} style={{ position: 'absolute', top: 12, right: 48, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name={view === 1 ? 'walk' : 'compass'} size={16} /></button>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', '\u092a\u0942\u0930\u094d\u0923 \u0938\u094d\u0915\u094d\u0930\u093f\u0928')} style={{ position: 'absolute', top: 12, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>
          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,54px)', gridTemplateRows: 'repeat(3,54px)', gap: 6, opacity: 0.95 }}>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(90deg)' }} /></button><span />
            <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}><Icon name="arrowLeft" size={18} /></button><span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(180deg)' }} /></button>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(-90deg)' }} /></button><span />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10,18,12,.42)', backdropFilter: 'blur(7px)' }}><div className="card center" style={{ maxWidth: 470, margin: 0, maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name="forest" size={42} /></div>
          <h2 style={{ margin: '6px 0' }}>{tt('Jungle Guardian!', '\u091c\u0902\u0917\u0932\u0915\u094b \u0930\u0915\u094d\u0937\u0915!')}</h2>
          <p className="muted" style={{ fontWeight: 600 }}>{tt('You checked the wildlife, put out the fire and planted new sal trees. A healthy, growing forest stores carbon for decades.', '\u0924\u092a\u093e\u0908\u0902\u0932\u0947 \u0935\u0928\u094d\u092f\u091c\u0928\u094d\u0924\u0941 \u0939\u0947\u0930\u094d\u0928\u0941\u092d\u092f\u094b, \u0906\u0917\u094b \u0928\u093f\u092d\u093e\u0909\u0928\u0941\u092d\u092f\u094b \u0930 \u0928\u092f\u093e\u0901 \u0938\u093e\u0932\u0915\u093e \u0930\u0941\u0916 \u0930\u094b\u092a\u094d\u0928\u0941\u092d\u092f\u094b\u0964 \u0938\u094d\u0935\u0938\u094d\u0925, \u092c\u0922\u094d\u0926\u094b \u091c\u0902\u0917\u0932\u0932\u0947 \u0926\u0936\u0915\u094c\u0902\u0938\u092e\u094d\u092e \u0915\u093e\u0930\u094d\u092c\u0928 \u092d\u0923\u094d\u0921\u093e\u0930\u0923 \u0917\u0930\u094d\u091b\u0964')}</p>
          <p style={{ fontWeight: 800, color: 'var(--primary)' }}><Icon name="sparkle" size={16} style={{ verticalAlign: '-2px' }} /> +{result?.points || 80} {tt('eco-points', '\u0907\u0915\u094b-\u092a\u094b\u0907\u0928\u094d\u091f')} \u00b7 <Icon name="tree" size={15} style={{ verticalAlign: '-2px' }} /> 3 {tt('trees', '\u0930\u0941\u0916')}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}><button className="btn" onClick={onMap}>{tt('Continue', 'जारी राख्नुहोस्')}</button><button className="btn" onClick={restart} style={{ background: '#eef3ee', color: '#1c3326' }}><Icon name="refresh" size={16} style={{ verticalAlign: '-3px', marginRight: 4 }} />{tt('Patrol again', '\u092b\u0947\u0930\u093f \u0917\u0938\u094d\u0924\u0940')}</button></div>
        </div></div>
      )}
    </div>
  );
}

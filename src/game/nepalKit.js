// nepalKit.js — a reusable library of stylized, low-poly Nepal building &
// world components for the Harit Pathsala explorer. Pure Three.js (matches the
// project's vanilla-three setup; no R3F). Every builder returns a THREE.Group
// you can position and scene.add(). Living systems (traffic, birds, clouds)
// return an `update(dt)` you call each frame.
//
// Authenticity notes are inline: Newari pagodas (Nyatapola), the Boudhanath
// stupa with its all-seeing Buddha eyes, a Tibetan gumba, Kathmandu's tangled
// power lines, Sajha microbuses, Safa tempos, pigeon flocks, prayer flags.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ── tiny shared helpers (self-contained so the kit is reusable anywhere) ── */
export const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/* ── cel-shading + hand-inked outline (Messenger-style toon look) ──────────
   One shared toon ramp + one shared ink-outline material, so every scene that
   builds through std()/mesh()/box()/cyl()/cone() re-skins at once. dispose() is
   a no-op on these singletons because component-unmount traversals dispose all
   materials/textures — we want the shared toon assets to survive scene swaps. */
const TOON_GRAD = (() => {
  const steps = new Uint8Array([120, 195, 255]); // soft 3-tone cel (cleaner, hand-drawn)
  const t = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true; t.dispose = () => {};
  return t;
})();
let OUTLINES_ON = true;
export const setOutlines = (v) => { OUTLINES_ON = v; };
const INK = (() => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uW: { value: 0.085 }, uC: { value: new THREE.Color(0x201810) } },
    vertexShader:
      'uniform float uW;\n' +
      'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453123); }\n' +
      'void main(){\n' +
      '  float j = 0.55 + 0.95*h(position.xyz);\n' +            // per-vertex thickness jitter → hand-inked, not machine-uniform
      '  vec3 n = normalize(normalMatrix * normal);\n' +
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n' +
      '  mv.xyz += n * uW * j;\n' +
      '  gl_Position = projectionMatrix * mv;\n' +
      '}',
    fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }',
    side: THREE.BackSide,
  });
  m.dispose = () => {};
  return m;
})();
const INK_THIN = (() => {
  const m = INK.clone();
  m.uniforms.uW = { value: 0.02 };
  m.uniforms.uC = { value: new THREE.Color(0x201810) };
  m.dispose = () => {};
  return m;
})();
const FLAT_GEO = { PlaneGeometry: 1, CircleGeometry: 1, RingGeometry: 1, ShapeGeometry: 1 };

export const std = (color, o = {}) => {
  const { roughness, metalness, flatShading, noOutline, force, forceOutline, thinOutline, ...rest } = o; // strip non-material props
  return new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRAD, ...rest });
};
export function mesh(geo, color, o = {}) {
  const mat = color instanceof THREE.Material ? color : std(color, o);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  const transparent = mat && (mat.transparent || (mat.opacity != null && mat.opacity < 1));
  let outline = OUTLINES_ON && !(o && o.noOutline) && !FLAT_GEO[geo && geo.type] && !transparent;
  if (outline) {
    if (geo && !geo.boundingSphere) geo.computeBoundingSphere();
    if (geo && geo.boundingSphere && geo.boundingSphere.radius < 0.42 && !(o && (o.force || o.forceOutline))) outline = false; // skip tiny props unless forced
  }
  if (outline) {
    const ol = new THREE.Mesh(geo, (o && o.thinOutline) ? INK_THIN : INK);   // inverted-hull outline
    ol.castShadow = false; ol.receiveShadow = false;
    m.add(ol);
  }
  return m;
}
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), c, o);
export const cyl = (rt, rb, h, s, c, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), c, o);
export const cone = (r, h, s, c, o) => mesh(new THREE.ConeGeometry(r, h, s), c, o);

/* Nepal palette — terracotta, Newari brick, prayer-flag colours, snow. */
export const NP = {
  brick: 0x9c4a32, brickDark: 0x7c3a28, mud: 0xcf9457, plaster: 0xefe6d2,
  white: 0xf2ece0, roofTile: 0xb24a32, roofGold: 0xd6a93c, gold: 0xe9c34a,
  wood: 0x6b4a2f, woodDark: 0x4a321f, maroon: 0x7a232b, saffron: 0xe98a2b,
  tin: 0x7f8a90, glass: 0x9fd6e6, stone: 0x8b8a86, snow: 0xf4fbff, rock: 0x6f7783,
  green: 0x4caf50, leaf: 0x2f7d4f, water: 0x57b6dd, busGreen: 0x2f7d4f, taxiYellow: 0xf2b705,
  flag: [0x2f6cb0, 0xffffff, 0xdc2f2f, 0x2f9e44, 0xf2b705], // blue white red green yellow (Lungta)
};

/* ── SUN — warm disc with a soft radial glow sprite ─────────────────────── */
export function makeSun() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2c4 }),
  );
  g.add(core);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const grd = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,240,200,0.95)');
  grd.addColorStop(0.4, 'rgba(255,224,150,0.35)');
  grd.addColorStop(1, 'rgba(255,224,150,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  glow.scale.set(22, 22, 1);
  g.add(glow);
  return g;
}

/* ── HIMALAYA RANGE — layered snow peaks for the far horizon ─────────────── */
export function makeHimalayas({ count = 11, radius = 150, height = 46 } = {}) {
  const g = new THREE.Group();
  for (let layer = 0; layer < 2; layer++) {
    const r = radius - layer * 26;
    const h = height - layer * 12;
    const rockC = layer === 0 ? 0x8b93a3 : 0x9aa3b3;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.08, 0.08);
      const ph = h * rand(0.62, 1);
      const peak = cone(ph * rand(0.42, 0.6), ph, 5, rockC, { flatShading: true });
      peak.castShadow = false;
      peak.receiveShadow = false;
      peak.position.set(Math.cos(a) * r, ph / 2 - 6, Math.sin(a) * r);
      peak.rotation.y = rand(0, Math.PI);
      // snow cap
      const cap = cone(ph * rand(0.42, 0.6) * 0.55, ph * 0.42, 5, NP.snow, { flatShading: true, roughness: 0.6 });
      cap.castShadow = false;
      cap.position.set(peak.position.x, peak.position.y + ph * 0.3, peak.position.z);
      cap.rotation.y = peak.rotation.y;
      g.add(peak, cap);
    }
  }
  return g;
}

/* ── PRAYER FLAG LINE — string of Lungta-coloured flags ─────────────────── */
export function makePrayerFlags(span = 5, droop = 0.5) {
  const g = new THREE.Group();
  const n = Math.max(5, Math.round(span * 2));
  const flags = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * span;
    const y = -Math.sin(t * Math.PI) * droop;
    if (i < n) {
      const f = box(span / n * 0.7, 0.34, 0.02, NP.flag[i % NP.flag.length], { roughness: 1, side: THREE.DoubleSide });
      f.castShadow = false;
      f.position.set(x + span / n / 2, y - 0.2, 0);
      f.userData.phase = rand(0, Math.PI * 2);
      flags.push(f);
      g.add(f);
    }
  }
  g.userData.flags = flags;
  g.userData.update = (t) => {
    for (const f of flags) f.rotation.y = Math.sin(t * 3 + f.userData.phase) * 0.5;
  };
  return g;
}

/* ── BIRD (pigeon) — simple flapping V, for flocks over the stupa ────────── */
export function makeBird(color = 0x55524e) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.12, 8, 6), color, { flatShading: true });
  body.scale.set(1, 0.7, 1.7);
  body.castShadow = false;
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.6, 0.05, -0.1, 0.6, 0.05, 0.2], 3));
  wingGeo.computeVertexNormals();
  const wmat = std(color, { side: THREE.DoubleSide, flatShading: true });
  const wingL = new THREE.Mesh(wingGeo, wmat);
  const wingR = wingL.clone();
  wingR.scale.x = -1;
  g.add(body, wingL, wingR);
  g.userData = { wingL, wingR };
  return g;
}

/* A flock that lazily circles a centre point. Returns { group, update(dt) }. */
export function makeBirdFlock(center = new THREE.Vector3(0, 12, 0), n = 14, radius = 10) {
  const group = new THREE.Group();
  const birds = [];
  for (let i = 0; i < n; i++) {
    const b = makeBird(pick([0x55524e, 0x6b6862, 0x3f3d3a]));
    const a = (i / n) * Math.PI * 2;
    birds.push({ m: b, a, r: radius + rand(-3, 3), y: rand(-2, 3), spd: rand(0.25, 0.45), flap: rand(6, 9) });
    group.add(b);
  }
  let t = 0;
  function update(dt) {
    t += dt;
    for (const b of birds) {
      b.a += b.spd * dt;
      const x = center.x + Math.cos(b.a) * b.r;
      const z = center.z + Math.sin(b.a) * b.r;
      const y = center.y + b.y + Math.sin(t * 1.5 + b.a) * 0.8;
      b.m.position.set(x, y, z);
      b.m.rotation.y = -b.a + Math.PI / 2;
      const flap = Math.sin(t * b.flap) * 0.7;
      b.m.userData.wingL.rotation.z = flap;
      b.m.userData.wingR.rotation.z = flap;
    }
  }
  return { group, update };
}

/* ── CLOUDS — soft drifting puffs ───────────────────────────────────────── */
export function makeCloud() {
  const g = new THREE.Group();
  const m = std(0xffffff, { roughness: 1, emissive: 0xdfeefc, emissiveIntensity: 0.12 });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.9, 1.6), 0), m);
    p.position.set(rand(-1.6, 1.6), rand(-0.2, 0.3), rand(-0.7, 0.7));
    p.castShadow = false;
    g.add(p);
  }
  return g;
}

/* ── TREE (broadleaf / pipal-ish) ───────────────────────────────────────── */
export function makeTree(scale = 1) {
  const g = new THREE.Group();
  const th = rand(0.6, 1.0) * scale;
  const trunk = cyl(0.06 * scale, 0.1 * scale, th, 6, NP.wood, { flatShading: true });
  trunk.position.y = th / 2;
  g.add(trunk);
  const base = new THREE.Color().setHSL(0.33 + rand(-0.03, 0.04), rand(0.45, 0.6), rand(0.28, 0.4));
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(rand(0.34, 0.5) * scale, 0), base.clone().offsetHSL(0, 0, rand(-0.04, 0.04)), { flatShading: true });
    b.position.set(rand(-0.22, 0.22), th + rand(-0.05, 0.28), rand(-0.22, 0.22));
    g.add(b);
  }
  return g;
}

/* ── carved-look window helper (Newari ankhijhyal) ─────────────────────── */
function carvedWindow(w = 0.4, h = 0.5) {
  const g = new THREE.Group();
  const frame = box(w, h, 0.08, NP.woodDark, { flatShading: true });
  g.add(frame);
  const glass = box(w * 0.7, h * 0.7, 0.04, 0x2a1d12, { roughness: 1 });
  glass.position.z = 0.03;
  g.add(glass);
  // sahanjhya grid lattice — vertical + horizontal bars
  for (let i = -1; i <= 1; i++) {
    const b = box(0.03, h * 0.7, 0.06, NP.wood);
    b.position.set(i * w * 0.22, 0, 0.05);
    g.add(b);
  }
  for (let j = -1; j <= 1; j++) {
    const hb = box(w * 0.7, 0.03, 0.06, NP.wood);
    hb.position.set(0, j * h * 0.2, 0.05);
    g.add(hb);
  }
  const sill = box(w * 1.1, 0.05, 0.16, NP.wood);
  sill.position.y = -h / 2 - 0.02;
  g.add(sill);
  return g;
}

/* ── NEWARI TOWNHOUSE — narrow 3–4 storey brick house, tiled overhang ───── */
export function makeNewariHouse(storeys = 3) {
  const g = new THREE.Group();
  const w = rand(1.6, 2.0), d = rand(1.6, 2.0), sh = 0.95;
  const brickShade = pick([NP.brick, NP.brickDark, 0x97432f, 0x8a4030]);
  for (let s = 0; s < storeys; s++) {
    const body = box(w, sh, d, brickShade, { flatShading: true });
    body.position.y = sh / 2 + s * sh;
    g.add(body);
    // string course (white plaster band between floors)
    const band = box(w + 0.04, 0.08, d + 0.04, NP.plaster);
    band.position.y = (s + 1) * sh;
    g.add(band);
    // windows on front (+z) and back
    const wy = sh / 2 + s * sh + 0.05;
    [-w * 0.26, w * 0.26].forEach((wx) => {
      const win = carvedWindow(0.42, 0.5);
      win.position.set(wx, wy, d / 2 + 0.02);
      g.add(win);
      const winB = carvedWindow(0.42, 0.5);
      winB.position.set(wx, wy, -d / 2 - 0.02);
      winB.rotation.y = Math.PI;
      g.add(winB);
    });
  }
  // ground-floor door
  const door = box(0.5, 0.7, 0.08, NP.woodDark);
  door.position.set(0, 0.35, d / 2 + 0.02);
  g.add(door);
  // overhanging tiled roof
  const roof = cone(Math.max(w, d) * 0.92, 0.5, 4, NP.roofTile, { flatShading: true });
  roof.rotation.y = Math.PI / 4;
  roof.position.y = storeys * sh + 0.22;
  g.add(roof);
  // little eave struts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const strut = box(0.05, 0.4, 0.05, NP.wood);
    strut.position.set(sx * w * 0.42, storeys * sh - 0.1, sz * d * 0.42);
    strut.rotation.x = sz * 0.4;
    g.add(strut);
  }
  g.userData.radius = Math.max(w, d) * 0.7;
  return g;
}

/* ── PAGODA TEMPLE — multi-tiered Newari pagoda (Nyatapola feel) ─────────── */
export function makePagodaTemple() {
  const g = new THREE.Group();
  // stepped brick plinth
  for (let i = 0; i < 4; i++) {
    const s = 4.2 - i * 0.7;
    const step = box(s, 0.32, s, i % 2 ? NP.brickDark : NP.brick, { flatShading: true });
    step.position.y = 0.16 + i * 0.32;
    g.add(step);
  }
  const baseY = 4 * 0.32;
  // sanctum
  const sanctum = box(2.2, 1.4, 2.2, NP.brick, { flatShading: true });
  sanctum.position.y = baseY + 0.7;
  g.add(sanctum);
  const torana = box(0.7, 1.0, 0.1, NP.gold, { metalness: 0.4, roughness: 0.5 });
  torana.position.set(0, baseY + 0.55, 1.12);
  g.add(torana);
  const door = box(0.5, 0.8, 0.06, NP.woodDark);
  door.position.set(0, baseY + 0.45, 1.16);
  g.add(door);
  // three tapering tiled roofs with struts
  const tiers = [{ r: 2.0, y: baseY + 1.4 }, { r: 1.55, y: baseY + 2.15 }, { r: 1.1, y: baseY + 2.8 }];
  tiers.forEach((tt, idx) => {
    const roof = cone(tt.r, 0.6, 4, NP.roofTile, { flatShading: true });
    roof.rotation.y = Math.PI / 4;
    roof.position.y = tt.y + 0.3;
    g.add(roof);
    // tundal struts under each eave
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const strut = box(0.06, 0.55, 0.06, pick([NP.maroon, NP.wood]));
      strut.position.set(Math.cos(a) * tt.r * 0.7, tt.y - 0.05, Math.sin(a) * tt.r * 0.7);
      strut.lookAt(0, tt.y + 0.4, 0);
      strut.rotation.x += 0.5;
      g.add(strut);
    }
    void idx;
  });
  // golden gajur (finial)
  const finBase = cyl(0.18, 0.3, 0.4, 8, NP.roofGold, { metalness: 0.5, roughness: 0.4 });
  finBase.position.y = baseY + 3.1;
  const bell = cone(0.22, 0.5, 10, NP.gold, { metalness: 0.6, roughness: 0.35 });
  bell.position.y = baseY + 3.5;
  const orb = mesh(new THREE.SphereGeometry(0.12, 10, 10), NP.gold, { metalness: 0.7, roughness: 0.3 });
  orb.position.y = baseY + 3.8;
  g.add(finBase, bell, orb);
  // a pair of guardian lion plinths at the stairs
  for (const sx of [-0.8, 0.8]) {
    const p = box(0.4, 0.5, 0.5, NP.stone);
    p.position.set(sx, 0.6, 2.2);
    g.add(p);
    const lion = mesh(new THREE.SphereGeometry(0.18, 8, 7), 0xb8732b, { flatShading: true });
    lion.position.set(sx, 0.95, 2.2);
    g.add(lion);
  }
  g.userData.radius = 3;
  return g;
}

/* Buddha-eyes texture for the stupa harmika (the all-seeing eyes). */
function buddhaEyesTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = '#f4ead2'; x.fillRect(0, 0, 256, 256);          // cream face
  x.fillStyle = '#1c3f8f';                                        // blue band top
  x.fillRect(0, 0, 256, 70);
  // eyes
  x.lineWidth = 7; x.strokeStyle = '#14213d';
  const eye = (cx) => {
    x.fillStyle = '#fff';
    x.beginPath(); x.ellipse(cx, 120, 42, 26, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#14213d';
    x.beginPath(); x.ellipse(cx, 124, 13, 18, 0, 0, Math.PI * 2); x.fill();      // pupil
    // red liner
    x.strokeStyle = '#c0392b'; x.lineWidth = 4;
    x.beginPath(); x.ellipse(cx, 120, 46, 30, 0, Math.PI * 0.05, Math.PI * 0.95); x.stroke();
    x.strokeStyle = '#14213d'; x.lineWidth = 7;
  };
  eye(80); eye(176);
  // the curly "question-mark" Nepali one (nose) between the eyes
  x.strokeStyle = '#1c3f8f'; x.lineWidth = 9; x.lineCap = 'round';
  x.beginPath(); x.moveTo(128, 150); x.quadraticCurveTo(110, 175, 128, 190);
  x.quadraticCurveTo(146, 200, 138, 210); x.stroke();
  // urna (third eye) dot
  x.fillStyle = '#c0392b'; x.beginPath(); x.arc(128, 96, 7, 0, Math.PI * 2); x.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── STUPA — Boudhanath-style white dome, eyes, 13-step spire, flags ────── */
export function makeStupa() {
  const g = new THREE.Group();
  // stepped mandala base (3 terraces)
  for (let i = 0; i < 3; i++) {
    const s = 6 - i * 1.1;
    const step = box(s, 0.5, s, NP.white, { flatShading: true });
    step.position.y = 0.25 + i * 0.5;
    g.add(step);
  }
  const baseY = 1.5;
  // dome (anda)
  const dome = mesh(new THREE.SphereGeometry(2.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), NP.white, { flatShading: false, roughness: 0.85 });
  dome.position.y = baseY;
  g.add(dome);
  // harmika cube with eyes on all four faces
  const eyeTex = buddhaEyesTexture();
  const faceMat = new THREE.MeshStandardMaterial({ map: eyeTex, roughness: 0.8 });
  const plainMat = std(NP.gold, { metalness: 0.3, roughness: 0.6 });
  const harmika = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5),
    [faceMat, faceMat, plainMat, plainMat, faceMat, faceMat]); // +x -x +y -y +z -z
  harmika.position.y = baseY + 2.1;
  harmika.castShadow = true;
  g.add(harmika);
  // 13-step golden spire (the path to enlightenment)
  for (let i = 0; i < 13; i++) {
    const r = 0.6 - i * 0.035;
    const ring = cyl(r, r + 0.02, 0.12, 8, NP.roofGold, { metalness: 0.5, roughness: 0.4 });
    ring.position.y = baseY + 2.8 + i * 0.16;
    g.add(ring);
  }
  // gilded parasol + pinnacle
  const umbrella = cone(0.7, 0.5, 12, NP.gold, { metalness: 0.6, roughness: 0.35 });
  umbrella.position.y = baseY + 5.1;
  const top = mesh(new THREE.SphereGeometry(0.14, 10, 10), NP.gold, { metalness: 0.7, roughness: 0.3 });
  top.position.y = baseY + 5.5;
  g.add(umbrella, top);
  // prayer-flag strings radiating from the top to the ground corners
  const flagSets = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const fl = makePrayerFlags(7, 1.6);
    fl.position.set(Math.cos(a) * 3.4, baseY + 2.3, Math.sin(a) * 3.4);
    fl.rotation.y = a + Math.PI / 2;
    fl.rotation.z = -0.55;
    g.add(fl);
    flagSets.push(fl);
  }
  g.userData.radius = 4.2;
  g.userData.flagSets = flagSets;
  g.userData.update = (t) => flagSets.forEach((f) => f.userData.update && f.userData.update(t));
  return g;
}

/* ── GUMBA — Tibetan Buddhist monastery: white walls, maroon frieze, gold ─ */
export function makeGumba() {
  const g = new THREE.Group();
  const w = 4, d = 3, h = 2.4;
  // battered (inward-sloping) white walls — approximate with a slight taper box
  const body = mesh(new THREE.CylinderGeometry(w * 0.62, w * 0.7, h, 4), NP.white, { flatShading: true });
  body.rotation.y = Math.PI / 4;
  body.position.y = h / 2;
  g.add(body);
  // maroon benma frieze band near the top
  const frieze = mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.55, 0.5, 4), NP.maroon, { flatShading: true });
  frieze.rotation.y = Math.PI / 4;
  frieze.position.y = h - 0.05;
  g.add(frieze);
  // golden flat roof
  const roof = box(w * 0.95, 0.2, d * 0.95, NP.roofGold, { metalness: 0.4, roughness: 0.5 });
  roof.position.y = h + 0.3;
  g.add(roof);
  // dharma wheel + two deer on the roof
  const wheel = cyl(0.34, 0.34, 0.08, 16, NP.gold, { metalness: 0.6, roughness: 0.35 });
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, h + 0.7, d * 0.4);
  g.add(wheel);
  for (const sx of [-0.55, 0.55]) {
    const deer = mesh(new THREE.SphereGeometry(0.16, 8, 7), NP.gold, { metalness: 0.5, roughness: 0.4 });
    deer.scale.set(0.8, 1, 1.4);
    deer.position.set(sx, h + 0.55, d * 0.4);
    g.add(deer);
  }
  // black trapezoid windows
  const wy = h * 0.55;
  for (let i = -1; i <= 1; i++) {
    const win = box(0.4, 0.55, 0.06, 0x201a14);
    win.position.set(i * 1.0, wy, d * 0.5 + 0.02);
    g.add(win);
    const lintel = box(0.5, 0.1, 0.1, NP.maroon);
    lintel.position.set(i * 1.0, wy + 0.32, d * 0.5 + 0.03);
    g.add(lintel);
  }
  // entrance
  const door = box(0.7, 1.0, 0.1, NP.maroon);
  door.position.set(0, 0.5, d * 0.5 + 0.02);
  g.add(door);
  // flanking flag poles
  for (const sx of [-1.6, 1.6]) {
    const pole = cyl(0.04, 0.04, 3.2, 6, NP.wood);
    pole.position.set(sx, 1.6, -d * 0.3);
    g.add(pole);
  }
  g.userData.radius = 3;
  return g;
}

/* ── HOSPITAL — white block, red cross, ambulance bay ───────────────────── */
export function makeHospital() {
  const g = new THREE.Group();
  const w = 4.5, d = 3, h = 3;
  const body = box(w, h, d, 0xf4f6f7, { flatShading: true });
  body.position.y = h / 2;
  g.add(body);
  const base = box(w + 0.1, 0.3, d + 0.1, 0xd7dde0);
  base.position.y = 0.15;
  g.add(base);
  // window grid
  for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) {
    const win = box(0.5, 0.5, 0.04, NP.glass, { emissive: 0x9fd6e6, emissiveIntensity: 0.2 });
    win.position.set(c * 0.8, 0.8 + r * 0.85, d / 2 + 0.02);
    g.add(win);
  }
  // red cross sign
  const signBg = box(1.1, 1.1, 0.1, 0xffffff);
  signBg.position.set(0, h + 0.4, d / 2 - 0.2);
  g.add(signBg);
  const crossV = box(0.25, 0.8, 0.14, 0xd62828);
  crossV.position.set(0, h + 0.4, d / 2 - 0.14);
  const crossH = box(0.8, 0.25, 0.14, 0xd62828);
  crossH.position.set(0, h + 0.4, d / 2 - 0.14);
  g.add(crossV, crossH);
  // canopy entrance
  const canopy = box(2, 0.12, 1.2, 0x9bb0bb);
  canopy.position.set(0, 1.4, d / 2 + 0.6);
  g.add(canopy);
  for (const sx of [-0.9, 0.9]) {
    const col = cyl(0.06, 0.06, 1.4, 6, 0xc2cdd3);
    col.position.set(sx, 0.7, d / 2 + 1.1);
    g.add(col);
  }
  g.userData.radius = Math.max(w, d) * 0.7;
  return g;
}

/* ── SHOP ROW / MARKET STALL — striped awning + goods ───────────────────── */
/* Devanagari shop signboard (real Nepali words via the loaded Baloo 2 font). */
const SHOP_WORDS = ['\u0915\u093f\u0930\u093e\u0928\u093e', '\u091a\u093f\u092f\u093e \u092a\u0938\u0932', '\u0914\u0937\u0927\u093f', '\u0939\u094b\u091f\u0932', '\u092a\u0938\u0932', '\u092e\u093f\u0920\u093e\u0908'];
function signboardTexture(word, bg = 0x1f7a52, fg = '#ffffff') {
  const W = 256, H = 96;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#' + new THREE.Color(bg).getHexString(); x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(0,0,0,.32)'; x.lineWidth = 7; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = "700 52px 'Baloo 2','Mukta','Noto Sans Devanagari',sans-serif";
  x.fillText(word, W / 2, H / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
function makeSignboard(word, bg) {
  const g = new THREE.Group();
  const back = box(1.62, 0.46, 0.06, NP.woodDark); g.add(back);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), new THREE.MeshBasicMaterial({ map: signboardTexture(word, bg) }));
  board.position.z = 0.035; g.add(board);
  return g;
}

export function makeShop(color = NP.mud) {
  const g = new THREE.Group();
  const w = 2, d = 1.6, h = 1.6;
  const body = box(w, h, d, color, { flatShading: true });
  body.position.y = h / 2;
  g.add(body);
  const shutter = box(w * 0.8, 0.9, 0.06, 0x4a6b8a);
  shutter.position.set(0, 0.5, d / 2 + 0.02);
  g.add(shutter);
  // striped awning
  const awn = box(w + 0.3, 0.06, 0.7, 0xd14b3a);
  awn.position.set(0, h - 0.05, d / 2 + 0.35);
  awn.rotation.x = -0.25;
  g.add(awn);
  for (let i = -2; i <= 2; i++) {
    const s = box(0.12, 0.06, 0.72, 0xf2ece0);
    s.position.set(i * 0.4, h - 0.04, d / 2 + 0.35);
    s.rotation.x = -0.25;
    g.add(s);
  }
  // Devanagari signboard
  const sign = makeSignboard(pick(SHOP_WORDS), pick([0x1f7a52, 0xc0392b, 0x2c6fb0, 0xd68910]));
  sign.position.set(0, h * 0.78, d / 2 + 0.05);
  g.add(sign);
  // a couple of fruit baskets
  for (const sx of [-0.6, 0.6]) {
    const basket = cyl(0.2, 0.16, 0.18, 8, 0x9a6b3a);
    basket.position.set(sx, 0.2, d / 2 + 0.55);
    g.add(basket);
    const fruit = mesh(new THREE.SphereGeometry(0.16, 8, 6), pick([0xe85d04, 0xd62828, 0xf2b705]));
    fruit.scale.y = 0.6;
    fruit.position.set(sx, 0.32, d / 2 + 0.55);
    g.add(fruit);
  }
  g.userData.radius = Math.max(w, d) * 0.7;
  return g;
}

/* ── STREET LAMP ────────────────────────────────────────────────────────── */
export function makeStreetLamp() {
  const g = new THREE.Group();
  const pole = cyl(0.05, 0.07, 2.4, 8, 0x4b5358);
  pole.position.y = 1.2;
  g.add(pole);
  const arm = box(0.5, 0.05, 0.05, 0x4b5358);
  arm.position.set(0.22, 2.35, 0);
  g.add(arm);
  const head = mesh(new THREE.SphereGeometry(0.13, 10, 8), 0xfff1c0, { emissive: 0xffe28a, emissiveIntensity: 0.5 });
  head.position.set(0.42, 2.3, 0);
  head.castShadow = false;
  g.add(head);
  return g;
}

/* ── POWER POLE with tangled wires — unmistakably Kathmandu ──────────────── */
export function makePowerPole() {
  const g = new THREE.Group();
  const pole = cyl(0.07, 0.1, 3.2, 8, 0x8a7a5a, { flatShading: true });
  pole.position.y = 1.6;
  g.add(pole);
  // cross arms
  for (const y of [2.7, 3.0]) {
    const arm = box(0.9, 0.06, 0.06, 0x6b5a3a);
    arm.position.set(0, y, 0);
    g.add(arm);
  }
  // transformer box
  const tx = box(0.3, 0.45, 0.3, 0x55504a);
  tx.position.set(0.18, 2.3, 0);
  g.add(tx);
  g.userData.radius = 0.3;
  return g;
}

/* ── DUSTBIN ────────────────────────────────────────────────────────────── */
export function makeDustbin(color = NP.green) {
  const g = new THREE.Group();
  const body = cyl(0.22, 0.18, 0.5, 12, color);
  body.position.y = 0.25;
  g.add(body);
  const lid = cyl(0.24, 0.24, 0.06, 12, 0x2f6b4f);
  lid.position.y = 0.52;
  g.add(lid);
  return g;
}

/* ════════════════════════════════════════════════════════════════════════
 * VEHICLES — Kathmandu street traffic
 * ══════════════════════════════════════════════════════════════════════ */
function wheel(r = 0.18) {
  const w = cyl(r, r, 0.12, 12, 0x1b1b1b);
  w.rotation.z = Math.PI / 2;
  return w;
}

/* Green Sajha-style city microbus. */
export function makeMicrobus() {
  const g = new THREE.Group();
  const body = box(2.4, 0.8, 1.0, NP.busGreen, { flatShading: true });
  body.position.y = 0.7;
  g.add(body);
  const roof = box(2.3, 0.18, 0.95, 0xeef2ec);
  roof.position.y = 1.18;
  g.add(roof);
  // window strip
  const win = box(2.0, 0.34, 1.02, 0x274b63, { roughness: 0.4 });
  win.position.y = 0.95;
  g.add(win);
  // stripe
  const stripe = box(2.42, 0.12, 1.02, 0xf2b705);
  stripe.position.y = 0.55;
  g.add(stripe);
  const wheels = [];
  for (const x of [-0.8, 0.8]) for (const z of [-0.5, 0.5]) {
    const wh = wheel(0.22);
    wh.position.set(x, 0.22, z);
    g.add(wh);
    wheels.push(wh);
  }
  for (const z of [-0.32, 0.32]) {
    const hl = mesh(new THREE.SphereGeometry(0.07, 8, 6), 0xfff3c0, { emissive: 0xffe28a, emissiveIntensity: 0.4 });
    hl.position.set(1.21, 0.6, z);
    hl.castShadow = false;
    g.add(hl);
  }
  g.userData = { wheels, len: 2.4 };
  return g;
}

/* Safa tempo — small electric three-wheeler. */
export function makeTempo() {
  const g = new THREE.Group();
  const cab = box(1.0, 0.8, 0.9, 0x2f9e44, { flatShading: true });
  cab.position.y = 0.6;
  g.add(cab);
  const top = box(1.05, 0.5, 0.95, 0xe9e4d6);
  top.position.y = 1.05;
  g.add(top);
  const win = box(0.7, 0.34, 0.92, 0x274b63);
  win.position.set(0.1, 0.85, 0);
  g.add(win);
  const front = wheel(0.16);
  front.position.set(0.5, 0.16, 0);
  g.add(front);
  const wheels = [front];
  for (const z of [-0.4, 0.4]) {
    const wh = wheel(0.18);
    wh.position.set(-0.4, 0.18, z);
    g.add(wh);
    wheels.push(wh);
  }
  g.userData = { wheels, len: 1.1 };
  return g;
}

/* Motorbike. */
export function makeMotorbike() {
  const g = new THREE.Group();
  const body = box(0.7, 0.18, 0.2, 0xd62828, { flatShading: true });
  body.position.y = 0.45;
  g.add(body);
  const seat = box(0.4, 0.1, 0.22, 0x1a1a1a);
  seat.position.set(-0.1, 0.55, 0);
  g.add(seat);
  const tank = box(0.25, 0.18, 0.22, 0x9c1f1f);
  tank.position.set(0.18, 0.56, 0);
  g.add(tank);
  const bar = cyl(0.02, 0.02, 0.4, 6, 0x222);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0.4, 0.62, 0);
  g.add(bar);
  const wheels = [];
  for (const x of [-0.35, 0.35]) {
    const wh = wheel(0.2);
    wh.position.set(x, 0.2, 0);
    g.add(wh);
    wheels.push(wh);
  }
  g.userData = { wheels, len: 0.9 };
  return g;
}

/* Small white taxi (black-and-yellow plate vibe). */
export function makeTaxi() {
  const g = new THREE.Group();
  const body = box(1.5, 0.5, 0.85, 0xf2ece0, { flatShading: true });
  body.position.y = 0.45;
  g.add(body);
  const cabin = box(0.9, 0.42, 0.8, 0xe7e0d2);
  cabin.position.set(-0.05, 0.82, 0);
  g.add(cabin);
  const win = box(0.85, 0.3, 0.82, 0x274b63);
  win.position.set(-0.05, 0.82, 0);
  g.add(win);
  const sign = box(0.2, 0.12, 0.2, NP.taxiYellow, { emissive: 0xf2b705, emissiveIntensity: 0.3 });
  sign.position.set(-0.05, 1.08, 0);
  sign.castShadow = false;
  g.add(sign);
  const stripe = box(1.52, 0.1, 0.86, NP.taxiYellow);
  stripe.position.y = 0.4;
  g.add(stripe);
  const wheels = [];
  for (const x of [-0.5, 0.5]) for (const z of [-0.42, 0.42]) {
    const wh = wheel(0.18);
    wh.position.set(x, 0.18, z);
    g.add(wh);
    wheels.push(wh);
  }
  g.userData = { wheels, len: 1.5 };
  return g;
}

const VEHICLE_MAKERS = [makeMicrobus, makeTempo, makeMotorbike, makeTaxi, makeMicrobus];

/* ════════════════════════════════════════════════════════════════════════
 * STUDENT — clean low-poly, school uniform + backpack, walk-animated
 * ══════════════════════════════════════════════════════════════════════ */
export function makeStudent() {
  const g = new THREE.Group();
  const skin = std(0xe6b08a, { roughness: 0.8 });
  const navy = std(0x274b8c);
  const navyD = std(0x1f3c70);
  const white = std(0xf3f4ec);
  const hair = std(0x241712, { roughness: 1 });
  const bagC = std(0xd1492f);
  const shoe = std(0x39281b);
  const mkLeg = (s) => {
    const p = new THREE.Group();
    p.position.set(0.11 * s, 0.5, 0);
    const thigh = cyl(0.085, 0.075, 0.42, 8, 0x000); thigh.material = navyD; thigh.position.y = -0.21;
    const foot = box(0.13, 0.1, 0.24, 0x000); foot.material = shoe; foot.position.set(0, -0.46, 0.05);
    p.add(thigh, foot); g.add(p); return p;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = cyl(0.2, 0.27, 0.52, 10, 0x000); torso.material = navy; torso.position.y = 0.78; g.add(torso);
  const collar = cyl(0.16, 0.2, 0.1, 10, 0x000); collar.material = white; collar.position.y = 1.05; g.add(collar);
  const mkArm = (s) => {
    const p = new THREE.Group();
    p.position.set(0.26 * s, 1.0, 0);
    const upper = cyl(0.06, 0.055, 0.46, 8, 0x000); upper.material = navy; upper.position.y = -0.22;
    const hand = mesh(new THREE.SphereGeometry(0.06, 8, 6), 0x000); hand.material = skin; hand.position.y = -0.47;
    p.add(upper, hand); g.add(p); return p;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const head = mesh(new THREE.SphereGeometry(0.23, 16, 14), 0x000); head.material = skin; head.position.y = 1.32; g.add(head);
  const hairCap = mesh(new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), 0x000); hairCap.material = hair; hairCap.position.y = 1.34; g.add(hairCap);
  const eyeMat = std(0x1a120b, { roughness: 0.4 });
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.028, 8, 8), 0x000); e.material = eyeMat; e.position.set(0.08 * s, 1.34, 0.205); g.add(e); }
  const bag = box(0.34, 0.4, 0.16, 0x000); bag.material = bagC; bag.position.set(0, 0.82, -0.26); g.add(bag);
  g.userData = { legL, legR, armL, armR, head };
  return g;
}

/* Drives the student's walk cycle. Call each frame with (group, speed01, t). */
export function animateStudent(student, moving, t) {
  const u = student.userData;
  const sw = moving ? Math.sin(t * 9) : 0;
  if (u.legL) u.legL.rotation.x = sw * 0.6;
  if (u.legR) u.legR.rotation.x = -sw * 0.6;
  if (u.armL) u.armL.rotation.x = -sw * 0.5;
  if (u.armR) u.armR.rotation.x = sw * 0.5;
  student.position.y = Math.abs(Math.sin(t * 9)) * (moving ? 0.04 : 0);
}

/* ════════════════════════════════════════════════════════════════════════
 * TRAFFIC SYSTEM — vehicles follow polyline routes; returns update(dt)
 * ══════════════════════════════════════════════════════════════════════ */
/* a single traffic-light fixture; userData.set('red'|'yellow'|'green') lights it */
export function makeTrafficLight() {
  const g = new THREE.Group();
  const pole = cyl(0.05, 0.06, 2.4, 6, 0x3a4046); pole.position.y = 1.2; g.add(pole);
  const arm = box(0.5, 0.06, 0.06, 0x3a4046); arm.position.set(0.22, 2.3, 0); g.add(arm);
  const housing = box(0.22, 0.66, 0.18, 0x202427); housing.position.set(0.44, 2.3, 0); g.add(housing);
  const colors = { red: 0xe23b3b, yellow: 0xf2c14e, green: 0x37c46a };
  const lamps = {};
  ['red', 'yellow', 'green'].forEach((k, i) => {
    const lamp = mesh(new THREE.SphereGeometry(0.07, 10, 8), colors[k], { emissive: colors[k], emissiveIntensity: 0.12 });
    lamp.castShadow = false;
    lamp.position.set(0.44, 2.55 - i * 0.22, 0.11);
    g.add(lamp);
    lamps[k] = lamp;
  });
  g.userData.set = (state) => ['red', 'yellow', 'green'].forEach((k) => { lamps[k].material.emissiveIntensity = (k === state) ? 1.0 : 0.1; });
  g.userData.set('red');
  return g;
}

/* 4-way intersection signal: alternates NS / EW with a yellow phase. */
export function makeIntersectionSignal(scene) {
  const defs = [
    { x: 2.6, z: 2.6, ry: Math.PI, axis: 'NS' }, { x: -2.6, z: -2.6, ry: 0, axis: 'NS' },
    { x: 2.6, z: -2.6, ry: -Math.PI / 2, axis: 'EW' }, { x: -2.6, z: 2.6, ry: Math.PI / 2, axis: 'EW' },
  ];
  const lights = defs.map((d) => {
    const L = makeTrafficLight();
    L.position.set(d.x, 0, d.z); L.rotation.y = d.ry;
    scene.add(L);
    return { L, axis: d.axis };
  });
  const ctrl = { green: 'NS', yellow: false, t: 0, greenDur: 6.5, yellowDur: 1.8 };
  ctrl.update = (dt) => {
    ctrl.t += dt;
    const phase = ctrl.greenDur + ctrl.yellowDur;
    const p = ctrl.t % (phase * 2);
    if (p < ctrl.greenDur) { ctrl.green = 'NS'; ctrl.yellow = false; }
    else if (p < phase) { ctrl.green = 'NS'; ctrl.yellow = true; }
    else if (p < phase + ctrl.greenDur) { ctrl.green = 'EW'; ctrl.yellow = false; }
    else { ctrl.green = 'EW'; ctrl.yellow = true; }
    for (const e of lights) {
      const isGreen = e.axis === ctrl.green;
      e.L.userData.set(isGreen ? (ctrl.yellow ? 'yellow' : 'green') : 'red');
    }
  };
  return ctrl;
}

export function makeTraffic(scene, routes, perRoute = 2, signal = null) {
  const cars = [];
  const STOP = 2.6;   // stop-line distance from intersection centre
  const GAP = 3.6;    // min following gap in a lane
  const ACCEL = 3.0;  // speed easing toward cruise
  routes.forEach((route, ri) => {
    const pts = route.points;
    const segLen = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); segLen.push(l); total += l; }
    // intersection metadata (straight avenue routes only)
    let axis = null, distStop = -1;
    if (signal && pts.length === 2) {
      const dx = Math.abs(pts[0].x - pts[1].x), dz = Math.abs(pts[0].z - pts[1].z);
      if (dx < 0.01) { axis = 'NS'; const dir = Math.sign(pts[1].z - pts[0].z); distStop = total * ((-dir * STOP) - pts[0].z) / (pts[1].z - pts[0].z); }
      else if (dz < 0.01) { axis = 'EW'; const dir = Math.sign(pts[1].x - pts[0].x); distStop = total * ((-dir * STOP) - pts[0].x) / (pts[1].x - pts[0].x); }
    }
    for (let k = 0; k < perRoute; k++) {
      const v = pick(VEHICLE_MAKERS)();
      scene.add(v);
      const maxSpd = rand(3.0, 4.6);
      cars.push({ v, pts, segLen, total, ri, axis, distStop, dist: (k / perRoute) * total, maxSpd, cur: maxSpd, passed: false });
    }
  });
  function posAt(c, d) {
    d = ((d % c.total) + c.total) % c.total;
    let i = 0;
    while (i < c.segLen.length && d > c.segLen[i]) { d -= c.segLen[i]; i++; }
    i = Math.min(i, c.segLen.length - 1);
    const a = c.pts[i], b = c.pts[i + 1];
    const t = c.segLen[i] ? d / c.segLen[i] : 0;
    return { p: a.clone().lerp(b, t), dir: b.clone().sub(a).normalize() };
  }
  function gapAhead(a) {
    let best = Infinity;
    for (const b of cars) {
      if (b === a || b.ri !== a.ri) continue;
      let g = ((b.dist - a.dist) % a.total + a.total) % a.total;
      if (g > 0 && g < best) best = g;
    }
    return best;
  }
  function update(dt) {
    for (const c of cars) {
      let cap = Infinity;
      // red light: hold at the stop line unless already committed into the box
      if (signal && c.axis) {
        const dd = ((c.dist % c.total) + c.total) % c.total;
        if (dd < c.distStop - 6) c.passed = false;             // wrapped back to approach → reset
        const green = signal.green === c.axis && !signal.yellow;
        if (green && dd >= c.distStop - 0.5) c.passed = true;   // entering on green → committed
        if (!green && !c.passed && dd <= c.distStop + 0.1) cap = Math.max(0, c.distStop - dd);
      }
      // car-following: keep a gap to the car ahead in this lane
      const g = gapAhead(c);
      if (g < GAP) cap = Math.min(cap, Math.max(0, g - GAP * 0.6));
      // accelerate toward cruise, then brake to obey the cap
      c.cur += (c.maxSpd - c.cur) * Math.min(1, ACCEL * dt);
      let adv = c.cur * dt;
      if (adv > cap) { adv = Math.max(0, cap); c.cur = adv / Math.max(dt, 1e-4); }
      c.dist += adv;
      const { p, dir } = posAt(c, c.dist);
      c.v.position.set(p.x, 0, p.z);
      c.v.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2; // models face +X; align front with travel
      const wheels = c.v.userData.wheels || [];
      for (const w of wheels) w.rotation.x += adv * 4; // spin only when actually moving
    }
  }
  return { cars, update };
}

/* ════════════════════════════════════════════════════════════════════════
 * COMPOSITION — buildKathmanduValley(scene): a dense, living valley.
 * Returns { update(dt), spots } where spots are mission anchor positions.
 * ══════════════════════════════════════════════════════════════════════ */
/* Dharahara (Bhimsen Tower) — tall white tapering minaret with a domed cap */
export function makeDharahara() {
  const g = new THREE.Group();
  const segs = 7; let y = 0, r = 1.35;
  for (let i = 0; i < segs; i++) {
    const h = 1.7, rt = r * 0.9;
    const seg = cyl(rt, r, h, 20, NP.white); seg.position.y = y + h / 2; g.add(seg);
    const ring = cyl(r * 1.03, r * 1.03, 0.1, 20, 0xcbbda4); ring.position.y = y + h; g.add(ring);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const wsl = box(0.1, 0.62, 0.06, 0x47403a); wsl.position.set(Math.cos(a) * rt * 0.99, y + h / 2, Math.sin(a) * rt * 0.99); wsl.rotation.y = -a; g.add(wsl); }
    y += h; r = rt;
  }
  const gallery = cyl(r * 1.3, r * 1.3, 0.5, 20, NP.plaster); gallery.position.y = y + 0.25; g.add(gallery);
  y += 0.5;
  const dome = mesh(new THREE.SphereGeometry(r * 1.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), NP.white); dome.position.y = y; g.add(dome);
  const mast = cyl(0.05, 0.09, 1.5, 8, NP.gold); mast.position.y = y + 0.75; g.add(mast);
  const fin = mesh(new THREE.SphereGeometry(0.14, 8, 8), NP.gold); fin.position.y = y + 1.5; g.add(fin);
  g.userData.radius = 1.7;
  return g;
}

/* Kathmandu Durbar Square — brick plaza, tiered pagodas, palace wing, stone column.
   Per-building colliders are set so the plaza interior stays walkable. */
export function makeDurbarSquare() {
  const g = new THREE.Group();
  const plaza = box(14, 0.12, 14, NP.brickDark, { noOutline: true }); plaza.position.y = 0.06; g.add(plaza);
  for (const off of [-4, 0, 4]) {
    const lh = box(14, 0.13, 0.12, 0x5a2c1e, { noOutline: true }); lh.position.set(0, 0.066, off); g.add(lh);
    const lv = box(0.12, 0.13, 14, 0x5a2c1e, { noOutline: true }); lv.position.set(off, 0.066, 0); g.add(lv);
  }
  const pag = makePagodaTemple(); pag.position.set(-3.6, 0, -3.6); pag.userData.radius = 2.2; g.add(pag);
  const pag2 = makePagodaTemple(); pag2.scale.setScalar(0.7); pag2.position.set(4.0, 0, -3.2); pag2.userData.radius = 1.6; g.add(pag2);
  const palace = makeNewariHouse(2); palace.scale.set(2.6, 1.15, 1.0); palace.position.set(0, 0, 5.0); palace.rotation.y = Math.PI; palace.userData.radius = 3.2; g.add(palace);
  const col = cyl(0.16, 0.2, 3.4, 10, NP.stone); col.position.set(2.2, 1.7, 1.6); col.userData.radius = 0.6; g.add(col);
  const cap = cyl(0.32, 0.32, 0.18, 10, NP.stone); cap.position.set(2.2, 3.4, 1.6); g.add(cap);
  const idol = box(0.28, 0.46, 0.28, NP.gold); idol.position.set(2.2, 3.72, 1.6); g.add(idol);
  return g;
}

export function buildKathmanduValley(scene) {
  const updaters = [];
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };

  // far horizon + sky actors
  scene.add(makeHimalayas({ count: 13, radius: 165, height: 50 }));
  const sun = makeSun();
  sun.position.set(-70, 60, -120);
  scene.add(sun);

  // roads (dark strips): main avenue along X, cross street along Z, + a loop
  const roadMat = std(0x3a3a3e, { roughness: 1 });
  const mkRoad = (w, l, x, z, rot = 0) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
    r.rotation.x = -Math.PI / 2; r.rotation.z = rot;
    r.position.set(x, 0.02, z); r.receiveShadow = true; scene.add(r);
    // dashed centre line
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, l), std(0xf2d24a, { roughness: 1 }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = rot; line.position.set(x, 0.03, z); scene.add(line);
  };
  mkRoad(3, 90, 0, 0);                 // N–S avenue
  mkRoad(3, 90, 0, 0, Math.PI / 2);    // E–W avenue

  // traffic stays on the two avenues, correct (left-hand) lanes, both directions
  const Y = 0;
  const routes = [
    { points: [new THREE.Vector3(-0.75, Y, -44), new THREE.Vector3(-0.75, Y, 44)] }, // northbound, left lane
    { points: [new THREE.Vector3(0.75, Y, 44), new THREE.Vector3(0.75, Y, -44)] },    // southbound
    { points: [new THREE.Vector3(-44, Y, 0.75), new THREE.Vector3(44, Y, 0.75)] },    // eastbound
    { points: [new THREE.Vector3(44, Y, -0.75), new THREE.Vector3(-44, Y, -0.75)] },  // westbound
  ];
  const signal = makeIntersectionSignal(scene);
  updaters.push((dt) => signal.update(dt));
  const traffic = makeTraffic(scene, routes, 3, signal);
  updaters.push(traffic.update);

  // central temple plaza (offset from crossroads so streets stay clear)
  const pagoda = add(makePagodaTemple(), 9, 9);
  const stupa = add(makeStupa(), -11, 10);
  if (stupa.userData.update) updaters.push((t) => stupa.userData.update(t));
  const flock = makeBirdFlock(new THREE.Vector3(-11, 11, 10), 16, 9);
  scene.add(flock.group);
  updaters.push((_dt, t) => flock.update(0.016) || t);
  // plaza trees + prayer flags
  for (let i = 0; i < 6; i++) add(makeTree(rand(0.9, 1.4)), rand(4, 14), rand(4, 14));

  // gumba on a slight rise to the NE
  add(makeGumba(), 26, -22, -0.4);
  // hospital to the SW with an H sign facing the road
  add(makeHospital(), -24, -20, Math.PI);
  // NEW Kathmandu landmarks: Dharahara tower (east) + Durbar Square (NW)
  add(makeDharahara(), 36, -15);
  add(makeDurbarSquare(), -34, 19, 0.25);

  // Newari housing blocks filling the quadrants (dense streets)
  const houses = [];
  const blocks = [
    { cx: 16, cz: 16 }, { cx: -16, cz: 16 }, { cx: 16, cz: -16 }, { cx: -16, cz: -16 },
    { cx: 30, cz: 8 }, { cx: -30, cz: 8 }, { cx: 8, cz: 30 }, { cx: -8, cz: -30 },
  ];
  blocks.forEach((b) => {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x = b.cx + (c - 0.5) * 5 + rand(-0.6, 0.6);
      const z = b.cz + (r - 0.5) * 5 + rand(-0.6, 0.6);
      // keep clear of the avenues
      if (Math.abs(x) < 3.2 || Math.abs(z) < 3.2) continue;
      const h = add(makeNewariHouse(2 + Math.floor(rand(0, 3))), x, z, rand(0, Math.PI * 2));
      houses.push(h);
    }
  });

  // market stalls cluster near the crossroads (SE corner)
  for (let i = 0; i < 5; i++) add(makeShop(pick([NP.mud, 0xc98a4b, 0xbfa06a])), 6 + i * 1.6, -7, Math.PI);

  // street furniture along avenues: lamps, power poles, bins
  const poleZ = [];
  for (let s = -40; s <= 40; s += 10) {
    add(makeStreetLamp(), 2.1, s);
    add(makePowerPole(), -2.2, s + 5);
    poleZ.push(s + 5);
    add(makeStreetLamp(), s, 2.1, Math.PI / 2);
    if (s % 20 === 0) add(makeDustbin(pick([NP.green, 0x3a78c2])), 2.4, s + 2);
  }
  // connect the poles with sagging power lines that run ALONG the avenue (pole→pole)
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 });
  for (let i = 0; i < poleZ.length - 1; i++) {
    for (const yArm of [2.7, 3.0]) {
      const pts = [];
      for (let t = 0; t <= 1; t += 0.1) {
        const sag = -Math.sin(t * Math.PI) * 0.5;
        pts.push(new THREE.Vector3(-2.2 + rand(-0.04, 0.04), yArm + sag, THREE.MathUtils.lerp(poleZ[i], poleZ[i + 1], t)));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
  }
  // zebra crossings at the four approaches to the crossroads
  const zebraMat = std(0xeaeaea, { roughness: 1 });
  const zbar = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), zebraMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); scene.add(m); };
  for (let k = 0; k < 5; k++) {
    const off = (k - 2) * 0.45;
    zbar(2.8, 0.22, 0, 2.6 + off); zbar(2.8, 0.22, 0, -2.6 - off);   // across N–S road
    zbar(0.22, 2.8, 2.6 + off, 0); zbar(0.22, 2.8, -2.6 - off, 0);   // across E–W road
  }

  // drifting clouds
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = makeCloud();
    c.position.set(rand(-60, 60), rand(22, 34), rand(-60, 60));
    c.scale.setScalar(rand(1.4, 2.6));
    scene.add(c);
    clouds.push({ m: c, spd: rand(0.4, 0.9) });
  }
  updaters.push((dt) => clouds.forEach((c) => {
    c.m.position.x += c.spd * dt;
    if (c.m.position.x > 70) c.m.position.x = -70;
  }));

  // prayer-flag lines strung between a few poles
  for (let i = 0; i < 3; i++) {
    const fl = makePrayerFlags(8, 1.2);
    add(fl, rand(-20, 20), rand(-20, 20), rand(0, Math.PI));
    fl.position.y = 2.6;
    updaters.push((_dt, t) => fl.userData.update && fl.userData.update(t));
  }

  // mission anchor spots (match EXPLORER_LEVELS Kathmandu landmark types)
  const spots = {
    busstop: new THREE.Vector3(3, 0, -12),
    school: new THREE.Vector3(-16, 0, 16),
    canteen: new THREE.Vector3(8, 0, -7),
    bin: new THREE.Vector3(2.4, 0, 12),
    tap: new THREE.Vector3(-11, 0, 14),
    roof: new THREE.Vector3(16, 0, -16),
    temple: new THREE.Vector3(9, 0, 9),
    hospital: new THREE.Vector3(-24, 0, -20),
    gumba: new THREE.Vector3(26, 0, -22),
  };

  let tt = 0;
  function update(dt) {
    tt += dt;
    for (const fn of updaters) fn(dt, tt);
  }
  return { update, spots, houses, stupa, pagoda, cars: traffic.cars };
}

/* ════════════════════════════════════════════════════════════════════════
 * BIOME ENGINE — generic composition driven by biomes.js BiomeParams.
 * (Adds CONTENT only; the scene component owns ground, lights, fog, sky.)
 * ══════════════════════════════════════════════════════════════════════ */

/* Conifer/pine — for hill, canyon and alpine biomes. */
export function makeConifer(scale = 1) {
  const g = new THREE.Group();
  const h = rand(1.1, 1.7) * scale;
  const trunk = cyl(0.05 * scale, 0.08 * scale, h * 0.5, 6, NP.wood, { flatShading: true });
  trunk.position.y = h * 0.25;
  g.add(trunk);
  const green = new THREE.Color().setHSL(0.34, rand(0.4, 0.55), rand(0.22, 0.32));
  for (let i = 0; i < 3; i++) {
    const r = (0.5 - i * 0.12) * scale;
    const c = cone(r, 0.55 * scale, 6, green.clone().offsetHSL(0, 0, rand(-0.03, 0.03)), { flatShading: true });
    c.position.y = h * 0.45 + i * 0.4 * scale;
    g.add(c);
  }
  return g;
}

/* Labelled placeholder marker for landmark types without a dedicated builder
 * yet (paddy, tent, glaciallake, …). Renders a small cairn + a name plate so
 * the mission spot is visible and walkable until its real builder ships. */
export function makeMarker(label = '', color = 0x8b8a86) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = 0.5 - i * 0.13;
    const stone = mesh(new THREE.IcosahedronGeometry(s, 0), color, { flatShading: true });
    stone.position.y = 0.2 + i * 0.32;
    stone.rotation.set(rand(0, 1), rand(0, 1), rand(0, 1));
    g.add(stone);
  }
  if (label) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(20,40,28,0.85)';
    x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#eaffe9'; x.font = 'bold 30px sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(label, 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(1.6, 0.4, 1);
    spr.position.y = 1.5;
    g.add(spr);
  }
  g.userData.radius = 0.8;
  return g;
}

/* type → builder registry (builders that already exist in the kit). */
const LANDMARK_BUILDERS = {
  house: () => makeNewariHouse(2 + Math.floor(rand(0, 3))),
  pagoda: makePagodaTemple,
  temple: makePagodaTemple,
  stupa: makeStupa,
  gumba: makeGumba,
  hospital: makeHospital,
  shop: () => makeShop(pick([NP.mud, 0xc98a4b, 0xbfa06a])),
  dustbin: () => makeDustbin(pick([NP.green, 0x3a78c2])),
};

function placeLandmark(type) {
  const maker = LANDMARK_BUILDERS[type];
  if (maker) return maker();
  return makeMarker(type);
}

/**
 * buildBiome(scene, params) — composes one biome's content.
 * Returns { update(dt), spots } where spots maps landmark-type → Vector3.
 */
export function buildBiome(scene, params) {
  const updaters = [];
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };

  // far peaks + sun glow
  if (params.himalaya) scene.add(makeHimalayas(params.himalaya));
  if (params.sun && params.sun.pos) {
    const sun = makeSun();
    sun.position.set(params.sun.pos[0], params.sun.pos[1], params.sun.pos[2]);
    scene.add(sun);
  }

  // spot positions (used to keep vegetation clear of mission anchors)
  const spotVecs = Object.entries(params.spots || {}).map(([k, [x, z]]) => ({ k, v: new THREE.Vector3(x, 0, z) }));
  const nearSpot = (x, z, r = 4) => spotVecs.some((s) => (x - s.v.x) ** 2 + (z - s.v.z) ** 2 < r * r);

  // vegetation scatter
  const clearings = params.clearings || [];
  const inClearing = (x, z) => clearings.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r);
  const veg = params.vegetation || { kind: 'tree', density: 30, scale: [0.9, 1.4] };
  const vegMaker = veg.kind === 'conifer' ? makeConifer : makeTree;
  for (let i = 0; i < veg.density; i++) {
    const x = rand(-44, 44), z = rand(-44, 44);
    if (nearSpot(x, z, 4) || (x * x + z * z < 36) || inClearing(x, z)) continue; // keep spots, centre + water clear
    add(vegMaker(rand(veg.scale[0], veg.scale[1])), x, z, rand(0, Math.PI * 2));
  }

  // urban layer (roads + traffic + street furniture + housing) when applicable
  let trafficCars = [];
  if (params.archetype === 'urban') {
    const roadMat = std(0x3a3a3e, { roughness: 1 });
    const mkRoad = (w, l, rot) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
      r.rotation.x = -Math.PI / 2; r.rotation.z = rot; r.position.y = 0.02; r.receiveShadow = true; scene.add(r);
    };
    mkRoad(3, 90, 0); mkRoad(3, 90, Math.PI / 2);
    const Y = 0;
    const routes = [
      { points: [new THREE.Vector3(-0.75, Y, -44), new THREE.Vector3(-0.75, Y, 44)] },
      { points: [new THREE.Vector3(0.75, Y, 44), new THREE.Vector3(0.75, Y, -44)] },
      { points: [new THREE.Vector3(-44, Y, 0.75), new THREE.Vector3(44, Y, 0.75)] },
      { points: [new THREE.Vector3(44, Y, -0.75), new THREE.Vector3(-44, Y, -0.75)] },
    ];
    const signal = makeIntersectionSignal(scene);
    updaters.push((dt) => signal.update(dt));
    const traffic = makeTraffic(scene, routes, (params.traffic && params.traffic.perRoute) || 2, signal);
    trafficCars = traffic.cars;
    updaters.push(traffic.update);
    if (params.houses && params.houses.blocks) {
      params.houses.blocks.forEach((b) => {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
          const x = b.cx + (c - 0.5) * 5 + rand(-0.6, 0.6);
          const z = b.cz + (r - 0.5) * 5 + rand(-0.6, 0.6);
          if (Math.abs(x) < 3.2 || Math.abs(z) < 3.2) continue;
          add(makeNewariHouse(2 + Math.floor(rand(0, 3))), x, z, rand(0, Math.PI * 2));
        }
      });
    }
    for (let s = -40; s <= 40; s += 12) {
      add(makeStreetLamp(), 2.1, s);
      add(makePowerPole(), -2.2, s + 6);
    }
  }

  // landmarks (one per mission spot + decorative/cultural ones)
  (params.landmarks || []).forEach((lm) => add(placeLandmark(lm.type), lm.x, lm.z, lm.ry || 0));

  // biome-specific signature terrain, density and paths (gives each region identity)
  decorateBiome(scene, params);

  // bird flock
  if (params.birds) {
    const c = params.birds.center;
    const flock = makeBirdFlock(new THREE.Vector3(c[0], c[1], c[2]), params.birds.n, params.birds.radius);
    scene.add(flock.group);
    updaters.push((dt) => flock.update(dt));
  }

  // prayer-flag lines
  if (params.prayerFlags) {
    for (let i = 0; i < 3; i++) {
      const fl = makePrayerFlags(8, 1.2);
      add(fl, rand(-22, 22), rand(-22, 22), rand(0, Math.PI));
      fl.position.y = 2.6;
      updaters.push((_dt, t) => fl.userData.update && fl.userData.update(t));
    }
  }

  // drifting clouds
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const cl = makeCloud();
    cl.position.set(rand(-60, 60), rand(22, 34), rand(-60, 60));
    cl.scale.setScalar(rand(1.4, 2.6));
    scene.add(cl);
    clouds.push({ m: cl, spd: rand(0.4, 0.9) });
  }
  updaters.push((dt) => clouds.forEach((c) => { c.m.position.x += c.spd * dt; if (c.m.position.x > 70) c.m.position.x = -70; }));

  // spots as Vector3, keyed by landmark type
  const spots = {};
  spotVecs.forEach((s) => { spots[s.k] = s.v.clone(); });

  let tt = 0;
  function update(dt) { tt += dt; for (const fn of updaters) fn(dt, tt); }
  return { update, spots, cars: trafficCars };
}

/* ════════════════════════════════════════════════════════════════════════
 * BIOME-SPECIFIC LANDMARKS — hills, Terai farmland, canyon, alpine.
 * Registered into LANDMARK_BUILDERS at the bottom so buildBiome() places real
 * objects (no placeholder markers) for every level's events.
 * ══════════════════════════════════════════════════════════════════════ */

/* rural school: plaster block, tin pitched roof, flagpole */
export function makeSchool() {
  const g = new THREE.Group();
  const body = box(3.4, 1.5, 2.2, NP.plaster, { flatShading: true }); body.position.y = 0.75; g.add(body);
  const base = box(3.5, 0.2, 2.3, 0xcdbba0); base.position.y = 0.1; g.add(base);
  const roof = cone(2.5, 0.8, 4, NP.tin, { flatShading: true, metalness: 0.2, roughness: 0.6 });
  roof.rotation.y = Math.PI / 4; roof.position.y = 1.9; g.add(roof);
  for (let i = -1; i <= 1; i++) { const w = box(0.5, 0.5, 0.06, NP.glass, { emissive: 0x9fd6e6, emissiveIntensity: 0.15 }); w.position.set(i * 1.0, 0.85, 1.12); g.add(w); }
  const door = box(0.6, 0.9, 0.08, NP.woodDark); door.position.set(0, 0.45, 1.13); g.add(door);
  const pole = cyl(0.04, 0.04, 2.6, 6, 0xb0b0b0); pole.position.set(-1.9, 1.3, -0.8); g.add(pole);
  const flag = box(0.5, 0.4, 0.02, 0xd6233b); flag.position.set(-1.63, 2.3, -0.8); g.add(flag);
  g.userData.radius = 2.2; return g;
}

/* wooden directional signpost */
export function makeSignpost() {
  const g = new THREE.Group();
  const post = cyl(0.06, 0.07, 2.2, 6, NP.wood, { flatShading: true }); post.position.y = 1.1; g.add(post);
  for (let i = 0; i < 2; i++) { const b = box(0.9, 0.24, 0.05, pick([NP.saffron, 0xb24a32, NP.green])); b.position.set(0.3, 1.6 - i * 0.4, 0); b.rotation.y = i ? 0.3 : -0.3; g.add(b); }
  g.userData.radius = 0.6; return g;
}

/* pile of dry leaves */
export function makeLeafpile() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const c = mesh(new THREE.SphereGeometry(rand(0.2, 0.34), 6, 5), pick([0xb5742a, 0xc89a3a, 0x8a5a22]), { flatShading: true }); c.scale.y = 0.5; c.position.set(rand(-0.4, 0.4), 0.12, rand(-0.4, 0.4)); g.add(c); }
  g.userData.radius = 0.7; return g;
}

/* flooded paddy tile: water + mud bunds + rice tufts */
export function makePaddy() {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), std(NP.water, { roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.04; water.receiveShadow = true; g.add(water);
  const mk = (w, d, x, z) => { const b = box(w, 0.2, d, 0x6b4a2f); b.position.set(x, 0.1, z); g.add(b); };
  mk(3.4, 0.2, 0, 1.7); mk(3.4, 0.2, 0, -1.7); mk(0.2, 3.4, 1.7, 0); mk(0.2, 3.4, -1.7, 0);
  for (let i = 0; i < 24; i++) { const t = cone(0.06, 0.3, 4, 0x6cae3f, { flatShading: true }); t.position.set(rand(-1.4, 1.4), 0.2, rand(-1.4, 1.4)); g.add(t); }
  g.userData.radius = 1.9; return g;
}

/* compost heap in a slatted wooden box */
export function makeCompost() {
  const g = new THREE.Group();
  for (const [x, z, ry] of [[0, 0.6, 0], [0, -0.6, 0], [0.6, 0, Math.PI / 2], [-0.6, 0, Math.PI / 2]]) { const w = box(1.3, 0.7, 0.06, NP.wood); w.position.set(x, 0.35, z); w.rotation.y = ry; g.add(w); }
  const heap = mesh(new THREE.SphereGeometry(0.55, 8, 6), 0x4a3520, { flatShading: true }); heap.scale.y = 0.55; heap.position.y = 0.35; g.add(heap);
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.IcosahedronGeometry(0.1, 0), pick([0x6cae3f, 0xc89a3a])); s.position.set(rand(-0.3, 0.3), 0.55, rand(-0.3, 0.3)); g.add(s); }
  g.userData.radius = 0.9; return g;
}

/* small farm tractor (wheels spin via userData) */
export function makeTractor() {
  const g = new THREE.Group();
  const body = box(1.2, 0.5, 0.7, NP.busGreen, { flatShading: true }); body.position.set(-0.1, 0.6, 0); g.add(body);
  const hood = box(0.7, 0.4, 0.6, 0x2f6b3f); hood.position.set(0.6, 0.5, 0); g.add(hood);
  const seat = box(0.3, 0.1, 0.4, 0x222222); seat.position.set(-0.3, 0.85, 0); g.add(seat);
  const exhaust = cyl(0.05, 0.05, 0.5, 6, 0x444444); exhaust.position.set(0.3, 1.0, 0.25); g.add(exhaust);
  const wheels = [];
  for (const z of [-0.45, 0.45]) { const w = cyl(0.4, 0.4, 0.18, 14, 0x1b1b1b); w.rotation.z = Math.PI / 2; w.position.set(-0.4, 0.4, z); g.add(w); wheels.push(w); }
  for (const z of [-0.38, 0.38]) { const w = cyl(0.22, 0.22, 0.14, 12, 0x1b1b1b); w.rotation.z = Math.PI / 2; w.position.set(0.7, 0.22, z); g.add(w); wheels.push(w); }
  g.userData = { wheels, radius: 1.0 }; return g;
}

/* harvested field with straw stubble */
export function makeStubble() {
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), std(0xb89a5a, { roughness: 1 }));
  dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.02; dirt.receiveShadow = true; g.add(dirt);
  for (let i = 0; i < 40; i++) { const s = cyl(0.02, 0.03, 0.18, 4, 0xcdb472); s.position.set(rand(-1.5, 1.5), 0.09, rand(-1.5, 1.5)); g.add(s); }
  g.userData.radius = 1.7; return g;
}

/* hand tube-well pump + bucket */
export function makePump() {
  const g = new THREE.Group();
  const base = cyl(0.4, 0.45, 0.25, 12, 0xb8b0a4); base.position.y = 0.12; g.add(base);
  const col = cyl(0.07, 0.08, 0.7, 8, 0x4a5358); col.position.y = 0.55; g.add(col);
  const spout = box(0.4, 0.08, 0.1, 0x4a5358); spout.position.set(0.22, 0.85, 0); g.add(spout);
  const handle = box(0.5, 0.06, 0.08, 0x222222); handle.position.set(-0.15, 0.95, 0); handle.rotation.z = 0.3; g.add(handle);
  const bucket = cyl(0.18, 0.14, 0.22, 10, 0x3a78c2); bucket.position.set(0.45, 0.11, 0); g.add(bucket);
  g.userData.radius = 0.6; return g;
}

/* small hydropower house + penstock + pylon */
export function makePowerplant() {
  const g = new THREE.Group();
  const house = box(2.6, 1.6, 1.8, 0xb6bcc0, { flatShading: true }); house.position.y = 0.8; g.add(house);
  const roof = box(2.7, 0.2, 1.9, 0x7f8a90); roof.position.y = 1.7; g.add(roof);
  const pipe = cyl(0.3, 0.3, 3.2, 12, 0x5a6b78, { metalness: 0.3, roughness: 0.5 }); pipe.rotation.z = Math.PI / 2.6; pipe.position.set(-2.2, 1.2, 0.6); g.add(pipe);
  const pylon = new THREE.Group();
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const l = cyl(0.04, 0.05, 2.6, 4, 0x8a9098); l.position.set(x, 1.3, z); pylon.add(l); }
  const cross = box(1.0, 0.06, 0.06, 0x8a9098); cross.position.y = 2.3; pylon.add(cross);
  pylon.position.set(2.4, 0, -0.5); g.add(pylon);
  g.userData.radius = 1.6; return g;
}

/* river edge: water + sandy/stony bank + reeds */
export function makeRiverbank() {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0), std(NP.water, { roughness: 0.3, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.04, -0.8); water.receiveShadow = true; g.add(water);
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), std(0xb8a878, { roughness: 1 }));
  bank.rotation.x = -Math.PI / 2; bank.position.set(0, 0.05, 0.9); g.add(bank);
  for (let i = 0; i < 8; i++) { const s = mesh(new THREE.IcosahedronGeometry(rand(0.1, 0.22), 0), NP.stone, { flatShading: true }); s.position.set(rand(-1.5, 1.5), 0.08, rand(0.2, 1.4)); g.add(s); }
  for (let i = 0; i < 6; i++) { const r = cone(0.04, 0.5, 4, 0x6cae3f, { flatShading: true }); r.position.set(rand(-1.4, 1.4), 0.25, rand(-0.2, 0.2)); g.add(r); }
  g.userData.radius = 1.7; return g;
}

/* half-built concrete frame + sand + bricks */
export function makeConstruction() {
  const g = new THREE.Group();
  const base = box(2.4, 0.2, 2.4, 0xb8b2a6); base.position.y = 0.1; g.add(base);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = box(0.25, 1.6, 0.25, 0xc4bcae); p.position.set(x, 0.9, z); g.add(p);
    for (let k = 0; k < 3; k++) { const r = cyl(0.015, 0.015, 0.3, 4, 0x8a6a3a); r.position.set(x + rand(-0.06, 0.06), 1.8, z + rand(-0.06, 0.06)); g.add(r); }
  }
  const upper = box(2.4, 0.16, 1.2, 0xb8b2a6); upper.position.set(0, 1.78, -0.6); g.add(upper);
  const sand = cone(0.6, 0.5, 8, 0xcdb98a, { flatShading: true }); sand.position.set(1.6, 0.25, 1.4); g.add(sand);
  for (let i = 0; i < 6; i++) { const b = box(0.24, 0.1, 0.12, NP.brick); b.position.set(-1.6 + rand(-0.1, 0.1), 0.05 + Math.floor(i / 3) * 0.1, 1.4 + (i % 3) * 0.14); g.add(b); }
  g.userData.radius = 1.8; return g;
}

/* outhouse / latrine (WASH) */
export function makeToilet() {
  const g = new THREE.Group();
  const body = box(1.1, 1.8, 1.1, 0x6cae6f, { flatShading: true }); body.position.y = 0.9; g.add(body);
  const roof = box(1.25, 0.12, 1.25, 0x4a7a4f); roof.position.y = 1.85; g.add(roof);
  const door = box(0.6, 1.3, 0.06, NP.woodDark); door.position.set(0, 0.65, 0.56); g.add(door);
  const vent = cyl(0.05, 0.05, 0.7, 6, 0x9fa6a8); vent.position.set(0.4, 2.1, -0.3); g.add(vent);
  g.userData.radius = 0.8; return g;
}

/* quarried stone pile */
export function makeStones() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) { const s = mesh(new THREE.DodecahedronGeometry(rand(0.22, 0.4), 0), pick([NP.stone, 0x9a948c, 0x787169]), { flatShading: true }); s.position.set(rand(-0.6, 0.6), rand(0.1, 0.35), rand(-0.6, 0.6)); s.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); g.add(s); }
  g.userData.radius = 0.9; return g;
}

/* trekking tent (custom triangular-prism geometry) */
export function makeTent() {
  const g = new THREE.Group();
  const w2 = 0.7, h = 0.95, L2 = 0.95;
  const A0 = [-w2, 0, L2], B0 = [w2, 0, L2], C0 = [0, h, L2], A1 = [-w2, 0, -L2], B1 = [w2, 0, -L2], C1 = [0, h, -L2];
  const tri = (p, q, r) => p.concat(q, r);
  const pos = [].concat(tri(A0, B0, C0), tri(A1, B1, C1), tri(A0, A1, C1), tri(A0, C1, C0), tri(B0, C0, C1), tri(B0, C1, B1));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const tent = new THREE.Mesh(geo, std(pick([0xd14b3a, 0xf2b705, 0x3a78c2]), { side: THREE.DoubleSide, flatShading: true }));
  tent.castShadow = true; tent.receiveShadow = true; g.add(tent);
  g.userData.radius = 1.0; return g;
}

/* alpine water source: stone wall tap + trough + jerry cans */
export function makeWaterstation() {
  const g = new THREE.Group();
  const wall = box(1.0, 0.9, 0.3, NP.stone, { flatShading: true }); wall.position.y = 0.45; g.add(wall);
  const pipe = cyl(0.05, 0.05, 0.3, 6, 0x6a7278); pipe.rotation.x = Math.PI / 2; pipe.position.set(0, 0.6, 0.25); g.add(pipe);
  const trough = box(1.0, 0.25, 0.45, 0x8a9aa0); trough.position.set(0, 0.32, 0.55); g.add(trough);
  const water = box(0.9, 0.06, 0.38, NP.water, { transparent: true, opacity: 0.8 }); water.position.set(0, 0.42, 0.55); g.add(water);
  for (const x of [-0.5, 0.6]) { const can = box(0.26, 0.34, 0.22, pick([0xf2b705, 0x3a78c2])); can.position.set(x, 0.17, 1.0); g.add(can); }
  g.userData.radius = 0.9; return g;
}

/* glacial lake: turquoise water + moraine rim + ice chunks (GLOF theme) */
export function makeGlaciallake() {
  const g = new THREE.Group();
  const lake = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), std(0x4fc7d6, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }));
  lake.rotation.x = -Math.PI / 2; lake.position.y = 0.05; lake.receiveShadow = true; g.add(lake);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const s = mesh(new THREE.DodecahedronGeometry(rand(0.2, 0.4), 0), pick([0x8a8378, 0x9aa3ad, NP.snow]), { flatShading: true }); s.position.set(Math.cos(a) * 2.5, 0.12, Math.sin(a) * 2.5); s.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); g.add(s); }
  for (let i = 0; i < 5; i++) { const ice = mesh(new THREE.IcosahedronGeometry(rand(0.15, 0.3), 0), 0xdff3fb, { flatShading: true, roughness: 0.3 }); ice.position.set(rand(-1.5, 1.5), 0.12, rand(-1.5, 1.5)); g.add(ice); }
  g.userData.radius = 2.6; return g;
}

/* tree nursery: shade-net frame + sapling beds */
export function makeNursery() {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) { const p = cyl(0.04, 0.04, 1.4, 6, 0x6a7278); p.position.set(x, 0.7, z); g.add(p); }
  const net = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.4), std(0x2f6b4f, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  net.rotation.x = -Math.PI / 2; net.position.y = 1.4; g.add(net);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const pot = cyl(0.1, 0.08, 0.14, 8, 0x9a5a3a); pot.position.set(-1.0 + c * 0.66, 0.07, -0.7 + r * 0.7); g.add(pot);
    const sap = makeConifer(0.4); sap.scale.setScalar(0.5); sap.position.set(-1.0 + c * 0.66, 0.12, -0.7 + r * 0.7); g.add(sap);
  }
  g.userData.radius = 1.6; return g;
}

/* logging truck stacked with logs */
export function makeTimbertruck() {
  const g = new THREE.Group();
  const cab = box(0.9, 0.9, 1.0, 0xb23a2a, { flatShading: true }); cab.position.set(1.0, 0.75, 0); g.add(cab);
  const win = box(0.5, 0.4, 1.02, 0x274b63); win.position.set(1.05, 0.95, 0); g.add(win);
  const bed = box(2.2, 0.2, 1.1, 0x4a3520); bed.position.set(-0.6, 0.45, 0); g.add(bed);
  [-0.3, 0, 0.3].forEach((z) => { const l = cyl(0.16, 0.16, 2.0, 10, pick([0x7a5a36, 0x8a6a40])); l.rotation.z = Math.PI / 2; l.position.set(-0.6, 0.66, z); g.add(l); });
  const top = cyl(0.16, 0.16, 2.0, 10, 0x7a5a36); top.rotation.z = Math.PI / 2; top.position.set(-0.6, 0.96, 0); g.add(top);
  const wheels = [];
  for (const x of [0.9, -0.4, -1.2]) for (const z of [-0.5, 0.5]) { const w = cyl(0.22, 0.22, 0.14, 12, 0x1b1b1b); w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, z); g.add(w); wheels.push(w); }
  g.userData = { wheels, radius: 1.6 }; return g;
}

/* Newari falcha (pati) — raised brick plinth, carved wooden posts, tiled hip
   roof: a traditional public resting pavilion, used here as the bus stop. */
export function makeFalcha() {
  const g = new THREE.Group();
  const W = 2.6, D = 1.8, ph = 0.34;
  const step = box(W + 0.5, 0.16, D + 0.5, NP.brickDark, { flatShading: true }); step.position.y = 0.08; g.add(step);
  const plinth = box(W, ph, D, pick([NP.brick, NP.brickDark]), { flatShading: true }); plinth.position.y = 0.16 + ph / 2; g.add(plinth);
  const floor = box(W - 0.12, 0.06, D - 0.12, NP.plaster); floor.position.y = 0.16 + ph + 0.03; g.add(floor);
  const topY = 0.16 + ph + 0.06;
  const px = W / 2 - 0.22, pz = D / 2 - 0.22, ch = 1.4;
  for (const [x, z] of [[-px, -pz], [px, -pz], [-px, pz], [px, pz], [0, -pz], [0, pz]]) {
    const col = box(0.16, ch, 0.16, NP.woodDark, { flatShading: true }); col.position.set(x, topY + ch / 2, z); g.add(col);
    const cap = box(0.26, 0.1, 0.26, NP.wood); cap.position.set(x, topY + ch, z); g.add(cap);
    const br = box(0.06, 0.4, 0.16, NP.wood); br.position.set(x * 0.84, topY + ch - 0.18, z); br.rotation.z = x > 0 ? 0.5 : (x < 0 ? -0.5 : 0); g.add(br);
  }
  const beamY = topY + ch + 0.07;
  for (const z of [-pz, pz]) { const bm = box(W + 0.1, 0.12, 0.14, NP.wood); bm.position.set(0, beamY, z); g.add(bm); }
  for (const x of [-px, px]) { const bm = box(0.14, 0.12, D + 0.1, NP.wood); bm.position.set(x, beamY, 0); g.add(bm); }
  const roof = cone(Math.max(W, D) * 0.95, 0.72, 4, NP.roofTile, { flatShading: true });
  roof.rotation.y = Math.PI / 4; roof.position.y = beamY + 0.42; g.add(roof);
  const finial = cyl(0.05, 0.02, 0.22, 6, NP.gold, { metalness: 0.4, roughness: 0.5 }); finial.position.y = beamY + 0.84; g.add(finial);
  // small Devanagari "bus stop" sign on a post beside the pavilion
  const post = cyl(0.04, 0.04, 1.3, 6, 0x6a7278); post.position.set(W / 2 + 0.45, 0.65, 0); g.add(post);
  const sign = makeSignboard('\u092c\u0938 \u092c\u093f\u0938\u094c\u0928\u0940', 0x2c6fb0); sign.scale.setScalar(0.62); sign.position.set(W / 2 + 0.45, 1.2, 0); sign.rotation.y = -0.4; g.add(sign);
  g.userData.radius = Math.max(W, D) * 0.8;
  return g;
}
export function makeBusstop() { return makeFalcha(); }

/* a simple low-poly pedestrian for crowd scenes */
function makePerson() {
  const g = new THREE.Group();
  const FO = { force: true, thinOutline: true };
  const shirt = pick([0xd14b3a, 0x2c6fb0, 0x2f8f57, 0xe0a73a, 0x8a4fa0, 0xcf5a8a, 0xe8e2d4]);
  const pant = pick([0x33414f, 0x4a3520, 0x2b2b2b, 0x55503a]);
  const skin = pick([0xe8b98f, 0xd9a06f, 0xc98a5a]);
  const torso = box(0.32, 0.46, 0.2, shirt, FO); torso.position.y = 0.96; g.add(torso);
  const hip = box(0.3, 0.14, 0.2, pant, FO); hip.position.y = 0.72; g.add(hip);
  // hip-pivoted legs so they swing like real walking (not scissor about centre)
  const legs = [];
  for (const sx of [-0.08, 0.08]) {
    const lp = new THREE.Group(); lp.position.set(sx, 0.66, 0);
    const leg = box(0.12, 0.5, 0.14, pant, FO); leg.position.y = -0.27;
    const shoe = box(0.13, 0.08, 0.2, 0x2a2a2a); shoe.position.set(0, -0.5, 0.03);
    lp.add(leg, shoe); g.add(lp); legs.push(lp);
  }
  // shoulder-pivoted arms
  const arms = [];
  for (const sx of [-0.21, 0.21]) {
    const ap = new THREE.Group(); ap.position.set(sx, 1.14, 0);
    const arm = box(0.1, 0.4, 0.12, shirt, FO); arm.position.y = -0.2;
    ap.add(arm); g.add(ap); arms.push(ap);
  }
  const head = mesh(new THREE.SphereGeometry(0.15, 12, 10), skin, FO); head.position.y = 1.36; g.add(head);
  const hair = mesh(new THREE.SphereGeometry(0.158, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), pick([0x20160f, 0x2b1d12, 0x141414])); hair.position.y = 1.37; g.add(hair);
  // eyes on +Z so walking direction reads clearly
  for (const sx of [-0.052, 0.052]) { const e = mesh(new THREE.SphereGeometry(0.02, 8, 8), 0x241a14); e.position.set(sx, 1.35, 0.14); g.add(e); }
  g.userData = { legs, arms, radius: 0.4 };
  return g;
}

/* A wandering crowd of pedestrians that mill around a bounded area.
   Returns a Group with userData.update(dt) — call it each frame. */
export function makeCrowd(n = 10, area = 16) {
  const g = new THREE.Group();
  const people = [];
  for (let i = 0; i < n; i++) {
    const o = makePerson();
    o.position.set(rand(-area, area), 0, rand(-area, area));
    const dir = Math.random() * Math.PI * 2;
    g.add(o);
    people.push({ o, dir, spd: rand(1.1, 2.2), t: Math.random() * 10 });
  }
  g.userData.update = (dt) => {
    for (const p of people) {
      p.t += dt;
      p.o.position.x += Math.sin(p.dir) * p.spd * dt;
      p.o.position.z += Math.cos(p.dir) * p.spd * dt;
      p.o.rotation.y = p.dir;
      p.o.position.y = Math.abs(Math.sin(p.t * p.spd * 3.4)) * 0.045;
      const sw = Math.sin(p.t * p.spd * 6) * 0.5;
      if (p.o.userData.legs) { p.o.userData.legs[0].rotation.x = sw; p.o.userData.legs[1].rotation.x = -sw; }
      if (p.o.userData.arms) { p.o.userData.arms[0].rotation.x = -sw; p.o.userData.arms[1].rotation.x = sw; }
      if (Math.abs(p.o.position.x) > area || Math.abs(p.o.position.z) > area) p.dir += Math.PI;
      else if (Math.random() < 0.004) p.dir += (Math.random() - 0.5) * 1.3;
    }
  };
  g.userData.dispose = () => g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose()); });
  return g;
}

export function makeModernBuilding() {
  const g = new THREE.Group();
  const floors = 3 + Math.floor(rand(0, 3));
  const body = box(2.4, floors * 0.9, 2.4, pick([0xcfd3d6, 0xbfc6c2, 0xd8d2c4]), { flatShading: true }); body.position.y = floors * 0.45; g.add(body);
  for (let f = 0; f < floors; f++) for (let c = -1; c <= 1; c++) { const w = box(0.5, 0.5, 0.04, NP.glass, { emissive: 0x9fd6e6, emissiveIntensity: 0.15 }); w.position.set(c * 0.7, 0.6 + f * 0.9, 1.22); g.add(w); }
  const roof = box(2.5, 0.2, 2.5, 0x9aa0a4); roof.position.y = floors * 0.9 + 0.1; g.add(roof);
  // Devanagari building sign near the top of the facade
  const bSign = makeSignboard(pick(['\u092c\u0948\u0902\u0915', '\u0939\u094b\u091f\u0932', '\u0915\u093e\u0930\u094d\u092f\u093e\u0932\u092f', '\u0915\u093f\u0930\u093e\u0928\u093e']), pick([0x2c6fb0, 0x1f7a52, 0xc0392b]));
  bSign.position.set(0, floors * 0.9 - 0.55, 1.25); bSign.scale.set(1.08, 1.08, 1); g.add(bSign);
  g.userData.radius = 1.7; return g;
}

/* register all biome-specific builders so buildBiome() places real objects */
Object.assign(LANDMARK_BUILDERS, {
  school: makeSchool, signpost: makeSignpost, leafpile: makeLeafpile,
  paddy: makePaddy, compost: makeCompost, tractor: makeTractor, stubble: makeStubble, pump: makePump,
  powerplant: makePowerplant, riverbank: makeRiverbank, construction: makeConstruction, toilet: makeToilet, stones: makeStones,
  tent: makeTent, waterstation: makeWaterstation, glaciallake: makeGlaciallake, nursery: makeNursery, timbertruck: makeTimbertruck,
  busstop: makeBusstop, building: makeModernBuilding,
});

/* ════════════════════════════════════════════════════════════════════════
 * WEATHER — cheap, camera-bound, capped particle fields (1 draw call each).
 * makeWeather(type) → Group with userData.update(dt, camPos) and .dispose().
 * type: 'monsoon'|'rain' | 'snow' | 'dust' | 'clear'
 * ══════════════════════════════════════════════════════════════════════ */
export function makeWeather(type) {
  const group = new THREE.Group();
  const R = 30, H = 26;                 // field radius + height around the player
  group.userData.update = () => {};
  group.userData.dispose = () => group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });

  if (type === 'monsoon' || type === 'rain') {
    const N = 350;
    const pos = new Float32Array(N * 6);
    const vel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = rand(-R, R), y = rand(0, H), z = rand(-R, R), len = rand(0.5, 0.95);
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x; pos[i * 6 + 4] = y - len; pos[i * 6 + 5] = z;
      vel[i] = rand(28, 42);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0.45 }));
    lines.frustumCulled = false;
    group.add(lines);
    group.userData.update = (dt, cam) => {
      group.position.set(cam.x, 0, cam.z);
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const dy = vel[i] * dt;
        p[i * 6 + 1] -= dy; p[i * 6 + 4] -= dy;
        if (p[i * 6 + 4] < 0) { const nx = rand(-R, R), nz = rand(-R, R), len = p[i * 6 + 1] - p[i * 6 + 4]; p[i * 6] = nx; p[i * 6 + 1] = H; p[i * 6 + 2] = nz; p[i * 6 + 3] = nx; p[i * 6 + 4] = H - len; p[i * 6 + 5] = nz; }
      }
      geo.attributes.position.needsUpdate = true;
    };
  } else if (type === 'snow') {
    const N = 320;
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-R, R); pos[i * 3 + 1] = rand(0, H); pos[i * 3 + 2] = rand(-R, R); spd[i] = rand(0.9, 1.9); ph[i] = rand(0, Math.PI * 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false }));
    pts.frustumCulled = false;
    group.add(pts);
    let t = 0;
    group.userData.update = (dt, cam) => {
      t += dt; group.position.set(cam.x, 0, cam.z);
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) { p[i * 3 + 1] -= spd[i] * dt; p[i * 3] += Math.sin(t + ph[i]) * 0.012; if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = H; p[i * 3] = rand(-R, R); p[i * 3 + 2] = rand(-R, R); } }
      geo.attributes.position.needsUpdate = true;
    };
  } else if (type === 'dust') {
    const N = 160;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-R, R); pos[i * 3 + 1] = rand(0.5, 12); pos[i * 3 + 2] = rand(-R, R); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcdb98a, size: 0.14, transparent: true, opacity: 0.4, depthWrite: false }));
    pts.frustumCulled = false;
    group.add(pts);
    let t = 0;
    group.userData.update = (dt, cam) => {
      t += dt; group.position.set(cam.x, 0, cam.z);
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) { p[i * 3] += 0.6 * dt; p[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.004; if (p[i * 3] > R) { p[i * 3] = -R; p[i * 3 + 2] = rand(-R, R); } }
      geo.attributes.position.needsUpdate = true;
    };
  }
  return group;
}

/* ════════════════════════════════════════════════════════════════════════
 * STATIC MERGE — collapse many static meshes into ONE draw call.
 * Bakes each mesh's world transform + colour into a single vertex-coloured
 * geometry, so variety (per-house, per-tree colour) survives. Use ONLY for
 * static objects — never vehicles, birds, flags, sprites, lines, or
 * textured/strongly-emissive meshes.
 * ══════════════════════════════════════════════════════════════════════ */
export function mergeStatic(objects, matOpts = {}) {
  const parent = new THREE.Group();
  objects.forEach((o) => parent.add(o));
  parent.updateMatrixWorld(true);
  const geoms = [];
  parent.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
    }
    const m = o.material;
    let col = (m && m.color) ? m.color : new THREE.Color(0xffffff);
    if (m && m.emissive && (m.emissiveIntensity || 0) > 0.4) col = m.emissive;
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geoms.push(g);
  });
  if (!geoms.length) return parent;
  const merged = mergeGeometries(geoms, false);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0, ...matOpts,
  }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ════════════════════════════════════════════════════════════════════════
 * COMMUTE RIDER — a bicycle + a "commuter" that mounts the student on the
 * chosen transport so the journey can be ridden (used by the Commute mission).
 * The commuter's local forward is +Z; wheels live in userData.wheels.
 * ══════════════════════════════════════════════════════════════════════ */
export function makeBicycle() {
  const g = new THREE.Group();
  const tyreMat = std(0x1b1b1b, { roughness: 0.7 });
  const wheels = [];
  for (const z of [0.52, -0.52]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 20), tyreMat);
    w.rotation.y = Math.PI / 2;      // vertical wheel rolling along Z
    w.position.set(0, 0.3, z);
    w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  const frameMat = std(0x2f8f6b, { metalness: 0.2, roughness: 0.5, flatShading: true });
  const tube = (len, x, y, z, rx) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), frameMat);
    t.position.set(x, y, z); if (rx) t.rotation.x = rx; t.castShadow = true; g.add(t);
  };
  tube(1.0, 0, 0.48, 0, Math.PI / 2);   // top tube
  tube(0.6, 0, 0.4, 0.24, 0.7);         // down tube
  tube(0.55, 0, 0.4, -0.24, -0.7);      // seat stay
  const seat = box(0.2, 0.06, 0.12, 0x222222); seat.position.set(0, 0.66, -0.4); g.add(seat);
  const hb = cyl(0.02, 0.02, 0.34, 6, 0x333333); hb.rotation.z = Math.PI / 2; hb.position.set(0, 0.72, 0.5); g.add(hb);
  const stem = cyl(0.022, 0.022, 0.3, 6, 0x333333); stem.position.set(0, 0.56, 0.5); g.add(stem);
  g.userData = { wheels, radius: 0.6 };
  return g;
}

export function makeCommuter(mode) {
  const g = new THREE.Group();
  const student = makeStudent();
  if (mode === 'walk') {
    g.add(student);
    g.userData = { wheels: [], student, walk: true, exhaust: 0 };
    return g;
  }
  let vehicle, exhaust = 0;
  if (mode === 'bicycle') vehicle = makeBicycle();
  else if (mode === 'motorbike') { vehicle = makeMotorbike(); exhaust = 0.45; }
  else if (mode === 'microbus' || mode === 'public_bus') { vehicle = makeMicrobus(); exhaust = 0.8; }
  else { vehicle = makeTaxi(); exhaust = 0.7; }            // private_car
  // motorbike/taxi/microbus are authored facing +X and need turning to +Z;
  // the bicycle is already authored facing +Z (wheels along Z), so leave it.
  const FACES_Z_BY_DEFAULT = { bicycle: true };
  vehicle.rotation.y = FACES_Z_BY_DEFAULT[mode] ? 0 : -Math.PI / 2;
  g.add(vehicle);
  if (mode === 'bicycle') { student.position.set(0, 0.42, -0.05); student.scale.setScalar(0.92); }
  else if (mode === 'motorbike') { student.position.set(0, 0.46, 0); student.scale.setScalar(0.92); }
  else { student.position.set(0, 0.18, 0.25); student.scale.setScalar(0.6); }  // seated inside
  g.add(student);
  g.userData = { wheels: vehicle.userData.wheels || [], student, vehicle, walk: false, exhaust };
  return g;
}

/* ════════════════════════════════════════════════════════════════════════
 * BIOME SIGNATURE FEATURES — terrain + landmarks that give each region its
 * own identity, so the explorer feels like five real places (not one).
 * All stylised low-poly flatShading, reusing the NP palette + helpers.
 * ══════════════════════════════════════════════════════════════════════ */

/* Nepali hill terraces — stepped paddy platforms climbing a slope (Baglung). */
export function makeTerraces({ tiers = 6, width = 26, depth = 3.0, rise = 1.0, color = 0x7cb24a } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < tiers; i++) {
    const y = i * rise;
    const z = i * (depth * 0.72);
    const w = Math.max(4, width - i * 1.8);
    const wall = box(w, rise + 0.25, 0.5, NP.mud, { flatShading: true, roughness: 1 });
    wall.position.set(0, y - rise / 2 + 0.12, z - depth / 2);
    g.add(wall);
    const field = box(w, 0.2, depth, color, { flatShading: true });
    field.position.set(0, y, z);
    g.add(field);
    for (let k = 0; k < 5; k++) {
      const t = cone(0.1, 0.4, 4, NP.leaf, { flatShading: true });
      t.position.set(rand(-w / 2 + 0.7, w / 2 - 0.7), y + 0.3, z + rand(-depth / 2 + 0.4, depth / 2 - 0.4));
      g.add(t);
    }
  }
  return g;
}

/* Stacked firewood (Baglung village flavour). */
export function makeWoodpile() {
  const g = new THREE.Group();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4 - r; c++) {
      const log = cyl(0.15, 0.15, 1.6, 7, pick([NP.wood, NP.woodDark]), { flatShading: true });
      log.rotation.z = Math.PI / 2;
      log.position.set(c * 0.34 - (4 - r) * 0.17 + 0.17, 0.16 + r * 0.3, 0);
      g.add(log);
    }
  }
  return g;
}

/* Flooded paddy-field grid with raised bunds and rice tufts (Chitwan). */
export function makePaddyField({ rows = 4, cols = 5, tile = 7 } = {}) {
  const g = new THREE.Group();
  const waterMat = std(NP.water, { transparent: true, opacity: 0.78, roughness: 0.3, metalness: 0.05, flatShading: true });
  const bundMat = std(0x9c7a4a, { flatShading: true, roughness: 1 });
  const W = cols * tile, D = rows * tile;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c - (cols - 1) / 2) * tile;
      const cz = (r - (rows - 1) / 2) * tile;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(tile - 0.6, tile - 0.6), waterMat);
      water.rotation.x = -Math.PI / 2; water.position.set(cx, 0.05, cz); water.receiveShadow = true; g.add(water);
      for (let k = 0; k < 9; k++) {
        const t = cone(0.07, 0.42, 4, NP.leaf, { flatShading: true });
        t.position.set(cx + rand(-tile / 2 + 0.8, tile / 2 - 0.8), 0.24, cz + rand(-tile / 2 + 0.8, tile / 2 - 0.8));
        g.add(t);
      }
    }
  }
  for (let c = 0; c <= cols; c++) { const b = box(0.45, 0.28, D, bundMat); b.position.set((c - cols / 2) * tile, 0.14, 0); g.add(b); }
  for (let r = 0; r <= rows; r++) { const b = box(W, 0.28, 0.45, bundMat); b.position.set(0, 0.14, (r - rows / 2) * tile); g.add(b); }
  return g;
}

/* A river corridor — water plane with gravel banks (Kali Gandaki). */
export function makeRiverStrip({ length = 96, width = 9 } = {}) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    std(NP.water, { transparent: true, opacity: 0.85, roughness: 0.25, metalness: 0.1, flatShading: true }),
  );
  water.rotation.x = -Math.PI / 2; water.position.y = -0.12; water.receiveShadow = true; g.add(water);
  for (let i = 0; i < 34; i++) {
    const s = rand(0.3, 0.9);
    const st = box(s, s * 0.5, s, pick([NP.stone, 0xa89c88, NP.rock]), { flatShading: true });
    st.position.set((Math.random() < 0.5 ? -1 : 1) * (width / 2 + rand(0, 2.4)), 0.05, rand(-length / 2, length / 2));
    g.add(st);
  }
  return g;
}

/* A rugged canyon wall from jittered rock chunks (Kali Gandaki). */
export function makeCanyonWall({ length = 80, height = 15 } = {}) {
  const g = new THREE.Group();
  const n = Math.floor(length / 5);
  for (let i = 0; i < n; i++) {
    const h = height * rand(0.6, 1.1), w = rand(4, 7), d = rand(4, 8);
    const rock = box(w, h, d, pick([NP.rock, NP.stone, 0x5f6770]), { flatShading: true, roughness: 1 });
    rock.position.set(rand(-1.5, 1.5), h / 2 - 1, (i - n / 2) * 5 + rand(-1, 1));
    rock.rotation.y = rand(-0.3, 0.3);
    g.add(rock);
    if (Math.random() < 0.5) {
      const cap = box(w * 0.7, h * 0.3, d * 0.7, pick([NP.rock, 0x6f7783]), { flatShading: true });
      cap.position.set(rock.position.x + rand(-1, 1), h + rand(-1, 1), rock.position.z);
      g.add(cap);
    }
  }
  return g;
}

/* A wooden plank footbridge spanning the river (Kali Gandaki). */
export function makeFootbridge({ span = 11 } = {}) {
  const g = new THREE.Group();
  const deck = box(span, 0.16, 1.6, NP.wood, { flatShading: true });
  deck.position.y = 0.7; g.add(deck);
  for (let i = 0; i < Math.floor(span); i++) {
    const plank = box(0.7, 0.04, 1.5, pick([NP.wood, NP.woodDark]), { flatShading: true });
    plank.position.set(i - span / 2 + 0.5, 0.79, 0); g.add(plank);
  }
  for (const x of [-span / 2, span / 2]) {
    for (const z of [0.75, -0.75]) {
      const post = box(0.22, 1.7, 0.22, NP.woodDark, { flatShading: true });
      post.position.set(x, 0.85, z); g.add(post);
    }
  }
  for (const z of [0.75, -0.75]) {
    const rail = box(span, 0.08, 0.08, NP.woodDark, { flatShading: true });
    rail.position.set(0, 1.5, z); g.add(rail);
  }
  return g;
}

/* A turquoise glacial lake ringed by moraine rock and ice floes (Himalaya). */
export function makeGlacialLake({ size = 28 } = {}) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(size / 2, 30),
    std(0x6fcfe0, { transparent: true, opacity: 0.9, roughness: 0.2, metalness: 0.12, flatShading: true }),
  );
  water.rotation.x = -Math.PI / 2; water.position.y = -0.08; water.receiveShadow = true; g.add(water);
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = size / 2 + rand(-0.3, 0.9), s = rand(0.5, 1.4);
    const rock = box(s, s * 0.7, s, pick([NP.rock, NP.stone, 0x8fa0ab]), { flatShading: true });
    rock.position.set(Math.cos(a) * rr, 0.12, Math.sin(a) * rr); g.add(rock);
  }
  for (let i = 0; i < 5; i++) {
    const fl = box(rand(1, 2.4), 0.2, rand(1, 2), 0xdff4fb, { flatShading: true, transparent: true, opacity: 0.95 });
    fl.position.set(rand(-size / 3, size / 3), 0.06, rand(-size / 3, size / 3)); g.add(fl);
  }
  return g;
}

/* decorateBiome — lays each region's signature terrain, density and paths.
 * Called by buildBiome(); branches on params.id. */
export function decorateBiome(scene, params) {
  const add = (o, x, z, ry = 0, s = 1) => {
    o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(o); return o;
  };
  const path = (x1, z1, x2, z2, w = 2.4, color = 0xcdb88f) => {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    if (len < 1) return;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), std(color, { roughness: 1 }));
    p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.atan2(dx, dz);
    p.position.set((x1 + x2) / 2, 0.028, (z1 + z2) / 2); p.receiveShadow = true; scene.add(p);
  };
  const sp = params.spots || {};

  if (params.id === 1) {                 // Baglung — terraced hill village
    add(makeTerraces({ tiers: 7, width: 32, depth: 3, rise: 1.0 }), 0, -32, 0);
    add(makeTerraces({ tiers: 5, width: 18, depth: 2.6, rise: 0.9 }), -32, -4, Math.PI / 2);
    add(makeTerraces({ tiers: 5, width: 18, depth: 2.6, rise: 0.9 }), 32, 6, -Math.PI / 2);
    [[-6, 6], [6, 6], [-7, -4], [8, -5], [-3, 12], [5, 14], [12, 2], [-12, 0]].forEach(([x, z], i) =>
      add(makeNewariHouse(2 + (i % 2)), x, z, rand(0, 6.28)));
    add(makeWoodpile(), -13, 9, 0.5); add(makeWoodpile(), 10, -2, -0.4);
    for (let i = 0; i < 38; i++) { const x = rand(-40, 40), z = rand(-40, 40); if (x * x + z * z < 70) continue; add(makeConifer(rand(1, 1.8)), x, z, rand(0, 6.28)); }
    if (sp.house && sp.school) { path(sp.house[0], sp.house[1], 0, 0); path(0, 0, sp.school[0], sp.school[1]); if (sp.shop) path(0, 0, sp.shop[0], sp.shop[1]); }
  } else if (params.id === 2) {           // Chitwan — Terai paddy farm
    add(makePaddyField({ rows: 4, cols: 5, tile: 7 }), -13, 6, 0);
    add(makePaddyField({ rows: 3, cols: 4, tile: 7 }), 19, -11, 0);
    add(makeNewariHouse(2), 4, 21, Math.PI);
    for (let i = 0; i < 34; i++) { const x = rand(-42, 42), z = rand(-42, 42); if (Math.abs(x + 13) < 20 && Math.abs(z - 6) < 16) continue; if (Math.abs(x - 19) < 16 && Math.abs(z + 11) < 12) continue; add(makeTree(rand(1, 1.7)), x, z, rand(0, 6.28)); }
    if (sp.paddy && sp.compost) path(sp.paddy[0], sp.paddy[1], sp.compost[0], sp.compost[1]);
    if (sp.pump) path(sp.pump[0], sp.pump[1], 0, 0);
  } else if (params.id === 4) {           // Kali Gandaki — dramatic layered gorge + river
    add(makeRiverStrip({ length: 100, width: 9 }), 0, 0, 0);
    add(makeCanyonWall({ length: 92, height: 22 }), -16, 0, 0);
    add(makeCanyonWall({ length: 92, height: 22 }), 16, 0, Math.PI);
    add(makeCanyonWall({ length: 92, height: 16 }), -30, 0, 0);   // outer ridgelines for depth
    add(makeCanyonWall({ length: 92, height: 16 }), 30, 0, Math.PI);
    add(makeFootbridge({ span: 12 }), 0, 6, 0);
    for (let i = 0; i < 40; i++) { const x = (Math.random() < 0.5 ? -1 : 1) * rand(6, 13), z = rand(-44, 44); add(makeStones(), x, z, rand(0, 6.28), rand(0.7, 1.6)); }
    for (let i = 0; i < 14; i++) { const x = (Math.random() < 0.5 ? -1 : 1) * rand(9, 14), z = rand(-40, 40); add(makeConifer(rand(0.7, 1.2)), x, z); }
    if (sp.construction && sp.powerplant) path(sp.construction[0], sp.construction[1], sp.powerplant[0], sp.powerplant[1]);
  } else if (params.id === 5) {           // Himalaya — glacial lake, camp, towering peaks
    add(makeGlacialLake({ size: 30 }), 9, 9, 0);
    add(makeTent(), -10, 10, 0.3); add(makeTent(), -7, 14, -0.4); add(makeTent(), -13, 6, 0.1);
    const peak = (x, z, h, r) => {
      const grp = new THREE.Group();
      const rock = cone(r * 1.05, h * 0.55, 6, NP.rock, { flatShading: true }); rock.position.y = h * 0.225; grp.add(rock);
      const snow = cone(r, h, 6, NP.snow, { flatShading: true }); snow.position.y = h * 0.5; grp.add(snow);
      return add(grp, x, z, rand(0, 6.28));
    };
    peak(-26, -30, 30, 12); peak(24, -34, 36, 14); peak(2, -40, 28, 11);
    for (let i = 0; i < 44; i++) { const x = rand(-42, 42), z = rand(-42, 42); if ((x - 9) ** 2 + (z - 9) ** 2 < 300) continue; add(makeStones(), x, z, rand(0, 6.28), rand(0.7, 1.7)); }
    for (let i = 0; i < 10; i++) { const x = rand(-40, 40), z = rand(-40, 40); if ((x - 9) ** 2 + (z - 9) ** 2 < 340) continue; add(makeConifer(rand(0.6, 1.0)), x, z); }
    if (sp.tent && sp.nursery) path(sp.tent[0], sp.tent[1], sp.nursery[0], sp.nursery[1]);
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * TERAI / WESTERN-NEPAL SET DRESSING — palms, flat-roof pucca houses, and
 * green Churia foothills, so mission towns (Butwal, Dhangadi…) look unlike the
 * Newari valley and snow peaks of the Explorer biomes.
 * ══════════════════════════════════════════════════════════════════════ */
export function makePalm(scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 0.22, 3.4, 7, 0x8a6a44, { flatShading: true }); trunk.position.y = 1.7; trunk.rotation.z = 0.05; g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.7, 4), std(pick([0x3f8f3f, 0x4caf50, 0x57a04a]), { flatShading: true }));
    const a = (i / 7) * Math.PI * 2;
    fr.position.set(Math.cos(a) * 0.5, 3.35, Math.sin(a) * 0.5);
    fr.rotation.z = Math.cos(a) * 1.0; fr.rotation.x = Math.sin(a) * 1.0;
    fr.scale.set(0.5, 1, 0.16);
    g.add(fr);
  }
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.SphereGeometry(0.12, 6, 5), 0x5a3a1f, { flatShading: true }); c.position.set(rand(-0.18, 0.18), 3.05, rand(-0.18, 0.18)); g.add(c); }
  g.scale.setScalar(scale);
  return g;
}

export function makeTeraiHouse(storeys = 1) {
  const g = new THREE.Group();
  const col = pick([0xf2c2c2, 0xf2e2a0, 0xbfe0d6, 0xf2d2b0, 0xd6c2e8, 0xcfe2f2]);
  const h = 2.3 * storeys;
  const body = box(3.4, h, 3, col, { flatShading: true, roughness: 1 }); body.position.y = h / 2; g.add(body);
  const roof = box(3.6, 0.22, 3.2, 0xcfc8ba, { flatShading: true }); roof.position.y = h + 0.11; g.add(roof);
  const para = box(3.6, 0.32, 0.12, 0xe8e0d2, { flatShading: true }); para.position.set(0, h + 0.32, 1.56); g.add(para);
  const glass = std(0x9fd6e6, { flatShading: true, metalness: 0.1, roughness: 0.4 });
  for (let s = 0; s < storeys; s++) {
    for (const x of [-0.9, 0.9]) { const w = mesh(new THREE.BoxGeometry(0.7, 0.8, 0.06), glass); w.position.set(x, 1.2 + s * 2.3, 1.52); g.add(w); }
  }
  const door = box(0.72, 1.3, 0.08, 0x6b4a2f, { flatShading: true }); door.position.set(0, 0.65, 1.53); g.add(door);
  return g;
}

export function makeGreenHills({ count = 10, radius = 150, height = 28 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand(-0.12, 0.12);
    const r = radius * rand(0.8, 1.12);
    const h = height * rand(0.55, 1.1);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(h * 1.15, h, 7), std(pick([0x4f7d3f, 0x3f6d33, 0x5a8a45, 0x46763a]), { flatShading: true }));
    hill.position.set(Math.cos(a) * r, h / 2 - 7, Math.sin(a) * r);
    hill.rotation.y = rand(0, 6.28);
    g.add(hill);
  }
  return g;
}

/* ════════════════════════════════════════════════════════════════════════
 * SCHOOL DEVICES — power-using objects with an on/off state, for the Tansen
 * "Power Patrol" mission. Each exposes userData.setOn(bool) (+update where
 * animated). Stylised low-poly to match the kit.
 * ══════════════════════════════════════════════════════════════════════ */
export function makeHangingBulb() {
  const g = new THREE.Group();
  const wire = cyl(0.02, 0.02, 0.8, 4, 0x222222); wire.position.y = 0.6; g.add(wire);
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd24a, emissiveIntensity: 1.0, flatShading: true });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat); bulb.position.y = 0.16; g.add(bulb);
  g.userData = { kind: 'light', setOn: (on) => { mat.emissiveIntensity = on ? 1.0 : 0.0; } };
  return g;
}

export function makeCeilingFan() {
  const g = new THREE.Group();
  const rod = cyl(0.04, 0.04, 0.5, 5, 0x444444); rod.position.y = 0.25; g.add(rod);
  const hub = cyl(0.16, 0.16, 0.1, 10, 0x6f6f6f); g.add(hub);
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) { const holder = new THREE.Group(); const b = box(1.0, 0.03, 0.18, 0x9a8f7a, { flatShading: true }); b.position.set(0.55, 0, 0); holder.add(b); holder.rotation.y = i * Math.PI / 2; blades.add(holder); }
  g.add(blades);
  g.userData = { kind: 'fan', on: true, blades, update: (dt) => { if (g.userData.on) blades.rotation.y += dt * 8; }, setOn: (v) => { g.userData.on = v; } };
  return g;
}

export function makeDeskComputer() {
  const g = new THREE.Group();
  const desk = box(1.2, 0.1, 0.7, 0x8a6a44, { flatShading: true }); desk.position.y = 0.7; g.add(desk);
  const leg = (x, z) => { const l = box(0.08, 0.7, 0.08, 0x6b4a2f); l.position.set(x, 0.35, z); g.add(l); };
  leg(-0.5, -0.3); leg(0.5, -0.3); leg(-0.5, 0.3); leg(0.5, 0.3);
  const stand = box(0.1, 0.25, 0.1, 0x333333); stand.position.set(0, 0.9, 0); g.add(stand);
  const mat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x4aa3ff, emissiveIntensity: 0.9, flatShading: true });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.05), mat); screen.position.set(0, 1.22, 0); g.add(screen);
  const kbd = box(0.5, 0.04, 0.18, 0x222222); kbd.position.set(0, 0.77, 0.22); g.add(kbd);
  g.userData = { kind: 'computer', setOn: (on) => { mat.emissiveIntensity = on ? 0.9 : 0.0; } };
  return g;
}

export function makeWallAC() {
  const g = new THREE.Group();
  const body = box(1.5, 0.55, 0.4, 0xf4f4f2, { flatShading: true }); g.add(body);
  const vent = box(1.3, 0.14, 0.05, 0xcccccc); vent.position.set(0, -0.12, 0.21); g.add(vent);
  const led = new THREE.MeshStandardMaterial({ color: 0x2f9e44, emissive: 0x2f9e44, emissiveIntensity: 1 });
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), led); dot.position.set(0.55, 0.12, 0.21); g.add(dot);
  g.userData = { kind: 'ac', setOn: (on) => { led.emissiveIntensity = on ? 1 : 0; } };
  return g;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Heritage & scenic landmarks — Explorer L6 Dhulikhel, L7 Janakpur, L8 Lumbini.
 * Built from primitives; registered into LANDMARK_BUILDERS at the end.
 * ─────────────────────────────────────────────────────────────────────────── */

// small domed kiosk (chhatri) used to dress temple roofs
function makeChhatri(r = 0.5, color = 0xf3ece2, gold = 0xe8c558) {
  const g = new THREE.Group();
  for (const [x, z] of [[-r, -r], [r, -r], [-r, r], [r, r]]) { const p = cyl(0.07, 0.07, 0.9, 6, color); p.position.set(x, 0.45, z); g.add(p); }
  const dome = mesh(new THREE.SphereGeometry(r * 1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), color); dome.position.y = 0.9; g.add(dome);
  const fin = cyl(0.04, 0.08, 0.4, 6, gold); fin.position.y = 1.25 + r * 0.4; g.add(fin);
  return g;
}

// Dhulikhel terraced hill steps (anti-erosion farming)
function makeTerrace() {
  const g = new THREE.Group();
  const greens = [0x9ccc65, 0x7cb342, 0x8fbf5a];
  for (let i = 0; i < 4; i++) {
    const w = 7 - i * 1.1;
    const step = box(w, 0.5, 2.0, greens[i % 3]); step.position.set(0, 0.25 + i * 0.5, -i * 2.0); g.add(step);
    const wall = box(w, 0.55, 0.22, 0x9c7f4f); wall.position.set(0, 0.27 + i * 0.5, -i * 2.0 + 1.0); g.add(wall);
  }
  g.userData.radius = 4.2; return g;
}

// Dhulikhel sunrise viewing tower
function makeViewTower() {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) { const l = cyl(0.13, 0.15, 6, 6, 0x8a5a2b); l.position.set(x, 3, z); g.add(l); }
  for (let h = 1.6; h < 6; h += 1.5) { const b = box(2.4, 0.12, 0.12, 0x6b4f2a); b.position.set(0, h, 1.1); g.add(b); const b2 = b.clone(); b2.position.z = -1.1; g.add(b2); }
  const plat = box(3.0, 0.22, 3.0, 0x7a5a30); plat.position.y = 6.0; g.add(plat);
  for (const [x, z] of [[-1.4, 1.4], [1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]]) { const post = cyl(0.06, 0.06, 0.7, 6, 0x8a5a2b); post.position.set(x, 6.45, z); g.add(post); }
  const roof = cone(2.7, 1.7, 4, 0xb5463a); roof.position.y = 7.6; roof.rotation.y = Math.PI / 4; g.add(roof);
  const pole = cyl(0.04, 0.04, 1.6, 6, 0x5a4a2a); pole.position.y = 9.0; g.add(pole);
  const flag = box(0.7, 0.45, 0.02, 0xd23b3b); flag.position.set(0.36, 9.4, 0); g.add(flag);
  g.userData.radius = 2.4; return g;
}

// Janakpur — Janaki Mandir (ornate Mithila palace-temple, white & rose)
function makeJanakiMandir() {
  const g = new THREE.Group();
  const white = 0xf4ede3, rose = 0xe7a3ad, gold = 0xe8c558;
  const base = box(10, 1.0, 10, 0xe8dccb); base.position.y = 0.5; g.add(base);
  const body = box(8.4, 5.4, 8.4, white); body.position.y = 3.5; g.add(body);
  for (let s = 0; s < 3; s++) { const band = box(8.5, 0.25, 8.5, rose); band.position.y = 1.7 + s * 1.7; g.add(band); }
  const faces = [[0, 4.25, 0], [0, -4.25, 0], [4.25, 0, 1], [-4.25, 0, 1]];
  faces.forEach(([fx, fz, sideFace]) => {
    for (let s = 0; s < 2; s++) for (let i = -1; i <= 1; i++) {
      const win = box(0.85, 1.35, 0.18, rose);
      if (!sideFace) win.position.set(i * 2.3, 2.4 + s * 1.7, fz + (fz > 0 ? 0.04 : -0.04));
      else win.position.set(fx + (fx > 0 ? 0.04 : -0.04), 2.4 + s * 1.7, i * 2.3);
      g.add(win);
    }
  });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const r = box(8.6, 0.5, 0.2, white); r.position.set(Math.sin(a) * 4.3, 6.45, Math.cos(a) * 4.3); r.rotation.y = a; g.add(r); }
  for (const [x, z] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) { const c = makeChhatri(0.6, white, gold); c.position.set(x, 6.5, z); g.add(c); }
  const drum = cyl(2.0, 2.2, 1.2, 16, white); drum.position.y = 7.2; g.add(drum);
  const dome = mesh(new THREE.SphereGeometry(2.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.y = 7.8; g.add(dome);
  const fin = cyl(0.08, 0.16, 1.2, 8, gold); fin.position.y = 10.0; g.add(fin);
  const ball = mesh(new THREE.SphereGeometry(0.28, 10, 10), gold); ball.position.y = 10.7; g.add(ball);
  g.userData.radius = 6.6; return g;
}

// sacred bathing pond with stone ghats (Janakpur kunda / Lumbini Puskarini)
function makeSacredPond() {
  const g = new THREE.Group();
  const water = mesh(new THREE.CircleGeometry(4.2, 28), 0x3f7fb0, { transparent: true, opacity: 0.85, roughness: 0.3, metalness: 0.1 });
  water.rotation.x = -Math.PI / 2; water.position.y = 0.06; g.add(water);
  for (let k = 0; k < 3; k++) { const r = 4.4 + k * 0.45; const ring = mesh(new THREE.RingGeometry(r, r + 0.45, 28), 0xcdbfa0); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05 - k * 0.12; g.add(ring); }
  for (let i = 0; i < 5; i++) { const pad = mesh(new THREE.CircleGeometry(0.4, 10), 0x4a9e3f); pad.rotation.x = -Math.PI / 2; pad.position.set(rand(-3, 3), 0.08, rand(-3, 3)); g.add(pad); }
  g.userData.radius = 5.6; return g;
}

// Lumbini — Maya Devi Temple (white modern enclosure)
function makeMayaDevi() {
  const g = new THREE.Group();
  const white = 0xf6f3ee;
  const step = box(7.6, 0.4, 5.6, 0xe6e0d4); step.position.y = 0.2; g.add(step);
  const body = box(7, 3.4, 5, white); body.position.y = 1.9; g.add(body);
  const roof = box(7.4, 0.5, 5.4, 0xeceadf); roof.position.y = 3.8; g.add(roof);
  const tier = box(4.6, 1.4, 3.2, white); tier.position.y = 4.6; g.add(tier);
  const top = box(2.4, 1.0, 1.8, white); top.position.y = 5.7; g.add(top);
  const fin = cyl(0.06, 0.12, 0.9, 6, 0xe8c558); fin.position.y = 6.6; g.add(fin);
  const door = box(1.4, 2.2, 0.2, 0x6b4f2a); door.position.set(0, 1.3, 2.55); g.add(door);
  g.userData.radius = 4.2; return g;
}

// Lumbini — Ashoka Pillar (stone column with capital)
function makeAshokaPillar() {
  const g = new THREE.Group();
  const stone = 0xcabb98;
  const shaft = cyl(0.35, 0.5, 6.5, 16, stone); shaft.position.y = 3.25; g.add(shaft);
  const bell = cyl(0.62, 0.4, 0.6, 16, stone); bell.position.y = 6.7; g.add(bell);
  const abacus = cyl(0.7, 0.7, 0.4, 16, stone); abacus.position.y = 7.1; g.add(abacus);
  const cap = box(0.9, 0.6, 0.4, 0xd8cba6); cap.position.y = 7.5; g.add(cap);
  g.userData.radius = 1.6; return g;
}

// Lumbini — Bodhi tree (large sacred fig draped with prayer flags)
function makeBodhiTree() {
  const g = new THREE.Group();
  const trunk = cyl(0.5, 0.8, 3.0, 8, 0x6b4a2a); trunk.position.y = 1.5; g.add(trunk);
  for (let i = 0; i < 5; i++) { const br = cyl(0.12, 0.2, 1.6, 6, 0x6b4a2a); const a = i * 1.3; br.position.set(Math.cos(a) * 0.6, 2.6 + i * 0.12, Math.sin(a) * 0.6); br.rotation.z = Math.cos(a) * 0.6; br.rotation.x = Math.sin(a) * 0.6; g.add(br); }
  const greens = [0x2f7d32, 0x3f9142, 0x57a85a];
  for (let i = 0; i < 14; i++) { const blob = mesh(new THREE.SphereGeometry(rand(1.1, 1.8), 10, 8), pick(greens), { flatShading: true }); blob.position.set(rand(-2.6, 2.6), 4.2 + rand(0, 2.2), rand(-2.6, 2.6)); blob.scale.y = 0.8; g.add(blob); }
  const pf = makePrayerFlags(6, 0.8); pf.position.y = 3.0; g.add(pf);
  const pf2 = makePrayerFlags(6, 0.8); pf2.position.y = 3.3; pf2.rotation.y = Math.PI / 2; g.add(pf2);
  g.userData.radius = 3.2; return g;
}

// Lumbini — international monastery (Tibetan-style colour block)
function makeMonastery() {
  const g = new THREE.Group();
  const body = box(5, 3.2, 4, 0xf2ede4); body.position.y = 1.6; g.add(body);
  const red = box(5.1, 0.9, 4.1, 0x9e2b25); red.position.y = 3.0; g.add(red);
  const roof = box(5.4, 0.3, 4.4, 0xe8c558); roof.position.y = 3.55; g.add(roof);
  const roof2 = box(3.0, 0.25, 2.4, 0xe8c558); roof2.position.y = 3.9; g.add(roof2);
  const orn = cyl(0.12, 0.12, 0.8, 8, 0xe8c558); orn.position.y = 4.35; g.add(orn);
  const door = box(1.0, 1.8, 0.2, 0x6b4f2a); door.position.set(0, 0.9, 2.05); g.add(door);
  for (const x of [-1.6, 1.6]) { const w = box(0.7, 0.9, 0.15, 0x9e2b25); w.position.set(x, 1.85, 2.03); g.add(w); }
  g.userData.radius = 3.0; return g;
}

Object.assign(LANDMARK_BUILDERS, {
  terrace: makeTerrace, viewtower: makeViewTower,
  janaki_mandir: makeJanakiMandir, pond: makeSacredPond,
  mayadevi: makeMayaDevi, ashoka_pillar: makeAshokaPillar,
  bodhitree: makeBodhiTree, monastery: makeMonastery,
});

/* ─────────────────────────────────────────────────────────────────────────
   LUMBINI — Sacred Garden, Central Canal (boating) and the World Peace Pagoda
   ───────────────────────────────────────────────────────────────────────── */

// rectangular brick Puskarini sacred pond with a stepped ghat toward the temple
function makeRectPond(w = 10, d = 7) {
  const g = new THREE.Group();
  const water = mesh(new THREE.PlaneGeometry(w, d), 0x3f86b8, { transparent: true, opacity: 0.86, roughness: 0.25 });
  water.rotation.x = -Math.PI / 2; water.position.y = 0.08; g.add(water);
  const rimC = 0xcdbfa0, rim = 0.45;
  const top = box(w + rim * 2, 0.5, rim, rimC); top.position.set(0, 0.18, -(d / 2 + rim / 2)); g.add(top);
  const bot = box(w + rim * 2, 0.5, rim, rimC); bot.position.set(0, 0.18, d / 2 + rim / 2); g.add(bot);
  const lft = box(rim, 0.5, d, rimC); lft.position.set(-(w / 2 + rim / 2), 0.18, 0); g.add(lft);
  const rgt = box(rim, 0.5, d, rimC); rgt.position.set(w / 2 + rim / 2, 0.18, 0); g.add(rgt);
  for (let k = 0; k < 3; k++) { const s = box(w * 0.5, 0.16, 0.5, 0xbfb191); s.position.set(0, 0.16 - k * 0.04, -(d / 2 + 0.4 + k * 0.5)); g.add(s); }
  g.userData.radius = Math.max(w, d) * 0.6; return g;
}

// World Peace Pagoda — gleaming white stupa with four golden Buddhas + spire
function makeWorldPeacePagoda() {
  const g = new THREE.Group();
  const white = 0xf6f4ee, gold = 0xe9c34a;
  for (let i = 0; i < 3; i++) { const r = 6.5 - i * 1.0; const t = cyl(r, r, 0.6, 32, white); t.position.y = 0.3 + i * 0.6; g.add(t); }
  const drum = cyl(4.0, 4.4, 1.4, 32, white); drum.position.y = 2.5; g.add(drum);
  const dome = mesh(new THREE.SphereGeometry(4.0, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.y = 3.2; g.add(dome);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    const niche = box(1.6, 2.0, 0.5, 0xe8e2d6); niche.position.set(Math.cos(a) * 4.3, 2.6, Math.sin(a) * 4.3); niche.rotation.y = -a; g.add(niche);
    const bud = cyl(0.0, 0.55, 1.4, 12, gold); bud.position.set(Math.cos(a) * 4.55, 2.7, Math.sin(a) * 4.55); g.add(bud);
    const head = mesh(new THREE.SphereGeometry(0.32, 12, 10), gold); head.position.set(Math.cos(a) * 4.55, 3.55, Math.sin(a) * 4.55); g.add(head);
  }
  const harm = box(1.6, 1.0, 1.6, gold); harm.position.y = 7.3; g.add(harm);
  for (let i = 0; i < 7; i++) { const r = 0.9 - i * 0.1; const ring = cyl(r, r + 0.06, 0.32, 16, gold); ring.position.y = 8.0 + i * 0.34; g.add(ring); }
  const fin = mesh(new THREE.SphereGeometry(0.35, 12, 10), gold); fin.position.y = 10.6; g.add(fin);
  g.userData.radius = 6.6; return g;
}

// a cheerful pedal-boat for the canal (rideable — excluded from collider sweep)
function makeBoat() {
  const g = new THREE.Group();
  const hullC = 0xe2604a, trimC = 0xf2d24a, canopyC = 0x2f9e44;
  const hull = box(1.7, 0.55, 3.4, hullC); hull.position.y = 0.4; g.add(hull);
  const bow = cone(0.85, 1.0, 4, hullC); bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.position.set(0, 0.4, 2.1); bow.scale.set(1, 0.55, 1); g.add(bow);
  const rim = box(1.85, 0.16, 3.55, trimC); rim.position.y = 0.68; g.add(rim);
  const floor = box(1.5, 0.1, 3.1, 0xc9a26a); floor.position.y = 0.6; g.add(floor);
  for (const z of [0.5, -0.7]) { const seat = box(1.4, 0.12, 0.5, 0xcaa46a); seat.position.set(0, 0.78, z); g.add(seat); const back = box(1.4, 0.45, 0.12, 0xcaa46a); back.position.set(0, 1.0, z - 0.25); g.add(back); }
  const canopy = box(1.95, 0.12, 1.95, canopyC); canopy.position.set(0, 1.7, -0.1); g.add(canopy);
  for (const [px, pz] of [[-0.82, 0.8], [0.82, 0.8], [-0.82, -1.0], [0.82, -1.0]]) { const pole = cyl(0.05, 0.05, 1.0, 6, 0xf2ece0); pole.position.set(px, 1.2, pz); g.add(pole); }
  const wheel = cyl(0.5, 0.5, 1.2, 10, 0xf2d24a); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.42, -1.95); g.add(wheel);
  g.userData.wheels = true; g.userData.boat = true;
  return g;
}

export function buildLumbiniGarden(scene) {
  const updaters = [];
  const add = (o, x, z, ry = 0) => { o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; };

  scene.add(makeHimalayas({ count: 8, radius: 190, height: 26 }));
  const sun = makeSun(); sun.position.set(-55, 70, -60); scene.add(sun);

  // ── Sacred Garden (north end) ──────────────────────────────────────
  add(makeMayaDevi(), 0, -16, 0);                 // white temple, door faces the garden (+z)
  add(makeAshokaPillar(), -6, -12);
  add(makeBodhiTree(), 7, -12);
  add(makeRectPond(10, 7), 0, -5);                // rectangular Puskarini pond in front
  add(makeMonastery(), -16, -10, 0.4);
  add(makeGumba(), 16, -10, -0.4);

  // brick walkways: garden plaza + a towpath down each side of the canal
  const brick = std(0xc7a071, { roughness: 1 });
  const walk = (w, l, x, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, l), brick); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03, z); p.receiveShadow = true; scene.add(p); };
  walk(8, 14, 0, -9);
  walk(2.6, 34, -4.6, 24);
  walk(2.6, 34, 4.6, 24);

  // ── Central Canal (the boating channel) ────────────────────────────
  const canalMinZ = 8, canalMaxZ = 40, canalHalfW = 3;
  const canalLen = canalMaxZ - canalMinZ, canalCz = (canalMinZ + canalMaxZ) / 2;
  const canalWater = mesh(new THREE.PlaneGeometry(canalHalfW * 2, canalLen), 0x3f86b8, { transparent: true, opacity: 0.85, roughness: 0.25 });
  canalWater.rotation.x = -Math.PI / 2; canalWater.position.set(0, 0.1, canalCz); scene.add(canalWater);
  // low stone embankments + railing posts down both banks (visual)
  const stone = 0xcdbfa0;
  for (const side of [-1, 1]) {
    const wall = box(0.4, 0.5, canalLen - 1.5, stone); wall.position.set(side * (canalHalfW + 0.25), 0.25, canalCz + 0.5); scene.add(wall);
    for (let z = canalMinZ + 2; z < canalMaxZ; z += 3) { const post = cyl(0.1, 0.12, 0.7, 6, 0xe6ddc9); post.position.set(side * (canalHalfW + 0.25), 0.45, z); scene.add(post); }
  }
  const endCap = box(canalHalfW * 2 + 1, 0.5, 0.4, stone); endCap.position.set(0, 0.25, canalMaxZ + 0.2); scene.add(endCap);

  // ── World Peace Pagoda (head of the canal) ─────────────────────────
  add(makeWorldPeacePagoda(), 0, 45);

  // monastic zone flanking the canal
  add(makeMonastery(), -15, 18, 0.5);
  add(makeGumba(), 15, 18, -0.5);
  add(makeMonastery(), -15, 33, 0.5);
  add(makeStupa(), 15, 33);

  // trees through the garden and along the towpaths (canal channel kept clear)
  for (let i = 0; i < 24; i++) {
    const onCanal = i % 2 === 0;
    const x = onCanal ? (Math.random() < 0.5 ? -1 : 1) * rand(6.5, 13) : rand(-19, 19);
    const z = onCanal ? rand(8, 42) : rand(-22, 3);
    if (Math.abs(x) < 5.5 && z > 6) continue;
    add(makeTree(rand(0.9, 1.5)), x, z);
  }

  // prayer-flag lines over the garden
  const pf = makePrayerFlags(8, 0.7); pf.position.set(-3, 4.2, -10); scene.add(pf);
  const pf2 = makePrayerFlags(8, 0.7); pf2.position.set(3, 4.4, -8); pf2.rotation.y = Math.PI / 2; scene.add(pf2);

  // the rideable boat, parked in the north boarding bay
  const boat = makeBoat(); boat.position.set(0, 0, canalMinZ + 1.5); scene.add(boat);

  return {
    update(dt) { for (const u of updaters) u(dt); },
    boat,
    water: { minX: -canalHalfW + 0.4, maxX: canalHalfW - 0.4, minZ: canalMinZ + 0.6, maxZ: canalMaxZ - 0.6, y: 0.1, bayZ: canalMinZ - 1.2 },
    // quiz-station anchors (match the Lumbini level's landmark keys), placed on walkable ground
    spots: {
      pond: new THREE.Vector3(0, 0, 2),
      bodhitree: new THREE.Vector3(5, 0, -9),
      monastery: new THREE.Vector3(-12, 0, -8),
      riverbank: new THREE.Vector3(5, 0, 22),
      waterstation: new THREE.Vector3(-5, 0, 11),
    },
  };
}


// Painterly sky for scene.background: vertical gradient (deeper up top, paler at
// the horizon) plus a few soft cloud bands — gives the cel-shaded scenes depth.
export function makeSkyTexture(base = 0x9fd3cf) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  // luminous, soft Japanese-anime light-blue / teal — Messenger-style gradient
  const col = new THREE.Color(base).lerp(new THREE.Color(0x8fd2ec), 0.40);
  const top = col.clone().lerp(new THREE.Color(0x3a93c8), 0.30);
  const mid = col.clone().lerp(new THREE.Color(0xffffff), 0.16);
  const hor = col.clone().lerp(new THREE.Color(0xffffff), 0.64);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#' + top.getHexString());
  g.addColorStop(0.5, '#' + mid.getHexString());
  g.addColorStop(1.0, '#' + hor.getHexString());
  x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  // big soft brushy cloud washes (smooth, low-contrast)
  for (const [cx, cy, r, a] of [[128, 120, 150, 0.5], [80, 215, 115, 0.4], [185, 320, 165, 0.32], [110, 430, 120, 0.24], [200, 165, 95, 0.36]]) {
    const rg = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(0.55, `rgba(255,255,255,${(a * 0.35).toFixed(3)})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, Math.max(0, cy - r), 256, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

// Painted ground texture: a base colour with soft mottled patches (and optional
// grass strokes) so large ground planes read as hand-painted, not flat plastic.
export function makeGroundTexture(base = 0x88a05a, { lines = false } = {}) {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const col = new THREE.Color(base);
  x.fillStyle = '#' + col.getHexString(); x.fillRect(0, 0, S, S);
  const light = '#' + col.clone().lerp(new THREE.Color(0xffffff), 0.18).getHexString();
  const dark = '#' + col.clone().lerp(new THREE.Color(0x000000), 0.20).getHexString();
  for (let i = 0; i < 90; i++) {
    x.fillStyle = i % 2 ? light : dark;
    x.globalAlpha = 0.08 + Math.random() * 0.10;
    const r = 7 + Math.random() * 26;
    x.beginPath();
    x.ellipse(Math.random() * S, Math.random() * S, r, r * (0.5 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  if (lines) {
    x.strokeStyle = dark; x.lineWidth = 1; x.globalAlpha = 0.22;
    for (let i = 0; i < 140; i++) {
      const px = Math.random() * S, py = Math.random() * S;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() * 4 - 2), py - 3 - Math.random() * 5); x.stroke();
    }
    x.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

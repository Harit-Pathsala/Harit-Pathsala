import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildKathmanduValley, buildLumbiniGarden, buildBiome, makeStudent, animateStudent, makeTree, makeWeather, makeSkyTexture, makeGroundTexture, makeCrowd,
} from '../game/nepalKit.js';
import { getBiome } from '../game/biomes.js';
import { EXPLORER_LEVELS, completeLevel } from '../logic.js';
import { useGameStore } from '../state/gameStore.ts';
import { audio } from '../game/audio.ts';
import gsap from 'gsap';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

/* For the hand-tuned Kathmandu builder, map event.landmark → its spot key.
 * (Other biomes' buildBiome() keys spots by landmark type directly.) */
const LANDMARK_TO_SPOT = {
  busstop: 'busstop', shop: 'canteen', school: 'school',
  dustbin: 'bin', waterstation: 'tap', building: 'roof',
};

/* the next Nepali festival by month — a gentle, non-coercive retention hook */
const FESTIVALS = [
  { m: 1, en: 'Maghe Sankranti', ne: 'माघे संक्रान्ति' }, { m: 2, en: 'Losar', ne: 'ल्होसार' },
  { m: 3, en: 'Holi', ne: 'होली' }, { m: 4, en: 'Nepali New Year', ne: 'नयाँ वर्ष' },
  { m: 5, en: 'Buddha Jayanti', ne: 'बुद्ध जयन्ती' }, { m: 8, en: 'Janai Purnima', ne: 'जनै पूर्णिमा' },
  { m: 9, en: 'Indra Jatra', ne: 'इन्द्रजात्रा' }, { m: 10, en: 'Dashain', ne: 'दशैं' },
  { m: 11, en: 'Tihar', ne: 'तिहार' },
];
const upcomingFestival = (lang) => {
  const m = new Date().getMonth() + 1;
  const f = FESTIVALS.find((x) => x.m >= m) || FESTIVALS[0];
  return lang === 'ne' ? f.ne : f.en;
};

export default function BiomeExplorer({ initialLevel = 3 }) {
  const { lang } = useLang();
  const L = (o, k) => (lang === 'ne' && o[`${k}_ne`]) ? o[`${k}_ne`] : o[k];

  const [levelId, setLevelId] = useState(initialLevel);
  const [runId, setRunId] = useState(0);
  const biome = getBiome(levelId);
  const level = EXPLORER_LEVELS.find((l) => l.id === levelId) || EXPLORER_LEVELS[0];

  // persistent "your green valley" (Zustand + IndexedDB)
  const valley = useGameStore((s) => s.valley);
  const levelsPassed = useGameStore((s) => s.levelsPassed);
  const streakDays = useGameStore((s) => s.streakDays);
  const recordResult = useGameStore((s) => s.recordResult);
  const addRestoration = useGameStore((s) => s.addRestoration);

  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const api = useRef({});
  const decisions = useRef([]);
  const co2 = useRef(0);

  const [hud, setHud] = useState({ co2: 0, done: 0 });
  const [event, setEvent] = useState(null);     // active decision { def, idx }
  const [conseq, setConseq] = useState(null);    // result feedback
  const [summary, setSummary] = useState(null);
  const [touch] = useState(() => 'ontouchstart' in window);
  const [photo, setPhoto] = useState(false);
  const camModeRef = useRef(0);
  const [view, setView] = useState(0);
  const [onBoat, setOnBoat] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [health, setHealth] = useState(100);
  const [hurt, setHurt] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [building, setBuilding] = useState(true);

  useEffect(() => {
    setBuilding(true);
    let teardown = null, cancelled = false;
    function buildScene() {
    const mount = mountRef.current;
    if (!mount) return () => {};
    decisions.current = [];
    co2.current = 0;
    setHud({ co2: 0, done: 0 });
    setEvent(null); setConseq(null); setSummary(null);
    setHealth(100); setHurt(false); setHitFlash(false);

    const W = mount.clientWidth || 900;
    const H = mount.clientHeight || 540;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyClear = new THREE.Color(biome.sky);
    const skySmog = new THREE.Color(biome.skySmog);
    const sky = skyClear.clone();
    scene.background = makeSkyTexture(sky.getHex());
    scene.fog = new THREE.Fog(sky.clone(), biome.fog.near, biome.fog.far);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 600);

    // lights
    const hemi = new THREE.HemisphereLight(biome.hemi.sky, biome.hemi.ground, biome.hemi.intensity);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, 0.34));
    const sun = new THREE.DirectionalLight(biome.sun.color, biome.sun.intensity);
    sun.position.set(biome.sun.pos[0], biome.sun.pos[1], biome.sun.pos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    scene.add(sun, sun.target);

    // valley floor
    const groundTex = makeGroundTexture(biome.ground, { lines: true }); groundTex.repeat.set(14, 14);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: groundTex, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // the living world: hand-tuned Kathmandu for L3, generic engine elsewhere
    const city = levelId === 3 ? buildKathmanduValley(scene) : levelId === 8 ? buildLumbiniGarden(scene) : buildBiome(scene, biome);
    const cars = city.cars || [];   // for GTA-style player↔vehicle collisions
    const boat = city.boat || null;                 // Lumbini: rideable canal boat
    const water = city.water || null;               // canal bounds for boating
    const weather = makeWeather(biome.weather);
    scene.add(weather);
    const crowd = makeCrowd(levelId === 3 ? 16 : 9, 18);
    scene.add(crowd);
    const bellTimer = levelId === 3 ? setInterval(() => audio.bell(), 15000) : null;

    // student
    const student = makeStudent(); student.scale.setScalar(0.72);
    student.position.set(6, 0, levelId === 8 ? 3 : 26);   // start on grass (Lumbini: by the garden & canal)
    scene.add(student);
    const studentRoot = new THREE.Group();   // wrapper for facing
    // (we rotate the student group directly; keep simple)

    // mission stations: from this level's events, placed at mapped spots
    const stations = [];
    level.events.forEach((def, idx) => {
      const key = levelId === 3 ? (LANDMARK_TO_SPOT[def.landmark] || def.landmark) : def.landmark;
      const pos = city.spots[key] ? city.spots[key].clone() : new THREE.Vector3(0, 0, 0);
      // glowing marker ring + beacon
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.4, 28),
        new THREE.MeshBasicMaterial({ color: 0x7fd488, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.06, pos.z);
      scene.add(ring);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 3, 8),
        new THREE.MeshBasicMaterial({ color: 0x8fe39a, transparent: true, opacity: 0.4 }),
      );
      beacon.position.set(pos.x, 1.5, pos.z);
      scene.add(beacon);
      const num = makeNumberSprite(idx + 1);
      num.position.set(pos.x, 2.6, pos.z);
      scene.add(num);
      const revealed = idx < 2;               // BOTW: show current + next only
      ring.visible = beacon.visible = num.visible = revealed;
      stations.push({ def, idx, pos, ring, beacon, num, done: false, revealed });
    });
    const reveal = (s) => {
      if (s.revealed) return;
      s.revealed = true;
      s.ring.visible = s.num.visible = true;
      s.beacon.visible = !s.done;
    };

    // ── input ──────────────────────────────────────────────────────────
    const keys = {};
    const onKey = (e, d) => { const k = e.key.toLowerCase(); if (k === ' ' || k.startsWith('arrow')) e.preventDefault(); keys[k] = d; };
    const kd = (e) => { audio.init(); onKey(e, true); };
    const ku = (e) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // drag to orbit the camera yaw
    let camYaw = 0, dragging = false, lastX = 0;
    const dom = renderer.domElement;
    const pd = (e) => { audio.init(); dragging = true; lastX = e.clientX; };
    const pm = (e) => { if (dragging) { camYaw -= (e.clientX - lastX) * 0.0022; lastX = e.clientX; } };
    const pu = () => { dragging = false; };
    dom.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);

    const move = { up: false, down: false, left: false, right: false };
    api.current.move = (dir, v) => { audio.init(); move[dir] = v; };
    api.current.applyEffect = applyEffect;
    let paused = false;
    api.current.pause = (v) => { paused = v; };

    // ── environment reflects the player's choices (cumulative + local) ───
    let envScore = 0.6;                       // 0 = choked valley, 1 = thriving
    let targetSky = skyClear.clone();
    let lightTarget = biome.sun.intensity;
    const applyEnv = () => {
      targetSky = skySmog.clone().lerp(skyClear, envScore);
      lightTarget = THREE.MathUtils.lerp(biome.sun.intensity * 0.6, biome.sun.intensity + 0.12, envScore);
    };
    applyEnv();
    function spawnSapling(n) {
      for (let i = 0; i < n; i++) {
        const tr = makeTree(0.9 + Math.random() * 0.45);
        const a = Math.random() * Math.PI * 2, r = 1.0 + Math.random() * 1.4;
        tr.position.set(student.position.x + Math.cos(a) * r, 0, student.position.z + Math.sin(a) * r);
        tr.scale.setScalar(0.001);
        scene.add(tr);
        gsap.to(tr.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(2)', delay: i * 0.1 });
      }
    }
    function spawnFallingTree() {
      const pivot = new THREE.Group();   // base pivot so the tree topples from its trunk
      pivot.position.set(student.position.x + (Math.random() - 0.5) * 1.8, 0, student.position.z + (Math.random() - 0.5) * 1.8);
      scene.add(pivot);
      pivot.add(makeTree(1.0 + Math.random() * 0.4));
      gsap.to(pivot.rotation, { z: -Math.PI / 2, duration: 0.9, ease: 'power2.in', delay: 0.05 });   // fall
      gsap.to(pivot.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.6, delay: 1.1, onComplete: () => scene.remove(pivot) });  // then gone
    }
    function spawnSmoke() {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.7, roughness: 1 }));
      puff.position.set(student.position.x, 0.8, student.position.z);
      scene.add(puff);
      gsap.to(puff.position, { y: 3.4, duration: 1.7, ease: 'power1.out' });
      gsap.to(puff.scale, { x: 2.2, y: 2.2, z: 2.2, duration: 1.7 });
      gsap.to(puff.material, { opacity: 0, duration: 1.7, onComplete: () => { scene.remove(puff); puff.geometry.dispose(); puff.material.dispose(); } });
    }
    // a choice shifts the whole valley's mood AND leaves a visible mark beside you
    function applyEffect(effect, correct) {
      envScore = THREE.MathUtils.clamp(envScore + (correct ? 0.16 : -0.18), 0, 1);
      applyEnv();
      if (effect === 'add_tree') { audio.play('restore'); spawnSapling(3); }
      else if (correct) { audio.play('sparkle'); spawnSapling(1); }
      else { audio.play('thud'); spawnFallingTree(); spawnSmoke(); }
    }

    // ── proximity trigger ──────────────────────────────────────────────
    let activeStation = null;
    function checkStations() {
      if (event || conseqRef.current || summaryRef.current || paused || photoRef.current) return;
      for (const s of stations) {
        if (s.done) continue;
        const dx = student.position.x - s.pos.x;
        const dz = student.position.z - s.pos.z;
        if (dx * dx + dz * dz < 2.6 * 2.6) {
          activeStation = s;
          paused = true;
          setEvent({ def: s.def, idx: s.idx });
          break;
        }
      }
    }
    api.current.resolveStation = () => {
      if (activeStation) {
        activeStation.done = true;
        activeStation.ring.material.color.set(0xbfb38f);
        activeStation.beacon.visible = false;
        activeStation = null;
        const next = stations.find((s) => !s.done && !s.revealed);
        if (next) reveal(next);
      }
    };
    api.current.getActivePos = () => activeStation && activeStation.pos;

    // overlay-state refs read by the loop (declared before loop starts)
    const conseqRef = { current: false };
    const summaryRef = { current: false };
    const photoRef = { current: false };
    api.current._setConseqRef = (v) => { conseqRef.current = v; };
    api.current._setSummaryRef = (v) => { summaryRef.current = v; };
    api.current.setPhoto = (v) => { photoRef.current = v; };
    api.current.snapshot = () => {
      try { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); } catch { return null; }
    };

    // ── animation loop ─────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let health = 100, invuln = 0;   // GTA-style: knocked by traffic → lose health
    let ambTimer = 1.4;             // periodically refresh the adaptive ambient bed
    // ── solid colliders: the player can't pass through buildings / large props ──
    const colliders = [];
    { const _wp = new THREE.Vector3(); scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (o === student) return; const r = o.userData && o.userData.radius; if (r && r > 0.7 && !o.userData.wheels) { o.getWorldPosition(_wp); colliders.push({ x: _wp.x, z: _wp.z, r: r * 0.82 }); } }); }
    let vy = 0, grounded = true, prevSpace = false, jumpY = 0, heading = 0; const PR = 0.5;   // jump + collision
    let boating = false, boatHeading = 0, prevBoard = false, boardReq = false;                 // Lumbini boating
    api.current.boardToggle = () => { boardReq = true; };
    api.current.jump = () => { if (grounded && !paused) { vy = 7.4; grounded = false; } };
    const camOffset = new THREE.Vector3();
    function loop() {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;

      // movement (camera-relative to yaw)
      const speed = 7;
      let mx = 0, mz = 0, moving = false;
      const fwd = (keys.w || keys.arrowup || move.up ? 1 : 0) - (keys.s || keys.arrowdown || move.down ? 1 : 0);
      const str = (keys.d || keys.arrowright || move.right ? 1 : 0) - (keys.a || keys.arrowleft || move.left ? 1 : 0);
      const resolveMove = () => {
        let nx = student.position.x + mx * speed * dt;
        let nz = student.position.z + mz * speed * dt;
        for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z; const dd = Math.hypot(dx, dz); const minD = c.r + PR; if (dd < minD) { if (dd > 1e-3) { nx = c.x + (dx / dd) * minD; nz = c.z + (dz / dd) * minD; } else { nx = c.x + minD; } } }
        student.position.x = THREE.MathUtils.clamp(nx, -46, 46);
        student.position.z = THREE.MathUtils.clamp(nz, -46, 46);
      };
      // ── board / leave the canal boat (Lumbini) ──
      if (boat && water) {
        const boardDown = !!keys.e;
        if (((boardDown && !prevBoard) || boardReq) && !paused) {
          if (!boating) {
            const bdx = student.position.x - boat.position.x, bdz = student.position.z - boat.position.z;
            if (Math.hypot(bdx, bdz) < 3.4) { boating = true; student.visible = false; boatHeading = boat.rotation.y; setOnBoat(true); }
          } else {
            boating = false; student.visible = true;
            student.position.set(THREE.MathUtils.clamp(boat.position.x + water.maxX + 2, -46, 46), 0, boat.position.z);
            heading = student.rotation.y; setOnBoat(false);
          }
        }
        prevBoard = boardDown; boardReq = false;
      }

      if (boating && boat && water) {
        // drive the boat: steer + paddle, clamped to the canal water
        if (!paused) {
          if (str !== 0) boatHeading -= str * 1.5 * dt;
          if (fwd !== 0) { boat.position.x += Math.sin(boatHeading) * fwd * 4.4 * dt; boat.position.z += Math.cos(boatHeading) * fwd * 4.4 * dt; moving = true; }
          boat.position.x = THREE.MathUtils.clamp(boat.position.x, water.minX, water.maxX);
          boat.position.z = THREE.MathUtils.clamp(boat.position.z, water.minZ, water.maxZ);
          boat.rotation.y = boatHeading;
          boat.position.y = water.y + Math.sin(t * 2.0) * 0.05;
          boat.rotation.z = Math.sin(t * 1.3) * 0.03;
        }
      } else {
        if (!paused && camModeRef.current === 1) {
          // follow mode: left/right steer the heading, up/down move along it
          if (str !== 0) heading -= str * 2.3 * dt;
          student.rotation.y = heading;
          if (fwd !== 0) { moving = true; mx = Math.sin(heading) * fwd; mz = Math.cos(heading) * fwd; resolveMove(); }
        } else if (!paused && (fwd !== 0 || str !== 0)) {
          // wide mode: camera-relative strafe + forward
          moving = true;
          const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
          mx = (-str * cosY - fwd * sinY);
          mz = (-str * sinY + fwd * cosY);
          const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
          resolveMove();
          student.rotation.y = Math.atan2(mx, mz);
          heading = student.rotation.y;
        }
        const spaceDown = !!(keys[' '] || keys.spacebar);
        if (spaceDown && !prevSpace && grounded && !paused) { vy = 7.4; grounded = false; }
        prevSpace = spaceDown;
        if (!grounded) { vy -= 20 * dt; jumpY += vy * dt; if (jumpY <= 0) { jumpY = 0; vy = 0; grounded = true; } }
        animateStudent(student, moving, t);
        student.position.y += jumpY;
      }

      // camera: boat-follow while boating, else photo/third-person
      if (boating && boat) {
        const dist = 6.8, height = 3.1;
        camOffset.set(-Math.sin(boatHeading) * dist, height, -Math.cos(boatHeading) * dist);
        const gp = boat.position.clone(); gp.y = 0;
        camera.position.lerp(gp.add(camOffset), 0.1);
        camera.lookAt(boat.position.x, 1.1, boat.position.z);
      } else if (photoRef.current) {
        camYaw += dt * 0.15;
        camOffset.set(Math.sin(camYaw) * 16, 9, -Math.cos(camYaw) * 16);
        camera.position.lerp(student.position.clone().add(camOffset), 0.05);
        camera.lookAt(student.position.x, student.position.y + 1.0, student.position.z);
      } else if (camModeRef.current === 1) {
        // Messenger-style follow cam — low, close, trails behind the character
        let dyaw = (-student.rotation.y) - camYaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        camYaw += dyaw * Math.min(1, dt * 2.6);
        const dist = 5.0, height = 1.95;
        camOffset.set(Math.sin(camYaw) * dist, height, -Math.cos(camYaw) * dist);
        const gp = student.position.clone(); gp.y = 0;
        camera.position.lerp(gp.add(camOffset), 0.14);
        camera.lookAt(student.position.x, 1.15, student.position.z);
      } else {
        const dist = 9.5, height = 4.2;
        camOffset.set(Math.sin(camYaw) * dist, height, -Math.cos(camYaw) * dist);
        const gp = student.position.clone(); gp.y = 0;
        camera.position.lerp(gp.add(camOffset), 0.08);
        camera.lookAt(student.position.x, 1.8, student.position.z);
      }

      // reveal nearby stations (curiosity), pulse the active ones
      for (const s of stations) {
        if (!s.revealed) {
          const rdx = student.position.x - s.pos.x, rdz = student.position.z - s.pos.z;
          if (rdx * rdx + rdz * rdz < 16 * 16) reveal(s);
        }
        if (s.revealed && !s.done) { s.ring.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08); s.num.position.y = 2.6 + Math.sin(t * 2) * 0.1; }
      }
      // sky/light easing
      sky.lerp(targetSky, 0.04);
      scene.background = makeSkyTexture(sky.getHex());
      if (scene.fog) scene.fog.color = sky;
      sun.intensity += (lightTarget - sun.intensity) * 0.05;

      city.update(dt);
      weather.userData.update(dt, student.position);
      crowd.userData.update(dt);
      ambTimer += dt;
      if (ambTimer > 1.4) { ambTimer = 0; audio.setAmbient({ weather: biome.weather, clarity: envScore }); }

      // GTA-style: getting clipped by traffic costs health (brief invulnerability after)
      if (invuln > 0) invuln -= dt;
      if (!paused && !photoRef.current && invuln <= 0) {
        for (const c of cars) {
          const cx = c.v.position.x - student.position.x;
          const cz = c.v.position.z - student.position.z;
          if (cx * cx + cz * cz < 1.2 * 1.2) {
            health = Math.max(0, health - 25);
            invuln = 1.4;
            audio.play('thud');
            setHealth(health);
            flashHit();
            const ax = student.position.x - c.v.position.x, az = student.position.z - c.v.position.z;
            const al = Math.hypot(ax, az) || 1;
            student.position.x = THREE.MathUtils.clamp(student.position.x + (ax / al) * 1.6, -46, 46);
            student.position.z = THREE.MathUtils.clamp(student.position.z + (az / al) * 1.6, -46, 46);
            if (health <= 0) { paused = true; setHurt(true); }
            break;
          }
        }
      }
      checkStations();
      renderer.render(scene, camera);
    }
    loop();

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      audio.stopAmbient();
      if (bellTimer) clearInterval(bellTimer);
      if (weather.userData.dispose) weather.userData.dispose();
      if (crowd.userData.dispose) crowd.userData.dispose();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', pd);
      const disposeMat = (m) => {
        if (!m) return;
        for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
        if (typeof m.dispose === 'function') m.dispose();
      };
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach(disposeMat);
        else if (mat) disposeMat(mat);
      });
      scene.clear();
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      api.current = {};
    };
    }
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mountRef.current) return;
      teardown = buildScene();
      setBuilding(false);
    });
    return () => { cancelled = true; cancelAnimationFrame(rafId); if (teardown) teardown(); };
  }, [levelId, runId]);

  // keep loop aware of overlay state
  useEffect(() => { api.current._setConseqRef && api.current._setConseqRef(!!conseq); }, [conseq]);
  useEffect(() => { api.current._setSummaryRef && api.current._setSummaryRef(!!summary); }, [summary]);

  const choose = (ci) => {
    const def = event.def;
    const ch = def.choices[ci];
    decisions.current.push({ isCorrect: ch.correct, co2Impact: ch.co2Impact });
    co2.current += ch.correct ? -ch.co2Impact : ch.co2Impact;
    setHud({ co2: co2.current, done: decisions.current.length });
    api.current.applyEffect && api.current.applyEffect(ch.effect, ch.correct);
    api.current.resolveStation && api.current.resolveStation();
    setConseq({
      correct: ch.correct,
      text: ch.correct
        ? L(def, 'explainRight')
        : (lang === 'ne' ? 'सबैभन्दा हरियो छनोट होइन। ' : 'Not the greenest choice. ') + L(def, 'explainRight'),
      delta: ch.correct ? -ch.co2Impact : ch.co2Impact,
    });
    setEvent(null);
  };

  const dismissConseq = () => {
    setConseq(null);
    if (decisions.current.length >= level.events.length) {
      const result = completeLevel(decisions.current);
      setSummary(result);
      // commit to the persistent valley: a sapling per correct call + CO2 saved
      recordResult(levelId, result.scorePercent, result.passed);
      addRestoration(result.correct, Math.max(0, -result.co2Delta));
    } else {
      api.current.pause && api.current.pause(false);
    }
  };

  const replay = () => { setSummary(null); setRunId((r) => r + 1); };
  const enterPhoto = () => { setPhoto(true); api.current.setPhoto && api.current.setPhoto(true); };
  const exitPhoto = () => { setPhoto(false); api.current.setPhoto && api.current.setPhoto(false); };
  const snapshot = () => {
    const url = api.current.snapshot && api.current.snapshot();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `harit-valley-${level.id}.png`; a.click();
  };
  const toggleMute = () => { const m = !muted; setMutedState(m); audio.setMuted(m); };
  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    else document.exitFullscreen && document.exitFullscreen();
  };
  const flashHit = () => { setHitFlash(true); setTimeout(() => setHitFlash(false), 260); };
  const recover = () => { setHurt(false); setRunId((r) => r + 1); };

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="compass" size={15} /> {L(level, 'name')} · {level.events.length} {lang === 'ne' ? 'चुनौती' : 'challenges'}</span>
        <h1 style={{ marginTop: 8 }}>{L(level, 'name')}</h1>
        <p>{L(level, 'blurb')} {lang === 'ne' ? 'घुम्नुहोस्, चम्किलो ठाउँमा पुग्नुहोस्, र हरियो छनोट गर्नुहोस्।' : 'Explore, reach each glowing spot, and make the greener choice.'}</p>
      </div>

      {/* level picker — switch biomes; tick marks levels you have passed */}
      <div className="level-pills">
        {EXPLORER_LEVELS.map((l) => (
          <button
            key={l.id}
            className={'level-pill' + (l.id === levelId ? ' active' : '')}
            onClick={() => { if (l.id !== levelId) { setSummary(null); setConseq(null); setEvent(null); setLevelId(l.id); } }}
          >
            {L(l, 'name')}{levelsPassed.includes(l.id) ? <Icon name="check" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginLeft: 4 }} /> : null}
          </button>
        ))}
      </div>

      {/* Bana briefing tab — simple per-level guidance + your growing valley */}
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <BanaFace size={48} />
        <div style={{ flex: 1 }}>
          <b style={{ color: 'var(--primary)' }}>{lang === 'ne' ? 'बानाको चुनौती' : "Bana's challenge"}</b>
          <div className="muted" style={{ fontWeight: 700 }}>
            {hud.done >= level.events.length
              ? (lang === 'ne' ? 'सबै चुनौती पूरा भयो — सारांश हेर्नुहोस्!' : 'All challenges done — see your summary!')
              : (lang === 'ne'
                ? `${hud.done}/${level.events.length} सकियो। चम्किलो नम्बरमा पुगेर सबैभन्दा हरियो बाटो रोज्नुहोस्।`
                : `${hud.done}/${level.events.length} done. Reach a glowing number and pick the lowest-carbon option.`)}
          </div>
          <div className="muted" style={{ fontSize: '.76rem', marginTop: 3 }}>
            <Icon name="flame" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 3 }} /> {streakDays} {lang === 'ne' ? 'दिनको शृंखला' : streakDays === 1 ? 'day streak' : 'day streak'} · <Icon name="sparkle" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 3 }} /> {upcomingFestival(lang)} {lang === 'ne' ? 'नजिकै — रूख रोपौं!' : 'coming up — plant a tree!'}
          </div>
        </div>
        <div className="chip" title={lang === 'ne' ? 'तपाईंको हरियो उपत्यका' : 'Your green valley'}>
          <Icon name="leaf" size={16} /> {valley.trees} · {Math.round(valley.clarity * 100)}%
        </div>
      </div>

      <div className="stage" ref={stageRef}>
        <div className="stage-canvas" ref={mountRef} />
        {building && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center', background: 'rgba(12,22,16,.55)', zIndex: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', border: '4px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'hp-spin 0.8s linear infinite' }} />
            <div style={{ color: '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{L(biome, 'name')}…</div>
            <style>{'@keyframes hp-spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}
        {!photo && (
          <div className="hud">
            <span className="chip"><Icon name="smog" size={16} /> CO₂ {hud.co2 >= 0 ? '+' : ''}{hud.co2.toFixed(1)} kg</span>
            <span className="chip" title={lang === 'ne' ? 'जीवन' : 'Health'}>{Array.from({ length: 4 }).map((_, k) => (<Icon key={k} name="heart" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', color: k < Math.ceil(health / 25) ? '#d96a4a' : 'var(--border-soft)' }} />))}</span>
            <div className="hud-right">
              <span className="chip"><Icon name="check" size={16} /> {hud.done}/{level.events.length}</span>
              <button className="chip" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name={muted ? 'mute' : 'sound'} size={16} /></button>
              <button className="chip" onClick={() => { camModeRef.current = (camModeRef.current + 1) % 2; setView(camModeRef.current); }} title={lang === 'ne' ? 'क्यामेरा भ्यु' : (view === 1 ? 'Follow cam' : 'Wide view')} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name={view === 1 ? 'walk' : 'compass'} size={16} /></button>
              {levelId === 8 && <button className="chip" onClick={() => api.current.boardToggle && api.current.boardToggle()} title={onBoat ? (lang === 'ne' ? 'डुङ्गाबाट निस्कनु' : 'Leave boat') : (lang === 'ne' ? 'डुङ्गा चढ्नु' : 'Ride boat')} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name="boat" size={16} /> {onBoat ? (lang === 'ne' ? 'निस्कनु' : 'Exit') : (lang === 'ne' ? 'डुङ्गा' : 'Boat')}</button>}
              <button className="chip" onClick={enterPhoto} title={lang === 'ne' ? 'फोटो मोड' : 'Photo mode'} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name="camera" size={16} /></button>
              <button className="chip" onClick={toggleFullscreen} title={lang === 'ne' ? 'फुल स्क्रिन' : 'Fullscreen'} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name="expand" size={16} /></button>
            </div>
          </div>
        )}

        {touch && !photo ? (
          <div className="dpad">
            <button className="up" onPointerDown={() => api.current.move('up', true)} onPointerUp={() => api.current.move('up', false)} onPointerLeave={() => api.current.move('up', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(90deg)' }} /></button>
            <button className="left" onPointerDown={() => api.current.move('left', true)} onPointerUp={() => api.current.move('left', false)} onPointerLeave={() => api.current.move('left', false)}><Icon name="arrowLeft" size={20} /></button>
            <button className="right" onPointerDown={() => api.current.move('right', true)} onPointerUp={() => api.current.move('right', false)} onPointerLeave={() => api.current.move('right', false)}><Icon name="arrowRight" size={20} /></button>
            <button className="down" onPointerDown={() => api.current.move('down', true)} onPointerUp={() => api.current.move('down', false)} onPointerLeave={() => api.current.move('down', false)}><Icon name="arrowRight" size={20} style={{ transform: 'rotate(90deg)' }} /></button>
            <button className="jump" onPointerDown={() => api.current.jump && api.current.jump()} title={lang === 'ne' ? 'फड्को (Space)' : 'Jump (Space)'} style={{ fontSize: 11, fontWeight: 800 }}>{lang === 'ne' ? 'फड्को' : 'JUMP'}</button>
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
            <div className="delta">{conseq.delta <= 0 ? `${conseq.delta.toFixed(2)} kg ${lang === 'ne' ? 'बचत' : 'saved'}` : `+${conseq.delta.toFixed(2)} kg`}</div>
            <div className="muted" style={{ fontWeight: 800, marginTop: 8, fontSize: '.8rem' }}>{lang === 'ne' ? 'जारी राख्न ट्याप गर्नुहोस्' : 'Tap to continue'}</div>
          </div>
        ) : null}

        {summary && !photo ? (
          <div className="event-popup fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Baloo 2', fontSize: '2rem', color: summary.passed ? 'var(--primary)' : 'var(--danger)' }}>{summary.scorePercent}%</div>
            <div style={{ fontWeight: 800 }}>{summary.correct}/{summary.total} {lang === 'ne' ? 'सही' : 'right'} · {lang === 'ne' ? 'नेट' : 'net'} {summary.co2Delta <= 0 ? '' : '+'}{summary.co2Delta} kg CO₂</div>
            <div className="bana" style={{ margin: '12px 0' }}>
              <BanaFace size={44} />
              <div className="bana-bubble">{summary.passed ? (lang === 'ne' ? `राम्रो! तपाईंले ${L(level, 'name')} लाई सास फेर्न मद्दत गर्नुभयो।` : `Ramro cha! You helped ${L(level, 'name')} breathe easier.`) : (lang === 'ne' ? 'फेरि प्रयास गरौं — हरियो छनोट खोज्नुहोस्।' : "Let's try again — look for the greener choice.")}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <button className="btn" onClick={enterPhoto}><Icon name="expand" size={18} /> {lang === 'ne' ? 'निहाल्नुहोस्' : 'Appreciate'}</button>
              <button className="btn ghost" onClick={replay}><Icon name="refresh" size={18} /> {lang === 'ne' ? 'फेरि खेल्ने' : 'Play again'}</button>
            </div>
          </div>
        ) : null}

        {photo ? (
          <>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 12, boxShadow: 'inset 0 0 130px 35px rgba(0,0,0,0.45)' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 6 }}>
              <button className="btn" onClick={snapshot}><Icon name="expand" size={16} /> {lang === 'ne' ? 'फोटो खिच्नुहोस्' : 'Snapshot'}</button>
              <button className="btn ghost" onClick={exitPhoto}>{lang === 'ne' ? 'सकियो' : 'Done'}</button>
            </div>
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', color: '#fff', fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,.6)', pointerEvents: 'none' }}>
              {lang === 'ne' ? 'तपाईंको हरियो उपत्यका — फोटो खिच्नुहोस्' : 'Your greener valley — take a snapshot'}
            </div>
          </>
        ) : null}

        {hitFlash ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,40,40,0.28)', pointerEvents: 'none', borderRadius: 12 }} /> : null}

        {hurt && !photo ? (
          <div className="event-popup fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Baloo 2', fontSize: '1.6rem', color: 'var(--danger)' }}>{lang === 'ne' ? 'होसियार, ट्राफिक!' : 'Watch the traffic!'}</div>
            <div className="bana" style={{ margin: '12px 0' }}>
              <BanaFace size={44} />
              <div className="bana-bubble">{lang === 'ne' ? 'सडक पार गर्दा होसियार हुनुहोस् — गाडीहरूबाट टाढा रहनुहोस्।' : 'Cross carefully and stay clear of vehicles. Ready to try again?'}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={recover}><Icon name="refresh" size={18} /> {lang === 'ne' ? 'फेरि सुरु' : 'Try again'}</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 10 }}>
        <span className="kbd">W A S D</span> {lang === 'ne' ? 'हिँड्न · घुमाउन तान्नुहोस्' : 'to walk · drag to look around'}
      </div>
    </div>
  );
}

/* numbered beacon sprite */
function makeNumberSprite(n) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(47,125,79,0.92)';
  x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 70px sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(1.1, 1.1, 1);
  return spr;
}

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  makeCommuter, makeTeraiHouse, makeSchool, makeTree, makeShop, makeStreetLamp, makePalm,
  makeSun, makeGreenHills, makeCloud, makeStudent, makeTrafficLight, makeTraffic,
  makeWeather, makeSignpost, animateStudent, makeTempo,
} from '../game/nepalKit.js';
import { makeSkyTexture } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import gsap from 'gsap';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';

// real one-way per-km factors from logic.js EF (kg CO2e) — never invented
const MODES = [
  { key: 'walk', en: 'Walk', ne: 'हिँड्ने', icon: 'walk', factor: 0.000, spd: 6 },
  { key: 'bicycle', en: 'Cycle', ne: 'साइकल', icon: 'bicycle', factor: 0.000, spd: 7 },
  { key: 'public_bus', en: 'School bus', ne: 'स्कुल बस', icon: 'bus', factor: 0.016, spd: 8 },
  { key: 'motorbike', en: 'Motorbike', ne: 'मोटरसाइकल', icon: 'motorbike', factor: 0.066, spd: 9 },
  { key: 'private_car', en: 'Private car', ne: 'निजी कार', icon: 'car', factor: 0.19, spd: 10 },
];
// shared gameplay constants (identical across every commute mission)
const IDLE_RATE = 0.035;
const LANES = [-1.7, 0, 1.7];
const laneX = (l) => LANES[l + 1];
const lane_of = (x) => Math.max(-1, Math.min(1, Math.round(x / 1.7)));
const FOOTPATH_X = 4.2;            // matches the right sidewalk mesh — where pedestrians walk

// Per-mission parameters: road geography, traffic light, hazards, fork, budget,
// theme. To author a new commute mission, add an entry here + a MISSIONS card.
export const MISSION_PARAMS = {
  butwal: {
    place: 'Butwal', place_ne: 'बुटवल', theme: 'terai',
    zStart: -40, zEnd: 40, roundTrip: 10, budget: 1.5,
    redTriggerZ: -30, stopLineZ: -13, greenAfter: 3.4,
    forkScoreZ: 26, forkSmoky: 0.3,
    obstacles: [
      { z: 2, lane: 0, kind: 'pothole', lethal: false },
      { z: 8, lane: -1, kind: 'tempo', lethal: true },
      { z: 13, lane: 1, kind: 'barrels', lethal: true },
      { z: 17, lane: 0, kind: 'pothole', lethal: false },
      { z: 22, lane: 0, kind: 'divider', lethal: true },   // fork: pick a side
    ],
  },

  // EASIEST — flat far-west Terai, few hazards, only the car blows the budget
  mahendranagar: {
    place: 'Mahendranagar', place_ne: 'महेन्द्रनगर', theme: 'terai',
    zStart: -38, zEnd: 38, roundTrip: 9, budget: 1.5,
    redTriggerZ: -28, stopLineZ: -12, greenAfter: 3.0,
    forkScoreZ: 24, forkSmoky: 0.22,
    obstacles: [
      { z: 4, lane: 0, kind: 'pothole', lethal: false },
      { z: 12, lane: -1, kind: 'tempo', lethal: true },
      { z: 18, lane: 0, kind: 'pothole', lethal: false },
      { z: 24, lane: 0, kind: 'divider', lethal: true },
    ],
  },

  // HARDEST — far-west hill climb, tight budget (must pick a clean ride AND the clean fork), many hazards
  dadeldhura: {
    place: 'Dadeldhura', place_ne: 'डडेल्धुरा', theme: 'hill',
    zStart: -44, zEnd: 44, roundTrip: 11, budget: 1.0,
    redTriggerZ: -34, stopLineZ: -14, greenAfter: 3.8,
    forkScoreZ: 28, forkSmoky: 0.5,
    obstacles: [
      { z: 2, lane: 1, kind: 'pothole', lethal: false },
      { z: 7, lane: -1, kind: 'tempo', lethal: true },
      { z: 12, lane: 1, kind: 'barrels', lethal: true },
      { z: 16, lane: 0, kind: 'pothole', lethal: false },
      { z: 20, lane: -1, kind: 'tempo', lethal: true },
      { z: 25, lane: 1, kind: 'barrels', lethal: true },
      { z: 30, lane: 0, kind: 'divider', lethal: true },
    ],
  },
};

export default function CommuteMission({ missionId = 'butwal', onWin, onMap }) {
  const P = MISSION_PARAMS[missionId] || MISSION_PARAMS.butwal;
  // shadow the per-mission values as locals so the loop/JSX read them unchanged
  const { zStart: Z_START, zEnd: Z_END, redTriggerZ: RED_TRIGGER_Z, stopLineZ: STOP_LINE_Z,
    greenAfter: GREEN_AFTER, forkScoreZ: FORK_SCORE_Z, forkSmoky: FORK_SMOKY, budget: BUDGET,
    roundTrip: ROUND_TRIP, obstacles: OBSTACLES, place: PLACE, place_ne: PLACE_NE, theme: THEME } = P;
  const ROAD_LEN = Z_END - Z_START;
  const perUnit = (f) => (f * ROUND_TRIP) / ROAD_LEN;

  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o, k) => (lang === 'ne' && o[`${k}_ne`] !== undefined ? o[`${k}_ne`] : o[k]);

  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const activeRef = useGameActiveRef();
  const api = useRef({});
  const addRestoration = useGameStore((s) => s.addRestoration);
  const addEcoPoints = useGameStore((s) => s.addEcoPoints);

  const [phase, setPhase] = useState('choose');   // choose | riding | result
  const [mode, setMode] = useState(null);
  const [carbon, setCarbon] = useState(0);
  const [banaMsg, setBanaMsg] = useState('start');
  const [enginePrompt, setEnginePrompt] = useState(false);
  const [result, setResult] = useState(null);      // { kind:'win'|'crash'|'smog', total, reason }
  const [muted, setMutedState] = useState(false);

  const phaseRef = useRef('choose');
  const brakeRef = useRef(false);
  const targetLaneRef = useRef(0);
  const engineOffRef = useRef(false);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const walkRef = useRef(false);   // walking = on the footpath, no lane steering
  const steer = (d) => { if (walkRef.current) return; targetLaneRef.current = Math.max(-1, Math.min(1, targetLaneRef.current + d)); };
  const setBrake = (b) => { brakeRef.current = b; };

  // BANA dialogue (keyed so it stays language-reactive)
  const BANA = {
    start: tt('Off to school! Steer with ◄ ►, brake with the middle button.', 'विद्यालय जाने! ◄ ► ले मोड्नुहोस्, बीचको बटनले ब्रेक।'),
    redlight: tt('RED LIGHT! Brake before the line — traffic is crossing!', 'रातो बत्ती! रेखाअघि ब्रेक — गाडी क्रस गर्दैछ!'),
    go: tt('Green! Go — watch the road ahead.', 'हरियो! जानुहोस् — अगाडि ध्यान दिनुहोस्।'),
    obstacles: tt('Potholes and a parked tempo — steer around them!', 'खाल्डा र रोकिएको टेम्पो — छल्नुहोस्!'),
    pothole: tt('Ouch — a pothole! Slow down a moment.', 'आइया — खाल्डो! बिस्तारै।'),
    fork: tt('Fork: LEFT is the smoky shortcut, RIGHT is the clean river path.', 'दोबाटो: देब्रे धुवाँवाला छोटो बाटो, दाहिने सफा नदी बाटो।'),
    smoky: tt('The brick-kiln smoke is adding carbon…', 'इँटाभट्टाको धुवाँले कार्बन थप्दैछ…'),
    clean: tt('Clean route — lovely choice!', 'सफा बाटो — राम्रो छनोट!'),
    school: tt('Almost there — keep your carbon down!', 'पुग्नै लाग्यो — कार्बन कम राख्नुहोस्!'),
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 560;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyClear = new THREE.Color(0x8fcabf);
    const skySmog = new THREE.Color(0xcdb98a);
    const sky = skyClear.clone();
    scene.background = makeSkyTexture(sky.getHex());
    scene.fog = new THREE.Fog(sky.clone(), 70, 230);

    const camera = new THREE.PerspectiveCamera(56, W / H, 0.1, 600);
    camera.position.set(0, 6, Z_START - 9);
    camera.lookAt(0, 1, Z_START);

    scene.add(new THREE.HemisphereLight(0xdaf0fb, 0x6b5a3e, 0.88));
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.1);
    sun.position.set(-40, 70, -30); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60; sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x97bd57, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // road (3 lanes) + sidewalks + cross street + zebra
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 1 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6.2, ROAD_LEN + 24), roadMat);
    road.rotation.x = -Math.PI / 2; road.position.y = 0.02; road.receiveShadow = true; scene.add(road);
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xbfb6a6, roughness: 1 });
    for (const x of [-4.2, 4.2]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.8, ROAD_LEN + 24), walkMat); sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.015, 0); sw.receiveShadow = true; scene.add(sw); }
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(90, 5), roadMat); cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.02, -8); cross.receiveShadow = true; scene.add(cross);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xe8e2c8, roughness: 1 });
    for (const lx of [-0.85, 0.85]) for (let z = Z_START; z <= Z_END; z += 3) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.3), dashMat); d.rotation.x = -Math.PI / 2; d.position.set(lx, 0.03, z); scene.add(d); }
    for (let k = 0; k < 6; k++) { const zb = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5), dashMat); zb.rotation.x = -Math.PI / 2; zb.position.set((k - 2.5) * 0.55, 0.03, STOP_LINE_Z + 0.7); scene.add(zb); }

    const add = (o, x, z, ry = 0, s = 1) => { o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; };

    // home, school, signs
    add(makeTeraiHouse(2), 7, Z_START - 1, -Math.PI / 2);
    add(makeSignpost(), 3.2, Z_START + 2, 0);
    add(makeSchool(), 7.5, Z_END - 1, -Math.PI / 2, 1.3);
    // line the Butwal avenue: flat-roof pucca houses, shops, palms + leafy trees
    const shopCols = [0xc98a4b, 0x4f9d8a, 0xc25b5b, 0xd6a93c];
    for (let z = Z_START + 4; z <= Z_END - 4; z += 7) {
      if (Math.abs(z + 8) < 4) continue;
      add(makeTeraiHouse(1 + Math.floor(Math.random() * 2)), -7 - Math.random() * 1.4, z, Math.PI / 2);
      if (Math.random() < 0.55) add(makeShop(shopCols[Math.floor(Math.random() * shopCols.length)]), 7 + Math.random() * 1.4, z + 3, -Math.PI / 2);
      add((Math.random() < 0.5 ? makePalm(1) : makeTree(0.9 + Math.random() * 0.5)), 4.7, z, 0);
      add((Math.random() < 0.5 ? makePalm(1) : makeTree(0.9 + Math.random() * 0.5)), -4.7, z + 3, 0);
      if (z % 14 === 0) { add(makeStreetLamp(), 4.4, z); add(makeStreetLamp(), -4.4, z + 7, Math.PI); }
    }
    for (let i = 0; i < 6; i++) { add(makeStudent(), (Math.random() < 0.5 ? -4.3 : 4.3), Z_START + 8 + i * 12, Math.random() * 6); }

    // backdrop
    scene.add(makeGreenHills({ count: 13, radius: 150, height: 30 }));
    const sg = makeSun(); sg.position.set(-46, 60, 60); scene.add(sg);
    const clouds = [];
    for (let i = 0; i < 6; i++) { const c = makeCloud(); c.position.set((Math.random() - 0.5) * 120, 24 + Math.random() * 10, (Math.random() - 0.5) * 120); c.scale.setScalar(1.5 + Math.random() * 1.2); scene.add(c); clouds.push({ m: c, s: 0.4 + Math.random() * 0.6 }); }

    // junction light (faces the rider) + cross traffic
    const lightA = makeTrafficLight(); lightA.position.set(3.1, 0, STOP_LINE_Z - 0.6); lightA.rotation.y = Math.PI; scene.add(lightA); lightA.userData.set('green');
    const crossTraffic = makeTraffic(scene, [
      { points: [new THREE.Vector3(-44, 0, -8.8), new THREE.Vector3(44, 0, -8.8)] },
      { points: [new THREE.Vector3(44, 0, -7.2), new THREE.Vector3(-44, 0, -7.2)] },
    ], 2);

    // ── obstacles ─────────────────────────────────────────────────────
    const obstacleObjs = OBSTACLES.map((o) => {
      let g;
      if (o.kind === 'pothole') {
        g = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 1 }));
        g.rotation.x = -Math.PI / 2; g.position.set(laneX(o.lane), 0.035, o.z);
      } else if (o.kind === 'tempo') {
        g = makeTempo(); g.rotation.y = -Math.PI / 2; g.position.set(laneX(o.lane), 0, o.z);
      } else if (o.kind === 'barrels') {
        g = new THREE.Group();
        for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8732b : 0xeee2c8, roughness: 0.8, flatShading: true })); b.position.set((i - 1) * 0.45, 0.4, (i % 2) * 0.3); g.add(b); }
        g.position.set(laneX(o.lane), 0, o.z);
      } else { // divider island
        g = new THREE.Group();
        const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 4.5), new THREE.MeshStandardMaterial({ color: 0xb9b3a4, roughness: 1 })); slab.position.y = 0.15; g.add(slab);
        const k1 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xe8732b, flatShading: true })); k1.position.set(0, 0.65, -1.6); g.add(k1);
        const k2 = k1.clone(); k2.position.z = 1.6; g.add(k2);
        g.position.set(laneX(o.lane), 0, o.z);
      }
      g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(g);
      return { ...o, mesh: g, hit: false };
    });

    // brick kiln on the LEFT of the fork (smoky shortcut) + clean strip on the RIGHT
    const kiln = new THREE.Group();
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 6.5, 12), new THREE.MeshStandardMaterial({ color: 0x9c4a32, roughness: 1, flatShading: true })); stack.position.y = 3.25; kiln.add(stack);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), new THREE.MeshStandardMaterial({ color: 0x7c3a28, roughness: 1, flatShading: true })); base.position.y = 1; kiln.add(base);
    add(kiln, -7.5, 26, 0);
    const kilnSmoke = [];
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.7, 7, 6), new THREE.MeshStandardMaterial({ color: 0x55504a, transparent: true, opacity: 0.6, roughness: 1 })); p.position.set(-7.5, 6.5 + i * 1.0, 26); scene.add(p); kilnSmoke.push({ m: p, base: 6.5 + i * 1.0 }); }
    for (let i = 0; i < 4; i++) add(makeTree(1.1 + Math.random() * 0.4), 6.5, 22 + i * 2, 0);  // clean side greenery
    const river = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 14), new THREE.MeshStandardMaterial({ color: 0x57b6dd, transparent: true, opacity: 0.85, roughness: 0.3 })); river.rotation.x = -Math.PI / 2; river.position.set(8.2, 0.02, 25); scene.add(river);

    const weather = makeWeather('clear'); scene.add(weather);

    // ── rider + journey state ─────────────────────────────────────────
    let commuter = null, factor = 0, exhaust = 0, speed = 9;
    let carbonV = 0, slowTimer = 0, ended = false;
    let redActive = false, redDone = false, redTimer = 0, forkScored = false, obstHint = false, schoolHint = false;
    const puffs = [];

    const resetState = () => {
      carbonV = 0; slowTimer = 0; ended = false;
      redActive = false; redDone = false; redTimer = 0; forkScored = false; obstHint = false; schoolHint = false;
      brakeRef.current = false; targetLaneRef.current = 0; engineOffRef.current = false;
      obstacleObjs.forEach((o) => { o.hit = true; });   // disabled until start re-enables
      sky.copy(skyClear); scene.background = sky; if (scene.fog) scene.fog.color = sky; sun.intensity = 2.1;
      lightA.userData.set('green'); setEnginePrompt(false);
    };

    api.current.start = (m) => {
      if (commuter) scene.remove(commuter);
      commuter = makeCommuter(m.key);
      walkRef.current = (m.key === 'walk');
      commuter.position.set(walkRef.current ? FOOTPATH_X : 0, 0, Z_START);
      targetLaneRef.current = 0;
      scene.add(commuter);
      factor = m.factor; exhaust = commuter.userData.exhaust || 0; speed = m.spd;
      resetState();
      obstacleObjs.forEach((o) => { o.hit = false; });   // arm hazards
      setBanaMsg('start');
    };
    api.current.reset = () => {
      if (commuter) { scene.remove(commuter); commuter = null; }
      resetState(); setCarbon(0);
    };

    const endMission = (kind, reason) => {
      if (ended) return; ended = true;
      if (kind === 'crash') { gsap.to(camera.position, { x: '+=0.7', duration: 0.05, yoyo: true, repeat: 6 }); audio.play('thud'); }
      else if (kind === 'smog') audio.play('thud');
      else { audio.play('restore'); addRestoration(3, Math.max(0, BUDGET - carbonV)); addEcoPoints(25); onWin && onWin(); }
      setCarbon(+carbonV.toFixed(3));
      setResult({ kind, total: +carbonV.toFixed(2), reason });
      setPhase('result');
    };

    function spawnPuff(x, y, z) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshStandardMaterial({ color: 0x6b6b6b, transparent: true, opacity: 0.55, roughness: 1 }));
      p.position.set(x, y, z); scene.add(p); puffs.push({ m: p, life: 0 });
    }

    const clock = new THREE.Clock();
    let raf = 0, puffT = 0, throttle = 0;
    function frame() {
      raf = requestAnimationFrame(frame);
      let dt = Math.min(clock.getDelta(), 0.05); if (!activeRef.current) dt = 0;
      const t = clock.elapsedTime;
      clouds.forEach((c) => { c.m.position.x += c.s * dt; if (c.m.position.x > 70) c.m.position.x = -70; });
      kilnSmoke.forEach((s, i) => { s.m.position.y += dt * 0.5; s.m.material.opacity = 0.6 - ((s.m.position.y - s.base) / 5) * 0.5; if (s.m.position.y > s.base + 5) { s.m.position.y = s.base; s.m.material.opacity = 0.6; } });
      weather.userData.update(dt, commuter ? commuter.position : camera.position);

      if (commuter && phaseRef.current === 'riding' && !ended) {
        const motor = exhaust > 0;
        // steering: lerp toward the target lane (or the fixed footpath when walking)
        const tx = walkRef.current ? FOOTPATH_X : laneX(targetLaneRef.current);
        commuter.position.x += (tx - commuter.position.x) * Math.min(1, dt * 9);

        // red-light state machine
        if (!redDone) {
          if (!redActive && commuter.position.z >= RED_TRIGGER_Z) { redActive = true; redTimer = 0; lightA.userData.set('red'); setBanaMsg('redlight'); if (motor) setEnginePrompt(true); }
          if (redActive) {
            redTimer += dt; crossTraffic.update(dt);
            if (!walkRef.current && commuter.position.z > STOP_LINE_Z) { endMission('crash', 'redlight'); }
            if (redTimer > GREEN_AFTER) { redActive = false; redDone = true; lightA.userData.set('green'); setEnginePrompt(false); setBanaMsg('go'); }
          } else { crossTraffic.update(0); }
        } else { crossTraffic.update(0); }

        // forward motion (auto unless braking)
        const v = brakeRef.current ? 0 : speed * (slowTimer > 0 ? 0.4 : 1);
        if (v > 0) {
          const step = v * dt;
          commuter.position.z += step;
          if (motor) carbonV += perUnit(factor) * step;
          (commuter.userData.wheels || []).forEach((w) => { w.rotation.x -= step * 1.4; });
          if (commuter.userData.walk) animateStudent(commuter.userData.student, true, t);
          else commuter.position.y = Math.sin(t * 10) * 0.02;
          if (motor) { puffT += dt; if (puffT > 0.12) { puffT = 0; spawnPuff(commuter.position.x + (Math.random() - 0.5) * 0.3, 0.5, commuter.position.z - 1.0); } }
        }
        if (slowTimer > 0) slowTimer -= dt;
        // idling at the red light with engine on
        if (redActive && v === 0 && motor && !engineOffRef.current) { carbonV += IDLE_RATE * dt; puffT += dt; if (puffT > 0.18) { puffT = 0; spawnPuff(commuter.position.x + (Math.random() - 0.5) * 0.3, 0.5, commuter.position.z - 1.0); } }

        // hints by zone
        if (!walkRef.current && !obstHint && commuter.position.z > -2) { obstHint = true; setBanaMsg('obstacles'); }
        if (!walkRef.current && commuter.position.z > 17 && commuter.position.z < 21 && banaMsgKeyRef.current !== 'fork') setBanaMsg('fork');
        if (!schoolHint && commuter.position.z > 30) { schoolHint = true; setBanaMsg('school'); }

        // road challenges apply to vehicles only — a pedestrian on the footpath is clear of them
        if (!walkRef.current) {
          const myLane = lane_of(commuter.position.x);
          for (const o of obstacleObjs) {
            if (o.hit) continue;
            if (Math.abs(commuter.position.z - o.z) < 1.25 && myLane === o.lane) {
              o.hit = true;
              if (o.lethal) { endMission('crash', o.kind === 'divider' ? 'divider' : 'obstacle'); break; }
              else { carbonV += 0.03; slowTimer = 0.8; audio.play('thud'); setBanaMsg('pothole'); }
            }
          }
          if (!forkScored && commuter.position.z >= FORK_SCORE_Z) { forkScored = true; if (myLane === -1) { carbonV += FORK_SMOKY; setBanaMsg('smoky'); } else setBanaMsg('clean'); }
        }

        // sky + meter
        const hz = Math.min(1, carbonV / (BUDGET * 1.1));
        sky.copy(skyClear).lerp(skySmog, hz); scene.background = sky; if (scene.fog) scene.fog.color = sky; sun.intensity = 2.1 - hz * 0.9;
        throttle += dt; if (throttle > 0.08) { throttle = 0; setCarbon(+carbonV.toFixed(3)); }

        // arrival
        if (commuter.position.z >= Z_END) {
          if (carbonV > BUDGET) endMission('smog');
          else endMission('win');
        }
      }

      // camera follow
      if (commuter) {
        const want = new THREE.Vector3(commuter.position.x * 0.6, 5.0, commuter.position.z - 8.5);
        camera.position.lerp(want, 0.12);
        camera.lookAt(commuter.position.x * 0.55, 1.1, commuter.position.z + 4);
      }
      // puffs
      for (let i = puffs.length - 1; i >= 0; i--) { const pf = puffs[i]; pf.life += dt; pf.m.position.y += dt * 0.6; pf.m.position.x += dt * 0.2; pf.m.scale.multiplyScalar(1 + dt * 1.2); pf.m.material.opacity = Math.max(0, 0.55 - pf.life * 0.45); if (pf.life > 1.3) { scene.remove(pf.m); pf.m.geometry.dispose(); pf.m.material.dispose(); puffs.splice(i, 1); } }

      renderer.render(scene, camera);
    }
    frame();

    // controls
    const onKey = (e, down) => {
      if (e.repeat && down) { if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Space') e.preventDefault(); return; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (down) steer(1); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (down) steer(-1); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Space') { brakeRef.current = down; e.preventDefault(); }
    };
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    const onFs = () => setTimeout(onResize, 80);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
      audio.stopAmbient();
      if (weather.userData.dispose) weather.userData.dispose();
      const disposeMat = (m) => { if (!m) return; for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); };
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const mat = o.material; if (Array.isArray(mat)) mat.forEach(disposeMat); else if (mat) disposeMat(mat); });
      scene.clear();
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [missionId]);

  // keep latest banaMsg readable inside the loop (avoid stale spam)
  const banaMsgKeyRef = useRef('start');
  useEffect(() => { banaMsgKeyRef.current = banaMsg; }, [banaMsg]);

  // actions
  const choose = (m) => {
    audio.init(); setMode(m); api.current._mode = m.key;
    api.current.start && api.current.start(m);
    setCarbon(0); setResult(null); setBanaMsg('start'); setPhase('riding');
    audio.setAmbient({ weather: 'clear', clarity: 0.6 });
  };
  const retry = () => { api.current.reset && api.current.reset(); setResult(null); setMode(null); setCarbon(0); setPhase('choose'); };
  const switchOffEngine = () => { engineOffRef.current = true; setEnginePrompt(false); audio.play('sparkle'); };
  const toggleMute = () => { const mm = !muted; setMutedState(mm); audio.setMuted(mm); };
  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };

  const meterMax = BUDGET * 1.4;
  const fillPct = Math.min(100, (carbon / meterMax) * 100);
  const budgetPct = (BUDGET / meterMax) * 100;
  const over = carbon > BUDGET;
  const fillColor = carbon > BUDGET ? '#e23b3b' : carbon > BUDGET * 0.7 ? '#f2c14e' : '#37c46a';

  const btn = { width: 64, height: 64, borderRadius: 16, border: 'none', background: 'rgba(20,40,28,.82)', color: '#fff', fontSize: '1.5rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };

  const failTitle = result && (result.kind === 'crash'
    ? tt('Mission Failed!', 'मिसन असफल!')
    : result.kind === 'smog' ? tt('Too much pollution!', 'धेरै प्रदूषण!') : tt('You reached school!', 'विद्यालय पुग्नुभयो!'));

  const failBody = result && (() => {
    if (result.kind === 'crash') {
      const r = result.reason === 'redlight' ? tt('You ran the red light into crossing traffic.', 'रातो बत्तीमा क्रस गर्ने गाडीसँग ठोक्किनुभयो।')
        : result.reason === 'divider' ? tt('You hit the road divider at the fork.', 'दोबाटोको डिभाइडरमा ठोक्किनुभयो।')
          : tt('You crashed into an obstacle on the road.', 'बाटोको अवरोधमा ठोक्किनुभयो।');
      return r + ' ' + tt('Brake and steer carefully — try again.', 'ध्यानसँग ब्रेक र मोड्नुहोस् — फेरि प्रयास।');
    }
    if (result.kind === 'smog') return tt(`You reached school, but at ${result.total} kg you blew the ${BUDGET} kg budget — the smog caught up. A cleaner ride keeps you going.`, `विद्यालय पुग्नुभयो, तर ${result.total} किलोले ${BUDGET} बजेट नाघ्यो — धुवाँले भेट्यो। सफा सवारीले बचाउँछ।`);
    return tt(`A clean ${result.total} kg — under the ${BUDGET} budget. Your valley breathes easier!`, `सफा ${result.total} किलो — ${BUDGET} बजेटभित्र। तपाईंको उपत्यका सफा भयो!`);
  })();

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="compass" size={15} /> {tt(`${PLACE} · School Commute`, `${PLACE_NE} · विद्यालय यात्रा`)}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Drive to school — survive the road, beat the carbon', 'विद्यालय पुग्नुहोस् — बाटो छल्नुहोस्, कार्बन घटाउनुहोस्')}</h1>
        <p>{tt(`Bana guides you. Pick your ride, then steer, brake and choose your way. Crash or blow the ${BUDGET} kg budget and the mission fails.`, `बानाले मार्गदर्शन गर्छ। सवारी रोज्नुहोस्, अनि मोड्नुहोस्, ब्रेक गर्नुहोस्। ठोक्किए वा ${BUDGET} किलो बजेट नाघे मिसन असफल।`)}</p>
      </div>

      <div className="stage" ref={stageRef} style={{ position: 'relative' }}>
        <div className="stage-canvas" ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* carbon meter */}
        {phase !== 'choose' && (
          <div style={{ position: 'absolute', left: 14, top: 14, bottom: 14, width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
            <div style={{ fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.6)', fontSize: '.8rem', textAlign: 'center' }}>{carbon.toFixed(2)}<br /><span style={{ fontSize: '.62rem', opacity: .85 }}>kg CO₂</span></div>
            <div style={{ position: 'relative', flex: 1, width: 26, background: 'rgba(255,255,255,.25)', borderRadius: 13, overflow: 'hidden', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fillPct}%`, background: `linear-gradient(${fillColor}, ${fillColor}cc)`, transition: 'height .2s linear, background .4s' }} />
              <div style={{ position: 'absolute', bottom: `${budgetPct}%`, left: -3, right: -3, height: 2, background: '#fff', boxShadow: '0 0 3px #000' }} />
            </div>
            <div style={{ fontSize: '.6rem', color: over ? '#ffd2d2' : '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{tt('budget', 'बजेट')} {BUDGET}</div>
          </div>
        )}

        {/* controls (mute + fullscreen) — always available */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8, zIndex: 6 }}>
          <button className="chip" onClick={toggleMute} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name={muted ? 'mute' : 'sound'} size={16} /></button>
          <button className="chip" onClick={toggleFullscreen} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name="expand" size={16} /> {tt('Fullscreen', 'पूर्ण स्क्रिन')}</button>
        </div>

        {/* Bana guide bubble (persistent while riding) */}
        {phase === 'riding' && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', maxWidth: '74%', display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(20,40,28,.78)', color: '#fff', padding: '8px 14px', borderRadius: 18 }}>
            <BanaFace size={30} />
            <span style={{ fontWeight: 700, fontSize: '.82rem' }}>{BANA[banaMsg] || BANA.start}</span>
          </div>
        )}

        {/* engine-off (optional, while idling at red) */}
        {enginePrompt && (
          <div className="fade-in" style={{ position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(20,40,28,.85)', color: '#fff', padding: '8px 12px', borderRadius: 14, zIndex: 5 }}>
            <span style={{ fontWeight: 800, fontSize: '.8rem' }}><Icon name="warning" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {tt('Idling burns fuel', 'चालू इन्जिनले इन्धन खान्छ')}</span>
            <button className="btn" onClick={switchOffEngine} style={{ whiteSpace: 'nowrap' }}><Icon name="bolt" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {tt('Engine off', 'इन्जिन बन्द')}</button>
          </div>
        )}

        {/* on-screen drive controls */}
        {phase === 'riding' && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 14, zIndex: 5 }}>
            <button style={btn} onPointerDown={(e) => { e.preventDefault(); steer(1); }}>◄</button>
            <button style={{ ...btn, background: 'rgba(120,40,28,.85)' }} onPointerDown={(e) => { e.preventDefault(); setBrake(true); }} onPointerUp={() => setBrake(false)} onPointerLeave={() => setBrake(false)}><Icon name="stop" size={18} /></button>
            <button style={btn} onPointerDown={(e) => { e.preventDefault(); steer(-1); }}>►</button>
          </div>
        )}

        {/* CHOOSE overlay */}
        {phase === 'choose' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(12,22,16,.55)', backdropFilter: 'blur(2px)', padding: 16 }}>
            <div className="bana" style={{ marginBottom: 14 }}>
              <BanaFace size={48} />
              <div className="bana-bubble">{tt(`Namaste! Welcome to ${PLACE}. It\u2019s about 5 km to school. Pick your ride — greener is cleaner, then drive carefully!`, `नमस्ते! ${PLACE_NE}मा स्वागत छ। विद्यालय करिब ५ कि.मि.। सवारी रोज्नुहोस् — हरियो सफा, अनि ध्यानसँग चलाउनुहोस्!`)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 620 }}>
              {MODES.map((m) => (
                <button key={m.key} className="card" onClick={() => choose(m)} style={{ cursor: 'pointer', width: 112, padding: '14px 8px', textAlign: 'center', border: '2px solid transparent' }}>
                  <div style={{ color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><Icon name={m.icon} size={30} /></div>
                  <div style={{ fontWeight: 800 }}>{L(m, 'en')}</div>
                  <div className="muted" style={{ fontSize: '.72rem', fontWeight: 700 }}>{m.factor === 0 ? tt('0 — clean!', '० — सफा!') : `${m.factor} kg/km`}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RESULT overlay (win / crash / smog) */}
        {phase === 'result' && result && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(12,22,16,.55)', backdropFilter: 'blur(6px)', padding: 16 }}>
            <div className="event-popup fade-in" style={{ textAlign: 'center', maxWidth: 460 }}>
              <div style={{ fontFamily: 'Baloo 2', fontSize: '2rem', color: result.kind === 'win' ? 'var(--primary)' : 'var(--danger)' }}>{failTitle}</div>
              {result.kind !== 'crash' && (
                <div style={{ fontFamily: 'Baloo 2', fontSize: '2.4rem', color: result.kind === 'win' ? 'var(--primary)' : 'var(--danger)' }}>{result.total.toFixed(2)} kg</div>
              )}
              <div className="bana" style={{ margin: '10px 0' }}>
                <BanaFace size={40} mood={result.kind === 'win' ? 'happy' : 'sad'} />
                <div className="bana-bubble">{failBody}</div>
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                {result.kind === 'win' ? (
                <button className="btn" onClick={onMap}>{tt('Continue', 'जारी राख्नुहोस्')}</button>
              ) : (
                <>
                  <button className="btn" onClick={retry}><Icon name="refresh" size={18} /> {tt('Try again', 'फेरि प्रयास')}</button>
                  <button className="btn" onClick={onMap} style={{ background: '#eef3ee', color: '#1c3326' }}>{tt('Back to map', 'नक्सामा फर्कनुहोस्')}</button>
                </>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 10 }}>
        {tt('◄ ► steer · middle button brakes · arrow keys / A-D / Space also work. Stop before the red light!', '◄ ► मोड्न · बीचको बटन ब्रेक · arrow keys / A-D / Space पनि। रातो बत्तीअघि रोक्नुहोस्!')}
      </div>
    </div>
  );
}

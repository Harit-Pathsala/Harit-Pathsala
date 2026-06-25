import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  makeSchool, makeStudent, animateStudent, makeConifer, makeGreenHills, makeCloud, makeSun,
  makeSignpost, makePrayerFlags, makePump, makeHangingBulb, makeCeilingFan, makeDeskComputer, makeWallAC, makeTree,
} from '../game/nepalKit.js';
import { makeSkyTexture } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';

const SPEED = 6.2;
const BOUND = 15;
const REACH = 2.5;
const TIME = 60;            // seconds
const CARBON_CAP = 4.0;     // school wiring overloads -> blackout fail
const BUDGET = 1.5;         // "green rating" marker on the meter

// each leak: kind drives the model + a relative power draw (kg CO2 / sec, grid 0.12)
const DEVICE = {
  light: { draw: 0.008, en: 'Light', ne: 'बत्ती' },
  fan: { draw: 0.012, en: 'Fan', ne: 'पङ्खा' },
  computer: { draw: 0.025, en: 'Computer', ne: 'कम्प्युटर' },
  pump: { draw: 0.040, en: 'Water pump', ne: 'पानी पम्प' },
  ac: { draw: 0.060, en: 'Air-con', ne: 'एसी' },
};
const LEAKS = [
  { kind: 'light', x: -8, z: -7, y: 2.7 },
  { kind: 'light', x: -5, z: -7, y: 2.7 },
  { kind: 'fan', x: -8, z: -8.6, y: 3.0 },
  { kind: 'fan', x: -5, z: -8.6, y: 3.0 },
  { kind: 'computer', x: 8, z: -3, y: 0 },
  { kind: 'computer', x: 10, z: -3, y: 0 },
  { kind: 'pump', x: -10, z: 5, y: 0 },
  { kind: 'ac', x: 2, z: -12.2, y: 2.6 },
];

export default function PowerPatrolMission({ onWin, onMap }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const activeRef = useGameActiveRef();
  const api = useRef({});
  const addRestoration = useGameStore((s) => s.addRestoration);
  const addEcoPoints = useGameStore((s) => s.addEcoPoints);

  const [phase, setPhase] = useState('brief');     // brief | patrol | result
  const [carbon, setCarbon] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [remaining, setRemaining] = useState(LEAKS.length);
  const [nearName, setNearName] = useState(null);
  const [result, setResult] = useState(null);      // { kind:'win'|'timeout'|'overload', total }
  const [muted, setMutedState] = useState(false);

  const phaseRef = useRef('brief');
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 560;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyDay = new THREE.Color(0x8fcabf);
    const skyDark = new THREE.Color(0x10131c);
    scene.background = makeSkyTexture(skyDay.getHex());
    scene.fog = new THREE.Fog(skyDay.clone(), 60, 200);

    const camera = new THREE.PerspectiveCamera(54, W / H, 0.1, 600);
    camera.position.set(0, 13, 24); camera.lookAt(0, 1, 6);

    const hemi = new THREE.HemisphereLight(0xdaf0fb, 0x5a6e44, 0.88); scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.3); scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.0);
    sun.position.set(-30, 60, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.far = 160;
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x86a854, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // courtyard slab
    const court = new THREE.Mesh(new THREE.PlaneGeometry(30, 28), new THREE.MeshStandardMaterial({ color: 0xc7bfae, roughness: 1 }));
    court.rotation.x = -Math.PI / 2; court.position.set(0, 0.01, -2); court.receiveShadow = true; scene.add(court);

    const add = (o, x, z, ry = 0, s = 1) => { o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; };

    // hilltop dressing: school building (Tansen sits on a ridge), pine forest, hills, flags
    add(makeSchool(), 0, -15, 0, 1.5);
    add(makeSignpost(), 11, 11, -0.3);
    scene.add(makeGreenHills({ count: 14, radius: 145, height: 34 }));
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = 26 + Math.random() * 18; add(makeConifer(1 + Math.random() * 0.9), Math.cos(a) * r, Math.sin(a) * r - 4); }
    for (let i = 0; i < 4; i++) add(makeTree(1.1), (Math.random() < 0.5 ? -13 : 13), 2 + i * 4);
    for (let i = 0; i < 3; i++) { const fl = makePrayerFlags(9, 1.2); add(fl, -10 + i * 10, -16, 0.2); fl.position.y = 3.2; }
    const clouds = [];
    for (let i = 0; i < 5; i++) { const c = makeCloud(); c.position.set((Math.random() - 0.5) * 110, 26 + Math.random() * 8, (Math.random() - 0.5) * 110); c.scale.setScalar(1.5 + Math.random()); scene.add(c); clouds.push({ m: c, s: 0.3 + Math.random() * 0.5 }); }
    const sg = makeSun(); sg.position.set(-40, 55, 55); scene.add(sg);

    // a verandah shelter (roof on posts) over the fans/lights
    const shelter = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 5.5), new THREE.MeshStandardMaterial({ color: 0xb24a32, roughness: 1, flatShading: true })); roof.position.y = 3.4; shelter.add(roof);
    for (const px of [-3.6, 3.6]) for (const pz of [-2.4, 2.4]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 7), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: true })); post.position.set(px, 1.7, pz); shelter.add(post); }
    add(shelter, -6.5, -7.6, 0);

    // ── leaks ──────────────────────────────────────────────────────────
    const makers = { light: makeHangingBulb, fan: makeCeilingFan, computer: makeDeskComputer, pump: makePump, ac: makeWallAC };
    const leaks = LEAKS.map((d) => {
      const obj = makers[d.kind]();
      if (!obj.userData || typeof obj.userData.setOn !== 'function') obj.userData = Object.assign(obj.userData || {}, { setOn: () => {} });
      obj.position.set(d.x, d.y, d.z);
      if (d.kind === 'ac') obj.rotation.y = 0;
      obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(obj);
      // floating "on" indicator
      const ind = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffe14a, emissiveIntensity: 1 }));
      ind.position.set(d.x, (d.kind === 'computer' || d.kind === 'pump') ? 2.0 : d.y + 0.9, d.z);
      scene.add(ind);
      return { ...d, obj, on: true, draw: DEVICE[d.kind].draw, ind };
    });

    // ── player ─────────────────────────────────────────────────────────
    const student = makeStudent(); student.position.set(0, 0, 10); scene.add(student);

    let carbonV = 0, timer = TIME, ended = false, rem = leaks.length;
    const resetMission = () => {
      carbonV = 0; timer = TIME; ended = false; rem = leaks.length;
      leaks.forEach((lk) => { lk.on = true; lk.obj.userData.setOn(true); if (lk.obj.userData.update) lk.obj.userData.on = true; lk.ind.visible = true; });
      student.position.set(0, 0, 10); student.rotation.y = Math.PI;
      moveRef.current = { up: false, down: false, left: false, right: false };
      scene.background = skyDay; if (scene.fog) scene.fog.color = skyDay; hemi.intensity = 0.7; sun.intensity = 2.0; amb.intensity = 0.3;
      setCarbon(0); setTimeLeft(TIME); setRemaining(rem); setNearName(null);
    };
    api.current.start = () => { resetMission(); };
    api.current.reset = () => { resetMission(); };

    const endMission = (kind) => {
      if (ended) return; ended = true;
      if (kind === 'win') { audio.play('restore'); addRestoration(3, Math.max(0, BUDGET - carbonV)); addEcoPoints(25); onWin && onWin(); }
      else { audio.play('thud'); scene.background = skyDark; if (scene.fog) scene.fog.color = skyDark; hemi.intensity = 0.15; sun.intensity = 0.3; amb.intensity = 0.1; leaks.forEach((lk) => { lk.obj.userData.setOn(false); lk.ind.visible = false; }); }
      setCarbon(+carbonV.toFixed(2));
      setResult({ kind, total: +carbonV.toFixed(2) });
      setPhase('result');
    };

    const doInteract = () => {
      if (phaseRef.current !== 'patrol' || ended) return;
      let best = null, bd = REACH * REACH;
      for (const lk of leaks) { if (!lk.on) continue; const dx = lk.x - student.position.x, dz = lk.z - student.position.z; const dsq = dx * dx + dz * dz; if (dsq < bd) { bd = dsq; best = lk; } }
      if (!best) return;
      best.on = false; best.obj.userData.setOn(false); if (best.obj.userData.update) best.obj.userData.on = false; best.ind.visible = false;
      rem -= 1; setRemaining(rem); audio.play('sparkle');
      if (rem <= 0) endMission('win');
    };
    api.current.interact = doInteract;

    const clock = new THREE.Clock();
    let raf = 0, throttle = 0, uiTimer = 0;
    const leakSet = new Set(leaks.map((l) => l.obj));
    const colliders = [];
    { const _wp = new THREE.Vector3(); scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (o === student || leakSet.has(o)) return; const r = o.userData && o.userData.radius; if (r && r > 0.7 && !o.userData.wheels) { o.getWorldPosition(_wp); colliders.push({ x: _wp.x, z: _wp.z, r: r * 0.82 }); } }); }
    function frame() {
      raf = requestAnimationFrame(frame);
      let dt = Math.min(clock.getDelta(), 0.05); if (!activeRef.current) dt = 0;
      const t = clock.elapsedTime;
      clouds.forEach((c) => { c.m.position.x += c.s * dt; if (c.m.position.x > 70) c.m.position.x = -70; });
      leaks.forEach((lk) => { if (lk.obj.userData.update) lk.obj.userData.update(dt); if (lk.ind.visible) lk.ind.position.y += Math.sin(t * 3 + lk.x) * 0.004; });

      if (phaseRef.current === 'patrol' && !ended) {
        // movement (world-axis, fixed camera angle)
        const m = moveRef.current;
        let mx = (m.right ? 1 : 0) - (m.left ? 1 : 0);
        let mz = (m.down ? 1 : 0) - (m.up ? 1 : 0);
        if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; let nx = student.position.x + mx * SPEED * dt, nz = student.position.z + mz * SPEED * dt; for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z; const dd = Math.hypot(dx, dz); const minD = c.r + 0.5; if (dd < minD) { if (dd > 1e-3) { nx = c.x + (dx / dd) * minD; nz = c.z + (dz / dd) * minD; } else { nx = c.x + minD; } } } student.position.x = Math.max(-BOUND, Math.min(BOUND, nx)); student.position.z = Math.max(-BOUND, Math.min(BOUND, nz)); student.rotation.y = Math.atan2(mx, mz); animateStudent(student, true, t); }

        // accrue wasted carbon from devices still on
        let draw = 0; for (const lk of leaks) if (lk.on) draw += lk.draw;
        carbonV += draw * dt;

        // nearest on-leak prompt
        let near = null, bd = REACH * REACH;
        for (const lk of leaks) { if (!lk.on) continue; const dx = lk.x - student.position.x, dz = lk.z - student.position.z; const dsq = dx * dx + dz * dz; if (dsq < bd) { bd = dsq; near = lk; } }
        const nm = near ? tt(DEVICE[near.kind].en, DEVICE[near.kind].ne) : null;
        if (nm !== nearNameRef.current) { nearNameRef.current = nm; setNearName(nm); }

        // timer + ui
        timer -= dt; uiTimer += dt; throttle += dt;
        if (uiTimer > 0.2) { uiTimer = 0; setTimeLeft(Math.max(0, Math.ceil(timer))); }
        if (throttle > 0.1) { throttle = 0; setCarbon(+carbonV.toFixed(2)); }

        // fail / overload
        if (carbonV >= CARBON_CAP) endMission('overload');
        else if (timer <= 0) { if (rem > 0) endMission('timeout'); }
      }

      // camera follows (fixed 3/4 angle)
      const want = new THREE.Vector3(student.position.x, 13, student.position.z + 13);
      camera.position.lerp(want, 0.08); camera.lookAt(student.position.x, 1, student.position.z);

      renderer.render(scene, camera);
    }
    frame();

    // controls
    const setMove = (code, on) => {
      if (code === 'ArrowUp' || code === 'KeyW') moveRef.current.up = on;
      else if (code === 'ArrowDown' || code === 'KeyS') moveRef.current.down = on;
      else if (code === 'ArrowLeft' || code === 'KeyA') moveRef.current.left = on;
      else if (code === 'ArrowRight' || code === 'KeyD') moveRef.current.right = on;
      else return false;
      return true;
    };
    const kd = (e) => { if (e.code === 'Space' || e.code === 'KeyE') { doInteract(); e.preventDefault(); return; } if (setMove(e.code, true)) e.preventDefault(); };
    const ku = (e) => { setMove(e.code, false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    const onFs = () => setTimeout(onResize, 80);
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
      audio.stopAmbient();
      const disposeMat = (mm) => { if (!mm) return; for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); } if (typeof mm.dispose === 'function') mm.dispose(); };
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const mat = o.material; if (Array.isArray(mat)) mat.forEach(disposeMat); else if (mat) disposeMat(mat); });
      scene.clear(); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  const nearNameRef = useRef(null);

  // actions
  const startPatrol = () => { audio.init(); api.current.start && api.current.start(); setResult(null); setPhase('patrol'); audio.setAmbient({ weather: 'clear', clarity: 0.7 }); };
  const retry = () => { api.current.reset && api.current.reset(); setResult(null); setPhase('brief'); };
  const press = (dir, on) => { moveRef.current[dir] = on; };
  const interact = () => api.current.interact && api.current.interact();
  const toggleMute = () => { const mm = !muted; setMutedState(mm); audio.setMuted(mm); };
  const toggleFullscreen = () => { const el = stageRef.current; if (!el) return; const fsEl = document.fullscreenElement || document.webkitFullscreenElement; if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); } else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); } };

  const meterMax = 3.0;
  const fillPct = Math.min(100, (carbon / meterMax) * 100);
  const budgetPct = (BUDGET / meterMax) * 100;
  const fillColor = carbon > BUDGET ? '#e23b3b' : carbon > BUDGET * 0.6 ? '#f2c14e' : '#37c46a';
  const dpad = { width: 56, height: 56, borderRadius: 14, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontSize: '1.3rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };

  const resTitle = result && (result.kind === 'win' ? tt('School is green!', 'विद्यालय हरियो भयो!') : result.kind === 'overload' ? tt('BLACKOUT! Overload', 'ब्ल्याकआउट! ओभरलोड') : tt('Time up — power wasted', 'समय सकियो — बिजुली खेर'));
  const resBody = result && (result.kind === 'win'
    ? tt(`Every device off — only ${result.total} kg CO₂ wasted. Tansen's school runs clean!`, `सबै बन्द — मात्र ${result.total} किलो CO₂ खेर। तानसेनको विद्यालय सफा!`)
    : result.kind === 'overload'
      ? tt('Too much ran at once and the wiring overloaded into a blackout. Switch devices off faster!', 'धेरै सँगै चल्दा तार ओभरलोड भई ब्ल्याकआउट भयो। छिटो बन्द गर्नुहोस्!')
      : tt(`The bell rang with devices still on — ${result.total} kg wasted. Be quicker next time!`, `घण्टी बज्दा बत्ती बाँकी — ${result.total} किलो खेर। छिटो गर्नुहोस्!`));

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="leaf" size={15} /> {tt('Mission 2 · Palpa · Tansen', 'मिसन २ · पाल्पा · तानसेन')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Power Patrol — switch off the waste', 'ऊर्जा गस्ती — खेर गएको बन्द गर्नुहोस्')}</h1>
        <p>{tt('Walk the Tansen school courtyard and switch off every device left running before the 60-second bell. Wait too long and the wiring overloads.', 'तानसेन विद्यालयको चोक घुमेर ६० सेकेन्डको घण्टीअघि चालू सबै उपकरण बन्द गर्नुहोस्। ढिला भए तार ओभरलोड हुन्छ।')}</p>
      </div>

      <div className="stage" ref={stageRef} style={{ position: 'relative' }}>
        <div className="stage-canvas" ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* wasted-energy meter */}
        {phase !== 'brief' && (
          <div style={{ position: 'absolute', left: 14, top: 14, bottom: 14, width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
            <div style={{ fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.6)', fontSize: '.78rem', textAlign: 'center' }}>{carbon.toFixed(2)}<br /><span style={{ fontSize: '.6rem', opacity: .85 }}>kg CO₂</span></div>
            <div style={{ position: 'relative', flex: 1, width: 26, background: 'rgba(255,255,255,.25)', borderRadius: 13, overflow: 'hidden', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fillPct}%`, background: `linear-gradient(${fillColor}, ${fillColor}cc)`, transition: 'height .15s linear, background .4s' }} />
              <div style={{ position: 'absolute', bottom: `${budgetPct}%`, left: -3, right: -3, height: 2, background: '#fff', boxShadow: '0 0 3px #000' }} />
            </div>
            <div style={{ fontSize: '.58rem', color: '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{tt('green', 'हरियो')} 1.5</div>
          </div>
        )}

        {/* controls */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8, zIndex: 6 }}>
          <button className="chip" onClick={toggleMute} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name={muted ? 'mute' : 'sound'} size={16} /></button>
          <button className="chip" onClick={toggleFullscreen} style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}><Icon name="expand" size={16} /> {tt('Fullscreen', 'पूर्ण स्क्रिन')}</button>
        </div>

        {/* timer + remaining */}
        {phase === 'patrol' && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ background: timeLeft <= 10 ? 'rgba(150,30,30,.85)' : 'rgba(20,40,28,.78)', color: '#fff', padding: '6px 14px', borderRadius: 18, fontWeight: 800 }}><Icon name="clock" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {timeLeft}s</div>
            <div style={{ background: 'rgba(20,40,28,.78)', color: '#fff', padding: '6px 14px', borderRadius: 18, fontWeight: 800 }}><Icon name="bolt" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {remaining} {tt('left', 'बाँकी')}</div>
          </div>
        )}

        {/* Bana guide + interact prompt */}
        {phase === 'patrol' && (
          <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', maxWidth: '76%', display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(20,40,28,.78)', color: '#fff', padding: '8px 14px', borderRadius: 18 }}>
            <BanaFace size={28} />
            <span style={{ fontWeight: 700, fontSize: '.82rem' }}>{nearName ? tt(`${nearName} is ON — press the power button to switch off`, `${nearName} चालू छ — पावर बटन थिच्नुहोस्`) : tt('Find the glowing devices and switch them off!', 'चम्किरहेका उपकरण खोजेर बन्द गर्नुहोस्!')}</span>
          </div>
        )}

        {/* on-screen d-pad + interact */}
        {phase === 'patrol' && (
          <>
            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'grid', gridTemplateColumns: 'repeat(3,56px)', gridTemplateRows: 'repeat(3,56px)', gap: 4, zIndex: 5 }}>
              <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(90deg)' }} /></button><span />
              <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}><Icon name="arrowLeft" size={20} /></button><span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(180deg)' }} /></button>
              <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(-90deg)' }} /></button><span />
            </div>
            <button onClick={interact} style={{ position: 'absolute', bottom: 40, right: 24, width: 92, height: 92, borderRadius: '50%', border: 'none', background: nearName ? 'rgba(47,158,68,.92)' : 'rgba(20,40,28,.7)', color: '#fff', fontSize: '1.6rem', fontWeight: 800, cursor: 'pointer', zIndex: 5, boxShadow: '0 6px 16px rgba(0,0,0,.3)' }}><Icon name="bolt" size={26} /><br /><span style={{ fontSize: '.6rem' }}>{tt('OFF', 'बन्द')}</span></button>
          </>
        )}

        {/* BRIEF overlay */}
        {phase === 'brief' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(12,22,16,.6)', backdropFilter: 'blur(2px)', padding: 16 }}>
            <div className="bana" style={{ marginBottom: 14, maxWidth: 460 }}>
              <BanaFace size={48} />
              <div className="bana-bubble">{tt('Namaste! School is closing in Tansen but 8 things are still wasting power. Move with the arrows / d-pad, walk up to each glowing device and press the power button to switch it OFF — all of them before the 60-second bell!', 'नमस्ते! तानसेनमा विद्यालय बन्द हुँदैछ तर ८ वटा कुरा बिजुली खेर फालिरहेका छन्। arrow / d-pad ले हिँड्नुहोस्, चम्किरहेको उपकरणनेर पुगेर पावर बटन थिची बन्द गर्नुहोस् — ६० सेकेन्डअघि सबै!')}</div>
            </div>
            <button className="btn" onClick={startPatrol} style={{ fontSize: '1.05rem', padding: '12px 28px' }}>▶ {tt('Start the patrol', 'गस्ती सुरु')}</button>
          </div>
        )}

        {/* RESULT overlay */}
        {phase === 'result' && result && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(12,22,16,.55)', backdropFilter: 'blur(6px)', padding: 16 }}>
            <div className="event-popup fade-in" style={{ textAlign: 'center', maxWidth: 460 }}>
              <div style={{ fontFamily: 'Baloo 2', fontSize: '1.9rem', color: result.kind === 'win' ? 'var(--primary)' : 'var(--danger)' }}>{resTitle}</div>
              <div style={{ fontFamily: 'Baloo 2', fontSize: '2.2rem', color: result.kind === 'win' ? 'var(--primary)' : 'var(--danger)' }}>{result.total.toFixed(2)} kg</div>
              <div className="bana" style={{ margin: '10px 0' }}>
                <BanaFace size={40} mood={result.kind === 'win' ? 'happy' : 'sad'} />
                <div className="bana-bubble">{resBody}</div>
              </div>
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
        )}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 10 }}>
        {tt('Move: arrows / WASD / d-pad · Switch off: Space / E / the power button. Lights, fans, computers, the pump and the AC all waste power.', 'हिँड्न: arrows / WASD / d-pad · बन्द गर्न: Space / E / पावर बटन। बत्ती, पङ्खा, कम्प्युटर, पम्प र एसीले बिजुली खेर फाल्छन्।')}
      </div>
    </div>
  );
}

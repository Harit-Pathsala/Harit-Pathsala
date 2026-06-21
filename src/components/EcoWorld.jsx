import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';
import * as THREE from 'three';
import { box, cyl, cone, mesh, makeTree, makeStudent, animateStudent, makeNewariHouse, makePagodaTemple, makeDustbin, makeModernBuilding, makeShop } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { useLang } from '../i18n.jsx';

const BOUND = 58;
const PROBLEMS = [
  { id: 'forest', cost: 40, x: -42, z: -26, en: 'Bare hillside', ne: 'नाङ्गो पाखो', fixEn: 'Plant a forest', fixNe: 'वन रोप्ने' },
  { id: 'litter', cost: 30, x: 26, z: 18, en: 'Litter everywhere', ne: 'चारैतिर फोहोर', fixEn: 'Add dustbins & clean', fixNe: 'डस्टबिन राख्ने' },
  { id: 'river', cost: 50, x: 0, z: -42, en: 'Polluted river', ne: 'प्रदूषित नदी', fixEn: 'Build treatment plant', fixNe: 'उपचार केन्द्र' },
  { id: 'smog', cost: 40, x: 46, z: -18, en: 'Dirty power', ne: 'फोहोर बिजुली', fixEn: 'Install solar farm', fixNe: 'सोलार जडान' },
  { id: 'transit', cost: 35, x: -24, z: 12, en: 'Smoky buses', ne: 'धुवाँ बस', fixEn: 'Switch to clean buses', fixNe: 'सफा बस' },
  { id: 'dump', cost: 30, x: 38, z: 34, en: 'Open dump', ne: 'खुला फोहोर', fixEn: 'Build recycling centre', fixNe: 'पुनःचक्रण केन्द्र' },
];
const TOTAL = PROBLEMS.length;

function iconTex(id) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.lineWidth = 8; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#241a12';
  const paint = (col) => { x.fillStyle = col; x.fill(); x.stroke(); };
  if (id === 'forest') { x.beginPath(); x.moveTo(64, 16); x.lineTo(98, 74); x.lineTo(30, 74); x.closePath(); paint('#5cb255'); x.beginPath(); x.rect(56, 74, 16, 32); paint('#7a5a32'); }
  else if (id === 'litter') { x.beginPath(); x.moveTo(38, 42); x.lineTo(90, 42); x.lineTo(84, 108); x.lineTo(44, 108); x.closePath(); paint('#9aa6ae'); x.beginPath(); x.moveTo(30, 42); x.lineTo(98, 42); x.stroke(); x.beginPath(); x.moveTo(54, 30); x.lineTo(74, 30); x.stroke(); }
  else if (id === 'river') { x.beginPath(); x.rect(32, 60, 64, 48); paint('#b06a4a'); x.beginPath(); x.rect(44, 30, 12, 30); paint('#9aa6ae'); x.beginPath(); x.rect(70, 40, 12, 20); paint('#9aa6ae'); }
  else if (id === 'smog') { x.beginPath(); x.arc(64, 64, 22, 0, 7); paint('#f2c14e'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; x.beginPath(); x.moveTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30); x.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.stroke(); } }
  else if (id === 'transit') { x.beginPath(); x.rect(24, 46, 80, 46); paint('#3a78c2'); x.fillStyle = '#cfeefb'; x.fillRect(32, 54, 64, 18); x.strokeRect(32, 54, 64, 18); x.beginPath(); x.arc(42, 96, 8, 0, 7); paint('#241a12'); x.beginPath(); x.arc(86, 96, 8, 0, 7); paint('#241a12'); }
  else { x.beginPath(); x.arc(64, 66, 28, 0.5, 5.6); x.stroke(); x.beginPath(); x.moveTo(86, 40); x.lineTo(98, 54); x.lineTo(78, 56); x.closePath(); paint('#2f9e44'); }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
function makeSolar() { const g = new THREE.Group(); for (const dx of [-1.5, 1.5]) { const s = box(0.2, 1, 0.2, 0x555); s.position.set(dx, 0.5, 0); g.add(s); const p = box(2.4, 0.12, 1.3, 0x1c3c6e); p.position.set(dx, 1.15, 0); p.rotation.x = -0.5; g.add(p); } return g; }
function makeTreatment() { const g = new THREE.Group(); const b = box(3, 1.6, 2.2, 0xc0c4c8); b.position.y = 0.8; g.add(b); for (const x of [-1.5, 1.5]) { const t = cyl(0.75, 0.75, 1.4, 14, 0xa8bcc8); t.position.set(x, 0.7, 1.4); g.add(t); const lid = cyl(0.8, 0.8, 0.13, 14, 0x4fb0d8); lid.position.set(x, 1.4, 1.4); g.add(lid); } return g; }
function makeBus(color) { const g = new THREE.Group(); const b = box(3.2, 1.3, 1.3, color); b.position.y = 0.9; g.add(b); const w = box(2.9, 0.45, 1.32, 0xcfeefb); w.position.y = 1.18; g.add(w); for (const x of [-1, 1]) { const wh = cyl(0.3, 0.3, 0.3, 12, 0x222); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.3, 0); g.add(wh); } return g; }

export default function EcoWorld() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const ecoPoints = useGameStore((s) => s.ecoPoints);
  const ecoFixed = useGameStore((s) => s.ecoFixed) || {};
  const fixProblem = useGameStore((s) => s.fixProblem);
  const fixedCount = PROBLEMS.filter((p) => ecoFixed[p.id]).length;
  const isHero = fixedCount >= TOTAL;

  const [near, setNear] = useState(null);     // problem in range
  const [toast, setToast] = useState(null);
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const apiRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    let raf = 0, disposed = false;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 540;
    const scene = new THREE.Scene();
    const sky = new THREE.Color(0x9a8862); scene.background = sky.clone();
    scene.fog = new THREE.Fog(0x9a8862, 26, 96);
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xeafaff, 0x6f6850, 0.95));
    const sun = new THREE.DirectionalLight(0xfff3da, 0.7); sun.position.set(-20, 40, 20); scene.add(sun);

    const ground = mesh(new THREE.CircleGeometry(BOUND + 4, 56), 0x9a8a5a, { roughness: 1 }); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const roadH = box((BOUND + 4) * 2, 0.06, 4.5, 0x6d7074); roadH.position.y = 0.03; scene.add(roadH);
    const roadV = box(4.5, 0.06, (BOUND) * 2, 0x6d7074); roadV.position.y = 0.03; scene.add(roadV);
    const river = mesh(new THREE.PlaneGeometry((BOUND + 6) * 2, 8), 0x6b5a3a, { roughness: 0.5 }); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, -40); scene.add(river);
    // town buildings
    [[makeNewariHouse(3), -28, 12], [makeNewariHouse(2), 30, 14], [makeModernBuilding(), 16, 26], [makeModernBuilding(), -16, 28], [makeShop(0xc98a4b), 12, -22], [makeNewariHouse(2), -32, -14], [makeNewariHouse(3), 48, 10], [makeShop(0x6a9bd1), -46, 24], [makeModernBuilding(), 46, -36], [makeNewariHouse(2), -12, 34], [makeShop(0xd2a24b), 24, -40]].forEach(([b, x, z], i) => { b.position.set(x, 0, z); b.rotation.y = (i % 2 ? 0.3 : -0.2); scene.add(b); });
    const temple = makePagodaTemple(); temple.position.set(-16, 0, -22); scene.add(temple);

    // problem stations
    const stations = PROBLEMS.map((p) => {
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
      const ring = mesh(new THREE.RingGeometry(2.4, 3.0, 28), 0xe23c3c, { transparent: true, opacity: 0.9 }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
      const pole = cyl(0.12, 0.12, 4.2, 8, 0xffffff); pole.position.y = 2.1; g.add(pole);
      const bill = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: iconTex(p.id), transparent: true })); bill.position.y = 5.0; g.add(bill);
      const problemG = new THREE.Group(), solutionG = new THREE.Group(); g.add(problemG); g.add(solutionG);
      // problem + solution visuals per type
      if (p.id === 'forest') { const dirt = mesh(new THREE.CircleGeometry(6, 24), 0x8a6a3a); dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.04; problemG.add(dirt); for (let i = 0; i < 8; i++) { const a = i * 0.9, rr = 1.5 + (i % 3); const t = makeTree(1 + Math.random() * 0.4); t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); solutionG.add(t); } }
      if (p.id === 'litter') { for (let i = 0; i < 16; i++) { const m = box(0.34, 0.22, 0.34, [0xcf5030, 0xd8b020, 0xcfcfcf, 0x6b8a3a][i % 4]); m.position.set((Math.random() - 0.5) * 9, 0.12, (Math.random() - 0.5) * 9); m.rotation.y = Math.random() * 6; problemG.add(m); } const b1 = makeDustbin(0x2f9e44); b1.position.set(1.5, 0, 1); solutionG.add(b1); const b2 = makeDustbin(0x3a78c2); b2.position.set(-1.5, 0, -1); solutionG.add(b2); }
      if (p.id === 'river') { const t = makeTreatment(); t.position.set(2, 0, 3); solutionG.add(t); const foam = mesh(new THREE.CircleGeometry(3, 16), 0x6b6a4a, { transparent: true, opacity: 0.7 }); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.05, -4); problemG.add(foam); }
      if (p.id === 'smog') { const ch = cyl(0.8, 1.0, 4, 10, 0x8a8078); ch.position.y = 2; problemG.add(ch); const s = makeSolar(); s.position.set(0, 0, 2.5); solutionG.add(s); }
      if (p.id === 'transit') { const ob = makeBus(0x9c5a4a); ob.rotation.y = Math.PI / 2; problemG.add(ob); const gb = makeBus(0x2f9e44); gb.rotation.y = Math.PI / 2; solutionG.add(gb); }
      if (p.id === 'dump') { for (let i = 0; i < 12; i++) { const m = box(0.4, 0.3, 0.4, [0x6b5a3a, 0x8a8078, 0x9c5a4a][i % 3]); m.position.set((Math.random() - 0.5) * 4, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 4); problemG.add(m); } const b = makeDustbin(0x2f9e44); b.position.set(1, 0, 0); solutionG.add(b); const b2 = makeDustbin(0x3a78c2); b2.position.set(-1, 0, 0.6); solutionG.add(b2); }
      scene.add(g);
      return { ...p, group: g, ring, problemG, solutionG };
    });

    const student = makeStudent(); student.scale.setScalar(0.95); student.position.set(0, 0, 10); scene.add(student);

    // controls (camera-relative, like the Explorer)
    const keys = {};
    const kd = (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'e') apiRef.current.fix && apiRef.current.fix(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); };
    const ku = (e) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    let camYaw = 0, dragging = false, px = 0;
    const pd = (e) => { dragging = true; px = e.clientX; };
    const pm = (e) => { if (dragging) { camYaw += (e.clientX - px) * 0.006; px = e.clientX; } };
    const pu = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    apiRef.current.fix = () => { const n = apiRef.current.near; if (!n) return; const ok = useGameStore.getState().fixProblem(n.id, n.cost); if (ok) { if (audio && audio.play) audio.play('restore'); } else { setToast(tt('Not enough ecopoints — play a mission!', 'इकोपोइन्ट पुगेन — मिसन खेल्नुहोस्!')); setTimeout(() => setToast(null), 1800); } };

    const camOffset = new THREE.Vector3();
    const dull = new THREE.Color(0x9a8a5a), green = new THREE.Color(0x6fae4e), brown = new THREE.Color(0x6b5a3a), blue = new THREE.Color(0x4fb0d8), fogD = new THREE.Color(0x9a8862), fogC = new THREE.Color(0x9fd0ea), tmpC = new THREE.Color();
    const clock = new THREE.Clock(); let curNearId = null;
    const colliders = [];
    { const _wp = new THREE.Vector3(); scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (o === student) return; const r = o.userData && o.userData.radius; if (r && r > 0.7 && !o.userData.wheels) { o.getWorldPosition(_wp); colliders.push({ x: _wp.x, z: _wp.z, r: r * 0.82 }); } }); }
    let vy = 0, grounded = true, prevSpace = false, jumpY = 0;
    apiRef.current.jump = () => { if (grounded) { vy = 7.4; grounded = false; } };
    function loop() {
      if (disposed) return; raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
      const st = useGameStore.getState(); const fx = st.ecoFixed || {};
      const done = PROBLEMS.filter((p) => fx[p.id]).length; const prog = done / TOTAL;
      // movement
      const m = moveRef.current; const speed = 8;
      const fwd = (keys.w || keys.arrowup || m.up ? 1 : 0) - (keys.s || keys.arrowdown || m.down ? 1 : 0);
      const str = (keys.d || keys.arrowright || m.right ? 1 : 0) - (keys.a || keys.arrowleft || m.left ? 1 : 0);
      const moving = fwd !== 0 || str !== 0;
      if (moving) { const sy = Math.sin(camYaw), cy = Math.cos(camYaw); let mx = -str * cy - fwd * sy, mz = -str * sy + fwd * cy; const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len; let nx = student.position.x + mx * speed * dt, nz = student.position.z + mz * speed * dt; for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z; const dd = Math.hypot(dx, dz); const minD = c.r + 0.5; if (dd < minD) { if (dd > 1e-3) { nx = c.x + (dx / dd) * minD; nz = c.z + (dz / dd) * minD; } else { nx = c.x + minD; } } } student.position.x = THREE.MathUtils.clamp(nx, -BOUND, BOUND); student.position.z = THREE.MathUtils.clamp(nz, -BOUND, BOUND); student.rotation.y = Math.atan2(mx, mz); }
      const spaceDown = !!keys[' ']; if (spaceDown && !prevSpace && grounded) { vy = 7.4; grounded = false; } prevSpace = spaceDown;
      if (!grounded) { vy -= 20 * dt; jumpY += vy * dt; if (jumpY <= 0) { jumpY = 0; vy = 0; grounded = true; } }
      animateStudent(student, moving, t);
      student.position.y += jumpY;
      // camera third-person follow
      const dist = 10, height = 6; camOffset.set(Math.sin(camYaw) * dist, height, -Math.cos(camYaw) * dist); const gp = student.position.clone(); gp.y = 0; camera.position.lerp(gp.add(camOffset), 0.1); camera.lookAt(student.position.x, 1.4, student.position.z);
      // stations: toggle problem/solution, pulse, find nearest
      let best = null, bd = 5.0;
      for (const s of stations) { const fixed = !!fx[s.id]; s.problemG.visible = !fixed; s.solutionG.visible = fixed; s.ring.material.color.setHex(fixed ? 0x2f9e44 : 0xe23c3c); if (!fixed) { s.ring.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08); const d = Math.hypot(student.position.x - s.x, student.position.z - s.z); if (d < bd) { bd = d; best = s; } } else s.ring.scale.setScalar(1); }
      apiRef.current.near = best;
      if ((best && best.id) !== curNearId) { curNearId = best ? best.id : null; setNear(best ? { id: best.id, en: best.en, ne: best.ne, fixEn: best.fixEn, fixNe: best.fixNe, cost: best.cost } : null); }
      // world heals with progress
      ground.material.color.lerp(tmpC.copy(dull).lerp(green, prog), 0.05);
      river.material.color.lerp(tmpC.copy(brown).lerp(blue, fx.river ? 1 : 0), 0.06);
      sky.lerp(tmpC.copy(fogD).lerp(fogC, prog), 0.04); scene.background = sky; scene.fog.color = sky; scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, 26 + prog * 40, 0.04);
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, 0.6 + prog * 0.6, 0.04);
      renderer.render(scene, camera);
    }
    loop();

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      renderer.domElement.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((mm) => { for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); } if (typeof mm.dispose === 'function') mm.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  const press = (dir, on) => { moveRef.current[dir] = on; };
  const onFixClick = () => apiRef.current.fix && apiRef.current.fix();
  const toggleFullscreen = () => { const el = stageRef.current; if (!el) return; const fs = document.fullscreenElement || document.webkitFullscreenElement; if (!fs) { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); } else { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); } };
  const dpad = { width: 50, height: 50, borderRadius: 12, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6, textAlign: 'center' }}>
        <span className="pill"><Icon name="globe" size={16} /> {tt('My Eco-World', 'मेरो इको-संसार')}</span>
        <h1 style={{ marginTop: 8 }}>{isHero ? tt('You built an Eco-World!', 'तपाईंले इको-संसार बनाउनुभयो!') : tt('Explore and clean up your town', 'घुम्दै सहर सफा गर्नुहोस्')}</h1>
        <p className="muted" style={{ fontWeight: 600, marginTop: 2 }}>{tt('Walk around with WASD / arrows (or the pad). Find the red problem spots and spend your mission ecopoints to fix them — the whole town heals as you go.', 'WASD/एरो (वा प्याड)ले घुम्नुहोस्। रातो समस्या ठाउँ खोजी इकोपोइन्ट खर्चेर सच्याउनुहोस् — सहर सफा हुँदै जान्छ।')}</p>
      </div>

      <div ref={stageRef} className="stage" style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', height: 'clamp(440px, 72vh, 760px)', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#cdbf8e,#dfe7c8)' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 30%, rgba(120,100,60,0) 35%, rgba(90,75,45,1) 100%)', opacity: (1 - fixedCount / TOTAL) * 0.38, transition: 'opacity .5s' }} />
        {/* top HUD */}
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill" style={{ fontWeight: 800 }}><Icon name="leaf" size={15} /> {ecoPoints}</span>
          <div style={{ flex: 1, minWidth: 130, maxWidth: 320, background: 'rgba(255,255,255,.78)', borderRadius: 10, padding: '4px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', fontWeight: 800 }}><span>{tt('Eco-World', 'इको-संसार')}</span><span>{fixedCount}/{TOTAL}</span></div>
            <div style={{ height: 7, background: '#e0d8c4', borderRadius: 4, overflow: 'hidden', marginTop: 2 }}><div style={{ height: '100%', width: `${(fixedCount / TOTAL) * 100}%`, background: isHero ? '#2f9e44' : '#7cb342', transition: 'width .3s' }} /></div>
          </div>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.9)' }}><Icon name="expand" size={16} /></button>
        </div>
        {isHero && <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', background: '#2f9e44', color: '#fff', fontWeight: 800, padding: '6px 16px', borderRadius: 20 }}><Icon name="sparkle" size={16} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 5 }} /> {tt('ECO-WORLD COMPLETE', 'इको-संसार पूरा')}</div>}
        {/* d-pad */}
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,50px)', gridTemplateRows: 'repeat(3,50px)', gap: 5 }}>
          <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(90deg)' }} /></button><span />
          <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}><Icon name="arrowLeft" size={20} /></button><button style={{ ...dpad, fontSize: 11, fontWeight: 800 }} onPointerDown={(e) => { e.preventDefault(); apiRef.current.jump && apiRef.current.jump(); }} title="Jump">{tt('JUMP', '\u092b\u0921\u094d\u0915\u094b')}</button><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}><Icon name="arrowLeft" size={20} style={{ transform: 'rotate(-90deg)' }} /></button><span />
        </div>
        {/* fix prompt when near a problem */}
        {near && !isHero && (
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,.96)', borderRadius: 14, padding: '10px 14px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,.2)', maxWidth: 320 }}>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon name="warning" size={17} /> {tt(near.en, near.ne)}</div>
            <button onClick={onFixClick} disabled={ecoPoints < near.cost}
              style={{ marginTop: 6, border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 800, cursor: ecoPoints < near.cost ? 'not-allowed' : 'pointer', background: ecoPoints < near.cost ? '#cdcdcd' : '#2f9e44', color: '#fff' }}>
              {tt(near.fixEn, near.fixNe)} · {near.cost} <Icon name="leaf" size={13} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> <span style={{ opacity: .8, fontWeight: 600 }}>({tt('press E', 'E थिच्नुहोस्')})</span>
            </button>
          </div>
        )}
        {toast && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: '.85rem', textAlign: 'center', maxWidth: 300 }}>{toast}</div>}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {isHero ? tt('Your town is a clean, green Eco-World — Eco Hero!', 'तपाईंको सहर सफा हरियो इको-संसार — इको हिरो!') : tt('Walk to each red marker and fix it with your ecopoints.', 'हरेक रातो मार्करमा गई इकोपोइन्टले सच्याउनुहोस्।')}
      </div>
    </div>
  );
}

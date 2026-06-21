import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, makeGreenHills, makeTree } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';
import { useGameStore } from '../state/gameStore.ts';

const TIME = 70, TARGET = 14, SINK_CAP = 6, REACH = 2.3, BX = 14, BZ = 9.5, SPEED = 8;
const ISLAND = { x: -9.5, z: -5.5, r: 2.6 };

// ── richer floating-trash builders ──
function makeBottle() { const g = new THREE.Group(); g.add(cyl(0.17, 0.2, 0.6, 10, 0x6fd0e6, { transparent: true, opacity: 0.85 })); const cap = cyl(0.09, 0.09, 0.12, 8, 0x2b7fb0); cap.position.y = 0.36; g.add(cap); return g; }
function makeBag() { const g = new THREE.Group(); const b = box(0.55, 0.06, 0.42, 0xf2f2f2, { transparent: true, opacity: 0.8 }); b.rotation.set(0.2, 0.4, -0.15); g.add(b); const k = box(0.2, 0.16, 0.18, 0xe8e8e8, { transparent: true, opacity: 0.8 }); k.position.set(0.1, 0.08, 0.05); g.add(k); return g; }
function makePacket() { const g = new THREE.Group(); const p = box(0.42, 0.04, 0.3, 0xd23b3b, { metalness: 0.6, roughness: 0.3 }); p.rotation.z = 0.25; g.add(p); return g; }
function makeCan() { const g = new THREE.Group(); g.add(cyl(0.16, 0.16, 0.34, 12, 0xcf5030, { metalness: 0.5, roughness: 0.35 })); return g; }
function makeCup() { const g = new THREE.Group(); g.add(cyl(0.2, 0.13, 0.26, 12, 0xfafafa)); return g; }
const KINDS = [makeBottle, makeBag, makePacket, makeCan, makeCup];

export default function LakeCleanupMission() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);

  const [phase, setPhase] = useState('play');
  const [hud, setHud] = useState({ got: 0, sunk: 0, time: TIME, left: 0 });
  const [result, setResult] = useState(null);
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const activeRef = useGameActiveRef();
  const runRef = useRef(0);

  const restart = () => { setResult(null); setPhase('play'); runRef.current++; };

  useEffect(() => {
    if (phase !== 'play') return;
    const mount = mountRef.current; if (!mount) return;
    const myRun = runRef.current;
    let raf = 0, ended = false;

    const W = mount.clientWidth || 760, H = mount.clientHeight || 460;
    const scene = new THREE.Scene();
    // sky gradient
    const sc = document.createElement('canvas'); sc.width = 8; sc.height = 256;
    const sx = sc.getContext('2d'); const sg = sx.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0, '#7ec8ee'); sg.addColorStop(0.6, '#bfe6f5'); sg.addColorStop(1, '#e8f4ef');
    sx.fillStyle = sg; sx.fillRect(0, 0, 8, 256);
    const skyTex = new THREE.CanvasTexture(sc); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    camera.position.set(0, 16, 27); camera.lookAt(0, 0.5, -3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a6a55, 0.95));
    const sun = new THREE.DirectionalLight(0xfff3da, 1.2); sun.position.set(-30, 50, 20); scene.add(sun);

    // lake water
    const lake = mesh(new THREE.PlaneGeometry(120, 90, 1, 1), 0x2f8fc0, { roughness: 0.35, metalness: 0.15 });
    lake.rotation.x = -Math.PI / 2; lake.position.y = 0; scene.add(lake);

    // green shore hills + distant snow peaks (Machhapuchhre / Annapurna)
    const hills = makeGreenHills({ count: 14, radius: 48, height: 18 }); hills.position.set(0, -0.2, -6); scene.add(hills);
    const peaks = new THREE.Group();
    [[-26, -52, 34], [-8, -58, 42], [10, -54, 38], [30, -50, 30]].forEach(([x, z, h]) => {
      const p = cone(h * 0.5, h, 4, 0xf3f8ff); p.position.set(x, h / 2 - 2, z); p.rotation.y = Math.random(); peaks.add(p);
      const base = cone(h * 0.6, h * 0.55, 4, 0x5d6b74); base.position.set(x, h * 0.27 - 2, z); base.rotation.y = p.rotation.y; peaks.add(base);
    });
    scene.add(peaks);

    // Tal Barahi temple island
    const island = new THREE.Group();
    const land = cyl(ISLAND.r, ISLAND.r + 0.4, 0.7, 16, 0x6f9a4a); land.position.y = 0.15; island.add(land);
    const plinth = box(1.8, 0.4, 1.8, 0xd9c7a0); plinth.position.y = 0.65; island.add(plinth);
    let ry = 0.95, rw = 1.6;
    for (let t = 0; t < 3; t++) { const body = box(rw * 0.7, 0.5, rw * 0.7, t === 2 ? 0xb23b3b : 0xe8d9b0); body.position.y = ry + 0.25; island.add(body); const roof = cone(rw * 0.78, 0.45, 4, 0x9c3b2e); roof.position.y = ry + 0.72; roof.rotation.y = Math.PI / 4; island.add(roof); ry += 0.85; rw *= 0.7; }
    const tip = cone(0.12, 0.5, 8, 0xf4c542); tip.position.y = ry + 0.3; island.add(tip);
    [[-1.6, -1.4], [1.6, 1.3], [-1.5, 1.5]].forEach(([tx, tz]) => { const tr = makeTree ? makeTree() : null; if (tr) { tr.position.set(tx, 0.4, tz); tr.scale.setScalar(0.5); island.add(tr); } });
    island.position.set(ISLAND.x, 0, ISLAND.z); scene.add(island);

    // shore dock
    const dock = box(2.2, 0.3, 4, 0x9c6b3f); dock.position.set(11.5, 0.25, 8.5); scene.add(dock);

    // ── traditional painted doonga ──
    const boat = new THREE.Group();
    const hull = box(3.0, 0.5, 1.25, 0x2f7fb0); hull.position.y = 0.35; boat.add(hull);
    const inner = box(2.7, 0.16, 0.95, 0x8fd6ef); inner.position.y = 0.58; boat.add(inner);
    const stripe = box(3.05, 0.14, 0.12, 0xf4c542); stripe.position.set(0, 0.5, 0.63); boat.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.z = -0.63; boat.add(stripe2);
    const bow = cone(0.62, 1.1, 4, 0x2f7fb0); bow.rotation.set(0, Math.PI / 4, -Math.PI / 2); bow.position.set(1.6, 0.35, 0); boat.add(bow);
    const stern = bow.clone(); stern.rotation.set(0, Math.PI / 4, Math.PI / 2); stern.position.set(-1.6, 0.35, 0); boat.add(stern);
    [-0.7, 0, 0.7].forEach((px) => { const plank = box(0.18, 0.06, 1.0, 0x8a5a32); plank.position.set(px, 0.66, 0); boat.add(plank); });
    const man = new THREE.Group(); const body = cyl(0.16, 0.2, 0.5, 8, 0xd24a3b); body.position.y = 0.3; man.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0a878 })); head.position.y = 0.66; man.add(head); man.position.set(-0.9, 0.7, 0); boat.add(man);
    const paddle = box(0.06, 0.06, 1.4, 0x6b4a2a); paddle.position.set(-0.9, 0.7, 0.5); paddle.rotation.x = 0.5; boat.add(paddle);
    boat.position.set(8, 0.12, 6); scene.add(boat);

    // ── trash pool ──
    const trash = [];
    const SLOTS = 11, TOTAL = 22;
    let spawned = 0;
    const spawnOne = () => {
      if (spawned >= TOTAL) return;
      const slot = trash.find((t) => !t.alive);
      let m;
      if (slot) m = slot.mesh; else { m = KINDS[Math.floor(Math.random() * KINDS.length)](); scene.add(m); }
      m.visible = true;
      let x, z, tries = 0;
      do { x = (Math.random() - 0.5) * (BX * 2 - 2); z = (Math.random() - 0.5) * (BZ * 2 - 2); tries++; } while (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r + 1.2 && tries < 8);
      m.position.set(x, 0.16, z);
      const entry = slot || { mesh: m };
      entry.alive = true; entry.age = 0; entry.life = 7 + Math.random() * 3.5;
      entry.vx = (Math.random() - 0.5) * 0.9; entry.vz = (Math.random() - 0.5) * 0.9;
      entry.bob = Math.random() * 6.28; entry.spin = (Math.random() - 0.5) * 1.2;
      if (!slot) trash.push(entry);
      spawned += 1;
    };
    for (let i = 0; i < 6; i++) spawnOne();

    let got = 0, sunk = 0, t = TIME, acc = 0, spawnT = 0, vx = 0, vz = 0;
    let last = performance.now();
    const finish = (win, rating, reason) => { if (ended) return; ended = true; if (win) useGameStore.getState().addEcoPoints(rating === 'pristine' ? 30 : rating === 'clean' ? 22 : 16); setResult({ win, rating, reason }); setPhase('done'); };

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    const step = (now) => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (!activeRef.current) dt = 0;
      t -= dt; spawnT += dt;

      // boat movement
      const mv = moveRef.current;
      const ax = (mv.right ? 1 : 0) - (mv.left ? 1 : 0);
      const az = (mv.down ? 1 : 0) - (mv.up ? 1 : 0);
      vx += (ax * SPEED - vx) * Math.min(1, dt * 6);
      vz += (az * SPEED - vz) * Math.min(1, dt * 6);
      let nx = Math.max(-BX, Math.min(BX, boat.position.x + vx * dt));
      let nz = Math.max(-BZ, Math.min(BZ, boat.position.z + vz * dt));
      // soft collision with temple island
      const di = Math.hypot(nx - ISLAND.x, nz - ISLAND.z), minD = ISLAND.r + 1.0;
      if (di < minD) { const a = Math.atan2(nz - ISLAND.z, nx - ISLAND.x); nx = ISLAND.x + Math.cos(a) * minD; nz = ISLAND.z + Math.sin(a) * minD; }
      boat.position.x = nx; boat.position.z = nz;
      boat.position.y = 0.12 + Math.sin(now / 400) * 0.04;
      if (Math.abs(vx) + Math.abs(vz) > 0.4) boat.rotation.y = Math.atan2(-vz, vx);

      // camera: tilted scene view that gently follows the boat (parallax 3D feel)
      const cx = boat.position.x * 0.4;
      camera.position.set(cx, 16, 27);
      camera.lookAt(cx * 0.6, 0.6, -3);

      if (spawnT > 1.5 && spawned < TOTAL && trash.filter((x) => x.alive).length < SLOTS) { spawnT = 0; spawnOne(); }

      let aliveCount = 0;
      for (const it of trash) {
        if (!it.alive) continue;
        it.age += dt;
        it.mesh.position.x = Math.max(-BX - 1, Math.min(BX + 1, it.mesh.position.x + it.vx * dt));
        it.mesh.position.z = Math.max(-BZ - 1, Math.min(BZ + 1, it.mesh.position.z + it.vz * dt));
        it.mesh.position.y = 0.16 + Math.sin(now / 480 + it.bob) * 0.05;
        it.mesh.rotation.y += dt * it.spin;
        if (it.age > it.life - 3) it.mesh.position.y = 0.16 - (it.age - (it.life - 3)) * 0.04;
        const dx = it.mesh.position.x - boat.position.x, dz = it.mesh.position.z - boat.position.z;
        if (Math.hypot(dx, dz) < REACH) { it.alive = false; it.mesh.visible = false; got += 1; if (audio && audio.play) audio.play('sparkle'); continue; }
        if (it.age >= it.life) { it.alive = false; it.mesh.visible = false; sunk += 1; if (audio && audio.play) audio.play('thud'); continue; }
        aliveCount += 1;
      }

      if (got >= TARGET) { renderer.render(scene, camera); const rating = sunk <= 1 ? 'pristine' : sunk <= 3 ? 'clean' : 'ok'; return finish(true, rating, null); }
      if (sunk >= SINK_CAP) { renderer.render(scene, camera); return finish(false, null, 'polluted'); }
      if (t <= 0) { renderer.render(scene, camera); return finish(false, null, 'time'); }

      acc += dt; if (acc >= 0.08) { acc = 0; setHud({ got, sunk, time: Math.max(0, t), left: aliveCount }); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); }
      });
      skyTex.dispose();
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
  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };
  const dpad = { width: 54, height: 54, borderRadius: 14, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill"><Icon name="boat" size={16} /> {tt('Pokhara · Phewa Lake Clean-Up', 'पोखरा · फेवाताल सफाइ')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Clean the lake before the boats arrive', 'डुङ्गा आउनुअघि ताल सफा गर्नुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">
            {phase === 'play' ? tt('Steer the boat with the arrows / d-pad and scoop up the floating trash. If it rots in the water it releases methane — don\u2019t let too much sink!', 'arrow / d-pad ले डुङ्गा चलाएर पौडिरहेको फोहोर उठाउनुहोस्। पानीमा कुहिए मिथेन निस्कन्छ — धेरै डुब्न नदिनुहोस्!') : (result?.win ? tt('The lake sparkles again!', 'ताल फेरि चम्कियो!') : tt('The lake got too polluted — try again.', 'ताल धेरै प्रदूषित भयो — फेरि।'))}
          </div>
        </div>
      </div>

      {phase === 'play' && (
        <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 900, margin: '0 auto', height: 'clamp(380px, 64vh, 660px)', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#7ec8ee,#e8f4ef)' }}>
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

          <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill" style={{ pointerEvents: 'auto' }}><Icon name="trash" size={15} style={{ verticalAlign: '-3px', marginRight: 3 }} /> {hud.got}/{TARGET} {tt('collected', 'सङ्कलित')}</span>
            <span style={{ fontWeight: 800, background: 'rgba(255,255,255,.82)', borderRadius: 8, padding: '3px 8px' }}><Icon name="clock" size={14} style={{ verticalAlign: '-2px', marginRight: 3 }} /> {Math.ceil(hud.time)}s</span>
          </div>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')}
            style={{ position: 'absolute', top: 42, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>
          <div style={{ position: 'absolute', top: 44, left: 12, background: 'rgba(255,255,255,.8)', borderRadius: 8, padding: '4px 8px', fontWeight: 800, fontSize: '.74rem' }}> {tt('Sunk', 'डुबेको')} {hud.sunk}/{SINK_CAP}</div>

          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,54px)', gridTemplateRows: 'repeat(3,54px)', gap: 6, opacity: 0.95 }}>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}>▲</button><span />
            <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}>◄</button><span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}>►</button>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}>▼</button><span />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="card center" style={{ maxWidth: 560, margin: '0 auto' }}>
          {result?.win ? (
            <>
              <div style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name={result.rating === 'pristine' ? 'sparkle' : result.rating === 'clean' ? 'droplet' : 'boat'} size={42} /></div>
              <h2 style={{ margin: '6px 0' }}>{result.rating === 'pristine' ? tt('Pristine Phewa!', 'सफा फेवा!') : result.rating === 'clean' ? tt('Lake cleaned', 'ताल सफा भयो') : tt('Cleaned — just in time', 'सफा भयो — बेलैमा')}</h2>
              <p style={{ fontWeight: 700 }}>{tt('Collected', 'सङ्कलित')}: {TARGET} · {tt('sunk', 'डुबेको')}: {hud.sunk}</p>
              <p className="muted" style={{ fontWeight: 600 }}>{tt('Waste left in water rots and releases methane, a strong greenhouse gas. Collecting and sorting it protects the lake and the climate.', 'पानीमा रहेको फोहोर कुहिएर मिथेन निकाल्छ। सङ्कलन र छुट्याउँदा ताल र जलवायु जोगिन्छ।')}</p>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--danger)', display: 'grid', placeItems: 'center' }}><Icon name={result?.reason === 'polluted' ? 'warning' : 'clock'} size={42} /></div>
              <h2 style={{ margin: '6px 0', color: 'var(--danger)' }}>{tt('Mission failed', 'मिसन असफल')}</h2>
              <p style={{ fontWeight: 700 }}>{result?.reason === 'polluted' ? tt('Too much trash sank and polluted the lake.', 'धेरै फोहोर डुबेर ताल प्रदूषित भयो।') : tt('Time ran out before the lake was clean.', 'ताल सफा हुनुअघि समय सकियो।')}</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button className="btn" onClick={restart}>{tt('Try again', 'फेरि')}</button>
          </div>
        </div>
      )}

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Move: arrows / WASD / d-pad · drive over trash to scoop it. Collect 14 before too many sink.', 'चाल: arrows / WASD / d-pad · फोहोरमाथि गएर उठाउनुहोस्। धेरै डुब्नुअघि १४ उठाउनुहोस्।')}
      </div>
    </div>
  );
}

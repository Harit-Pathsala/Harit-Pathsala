import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, makeTent, makePrayerFlags, makeStudent, animateStudent, makeWeather } from '../game/nepalKit.js';
import { makeSkyTexture, makeGroundTexture } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';

const TIME = 65, TOTAL = 22, CAP = 5, REACH = 2.3, BX = 16, BZ = 11, SPEED = 7.5;
const DUMP = { x: 14, z: 10 };

function makeLitter(kind) {
  if (kind === 0) { const g = new THREE.Group(); g.add(cyl(0.16, 0.2, 0.6, 10, 0x6fd0e6, { transparent: true, opacity: 0.85 })); return g; }
  if (kind === 1) { const g = new THREE.Group(); g.add(cyl(0.16, 0.16, 0.34, 12, 0xcf5030, { metalness: 0.5, roughness: 0.35 })); return g; }
  if (kind === 2) { const g = new THREE.Group(); const c = cyl(0.2, 0.22, 0.5, 12, 0xd8b020, { metalness: 0.4 }); g.add(c); const t = cyl(0.07, 0.07, 0.14, 8, 0x888888); t.position.y = 0.32; g.add(t); return g; } // gas canister
  const g = new THREE.Group(); const p = box(0.4, 0.04, 0.3, 0xd23b3b, { metalness: 0.6, roughness: 0.3 }); p.rotation.z = 0.25; g.add(p); return g; // foil packet
}

export default function CarryOutMission() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [phase, setPhase] = useState('play');
  const [hud, setHud] = useState({ pack: 0, out: 0, time: TIME });
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
    const myRun = runRef.current; let raf = 0, ended = false;
    const W = mount.clientWidth || 760, H = mount.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    camera.position.set(0, 17, 26); camera.lookAt(0, 0.5, -2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb6c4, 1.05));
    const sun = new THREE.DirectionalLight(0xfff4e2, 1.0); sun.position.set(-20, 50, 18); scene.add(sun);

    // snowfield + peaks + tents + prayer flags
    const snow = mesh(new THREE.PlaneGeometry(70, 56), 0xeef4fa, { roughness: 1 }); snow.rotation.x = -Math.PI / 2; scene.add(snow);
    { const gt = makeGroundTexture(0xeef4fa); gt.repeat.set(7, 6); snow.material.map = gt; snow.material.color.set(0xffffff); snow.material.needsUpdate = true; }
    scene.background = makeSkyTexture(0xbcd9e8);
    const peaks = new THREE.Group();
    [[-22, -34, 30], [-4, -40, 40], [16, -36, 34], [30, -32, 26]].forEach(([x, z, h]) => { const p = cone(h * 0.52, h, 4, 0xffffff); p.position.set(x, h / 2 - 1, z); p.rotation.y = Math.random(); peaks.add(p); const rock = cone(h * 0.58, h * 0.5, 4, 0x73808a); rock.position.set(x, h * 0.25 - 1, z); rock.rotation.y = p.rotation.y; peaks.add(rock); });
    scene.add(peaks);
    [[-9, -4], [9, -5], [-11, 5]].forEach(([x, z], i) => { const tn = makeTent(); tn.position.set(x, 0, z); tn.rotation.y = i; scene.add(tn); });
    const flags = makePrayerFlags(7, 0.7); flags.position.set(0, 2.5, -7); scene.add(flags);

    // disposal station (recycling basket + glow ring)
    const dump = new THREE.Group(); dump.position.set(DUMP.x, 0, DUMP.z);
    const bin = cyl(0.8, 0.65, 1.1, 14, 0x2f9e44); bin.position.y = 0.55; dump.add(bin);
    const lid = cyl(0.9, 0.9, 0.12, 14, 0x227a34); lid.position.y = 1.16; dump.add(lid);
    const ring = mesh(new THREE.RingGeometry(1.4, 1.8, 24), 0x2f9e44, { transparent: true, opacity: 0.6 }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; dump.add(ring);
    scene.add(dump);

    // trekker (student + backpack)
    const player = new THREE.Group();
    const who = makeStudent(); player.add(who);
    const pack = box(0.5, 0.6, 0.3, 0xc0552f); pack.position.set(0, 0.85, -0.28); player.add(pack);
    player.position.set(0, 0, 6); scene.add(player);

    // litter
    const items = [];
    for (let i = 0; i < TOTAL; i++) {
      const m = makeLitter(i % 4);
      let x, z, tries = 0;
      do { x = (Math.random() - 0.5) * (BX * 2 - 2); z = (Math.random() - 0.5) * (BZ * 2 - 2); tries++; } while (Math.hypot(x - DUMP.x, z - DUMP.z) < 3 && tries < 8);
      m.position.set(x, 0.2, z); m.rotation.y = Math.random() * 6.28; scene.add(m);
      items.push({ mesh: m, taken: false, bob: Math.random() * 6.28 });
    }
    const weather = makeWeather('snow'); scene.add(weather);
    const colliders = [];
    { const _wp = new THREE.Vector3(); scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (o === player || o === who) return; const r = o.userData && o.userData.radius; if (r && r > 0.7 && !o.userData.wheels) { o.getWorldPosition(_wp); colliders.push({ x: _wp.x, z: _wp.z, r: r * 0.82 }); } }); }

    let pc = 0, out = 0, t = TIME, acc = 0, vx = 0, vz = 0, walkT = 0;
    let last = performance.now();
    const finish = (win) => { if (ended) return; ended = true; if (win) useGameStore.getState().addEcoPoints(25); setResult({ win }); setPhase('done'); };
    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    const step = (now) => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (!activeRef.current) dt = 0;
      t -= dt; walkT += dt;
      const mv = moveRef.current;
      const ax = (mv.right ? 1 : 0) - (mv.left ? 1 : 0);
      const az = (mv.down ? 1 : 0) - (mv.up ? 1 : 0);
      const moving = ax !== 0 || az !== 0;
      vx += (ax * SPEED - vx) * Math.min(1, dt * 7);
      vz += (az * SPEED - vz) * Math.min(1, dt * 7);
      let nx = player.position.x + vx * dt, nz = player.position.z + vz * dt;
      for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z; const dd = Math.hypot(dx, dz); const minD = c.r + 0.5; if (dd < minD) { if (dd > 1e-3) { nx = c.x + (dx / dd) * minD; nz = c.z + (dz / dd) * minD; } else { nx = c.x + minD; } } }
      player.position.x = Math.max(-BX, Math.min(BX, nx));
      player.position.z = Math.max(-BZ, Math.min(BZ, nz));
      if (Math.abs(vx) + Math.abs(vz) > 0.4) player.rotation.y = Math.atan2(vx, vz);
      animateStudent(who, moving, walkT);

      const cx = player.position.x * 0.4;
      camera.position.set(cx, 17, 26); camera.lookAt(cx * 0.6, 0.6, -2);

      // collect litter (if pack has room)
      for (const it of items) {
        if (it.taken) continue;
        it.mesh.position.y = 0.2 + Math.sin(now / 480 + it.bob) * 0.04; it.mesh.rotation.y += dt * 0.5;
        if (pc < CAP && Math.hypot(it.mesh.position.x - player.position.x, it.mesh.position.z - player.position.z) < REACH) {
          it.taken = true; it.mesh.visible = false; pc += 1; if (audio && audio.play) audio.play('tap');
        }
      }
      // empty pack at the disposal station
      ring.material.opacity = 0.4 + Math.sin(now / 300) * 0.2;
      if (pc > 0 && Math.hypot(player.position.x - DUMP.x, player.position.z - DUMP.z) < REACH + 0.4) { out += pc; pc = 0; if (audio && audio.play) audio.play('sparkle'); }
      pack.scale.y = 1 + pc * 0.12;
      weather.userData.update(dt, { x: 0, z: 0 });

      if (out >= TOTAL) { renderer.render(scene, camera); return finish(true); }
      if (t <= 0) { renderer.render(scene, camera); return finish(false); }
      acc += dt; if (acc >= 0.08) { acc = 0; setHud({ pack: pc, out, time: Math.max(0, t) }); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      if (weather.userData.dispose) weather.userData.dispose();
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
  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };
  const dpad = { width: 54, height: 54, borderRadius: 14, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
  const packFull = hud.pack >= CAP;

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill"><Icon name="mountain" size={16} /> {tt('Api Himal · Base Camp Carry-Out', 'आपी हिमाल · आधार शिविर सफाइ')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Leave no trace on the mountain', 'पहाडमा फोहोर नछोड्नुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">
            {phase === 'play' ? tt('Pick up the trekkers\u2019 litter, but your pack only holds 5. When it\u2019s full, carry it to the green  station, empty it, and go again — before the weather closes in!', 'पदयात्रीको फोहोर उठाउनुहोस्, तर झोलामा ५ मात्र अट्छ। भरिएपछि हरियो  स्टेसनमा खाली गरी फेरि जानुहोस् — मौसम बिग्रनुअघि!') : (result?.win ? tt('Base camp is spotless again!', 'आधार शिविर फेरि सफा भयो!') : tt('The weather closed in before you finished.', 'सक्नुअघि मौसम बिग्रियो।'))}
          </div>
        </div>
      </div>

      {phase === 'play' && (
        <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 900, margin: '0 auto', height: 'clamp(360px, 60vh, 600px)', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#cfe6f4,#eef6fb)' }}>
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill" style={{ pointerEvents: 'auto' }}><Icon name="backpack" size={15} style={{ verticalAlign: '-3px', marginRight: 3 }} /> {hud.pack}/{CAP} · <Icon name="recycle" size={14} style={{ verticalAlign: '-2px', margin: '0 2px' }} /> {hud.out}/{TOTAL}</span>
            <span style={{ fontWeight: 800, background: 'rgba(255,255,255,.82)', borderRadius: 8, padding: '3px 8px' }}><Icon name="clock" size={14} style={{ verticalAlign: '-2px', marginRight: 3 }} /> {Math.ceil(hud.time)}s</span>
          </div>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ position: 'absolute', top: 42, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>
          {packFull && <div style={{ position: 'absolute', top: 44, left: 12, background: '#e8a33b', color: '#3a2a00', borderRadius: 8, padding: '4px 10px', fontWeight: 800, fontSize: '.76rem' }}>{tt('Pack full — go to recycle', 'झोला भरियो — पुनःचक्रण जानुहोस्')}</div>}
          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,54px)', gridTemplateRows: 'repeat(3,54px)', gap: 6, opacity: 0.95 }}>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(90deg)' }} /></button><span />
            <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}><Icon name="arrowLeft" size={18} /></button><span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(180deg)' }} /></button>
            <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(-90deg)' }} /></button><span />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="card center" style={{ maxWidth: 560, margin: '0 auto' }}>
          {result?.win ? (
            <>
              <div style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name="mountain" size={42} /></div>
              <h2 style={{ margin: '6px 0' }}>{tt('Leave No Trace!', 'फोहोर शून्य!')}</h2>
              <p className="muted" style={{ fontWeight: 600 }}>{tt('Waste left high in the mountains never breaks down in the cold and pollutes the snow and rivers below. Packing it out keeps the Himalaya clean.', 'उच्च पहाडमा छाडेको फोहोर चिसोमा कुहिँदैन र तलको हिउँ–नदी प्रदूषित गर्छ। फिर्ता बोक्दा हिमाल सफा रहन्छ।')}</p>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--danger)', display: 'grid', placeItems: 'center' }}><Icon name="rain" size={42} /></div>
              <h2 style={{ margin: '6px 0', color: 'var(--danger)' }}>{tt('Mission failed', 'मिसन असफल')}</h2>
              <p style={{ fontWeight: 700 }}>{tt('The storm arrived before all the litter was carried out.', 'सबै फोहोर बोकिनुअघि आँधी आयो।')}</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button className="btn" onClick={restart}>{tt('Try again', 'फेरि')}</button>
          </div>
        </div>
      )}

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Move: arrows / WASD / d-pad · pack holds 5 · empty it at the recycle station · carry out all 22.', 'चाल: arrows / WASD / d-pad · झोलामा ५ · पुनःचक्रण मा खाली · सबै २२ बोक्नुहोस्।')}
      </div>
    </div>
  );
}

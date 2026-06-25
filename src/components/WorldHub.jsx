import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, std, makeStudent, animateStudent, makeTree, makeRedPanda, makeModernBuilding, makeNewariHouse, makeShop, makeCrowd, makePrayerFlags, makeSkyTexture, makeGroundTexture } from '../game/nepalKit.js';
import { useGameStore, TOTAL_LEVELS } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

const SPEED = 8, PR = 0.5, BOUND = 72;

export default function WorldHub() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const done = useGameStore((s) => s.done);
  const restored = Object.keys(done || {}).length;
  const health = Math.min(1, restored / TOTAL_LEVELS);

  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const camModeRef = useRef(0);
  const [view, setView] = useState(0);
  const mountRef = useRef(null), stageRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    let raf = 0, ended = false;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 560;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture(0x86c8c4);
    const fogN = THREE.MathUtils.lerp(26, 64, health), fogF = THREE.MathUtils.lerp(95, 175, health);
    scene.fog = new THREE.Fog(new THREE.Color(0x9a958a).lerp(new THREE.Color(0xe2efe6), health), fogN, fogF);
    const camera = new THREE.PerspectiveCamera(54, W / H, 0.1, 600); camera.position.set(0, 12, 18);

    scene.add(new THREE.HemisphereLight(0xdaf0e6, 0x5f6f48, THREE.MathUtils.lerp(0.72, 1.0, health)));
    const sun = new THREE.DirectionalLight(0xfff1d4, THREE.MathUtils.lerp(0.9, 1.55, health)); sun.position.set(-46, 70, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; scene.add(sun);

    // big ground — dune-brown when unhealed, green when healed
    const ground = new THREE.Mesh(new THREE.CircleGeometry(82, 80), new THREE.MeshToonMaterial({ color: new THREE.Color(0xc2a878).lerp(new THREE.Color(0x6aa84a), health) }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // water bodies
    const water = new THREE.Color(0x6b6a3a).lerp(new THREE.Color(0x4fb0d8), health);
    const mkWater = (geo, x, z) => { const m = new THREE.Mesh(geo, std(0x4fb0d8, { roughness: 0.25, noOutline: true })); m.material.color.copy(water); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); scene.add(m); };
    mkWater(new THREE.PlaneGeometry(10, 165), -30, 0);
    mkWater(new THREE.CircleGeometry(15, 44), 34, -24);
    mkWater(new THREE.CircleGeometry(7, 36), 22, 28);

    const colliders = [];
    const add = (o, x, z, ry = 0) => { o.position.set(x, o.position.y || 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); if (o.userData.radius > 0.7) colliders.push({ x, z, r: o.userData.radius * 0.85 }); return o; };
    const keepout = [{ x: -30, z: 0, r: 8 }, { x: 34, z: -24, r: 15 }, { x: 22, z: 28, r: 8 }];
    const blocked = (x, z, pad) => keepout.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad) || Math.hypot(x, z) < 6;

    // town
    const town = [[makeModernBuilding(), -7, -7], [makeModernBuilding(), 9, -11], [makeNewariHouse(3), -13, 5], [makeNewariHouse(2), 3, 9], [makeShop(0xc98a4b), 11, 5], [makeNewariHouse(3), 16, -4], [makeModernBuilding(), -3, -15], [makeShop(0x8fae5a), -11, -13], [makeNewariHouse(2), 18, 8]];
    town.forEach(([b, x, z], i) => add(b, x, z, i % 2 ? 0.3 : -0.25));

    // forest — health fraction grown, rest stumps
    const kinds = ['green', 'green', 'green', 'cherry', 'purple', 'fruit', 'blossom'];
    const shapes = ['round', 'tall', 'columnar', 'umbrella', 'round'];
    const grown = Math.round(health * 70);
    let placed = 0, guard = 0;
    while (placed < 70 && guard < 5000) {
      guard++; const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 58, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (blocked(x, z, 3)) continue;
      if (placed < grown) { const tr = makeTree(1.0 + Math.random() * 0.9, kinds[placed % kinds.length], shapes[placed % shapes.length]); add(tr, x, z, Math.random() * 6.28); }
      else { const st = cyl(0.2, 0.28, 0.45, 7, 0x6e4a2c); st.position.set(x, 0.22, z); scene.add(st); }
      placed++;
    }

    // litter — lots when unhealed
    const wc = [0xcf5030, 0xd8b020, 0xcfcfcf, 0x6b8a3a, 0x8a5a2b];
    const wasteN = Math.round((1 - health) * 55);
    for (let i = 0, g = 0; i < wasteN && g < 5000; g++) { const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r; if (blocked(x, z, 1.5)) continue; const w = box(0.55, 0.4, 0.55, wc[i % wc.length], { noOutline: true }); w.position.set(x, 0.2, z); w.rotation.y = Math.random() * 6.28; scene.add(w); i++; }

    // red pandas return as the world heals
    const pandas = [];
    const pandaN = Math.max(health >= 1 ? 5 : Math.round(health * 5), health > 0 ? 1 : 0);
    for (let i = 0, g = 0; i < pandaN && g < 3000; g++) { const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r; if (blocked(x, z, 2)) continue; const p = makeRedPanda(1.0); p.position.set(x, 0, z); p.rotation.y = Math.random() * 6.28; p.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(p); pandas.push({ grp: p, bob: Math.random() * 6.28 }); i++; }

    // people who live here
    const crowd = makeCrowd(22, 40, colliders); scene.add(crowd);
    // landmark
    const pole = cyl(0.16, 0.2, 9, 8, 0x8a5a2b); pole.position.set(0, 4.5, 0); scene.add(pole);
    const flags = makePrayerFlags(11, 0.8); flags.position.set(0, 8, 0); scene.add(flags);

    // player
    const student = makeStudent(); student.scale.setScalar(0.8); add(student, 0, 16); student.rotation.y = Math.PI;

    // camera state (same model as the explorer)
    let camYaw = 0, heading = Math.PI, dragging = false, lastX = 0;
    const camOffset = new THREE.Vector3();
    const px = (e) => (e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
    const onDown = (e) => { dragging = true; lastX = px(e); };
    const onMove = (e) => { if (!dragging) return; const x = px(e); camYaw -= (x - lastX) * 0.01; lastX = x; };
    const onUp = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);

    const ro = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); } });
    ro.observe(mount);

    const clock = new THREE.Clock(); let t = 0;
    const step = () => {
      if (ended) return; raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, clock.getDelta()); t += dt;
      const mv = moveRef.current;
      const fwd = (mv.up ? 1 : 0) - (mv.down ? 1 : 0);
      const str = (mv.right ? 1 : 0) - (mv.left ? 1 : 0);
      let moving = false, mx = 0, mz = 0;
      const resolveMove = () => {
        let nx = student.position.x + mx * SPEED * dt, nz = student.position.z + mz * SPEED * dt;
        for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), min = c.r + PR; if (d < min && d > 0.001) { nx = c.x + dx / d * min; nz = c.z + dz / d * min; } }
        const rr = Math.hypot(nx, nz); if (rr > BOUND) { nx = nx / rr * BOUND; nz = nz / rr * BOUND; }
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
      pandas.forEach((p) => { p.bob += dt * 3; p.grp.position.y = Math.abs(Math.sin(p.bob)) * 0.06; });
      if (crowd.userData.update) crowd.userData.update(dt);

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
      renderer.domElement.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [health]);

  useEffect(() => {
    const set = (code, on) => { if (code === 'ArrowUp' || code === 'KeyW') moveRef.current.up = on; else if (code === 'ArrowDown' || code === 'KeyS') moveRef.current.down = on; else if (code === 'ArrowLeft' || code === 'KeyA') moveRef.current.left = on; else if (code === 'ArrowRight' || code === 'KeyD') moveRef.current.right = on; };
    const kd = (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); set(e.code, true); };
    const ku = (e) => set(e.code, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  const press = (dir, on) => { moveRef.current[dir] = on; };
  const fs = () => { const el = stageRef.current; if (!el) return; if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); };
  const toggleCam = () => { camModeRef.current = camModeRef.current ? 0 : 1; setView(camModeRef.current); };
  const dpad = { width: 54, height: 54, borderRadius: 14, border: 'none', background: 'rgba(20,40,28,.8)', color: '#fff', fontWeight: 800, cursor: 'pointer', touchAction: 'none' };
  const chip = { border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.85)', color: '#1c3326' };

  return (
    <div className="fade-in" style={{ flex: '1 1 0%', minHeight: 440, position: 'relative', padding: '8px 10px 10px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div className="stage" ref={stageRef} style={{ position: 'absolute', inset: '8px 10px 10px', height: 'auto', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#bfe6f4,#dff0e6)' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
        <div style={{ position: 'absolute', top: 12, left: 14, right: 120, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
          <span className="pill" style={{ boxShadow: '0 4px 14px rgba(0,0,0,.18)', whiteSpace: 'nowrap' }}><Icon name="leaf" size={15} /> {tt('Your World', 'तपाईंको संसार')} · {restored}/{TOTAL_LEVELS}</span>
          <div style={{ flex: 1, maxWidth: 320, height: 10, background: 'rgba(255,255,255,.5)', borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}><div style={{ height: '100%', width: `${Math.round(health * 100)}%`, background: 'linear-gradient(90deg,#7cd06a,#2f9e44)' }} /></div>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 6 }}>
          <button onClick={toggleCam} title={view === 1 ? tt('Follow camera', 'फलो क्यामेरा') : tt('Wide camera', 'वाइड क्यामेरा')} style={chip}><Icon name={view === 1 ? 'walk' : 'compass'} size={16} /></button>
          <button onClick={fs} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={chip}><Icon name="expand" size={16} /></button>
        </div>
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,54px)', gridTemplateRows: 'repeat(3,54px)', gap: 6, opacity: 0.95 }}>
          <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('up', true); }} onPointerUp={() => press('up', false)} onPointerLeave={() => press('up', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(90deg)' }} /></button><span />
          <button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('left', true); }} onPointerUp={() => press('left', false)} onPointerLeave={() => press('left', false)}><Icon name="arrowLeft" size={18} /></button><span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('right', true); }} onPointerUp={() => press('right', false)} onPointerLeave={() => press('right', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(180deg)' }} /></button>
          <span /><button style={dpad} onPointerDown={(e) => { e.preventDefault(); press('down', true); }} onPointerUp={() => press('down', false)} onPointerLeave={() => press('down', false)}><Icon name="arrowLeft" size={18} style={{ transform: 'rotate(-90deg)' }} /></button><span />
        </div>
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 4, width: 'min(380px, 56%)', pointerEvents: 'none', background: 'rgba(16,30,22,.84)', backdropFilter: 'blur(4px)', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
          <div style={{ flexShrink: 0, background: '#fff', borderRadius: '50%', padding: 3 }}><BanaFace size={32} /></div>
          <div style={{ color: '#eaffe9', fontWeight: 600, fontSize: '.86rem', lineHeight: 1.4 }}>{health >= 1 ? tt('Green again, end to end — the red pandas are home. You healed it all. 💚', 'सबैतिर फेरि हरियो — रातो पाण्डा घर फर्के। तपाईंले सबै निको पार्नुभयो। 💚') : tt('Walk with arrows / WASD / d-pad — drag to look. Finish missions on the Map to heal more.', 'arrows / WASD / d-pad ले घुम्नुहोस् — हेर्न तान्नुहोस्। नक्सामा मिसन सकेर थप निको पार्नुहोस्।')}</div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, mesh, makeTeraiHouse, makePalm, makeWeather } from '../game/nepalKit.js';
import { makeSkyTexture, makeGroundTexture } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';

const TIME = 60, FLOOD = 1.0, RISE = 0.030, DRAIN_BASE = 0.011, N_DRAINS = 6;
const DRAIN_SPOTS = [[-7, 4], [0, 6], [7, 4], [-8, -3], [1, -4], [8, -2]];

export default function FloodWatchMission() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [phase, setPhase] = useState('play');
  const [hud, setHud] = useState({ level: 0.22, clogs: 0, time: TIME });
  const [result, setResult] = useState(null);
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
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);
    camera.position.set(0, 21, 24); camera.lookAt(0, 0.5, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    const hemi = new THREE.HemisphereLight(0xcdd6dd, 0x55503f, 0.85); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xdfe6ea, 0.7); sun.position.set(-20, 40, 15); scene.add(sun);

    // muddy ground + Terai town
    const ground = mesh(new THREE.PlaneGeometry(60, 50), 0x9c7f4f, { roughness: 1 });
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    { const gt = makeGroundTexture(0x9c7f4f); gt.repeat.set(6, 5); ground.material.map = gt; ground.material.color.set(0xffffff); ground.material.needsUpdate = true; }
    scene.background = makeSkyTexture(0xaab8b5);
    [[-10, 8, 2], [0, 9, 1], [10, 8, 2], [-11, -7, 1], [11, -7, 2], [0, -9, 1]].forEach(([x, z, st]) => { const h = makeTeraiHouse(st); h.position.set(x, 0, z); h.rotation.y = (Math.random() - 0.5); scene.add(h); });
    [[-14, 0], [14, 2], [-3, 11], [5, -11]].forEach(([x, z]) => { const p = makePalm(1.1); p.position.set(x, 0, z); scene.add(p); });

    // rising flood water
    const water = mesh(new THREE.PlaneGeometry(120, 120), 0x4a6b8a, { transparent: true, opacity: 0.82, roughness: 0.4, metalness: 0.1 });
    water.rotation.x = -Math.PI / 2; scene.add(water);
    const waterY = (lvl) => -0.6 + lvl * 2.2;

    // drains (click to clear when clogged)
    const drains = [];
    const pickables = [];
    DRAIN_SPOTS.forEach(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const grate = cyl(0.62, 0.62, 0.12, 12, 0x3a3a3a); grate.position.y = 0.06; g.add(grate);
      const bars = box(1.0, 0.04, 0.12, 0x555555); bars.position.y = 0.13; g.add(bars);
      const debris = new THREE.Group();
      [0x6b8a3a, 0xb0633a, 0xcfcfcf].forEach((c, i) => { const d = box(0.3, 0.2, 0.3, c); d.position.set((i - 1) * 0.25, 0.2, 0); d.rotation.y = i; debris.add(d); });
      debris.visible = false; g.add(debris);
      const hit = mesh(new THREE.CircleGeometry(1.3, 16), 0xffffff, { transparent: true, opacity: 0 }); hit.rotation.x = -Math.PI / 2; hit.position.y = 0.02; g.add(hit);
      scene.add(g);
      const drain = { grate, debris, hit, clogged: false };
      hit.userData.drain = drain; pickables.push(hit);
      drains.push(drain);
    });
    const rain = makeWeather('monsoon'); scene.add(rain);

    let level = 0.22, t = TIME, acc = 0, clogT = 1.5;
    let last = performance.now();
    const finish = (win, reason) => { if (ended) return; ended = true; if (win) useGameStore.getState().addEcoPoints(25); setResult({ win, reason }); setPhase('done'); };
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    function onDown(e) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1; ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) { const d = hit.object.userData.drain; if (d.clogged) { d.clogged = false; d.debris.visible = false; if (audio && audio.play) audio.play('tap'); } }
    }
    renderer.domElement.addEventListener('pointerdown', onDown);
    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    const step = (now) => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (!activeRef.current) dt = 0;
      t -= dt; clogT -= dt;
      // clog a random clear drain now and then (a bit faster as the storm builds)
      const interval = 2.6 - (1 - t / TIME) * 1.3;
      if (clogT <= 0) { clogT = interval; const clear = drains.filter((d) => !d.clogged); if (clear.length) { const d = clear[Math.floor(Math.random() * clear.length)]; d.clogged = true; d.debris.visible = true; } }
      const clogged = drains.filter((d) => d.clogged).length;
      level += (clogged * RISE - DRAIN_BASE) * dt;
      if (level < 0) level = 0; if (level > FLOOD) level = FLOOD;
      water.position.y = waterY(level);
      // darken as it worsens
      hemi.intensity = 0.85 - level * 0.4;
      rain.userData.update(dt, { x: 0, z: 0 });

      if (level >= FLOOD) { renderer.render(scene, camera); return finish(false, 'flood'); }
      if (t <= 0) { renderer.render(scene, camera); return finish(true, null); }
      acc += dt; if (acc >= 0.08) { acc = 0; setHud({ level, clogs: clogged, time: Math.max(0, t) }); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      if (rain.userData.dispose) rain.userData.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [phase]);

  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };
  const levelPct = Math.min(100, (hud.level / FLOOD) * 100);

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill"><Icon name="rain" size={16} /> {tt('Dhangadhi · Flood Watch', 'धनगढी · बाढी सतर्कता')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Keep the monsoon water down', 'मनसुनको पानी रोक्नुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">
            {phase === 'play' ? tt('Tap the drains to clear the rubbish blocking them. Blocked drains make the water rise — keep it below the flood line until the storm passes!', 'फोहोरले छेकेका नाली थिचेर सफा गर्नुहोस्। छेकिएका नालीले पानी बढाउँछ — आँधी नसकिएसम्म बाढी रेखामुनि राख्नुहोस्!') : (result?.win ? tt('The storm passed and the town stayed dry!', 'आँधी टर्‍यो, सहर सुक्खै रह्यो!') : tt('The drains blocked and the town flooded.', 'नाली छेकिए र सहर डुब्यो।'))}
          </div>
        </div>
      </div>

      {phase === 'play' && (
        <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 900, margin: '0 auto', height: 'clamp(360px, 60vh, 600px)', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(#8a97a3,#b6bfc6)' }}>
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', gap: 8 }}>
            <span className="pill" style={{ pointerEvents: 'auto' }}><Icon name="warning" size={15} style={{ verticalAlign: '-3px', marginRight: 3 }} /> {tt('Blocked', 'छेकिएको')}: {hud.clogs}</span>
            <span style={{ fontWeight: 800, background: 'rgba(255,255,255,.82)', borderRadius: 8, padding: '3px 8px' }}><Icon name="clock" size={14} style={{ verticalAlign: '-2px', marginRight: 3 }} /> {Math.ceil(hud.time)}s</span>
          </div>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} data-fs style={{ position: 'absolute', top: 42, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>
          {/* water level meter */}
          <div style={{ position: 'absolute', left: 14, top: 56, width: 24, height: 150, background: 'rgba(255,255,255,.7)', borderRadius: 12, overflow: 'hidden', border: '2px solid #c2c8cc' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12%', borderBottom: '2px dashed #e23c3c' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${levelPct}%`, background: levelPct > 80 ? '#e23c3c' : levelPct > 55 ? '#e8a33b' : '#4a8fc0', transition: 'height .1s' }} />
          </div>
          <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,.8)', borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: '.78rem' }}>{tt('Tap blocked drains to clear them', 'छेकिएका नाली थिचेर सफा गर्नुहोस्')}</div>
        </div>
      )}

      {phase === 'done' && (
        <div className="card center" style={{ maxWidth: 560, margin: '0 auto' }}>
          {result?.win ? (
            <>
              <div style={{ color: 'var(--sun)', display: 'grid', placeItems: 'center' }}><Icon name="sun" size={42} /></div>
              <h2 style={{ margin: '6px 0' }}>{tt('Town stayed dry!', 'सहर सुक्खै रह्यो!')}</h2>
              <p className="muted" style={{ fontWeight: 600 }}>{tt('Plastic and rubbish block drains and cause urban floods. Keeping drains clear — and waste out of them — protects towns as monsoons grow stronger.', 'प्लास्टिक र फोहोरले नाली छेक्छ र सहरी बाढी ल्याउँछ। नाली सफा राख्दा बलियो मनसुनमा पनि सहर जोगिन्छ।')}</p>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--danger)', display: 'grid', placeItems: 'center' }}><Icon name="droplet" size={42} /></div>
              <h2 style={{ margin: '6px 0', color: 'var(--danger)' }}>{tt('Mission failed', 'मिसन असफल')}</h2>
              <p style={{ fontWeight: 700 }}>{tt('Blocked drains let the water rise and flood the town.', 'छेकिएका नालीले पानी बढाएर सहर डुबायो।')}</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button className="btn" onClick={restart}>{tt('Try again', 'फेरि')}</button>
          </div>
        </div>
      )}

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Tap drains to unblock them · keep the water below the red line for 60 seconds.', 'नाली थिचेर खोल्नुहोस् · ६० सेकेन्ड पानी रातो रेखामुनि राख्नुहोस्।')}
      </div>
    </div>
  );
}

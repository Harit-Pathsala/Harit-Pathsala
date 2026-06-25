import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, std } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { useLang } from '../i18n.jsx';
import { useGameStore } from '../state/gameStore.ts';

// Real emission factors (kg CO2e) — from src/logic.js
const STOVES = {
  firewood:  { en: 'Firewood chulho', ne: 'दाउरा चुलो', icon: 'logs', heat: 22, cool: 16, burn: 0.110, smoke: true, color: 0x8a5a32,
    tip_en: 'Cheapest, but the most CO₂ — plus smoke and glacier-darkening soot.', tip_ne: 'सस्तो, तर सबैभन्दा बढी CO₂, धुवाँ र हिमाल कालो पार्ने कालो।' },
  lpg:       { en: 'LPG gas', ne: 'ग्यास', icon: 'cylinder', heat: 40, cool: 12, burn: 0.070, smoke: false, color: 0x3170c0,
    tip_en: 'Fast and clean-burning, but imported fossil fuel — medium CO₂.', tip_ne: 'छिटो र सफा बल्छ, तर आयातित जीवाश्म इन्धन — मध्यम CO₂।' },
  induction: { en: 'Electric induction', ne: 'इन्डक्सन', icon: 'induction', heat: 50, cool: 14, burn: 0.012, smoke: false, color: 0x444b55,
    tip_en: 'Cleanest on Nepal\u2019s hydro grid — least CO₂, no smoke.', tip_ne: 'नेपालको जलविद्युत्‌मा सबैभन्दा सफा — कम CO₂, धुवाँ छैन।' },
};
const DISHES = [
  { en: 'Rice', ne: 'भात', icon: 'bowl' }, { en: 'Dal', ne: 'दाल', icon: 'bowl' }, { en: 'Greens', ne: 'साग', icon: 'veg' },
];
const GREEN_LO = 50, GREEN_HI = 82, BURN_T = 88;
const GREEN_BUDGET = 0.45, OK_BUDGET = 0.95, CARBON_CAP = 1.7, TIME = 75;

export default function CookingMission({ onWin, onMap }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o, k) => (lang === 'ne' && o[`${k}_ne`] !== undefined ? o[`${k}_ne`] : o[k]);

  const [phase, setPhase] = useState('intro');
  const [stoveKey, setStoveKey] = useState(null);
  const [hud, setHud] = useState({ temp: 20, carbon: 0, burn: 0, dish: 0, done: 0, time: TIME });
  const [result, setResult] = useState(null);
  const heatRef = useRef(false);
  const runRef = useRef(0);
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const activeRef = useGameActiveRef();

  const stove = stoveKey ? STOVES[stoveKey] : null;
  const begin = (key) => { setStoveKey(key); setResult(null); setPhase('cook'); runRef.current++; };

  // 3D kitchen scene + cooking loop
  useEffect(() => {
    if (phase !== 'cook' || !stove) return;
    const mount = mountRef.current; if (!mount) return;
    const myRun = runRef.current;
    let raf = 0, ended = false;

    const W = mount.clientWidth || 720, H = mount.clientHeight || 420;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3e7cf);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 3.5, 5.0);
    camera.lookAt(0, 1.2, -1);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xfff2da, 0x6b5535, 1.0));
    const lamp = new THREE.PointLight(0xffd9a0, 0.9, 30); lamp.position.set(1.5, 5, 3); scene.add(lamp);

    // kitchen shell — mud floor + two walls (Terai/hill home)
    const floor = box(11, 0.4, 9, 0x8a6b46); floor.position.y = -0.2; scene.add(floor);
    const back = box(11, 6, 0.4, 0xcdb487); back.position.set(0, 2.8, -4.3); scene.add(back);
    const side = box(0.4, 6, 9, 0xc2a87a); side.position.set(-5.3, 2.8, 0); scene.add(side);
    const wnd = box(2.4, 1.8, 0.1, 0x9fd3e6); wnd.position.set(1.6, 3.2, -4.05); scene.add(wnd);
    // view through the window: green hill + a snow peak
    const vhill = cone(3.2, 2.0, 4, 0x5fa052); vhill.position.set(1.4, 2.6, -6.6); scene.add(vhill);
    const vpeak = cone(1.5, 2.4, 4, 0xeef4ff); vpeak.position.set(2.4, 3.5, -7.4); scene.add(vpeak);
    const wf1 = box(2.6, 0.12, 0.12, 0x7a5a3a); wf1.position.set(1.6, 4.15, -4.0); scene.add(wf1);
    const wf2 = box(2.6, 0.12, 0.12, 0x7a5a3a); wf2.position.set(1.6, 2.25, -4.0); scene.add(wf2);
    const wf3 = box(0.12, 2.0, 0.12, 0x7a5a3a); wf3.position.set(1.6, 3.2, -4.0); scene.add(wf3);
    // wall shelf with jars + a spare pot
    const shelf = box(3.4, 0.12, 0.6, 0x8a5a32); shelf.position.set(-3.0, 3.4, -3.9); scene.add(shelf);
    [-3.9, -3.2, -2.5].forEach((sx, i) => { const jar = cyl(0.22, 0.22, 0.42, 10, [0xc0894a, 0xd8b24a, 0x9c6b3f][i]); jar.position.set(sx, 3.72, -3.9); scene.add(jar); });
    const shelfPot = cyl(0.34, 0.28, 0.34, 14, 0x9aa0a6); shelfPot.position.set(-2.0, 3.72, -3.9); scene.add(shelfPot);
    // hanging ladles
    [-1.1, -0.6, -0.1].forEach((hx) => { const u = cyl(0.04, 0.04, 0.7, 6, 0xb0b6bd); u.position.set(hx, 4.3, -3.95); scene.add(u); const uh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb0b6bd })); uh.position.set(hx, 3.97, -3.92); scene.add(uh); });
    // cutting board + veggies on the counter
    const boardc = box(0.9, 0.08, 0.6, 0xead9b8); boardc.position.set(2.0, 1.05, -1.0); scene.add(boardc);
    [[1.8, 0x4caf50], [2.1, 0xe2683c], [2.3, 0xd8b24a]].forEach(([vx, vc]) => { const v = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: vc })); v.position.set(vx, 1.17, -1.0); v.scale.set(1, 0.8, 1.3); scene.add(v); });
    // clay water jug
    const jug = cyl(0.26, 0.32, 0.6, 14, 0xb05a30); jug.position.set(-2.1, 1.4, -1.0); scene.add(jug);
    const jugNeck = cyl(0.12, 0.16, 0.22, 10, 0xb05a30); jugNeck.position.set(-2.1, 1.78, -1.0); scene.add(jugNeck);

    // counter + stove block
    const counter = box(6, 1, 2.4, 0xb9925f); counter.position.set(0, 0.5, -1); scene.add(counter);
    const stoveBlock = box(2.2, 0.5, 2, stove.color); stoveBlock.position.set(0, 1.05, -1); scene.add(stoveBlock);
    const ring = cyl(0.7, 0.7, 0.12, 20, 0x2b2b2b); ring.position.set(0, 1.32, -1); scene.add(ring);
    const pot = cyl(0.62, 0.52, 0.7, 22, 0x6b7077); pot.position.set(0, 1.7, -1); scene.add(pot);
    const potRim = cyl(0.66, 0.66, 0.1, 22, 0x868d95); potRim.position.set(0, 2.05, -1); scene.add(potRim);

    // flame (scales with heat hold)
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0xffb43a, emissive: 0xff6a00, emissiveIntensity: 1.4, transparent: true, opacity: 0.92 }));
    flame.position.set(0, 1.55, -1); scene.add(flame);
    if (stoveKey === 'induction') { flame.material.color.set(0xff5a4a); flame.material.emissive.set(0xff2a1a); }

    // puff pool (smoke for firewood / steam in the green band)
    const puffGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0 }));
      m.userData = { life: -1, smoke: false }; scene.add(m); puffs.push(m);
    }
    const dishBowls = [-1.7, 0, 1.7].map((dx) => {
      const b = cyl(0.34, 0.28, 0.22, 16, 0xd9c7a0); b.position.set(dx, 1.42, 0.7); scene.add(b);
      const food = cyl(0.27, 0.27, 0.12, 16, 0x9a8e74); food.position.set(dx, 1.55, 0.7); scene.add(food);
      return { food };
    });

    // ── cooking state ──
    let temp = 20, carbon = 0, burn = 0, dish = 0, done = 0, t = TIME, acc = 0, puffT = 0;
    let last = performance.now();
    const finish = (win, rating, reason) => { if (ended) return; ended = true; if (win) onWin && onWin(); if (win) useGameStore.getState().addEcoPoints(rating === 'green' ? 30 : rating === 'ok' ? 20 : 12); setResult({ win, rating, reason }); setPhase('done'); };
    const spawnPuff = (smoke) => {
      const p = puffs.find((q) => q.userData.life < 0); if (!p) return;
      p.position.set((Math.random() - 0.5) * 0.4, 2.2, -1 + (Math.random() - 0.5) * 0.4);
      p.userData.life = 1; p.userData.smoke = smoke;
      p.material.color.set(smoke ? 0x555555 : 0xeeeeee);
      p.scale.setScalar(smoke ? 0.7 : 0.5);
    };

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    const step = (now) => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (!activeRef.current) dt = 0;
      t -= dt;
      const heating = heatRef.current;
      if (heating) { temp += stove.heat * dt; carbon += stove.burn * dt; }
      else temp -= stove.cool * dt;
      if (temp < 0) temp = 0; if (temp > 100) temp = 100;
      const inZone = temp >= GREEN_LO && temp <= GREEN_HI;
      if (inZone) done += 18 * dt;
      if (temp > BURN_T) burn += 30 * dt; else burn = Math.max(0, burn - 22 * dt);

      // visuals
      const lvl = Math.max(0.05, temp / 100);
      flame.visible = heating || temp > 30;
      flame.scale.set(0.7 + lvl * 0.6, 0.5 + lvl * 1.7 * (heating ? 1.1 : 0.7), 0.7 + lvl * 0.6);
      flame.material.emissiveIntensity = 1.0 + lvl * 1.2;
      if (temp > BURN_T) flame.material.emissive.set(0xff2a00); else if (stoveKey !== 'induction') flame.material.emissive.set(0xff6a00);
      dishBowls.forEach((b, i) => { b.food.material.color.set(i < dish ? 0xead27a : 0x9a8e74); });
      puffT += dt;
      if (puffT > 0.5) { puffT = 0; if (stove.smoke && temp > 45) spawnPuff(true); else if (inZone && Math.random() < 0.7) spawnPuff(false); }
      puffs.forEach((p) => { if (p.userData.life >= 0) { p.userData.life -= dt * 0.55; p.position.y += dt * (p.userData.smoke ? 1.4 : 1.0); p.scale.multiplyScalar(1 + dt * 0.6); p.material.opacity = Math.max(0, p.userData.life) * (p.userData.smoke ? 0.55 : 0.4); if (p.userData.life < 0) p.material.opacity = 0; } });

      // gentle camera sway around the stove for a 3D feel
      const ang = Math.sin(now / 4200) * 0.34;
      camera.position.set(Math.sin(ang) * 6.0, 3.5, -1 + Math.cos(ang) * 6.0);
      camera.lookAt(0, 1.2, -1);

      if (burn >= 100) { renderer.render(scene, camera); return finish(false, null, 'burnt'); }
      if (carbon > CARBON_CAP) { renderer.render(scene, camera); return finish(false, null, 'smoke'); }
      if (done >= 100) { dish += 1; done = 0; if (audio && audio.play) audio.play('sparkle'); if (dish >= DISHES.length) { const rating = carbon <= GREEN_BUDGET ? 'green' : carbon <= OK_BUDGET ? 'ok' : 'smoky'; renderer.render(scene, camera); return finish(true, rating, null); } }
      if (t <= 0) { renderer.render(scene, camera); return finish(false, null, 'late'); }

      acc += dt; if (acc >= 0.08) { acc = 0; setHud({ temp, carbon, burn, dish, done, time: Math.max(0, t) }); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); }
      });
      puffGeo.dispose();
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [phase, stove, stoveKey]);

  useEffect(() => {
    if (phase !== 'cook') return;
    const dn = (e) => { if (e.code === 'Space') { e.preventDefault(); heatRef.current = true; } };
    const up = (e) => { if (e.code === 'Space') { e.preventDefault(); heatRef.current = false; } };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); heatRef.current = false; };
  }, [phase]);

  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el); }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  };

  const inZone = hud.temp >= GREEN_LO && hud.temp <= GREEN_HI;
  const carbonPct = Math.min(100, (hud.carbon / CARBON_CAP) * 100);

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="bowl" size={16} /> {tt('Gorkha · Clean Cooking', 'गोरखा · सफा खाना पकाउने')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Cook the family dal-bhat', 'परिवारको दालभात पकाउनुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">
            {phase === 'intro' && tt('Pick a stove, then hold the heat in the green band to cook each dish. Greener fuel = less CO₂ and cleaner air!', 'चुलो रोज्नुहोस्, अनि तापलाई हरियो घेरामा राखेर हरेक परिकार पकाउनुहोस्। हरियो इन्धन = कम CO₂ र सफा हावा!')}
            {phase === 'cook' && (hud.burn > 40 ? tt('Too hot — ease off or it burns!', 'धेरै तातो — नत्र जल्छ!') : !inZone && hud.temp < GREEN_LO ? tt('Add heat to reach the green band.', 'हरियो घेरामा पुग्न ताप थप्नुहोस्।') : tt('Perfect — hold it in the green!', 'राम्रो — हरियोमा राख्नुहोस्!'))}
            {phase === 'done' && (result?.win ? tt('Dal-bhat served! See your carbon rating below.', 'दालभात तयार! तलको कार्बन मूल्याङ्कन हेर्नुहोस्।') : tt('Mission failed — try a cleaner, steadier cook.', 'मिसन असफल — सफा र स्थिर तरिकाले पकाउनुहोस्।'))}
          </div>
        </div>
      </div>

      {phase === 'intro' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
          <h3 style={{ marginTop: 0 }}>{tt('Choose your stove', 'चुलो रोज्नुहोस्')}</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(STOVES).map(([key, s]) => (
              <button key={key} className="btn" onClick={() => begin(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', background: '#f2f7ee', color: 'inherit', border: '2px solid #cfe0c4' }}>
                <span style={{ fontSize: '1.8rem' }}>{s.emoji}</span>
                <span style={{ flex: 1 }}><b>{L(s, 'en')}</b><small className="muted" style={{ display: 'block', fontWeight: 600 }}>{L(s, 'tip')}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'cook' && stove && (
        <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 760, margin: '0 auto', height: 'clamp(340px, 56vh, 560px)', borderRadius: 16, overflow: 'hidden', background: '#f3e7cf' }}>
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

          <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
            <span className="pill" style={{ pointerEvents: 'auto' }}><Icon name={stove.icon} size={16} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} /> {L(stove, 'en')}</span>
            <span style={{ fontWeight: 800, background: 'rgba(255,255,255,.8)', borderRadius: 8, padding: '3px 8px' }}><Icon name="clock" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 3 }} /> {Math.ceil(hud.time)}s</span>
          </div>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')}
            style={{ position: 'absolute', top: 44, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>

          <div style={{ position: 'absolute', left: 14, top: 56, width: 22, height: 130, background: 'rgba(231,224,210,.85)', borderRadius: 11, overflow: 'hidden', border: '2px solid #d2c8b4' }}>
            <div style={{ position: 'absolute', bottom: `${GREEN_LO}%`, height: `${GREEN_HI - GREEN_LO}%`, left: 0, right: 0, background: 'rgba(64,180,80,.4)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${hud.temp}%`, background: hud.temp > BURN_T ? '#e23c3c' : inZone ? '#2f9e44' : '#e8a33b' }} />
          </div>

          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {DISHES.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,.7)', borderRadius: 8, padding: '3px 0' }}>
                  <div style={{ color: 'var(--ink)' }}><Icon name={d.icon} size={18} />{i < hud.dish ? <Icon name="check" size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginLeft: 2, color: '#2f9e44' }} /> : null}</div>
                  <div style={{ height: 6, background: '#e7e0d2', borderRadius: 4, overflow: 'hidden', margin: '2px 6px 0' }}>
                    <div style={{ height: '100%', width: `${i < hud.dish ? 100 : i === hud.dish ? hud.done : 0}%`, background: '#2f9e44' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,.78)', borderRadius: 8, padding: '5px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '.78rem' }}>
                <span>{tt('Carbon', 'कार्बन')}: {hud.carbon.toFixed(2)} kg</span>
                <span className="muted">{tt('green ≤', 'हरियो ≤')} {GREEN_BUDGET} · {tt('cap', 'सीमा')} {CARBON_CAP}</span>
              </div>
              <div style={{ position: 'relative', height: 10, background: '#e7e0d2', borderRadius: 5, overflow: 'hidden', marginTop: 3 }}>
                <div style={{ position: 'absolute', left: `${(GREEN_BUDGET / CARBON_CAP) * 100}%`, top: 0, bottom: 0, width: 2, background: '#2f9e44' }} />
                <div style={{ position: 'absolute', left: `${(OK_BUDGET / CARBON_CAP) * 100}%`, top: 0, bottom: 0, width: 2, background: '#e8a33b' }} />
                <div style={{ height: '100%', width: `${carbonPct}%`, background: carbonPct > (OK_BUDGET / CARBON_CAP) * 100 ? '#e23c3c' : carbonPct > (GREEN_BUDGET / CARBON_CAP) * 100 ? '#e8a33b' : '#2f9e44' }} />
              </div>
            </div>
            <button className="btn"
              onPointerDown={(e) => { e.preventDefault(); heatRef.current = true; }}
              onPointerUp={() => { heatRef.current = false; }} onPointerLeave={() => { heatRef.current = false; }}
              style={{ fontSize: '1rem', padding: '12px', userSelect: 'none', touchAction: 'none' }}>
              <Icon name="flame" size={16} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 5 }} /> {tt('Hold to add heat', 'ताप थप्न थिच्नुहोस्')} <small style={{ opacity: 0.8 }}>({tt('or Space', 'वा Space')})</small>
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10,18,12,.42)', backdropFilter: 'blur(7px)' }}><div className="card center" style={{ maxWidth: 470, margin: 0, maxHeight: '88vh', overflowY: 'auto' }}>
          {result?.win ? (
            <>
              <div style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name={result.rating === 'green' ? 'leaf' : result.rating === 'ok' ? 'bowl' : 'smog'} size={42} /></div>
              <h2 style={{ margin: '6px 0' }}>{result.rating === 'green' ? tt('Green Chef!', 'हरियो भान्से!') : result.rating === 'ok' ? tt('Well cooked', 'राम्रो पकायो') : tt('Cooked, but smoky', 'पाक्यो, तर धुवाँदार')}</h2>
              <p style={{ fontWeight: 700 }}>{tt('Meal carbon', 'खानाको कार्बन')}: <b>{hud.carbon.toFixed(2)} kg CO₂</b></p>
              <p className="muted" style={{ fontWeight: 600 }}>{result.rating === 'green' ? tt('Induction on Nepal\u2019s hydro grid is the cleanest way to cook.', 'नेपालको जलविद्युत्‌मा इन्डक्सन सबैभन्दा सफा हो।') : tt('Switching toward induction would cut this further.', 'इन्डक्सनतिर सर्दा यो अझ घट्छ।')}</p>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--danger)', display: 'grid', placeItems: 'center' }}><Icon name={result?.reason === 'burnt' ? 'flame' : result?.reason === 'smoke' ? 'smog' : 'clock'} size={42} /></div>
              <h2 style={{ margin: '6px 0', color: 'var(--danger)' }}>{tt('Mission failed', 'मिसन असफल')}</h2>
              <p style={{ fontWeight: 700 }}>{result?.reason === 'burnt' ? tt('The dish burned — too much heat.', 'परिकार जल्यो — धेरै ताप।') : result?.reason === 'smoke' ? tt('Too much fuel burned — smoke filled the kitchen.', 'धेरै इन्धन बल्यो — भान्सा धुवाँले भरियो।') : tt('Ran out of time before the meal was ready.', 'खाना तयार हुनुअघि समय सकियो।')}</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            {result?.win ? (
            <button className="btn" onClick={onMap}>{tt('Continue', 'जारी राख्नुहोस्')}</button>
          ) : (
            <>
              <button className="btn" onClick={() => setPhase('intro')}>{tt('Try again', 'फेरि')}</button>
              <button className="btn" onClick={onMap} style={{ background: '#eef3ee', color: '#1c3326' }}>{tt('Back to map', 'नक्सामा फर्कनुहोस्')}</button>
            </>
          )}
          </div>
        </div></div>
      )}
    </div>
  );
}

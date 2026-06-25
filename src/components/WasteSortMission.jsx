import Icon from './Icons.jsx';
import { useGameActiveRef } from '../game/gameGate.js';
import { stickerTexture, BIN_ICON, hex } from '../game/lineIcons.js';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, makeGreenHills } from '../game/nepalKit.js';
import { makeSkyTexture, makeGroundTexture } from '../game/nepalKit.js';
import { audio } from '../game/audio.ts';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import { useLang } from '../i18n.jsx';

const TARGET = 16, MISTAKE_CAP = 6, TIME = 95;
const T_START = 4.2, T_MIN = 2.4;   // per-item decision time (shrinks with progress)

// real-ish categories for Nepal household/market waste
const ITEMS = [
  { en: 'Banana peel', ne: 'केराको बोक्रा', cat: 'compost' },
  { en: 'Vegetable scraps', ne: 'तरकारीको फोहोर', cat: 'compost' },
  { en: 'Leftover rice', ne: 'बाँकी भात', cat: 'compost' },
  { en: 'Tea leaves', ne: 'चियापत्ती', cat: 'compost' },
  { en: 'Eggshell', ne: 'अण्डाको बोक्रा', cat: 'compost' },
  { en: 'Apple core', ne: 'स्याउको गुदी', cat: 'compost' },
  { en: 'Plastic bottle', ne: 'प्लास्टिक बोतल', cat: 'recycle' },
  { en: 'Tin can', ne: 'टिनको डब्बा', cat: 'recycle' },
  { en: 'Newspaper', ne: 'अखबार', cat: 'recycle' },
  { en: 'Cardboard', ne: 'कार्डबोर्ड', cat: 'recycle' },
  { en: 'Glass bottle', ne: 'सिसाको बोतल', cat: 'recycle' },
  { en: 'Plastic bag', ne: 'प्लास्टिक झोला', cat: 'landfill' },
  { en: 'Candy wrapper', ne: 'चकलेटको खोल', cat: 'landfill' },
  { en: 'Broken plate', ne: 'फुटेको थाल', cat: 'landfill' },
  { en: 'Old sponge', ne: 'पुरानो स्पन्ज', cat: 'landfill' },
];
const BINS = [
  { cat: 'compost', en: 'Compost', ne: 'कम्पोस्ट', color: 0x4a9e3f, x: -4.2 },
  { cat: 'recycle', en: 'Recycle', ne: 'पुनःप्रयोग', color: 0x2f7fc0, x: 0 },
  { cat: 'landfill', en: 'Landfill', ne: 'ल्यान्डफिल', color: 0x7a7a7a, x: 4.2 },
];

function emojiTexture(emoji) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 160;
  const x = c.getContext('2d'); x.clearRect(0, 0, 160, 160);
  x.font = '120px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 80, 92);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

export default function WasteSortMission({ onWin, onMap }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [phase, setPhase] = useState('play');
  const [hud, setHud] = useState({ score: 0, mistakes: 0, time: TIME, frac: 1, item: ITEMS[0] });
  const [result, setResult] = useState(null);
  const [flash, setFlash] = useState(null); // 'good' | 'bad'
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const activeRef = useGameActiveRef();
  const runRef = useRef(0);
  const apiRef = useRef({});
  const restart = () => { setResult(null); setFlash(null); setHud({ score: 0, mistakes: 0, time: TIME, frac: 1, item: ITEMS[0] }); setPhase('play'); runRef.current++; };

  useEffect(() => {
    if (phase !== 'play') return;
    const mount = mountRef.current; if (!mount) return;
    const myRun = runRef.current; let raf = 0, ended = false;
    const W = mount.clientWidth || 760, H = mount.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);
    camera.position.set(0, 4.6, 11.5); camera.lookAt(0, 2.1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7d55, 1.0));
    const sun = new THREE.DirectionalLight(0xfff3da, 0.9); sun.position.set(-10, 20, 12); scene.add(sun);

    // hill-town market ground + stalls + hills behind
    const ground = mesh(new THREE.PlaneGeometry(50, 40), 0xb9a06a, { roughness: 1 }); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    { const gt = makeGroundTexture(0xb9a06a); gt.repeat.set(6, 5); ground.material.map = gt; ground.material.color.set(0xffffff); ground.material.needsUpdate = true; }
    scene.background = makeSkyTexture(0xa8dcd5);
    const hills = makeGreenHills({ count: 8, radius: 60, height: 16 }); hills.position.z = -22; scene.add(hills);
    [-7, 0, 7].forEach((x, i) => {
      const stall = new THREE.Group(); stall.position.set(x, 0, -6);
      const top = box(4.2, 0.2, 2.4, [0xd84f4f, 0x4f86d8, 0x4fb06a][i]); top.position.y = 2.6; stall.add(top);
      [-1.9, 1.9].forEach((px) => { const leg = cyl(0.08, 0.08, 2.6, 6, 0x6b4f2a); leg.position.set(px, 1.3, 0); stall.add(leg); });
      const table = box(4, 0.15, 1.6, 0x8a6a3a); table.position.set(0, 1.0, 0); stall.add(table);
      for (let k = 0; k < 5; k++) { const v = mesh(new THREE.SphereGeometry(0.22, 8, 8), [0xe2602f, 0x6fbf3a, 0xd8b020][k % 3]); v.position.set(-1.6 + k * 0.8, 1.2, 0); stall.add(v); }
      scene.add(stall);
    });

    // three bins
    const binMeshes = BINS.map((b) => {
      const g = new THREE.Group(); g.position.set(b.x, 0, 2.2);
      const body = cyl(0.85, 0.7, 1.5, 16, b.color); body.position.y = 0.75; g.add(body);
      const lip = cyl(0.95, 0.95, 0.16, 16, b.color); lip.position.y = 1.55; g.add(lip);
      const lid = cyl(0.92, 0.92, 0.1, 16, 0x000000, { transparent: true, opacity: 0.18 }); lid.position.y = 1.62; g.add(lid);
      const tex = stickerTexture({ icon: BIN_ICON[b.cat], label: lang === 'ne' ? b.ne : b.en, accent: hex(b.color) }); const label = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); label.position.set(0, 0.85, 0.72); g.add(label);
      scene.add(g);
      return { group: g, body, baseY: 0.75 };
    });

    // current item billboard
    let itemTex = stickerTexture({ label: lang === 'ne' ? ITEMS[0].ne : ITEMS[0].en });
    const itemMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: itemTex, transparent: true }));
    itemMesh.position.set(0, 3.0, 0.5); scene.add(itemMesh);

    let score = 0, mistakes = 0, t = TIME, itemT = T_START, acc = 0;
    let current = null, flying = null, prevIdx = -1;
    const homeY = 3.0;

    const pick = () => { let i; do { i = (Math.random() * ITEMS.length) | 0; } while (i === prevIdx && ITEMS.length > 1); prevIdx = i; return ITEMS[i]; };
    const spawn = () => {
      current = pick();
      const old = itemMesh.material.map; itemMesh.material.map = stickerTexture({ label: lang === 'ne' ? current.ne : current.en }); itemMesh.material.needsUpdate = true; if (old) old.dispose();
      itemMesh.position.set(0, homeY, 0.5); itemMesh.scale.setScalar(1); itemMesh.visible = true;
      const span = TARGET > 1 ? score / TARGET : 1; itemT = T_START - (T_START - T_MIN) * span;
      setHud({ score, mistakes, time: Math.max(0, t), frac: 1, item: current });
    };
    const finish = (win) => { if (ended) return; ended = true; if (win) onWin && onWin(); if (win) useGameStore.getState().addEcoPoints(score >= TARGET ? 30 : 18); setResult({ win, score }); setPhase('done'); };

    const judge = (cat) => {
      if (!current || flying || ended) return;
      const correct = cat === current.cat;
      const bin = BINS.findIndex((b) => b.cat === cat);
      if (correct) { score += 1; if (audio && audio.play) audio.play('sparkle'); }
      else { mistakes += 1; if (audio && audio.play) audio.play('thud'); }
      setFlash(correct ? 'good' : 'bad'); setTimeout(() => setFlash(null), 220);
      flying = { to: binMeshes[bin].group.position, t: 0, correct };
      setHud({ score, mistakes, time: Math.max(0, t), frac: 0, item: current });
    };
    apiRef.current.judge = judge;

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);
    spawn();

    let last = performance.now();
    const step = (now) => {
      if (ended || runRef.current !== myRun) return;
      raf = requestAnimationFrame(step);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (!activeRef.current) dt = 0;
      t -= dt;
      itemMesh.material.rotation = Math.sin(now / 600) * 0.06;

      if (flying) {
        flying.t += dt * 3.2; const k = Math.min(1, flying.t);
        itemMesh.position.lerpVectors(new THREE.Vector3(0, homeY, 0.5), new THREE.Vector3(flying.to.x, 1.2, flying.to.z), k);
        itemMesh.scale.setScalar(1 - k * 0.9);
        if (k >= 1) {
          flying = null; itemMesh.visible = false;
          if (score >= TARGET) { renderer.render(scene, camera); return finish(true); }
          if (mistakes >= MISTAKE_CAP) { renderer.render(scene, camera); return finish(false); }
          spawn();
        }
      } else if (current) {
        itemT -= dt;
        const frac = Math.max(0, itemT / (T_START - (T_START - T_MIN) * (TARGET > 1 ? score / TARGET : 1)));
        itemMesh.position.y = homeY + Math.sin(now / 500) * 0.05;
        if (itemT <= 0) {  // too slow = a miss
          mistakes += 1; if (audio && audio.play) audio.play('thud'); setFlash('bad'); setTimeout(() => setFlash(null), 220);
          itemMesh.visible = false;
          if (mistakes >= MISTAKE_CAP) { renderer.render(scene, camera); return finish(false); }
          spawn();
        } else { acc += dt; if (acc >= 0.06) { acc = 0; setHud({ score, mistakes, time: Math.max(0, t), frac, item: current }); } }
      }
      if (t <= 0 && !ended) { renderer.render(scene, camera); return finish(score >= Math.ceil(TARGET * 0.6)); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      if (itemMesh.material.map) itemMesh.material.map.dispose();
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
  const hearts = Math.max(0, MISTAKE_CAP - hud.mistakes);

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill"><Icon name="basket" size={16} /> {tt('Panchkhal · Waste Sort', 'पाञ्चखाल · फोहोर छुट्याउने')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Sort the market waste', 'बजारको फोहोर छुट्याउनुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">
            {phase === 'play' ? tt('Put each item in the right bin — compost for food scraps, recycle for plastic, glass, metal and paper, landfill for the rest. Be quick, and don\u2019t contaminate the bins!', 'हरेक वस्तु ठीक बिनमा हाल्नुहोस् — खानाको लागि कम्पोस्ट, प्लास्टिक/सिसा/धातु/कागजको लागि, बाँकीको लागि। छिटो गर्नुहोस्!') : (result?.win ? tt('Great sorting! The compost stays clean.', 'राम्रो छुट्याउनुभयो! कम्पोस्ट सफा रह्यो।') : tt('Too many items went in the wrong bin.', 'धेरै वस्तु गलत बिनमा परे।'))}
          </div>
        </div>
      </div>

      {phase === 'play' && (
        <>
          <div className="stage" ref={stageRef} style={{ position: 'relative', maxWidth: 900, margin: '0 auto', height: 'clamp(340px, 56vh, 560px)', borderRadius: 16, overflow: 'hidden', background: flash === 'good' ? 'linear-gradient(#bfe8c0,#dff3e6)' : flash === 'bad' ? 'linear-gradient(#f3c4c4,#f6e0e0)' : 'linear-gradient(#bfe0f4,#eaf6ec)', transition: 'background .2s' }}>
            <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', gap: 8 }}>
              <span className="pill" style={{ pointerEvents: 'auto' }}><Icon name="check" size={15} style={{ verticalAlign: '-3px', marginRight: 3 }} /> {hud.score}/{TARGET}</span>
              <span style={{ fontWeight: 800 }}>{Array.from({ length: MISTAKE_CAP }).map((_, k) => (<Icon key={k} name="heart" size={15} style={{ verticalAlign: '-2px', color: k < hearts ? '#2f9e44' : 'var(--border-soft)' }} />))}</span>
              <span style={{ fontWeight: 800, background: 'rgba(255,255,255,.82)', borderRadius: 8, padding: '3px 8px' }}><Icon name="clock" size={14} style={{ verticalAlign: '-2px', marginRight: 3 }} /> {Math.ceil(hud.time)}s</span>
            </div>
            <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ position: 'absolute', top: 42, right: 12, border: 'none', borderRadius: 8, padding: '5px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.82)' }}><Icon name="expand" size={16} /></button>
            {/* current item label + per-item timer */}
            <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontWeight: 800, background: 'rgba(255,255,255,.85)', borderRadius: 10, padding: '4px 12px' }}>{hud.item.e} {tt(hud.item.en, hud.item.ne)}</div>
              <div style={{ width: 160, height: 7, background: 'rgba(255,255,255,.6)', borderRadius: 4, margin: '6px auto 0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hud.frac * 100}%`, background: hud.frac < 0.3 ? '#e23c3c' : '#2f9e44', transition: 'width .08s linear' }} />
              </div>
            </div>
          </div>
          {/* sorting controls */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', maxWidth: 700, margin: '12px auto 0' }}>
            {BINS.map((b) => (
              <button key={b.cat} onClick={() => apiRef.current.judge && apiRef.current.judge(b.cat)}
                style={{ flex: 1, padding: '14px 8px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', color: '#fff', background: `#${b.color.toString(16).padStart(6, '0')}` }}>
                <div style={{ fontSize: '1.6rem' }}>{b.e}</div>{tt(b.en, b.ne)}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'done' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10,18,12,.42)', backdropFilter: 'blur(7px)' }}><div className="card center" style={{ maxWidth: 470, margin: 0, maxHeight: '88vh', overflowY: 'auto' }}>
          {result?.win ? (
            <>
              <div style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name="basket" size={42} /></div>
              <h2 style={{ margin: '6px 0' }}>{tt('Well sorted!', 'राम्रो छुट्याइयो!')}</h2>
              <p className="muted" style={{ fontWeight: 600 }}>{tt('Sorting waste lets food scraps become compost and plastics, glass and metal be recycled — so far less ends up burning or in a landfill releasing methane.', 'फोहोर छुट्याउँदा खानाको फोहोर कम्पोस्ट बन्छ र प्लास्टिक/सिसा/धातु पुनःप्रयोग हुन्छ — धेरै कम जल्छ वा ल्यान्डफिलमा मिथेन निकाल्छ।')}</p>
              <p style={{ fontWeight: 700 }}>{tt(`Sorted ${result.score} correctly · +${result.score >= TARGET ? 30 : 18} ecopoints`, `${result.score} सही · +${result.score >= TARGET ? 30 : 18} इकोपोइन्ट`)}</p>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--danger)', display: 'grid', placeItems: 'center' }}><Icon name="trash" size={42} /></div>
              <h2 style={{ margin: '6px 0', color: 'var(--danger)' }}>{tt('Bins contaminated', 'बिन दूषित भयो')}</h2>
              <p style={{ fontWeight: 700 }}>{tt('When recycling and compost get mixed with the wrong waste, the whole batch is spoiled.', 'पुनःप्रयोग र कम्पोस्टमा गलत फोहोर मिसिँदा सबै बिग्रन्छ।')}</p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            {result?.win ? (
            <button className="btn" onClick={onMap}>{tt('Continue', 'जारी राख्नुहोस्')}</button>
          ) : (
            <>
              <button className="btn" onClick={restart}>{tt('Play again', 'फेरि खेल्नुहोस्')}</button>
              <button className="btn" onClick={onMap} style={{ background: '#eef3ee', color: '#1c3326' }}>{tt('Back to map', 'नक्सामा फर्कनुहोस्')}</button>
            </>
          )}
          </div>
        </div></div>
      )}

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Tap a bin to sort each item · sort 16 correctly · 6 wrong and the bins are spoiled.', 'हरेक वस्तु बिनमा हाल्नुहोस् · १६ सही · ६ गलत भए बिग्रन्छ।')}
      </div>
    </div>
  );
}

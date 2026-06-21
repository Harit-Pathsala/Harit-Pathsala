import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, cyl, cone, mesh, makeStudent, animateStudent, makeTree, makeNewariHouse, makePagodaTemple } from '../game/nepalKit.js';
import { useLang } from '../i18n.jsx';
import { LOCATIONS } from '../game/locations.js';

// the journey: a single winding trail from START to FINISH (easy -> hard)
const ROUTE = ['butwal', 'lumbini', 'chitwan', 'tansen', 'gorkha', 'baglung', 'pokhara', 'kaligandaki', 'mahendranagar', 'dhangadhi', 'dadeldhura', 'kathmandu_x', 'dhulikhel', 'panchkhal', 'janakpur', 'apihimal', 'himalaya'];
const POS = {};
ROUTE.forEach((id, i) => { const f = i / (ROUTE.length - 1); POS[id] = [Math.sin(f * Math.PI * 2.6) * 34, 50 - f * 100]; });
const EDGES = ROUTE.slice(1).map((id, i) => [ROUTE[i], id]);
const ICON = {
  baglung: '🌲', chitwan: '🌾', kathmandu_x: '🏙️', kaligandaki: '🏞️', himalaya: '🏔️', dhulikhel: '🌄', janakpur: '🛕', lumbini: '☸️',
  butwal: '🛵', tansen: '⚡', gorkha: '🍳', pokhara: '🚣', dhangadhi: '🌧️', apihimal: '🎒', panchkhal: '🧺', mahendranagar: '🦌', dadeldhura: '⛰️',
};
let LAST_NODE = 'butwal';

function emojiTex(e, size) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = `${size || 96}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72); const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t; }
function bannerTex(text, bg) { const c = document.createElement('canvas'); c.width = 256; c.height = 84; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(6, 10, 244, 64); x.fillStyle = '#fff'; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 44); const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t; }

export default function NepalAdventureMap3D({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o) => (lang === 'ne' ? o.ne : o.en);
  const nodes = LOCATIONS.filter((l) => POS[l.id]);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(null);
  const [walking, setWalking] = useState(false);
  const mountRef = useRef(null);
  const stageRef = useRef(null);
  const apiRef = useRef({});

  const adj = {};
  EDGES.forEach(([a, b]) => { if (byId[a] && byId[b]) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); } });
  const bfs = (from, to) => { if (from === to) return [from]; const q = [from], prev = { [from]: null }; while (q.length) { const c = q.shift(); for (const n of (adj[c] || [])) if (!(n in prev)) { prev[n] = c; if (n === to) { const p = [to]; let k = c; while (k != null) { p.unshift(k); k = prev[k]; } return p; } q.push(n); } } return null; };

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    let raf = 0, disposed = false;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 560;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbfe0ef, 120, 260);
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 600);
    camera.position.set(0, 64, 96); camera.lookAt(0, 4, -20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xeafaff, 0x6f8a4a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff3da, 1.0); sun.position.set(-40, 70, 40); scene.add(sun);

    // continuous green valley (landlocked — no sea)
    const ground = mesh(new THREE.PlaneGeometry(300, 230), 0x73b24c, { roughness: 1 }); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // rolling hill mounds for depth
    for (let i = 0; i < 14; i++) { const r = 8 + Math.random() * 10; const hl = mesh(new THREE.SphereGeometry(r, 10, 8), i % 2 ? 0x6aa848 : 0x7cb850, { flatShading: true }); hl.position.set(-120 + Math.random() * 240, -r * 0.78, -50 - Math.random() * 60); hl.scale.y = 0.4; scene.add(hl); }
    // Himalaya backdrop across the north
    const peak = (x, z, h) => { const g = new THREE.Group(); const r = cone(h * 0.62, h, 5, 0x8d97a3); r.position.y = h / 2; g.add(r); const s = cone(h * 0.48, h * 0.6, 5, 0xffffff); s.position.y = h * 0.7; g.add(s); g.position.set(x, 0, z); g.rotation.y = Math.random(); scene.add(g); };
    for (let i = 0; i < 12; i++) peak(-150 + i * 27 + (Math.random() * 8), -78 - Math.random() * 16, 40 + Math.random() * 26);

    // river down the valley (from the mountains) + bridges
    const rivCurve = new THREE.CatmullRomCurve3([[6, -70], [-3, -36], [4, -6], [-4, 24], [3, 52]].map(([x, z]) => new THREE.Vector3(x, 0.15, z)));
    const river = new THREE.Mesh(new THREE.TubeGeometry(rivCurve, 80, 2.2, 8, false), new THREE.MeshStandardMaterial({ color: 0x4fb0e0, roughness: 0.3, metalness: 0.1 })); scene.add(river);
    [[2, 24], [0, -6]].forEach(([x, z]) => { const b = box(8, 0.4, 3.4, 0x9c6b3a); b.position.set(x, 0.5, z); scene.add(b); for (const sx of [-3.6, 3.6]) { const rail = box(0.3, 0.8, 3.4, 0x7a4f28); rail.position.set(x + sx, 0.9, z); scene.add(rail); } });

    const nodeXZ = nodes.map((n) => POS[n.id]);
    const near = (x, z, r) => nodeXZ.some(([ax, az]) => (x - ax) ** 2 + (z - az) ** 2 < r * r);
    // pine forests
    for (let i = 0; i < 70; i++) { const x = -130 + Math.random() * 260, z = -60 + Math.random() * 110; if (near(x, z, 7)) continue; if (Math.abs(x - rivCurve.getPoint((z + 70) / 140 % 1).x) < 5 && z > -70 && z < 52) { /* keep clear of river-ish */ } const t = makeTree(1.4 + Math.random() * 0.9); t.position.set(x, 0, z); t.rotation.y = Math.random() * 6.28; scene.add(t); }
    // a village + temple + terraces tucked beside the trail
    [makeNewariHouse(2), makeNewariHouse(3), makeNewariHouse(2)].forEach((b, i) => { const at = [[40, 6], [46, 1], [37, 11]][i]; b.position.set(at[0], 0, at[1]); b.rotation.y = -0.4; scene.add(b); });
    const temple = makePagodaTemple(); temple.position.set(-42, 0, 2); scene.add(temple);
    for (let s = 0; s < 4; s++) { const step = box(16 - s * 2.4, 0.5, 3, [0x9ccc65, 0x7cb342][s % 2]); step.position.set(-46, 0.25 + s * 0.5, 24 - s * 3); scene.add(step); }

    // dotted golden trail along the route
    EDGES.forEach(([a, b]) => { const [ax, az] = POS[a], [bx, bz] = POS[b]; const len = Math.hypot(bx - ax, bz - az); const steps = Math.max(3, Math.round(len / 2.6)); for (let i = 1; i < steps; i++) { const t = i / steps; const d = mesh(new THREE.CircleGeometry(0.55, 10), 0xe8c66a); d.rotation.x = -Math.PI / 2; d.position.set(ax + (bx - ax) * t, 0.08, az + (bz - az) * t); scene.add(d); } });

    // node markers
    const camQuat = camera.quaternion.clone();
    const pickables = []; const markers = {};
    nodes.forEach((n) => {
      const [x, z] = POS[n.id]; const color = !n.ready ? 0x9aa0a6 : n.kind === 'explorer' ? 0x2f9e44 : 0xe8821e;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const ring = mesh(new THREE.RingGeometry(1.8, 2.4, 28), color, { transparent: true, opacity: 0.95 }); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
      const disc = mesh(new THREE.CircleGeometry(2.0, 24), 0xffffff, { transparent: true, opacity: 0.5 }); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.1; g.add(disc);
      const pole = cyl(0.16, 0.16, 4.6, 8, 0xffffff); pole.position.y = 2.3; g.add(pole);
      const head = mesh(new THREE.SphereGeometry(1.55, 16, 12), color); head.position.y = 5.2; g.add(head);
      const bill = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ map: emojiTex(n.ready ? (ICON[n.id] || '•') : '🔒'), transparent: true })); bill.position.y = 5.2; bill.quaternion.copy(camQuat); g.add(bill);
      const hit = mesh(new THREE.CircleGeometry(3.4, 20), 0xffffff, { transparent: true, opacity: 0 }); hit.rotation.x = -Math.PI / 2; hit.position.y = 0.15; hit.userData.node = n; g.add(hit); pickables.push(hit);
      scene.add(g); markers[n.id] = { ring };
    });
    // START + FINISH banners
    const banner = (id, text, color) => { const [x, z] = POS[id]; const b = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ map: bannerTex(text, color), transparent: true })); b.position.set(x, 8.6, z); b.quaternion.copy(camQuat); scene.add(b); };
    banner(ROUTE[0], tt('START', 'सुरु'), '#2f9e44'); banner(ROUTE[ROUTE.length - 1], tt('FINISH', 'अन्त्य'), '#e23c3c');

    const hero = makeStudent(); hero.scale.setScalar(3.4); const [sx, sz] = POS[byId[LAST_NODE] ? LAST_NODE : 'butwal']; hero.position.set(sx, 0, sz); scene.add(hero);

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    const pickAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.x = ((cx - r.left) / r.width) * 2 - 1; ndc.y = -((cy - r.top) / r.height) * 2 + 1; ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.node : null; };
    const open = (loc) => { if (loc.kind === 'explorer') onExplorer(loc.level); else onMission(loc.missionId); };
    apiRef.current.tap = (node) => { if (apiRef.current.anim) return; if (!node.ready) { setToast(L(node)); setTimeout(() => setToast(null), 1700); return; } if (node.id === LAST_NODE) { open(node); return; } const path = bfs(LAST_NODE, node.id); if (!path || path.length < 2) { open(node); return; } apiRef.current.anim = { pts: path.map((id) => POS[id]), seg: 0, segDist: 0, speed: 44, targetId: node.id, onDone: () => open(node) }; setWalking(true); setHover(null); };

    let downX = 0, downY = 0;
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; };
    const onUp = (e) => { if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) return; const n = pickAt(e.clientX, e.clientY); if (n) apiRef.current.tap(n); };
    const onMove = (e) => { if (apiRef.current.anim) return; const n = pickAt(e.clientX, e.clientY); if (n) { const v = new THREE.Vector3(POS[n.id][0], 5.4, POS[n.id][1]).project(camera); const r = renderer.domElement.getBoundingClientRect(); setHover({ id: n.id, name: L(n), kind: n.kind, ready: n.ready, sx: r.left + (v.x * 0.5 + 0.5) * r.width, sy: r.top + (-v.y * 0.5 + 0.5) * r.height }); renderer.domElement.style.cursor = 'pointer'; } else { setHover(null); renderer.domElement.style.cursor = 'default'; } };
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp); renderer.domElement.addEventListener('pointermove', onMove);
    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    const clock = new THREE.Clock(); let walkPhase = 0;
    function loop() {
      if (disposed) return; raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta()); const now = clock.elapsedTime;
      Object.values(markers).forEach((m) => m.ring.scale.setScalar(1 + Math.sin(now * 2.4) * 0.07));
      const a = apiRef.current.anim;
      if (a) {
        walkPhase += dt * 6; let d = a.speed * dt;
        while (a.seg < a.pts.length - 1 && d > 0) { const p0 = a.pts[a.seg], p1 = a.pts[a.seg + 1]; const sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 0.001; const rem = sl - a.segDist; if (d < rem) { a.segDist += d; d = 0; } else { d -= rem; a.seg++; a.segDist = 0; } }
        if (a.seg >= a.pts.length - 1) { const lp = a.pts[a.pts.length - 1]; hero.position.set(lp[0], 0, lp[1]); animateStudent(hero, false, now); apiRef.current.anim = null; LAST_NODE = a.targetId; setWalking(false); setTimeout(a.onDone, 240); }
        else { const p0 = a.pts[a.seg], p1 = a.pts[a.seg + 1]; const t = a.segDist / (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 0.001); hero.position.set(p0[0] + (p1[0] - p0[0]) * t, 0, p0[1] + (p1[1] - p0[1]) * t); hero.rotation.y = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]); animateStudent(hero, true, walkPhase); }
      } else animateStudent(hero, false, now);
      renderer.render(scene, camera);
    }
    loop();

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); renderer.domElement.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  const toggleFullscreen = () => { const el = stageRef.current; if (!el) return; const fs = document.fullscreenElement || document.webkitFullscreenElement; if (!fs) { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); } else { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); } };

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6, textAlign: 'center' }}>
        <span className="pill">🗺️ {tt('Adventure Map', 'एडभेन्चर नक्सा')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Your journey across Nepal', 'नेपालभरि तपाईंको यात्रा')}</h1>
        <p className="muted" style={{ fontWeight: 600, marginTop: 2 }}>{tt('Follow the trail from START to FINISH. Tap a stop — your character walks there and it opens.', 'सुरुदेखि अन्त्यसम्म बाटो पछ्याउनुहोस्। ठाउँमा थिच्नुहोस् — पात्र त्यहाँ हिँड्छ।')}</p>
      </div>

      <div ref={stageRef} className="stage" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', height: 'clamp(440px, 74vh, 780px)', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(#bfe6f6 0%,#d7f0e6 62%,#cfe8b8 100%)', boxShadow: '0 18px 48px rgba(20,40,28,.22)' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
        {hover && !walking && (
          <div style={{ position: 'fixed', left: hover.sx, top: hover.sy - 54, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 10, padding: '5px 12px', fontWeight: 700, fontSize: '.85rem', whiteSpace: 'nowrap' }}>
            {ICON[hover.id] || '📍'} {hover.name}<span style={{ opacity: .75, fontWeight: 600 }}> · {hover.kind === 'explorer' ? tt('Explore', 'अन्वेषण') : tt('Mission', 'मिसन')}{hover.ready ? '' : ` · ${tt('soon', 'चाँडै')}`}</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '5px 11px', fontSize: '.78rem', fontWeight: 700 }}>🟢 {tt('Explore', 'अन्वेषण')} · 🟠 {tt('Mission', 'मिसन')}</span>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.9)' }}>⛶</button>
        </div>
        {walking && <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(47,158,68,.92)', color: '#fff', borderRadius: 20, padding: '5px 12px', fontWeight: 800, fontSize: '.8rem' }}>🚶 {tt('Walking…', 'हिँड्दै…')}</div>}
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 54, height: 54, borderRadius: '50%', background: 'rgba(255,255,255,.88)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <span style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '.7rem', color: '#e23c3c', fontWeight: 800 }}>N</span>
            <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '.7rem', fontWeight: 800 }}>S</span>
            <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem', fontWeight: 800 }}>W</span>
            <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem', fontWeight: 800 }}>E</span>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '1.1rem' }}>✦</span>
          </div>
        </div>
        {toast && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700 }}>🔒 {toast} — {tt('coming soon', 'चाँडै आउँदै')}</div>}
      </div>
    </div>
  );
}

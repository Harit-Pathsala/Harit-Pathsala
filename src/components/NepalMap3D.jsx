import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NEPAL_VIEW, NEPAL_PATH } from '../game/nepalMapData.js';
import { LOCATIONS } from '../game/locations.js';
import { useLang } from '../i18n.jsx';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';

const POLY = NEPAL_PATH.match(/([\d.]+),([\d.]+)/g).map((s) => s.split(',').map(Number));
const W = NEPAL_VIEW.w, H = NEPAL_VIEW.h;
const S = 0.14;
const wx = (vx) => (vx - W / 2) * S;
const wz = (vy) => (vy - H / 2) * S;

function pointInPoly(px, py) {
  let inside = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const xi = POLY[i][0], yi = POLY[i][1], xj = POLY[j][0], yj = POLY[j][1];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function hash(x, z) { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function relief(vx, vy) {
  const north = Math.max(0, 1 - vy / H);
  const X = wx(vx), Z = wz(vy);
  if (north < 0.26) return 0.3 + north * 2.0 + (vnoise(X * 0.3, Z * 0.3) - 0.5) * 0.7;
  let h = Math.pow(north, 1.45) * 12.5;
  h += (vnoise(X * 0.16, Z * 0.16) - 0.4) * 3.4;
  h += (vnoise(X * 0.45, Z * 0.45) - 0.5) * 1.2;
  return Math.max(0.25, h);
}

export default function NepalMap3D({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o, k) => (lang === 'ne' && o[`${k}_ne`] !== undefined ? o[`${k}_ne`] : o[k]);
  const stageRef = useRef(null);
  const mountRef = useRef(null);
  const apiRef = useRef({});
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(false);
  const [isFs, setIsFs] = useState(false);

  const cbRef = useRef({});
  cbRef.current = { onExplorer, onMission, setHover, setToast, L };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0, disposed = false;

    const scene = new THREE.Scene();
    // single background comes from the stage CSS; the canvas is transparent above the water

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);

    const FIT_BOX = new THREE.Box3(new THREE.Vector3(-74, 0, -46), new THREE.Vector3(74, 14, 46));
    const FIT_CENTER = FIT_BOX.getCenter(new THREE.Vector3());
    const FIT_SIZE = FIT_BOX.getSize(new THREE.Vector3());
    const FIT_DIR = new THREE.Vector3(0, 1.0, 1.0).normalize();
    const fitCamera = () => {
      const maxSize = Math.max(FIT_SIZE.x, FIT_SIZE.y, FIT_SIZE.z);
      const fitH = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
      const fitW = fitH / camera.aspect;
      const dist = 1.06 * Math.max(fitH, fitW);
      camera.position.copy(FIT_CENTER).addScaledVector(FIT_DIR, dist);
      camera.lookAt(FIT_CENTER);
      return dist;
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.cursor = 'grab';

    // limited rotation — students can tilt the map a little, but never lose it
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.09;
    controls.enablePan = false; controls.enableZoom = true;
    controls.rotateSpeed = 0.55;
    controls.target.copy(FIT_CENTER);
    controls.minPolarAngle = 0.60; controls.maxPolarAngle = 1.02;      // ~34°..58° tilt
    controls.minAzimuthAngle = -0.34; controls.maxAzimuthAngle = 0.34; // ±19° spin

    // lighting tuned for crisp, vivid low-poly facets (no fog)
    scene.add(new THREE.HemisphereLight(0xdaf0ff, 0x6fae5a, 0.72));
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.45);
    sun.position.set(-55, 80, 38); scene.add(sun);

    // endless sea so there is no rectangular water edge
    const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x1f73ad, roughness: 0.55, metalness: 0.05 }));
    seaPlane.rotation.x = -Math.PI / 2; seaPlane.position.y = -1.7; scene.add(seaPlane);

    // ── terrain heightfield, clipped to Nepal, vivid flat-shaded low-poly ──
    const NX = 138, NZ = 80, SEA = -1.5;
    const MX0 = -W * 0.05, MX1 = W * 1.05, MZ0 = -H * 0.08, MZ1 = H * 1.08;
    const pos = [], col = [], idx = [];
    const C = {
      sea: [0.16, 0.50, 0.74], terai: [0.49, 0.80, 0.27], hill: [0.27, 0.63, 0.19],
      rock: [0.52, 0.45, 0.30], snow: [0.98, 0.99, 1.0],
    };
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const vx = MX0 + (i / NX) * (MX1 - MX0);
        const vy = MZ0 + (j / NZ) * (MZ1 - MZ0);
        const inside = vx >= 0 && vx <= W && vy >= 0 && vy <= H && pointInPoly(vx, vy);
        const h = inside ? relief(vx, vy) : SEA;
        pos.push(wx(vx), h, wz(vy));
        let c = C.sea;
        if (inside) c = h > 8.2 ? C.snow : h > 5.0 ? C.rock : h > 2.1 ? C.hill : C.terai;
        col.push(c[0], c[1], c[2]);
      }
    }
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i, b = a + 1, c = a + (NX + 1), d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const terra = new THREE.BufferGeometry();
    terra.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    terra.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    terra.setIndex(idx);
    terra.computeVertexNormals();
    const terrain = new THREE.Mesh(terra, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
    scene.add(terrain);

    // ── 3D pins ──
    const pinGroup = new THREE.Group();
    scene.add(pinGroup);
    const pickables = [];
    const poleGeo = new THREE.CylinderGeometry(0.28, 0.28, 5, 7);
    const ballGeo = new THREE.SphereGeometry(1.75, 18, 14);
    LOCATIONS.forEach((loc) => {
      const baseH = relief(loc.mapX, loc.mapY);
      const x = wx(loc.mapX), z = wz(loc.mapY);
      const mission = loc.kind === 'mission';
      const hex = loc.ready ? (mission ? 0xe8732b : 0x2f9e44) : 0x9aa0a6;
      const g = new THREE.Group();
      g.position.set(x, baseH, z);
      const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
      pole.position.y = 2.5;
      const ball = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: loc.ready ? 0.4 : 0.06, roughness: 0.45 }));
      ball.position.y = 5.7; ball.userData.loc = loc;
      g.add(pole); g.add(ball);
      g.userData = { loc, ball, baseY: 5.7, phase: Math.random() * 6.28 };
      pinGroup.add(g); pickables.push(ball);
    });

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function fit() {
      const w = mount.clientWidth || 800, h = mount.clientHeight || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const dist = fitCamera();
      controls.minDistance = dist * 0.32;   // zoom in close to the mesh
      controls.maxDistance = dist * 1.02;   // zoom out = whole country
      controls.update();
    }
    fit();

    let down = null;
    function setNdc(e) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      return r;
    }
    function onMove(e) {
      const r = setNdc(e);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) {
        const loc = hit.object.userData.loc;
        const p = hit.object.getWorldPosition(new THREE.Vector3()).project(camera);
        cbRef.current.setHover({ id: loc.id, en: cbRef.current.L(loc, 'en'), note: cbRef.current.L(loc, 'note'), ready: loc.ready, x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height - 44 });
        renderer.domElement.style.cursor = 'pointer';
      } else { cbRef.current.setHover(null); renderer.domElement.style.cursor = 'grab'; }
    }
    function onDown(e) { down = { x: e.clientX, y: e.clientY }; }
    function onUp(e) {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 6) return;
      setNdc(e); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (!hit) return;
      const loc = hit.object.userData.loc;
      if (!loc.ready) { cbRef.current.setToast(true); clearTimeout(onUp._t); onUp._t = setTimeout(() => cbRef.current.setToast(false), 1700); return; }
      if (loc.kind === 'explorer') cbRef.current.onExplorer(loc.level); else cbRef.current.onMission(loc.missionId);
    }
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    const ro = new ResizeObserver(fit); ro.observe(mount);

    const clock = new THREE.Clock();
    function loop() {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      pinGroup.children.forEach((g) => { if (g.userData.loc.ready) g.userData.ball.position.y = g.userData.baseY + Math.sin(t * 2 + g.userData.phase) * 0.5; });
      controls.update();
      renderer.render(scene, camera);
    }
    loop();
    apiRef.current = { renderer, fit };

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { const m = o.material; const arr = Array.isArray(m) ? m : [m]; arr.forEach((mm) => { for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); } if (typeof mm.dispose === 'function') mm.dispose(); }); }
      });
      poleGeo.dispose(); ballGeo.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    const onFs = () => { const fs = !!document.fullscreenElement; setIsFs(fs); setTimeout(() => apiRef.current.fit && apiRef.current.fit(), 60); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFs = () => {
    const el = stageRef.current;
    if (!document.fullscreenElement) { el && el.requestFullscreen && el.requestFullscreen(); }
    else { document.exitFullscreen && document.exitFullscreen(); }
  };

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6 }}>
        <span className="pill">🗺️ {tt('Nepal · 3D', 'नेपाल · ३डी')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Choose where to go', 'कहाँ जाने रोज्नुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">{tt('Namaste! Drag to tilt the map a little. Tap a green pin to explore a place, or an orange pin to start a mission. Keep Nepal green!', 'नमस्ते! नक्सा अलिकति घुमाउन तान्नुहोस्। ठाउँ घुम्न हरियो पिन, मिसन खेल्न सुन्तला पिन थिच्नुहोस्। नेपाल हरियो राखौँ!')}</div>
        </div>
      </div>

      <div ref={stageRef} style={{ position: 'relative', width: '100%', maxWidth: 1320, margin: '0 auto', height: isFs ? '100vh' : 'clamp(440px, 80vh, 940px)', borderRadius: isFs ? 0 : 18, overflow: 'hidden', background: 'linear-gradient(#7fc4ec,#e9f6ec)', boxShadow: '0 12px 34px rgba(30,60,40,.2)' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

        <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,.85)', borderRadius: 10, padding: '7px 10px', fontSize: '.74rem', fontWeight: 800, color: '#234', pointerEvents: 'none' }}>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#2f9e44', marginRight: 5, verticalAlign: 'middle' }} />🧭 {tt('Explore', 'अन्वेषण')}</span>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#e8732b', marginRight: 5, verticalAlign: 'middle' }} />🚌 {tt('Mission', 'मिसन')}</span>
        </div>

        <button onClick={toggleFs} title={tt('Fullscreen', 'पूर्ण स्क्रिन')}
          style={{ position: 'absolute', top: 12, left: 14, border: 'none', borderRadius: 10, padding: '7px 11px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.88)', color: '#234' }}>
          {isFs ? '✕ ' + tt('Exit', 'बाहिर') : '⛶ ' + tt('Fullscreen', 'पूर्ण स्क्रिन')}
        </button>

        {hover && (
          <div style={{ position: 'absolute', left: hover.x, top: hover.y, transform: 'translate(-50%,-100%)', background: 'rgba(20,40,28,.92)', color: '#fff', fontWeight: 800, fontSize: '.78rem', padding: '5px 9px', borderRadius: 9, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 4 }}>
            {hover.en}<br /><small style={{ fontWeight: 600, opacity: 0.85 }}>{hover.note}{!hover.ready ? ` · ${tt('soon', 'चाँडै')}` : ''}</small>
          </div>
        )}
        {toast && (
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,40,28,.9)', color: '#fff', fontWeight: 800, padding: '8px 16px', borderRadius: 20, zIndex: 6 }}>⏳ {tt('Coming soon', 'चाँडै आउँदै')}</div>
        )}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Drag to tilt · tap a pin · green pins explore a place, orange pins start a mission.', 'घुमाउन तान्नुहोस् · पिन थिच्नुहोस् · हरियो अन्वेषण, सुन्तला मिसन।')}
      </div>
    </div>
  );
}

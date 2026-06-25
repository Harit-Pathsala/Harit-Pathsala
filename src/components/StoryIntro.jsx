import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import * as THREE from 'three';
import { box, cyl, cone, mesh, std, makeTree, makeRedPanda, makeModernBuilding, makeNewariHouse, makeShop, makeMicrobus, makeStudent, animateStudent, makeGroundTexture, makeSkyTexture } from '../game/nepalKit.js';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

const NARR = [
  { en: 'Once, this valley was a thriving jungle — tall trees, clean rivers and lakes, and red panda families living happily among the branches.', ne: 'कुनै बेला यो उपत्यका घना जंगल थियो — अग्ला रूख, सफा नदी र ताल, र हाँगाहरूमा रातो पाण्डाका परिवार रमाइलोसँग बस्थे।' },
  { en: 'Then people cut the forest down. The red pandas lost their home, and one by one the animals fled…', ne: 'अनि मानिसले जंगल काटे। रातो पाण्डाले घर गुमाए, र जनावरहरू एक-एक गरी भागे…' },
  { en: 'Houses and roads took over the land, and smoky diesel vehicles filled the air.', ne: 'घर र सडकले जमिन ओगटे, अनि धुवाँ छोड्ने डिजेल गाडीले हावा भरियो।' },
  { en: 'The rivers turned foul, waste piled up, the green earth dried to dust, and the sky went grey.', ne: 'नदी फोहोर भयो, फोहोरको थुप्रो लाग्यो, हरियो माटो सुकेर धुलो भयो, र आकाश खैरो भयो।' },
  { en: 'But one red panda stayed — Bana. "I believe we can bring the jungle back and live beside nature again. Will you help me restore our world?"', ne: 'तर एउटा रातो पाण्डा रह्यो — बाना। "मलाई विश्वास छ हामी जंगल फर्काउन र प्रकृतिसँगै बस्न सक्छौं। हाम्रो संसार फर्काउन मद्दत गर्नुहुन्छ?"' },
];
// Stage durations (ms) — these are also the silent-fallback pacing for the subtitle reveal.
// They are sized so the narration text is readable (~2.4 words/sec) and roughly match the
// recommended audio length of each narration part. When a narration audio file is present and
// plays, the stage instead advances when that audio finishes, so exact lengths aren't critical.
const DUR = [10000, 8500, 6500, 7500];
const LAST_REVEAL_MS = 12000; // stage 4 (call to action) has no auto-advance; reveal over this

// small inline speaker icon (with a slash when muted) — avoids emoji
function SpeakerIcon({ muted }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
      {muted
        ? <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
        : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
    </svg>
  );
}

export default function StoryIntro({ onDone }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const finish = () => { try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (_) {} onDone(); };
  const [stage, setStage] = useState(0);
  const [revealN, setRevealN] = useState(0);   // how many words of the current line are shown
  const [audioBlocked, setAudioBlocked] = useState(false); // autoplay blocked -> offer tap-for-sound
  const [muted, setMuted] = useState(false);
  const [playToken, setPlayToken] = useState(0); // bump to re-trigger audio after a user gesture
  const stageRef = useRef(0);
  const mountRef = useRef(null);
  const cardRef = useRef(null);
  const beginRef = useRef(null);
  const audioRef = useRef(null);
  const revealTimer = useRef(null);
  const advanceTimer = useRef(null);
  const mutedRef = useRef(false);

  // current narration line, split into words for the progressive ("little by little") reveal
  const line = tt(NARR[stage].en, NARR[stage].ne);
  const words = line.split(' ');
  const isLast = stage >= NARR.length - 1;
  const revealDone = revealN >= words.length;

  // Per-stage driver: play this stage's narration, reveal its words one-by-one in time with the
  // audio, and advance to the next stage when the audio ends (or, with no audio, after DUR[stage]).
  useEffect(() => {
    stageRef.current = stage;
    setRevealN(0);
    clearInterval(revealTimer.current);
    clearTimeout(advanceTimer.current);
    const last = stage >= NARR.length - 1;
    const fallbackMs = last ? LAST_REVEAL_MS : (DUR[stage] ?? 8000);
    const nWords = (tt(NARR[stage].en, NARR[stage].ne)).split(' ').length;

    let kicked = false;
    const startReveal = (revealMs) => {
      const lead = 280; // small lead-in so the first word lands as the voice begins
      const per = Math.max(95, (revealMs - lead - 350) / Math.max(1, nWords));
      let k = 0;
      revealTimer.current = setInterval(() => {
        k += 1; setRevealN(k);
        if (k >= nWords) clearInterval(revealTimer.current);
      }, per);
    };
    const scheduleAdvance = (ms) => { if (!last) advanceTimer.current = setTimeout(() => setStage((s) => Math.min(NARR.length - 1, s + 1)), ms); };
    const kickoff = (revealMs, advanceMs) => { if (kicked) return; kicked = true; setTimeout(() => startReveal(revealMs), 280); scheduleAdvance(advanceMs); };

    const audio = audioRef.current;
    const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
    if (audio) {
      audio.src = `${base}narration/${lang === 'ne' ? 'ne' : 'en'}/part-${stage + 1}.mp3`;
      audio.muted = mutedRef.current;
      try { audio.currentTime = 0; } catch (_) {}
      const onMeta = () => { const d = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration * 1000 : fallbackMs; kickoff(Math.max(fallbackMs * 0.7, d), Math.max(fallbackMs, d + 600)); };
      const onErr = () => kickoff(fallbackMs, fallbackMs); // file missing -> silent, timer-paced
      const onEnded = () => { if (!last) { clearTimeout(advanceTimer.current); setStage((s) => Math.min(NARR.length - 1, s + 1)); } };
      audio.addEventListener('loadedmetadata', onMeta, { once: true });
      audio.addEventListener('error', onErr, { once: true });
      audio.addEventListener('ended', onEnded, { once: true });
      const p = audio.play();
      if (p && p.catch) p.catch((err) => { if (err && err.name === 'NotAllowedError') setAudioBlocked(true); kickoff(fallbackMs, fallbackMs); });
      return () => { audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('error', onErr); audio.removeEventListener('ended', onEnded); try { audio.pause(); } catch (_) {} clearInterval(revealTimer.current); clearTimeout(advanceTimer.current); };
    }
    kickoff(fallbackMs, fallbackMs);
    return () => { clearInterval(revealTimer.current); clearTimeout(advanceTimer.current); };
  }, [stage, lang, playToken]);

  // live mute toggle without restarting the current line
  useEffect(() => { mutedRef.current = muted; if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  // anime.js — slide the narration card in on each beat
  useEffect(() => {
    if (cardRef.current) animate(cardRef.current, { translateY: [22, 0], opacity: [0, 1], duration: 660, ease: 'out(3)' });
  }, [stage]);
  // pop the Begin button in once the final line has finished revealing
  useEffect(() => {
    if (isLast && revealDone && beginRef.current) animate(beginRef.current, { scale: [0.6, 1], opacity: [0, 1], duration: 600, ease: 'out(2)' });
  }, [isLast, revealDone]);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    let raf = 0, ended = false;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 540;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture(0x8fccc4);
    const fog = new THREE.Fog(0xdfeee4, 46, 150); scene.fog = fog;
    const fogClean = new THREE.Color(0xdfeee4), fogSmog = new THREE.Color(0x6a5a78);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);

    const hemi = new THREE.HemisphereLight(0xdaf0f2, 0x5f6f4a, 1.18); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.68); sun.position.set(-46, 64, 32); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; scene.add(sun);

    // ground — greens stays lush, dries to dune-brown when polluted
    const greenCol = new THREE.Color(0x66a648), duneCol = new THREE.Color(0xb09668);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 72), new THREE.MeshToonMaterial({ color: greenCol.clone() }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // water: river + lake + pond (clean -> foul)
    const waterClean = new THREE.Color(0x4fb0d8), waterFoul = new THREE.Color(0x6b6a3a);
    const waters = [];
    const mkWater = (geo, x, z) => { const w = mesh(geo, 0x4fb0d8, { roughness: 0.25, transparent: true, opacity: 0.85, noOutline: true }); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.05, z); scene.add(w); waters.push(w); return w; };
    mkWater(new THREE.PlaneGeometry(7, 120), -22, 0);
    mkWater(new THREE.CircleGeometry(11, 40), 26, -16);
    mkWater(new THREE.CircleGeometry(5.5, 32), 18, 20);

    // dense, tall jungle — central trees get felled
    const trees = [];
    const shapes = ['round', 'round', 'tall', 'umbrella', 'columnar'];
    let placed = 0, guard = 0;
    while (placed < 100 && guard < 9000) {
      guard++; const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 42;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (x < -16 && Math.abs(z) < 60) continue;            // river clear
      if (Math.hypot(x - 26, z + 16) < 13) continue;        // lake clear
      if (Math.hypot(x - 18, z - 20) < 7) continue;         // pond clear
      if (Math.abs(z) < 3.4 || Math.abs(x) < 3.4) continue; // keep trees & stumps off the crossing roads
      const tr = makeTree(1.2 + Math.random() * 0.9, undefined, shapes[placed % shapes.length]);
      tr.position.set(x, 0, z); tr.rotation.y = Math.random() * 6.28; tr.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      scene.add(tr);
      const central = Math.hypot(x, z) < 19 && x > -14;
      const stump = cyl(0.22, 0.3, 0.5, 7, 0x6e4a2c); stump.position.set(x, 0.25, z); stump.visible = false; scene.add(stump);
      trees.push({ grp: tr, stump, fall: central, delay: Math.random() * 2.4, p: 0 });
      placed++;
    }

    // red panda family — playing in pristine; all but Bana flee when the forest falls
    const pandas = [];
    const pandaSpots = [[-6, 4], [5, -3], [9, 6], [-3, -7], [2, 9], [-8, -2], [7, 2]];
    pandaSpots.forEach(([x, z], idx) => {
      const p = makeRedPanda(1.0 + (idx === 0 ? 0.15 : 0)); p.position.set(x, 0, z); p.rotation.y = Math.random() * 6.28;
      p.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(p);
      const ang = Math.atan2(z, x);
      pandas.push({ grp: p, isBana: idx === 0, home: new THREE.Vector3(x, 0, z), flee: new THREE.Vector3(Math.cos(ang) * 52, 0, Math.sin(ang) * 52), bob: Math.random() * 6.28, p: 0, fleeDelay: 0.8 + idx * 0.6 });
    });

    // town — buildings placed OFF the roads (roads run along x and z; keep |x|>=8 and |z|>=7).
    // Buildings rise progressively: first wave in stage 2, later ones keep appearing into stage 3.
    const builds = [];
    const layout = [
      [makeModernBuilding(), -11, -9], [makeModernBuilding(), 9, -11], [makeNewariHouse(3), -13, 8],
      [makeNewariHouse(2), 11, 9], [makeNewariHouse(3), -9, 13], [makeShop(0xc98a4b), 14, -8], [makeModernBuilding(), 12, 12],
      // second-wave growth (appear later as the settlement spreads)
      [makeNewariHouse(2), -16, -5], [makeModernBuilding(), 16, 5], [makeNewariHouse(3), -7, -16],
      [makeShop(0xb5763a), 7, 16], [makeModernBuilding(), -15, -13], [makeNewariHouse(2), 15, -14],
    ];
    layout.forEach(([b, x, z], idx) => { b.position.set(x, 0, z); b.rotation.y = idx % 2 ? 0.3 : -0.25; b.scale.y = 0.001; b.visible = false; b.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(b); builds.push({ grp: b, delay: idx * 0.75 }); });

    // roads (fade in with construction)
    const roadMat = std(0x3a3a3e, { roughness: 1, transparent: true, opacity: 0, noOutline: true });
    const road1 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 70), roadMat); road1.rotation.x = -Math.PI / 2; road1.position.set(0, 0.09, 0); scene.add(road1);
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(70, 4.6), roadMat.clone()); road2.rotation.x = -Math.PI / 2; road2.position.set(0, 0.088, 0); scene.add(road2);
    const roadMats = [road1.material, road2.material];
    const bridge = box(8.5, 0.35, 5.4, 0x7a5a3a); bridge.position.set(-22, 0.22, 0); bridge.visible = false; bridge.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(bridge);

    // diesel vehicles — stay ON the main road, loop inside the scene, exhaust smoke. Count grows in pollution.
    const cars = [];
    for (let idx = 0; idx < 6; idx++) {
      const c = makeMicrobus(); c.scale.setScalar(0.95); c.visible = false; scene.add(c);
      const puff = mesh(new THREE.IcosahedronGeometry(0.5, 0), 0x6a6a6a, { transparent: true, opacity: 0, noOutline: true }); scene.add(puff);
      const dir = idx % 2 ? -1 : 1;
      cars.push({ grp: c, puff, dir, lane: dir < 0 ? 1.3 : -1.3, t: idx * 11, pt: Math.random() * 6.28, showAt: idx < 2 ? 0 : 4.0 + (idx - 2) * 1.95 });
    }

    // human migration — loggers arrive in stage 1, then a settlement crowd that grows through stages 2-3
    const people = [];
    for (let idx = 0; idx < 22; idx++) {
      const ps = makeStudent(); ps.scale.setScalar(0.8 + Math.random() * 0.35); ps.visible = false; scene.add(ps);
      // scattered destination around the settlement, kept off the crossing roads
      let tx = 0, tz = 0, g2 = 0;
      do { const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 17; tx = Math.cos(a) * r; tz = Math.sin(a) * r; g2++; }
      while (g2 < 60 && ((Math.abs(tx) < 4 || Math.abs(tz) < 4) || Math.hypot(tx - 26, tz + 16) < 12 || tx < -15));
      const ea = Math.random() * Math.PI * 2;
      const start = new THREE.Vector3(Math.cos(ea) * 47, 0, Math.sin(ea) * 47);
      const isLogger = idx < 3;
      // appearAt is measured on tDef (the clock that starts at stage 1)
      const appearAt = isLogger ? (0.4 + idx * 0.5) : (idx < 13 ? 5.4 + (idx - 3) * 0.42 : 10.6 + (idx - 13) * 0.55);
      people.push({ grp: ps, isLogger, start, target: new THREE.Vector3(tx, 0, tz), appearAt, walkDur: 3.2 + Math.random() * 1.4, t: Math.random() * 10 });
    }

    // waste (appears with pollution)
    const wc = [0xcf5030, 0xd8b020, 0xcfcfcf, 0x6b8a3a, 0x8a5a2b];
    const waste = [];
    for (let idx = 0; idx < 32; idx++) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 24, x = Math.cos(a) * r, z = Math.sin(a) * r; const w = box(0.55, 0.4, 0.55, wc[idx % wc.length], { noOutline: true }); w.position.set(x, 0.2, z); w.rotation.y = Math.random() * 6.28; w.scale.setScalar(0.001); w.visible = false; scene.add(w); waste.push({ grp: w, delay: Math.random() * 1.6, p: 0 }); }

    // drifting pollen / petals — anime-heaven sparkle, fades as construction begins
    const motes = []; const moteGeo = new THREE.IcosahedronGeometry(0.07, 0);
    for (let idx = 0; idx < 46; idx++) { const m = mesh(moteGeo, idx % 3 === 0 ? 0xfff3b0 : (idx % 3 === 1 ? 0xffd1e8 : 0xd8ffd0), { transparent: true, opacity: 0.85, noOutline: true }); const a = Math.random() * Math.PI * 2, r = Math.random() * 26; m.position.set(Math.cos(a) * r, 0.6 + Math.random() * 5, Math.sin(a) * r); scene.add(m); motes.push({ grp: m, base: m.position.clone(), ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.6 }); }

    const clock = new THREE.Clock(); let camT = 0, tDef = 0, tCon = 0, tPol = 0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const lerp = THREE.MathUtils.lerp;
    const step = () => {
      if (ended) return; raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, clock.getDelta()); const s = stageRef.current;

      // cinematic: slow orbit, lower & close in the lush jungle, rising as it degrades
      camT += dt;
      const sway = Math.sin(camT * 0.18) * 0.32;
      const baseA = Math.PI / 2 + sway;
      const ch = lerp(7, 20, Math.min(1, s / 4)), cr = lerp(26, 38, Math.min(1, s / 4));
      camera.position.set(Math.cos(baseA) * cr, ch + Math.sin(camT * 0.5) * 1.0, Math.sin(baseA) * cr);
      camera.lookAt(0, 3.2, 0);

      // red pandas: gentle life in pristine; flee (all but Bana) once the forest is cut
      pandas.forEach((pa) => {
        if (s >= 1 && !pa.isBana && tDef > pa.fleeDelay) { pa.p = Math.min(1, pa.p + dt * 0.14); const k = ease(pa.p); pa.grp.position.lerpVectors(pa.home, pa.flee, k); pa.grp.scale.setScalar(Math.max(0.001, 1 - k * 0.7)); pa.grp.visible = k < 0.995; }
        else { pa.bob += dt * 3; pa.grp.position.y = Math.abs(Math.sin(pa.bob)) * 0.08; if (pa.isBana) pa.grp.rotation.y += dt * 0.2; }
      });

      const moteVis = s < 2 ? 1 : Math.max(0, 1 - tCon * 0.7);
      for (const mo of motes) { mo.ph += dt * mo.sp; mo.grp.position.y = mo.base.y + Math.sin(mo.ph) * 0.5; mo.grp.position.x = mo.base.x + Math.cos(mo.ph * 0.7) * 0.4; mo.grp.material.opacity = 0.85 * moteVis; mo.grp.visible = moteVis > 0.02; }

      if (s >= 1) {
        tDef += dt;
        for (const t of trees) { if (!t.fall || tDef < t.delay) continue; t.p = Math.min(1, t.p + dt * 0.9); t.grp.rotation.z = -1.5 * ease(t.p); if (t.p > 0.55) { t.grp.visible = false; t.stump.visible = true; } }
        // human migration: walk in from the scene edge to a settlement spot, then mill about
        for (const pn of people) {
          if (tDef < pn.appearAt) continue;
          pn.grp.visible = true; pn.t += dt;
          const prog = Math.min(1, (tDef - pn.appearAt) / pn.walkDur);
          const moving = prog < 1;
          pn.grp.position.lerpVectors(pn.start, pn.target, ease(prog));
          if (moving) { const dx = pn.target.x - pn.start.x, dz = pn.target.z - pn.start.z; pn.grp.rotation.y = Math.atan2(dx, dz); }
          animateStudent(pn.grp, moving, pn.t * 1.5);
        }
      }
      if (s >= 2) {
        tCon += dt; bridge.visible = true;
        for (const b of builds) { if (tCon < b.delay) continue; b.grp.visible = true; b.grp.scale.y += (1 - b.grp.scale.y) * Math.min(1, dt * 2.4); }
        for (const m of roadMats) m.opacity += (0.92 - m.opacity) * Math.min(1, dt * 2);
        for (const c of cars) { if (tCon < c.showAt) continue; c.grp.visible = true; c.t += dt * 7 * c.dir; const span = 30; let z = ((c.t % (span * 2)) + span * 2) % (span * 2) - span; c.grp.position.set(c.lane, 0, z); c.grp.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; c.pt += dt; const ph = (c.pt % 1.1) / 1.1; c.puff.position.set(c.lane, 0.6 + ph * 1.6, z - c.dir * 1.2); c.puff.material.opacity = 0.5 * (1 - ph); c.puff.scale.setScalar(0.4 + ph * 1.2); }
      }
      if (s >= 3) {
        tPol += dt; const k = Math.min(1, tPol * 0.45);
        for (const w of waters) w.material.color.lerpColors(waterClean, waterFoul, k);
        ground.material.color.lerpColors(greenCol, duneCol, k);
        fog.color.lerpColors(fogClean, fogSmog, k); fog.near = lerp(46, 16, k); fog.far = lerp(150, 108, k);
        hemi.intensity = lerp(1.18, 0.6, k); sun.intensity = lerp(1.68, 0.76, k);
        for (const w of waste) { if (tPol < w.delay) continue; w.grp.visible = true; w.p = Math.min(1, w.p + dt * 1.4); w.grp.scale.setScalar(ease(w.p)); }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(step);

    const ro = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); } });
    ro.observe(mount);
    return () => {
      ended = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const arr = Array.isArray(o.material) ? o.material : [o.material]; arr.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (typeof m.dispose === 'function') m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  const smog = stage >= 3 ? (stage >= 4 ? 0.62 : 0.46) : 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0d1a14' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <audio ref={audioRef} preload="auto" />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(19,54,108,0.82) 0%, rgba(138,43,226,0.55) 46%, rgba(255,205,105,0.42) 100%)', opacity: smog, transition: 'opacity 1.5s ease' }} />
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 3, display: 'flex', gap: 8 }}>
        <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute narration' : 'Mute narration'} style={{ border: 'none', borderRadius: 20, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,.9)', color: '#1c3326', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          <SpeakerIcon muted={muted} />
        </button>
        <button onClick={finish} style={{ border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.9)', color: '#1c3326', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          {tt('Skip', 'छाड्नुहोस्')} <Icon name="arrowLeft" size={14} style={{ transform: 'rotate(180deg)', verticalAlign: '-2px', marginLeft: 2 }} />
        </button>
      </div>
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', gap: 7 }}>
        {NARR.map((_, i) => <span key={i} style={{ width: i === stage ? 22 : 8, height: 8, borderRadius: 5, background: i <= stage ? '#7fd06a' : 'rgba(255,255,255,.45)', transition: 'all .4s' }} />)}
      </div>
      {audioBlocked && !muted && (
        <button onClick={() => { setAudioBlocked(false); setMuted(false); setPlayToken((t) => t + 1); }} style={{ position: 'absolute', top: 62, right: 16, zIndex: 4, border: 'none', borderRadius: 20, padding: '8px 14px', fontWeight: 800, fontSize: '.86rem', cursor: 'pointer', background: '#2f9e44', color: '#fff', boxShadow: '0 6px 18px rgba(47,158,68,.5)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <SpeakerIcon muted={false} /> {tt('Play with sound', 'आवाजसहित सुन्नुहोस्')}
        </button>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, padding: '0 16px 26px' }}>
        <div ref={cardRef} style={{ maxWidth: 720, margin: '0 auto', background: 'rgba(16,30,22,.86)', backdropFilter: 'blur(4px)', borderRadius: 16, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.4)' }}>
          <div style={{ flexShrink: 0, background: '#fff', borderRadius: '50%', padding: 4 }}><BanaFace size={46} /></div>
          <div style={{ color: '#eaffe9', fontWeight: 600, fontSize: '1.02rem', lineHeight: 1.5, minHeight: '3em', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {words.map((w, i) => (
              <span key={stage + ':' + i} style={{ opacity: i < revealN ? 1 : 0, transition: 'opacity .32s ease' }}>{w}{i < words.length - 1 ? '\u00A0' : ''}</span>
            ))}
          </div>
        </div>
        {isLast && revealDone && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button ref={beginRef} onClick={finish} style={{ border: 'none', borderRadius: 26, padding: '13px 30px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', background: '#2f9e44', color: '#fff', boxShadow: '0 8px 24px rgba(47,158,68,.5)' }}>
              {tt('Begin the journey', 'यात्रा सुरु गर्नुहोस्')} <Icon name="arrowLeft" size={16} style={{ transform: 'rotate(180deg)', verticalAlign: '-3px', marginLeft: 4 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

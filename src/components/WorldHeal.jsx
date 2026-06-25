import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import * as THREE from 'three';
import { sfx } from '../game/sfx.js';
import { box, cyl, cone, mesh, std, makeTree, makeRedPanda, makeSkyTexture } from '../game/nepalKit.js';
import { TOTAL_LEVELS } from '../state/gameStore.ts';
import { audio } from '../game/audio.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

const N = TOTAL_LEVELS;
const TYPES = ['forest', 'water', 'waste'];
// deterministic spot layout (golden-angle scatter) so problem #k is always the same place
function spotAt(i) { const a = i * 2.399963; const r = 9 + Math.sqrt((i + 0.5) / N) * 30; return { x: Math.cos(a) * r, z: Math.sin(a) * r, type: TYPES[i % 3] }; }

// timeline (seconds)
const T_FLY0 = 1.0, T_FLY1 = 2.3, T_SOLVE_END = 5.4, T_PULL_END = 7.2;

export default function WorldHeal({ from = 0, to = 0, onDone }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const mountRef = useRef(null);
  const cardRef = useRef(null);
  const btnRef = useRef(null);
  const titleRef = useRef(null);
  const solvedIdx = Math.min(N - 1, Math.round(from * N));   // the problem being fixed now
  const restoredAfter = Math.round(to * N);
  const complete = to >= 0.999;
  const solveType = spotAt(solvedIdx).type;
  const [disp, setDisp] = useState(from);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    let raf = 0, ended = false;
    const W = mount.clientWidth || 900, H = mount.clientHeight || 560;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture(0x8fc6c0);
    const fog = new THREE.Fog(0xd8c9a0, 36, 150); scene.fog = fog;
    const fogDune = new THREE.Color(0xcdbd95), fogGreen = new THREE.Color(0xe2efe6);
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 600);

    const hemi = new THREE.HemisphereLight(0xeae0c8, 0x6a5f40, 0.9); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d4, 1.1); sun.position.set(-44, 66, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; scene.add(sun);

    // ground — dune-brown when sick, green when healed (lerped each frame by displayed health)
    const duneCol = new THREE.Color(0xc2a878), greenCol = new THREE.Color(0x69a84a);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 72), new THREE.MeshToonMaterial({ color: duneCol.clone() }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const waterFoul = new THREE.Color(0x6f6a3a), waterClean = new THREE.Color(0x4fb0d8);

    // build one restoration spot (degraded + restored states, toggled by solve progress)
    function buildSpot(s, state) {  // state: 'restored' | 'degraded' | 'solving'
      const grp = new THREE.Group(); grp.position.set(s.x, 0, s.z);
      const dead = new THREE.Group(), live = new THREE.Group(); grp.add(dead, live);
      // dead/degraded bits
      for (let k = 0; k < 3; k++) { const st = cyl(0.18, 0.26, 0.4 + Math.random() * 0.2, 6, 0x6b4a2c); st.position.set((Math.random() - 0.5) * 2.4, 0.2, (Math.random() - 0.5) * 2.4); dead.add(st); }
      const deadTree = new THREE.Group(); const dt = cyl(0.12, 0.18, 1.6, 6, 0x5a4631); dt.position.y = 0.8; deadTree.add(dt);
      for (let b = 0; b < 3; b++) { const br = cyl(0.05, 0.07, 0.6, 5, 0x5a4631); br.position.set(0, 1.2 + b * 0.18, 0); br.rotation.z = (b - 1) * 0.7; deadTree.add(br); }
      deadTree.position.set(0.4, 0, -0.3); dead.add(deadTree);
      const wc = [0xcf5030, 0xd8b020, 0xcfcfcf, 0x6b8a3a];
      for (let k = 0; k < 4; k++) { const w = box(0.5, 0.36, 0.5, wc[k % 4], { noOutline: true }); w.position.set((Math.random() - 0.5) * 2.8, 0.18, (Math.random() - 0.5) * 2.8); w.rotation.y = Math.random() * 6.28; dead.add(w); }
      const puddle = mesh(new THREE.CircleGeometry(s.type === 'water' ? 2.2 : 1.2, 28), 0x6f6a3a, { roughness: 0.4, noOutline: true }); puddle.rotation.x = -Math.PI / 2; puddle.position.set(-0.6, 0.03, 0.6); grp.add(puddle); // stays, just changes colour
      // live/restored bits
      const nTrees = s.type === 'forest' ? 3 : 1;
      for (let k = 0; k < nTrees; k++) { const tr = makeTree(1.0 + Math.random() * 0.7, undefined, ['round', 'tall', 'umbrella'][k % 3]); tr.position.set((Math.random() - 0.5) * 2.6, 0, (Math.random() - 0.5) * 2.6); tr.traverse((m) => { if (m.isMesh) m.castShadow = true; }); live.add(tr); }
      for (let k = 0; k < 6; k++) { const bl = mesh(new THREE.ConeGeometry(0.08, 0.34, 5), 0x5fa83f, { flatShading: true, noOutline: true }); bl.position.set((Math.random() - 0.5) * 3, 0.17, (Math.random() - 0.5) * 3); live.add(bl); }
      for (let k = 0; k < 5; k++) { const fc = [0xff5d7a, 0xffd23a, 0xc77dff][k % 3]; const fl = mesh(new THREE.IcosahedronGeometry(0.1, 0), fc, { flatShading: true, noOutline: true }); fl.position.set((Math.random() - 0.5) * 3, 0.22, (Math.random() - 0.5) * 3); live.add(fl); }
      const panda = makeRedPanda(0.9); panda.position.set(0.5, 0, 0.8); panda.rotation.y = -0.6; live.add(panda);
      // sparkle ring
      const spark = new THREE.Group();
      for (let k = 0; k < 10; k++) { const sp = mesh(new THREE.IcosahedronGeometry(0.13, 0), 0xfff2a0, { emissive: 0xffd23a, emissiveIntensity: 0.9, transparent: true, noOutline: true }); sp.position.set((Math.random() - 0.5) * 3, 0.4 + Math.random() * 1.6, (Math.random() - 0.5) * 3); spark.add(sp); }
      spark.visible = false; grp.add(spark);
      // initial state
      const setLive = (p) => { live.scale.setScalar(Math.max(0.0001, p)); live.visible = p > 0.02; dead.scale.setScalar(Math.max(0.0001, 1 - p)); dead.visible = p < 0.98; puddle.material.color.lerpColors(waterFoul, waterClean, p); };
      setLive(state === 'restored' ? 1 : 0);
      scene.add(grp);
      return { grp, dead, live, puddle, spark, setLive, type: s.type };
    }

    const spots = [];
    for (let i = 0; i < N; i++) {
      const s = spotAt(i);
      const state = i < solvedIdx ? 'restored' : (i === solvedIdx ? 'solving' : 'degraded');
      spots.push({ ...buildSpot(s, state), i, x: s.x, z: s.z, solving: i === solvedIdx });
    }
    const focus = spotAt(solvedIdx);

    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const clock = new THREE.Clock(); let t = 0, hud = 0;
    const overPos = new THREE.Vector3(focus.x * 0.3, 32, 48), overLook = new THREE.Vector3(0, 2, 0);
    const focPos = new THREE.Vector3(focus.x + 7, 7.5, focus.z + 11), focLook = new THREE.Vector3(focus.x, 1.3, focus.z);

    const step = () => {
      if (ended) return; raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, clock.getDelta()); t += dt;

      // camera choreography: overview -> fly to the problem -> hold/orbit -> (final) pull back
      let pos, look;
      if (t < T_FLY0) { pos = overPos; look = overLook; }
      else if (t < T_FLY1) { const k = ease((t - T_FLY0) / (T_FLY1 - T_FLY0)); pos = overPos.clone().lerp(focPos, k); look = overLook.clone().lerp(focLook, k); }
      else if (t < T_SOLVE_END) { const a = (t - T_FLY1) * 0.3; pos = new THREE.Vector3(focus.x + Math.cos(a) * 5 + 3, 7.2, focus.z + 11 - Math.sin(a) * 3); look = focLook; }
      else if (complete) { const k = ease(Math.min(1, (t - T_SOLVE_END) / (T_PULL_END - T_SOLVE_END))); pos = focPos.clone().lerp(new THREE.Vector3(0, 36, 52), k); look = focLook.clone().lerp(overLook, k); }
      else { pos = focPos; look = focLook; }
      camera.position.copy(pos); camera.lookAt(look);

      // solve the focused problem
      const solveP = Math.max(0, Math.min(1, (t - T_FLY1) / (T_SOLVE_END - T_FLY1)));
      const sp = spots[solvedIdx];
      if (sp) {
        sp.setLive(ease(solveP));
        if (solveP > 0.02 && solveP < 1 && !sp.spark.visible) { sp.spark.visible = true; if (audio && audio.play) audio.play('sparkle'); }
        if (sp.spark.visible) { sp.spark.children.forEach((s) => { s.position.y += dt * 1.0; s.material.opacity = Math.max(0, 1 - solveP); }); if (solveP >= 1) sp.spark.visible = false; }
      }

      // global health: dune -> green over the solve
      const d = from + (to - from) * ease(Math.min(1, t / T_SOLVE_END));
      ground.material.color.lerpColors(duneCol, greenCol, d);
      fog.color.lerpColors(fogDune, fogGreen, d); fog.near = THREE.MathUtils.lerp(30, 46, d);
      hemi.intensity = THREE.MathUtils.lerp(0.85, 1.05, d); sun.intensity = THREE.MathUtils.lerp(0.95, 1.5, d);

      hud += dt; if (hud > 0.1) { hud = 0; setDisp(d); }
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

  const solvedMsg = {
    forest: tt('You brought the forest back to life here — new trees, and a red panda came home. 🐾', 'यहाँ जंगल फेरि जीवित भयो — नयाँ रूख, र रातो पाण्डा घर फर्क्यो। 🐾'),
    water: tt('You cleaned this water — it runs clear and blue again. 🐾', 'तपाईंले यो पानी सफा गर्नुभयो — फेरि सफा र नीलो भयो। 🐾'),
    waste: tt('You cleared the waste here and flowers are growing again. 🐾', 'तपाईंले यहाँको फोहोर हटाउनुभयो र फूल फेरि फुल्दैछ। 🐾'),
  }[solveType];
  const smog = (1 - disp) * 0.32;

  // anime.js — payoff entrance for the heal card, button, and the "fully restored" title
  useEffect(() => {
    sfx.resume();
    const id = setTimeout(() => { if (complete) sfx.levelUp(); else sfx.win(); }, 500);
    if (cardRef.current) animate(cardRef.current, { translateY: [24, 0], opacity: [0, 1], duration: 640, ease: 'out(3)' });
    if (btnRef.current) animate(btnRef.current, { scale: [0.6, 1], opacity: [0, 1], duration: 600, delay: 220, ease: 'out(2)' });
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (complete && titleRef.current) animate(titleRef.current, { scale: [0.7, 1.08, 1], opacity: [0, 1], duration: 780, ease: 'out(3)' });
  }, [complete]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#1a1510' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(150,130,90,1) 0%, rgba(120,100,66,0.5) 55%, rgba(90,74,46,0.18) 100%)', opacity: smog, transition: 'opacity .6s ease' }} />

      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 3, width: 'min(440px, 84vw)', textAlign: 'center' }}>
        <div ref={titleRef} style={{ color: '#fff', fontWeight: 800, fontSize: '.92rem', marginBottom: 6, textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>
          {complete ? tt('World fully restored!', 'संसार पूर्ण रूपमा निको भयो!') : tt(`${restoredAfter} / ${N} problems fixed`, `${restoredAfter} / ${N} समस्या समाधान`)}
        </div>
        <div style={{ height: 12, background: 'rgba(255,255,255,.28)', borderRadius: 7, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
          <div style={{ height: '100%', width: `${Math.round(disp * 100)}%`, background: 'linear-gradient(90deg,#7cd06a,#2f9e44)', borderRadius: 7, transition: 'width .15s linear' }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, padding: '0 16px 24px' }}>
        <div ref={cardRef} style={{ maxWidth: 720, margin: '0 auto', background: 'rgba(16,30,22,.9)', backdropFilter: 'blur(4px)', borderRadius: 16, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
          <div style={{ flexShrink: 0, background: '#fff', borderRadius: '50%', padding: 4 }}><BanaFace size={48} /></div>
          <div style={{ color: '#eaffe9', fontWeight: 600, fontSize: '1.02rem', lineHeight: 1.45 }}>
            {complete
              ? tt('You did it, hero! Every problem is fixed — the whole world is green and alive again, and the animals are back. Thank you, from all of us. 💚', 'तपाईंले गर्नुभयो, नायक! हरेक समस्या समाधान भयो — सारा संसार फेरि हरियो भयो, र जनावरहरू फर्के। हामी सबैको तर्फबाट धन्यवाद। 💚')
              : solvedMsg}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button ref={btnRef} onClick={onDone} style={{ border: 'none', borderRadius: 26, padding: '13px 30px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', background: '#2f9e44', color: '#fff', boxShadow: '0 8px 24px rgba(47,158,68,.5)' }}>
            {complete ? tt('See the map', 'नक्सा हेर्नुहोस्') : tt('Next', 'अर्को')} <Icon name="arrowLeft" size={16} style={{ transform: 'rotate(180deg)', verticalAlign: '-3px', marginLeft: 4 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

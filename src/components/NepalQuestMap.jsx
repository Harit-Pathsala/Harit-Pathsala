import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { LOCATIONS } from '../game/locations.js';

// journey order (easy to hard) and hand-placed positions on a 1000x580 winding trail
const ROUTE = ['apihimal', 'dadeldhura', 'mahendranagar', 'dhangadhi', 'baglung', 'kaligandaki', 'pokhara', 'tansen', 'butwal', 'lumbini', 'gorkha', 'chitwan', 'kathmandu_x', 'dhulikhel', 'panchkhal', 'janakpur', 'himalaya'];
const NEPAL_D = 'M 152,78 L 188,116 L 232,98 L 300,116 L 356,98 L 410,128 L 470,146 L 520,150 L 568,138 L 612,158 L 668,176 L 724,196 L 780,216 L 836,244 L 884,268 L 922,294 L 948,338 L 932,372 L 956,408 L 938,432 L 884,424 L 836,444 L 788,438 L 740,458 L 694,470 L 648,452 L 604,464 L 556,446 L 510,462 L 466,444 L 420,458 L 372,442 L 324,460 L 276,440 L 228,452 L 180,424 L 134,400 L 96,360 L 80,310 L 74,256 L 88,196 L 112,150 L 132,108 Z';
const LAYOUT = {
  apihimal: [165, 182], dadeldhura: [120, 232], mahendranagar: [98, 258], dhangadhi: [128, 288],
  kaligandaki: [460, 262], baglung: [445, 302], pokhara: [490, 314], tansen: [440, 346], butwal: [432, 374], lumbini: [412, 392],
  gorkha: [558, 326], chitwan: [535, 372], kathmandu_x: [632, 350], dhulikhel: [660, 360], panchkhal: [670, 352],
  janakpur: [695, 425], himalaya: [775, 250],
};
const ICON = {
  baglung: 'forest', chitwan: 'wheat', kathmandu_x: 'city', kaligandaki: 'mountain', himalaya: 'mountain', dhulikhel: 'sunrise', janakpur: 'temple', lumbini: 'wheel',
  butwal: 'motorbike', tansen: 'bolt', gorkha: 'bowl', pokhara: 'boat', dhangadhi: 'rain', apihimal: 'backpack', panchkhal: 'basket', mahendranagar: 'deer', dadeldhura: 'mountain',
};
let LAST_I = ROUTE.indexOf('kathmandu_x');

// decorations
const MTNS = [[200, 232, 1.0], [330, 208, 1.2], [470, 212, 1.1], [600, 226, 1.2], [715, 252, 1.1], [815, 292, 0.95], [262, 248, 0.8], [540, 232, 0.85]];
const TREES = [[200, 360], [280, 392], [165, 332], [360, 402], [520, 398], [600, 380], [680, 402], [240, 342], [560, 350], [640, 362], [700, 384], [185, 302], [322, 332], [492, 342], [612, 332], [148, 356], [720, 362], [400, 332], [560, 402], [300, 412], [470, 380]];
const HOUSES = [[620, 366], [645, 372], [600, 360]];
const FLAGS = [[640, 308], [462, 252]];

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const Tree = (x, y, s = 1, k = 0) => (
  <g key={`t${x}${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="2" rx="11" ry="3.5" fill="rgba(0,0,0,.12)" />
    <rect x="-2.5" y="-6" width="5" height="10" rx="2" fill="#7a5a32" />
    <path d="M 0,-30 L 12,-4 L -12,-4 Z" fill={k ? '#3f8f3a' : '#46a046'} />
    <path d="M 0,-38 L 9,-14 L -9,-14 Z" fill={k ? '#4fa148' : '#5cb255'} />
  </g>
);
const Mtn = (x, y, s) => (
  <g key={`m${x}${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -70,40 L 0,-72 L 70,40 Z" fill="#8c98a6" />
    <path d="M -34,40 L 0,-72 L 34,40 Z" fill="#9fabb8" opacity=".6" />
    <path d="M -22,-26 L 0,-72 L 22,-26 L 11,-34 L 0,-26 L -11,-34 Z" fill="#fff" />
  </g>
);

export default function NepalQuestMap({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o) => (lang === 'ne' ? o.ne : o.en);
  const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
  const nodes = ROUTE.map((id) => byId[id]).filter(Boolean);

  const [curI, setCurI] = useState(LAST_I);
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(null);
  const [walking, setWalking] = useState(false);
  const charRef = useRef(null), bodyRef = useRef(null), legARef = useRef(null), legBRef = useRef(null);
  const posRef = useRef(LAYOUT[ROUTE[LAST_I]]);
  const faceRef = useRef(1);
  const animRef = useRef(null);
  const walkingRef = useRef(false);
  const stageRef = useRef(null);

  const place = (x, y, dir, bob, swing) => {
    if (charRef.current) charRef.current.setAttribute('transform', `translate(${x} ${y}) scale(${dir} 1)`);
    if (bodyRef.current) bodyRef.current.setAttribute('transform', `translate(0 ${-bob})`);
    if (legARef.current) legARef.current.setAttribute('transform', `rotate(${swing} 0 -10)`);
    if (legBRef.current) legBRef.current.setAttribute('transform', `rotate(${-swing} 0 -10)`);
  };
  useEffect(() => {
    let raf = 0, last = performance.now(), idle = 0, phase = 0;
    const p0 = posRef.current; place(p0[0], p0[1], faceRef.current, 1, 0);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
      const a = animRef.current;
      if (a) {
        phase += dt * 10; let d = a.speed * dt;
        while (a.seg < a.pts.length - 1 && d > 0) { const s0 = a.pts[a.seg], s1 = a.pts[a.seg + 1]; const len = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 0.001; const rem = len - a.segDist; if (d < rem) { a.segDist += d; d = 0; } else { d -= rem; a.seg++; a.segDist = 0; } }
        if (a.seg >= a.pts.length - 1) { const lp = a.pts[a.pts.length - 1]; posRef.current = lp; place(lp[0], lp[1], faceRef.current, 1, 0); animRef.current = null; walkingRef.current = false; setWalking(false); LAST_I = a.targetI; setCurI(a.targetI); setTimeout(a.onDone, 260); }
        else { const s0 = a.pts[a.seg], s1 = a.pts[a.seg + 1]; const t = a.segDist / (Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 0.001); const x = s0[0] + (s1[0] - s0[0]) * t, y = s0[1] + (s1[1] - s0[1]) * t; const dir = (s1[0] - s0[0]) >= 0 ? 1 : -1; faceRef.current = dir; posRef.current = [x, y]; place(x, y, dir, Math.abs(Math.sin(phase)) * 2.4 + 0.5, Math.sin(phase) * 20); }
      } else { idle += dt; const p = posRef.current; place(p[0], p[1], faceRef.current, Math.sin(idle * 2) * 0.8 + 1, 0); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const open = (loc) => { if (loc.kind === 'explorer') onExplorer(loc.level); else onMission(loc.missionId); };
  const go = (id, idx) => {
    if (walkingRef.current) return;
    const loc = byId[id];
    if (!loc.ready) { setToast(L(loc)); setTimeout(() => setToast(null), 1700); return; }
    if (idx === curI) { open(loc); return; }
    const a = Math.min(curI, idx), b = Math.max(curI, idx);
    let pts = ROUTE.slice(a, b + 1).map((rid) => LAYOUT[rid]);
    if (idx < curI) pts = pts.reverse();
    walkingRef.current = true; setWalking(true); setHover(null);
    animRef.current = { pts, seg: 0, segDist: 0, speed: 340, targetI: idx, onDone: () => open(loc) };
  };
  const toggleFullscreen = () => { const el = stageRef.current; if (!el) return; const fs = document.fullscreenElement || document.webkitFullscreenElement; if (!fs) { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); } else { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); } };

  const pathD = smoothPath(ROUTE.map((id) => LAYOUT[id]));
  const hovered = hover ? byId[hover] : null;

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6, textAlign: 'center' }}>
        <span className="pill"><Icon name="compass" size={16} /> {tt('Nepal Quest Map', 'नेपाल यात्रा नक्सा')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Your journey from village to peak', 'गाउँदेखि हिमालसम्मको यात्रा')}</h1>
        <p className="muted" style={{ fontWeight: 600, marginTop: 2 }}>{tt('Tap a stop — your guide walks the trail and the level opens.', 'कुनै ठाउँ थिच्नुहोस् — साथी बाटो हिँड्छ र तह खुल्छ।')}</p>
      </div>

      <div ref={stageRef} className="stage" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 48px rgba(20,40,28,.22)' }}>
        <style>{`
          .qmap .trail-c{ stroke:#fff; stroke-width:3; stroke-dasharray:1 16; stroke-linecap:round; animation:qm 1.1s linear infinite; }
          @keyframes qm{ to{ stroke-dashoffset:-17; } }
          .qmap .nd{ cursor:pointer; } .qmap .nd.lock{ cursor:not-allowed; }
          .qmap .pr{ transform-box:fill-box; transform-origin:center; animation:qp 1.9s ease-out infinite; }
          @keyframes qp{ 0%{ transform:scale(1); opacity:.5 } 70%,100%{ transform:scale(2.1); opacity:0 } }
        `}</style>
        <svg className="qmap" viewBox="0 0 1000 580" width="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="qbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a8dcd5" /><stop offset="22%" stopColor="#c9e6cf" /><stop offset="40%" stopColor="#9ec57e" /><stop offset="100%" stopColor="#79a857" /></linearGradient>
            <linearGradient id="qfr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5a3d22" /><stop offset="100%" stopColor="#3c2914" /></linearGradient>
            <filter id="qsh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#14361f" floodOpacity="0.3" /></filter>
            <filter id="qnd" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity="0.32" /></filter>
            <clipPath id="qnepal"><path d={NEPAL_D} /></clipPath>
          </defs>

          {/* surrounding land / haze (outside Nepal) */}
          <rect x="0" y="0" width="1000" height="580" fill="#cfe0e6" />
          <circle cx="905" cy="62" r="26" fill="#ffe07a" /><circle cx="905" cy="62" r="34" fill="#ffe07a" opacity=".25" />
          <g fill="#fff" opacity=".85"><ellipse cx="160" cy="70" rx="34" ry="13" /><ellipse cx="195" cy="64" rx="22" ry="11" /><ellipse cx="470" cy="56" rx="30" ry="12" /><ellipse cx="500" cy="62" rx="20" ry="9" /></g>
          {/* Nepal landmass — soft shadow + flat cel fill (hand-inked outline drawn above the scenery) */}
          <path d={NEPAL_D} fill="#33502a" opacity="0.18" transform="translate(5,8)" />
          <path d={NEPAL_D} fill="url(#qbg)" />
          {/* scenery, clipped to the country's borders */}
          <g clipPath="url(#qnepal)">
            {MTNS.map(([x, y, s]) => Mtn(x, y, s))}
            <path d="M 470,250 Q 448,310 462,355 Q 474,398 432,418" fill="none" stroke="#5bb8e6" strokeWidth="9" strokeLinecap="round" opacity=".9" />
            <path d="M 470,250 Q 448,310 462,355 Q 474,398 432,418" fill="none" stroke="#9fdcf3" strokeWidth="3.5" strokeLinecap="round" opacity=".7" />
            {TREES.map(([x, y], i) => Tree(x, y, 0.9 + (i % 3) * 0.12, i % 2))}
            {HOUSES.map(([x, y], i) => (
              <g key={`h${i}`} transform={`translate(${x} ${y})`}><rect x="-11" y="-6" width="22" height="14" fill="#efe2c8" stroke="#cdbf9a" /><path d="M -13,-6 L 0,-18 L 13,-6 Z" fill="#d2603f" /><rect x="-3" y="-1" width="6" height="9" fill="#8a5a2b" /></g>
            ))}
            {FLAGS.map(([x, y], i) => (
              <g key={`f${i}`}><line x1={x} y1={y} x2={x + 46} y2={y + 8} stroke="#7a6a4a" strokeWidth="1.5" />{[0, 1, 2, 3, 4].map((k) => <rect key={k} x={x + 4 + k * 8} y={y + 1 + k * 1.6} width="6" height="8" fill={['#e23c3c', '#3a78c2', '#ffd23f', '#2f9e44', '#fff'][k]} />)}</g>
            ))}
          </g>
          {/* bold hand-inked border + inner highlight line (hand-drawn look) */}
          <path d={NEPAL_D} fill="none" stroke="#26331c" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={NEPAL_D} fill="none" stroke="#bfe0a0" strokeWidth="1.6" strokeLinejoin="round" opacity="0.5" />
          {/* country label */}
          <text x="500" y="500" fontFamily="'Patrick Hand', cursive" fontSize="34" fontWeight="700" fill="#3c5a32" textAnchor="middle" opacity="0.5" letterSpacing="6">NEPAL</text>

          {/* the trail connecting all the locations */}
          <path d={pathD} fill="none" stroke="#2b3a24" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d={pathD} fill="none" stroke="#c79a52" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" filter="url(#qsh)" />
          <path d={pathD} fill="none" stroke="#e3c486" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="trail-c" d={pathD} fill="none" />

          {/* START / FINISH banners */}
          <g transform="translate(165,182)"><rect x="-34" y="-46" width="68" height="20" rx="4" fill="#e23c3c" /><text x="0" y="-32" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">START</text></g>
          <g transform="translate(775,250)"><rect x="-32" y="-48" width="64" height="20" rx="4" fill="#2f9e44" /><text x="0" y="-34" fontSize="11" fontWeight="800" fill="#fff" textAnchor="middle">FINISH</text></g>

          {/* nodes */}
          {ROUTE.map((id, i) => {
            const n = byId[id]; if (!n) return null; const [x, y] = LAYOUT[id];
            const color = !n.ready ? '#9aa0a6' : n.kind === 'explorer' ? '#2f9e44' : '#e8821e';
            return (
              <g key={id} className={`nd${n.ready ? '' : ' lock'}`} transform={`translate(${x} ${y})`} onClick={() => go(id, i)} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover((h) => (h === id ? null : h))}>
                {n.ready && <circle className="pr" r="17" fill={color} />}
                {i === curI && <circle r="23" fill="none" stroke="#ffd54a" strokeWidth="3" />}
                <circle r="16" fill="#fff" stroke={color} strokeWidth="4" filter="url(#qnd)" />
                <g transform="translate(-11 -11)" style={{ color, pointerEvents: 'none' }}>{n.ready ? <Icon name={ICON[id] || 'pin'} size={22} /> : <Icon name="lock" size={20} />}</g>
              </g>
            );
          })}

          {/* walking guide (eco student) */}
          <g ref={charRef}>
            <ellipse cx="0" cy="3" rx="10" ry="3.5" fill="rgba(0,0,0,.22)" />
            <g ref={bodyRef}>
              <g ref={legARef}><rect x="-5" y="-10" width="4.2" height="11" rx="2" fill="#33506e" /></g>
              <g ref={legBRef}><rect x="0.8" y="-10" width="4.2" height="11" rx="2" fill="#2b4560" /></g>
              <rect x="-7.5" y="-25" width="15" height="16" rx="6" fill="#2f9e44" />
              <rect x="-10" y="-23" width="4.5" height="11" rx="2" fill="#c0552f" />
              <circle cx="0" cy="-30" r="7" fill="#f3c79a" stroke="#e0b184" strokeWidth="1" />
              <circle cx="-2.5" cy="-30.5" r="1.1" fill="#3a2a1a" /><circle cx="2.5" cy="-30.5" r="1.1" fill="#3a2a1a" />
              <path d="M -7.5,-34 Q 0,-41 7.5,-34 Z" fill="#1f7a33" /><path d="M 5,-37 q 6,-3 9,2 q -6,2 -9,-2 Z" fill="#46c15a" />
            </g>
          </g>
        </svg>

        {hovered && !walking && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 280, background: 'rgba(255,255,255,.95)', borderRadius: 12, padding: '8px 12px', boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name={ICON[hovered.id] || 'pin'} size={17} /> {L(hovered)}</div>
            <div className="muted" style={{ fontWeight: 600, fontSize: '.8rem' }}>{lang === 'ne' ? hovered.note_ne : hovered.note_en} · {hovered.kind === 'explorer' ? tt('Explore', 'अन्वेषण') : tt('Mission', 'मिसन')}{hovered.ready ? '' : ` · ${tt('coming soon', 'चाँडै')}`}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,.92)', borderRadius: 20, padding: '5px 11px', fontSize: '.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} /> {tt('Explore', 'अन्वेषण')}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e8821e', display: 'inline-block' }} /> {tt('Mission', 'मिसन')}</span></span>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.92)' }}><Icon name="expand" size={16} /></button>
        </div>
        {walking && <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(47,158,68,.92)', color: '#fff', borderRadius: 20, padding: '5px 12px', fontWeight: 800, fontSize: '.8rem' }}><Icon name="walk" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {tt('Walking…', 'हिँड्दै…')}</div>}
        {toast && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700 }}><Icon name="lock" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {toast} — {tt('coming soon', 'चाँडै आउँदै')}</div>}
      </div>
    </div>
  );
}

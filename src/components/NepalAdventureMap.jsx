import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n.jsx';
import { LOCATIONS } from '../game/locations.js';
import { NEPAL_VIEW, NEPAL_PATH } from '../game/nepalMapData.js';

// trail graph — which nodes are linked (the character walks these dotted routes)
const EDGES = [
  ['apihimal', 'dadeldhura'], ['dadeldhura', 'mahendranagar'], ['dadeldhura', 'dhangadhi'], ['mahendranagar', 'dhangadhi'],
  ['dhangadhi', 'lumbini'], ['lumbini', 'butwal'], ['butwal', 'tansen'], ['tansen', 'baglung'],
  ['baglung', 'pokhara'], ['baglung', 'kaligandaki'], ['pokhara', 'kaligandaki'],
  ['butwal', 'chitwan'], ['chitwan', 'gorkha'], ['gorkha', 'pokhara'], ['gorkha', 'kathmandu_x'], ['chitwan', 'kathmandu_x'],
  ['kathmandu_x', 'dhulikhel'], ['kathmandu_x', 'panchkhal'], ['dhulikhel', 'panchkhal'],
  ['panchkhal', 'janakpur'], ['panchkhal', 'himalaya'], ['dhulikhel', 'himalaya'],
];

const ICON = {
  baglung: '🌲', chitwan: '🌾', kathmandu_x: '🏙️', kaligandaki: '🏞️', himalaya: '🏔️',
  dhulikhel: '🌄', janakpur: '🛕', lumbini: '☸️',
  butwal: '🛵', tansen: '⚡', gorkha: '🍳', pokhara: '🚣', dhangadhi: '🌧️',
  apihimal: '🎒', panchkhal: '🧺', mahendranagar: '🛺', dadeldhura: '⛰️',
};

// decorative terrain (clipped to the landmass)
const PEAKS = [[150, 120], [250, 100], [335, 150], [600, 110], [770, 95], [855, 125], [915, 165]];
const TREES = [[300, 270], [350, 320], [470, 320], [540, 370], [610, 365], [700, 365], [770, 405], [820, 425], [250, 250], [430, 360]];
const RIVER = 'M 470,165 Q 505,235 540,295 T 515,400 Q 545,440 565,475';

// remember where the walker is across map re-mounts in this session
let LAST_NODE = 'kathmandu_x';

export default function NepalAdventureMap({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o) => (lang === 'ne' ? o.ne : o.en);
  const note = (o) => (lang === 'ne' ? o.note_ne : o.note_en);

  const nodes = LOCATIONS.filter((l) => ICON[l.id] || l.kind);  // all placed locations
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const startId = byId[LAST_NODE] ? LAST_NODE : 'kathmandu_x';

  const [currentId, setCurrentId] = useState(startId);
  const [hoverId, setHoverId] = useState(null);
  const [toast, setToast] = useState(null);
  const [walking, setWalking] = useState(false);

  const charRef = useRef(null);
  const bodyRef = useRef(null);
  const legARef = useRef(null);
  const legBRef = useRef(null);
  const posRef = useRef({ x: byId[startId].mapX, y: byId[startId].mapY });
  const faceRef = useRef(1);
  const animRef = useRef(null);
  const walkingRef = useRef(false);
  const stageRef = useRef(null);

  // adjacency + BFS
  const adj = {};
  EDGES.forEach(([a, b]) => { if (byId[a] && byId[b]) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); } });
  function bfs(from, to) {
    if (from === to) return [from];
    const q = [from], prev = { [from]: null }; 
    while (q.length) {
      const cur = q.shift();
      for (const nx of (adj[cur] || [])) { if (!(nx in prev)) { prev[nx] = cur; if (nx === to) { const path = [to]; let p = cur; while (p != null) { path.unshift(p); p = prev[p]; } return path; } q.push(nx); } }
    }
    return null;
  }

  const place = (x, y, dir, bob, swing) => {
    if (charRef.current) charRef.current.setAttribute('transform', `translate(${x} ${y}) scale(${dir} 1)`);
    if (bodyRef.current) bodyRef.current.setAttribute('transform', `translate(0 ${-bob})`);
    if (legARef.current) legARef.current.setAttribute('transform', `rotate(${swing} 0 -11)`);
    if (legBRef.current) legBRef.current.setAttribute('transform', `rotate(${-swing} 0 -11)`);
  };

  // animation loop (idle bob + walking)
  useEffect(() => {
    let raf = 0, last = performance.now(), idle = 0, phase = 0;
    place(posRef.current.x, posRef.current.y, faceRef.current, 0, 0);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
      const a = animRef.current;
      if (a) {
        phase += dt * 11;
        let d = a.speed * dt;
        while (a.seg < a.pts.length - 1 && d > 0) {
          const p0 = a.pts[a.seg], p1 = a.pts[a.seg + 1];
          const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 0.001;
          const remain = segLen - a.segDist;
          if (d < remain) { a.segDist += d; d = 0; } else { d -= remain; a.seg++; a.segDist = 0; }
        }
        let x, y, dir = faceRef.current;
        if (a.seg >= a.pts.length - 1) {
          const lastp = a.pts[a.pts.length - 1]; x = lastp.x; y = lastp.y;
          posRef.current = { x, y }; place(x, y, dir, 0, 0);
          const done = a.onDone; animRef.current = null; walkingRef.current = false; setWalking(false);
          LAST_NODE = a.targetId; setCurrentId(a.targetId);
          setTimeout(done, 280);
        } else {
          const p0 = a.pts[a.seg], p1 = a.pts[a.seg + 1];
          const t = a.segDist / (Math.hypot(p1.x - p0.x, p1.y - p0.y) || 0.001);
          x = p0.x + (p1.x - p0.x) * t; y = p0.y + (p1.y - p0.y) * t;
          dir = (p1.x - p0.x) >= 0 ? 1 : -1; faceRef.current = dir;
          posRef.current = { x, y };
          place(x, y, dir, Math.abs(Math.sin(phase)) * 2.6, Math.sin(phase) * 22);
        }
      } else {
        idle += dt; place(posRef.current.x, posRef.current.y, faceRef.current, Math.sin(idle * 2) * 1.0 + 1, 0);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const open = (loc) => { if (loc.kind === 'explorer') onExplorer(loc.level); else onMission(loc.missionId); };
  const go = (loc) => {
    if (walkingRef.current) return;
    if (!loc.ready) { setToast(L(loc)); setTimeout(() => setToast(null), 1700); return; }
    if (loc.id === currentId) { open(loc); return; }
    const path = bfs(currentId, loc.id);
    if (!path || path.length < 2) { open(loc); return; }
    const pts = path.map((id) => ({ x: byId[id].mapX, y: byId[id].mapY }));
    walkingRef.current = true; setWalking(true); setHoverId(null);
    animRef.current = { pts, seg: 0, segDist: 0, speed: 360, targetId: loc.id, onDone: () => open(loc) };
  };

  const toggleFullscreen = () => {
    const el = stageRef.current; if (!el) return;
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fs) { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); }
    else { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); }
  };

  // build edge curves (slight bow for a hand-drawn look)
  const edgePaths = EDGES.filter(([a, b]) => byId[a] && byId[b]).map(([a, b], i) => {
    const p = byId[a], q = byId[b];
    const mx = (p.mapX + q.mapX) / 2, my = (p.mapY + q.mapY) / 2;
    const dx = q.mapX - p.mapX, dy = q.mapY - p.mapY, len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(26, len * 0.12) * (i % 2 ? 1 : -1);
    const cx = mx + (-dy / len) * bow, cy = my + (dx / len) * bow;
    return `M ${p.mapX},${p.mapY} Q ${cx},${cy} ${q.mapX},${q.mapY}`;
  });

  const hovered = hoverId ? byId[hoverId] : null;

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 6, textAlign: 'center' }}>
        <span className="pill">🗺️ {tt('Nepal Adventure Map', 'नेपाल एडभेन्चर नक्सा')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Pick your next quest', 'अर्को यात्रा रोज्नुहोस्')}</h1>
        <p className="muted" style={{ fontWeight: 600, marginTop: 2 }}>{tt('Tap a place — your guide walks there, then the level opens.', 'ठाउँमा थिच्नुहोस् — तपाईंको साथी त्यहाँ हिँडेर जान्छ, अनि तह खुल्छ।')}</p>
      </div>

      <div ref={stageRef} className="stage" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 48px rgba(20,40,28,.22)' }}>
        <style>{`
          .trail{ fill:none; stroke:#5b4326; stroke-width:3.4; stroke-dasharray:1.5 13; stroke-linecap:round; opacity:.62; animation:march 1.1s linear infinite; }
          @keyframes march{ to{ stroke-dashoffset:-14.5; } }
          .amap .nd{ cursor:pointer; }
          .amap .nd.lock{ cursor:not-allowed; }
          .amap .pr{ transform-box:fill-box; transform-origin:center; animation:pls 1.9s ease-out infinite; }
          @keyframes pls{ 0%{ transform:scale(1); opacity:.5 } 70%,100%{ transform:scale(2.2); opacity:0 } }
          .amap .cloud{ animation:drift 9s ease-in-out infinite; }
          @keyframes drift{ 0%,100%{ transform:translateX(0) } 50%{ transform:translateX(22px) } }
        `}</style>
        <svg className="amap" viewBox={`0 0 ${NEPAL_VIEW.w} ${NEPAL_VIEW.h}`} width="100%" style={{ display: 'block', background: 'linear-gradient(#bfe3f4 0%,#a9d7ef 55%,#cde8ec 100%)', backgroundColor: '#a9d7ef' }}>
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eef4f8" />
              <stop offset="26%" stopColor="#c3d2b4" />
              <stop offset="48%" stopColor="#7cb24e" />
              <stop offset="74%" stopColor="#94c258" />
              <stop offset="100%" stopColor="#bcc96a" />
            </linearGradient>
            <radialGradient id="sea" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#bfe3f4" />
              <stop offset="100%" stopColor="#8fc6e6" />
            </radialGradient>
            <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1b3a52" floodOpacity="0.28" /></filter>
            <filter id="ndsh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.3" /></filter>
            <clipPath id="landclip"><path d={NEPAL_PATH} /></clipPath>
          </defs>

          {/* sea */}
          <rect x="0" y="0" width={NEPAL_VIEW.w} height={NEPAL_VIEW.h} fill="url(#sea)" />
          {/* sea decorations */}
          <g opacity="0.9">
            <g className="cloud"><ellipse cx="120" cy="60" rx="34" ry="13" fill="#ffffff" opacity=".85" /><ellipse cx="150" cy="56" rx="24" ry="11" fill="#ffffff" opacity=".85" /></g>
            <g className="cloud" style={{ animationDelay: '2s' }}><ellipse cx="870" cy="55" rx="30" ry="12" fill="#fff" opacity=".82" /><ellipse cx="845" cy="60" rx="20" ry="9" fill="#fff" opacity=".82" /></g>
            <text x="70" y="300" fontSize="34" opacity=".5">🐟</text>
            <text x="940" y="470" fontSize="30" opacity=".5">⛵</text>
            <text x="60" y="500" fontSize="26" opacity=".45">🌊</text>
          </g>

          {/* landmass */}
          <path d={NEPAL_PATH} fill="url(#land)" stroke="#e8dcc0" strokeWidth="3" filter="url(#soft)" />

          {/* terrain, clipped to land */}
          <g clipPath="url(#landclip)">
            <path d={RIVER} fill="none" stroke="#5aa6d8" strokeWidth="6" strokeLinecap="round" opacity=".75" />
            {PEAKS.map(([x, y], i) => (
              <g key={`pk${i}`} transform={`translate(${x} ${y})`}>
                <path d="M -22,16 L 0,-22 L 22,16 Z" fill="#8b94a0" stroke="#6f7884" strokeWidth="1.5" />
                <path d="M -9,1 L 0,-22 L 9,1 L 3,-3 L 0,1 L -3,-3 Z" fill="#ffffff" />
              </g>
            ))}
            {TREES.map(([x, y], i) => (
              <g key={`tr${i}`} transform={`translate(${x} ${y})`}>
                <rect x="-2" y="2" width="4" height="7" fill="#7a5a32" />
                <path d="M 0,-16 L 9,2 L -9,2 Z" fill={i % 2 ? '#3f8f3a' : '#4fa148'} />
                <path d="M 0,-22 L 7,-6 L -7,-6 Z" fill={i % 2 ? '#4fa148' : '#5cb255'} />
              </g>
            ))}
          </g>

          {/* trail */}
          {edgePaths.map((d, i) => <path key={`e${i}`} className="trail" d={d} />)}

          {/* nodes */}
          {nodes.map((n) => {
            const color = !n.ready ? '#9aa0a6' : n.kind === 'explorer' ? '#2f9e44' : '#e8821e';
            const isCur = n.id === currentId;
            return (
              <g key={n.id} className={`nd${n.ready ? '' : ' lock'}`} transform={`translate(${n.mapX} ${n.mapY})`}
                onClick={() => go(n)} onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId((h) => (h === n.id ? null : h))}>
                {n.ready && <circle className="pr" r="17" fill={color} />}
                {isCur && <circle r="22" fill="none" stroke="#ffd54a" strokeWidth="3" />}
                <circle r="15" fill="#fff" stroke={color} strokeWidth="4" filter="url(#ndsh)" />
                <text x="0" y="1" fontSize="15" textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none' }}>{n.ready ? (ICON[n.id] || '•') : '🔒'}</text>
                <rect x="-30" y="19" width="60" height="13" rx="6" fill="rgba(255,255,255,.82)" style={{ pointerEvents: 'none' }} />
                <text x="0" y="26" fontSize="9.5" textAnchor="middle" dominantBaseline="central" fill="#234" fontWeight="700" style={{ pointerEvents: 'none' }}>{L(n)}</text>
              </g>
            );
          })}

          {/* the walking guide */}
          <g ref={charRef}>
            <ellipse cx="0" cy="3" rx="11" ry="4" fill="rgba(0,0,0,.22)" />
            <g ref={bodyRef}>
              <g ref={legARef}><rect x="-5.5" y="-11" width="4.5" height="12" rx="2" fill="#33506e" /></g>
              <g ref={legBRef}><rect x="1" y="-11" width="4.5" height="12" rx="2" fill="#2b4560" /></g>
              <rect x="-8" y="-26" width="16" height="17" rx="6" fill="#2f9e44" />
              <rect x="-9.5" y="-23" width="4" height="11" rx="2" fill="#2a8f3d" />
              <rect x="5.5" y="-23" width="4" height="11" rx="2" fill="#2a8f3d" />
              <circle cx="0" cy="-31" r="7.5" fill="#f3c79a" stroke="#e0b184" strokeWidth="1" />
              <circle cx="-2.6" cy="-31.5" r="1.2" fill="#3a2a1a" /><circle cx="2.6" cy="-31.5" r="1.2" fill="#3a2a1a" />
              <path d="M -8,-35 Q 0,-42 8,-35 Z" fill="#1f7a33" />
              <path d="M 6,-38 q 6,-3 9,2 q -6,2 -9,-2 Z" fill="#46c15a" />
            </g>
          </g>
        </svg>

        {/* hover info */}
        {hovered && !walking && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 280, background: 'rgba(255,255,255,.94)', borderRadius: 12, padding: '8px 12px', boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}>
            <div style={{ fontWeight: 800 }}>{ICON[hovered.id] || '📍'} {L(hovered)}</div>
            <div className="muted" style={{ fontWeight: 600, fontSize: '.82rem' }}>{note(hovered)} · {hovered.kind === 'explorer' ? tt('Explore', 'अन्वेषण') : tt('Mission', 'मिसन')}{hovered.ready ? '' : ` · ${tt('coming soon', 'चाँडै')}`}</div>
          </div>
        )}
        {/* legend + compass + fullscreen */}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '5px 11px', fontSize: '.78rem', fontWeight: 700 }}>🟢 {tt('Explore', 'अन्वेषण')} · 🟠 {tt('Mission', 'मिसन')}</span>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.9)' }}>⛶</button>
        </div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.88)', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#234', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <span style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '.7rem', color: '#e23c3c' }}>N</span>
            <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '.7rem' }}>S</span>
            <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem' }}>W</span>
            <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem' }}>E</span>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '1.1rem' }}>✦</span>
          </div>
        </div>
        {walking && <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(47,158,68,.92)', color: '#fff', borderRadius: 20, padding: '5px 12px', fontWeight: 800, fontSize: '.8rem' }}>🚶 {tt('Walking…', 'हिँड्दै…')}</div>}
        {toast && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700 }}>🔒 {toast} — {tt('coming soon', 'चाँडै आउँदै')}</div>}
      </div>
    </div>
  );
}

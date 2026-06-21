import React, { useState } from 'react';
import { NEPAL_VIEW, NEPAL_PATH } from '../game/nepalMapData.js';
import { LOCATIONS } from '../game/locations.js';
import { useLang } from '../i18n.jsx';
import { BanaFace } from './Bana.jsx';

export default function NepalMissionMap({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o, k) => (lang === 'ne' && o[`${k}_ne`] !== undefined ? o[`${k}_ne`] : o[k]);
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(false);
  const W = NEPAL_VIEW.w, H = NEPAL_VIEW.h;

  const click = (loc) => {
    if (!loc.ready) { setToast(true); window.clearTimeout(click._t); click._t = window.setTimeout(() => setToast(false), 1700); return; }
    if (loc.kind === 'explorer') onExplorer(loc.level);
    else onMission(loc.missionId);
  };

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill">🗺️ {tt('Nepal', 'नेपाल')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Choose where to go', 'कहाँ जाने रोज्नुहोस्')}</h1>
        <div className="bana" style={{ marginTop: 6 }}>
          <BanaFace size={40} />
          <div className="bana-bubble">{tt('Namaste! Tap a green pin to explore a place, or an orange pin to take on a mission. Let\u2019s keep Nepal green!', 'नमस्ते! ठाउँ घुम्न हरियो पिन, मिसन खेल्न सुन्तला पिन थिच्नुहोस्। नेपाललाई हरियो राखौँ!')}</div>
        </div>
      </div>

      <style>{`
        @keyframes hp-pin-pop { from { transform: translateY(4px) scale(.9); opacity:0 } to { transform:none; opacity:1 } }
        @keyframes hp-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(255,255,255,.5) } 50% { box-shadow:0 0 0 7px rgba(255,255,255,0) } }
        .hp-pinbtn { position:absolute; transform:translate(-50%,-100%); background:none; border:none; padding:0; cursor:pointer; z-index:2; }
        .hp-pinbtn:hover, .hp-pinbtn:focus-visible { z-index:5; }
        .hp-pin { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.05rem; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,.35); animation:hp-pin-pop .4s ease both; }
        .hp-pin.ready { animation:hp-pin-pop .4s ease both, hp-pulse 2.6s ease-in-out infinite 1s; }
        .hp-tip { width:0;height:0;margin:-2px auto 0;border-left:6px solid transparent;border-right:6px solid transparent; }
        .hp-label { position:absolute; bottom:46px; left:50%; transform:translateX(-50%); white-space:nowrap; background:rgba(20,40,28,.92); color:#fff; font-weight:800; font-size:.74rem; padding:5px 9px; border-radius:9px; box-shadow:0 4px 10px rgba(0,0,0,.3); pointer-events:none; }
        .hp-label small { font-weight:600; opacity:.85; }
      `}</style>

      <div style={{ position: 'relative', width: '100%', maxWidth: 980, margin: '0 auto', aspectRatio: `${W} / ${H}`, background: 'linear-gradient(#bfe0f2, #dff0e6)', borderRadius: 18, overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(120,160,180,.25)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="hp-terra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef4f6" />
              <stop offset="0.14" stopColor="#cfe0d4" />
              <stop offset="0.32" stopColor="#6f9a44" />
              <stop offset="0.7" stopColor="#7faf4a" />
              <stop offset="1" stopColor="#a0c662" />
            </linearGradient>
            <filter id="hp-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="9" stdDeviation="11" floodColor="#13301d" floodOpacity="0.35" />
            </filter>
          </defs>
          {/* extruded "thickness" under the landmass for a 2.5D feel */}
          <path d={NEPAL_PATH} fill="#3a6531" transform="translate(0,14)" />
          {/* the land, terrain-shaded south(green) -> north(snow) */}
          <path d={NEPAL_PATH} fill="url(#hp-terra)" stroke="#2f5226" strokeWidth="3" filter="url(#hp-soft)" />
          {/* soft top highlight to read as raised ridgeline */}
          <path d={NEPAL_PATH} fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.4" transform="translate(0,-2.5)" />
        </svg>

        {/* legend */}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,.8)', borderRadius: 10, padding: '6px 9px', fontSize: '.72rem', fontWeight: 800, color: '#234' }}>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#2f9e44', marginRight: 5, verticalAlign: 'middle' }} />🧭 {tt('Explore', 'अन्वेषण')}</span>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#e8732b', marginRight: 5, verticalAlign: 'middle' }} />🚌 {tt('Mission', 'मिसन')}</span>
        </div>

        {/* pins */}
        {LOCATIONS.map((loc) => {
          const left = (loc.mapX / W) * 100, top = (loc.mapY / H) * 100;
          const mission = loc.kind === 'mission';
          const color = mission ? '#e8732b' : '#2f9e44';
          return (
            <button key={loc.id} className="hp-pinbtn" style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => click(loc)} onMouseEnter={() => setHover(loc.id)} onMouseLeave={() => setHover(null)}
              aria-label={L(loc, 'en')}>
              {hover === loc.id && (
                <span className="hp-label">{L(loc, 'en')}<br /><small>{L(loc, 'note')}{!loc.ready ? ` · ${tt('soon', 'चाँडै')}` : ''}</small></span>
              )}
              <span className="hp-pin" style={{ background: color, opacity: loc.ready ? 1 : 0.5 }}>{mission ? '🚌' : '🧭'}</span>
              <span className="hp-tip" style={{ borderTop: `8px solid ${loc.ready ? color : 'rgba(120,120,120,.6)'}` }} />
            </button>
          );
        })}

        {toast && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,40,28,.9)', color: '#fff', fontWeight: 800, padding: '8px 16px', borderRadius: 20, zIndex: 6 }}>
            ⏳ {tt('Coming soon', 'चाँडै आउँदै')}
          </div>
        )}
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12 }}>
        {tt('Green pins open the Explorer · orange pins start a Mission. More places unlock as the game grows.', 'हरियो पिनले अन्वेषण · सुन्तला पिनले मिसन खोल्छ। खेल बढ्दै थप ठाउँ खुल्नेछन्।')}
      </div>
    </div>
  );
}

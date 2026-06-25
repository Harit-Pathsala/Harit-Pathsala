import React from 'react';
import { BanaFace } from './Bana.jsx';
import { useLang } from '../i18n.jsx';
import { sfx } from '../game/sfx.js';

// Hand-drawn globe emblem (pure SVG vector — no emoji). `id` must be unique per instance
// because the clipPath is referenced by id.
function GlobeEmblem({ id, tint = '#2f9e44', bg = '#eafaf0' }) {
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={`globe-${id}`}><circle cx="39" cy="39" r="32" /></clipPath>
      </defs>
      <circle cx="39" cy="39" r="33.5" fill={bg} stroke={tint} strokeWidth="3" />
      <g clipPath={`url(#globe-${id})`} stroke={tint} fill="none">
        {/* parallels */}
        <line x1="5" y1="27" x2="73" y2="27" strokeWidth="1.8" opacity=".55" />
        <line x1="5" y1="39" x2="73" y2="39" strokeWidth="2.4" />
        <line x1="5" y1="51" x2="73" y2="51" strokeWidth="1.8" opacity=".55" />
        {/* meridians */}
        <line x1="39" y1="4" x2="39" y2="74" strokeWidth="2.4" />
        <ellipse cx="39" cy="39" rx="14" ry="33" strokeWidth="2.2" />
        <ellipse cx="39" cy="39" rx="27" ry="33" strokeWidth="1.8" opacity=".55" />
      </g>
      {/* small speech mark to signal "language" */}
      <g transform="translate(54,52)">
        <path d="M2 2 h16 a4 4 0 0 1 4 4 v7 a4 4 0 0 1 -4 4 H10 l-5 5 v-5 H2 a4 4 0 0 1 -4 -4 V6 a4 4 0 0 1 4 -4 z" fill={tint} stroke="#fff" strokeWidth="1.5" />
        <circle cx="6" cy="10" r="1.5" fill="#fff" /><circle cx="11" cy="10" r="1.5" fill="#fff" /><circle cx="16" cy="10" r="1.5" fill="#fff" />
      </g>
    </svg>
  );
}

export default function LanguageSelect({ onPick }) {
  const { setLang } = useLang();
  const choose = (l) => { sfx.resume(); sfx.start(); setLang(l); if (onPick) onPick(l); };

  const card = {
    cursor: 'pointer', border: '2.5px solid #2b3a24', background: 'rgba(255,255,255,.92)',
    borderRadius: 22, padding: '26px 22px 22px', width: 210, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12, boxShadow: '5px 6px 0 #2b3a24', color: '#2b3a24',
    fontFamily: "'Baloo 2', 'Nunito', sans-serif",
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'grid', placeItems: 'center', padding: 20,
      background: 'radial-gradient(120% 120% at 50% 16%, #f4fbeb 0%, #d8edc4 100%)' }}>
      <style>{`
        @keyframes ls-pop{ 0%{ transform:translateY(16px) scale(.96); opacity:0 } 100%{ transform:translateY(0) scale(1); opacity:1 } }
        @keyframes ls-float{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-10px) } }
        .ls-card{ animation:ls-pop .5s cubic-bezier(.2,.9,.3,1.2) both; transition:transform .16s ease, box-shadow .16s ease; }
        .ls-card:hover{ transform:translate(-1px,-3px); box-shadow:7px 9px 0 #2b3a24; }
        .ls-card:active{ transform:translate(2px,2px); box-shadow:2px 2px 0 #2b3a24; }
      `}</style>

      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ display: 'inline-grid', placeItems: 'center', width: 104, height: 104, borderRadius: '50%', background: 'rgba(255,255,255,.6)', boxShadow: '0 8px 26px rgba(120,90,40,.18)', animation: 'ls-float 2.8s ease-in-out infinite' }}>
          <BanaFace size={82} />
        </div>
        <h1 style={{ margin: '18px 0 2px', fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem,4.5vw,2rem)', color: '#2b3a24' }}>Choose your language</h1>
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 'clamp(1.05rem,3.4vw,1.35rem)', color: '#5d7a4f', marginBottom: 22 }}>आफ्नो भाषा छान्नुहोस्</div>

        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="ls-card" style={{ ...card, animationDelay: '.05s' }} onClick={() => choose('en')} data-sfx-silent aria-label="Continue in English">
            <GlobeEmblem id="en" tint="#2f9e44" bg="#eafaf0" />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>English</div>
            <div style={{ fontSize: '.92rem', fontWeight: 700, color: '#5d7a4f' }}>Tap to begin</div>
          </button>

          <button className="ls-card" style={{ ...card, animationDelay: '.16s' }} onClick={() => choose('ne')} data-sfx-silent aria-label="नेपालीमा जारी राख्नुहोस्">
            <GlobeEmblem id="ne" tint="#c98a2b" bg="#fdf3e3" />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>नेपाली</div>
            <div style={{ fontSize: '.92rem', fontWeight: 700, color: '#9a7322' }}>सुरु गर्न ट्याप गर्नुहोस्</div>
          </button>
        </div>

        <div style={{ marginTop: 26, fontFamily: "'Patrick Hand', cursive", fontSize: '1.08rem', color: '#5d7a4f', letterSpacing: '.02em' }}>हरित पाठशाला · Harit Pathsala</div>
      </div>
    </div>
  );
}

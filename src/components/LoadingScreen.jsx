import React from 'react';
import { BanaFace } from './Bana.jsx';

// Messenger-style hand-drawn loading: wobbly hand-lettered word + Bana floating below.
export default function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center',
      background: 'radial-gradient(120% 120% at 50% 16%, #f4fbeb 0%, #d8edc4 100%)' }}>
      <style>{`
        @keyframes hp-float{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-15px) } }
        @keyframes hp-shadow{ 0%,100%{ transform:scaleX(1); opacity:.26 } 50%{ transform:scaleX(.68); opacity:.14 } }
        @keyframes hp-dot{ 0%,75%,100%{ transform:translateY(0); opacity:.35 } 38%{ transform:translateY(-9px); opacity:1 } }
        @keyframes hp-wob{ 0%,100%{ transform:rotate(-2.5deg) } 50%{ transform:rotate(-1deg) } }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 'clamp(2.4rem,8vw,4.2rem)', color: '#2b3a24', letterSpacing: '.1em', display: 'inline-flex', alignItems: 'center', animation: 'hp-wob 3s ease-in-out infinite' }}>
          LOADING
          <span style={{ display: 'inline-flex', gap: 7, marginLeft: 12 }}>
            {[0, 1, 2].map((i) => (<span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: '#2b3a24', animation: `hp-dot 1.2s ${i * 0.18}s infinite` }} />))}
          </span>
        </div>
        <div style={{ marginTop: 30, animation: 'hp-float 2.6s ease-in-out infinite', display: 'inline-grid', placeItems: 'center', width: 168, height: 168, borderRadius: '50%', background: 'rgba(255,255,255,.6)', boxShadow: '0 8px 26px rgba(120,90,40,.18)' }}><BanaFace size={122} /></div>
        <div style={{ width: 120, height: 15, margin: '4px auto 0', borderRadius: '50%', background: '#2b3a24', animation: 'hp-shadow 2.6s ease-in-out infinite' }} />
        <div style={{ marginTop: 20, fontFamily: "'Patrick Hand', cursive", fontSize: '1.15rem', color: '#5d7a4f', letterSpacing: '.02em' }}>हरित पाठशाला · Harit Pathsala</div>
      </div>
    </div>
  );
}

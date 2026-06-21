import React, { useState } from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';

// Messenger-style on-screen dialogue: a wide paper panel anchored to the bottom,
// a "Bana" speaker tab in the corner, hand-lettered text paged one line at a time,
// and a play-arrow to advance (check on the last line). No emoji.
export default function BanaDialog({ lines, onClose }) {
  const [i, setI] = useState(0);
  if (!lines || !lines.length) return null;
  const last = i >= lines.length - 1;
  const advance = () => { if (last) onClose && onClose(); else setI(i + 1); };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60, display: 'flex', justifyContent: 'center', padding: '0 14px 18px', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: 'min(760px, 100%)', pointerEvents: 'auto' }}>
        {/* speaker tab */}
        <div style={{ position: 'absolute', top: -20, left: 18, zIndex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'var(--primary)', color: '#fff', border: '2.5px solid var(--ink)', borderRadius: '12px 12px 2px 2px', padding: '3px 13px 5px', fontFamily: 'var(--hand)', fontSize: '1.05rem', boxShadow: '2px 2px 0 var(--ink)' }}>
          <span style={{ width: 24, height: 24, display: 'inline-block' }}><BanaFace size={24} /></span> Bana
        </div>
        {/* paper panel */}
        <div style={{ background: 'var(--surface)', border: '2.5px solid var(--ink)', borderRadius: '15px 12px 16px 13px', boxShadow: '5px 6px 0 var(--ink)', padding: '24px 64px 22px 22px', minHeight: 86, position: 'relative', fontFamily: 'var(--hand)', fontSize: 'clamp(1.05rem, 2.6vw, 1.32rem)', color: 'var(--ink)', lineHeight: 1.42 }}>
          {lines[i]}
          {lines.length > 1 && (
            <div style={{ position: 'absolute', left: 22, bottom: 9, display: 'flex', gap: 5 }}>
              {lines.map((_, k) => (<span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: k === i ? 'var(--ink)' : 'var(--border-soft)' }} />))}
            </div>
          )}
          <button onClick={advance} title={last ? 'Start' : 'Next'}
            style={{ position: 'absolute', right: 13, bottom: 13, width: 46, height: 46, border: '2.5px solid var(--ink)', borderRadius: 12, background: 'var(--primary)', color: '#fff', boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name={last ? 'check' : 'play'} size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

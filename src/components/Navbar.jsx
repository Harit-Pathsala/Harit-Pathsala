import React, { useState, useEffect } from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { sfx } from '../game/sfx.js';
import { useAuth } from '../data/auth.jsx';

const ITEMS = [
  { id: 'profile', icon: 'user' },
  { id: 'map', icon: 'compass' },
  { id: 'calc', icon: 'calculator' },
  { id: 'world', icon: 'leaf' },
  { id: 'ask', icon: 'chat' },
];

// SVG speaker icon (slash when muted) — no emoji
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

export default function Navbar({ tab, setTab }) {
  const { lang, setLang, t } = useLang();
  const { user, logout } = useAuth();
  const [muted, setMuted] = useState(() => sfx.isMuted());
  useEffect(() => { const h = (e) => setMuted(!!e.detail); window.addEventListener('harit-mute', h); return () => window.removeEventListener('harit-mute', h); }, []);
  const toggleSound = () => { const m = sfx.toggleMuted(); setMuted(m); if (!m) sfx.click(); };
  return (
    <nav className="nav">
      <div className="brand">
        <BanaFace size={40} />
        <div>
          <b>Harit Pathsala</b>
          <small>हरित पाठशाला · Green School</small>
        </div>
      </div>
      <div className="tabs">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            className={'tab' + (tab === it.id ? ' active' : '')}
            onClick={() => setTab(it.id)}
          >
            <span className="ti"><Icon name={it.icon} size={20} /></span>
            <span className="tl">{t('nav.' + it.id)}</span>
          </button>
        ))}
        <button className="sound-toggle" onClick={toggleSound} data-sfx-silent aria-label={muted ? 'Turn sound on' : 'Turn sound off'} title={muted ? 'Sound off' : 'Sound on'} style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--border-soft)', background: muted ? 'var(--surface-soft)' : 'var(--surface)', color: muted ? 'var(--muted)' : 'var(--primary)', cursor: 'pointer' }}>
          <SpeakerIcon muted={muted} />
        </button>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'ne' ? 'on' : ''} onClick={() => setLang('ne')}>ने</button>
        </div>
        {user && (
          <button className="sound-toggle" onClick={() => { sfx.click(); logout(); }} data-sfx-silent title={(user.name || '') + ' · ' + (lang === 'ne' ? 'लग आउट' : 'Log out')} aria-label="Log out"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', borderRadius: 19, border: '2px solid var(--border-soft)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, fontSize: '.82rem' }}>
            <Icon name="logout" size={16} /> <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(user.name || '').split(' ')[0]}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

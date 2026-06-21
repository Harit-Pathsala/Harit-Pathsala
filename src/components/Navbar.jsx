import React from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

const ITEMS = [
  { id: 'calc', icon: 'calculator' },
  { id: 'map', icon: 'compass' },
  { id: 'world', icon: 'leaf' },
  { id: 'ask', icon: 'chat' },
];

export default function Navbar({ tab, setTab }) {
  const { lang, setLang, t } = useLang();
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
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'ne' ? 'on' : ''} onClick={() => setLang('ne')}>ने</button>
        </div>
      </div>
    </nav>
  );
}

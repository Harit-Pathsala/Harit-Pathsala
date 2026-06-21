import React, { useState } from 'react';
import { useLang } from '../i18n.jsx';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { INTROS } from '../game/introLines.js';
import { GameGate } from '../game/gameGate.js';

// Opens a mission/explorer directly as a full-bleed environment. Bana's intro is
// overlaid on the LIVE scene as a Messenger-style speech bar (light-green theme);
// advancing past the last line dismisses it and you keep playing.
export default function GameShell({ route, children, onExit }) {
  const { lang } = useLang();
  const [done, setDone] = useState(false);
  const [page, setPage] = useState(0);

  const key = route.kind === 'explorer' ? `explorer:${route.level}` : `mission:${route.missionId}`;
  const d = INTROS[key];
  const lines = d ? (lang === 'ne' ? d.ne : d.en) : [];
  const last = page >= lines.length - 1;
  const active = done || lines.length === 0;
  const advance = () => { if (last) setDone(true); else setPage(page + 1); };
  const exit = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onExit && onExit(); };

  return (
    <div className="game-shell">
      {/* the actual game — forced full-bleed by CSS; frozen until intro dismissed */}
      <GameGate.Provider value={{ active }}><div className="gs-content">{children}</div></GameGate.Provider>

      <button className="hud-btn gs-exit" onClick={exit}>
        <Icon name="arrowLeft" size={16} /> {lang === 'ne' ? 'नक्सा' : 'Map'}
      </button>

      {!done && lines.length > 0 && (
        <div className="bana-speech">
          <div className="bana-speech-wrap">
            <div className="bana-speech-tab"><span style={{ width: 24, height: 24, display: 'inline-block' }}><BanaFace size={24} /></span> Bana</div>
            <div className="bana-speech-panel">
              <div className="bana-speech-text">{lines[page]}</div>
              {lines.length > 1 && (
                <div className="bana-speech-dots">{lines.map((_, k) => (<span key={k} className={k === page ? 'on' : ''} />))}</div>
              )}
              <button className="bana-speech-next" onClick={advance} title={last ? 'Start' : 'Next'}>
                <Icon name={last ? 'check' : 'play'} size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

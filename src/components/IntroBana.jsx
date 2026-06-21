import React from 'react';
import { useLang } from '../i18n.jsx';
import BanaDialog from './BanaDialog.jsx';
import { INTROS } from '../game/introLines.js';

// Shows Bana's location intro when a mission/explorer is entered. Rendered inside
// the LanguageProvider so it can read the current language.
export default function IntroBana({ route, onClose }) {
  const { lang } = useLang();
  if (!route) return null;
  const key = route.kind === 'explorer' ? `explorer:${route.level}` : `mission:${route.missionId}`;
  const d = INTROS[key];
  if (!d) return null;
  const lines = lang === 'ne' ? d.ne : d.en;
  return <BanaDialog lines={lines} onClose={onClose} />;
}

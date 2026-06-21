import React, { useState } from 'react';
import CommuteMission from './CommuteMission.jsx';
import PowerPatrolMission from './PowerPatrolMission.jsx';
import { useLang } from '../i18n.jsx';
import { useGameStore } from '../state/gameStore.ts';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';

const MISSIONS = [
  { id: 'm1', place: 'Butwal', place_ne: 'बुटवल', emoji: '🛵', ready: true, en: 'The School Commute', ne: 'विद्यालय यात्रा', de: 'Drive to school, dodge the traffic, and beat the 1.5 kg carbon budget.', dn: 'विद्यालय पुग्नुहोस्, ट्राफिक छल्नुहोस्, १.५ किलो बजेट जित्नुहोस्।' },
  { id: 'm2', place: 'Palpa · Tansen', place_ne: 'पाल्पा · तानसेन', emoji: '💡', ready: true, en: 'Tansen Power Patrol', ne: 'तानसेन ऊर्जा गस्ती', de: 'Hunt down wasted electricity in the hill-town school and switch it off.', dn: 'पहाडी विद्यालयमा खेर गएको बिजुली खोजेर बन्द गर्नुहोस्।' },
  { id: 'm3', place: 'Pokhara', place_ne: 'पोखरा', emoji: '🛶', ready: false, en: 'Phewa Lake Clean-Up', ne: 'फेवाताल सफाइ', de: 'Boat across Phewa Lake and clear the floating waste before it sinks.', dn: 'फेवातालमा डुङ्गा चलाएर तैरने फोहोर उठाउनुहोस्।' },
  { id: 'm4', place: 'Kathmandu', place_ne: 'काठमाडौँ', emoji: '🌫️', ready: false, en: 'Valley Air Rescue', ne: 'उपत्यका हावा बचाउ', de: 'Cut the smoggy valley\u2019s emissions, stop by stop, and clear the sky.', dn: 'धुम्मिएको उपत्यकाको उत्सर्जन घटाएर आकाश सफा गर्नुहोस्।' },
  { id: 'm5', place: 'Api Himal Base Camp', place_ne: 'आपी हिमाल आधार शिविर', emoji: '⛰️', ready: false, en: 'Base Camp Carry-Out', ne: 'आधार शिविर सरसफाइ', de: 'Trek to base camp: choose clean fuel and carry every scrap of trash back out.', dn: 'आधार शिविर पुग्दा सफा इन्धन रोजी सबै फोहोर फिर्ता बोक्नुहोस्।' },
  { id: 'm6', place: 'Dhangadhi', place_ne: 'धनगढी', emoji: '🌧️', ready: false, en: 'Far-West Flood Watch', ne: 'सुदूरपश्चिम बाढी सतर्कता', de: 'Before the monsoon hits Dhangadhi, clear the drains and sort the waste.', dn: 'मनसुनअघि धनगढीका नाला सफा गरी फोहोर छुट्याउनुहोस्।' },
  { id: 'm7', place: 'Western Nepal', place_ne: 'पश्चिम नेपाल', emoji: '🌳', ready: false, en: 'The Western Green Trail', ne: 'पश्चिम हरित यात्रा', de: 'Plant a shared forest across the western towns you\u2019ve helped.', dn: 'सघाएका पश्चिमी सहरहरूमा साझा वन रोप्नुहोस्।' },
];

export default function MissionGame() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [sel, setSel] = useState(null);
  const valley = useGameStore((s) => s.valley);
  const streak = useGameStore((s) => s.streakDays);

  const COMPONENTS = { m1: CommuteMission, m2: PowerPatrolMission };
  const PROPS = { m1: { missionId: 'butwal' } };
  if (sel && COMPONENTS[sel]) {
    const Active = COMPONENTS[sel];
    return (
      <div>
        <button className="btn ghost" onClick={() => setSel(null)} style={{ margin: '6px 0' }}>
          <Icon name="arrowLeft" size={16} /> {tt('All missions', 'सबै मिसन')}
        </button>
        <Active {...(PROPS[sel] || {})} />
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="leaf" size={15} /> {tt('Your carbon journey', 'तपाईंको कार्बन यात्रा')}</span>
        <h1 style={{ marginTop: 8 }}>{tt('Missions', 'मिसनहरू')}</h1>
        <p>{tt('Travel to real places across western Nepal — Butwal, Palpa, Pokhara, Kathmandu and beyond. In each, take on hands-on tasks and make choices to keep carbon down — no quizzes.', 'पश्चिम नेपालका साँचा ठाउँ — बुटवल, पाल्पा, पोखरा, काठमाडौँ र अरू — घुम्नुहोस्। हरेकमा प्रत्यक्ष काम गरी कार्बन घटाउने छनोट गर्नुहोस् — कुनै क्विज छैन।')}</p>
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <BanaFace size={44} />
        <div style={{ flex: 1, fontWeight: 700 }} className="muted">
          {tt('Start with Mission 1. More unlock as the game grows.', 'मिसन १ बाट सुरु गर्नुहोस्। खेल बढ्दै जाँदा थप खुल्नेछन्।')}
        </div>
        <div className="chip"><Icon name="leaf" size={16} /> {valley.trees} · {Math.round(valley.clarity * 100)}% · 🔥{streak}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            className="card"
            onClick={() => m.ready && setSel(m.id)}
            disabled={!m.ready}
            style={{ textAlign: 'left', cursor: m.ready ? 'pointer' : 'default', opacity: m.ready ? 1 : 0.6, border: m.ready ? '2px solid var(--primary)' : '2px solid transparent', position: 'relative' }}
          >
            <div style={{ fontSize: '1.8rem' }}>{m.emoji}</div>
            <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '.3px', textTransform: 'uppercase' }}>📍 {tt(m.place, m.place_ne)}</div>
            <div style={{ fontWeight: 800 }}>{i + 1}. {tt(m.en, m.ne)}</div>
            <div className="muted" style={{ fontSize: '.78rem', fontWeight: 600 }}>{tt(m.de, m.dn)}</div>
            <div style={{ marginTop: 6, fontSize: '.72rem', fontWeight: 800, color: m.ready ? 'var(--primary)' : 'var(--muted)' }}>
              {m.ready ? tt('▶ Play', '▶ खेल्नुहोस्') : tt('Coming soon', 'चाँडै आउँदै')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

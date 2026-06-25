import React, { useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../data/auth.jsx';
import { useGameStore } from '../state/gameStore.ts';
import { sfx } from '../game/sfx.js';
import { CATEGORY_META } from '../logic.js';
import * as db from '../data/db.js';

const TOTAL_LEVELS = 18;

function Stat({ icon, value, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
      <Icon name={icon} size={22} style={{ color: color || 'var(--primary)' }} />
      <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div className="muted" style={{ fontWeight: 700, fontSize: '.74rem' }}>{label}</div>
    </div>
  );
}

export default function StudentProfile({ onPlay }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { user } = useAuth();
  const ecoPoints = useGameStore((s) => s.ecoPoints);
  const valley = useGameStore((s) => s.valley);
  const levelsPassed = useGameStore((s) => s.levelsPassed);
  const streakDays = useGameStore((s) => s.streakDays);
  const todos = useGameStore((s) => s.todos);
  const toggleTodo = useGameStore((s) => s.toggleTodo);
  const [, force] = useState(0); const refresh = () => force((n) => n + 1);

  const history = db.getCarbon(user?.id);
  const latest = history.length ? history[history.length - 1] : null;
  const cls = user?.classId ? db.getClass(user.classId) : null;
  const tasks = db.getClassTasks(user?.classId);

  // breakdown of the latest footprint (positive categories only), kg/day
  const breakdown = latest ? Object.entries(latest.breakdown || {})
    .filter(([k, v]) => k !== 'carbon_sink' && v > 0)
    .map(([k, v]) => ({ k, v, meta: CATEGORY_META[k] || { label: k, color: '#888', icon: 'leaf' } }))
    .sort((a, b) => b.v - a.v) : [];
  const maxV = breakdown.reduce((m, b) => Math.max(m, b.v), 0) || 1;

  // simple yearly-trend bars (last 8 measurements)
  const trend = history.slice(-8).map((h) => h.yearly || 0);
  const maxY = trend.reduce((m, v) => Math.max(m, v), 0) || 1;

  const toggleTask = (taskId, done) => { db.setTaskDone(taskId, user.id, done); if (done) { sfx.correct(); } else sfx.click(); refresh(); };

  const hour = new Date().getHours();
  const greet = hour < 12 ? tt('Good morning', 'शुभ प्रभात') : hour < 17 ? tt('Good afternoon', 'शुभ दिन') : tt('Good evening', 'शुभ साँझ');

  return (
    <div className="page fade-in">
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.6rem', flexShrink: 0 }}>{(user?.name || '?').slice(0, 1).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: '0 0 2px', color: 'var(--ink)', fontFamily: "'Baloo 2',sans-serif" }}>{greet}, {user?.name?.split(' ')[0]}!</h1>
          <div className="muted" style={{ fontWeight: 700 }}>@{user?.username}{cls ? ` · ${cls.name}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => { sfx.click(); onPlay && onPlay('map'); }}><Icon name="play" size={16} /> {tt('Play', 'खेल्नुहोस्')}</button>
          <button className="btn ghost" onClick={() => { sfx.click(); onPlay && onPlay('calc'); }}><Icon name="calculator" size={16} /> {tt('Calculator', 'क्यालकुलेटर')}</button>
          <button className="btn ghost" onClick={() => { sfx.click(); onPlay && onPlay('ask'); }}><Icon name="chat" size={16} /> {tt('Ask Bana', 'बाना')}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginTop: 14 }}>
        <Stat icon="leaf" value={latest ? `${latest.ecoScore}%` : '—'} label={tt('Eco score', 'इको स्कोर')} />
        <Stat icon="trophy" value={`${levelsPassed.length}/${TOTAL_LEVELS}`} label={tt('Game levels', 'खेल तह')} color="#e9a23b" />
        <Stat icon="coin" value={ecoPoints} label={tt('Eco points', 'इको अंक')} color="#e9a23b" />
        <Stat icon="tree" value={valley.trees} label={tt('Trees grown', 'रोपेका रूख')} />
        <Stat icon="sun" value={streakDays} label={tt('Day streak', 'दिन निरन्तरता')} color="#f4a261" />
      </div>

      {/* carbon footprint */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="calculator" size={19} /> {tt('My carbon footprint', 'मेरो कार्बन फुटप्रिन्ट')}</h3>
          {latest && <span className="muted" style={{ fontWeight: 700, fontSize: '.82rem' }}>{tt('Last measured', 'पछिल्लो नाप')}: {new Date(latest.ts).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB')}</span>}
        </div>

        {!latest ? (
          <div style={{ textAlign: 'center', padding: '22px 10px' }}>
            <p className="muted" style={{ fontWeight: 700, marginBottom: 12 }}>{tt('You haven\u2019t measured your footprint yet. Open the Calculator to see where your emissions come from.', 'तपाईंले अझै फुटप्रिन्ट नाप्नुभएको छैन। क्यालकुलेटर खोल्नुहोस्।')}</p>
            <button className="btn" onClick={() => { sfx.click(); onPlay && onPlay('calc'); }}><Icon name="calculator" size={16} /> {tt('Open Calculator', 'क्यालकुलेटर खोल्नुहोस्')}</button>
          </div>
        ) : (<>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', margin: '12px 0 16px' }}>
            <div><div style={{ fontWeight: 800, fontSize: '1.8rem', color: '#e76f51' }}>{latest.daily}</div><div className="muted" style={{ fontWeight: 700, fontSize: '.78rem' }}>{tt('kg CO\u2082 / day', 'किलो CO\u2082 / दिन')}</div></div>
            <div><div style={{ fontWeight: 800, fontSize: '1.8rem', color: '#e76f51' }}>{latest.yearly}</div><div className="muted" style={{ fontWeight: 700, fontSize: '.78rem' }}>{tt('kg CO\u2082 / year', 'किलो CO\u2082 / वर्ष')}</div></div>
            <div><div style={{ fontWeight: 800, fontSize: '1.8rem', color: 'var(--primary)' }}>{latest.ecoScore}%</div><div className="muted" style={{ fontWeight: 700, fontSize: '.78rem' }}>{tt('eco score', 'इको स्कोर')}</div></div>
          </div>

          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '.9rem', marginBottom: 8 }}>{tt('Where it comes from', 'कहाँबाट आउँछ')}</div>
          <div style={{ display: 'grid', gap: 9 }}>
            {breakdown.map(({ k, v, meta }) => (
              <div key={k}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <Icon name={meta.icon} size={15} style={{ color: meta.color }} />
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '.86rem', flex: 1 }}>{lang === 'ne' && meta.labelNe ? meta.labelNe : meta.label}</span>
                  <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: '.8rem' }}>{v.toFixed(2)} kg</span>
                </div>
                <div style={{ height: 9, borderRadius: 999, background: 'var(--border-soft,#e3ebe0)', overflow: 'hidden' }}>
                  <div style={{ width: `${(v / maxV) * 100}%`, height: '100%', background: meta.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>

          {trend.length > 1 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '.9rem', marginBottom: 8 }}>{tt('Your progress over time (kg/year)', 'समयसँगै प्रगति (किलो/वर्ष)')}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
                {trend.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: `${(v / maxY) * 70}px`, minHeight: 3, background: i === trend.length - 1 ? 'var(--primary)' : '#a9cf9a', borderRadius: '5px 5px 0 0' }} title={`${v} kg/yr`} />
                    <span className="muted" style={{ fontSize: '.6rem', fontWeight: 700 }}>{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.74rem', marginTop: 4 }}>{tt('Each bar is one calculation. Lower is greener!', 'हरेक बार एक गणना हो। तल हुँदा हरियो!')}</div>
            </div>
          )}
        </>)}
      </div>

      {/* class tasks */}
      {tasks.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ margin: '0 0 4px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="target" size={19} /> {tt('Class green tasks', 'कक्षाका हरित कार्य')}</h3>
          <p className="muted" style={{ fontWeight: 700, fontSize: '.82rem', marginTop: 0 }}>{tt('Assigned by your school to meet Green School goals.', 'हरित विद्यालय लक्ष्य पूरा गर्न तपाईंको विद्यालयले तोकेको।')}</p>
          <div style={{ display: 'grid', gap: 9 }}>
            {tasks.map((t) => {
              const done = !!(t.doneBy || {})[user.id];
              return (
                <label key={t.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer', padding: '10px 12px', borderRadius: 12, background: 'var(--surface-soft)', border: '1.5px solid var(--border-soft,#e3ebe0)', opacity: done ? 0.7 : 1 }}>
                  <input type="checkbox" checked={done} onChange={(e) => toggleTask(t.id, e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0, accentColor: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.desc && <div style={{ fontSize: '.85rem', color: 'var(--muted)', fontWeight: 600 }}>{t.desc}</div>}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* eco to-dos from Bana */}
      {todos.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="book" size={19} /> {tt('My Eco To-Do', 'मेरो इको सूची')}</h3>
          <div style={{ display: 'grid', gap: 7 }}>
            {todos.map((td) => (
              <label key={td.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', opacity: td.done ? 0.55 : 1 }}>
                <input type="checkbox" checked={td.done} onChange={() => toggleTodo(td.id)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: 'var(--primary)' }} />
                <span style={{ textDecoration: td.done ? 'line-through' : 'none', fontWeight: 600, color: 'var(--ink)' }}>{td.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

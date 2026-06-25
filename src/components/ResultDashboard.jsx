import React, { useEffect, useMemo, useState } from 'react';
import { calculateFootprint, CATEGORY_META } from '../logic.js';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { setLastResult } from '../store.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../data/auth.jsx';
import { getSchoolAverage } from '../data/db.js';

// rough reference for a Nepali student's measured slice (transport+home energy+
// cooking+waste+stationery). Documented estimate, used only as a faint guide bar.
const NEPAL_STUDENT_REF = 1.8;

function scoreColor(s) { return s >= 80 ? 'var(--primary)' : s >= 60 ? 'var(--primary-light,#52b788)' : s >= 35 ? 'var(--warning,#f4a261)' : 'var(--danger,#e76f51)'; }
function scoreMeta(s) {
  if (s >= 80) return { key: 'champion', icon: 'trophy' };
  if (s >= 60) return { key: 'greener', icon: 'leaf' };
  if (s >= 35) return { key: 'room', icon: 'sprout' };
  return { key: 'high', icon: 'flame' };
}

function ScoreRing({ score }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100), col = scoreColor(score);
  return (
    <div className="score-ring" style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent-warm,#eef3ea)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div><b style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: '2rem', color: col, lineHeight: 1 }}>{score}</b><div style={{ fontSize: '.62rem', fontWeight: 800, letterSpacing: '.08em', color: 'var(--muted)' }}>ECO SCORE</div></div>
      </div>
    </div>
  );
}

function Donut({ segments }) {
  const r = 42, c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div className="donut-box" style={{ width: 160, margin: '0 auto' }}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-soft)" strokeWidth="20" />
        {segments.map((s) => {
          const frac = s.value / total, len = frac * c, dash = `${len} ${c - len}`, offset = -acc * c; acc += frac;
          return (<circle key={s.key} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="20" strokeDasharray={dash} strokeDashoffset={offset} transform="rotate(-90 60 60)"><title>{s.label}</title></circle>);
        })}
        <text x="60" y="56" textAnchor="middle" fontFamily="Baloo 2" fontWeight="800" fontSize="13" fill="var(--primary)">{total.toFixed(2)}</text>
        <text x="60" y="70" textAnchor="middle" fontSize="7" fill="var(--muted)" fontWeight="700">kg CO₂/day</text>
      </svg>
    </div>
  );
}

export default function ResultDashboard({ answers, onRestart }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { user } = useAuth();
  const res = useMemo(() => calculateFootprint(answers), [answers]);
  useEffect(() => { setLastResult(res); }, [res]);
  const [school, setSchool] = useState(null);
  // read the school average AFTER this result is saved (Calculator saves on reveal)
  useEffect(() => { const id = setTimeout(() => setSchool(getSchoolAverage()), 60); return () => clearTimeout(id); }, [res]);

  const label = (k) => (lang === 'ne' && CATEGORY_META[k]?.labelNe ? CATEGORY_META[k].labelNe : CATEGORY_META[k]?.label || k);
  const segs = Object.entries(res.breakdown)
    .filter(([k, v]) => v > 0 && CATEGORY_META[k])
    .map(([k, v]) => ({ key: k, value: v, color: CATEGORY_META[k].color, label: `${label(k)} · ${v.toFixed(2)} kg` }))
    .sort((x, y) => y.value - x.value);
  const topCat = segs[0];
  const sm = scoreMeta(res.ecoScore);
  const scoreText = { champion: tt('Eco Champion!', 'इको च्याम्पियन!'), greener: tt('Doing well', 'राम्रो गर्दै'), room: tt('Room to improve', 'सुधारको ठाउँ'), high: tt('High footprint', 'उच्च फुटप्रिन्ट') }[sm.key];

  // simple, honest tips from the actual answers (shown only now, after answering)
  const tips = [];
  if (answers.transportMode === 'car') tips.push(tt('Your school trip is the car — sharing a ride, taking the bus, or cycling when you can cuts this the most.', 'विद्यालय यात्रा कारमा छ — सवारी साझेदारी, बस वा साइकल प्रयोगले यो सबैभन्दा घटाउँछ।'));
  else if (answers.transportMode === 'motorbike') tips.push(tt('A bus or cycle for the school trip would lower your transport emissions.', 'विद्यालयका लागि बस वा साइकलले यातायात उत्सर्जन घटाउँछ।'));
  if (answers.electricityUnits > 120 && !answers.hasSolar) tips.push(tt('Your home uses a lot of electricity — switching off idle lights/fans and, if possible, rooftop solar would help.', 'घरमा धेरै बिजुली खपत हुन्छ — नचाहिने बत्ती/पंखा बन्द गर्ने र सम्भव भए छानामा सौर्य प्यानलले मद्दत गर्छ।'));
  if (answers.lpgCylinders >= 1.5) tips.push(tt('Cooking gas is a big share. An induction stove (Nepal\u2019s grid is clean hydro) or biogas, plus a lid on the pot, saves gas.', 'खाना पकाउने ग्यास ठूलो हिस्सा हो। इन्डक्सन (नेपालको सफा जलविद्युत्) वा बायोग्यास, र भाँडामा बिर्को लगाउँदा ग्यास बच्छ।'));
  if (answers.wasteKgDay >= 0.6) tips.push(tt('You throw quite a bit of waste — composting food scraps and avoiding plastic shrinks this fast.', 'तपाईं धेरै फोहोर फाल्नुहुन्छ — खानाको फोहोर कम्पोस्ट र प्लास्टिक नगर्दा छिटो घट्छ।'));
  if ((answers.stationeryNpr || 0) > 400) tips.push(tt('Reusing notebooks and choosing recycled paper trims your stationery footprint.', 'कापी पुनः प्रयोग र पुनर्चक्रित कागजले स्टेसनरी फुटप्रिन्ट घटाउँछ।'));
  if (!tips.length) tips.push(tt('You are already making low-carbon choices — keep it up and help a friend do the same!', 'तपाईं पहिल्यै कम-कार्बन छनोट गर्दै हुनुहुन्छ — यसै राख्नुहोस् र साथीलाई पनि सघाउनुहोस्!'));

  // comparison vs school average
  const youV = res.daily;
  const hasSchool = school && school.count > 0;
  const cmpMax = Math.max(youV, hasSchool ? school.daily : 0, NEPAL_STUDENT_REF) * 1.1 || 1;
  const diff = hasSchool ? youV - school.daily : 0;

  return (
    <div className="page fade-in" style={{ maxWidth: 760 }}>
      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="pill"><Icon name="leaf" size={15} /> {tt('Your result', 'तपाईंको नतिजा')}</span>
        <button className="btn ghost" onClick={onRestart}><Icon name="refresh" size={18} /> {tt('Start over', 'फेरि सुरु')}</button>
      </div>

      <div className="card center" style={{ textAlign: 'center' }}>
        <ScoreRing score={res.ecoScore} />
        <div style={{ color: scoreColor(res.ecoScore), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, marginTop: 6 }}>
          <Icon name={sm.icon} size={22} /> {scoreText}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
          <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{tt('PER DAY', 'प्रति दिन')}</div><b style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: '1.3rem' }}>{res.daily} kg</b></div>
          <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{tt('PER MONTH', 'प्रति महिना')}</div><b style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: '1.3rem' }}>{res.monthly} kg</b></div>
          <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{tt('PER YEAR', 'प्रति वर्ष')}</div><b style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: '1.3rem' }}>{res.yearly} kg</b></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 className="card-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Icon name="bowl" size={18} /> {tt('Where it comes from', 'कहाँबाट आउँछ')}</h3>
        <Donut segments={segs} />
        <div className="legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 }}>
          {segs.map((s) => (
            <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '.86rem', color: 'var(--ink)' }}>
              <i style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: 'inline-block' }} />{label(s.key)} <span className="muted">{s.value.toFixed(2)}</span>
            </span>
          ))}
        </div>
        {topCat && <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem', marginTop: 10, textAlign: 'center' }}>{tt('Your biggest source is', 'तपाईंको सबैभन्दा ठूलो स्रोत')} <b style={{ color: topCat.color }}>{label(topCat.key)}</b>.</div>}
      </div>

      {/* school comparison */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 className="card-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Icon name="users" size={18} /> {tt('You vs your school', 'तपाईं vs तपाईंको विद्यालय')}</h3>
        {hasSchool ? (<>
          {[{ name: tt('You', 'तपाईं'), v: youV, c: scoreColor(res.ecoScore) },
            { name: tt('School average', 'विद्यालय औसत'), v: school.daily, c: '#2d6a4f' },
            { name: tt('Nepal student (est.)', 'नेपाली विद्यार्थी (अनुमान)'), v: NEPAL_STUDENT_REF, c: 'var(--bark,#9b8c6b)' }].map((b) => (
            <div className="bar-row" key={b.name} style={{ marginBottom: 9 }}>
              <div className="lab" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.84rem', marginBottom: 3 }}><span>{b.name}</span><span>{b.v.toFixed(2)} kg/day</span></div>
              <div className="track" style={{ height: 11, borderRadius: 999, background: 'var(--surface-soft)', overflow: 'hidden' }}><i style={{ display: 'block', width: `${Math.min(100, (b.v / cmpMax) * 100)}%`, height: '100%', background: b.c, borderRadius: 999 }} /></div>
            </div>
          ))}
          <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem', marginTop: 8 }}>
            {Math.abs(diff) < 0.05
              ? tt('You are right around your school\u2019s average.', 'तपाईं विद्यालयको औसतकै हाराहारीमा हुनुहुन्छ।')
              : diff < 0
                ? tt(`You are ${Math.abs(diff).toFixed(2)} kg/day below your school average — greener than most! 🌱`.replace(' 🌱',''), `तपाईं विद्यालय औसतभन्दा ${Math.abs(diff).toFixed(2)} किलो/दिन कम — धेरैभन्दा हरियो!`)
                : tt(`You are ${diff.toFixed(2)} kg/day above your school average — small changes can close the gap.`, `तपाईं विद्यालय औसतभन्दा ${diff.toFixed(2)} किलो/दिन बढी — साना परिवर्तनले यो फरक घटाउँछ।`)}
            <span style={{ marginLeft: 4 }}>{tt(`(based on ${school.count} student${school.count > 1 ? 's' : ''})`, `(${school.count} विद्यार्थीको आधारमा)`)}</span>
          </div>
        </>) : (
          <div className="muted" style={{ fontWeight: 700 }}>{tt('You are the first to measure here — you set the school benchmark! As classmates measure, you\u2019ll see how you compare.', 'यहाँ नाप्ने तपाईं पहिलो हुनुहुन्छ — तपाईंले विद्यालयको मापदण्ड बनाउनुभयो! साथीहरूले नापेपछि तुलना देखिनेछ।')}</div>
        )}
      </div>

      {/* tips */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 className="card-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Icon name="sprout" size={18} /> {tt('How to do better', 'कसरी अझ राम्रो गर्ने')}</h3>
        <div style={{ display: 'grid', gap: 9 }}>
          {tips.slice(0, 4).map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: 'var(--surface-soft)' }}>
              <Icon name="bulb" size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} /><span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>{tip}</span>
            </div>
          ))}
        </div>
        <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginTop: 12 }}>
          <BanaFace size={24} /> {tt('Ask Bana for a step-by-step plan made just for you.', 'आफ्नै लागि बनेको चरणबद्ध योजना बानासँग माग्नुहोस्।')}
        </div>
      </div>
    </div>
  );
}

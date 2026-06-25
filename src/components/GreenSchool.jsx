import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useGameStore } from '../state/gameStore.ts';
import { sfx } from '../game/sfx.js';
import SchoolCarbon from './SchoolCarbon.jsx';
import { calculateSchoolFootprint } from '../logic.js';

/* ============================================================================
 * Green School Scorecard
 * The whole-school benchmark tracker the program asks for: schools self-assess
 * against Nepal's Green School Standards (8 pillars, CEHRD/WWF + Comprehensive
 * School Safety), see a readiness score + certification level, and get localized
 * next steps. Offline-first (saves locally), bilingual, no accounts.
 * ==========================================================================*/

// Each indicator is a concrete, observable benchmark. Status per indicator:
// 0 = not started, 1 = in progress, 2 = done.
const PILLARS = [
  {
    id: 'garden', icon: 'sprout', en: 'One Garden, One School', ne: 'एक विद्यालय, एक बगैंचा',
    items: [
      { en: 'A vegetable / kitchen garden is set up and cared for', ne: 'तरकारी/भान्से बगैंचा स्थापना र हेरचाह गरिएको' },
      { en: 'Fruit trees are planted on the school grounds', ne: 'विद्यालय परिसरमा फलफूलका बिरुवा रोपिएको' },
      { en: 'A medicinal-herb (jadibuti) bed is growing', ne: 'जडीबुटी बगैंचा हुर्किरहेको' },
      { en: 'The garden is used to teach science / math outdoors', ne: 'बगैंचा विज्ञान/गणित सिकाउन प्रयोग गरिएको' },
    ],
  },
  {
    id: 'waste', icon: 'recycle', en: 'Waste & Upcycling', ne: 'फोहोर व्यवस्थापन र पुन:प्रयोग',
    items: [
      { en: 'Separate bins for organic and inorganic waste', ne: 'कुहिने र नकुहिने फोहोरका लागि छुट्टै बिन' },
      { en: 'Canteen / garden waste is composted', ne: 'क्यान्टिन/बगैंचाको फोहोरबाट कम्पोस्ट बनाइएको' },
      { en: 'Grounds are plastic-free (no wrappers / bottles)', ne: 'परिसर प्लास्टिकमुक्त (र्‍यापर/बोतल नभएको)' },
      { en: 'Students upcycle waste (reuse paper, craft from scrap)', ne: 'विद्यार्थीले फोहोर पुन:प्रयोग गर्ने (कागज, सिर्जना)' },
    ],
  },
  {
    id: 'water_energy', icon: 'droplet', en: 'Water & Energy', ne: 'पानी र ऊर्जा',
    items: [
      { en: 'Rainwater harvesting is in place', ne: 'वर्षाको पानी संकलन प्रणाली रहेको' },
      { en: 'Solar panels or other clean energy is used', ne: 'सौर्य प्यानल वा अन्य सफा ऊर्जा प्रयोग' },
      { en: 'Water-saving taps and habits are practised', ne: 'पानी बचत गर्ने धारा र बानी अपनाइएको' },
      { en: 'Energy is saved (LED lights, switch-off habit)', ne: 'ऊर्जा बचत (LED बत्ती, बन्द गर्ने बानी)' },
    ],
  },
  {
    id: 'biodiversity', icon: 'deer', en: 'Biodiversity & Eco-Library', ne: 'जैविक विविधता र इको-पुस्तकालय',
    items: [
      { en: 'A biodiversity corner / bio-museum exists', ne: 'जैविक विविधता कुना/बायो-संग्रहालय रहेको' },
      { en: 'An eco-library with environment books is available', ne: 'वातावरण पुस्तकसहितको इको-पुस्तकालय उपलब्ध' },
      { en: 'A pollinator garden, bee-farm or pocket aquarium', ne: 'परागसेचक बगैंचा, मौरीपालन वा सानो एक्वेरियम' },
      { en: 'Students learn to identify local birds & plants', ne: 'विद्यार्थीले स्थानीय चरा र बिरुवा चिन्न सिक्ने' },
    ],
  },
  {
    id: 'greengrounds', icon: 'forest', en: 'Green Grounds & Bio-Fence', ne: 'हरियाली परिसर र जैविक बार',
    items: [
      { en: 'A natural hedge / bio-fence is used (not only concrete)', ne: 'प्राकृतिक बार/जैविक बार प्रयोग (कंक्रिट मात्र होइन)' },
      { en: 'Trees & greenery cover a quarter or more of grounds', ne: 'परिसरको चौथाइ वा बढी भाग रूख/हरियालीले ढाकेको' },
      { en: 'Classrooms stay comfortable (shade, ventilation)', ne: 'कक्षाकोठा आरामदायी (छहारी, हावा आवतजावत)' },
      { en: 'Safe drinking water and clean toilets (WASH)', ne: 'सुरक्षित खानेपानी र सफा शौचालय (WASH)' },
    ],
  },
  {
    id: 'ecoclub', icon: 'users', en: 'Student Eco-Club', ne: 'विद्यार्थी इको-क्लब',
    items: [
      { en: 'An active eco-club led by students', ne: 'विद्यार्थीले नेतृत्व गरेको सक्रिय इको-क्लब' },
      { en: 'Regular clean-up drives are held', ne: 'नियमित सरसफाइ अभियान चल्ने' },
      { en: 'Tree-plantation campaigns are run', ne: 'वृक्षारोपण अभियान सञ्चालन गरिने' },
      { en: 'The club runs the compost / recycling program', ne: 'क्लबले कम्पोस्ट/पुनर्प्रयोग कार्यक्रम चलाउने' },
    ],
  },
  {
    id: 'safety', icon: 'shield', en: 'Safety & Climate Resilience', ne: 'सुरक्षा र जलवायु उत्थानशीलता',
    items: [
      { en: 'Emergency / evacuation drills are practised', ne: 'आपत्कालीन/निकासी अभ्यास गरिने' },
      { en: 'A hazard map and safe assembly point exist', ne: 'जोखिम नक्सा र सुरक्षित भेला स्थल रहेको' },
      { en: 'A school disaster-preparedness plan is ready', ne: 'विद्यालय विपद् पूर्वतयारी योजना तयार' },
      { en: 'A first-aid kit and trained responders are in place', ne: 'प्राथमिक उपचार किट र तालिमप्राप्त व्यक्ति रहेको' },
    ],
  },
  {
    id: 'learn', icon: 'book', en: 'Learning & Community Action', ne: 'सिकाइ र समुदाय कार्य',
    items: [
      { en: 'Green lessons are tied to real actions (living lab)', ne: 'हरित पाठ वास्तविक कार्यसँग जोडिएको (जीवन्त प्रयोगशाला)' },
      { en: 'Students measure their carbon footprint (this app)', ne: 'विद्यार्थीले कार्बन फुटप्रिन्ट नाप्ने (यो एप)' },
      { en: 'The school has a green action plan with targets', ne: 'विद्यालयसँग लक्ष्यसहितको हरित कार्ययोजना' },
      { en: 'Parents and community join green activities', ne: 'अभिभावक र समुदाय हरित गतिविधिमा सहभागी' },
    ],
  },
];

const LEVELS = [
  { min: 0, en: 'Getting Started', ne: 'सुरुवात', sub: { en: 'Seedling', ne: 'बीउ' } },
  { min: 25, en: 'Growing Green', ne: 'हरियाली बढ्दै', sub: { en: 'Sapling', ne: 'बिरुवा' } },
  { min: 50, en: 'Greening School', ne: 'हरियो हुँदै', sub: { en: 'Young Tree', ne: 'सानो रूख' } },
  { min: 75, en: 'Green School', ne: 'हरित विद्यालय', sub: { en: 'Tree', ne: 'रूख' } },
  { min: 90, en: 'Model Green School', ne: 'नमुना हरित विद्यालय', sub: { en: 'Forest', ne: 'वन' } },
];

const STORE_KEY = 'harit_greenschool_v1';
const keyOf = (p, i) => `${p}_${i}`;
const TOTAL = PILLARS.reduce((n, p) => n + p.items.length, 0);

function load() {
  try { const r = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return { school: r.school || '', status: r.status || {} }; }
  catch (_) { return { school: '', status: {} }; }
}

// tri-state status control (SVG only)
function Tri({ v, onClick, t }) {
  const colors = ['var(--muted)', 'var(--accent-warm,#e9a23b)', 'var(--primary)'];
  return (
    <button onClick={onClick} data-sfx-silent aria-label={t} title={t}
      style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: `2px solid ${colors[v]}`, background: v === 2 ? 'var(--primary)' : 'transparent', color: v === 2 ? '#fff' : colors[v], display: 'grid', placeItems: 'center', cursor: 'pointer', transition: '.15s' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {v === 0 && null}
        {v === 1 && <line x1="7" y1="12" x2="17" y2="12" />}
        {v === 2 && <path d="M5 12l4.5 4.5L19 7" />}
      </svg>
    </button>
  );
}

function Ring({ pct }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <svg width="132" height="132" viewBox="0 0 132 132">
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--border-soft,#e3ebe0)" strokeWidth="11" />
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--primary)" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 66 66)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x="66" y="62" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--ink,#2b3a24)" fontFamily="'Baloo 2',sans-serif">{pct}%</text>
      <text x="66" y="84" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--muted)">ready</text>
    </svg>
  );
}

function Scorecard() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const addEcoPoints = useGameStore((s) => s.addEcoPoints);
  const [{ school, status }, setState] = useState(load);
  const [open, setOpen] = useState('garden');
  const [lastLevel, setLastLevel] = useState(-1);

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ school, status })); } catch (_) { /* */ } }, [school, status]);

  const get = (p, i) => status[keyOf(p, i)] || 0;
  const pillarPct = (p) => { const n = p.items.length; let s = 0; for (let i = 0; i < n; i++) s += get(p.id, i); return Math.round((s / (2 * n)) * 100); };
  const overall = useMemo(() => { let s = 0; for (const p of PILLARS) for (let i = 0; i < p.items.length; i++) s += get(p.id, i); return Math.round((s / (2 * TOTAL)) * 100); }, [status]);
  const doneCount = useMemo(() => { let n = 0; for (const p of PILLARS) for (let i = 0; i < p.items.length; i++) if (get(p.id, i) === 2) n++; return n; }, [status]);

  const levelIdx = LEVELS.reduce((acc, l, i) => (overall >= l.min ? i : acc), 0);
  const level = LEVELS[levelIdx];

  useEffect(() => {
    if (lastLevel === -1) { setLastLevel(levelIdx); return; }
    if (levelIdx > lastLevel) { sfx.levelUp(); setLastLevel(levelIdx); }
    else if (levelIdx !== lastLevel) setLastLevel(levelIdx);
  }, [levelIdx]);

  const cycle = (p, i) => {
    const cur = get(p, i); const nv = (cur + 1) % 3;
    if (nv === 2) { sfx.correct(); addEcoPoints(5); } else if (nv === 1) sfx.select(); else sfx.click();
    setState((st) => ({ ...st, status: { ...st.status, [keyOf(p, i)]: nv } }));
  };

  // next steps: from the lowest-scoring pillars, surface the first not-done item
  const nextSteps = useMemo(() => {
    const ranked = [...PILLARS].sort((a, b) => pillarPct(a) - pillarPct(b));
    const out = [];
    for (const p of ranked) {
      for (let i = 0; i < p.items.length; i++) { if (get(p.id, i) < 2) { out.push({ p, item: p.items[i] }); break; } }
      if (out.length >= 4) break;
    }
    return out;
  }, [status]);

  const reset = () => { if (window.confirm(tt('Clear the whole scorecard?', 'सम्पूर्ण स्कोरकार्ड खाली गर्ने?'))) { setState({ school, status: {} }); sfx.pop(); } };

  return (
    <div className="fade-in">
      <div className="card" style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 8 }}><Icon name="school" size={16} /> {tt('Green School Scorecard', 'हरित विद्यालय स्कोरकार्ड')}</div>
          <h1 style={{ margin: '4px 0 6px', color: 'var(--ink)', fontFamily: "'Baloo 2',sans-serif" }}>{tt('How green is your school?', 'तपाईंको विद्यालय कति हरियो छ?')}</h1>
          <p className="muted" style={{ fontWeight: 600, margin: '0 0 12px', maxWidth: '52ch' }}>{tt('Self-assess against Nepal\u2019s Green School Standards. Mark each step, watch your score grow, and see what to do next. Saved on this device.', 'नेपालको हरित विद्यालय मापदण्डअनुसार आफैं मूल्याङ्कन गर्नुहोस्। हरेक कदम चिन्ह लगाउनुहोस्, स्कोर बढ्दै जान्छ। यो यन्त्रमा सुरक्षित हुन्छ।')}</p>
          <input value={school} onChange={(e) => setState((st) => ({ ...st, school: e.target.value }))} placeholder={tt('Enter your school\u2019s name', 'विद्यालयको नाम लेख्नुहोस्')}
            style={{ width: '100%', maxWidth: 360, padding: '10px 14px', borderRadius: 12, border: '2px solid var(--border)', fontWeight: 700, color: 'var(--ink)', background: 'var(--surface)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Ring pct={overall} />
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontWeight: 800, boxShadow: '0 4px 0 var(--ink,#2b3a24)' }}>
            <Icon name="trophy" size={17} /> {tt(level.en, level.ne)} · {tt(level.sub.en, level.sub.ne)}
          </div>
          <div className="muted" style={{ fontWeight: 700, fontSize: '.82rem', marginTop: 7 }}>{doneCount} / {TOTAL} {tt('benchmarks done', 'मापदण्ड पूरा')}</div>
        </div>
      </div>

      {/* progress along the certification path */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {LEVELS.map((l, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', opacity: i <= levelIdx ? 1 : 0.4 }}>
              <div style={{ height: 8, borderRadius: 999, background: i <= levelIdx ? 'var(--primary)' : 'var(--border-soft,#e3ebe0)', marginBottom: 7 }} />
              <div style={{ fontWeight: 800, fontSize: '.72rem', color: i === levelIdx ? 'var(--primary)' : 'var(--muted)' }}>{tt(l.sub.en, l.sub.ne)}</div>
              <div className="muted" style={{ fontSize: '.66rem', fontWeight: 700 }}>{l.min}%+</div>
            </div>
          ))}
        </div>
      </div>

      {/* pillar cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 14, marginTop: 14 }}>
        {PILLARS.map((p) => {
          const pct = pillarPct(p); const isOpen = open === p.id;
          return (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button onClick={() => { setOpen(isOpen ? '' : p.id); sfx.click(); }} data-sfx-silent
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--surface-soft)', color: 'var(--primary)', border: '2px solid var(--border-soft,#e3ebe0)' }}><Icon name={p.icon} size={23} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '1rem' }}>{tt(p.en, p.ne)}</div>
                  <div style={{ height: 7, borderRadius: 999, background: 'var(--border-soft,#e3ebe0)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pct >= 75 ? 'var(--primary)' : pct >= 34 ? 'var(--accent-warm,#e9a23b)' : '#cf7b4b', transition: 'width .5s' }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, fontWeight: 800, color: 'var(--muted)', fontSize: '.86rem', width: 38, textAlign: 'right' }}>{pct}%</div>
              </button>
              {isOpen && (
                <div style={{ padding: '2px 16px 14px' }}>
                  {p.items.map((it, i) => {
                    const v = get(p.id, i);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: '1px solid var(--border-soft,#eef2ec)' }}>
                        <Tri v={v} onClick={() => cycle(p.id, i)} t={[tt('Not started', 'सुरु नभएको'), tt('In progress', 'चलिरहेको'), tt('Done', 'पूरा भयो')][v]} />
                        <div style={{ flex: 1, fontWeight: 600, fontSize: '.92rem', color: v === 2 ? 'var(--muted)' : 'var(--ink)', textDecoration: v === 2 ? 'line-through' : 'none' }}>{tt(it.en, it.ne)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* next steps */}
      {nextSteps.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><Icon name="target" size={20} style={{ color: 'var(--primary)' }} /><b style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>{tt('Best next steps for your school', 'विद्यालयका लागि उत्तम अर्को कदम')}</b></div>
          <div style={{ display: 'grid', gap: 9 }}>
            {nextSteps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, background: 'var(--surface-soft)', border: '1.5px solid var(--border-soft,#e3ebe0)' }}>
                <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--surface)', color: 'var(--primary)', border: '2px solid var(--border-soft,#e3ebe0)' }}><Icon name={s.p.icon} size={17} /></div>
                <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--ink)' }}>{tt(s.item.en, s.item.ne)} <span className="muted" style={{ fontWeight: 700 }}>· {tt(s.p.en, s.p.ne)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <div className="muted" style={{ fontWeight: 700, fontSize: '.78rem', maxWidth: '60ch' }}>{tt('Aligned with Nepal\u2019s Green School Guidelines (CEHRD / WWF Nepal) and Comprehensive School Safety. A guide for your Eco-Club \u2014 not an official certificate.', 'नेपालको हरित विद्यालय निर्देशिका (CEHRD/WWF नेपाल) र समग्र विद्यालय सुरक्षासँग मिल्दो। तपाईंको इको-क्लबका लागि मार्गदर्शन \u2014 आधिकारिक प्रमाणपत्र होइन।')}</div>
        <button className="btn ghost" onClick={reset}><Icon name="refresh" size={17} /> {tt('Reset', 'रिसेट')}</button>
      </div>
    </div>
  );
}

/* ── printable report: reads both saved stores, opens a clean print/PDF view ── */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildReportHTML(lang) {
  const T = (en, ne) => (lang === 'ne' ? ne : en);
  let sc = { school: '', status: {} };
  try { sc = { ...sc, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')) }; } catch (_) { /* */ }
  const get = (p, i) => sc.status[keyOf(p, i)] || 0;
  const pillarPct = (p) => { let s = 0; for (let i = 0; i < p.items.length; i++) s += get(p.id, i); return Math.round((s / (2 * p.items.length)) * 100); };
  let total = 0; let done = 0;
  for (const p of PILLARS) for (let i = 0; i < p.items.length; i++) { total += get(p.id, i); if (get(p.id, i) === 2) done++; }
  const overall = Math.round((total / (2 * TOTAL)) * 100);
  const li = LEVELS.reduce((a, l, i) => (overall >= l.min ? i : a), 0);
  const level = LEVELS[li];

  // next steps
  const ranked = [...PILLARS].sort((a, b) => pillarPct(a) - pillarPct(b));
  const steps = [];
  for (const p of ranked) { for (let i = 0; i < p.items.length; i++) { if (get(p.id, i) < 2) { steps.push(T(p.items[i].en, p.items[i].ne) + ' — ' + T(p.en, p.ne)); break; } } if (steps.length >= 5) break; }

  // carbon (only if the user has used that tab)
  let carbonHtml = `<p class="muted">${T('Open the “School Carbon” tab to add your emissions snapshot to this report.', '“विद्यालय कार्बन” ट्याब खोलेर उत्सर्जन यो प्रतिवेदनमा थप्नुहोस्।')}</p>`;
  const rawC = localStorage.getItem('harit_schoolcarbon_v1');
  if (rawC) {
    try {
      const r = calculateSchoolFootprint(JSON.parse(rawC));
      const cat = { commute: T('Commuting', 'आवतजावत'), electricity: T('Electricity', 'बिजुली'), cooking: T('Canteen cooking', 'क्यान्टिन खाना'), waste: T('Waste', 'फोहोर') };
      const rows = Object.keys(cat).map((k) => `<tr><td>${cat[k]}</td><td style="text-align:right">${(r.breakdown[k] / 1000).toFixed(2)} t</td><td style="text-align:right">${Math.round((r.breakdown[k] / (r.gross || 1)) * 100)}%</td></tr>`).join('');
      carbonHtml = `<div class="big">${r.tonnesNet} <span>${T('t CO₂ / year', 'टन CO₂ / वर्ष')}</span></div>
        <p>${T('Per student', 'प्रति विद्यार्थी')}: <b>${r.perStudentYear} ${T('kg/yr', 'किलो/वर्ष')}</b> · ${T('People counted', 'गणना गरिएका मानिस')}: <b>${r.people}</b></p>
        <table>${rows}</table>
        <p class="muted">${T('About', 'करिब')} <b>${r.treesStillNeeded.toLocaleString()}</b> ${T('more trees would absorb the remaining emissions each year.', 'थप रूखले बाँकी उत्सर्जन हरेक वर्ष सोस्नेछन्।')}</p>`;
    } catch (_) { /* */ }
  }

  const pillarRows = PILLARS.map((p) => `<tr><td>${T(p.en, p.ne)}</td><td style="text-align:right;font-weight:800;color:#1f7a3a">${pillarPct(p)}%</td></tr>`).join('');
  const stepItems = steps.map((s) => `<li>${esc(s)}</li>`).join('') || `<li>${T('Every benchmark is done — outstanding!', 'सबै मापदण्ड पूरा भयो — उत्कृष्ट!')}</li>`;
  const today = new Date().toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB');

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${T('Green School Report', 'हरित विद्यालय प्रतिवेदन')}</title>
  <style>
    *{box-sizing:border-box} body{font-family:'Segoe UI',system-ui,sans-serif;color:#23311d;margin:0;padding:32px;background:#fff}
    h1{font-size:22px;margin:0} h2{font-size:15px;color:#1f7a3a;border-bottom:2px solid #d8edc4;padding-bottom:6px;margin:26px 0 10px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2f9e44;padding-bottom:14px}
    .brand{font-weight:800;color:#2f9e44;font-size:13px;letter-spacing:.03em}
    .muted{color:#6b7a63;font-size:12px} table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px}
    td{padding:6px 4px;border-bottom:1px solid #eef2ec} .pill{display:inline-block;background:#2f9e44;color:#fff;font-weight:800;padding:6px 14px;border-radius:999px;font-size:13px;margin-top:6px}
    .score{font-size:46px;font-weight:800;color:#1f7a3a;line-height:1} .big{font-size:34px;font-weight:800;color:#1f7a3a;margin:6px 0} .big span{font-size:15px;color:#23311d}
    .grid{display:flex;gap:24px;flex-wrap:wrap} .grid>div{flex:1 1 240px}
    ul{margin:6px 0;padding-left:20px;font-size:13px} li{margin:4px 0}
    @media print{body{padding:14mm}} 
  </style></head><body>
  <div class="head"><div><div class="brand">हरित पाठशाला · HARIT PATHSALA</div><h1>${T('Green School Report', 'हरित विद्यालय प्रतिवेदन')}</h1>
    <div class="muted">${esc(sc.school) || T('(school name not set)', '(विद्यालयको नाम राखिएको छैन)')} · ${today}</div></div>
    <div style="text-align:right"><div class="score">${overall}%</div><div class="pill">${T(level.en, level.ne)} · ${T(level.sub.en, level.sub.ne)}</div></div></div>

  <div class="grid"><div>
    <h2>${T('Standards scorecard', 'मापदण्ड स्कोरकार्ड')}</h2>
    <p class="muted">${done} / ${TOTAL} ${T('benchmarks completed', 'मापदण्ड पूरा')}</p>
    <table>${pillarRows}</table>
  </div><div>
    <h2>${T('Carbon snapshot', 'कार्बन स्न्यापसट')}</h2>
    ${carbonHtml}
  </div></div>

  <h2>${T('Best next steps', 'उत्तम अर्को कदम')}</h2>
  <ul>${stepItems}</ul>

  <p class="muted" style="margin-top:24px">${T('Aligned with Nepal’s Green School Guidelines (CEHRD / WWF Nepal) and Comprehensive School Safety. A self-assessment guide for your Eco-Club — not an official certificate.', 'नेपालको हरित विद्यालय निर्देशिका (CEHRD/WWF नेपाल) र समग्र विद्यालय सुरक्षासँग मिल्दो। इको-क्लबका लागि स्व-मूल्याङ्कन मार्गदर्शन — आधिकारिक प्रमाणपत्र होइन।')}</p>
  </body></html>`;
}

function printReport(lang) {
  sfx.pop();
  const w = window.open('', '_blank');
  if (!w) { window.alert(lang === 'ne' ? 'प्रतिवेदन छाप्न पप-अप अनुमति दिनुहोस्।' : 'Please allow pop-ups to print the report.'); return; }
  w.document.write(buildReportHTML(lang));
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (_) { /* */ } }, 350);
}

export default function GreenSchool() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [view, setView] = useState('scorecard');
  const Tab = ({ id, icon, en, ne }) => (
    <button onClick={() => { setView(id); sfx.tab(); }} data-sfx-silent
      style={{ border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
        background: view === id ? 'var(--primary)' : 'transparent', color: view === id ? '#fff' : 'var(--ink)' }}>
      <Icon name={icon} size={17} /> {tt(en, ne)}
    </button>
  );
  return (
    <div className="page fade-in" style={{ maxWidth: 1120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', gap: 6, background: 'var(--surface-soft)', padding: 5, borderRadius: 14, border: '1.5px solid var(--border-soft,#e3ebe0)' }}>
          <Tab id="scorecard" icon="school" en="Standards" ne="मापदण्ड" />
          <Tab id="carbon" icon="flame" en="School Carbon" ne="विद्यालय कार्बन" />
        </div>
        <button className="btn" onClick={() => printReport(lang)}><Icon name="download" size={17} /> {tt('Print / Save report', 'प्रतिवेदन छाप्नुहोस्')}</button>
      </div>
      {view === 'scorecard' ? <Scorecard /> : <SchoolCarbon />}
    </div>
  );
}

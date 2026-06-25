import React, { useState, useEffect } from 'react';
import { BanaBubble } from './Bana.jsx';
import Icon from './Icons.jsx';
import ResultDashboard from './ResultDashboard.jsx';
import { calculateFootprint, CATEGORY_META } from '../logic.js';
import { useLang } from '../i18n.jsx';
import { sfx } from '../game/sfx.js';
import { useAuth } from '../data/auth.jsx';
import { addCarbon } from '../data/db.js';

// Practical, student-friendly questions. Every factor behind them comes from the
// organizer's Emission_factors.xlsx (see logic.js EF). We do NOT show which option
// is "best" while answering — the eco score and breakdown appear only at the end,
// so students answer honestly.
const DEFAULTS = {
  transportMode: 'bus', distanceKm: 2,
  electricityUnits: 90, hasSolar: false,
  lpgCylinders: 1,
  wasteKgDay: 0.6,
  stationeryNpr: 200,
};

const STEPS = [
  { id: 'transport', cat: 'transport', icon: 'bus', field: 'transportMode',
    choices: [
      { key: 'walk', v: 'walk', icon: 'walk' },
      { key: 'bicycle', v: 'bicycle', icon: 'bicycle' },
      { key: 'bus', v: 'bus', icon: 'bus' },
      { key: 'motorbike', v: 'motorbike', icon: 'motorbike' },
      { key: 'car', v: 'car', icon: 'car' },
    ],
    sliders: [{ key: 'distanceKm', min: 0.5, max: 20, step: 0.5, unit: 'km' }] },

  { id: 'electricity', cat: 'electricity', icon: 'bolt',
    sliders: [{ key: 'electricityUnits', min: 20, max: 400, step: 5, unit: 'kWh' }],
    toggles: [{ key: 'hasSolar' }] },

  { id: 'cooking', cat: 'cooking', icon: 'flame',
    sliders: [{ key: 'lpgCylinders', min: 0, max: 4, step: 0.5, unit: '' }] },

  { id: 'waste', cat: 'waste', icon: 'trash', field: 'wasteKgDay',
    choices: [
      { key: 'little', v: 0.3, icon: 'leaf' },
      { key: 'medium', v: 0.6, icon: 'trash' },
      { key: 'lot', v: 1.2, icon: 'trash' },
    ] },

  { id: 'stationery', cat: 'stationery', icon: 'book',
    sliders: [{ key: 'stationeryNpr', min: 0, max: 1500, step: 50, unit: 'Rs' }] },
];

function Trail({ step, go }) {
  const { t } = useLang();
  return (
    <div className="trail" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => (
        <button key={s.id} className={'trail-node' + (i === step ? ' active' : i < step ? ' done' : '')} onClick={() => go(i)} title={t('calc.steps.' + s.id + '.title')}>
          <Icon name={s.icon} size={17} />
        </button>
      ))}
    </div>
  );
}

export default function CalculatorPage() {
  const { t } = useLang();
  const auth = useAuth();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ ...DEFAULTS });
  const [done, setDone] = useState(false);
  const set = (k, v) => setA((s) => ({ ...s, [k]: v }));

  // when the result is revealed, save this calculation to the logged-in student's profile
  useEffect(() => {
    if (!done) return;
    const u = auth && auth.user;
    if (!u || u.role !== 'student') return;
    const r = calculateFootprint(a);
    addCarbon(u.id, { daily: r.daily, monthly: r.monthly, yearly: r.yearly, ecoScore: r.ecoScore, breakdown: r.breakdown, answers: a });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return (<ResultDashboard answers={a} onRestart={() => { setA({ ...DEFAULTS }); setStep(0); setDone(false); }} />);

  const S = STEPS[step];
  const base = 'calc.steps.' + S.id;
  const next = () => { if (step + 1 >= STEPS.length) { sfx.win(); setDone(true); } else { sfx.tab(); setStep(step + 1); } };
  const back = () => setStep(Math.max(0, step - 1));
  const catColor = CATEGORY_META[S.cat] ? CATEGORY_META[S.cat].color : 'var(--primary)';

  return (
    <div className="page fade-in" style={{ maxWidth: 720 }}>
      <div className="hero" style={{ paddingBottom: 14 }}>
        <span className="pill"><Icon name="leaf" size={15} /> {t('calc.pill')}</span>
        <h1 style={{ marginTop: 8 }}>{t('calc.title')}</h1>
        <p>{t('calc.intro')}</p>
      </div>

      <Trail step={step} go={setStep} />

      <div className="calc-main card" style={{ marginTop: 14 }}>
        <div className="scene-head" style={{ '--cat': catColor }}>
          <span className="scene-ic" style={{ background: catColor }}><Icon name={S.icon} size={26} /></span>
          <div><small>{t('calc.sceneWord')} {step + 1}/{STEPS.length}</small><h2>{t(base + '.title')}</h2></div>
        </div>

        <BanaBubble text={t(base + '.bana')} />

        <div className="step-anim" key={S.id} style={{ marginTop: 6 }}>
          {S.field ? (
            <div className="plain-choices" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 6 }}>
              {S.choices.map((c) => {
                const sel = a[S.field] === c.v;
                return (
                  <button key={c.key} onClick={() => { set(S.field, c.v); sfx.select(); }} data-sfx-silent
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
                      border: sel ? `2.5px solid ${catColor}` : '2px solid var(--border-soft,#e3ebe0)', background: sel ? 'var(--surface-soft)' : 'var(--surface)', fontWeight: 800, color: 'var(--ink)' }}>
                    <span style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: sel ? catColor : 'var(--surface-soft)', color: sel ? '#fff' : catColor }}><Icon name={c.icon} size={24} /></span>
                    <span style={{ fontSize: '.9rem', textAlign: 'center' }}>{t(base + '.choices.' + c.key)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {(S.sliders || []).map((sl) => (
            <div className="field big-field" key={sl.key} style={{ marginTop: 10 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                <span>{t(base + '.sliders.' + sl.key)}</span>
                <span className="val" style={{ color: catColor }}>{a[sl.key]}{sl.unit ? ` ${sl.unit}` : ''}</span>
              </label>
              <input type="range" min={sl.min} max={sl.max} step={sl.step} value={a[sl.key]} onChange={(e) => set(sl.key, +e.target.value)} style={{ width: '100%', accentColor: catColor }} />
              {(() => { const h = t(base + '.help'); return h && h !== base + '.help' ? <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem', marginTop: 6 }}>{h}</div> : null; })()}
            </div>
          ))}

          {(S.toggles || []).map((tg) => (
            <div className="field" key={tg.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
              <label style={{ margin: 0, fontWeight: 800, color: 'var(--ink)' }}>{t(base + '.toggles.' + tg.key)}</label>
              <div className="toggle">
                <button className={a[tg.key] ? 'on' : ''} onClick={() => { set(tg.key, true); sfx.click(); }} data-sfx-silent>{t('calc.yes')}</button>
                <button className={!a[tg.key] ? 'on' : ''} onClick={() => { set(tg.key, false); sfx.click(); }} data-sfx-silent>{t('calc.no')}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="step-nav" style={{ marginTop: 18 }}>
          <button className="btn ghost" onClick={back} disabled={step === 0}><Icon name="arrowLeft" size={18} /> {t('calc.back')}</button>
          <button className="btn" onClick={next}>
            {step + 1 >= STEPS.length ? <><Icon name="leaf" size={18} /> {t('calc.reveal')}</> : <>{t('calc.next')} <Icon name="arrowRight" size={18} /></>}
          </button>
        </div>
      </div>

      <div className="muted center" style={{ fontWeight: 700, marginTop: 12, fontSize: '.84rem' }}>{t('calc.hint')}</div>
    </div>
  );
}

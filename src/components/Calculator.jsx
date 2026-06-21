import React, { useState } from 'react';
import { BanaBubble } from './Bana.jsx';
import Icon from './Icons.jsx';
import ResultDashboard from './ResultDashboard.jsx';
import { calculateFootprint, CATEGORY_META, cookingCompareDaily } from '../logic.js';
import { useLang } from '../i18n.jsx';

const DEFAULTS = {
  transportMode: 'public_bus', distanceKm: 2, electricityHours: 6, hasSolar: false,
  cookingFuel: 'lpg', lpgKgMonth: 5, firewoodKgDay: 3, foodType: 'dal_bhat_local',
  wasteDisposal: 'municipal_bin', waterLitresDay: 150, harvestRain: false,
  schoolElectricity: 'moderate', treesCount: 0,
};

// structure only — all display text comes from i18n (calc.steps.<id>.*)
const STEPS = [
  { id: 'transport', cat: 'transport', icon: 'bus', field: 'transportMode',
    choices: [{ v: 'walk', icon: 'walk' }, { v: 'bicycle', icon: 'bicycle' }, { v: 'public_bus', icon: 'bus' }, { v: 'microbus', icon: 'van' }, { v: 'motorbike', icon: 'motorbike' }, { v: 'private_car', icon: 'car' }],
    sliders: [{ key: 'distanceKm', min: 0.5, max: 20, step: 0.5, unit: 'km' }] },
  { id: 'home', cat: 'electricity_home', icon: 'bolt',
    sliders: [{ key: 'electricityHours', min: 1, max: 14, step: 1, unit: 'h' }], toggles: [{ key: 'hasSolar' }] },
  { id: 'cooking', cat: 'cooking', icon: 'flame', field: 'cookingFuel',
    choices: [{ v: 'firewood', icon: 'logs' }, { v: 'lpg', icon: 'cylinder' }, { v: 'electric', icon: 'induction' }, { v: 'mixed', icon: 'mixed' }],
    sliders: [{ key: 'lpgKgMonth', min: 1, max: 15, step: 1, unit: 'kg', showIf: (a) => a.cookingFuel === 'lpg' || a.cookingFuel === 'mixed' }, { key: 'firewoodKgDay', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: (a) => a.cookingFuel === 'firewood' || a.cookingFuel === 'mixed' }] },
  { id: 'food', cat: 'food', icon: 'bowl', field: 'foodType',
    choices: [{ v: 'dal_bhat_local', icon: 'bowl' }, { v: 'packaged_food', icon: 'package' }, { v: 'meat_heavy', icon: 'meat' }, { v: 'vegetarian_canteen', icon: 'veg' }] },
  { id: 'waste', cat: 'waste', icon: 'trash', field: 'wasteDisposal',
    choices: [{ v: 'compost', icon: 'sprout' }, { v: 'municipal_bin', icon: 'bin' }, { v: 'open_burning', icon: 'flame' }, { v: 'open_dump', icon: 'dump' }] },
  { id: 'water', cat: 'water', icon: 'droplet',
    sliders: [{ key: 'waterLitresDay', min: 50, max: 600, step: 10, unit: 'L' }], toggles: [{ key: 'harvestRain' }] },
  { id: 'school', cat: 'electricity_school', icon: 'school', field: 'schoolElectricity',
    choices: [{ v: 'minimal', icon: 'candle' }, { v: 'moderate', icon: 'laptop' }, { v: 'heavy', icon: 'factory' }] },
  { id: 'trees', cat: 'carbon_sink', icon: 'tree',
    sliders: [{ key: 'treesCount', min: 0, max: 100, step: 1, unit: '' }] },
];

const CAT_NE = { transport: 'यातायात', electricity_home: 'घरको बिजुली', cooking: 'इन्धन', food: 'खाना', waste: 'फोहोर', water: 'पानी', electricity_school: 'स्कुलको बिजुली', carbon_sink: 'रूख' };
const levelColor = (d) => (d <= 2 ? '#2d6a4f' : d <= 5 ? '#52b788' : d <= 9 ? '#f4a261' : '#e76f51');
const levelKey = (d) => (d <= 2 ? 'tiny' : d <= 5 ? 'low' : d <= 9 ? 'medium' : 'high');

function EcoMeter({ daily, breakdown }) {
  const { lang, t } = useLang();
  const cap = 16; const frac = Math.max(0.02, Math.min(1, daily / cap));
  const r = 52; const c = 2 * Math.PI * r; const off = c * (1 - frac);
  const col = levelColor(daily);
  const top = Object.entries(breakdown).filter(([k]) => k !== 'carbon_sink' && CATEGORY_META[k]).sort((a, b) => b[1] - a[1])[0];
  const bigLabel = top ? (lang === 'ne' ? CAT_NE[top[0]] : CATEGORY_META[top[0]].label) : '';
  return (
    <div className="eco-meter">
      <div className="eco-gauge">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent-warm)" strokeWidth="13" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="13" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1), stroke .4s' }} />
        </svg>
        <div className="eco-num"><b style={{ color: col }}>{daily.toFixed(1)}</b><span>{t('calc.perDay')}</span></div>
      </div>
      <div className="eco-cap" style={{ color: col }}>{t('calc.level.' + levelKey(daily))}</div>
      <div className="eco-rows">
        <div className="eco-row"><span>{t('calc.vsAvg')}</span><b>~4.5</b></div>
        {top ? <div className="eco-row"><span>{t('calc.biggest')}</span><b style={{ color: CATEGORY_META[top[0]].color }}>{bigLabel}</b></div> : null}
      </div>
    </div>
  );
}

function Trail({ step, go }) {
  const { t } = useLang();
  return (
    <div className="trail">
      {STEPS.map((s, i) => (
        <button key={s.id} className={'trail-node' + (i === step ? ' active' : i < step ? ' done' : '')} onClick={() => go(i)} title={t('calc.steps.' + s.id + '.scene')}>
          <Icon name={s.icon} size={17} />
        </button>
      ))}
    </div>
  );
}

export default function CalculatorPage() {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ ...DEFAULTS });
  const [done, setDone] = useState(false);
  const set = (k, v) => setA((s) => ({ ...s, [k]: v }));

  if (done) return (<ResultDashboard answers={a} onRestart={() => { setA({ ...DEFAULTS }); setStep(0); setDone(false); }} />);

  const live = calculateFootprint(a);
  const S = STEPS[step];
  const base = 'calc.steps.' + S.id;
  const projDaily = (field, v) => calculateFootprint({ ...a, [field]: v }).daily;

  let impacts = null;
  if (S.field) {
    const ds = S.choices.map((c) => ({ ...c, d: S.id === 'cooking' ? cookingCompareDaily(c.v) : projDaily(S.field, c.v) }));
    const min = Math.min(...ds.map((x) => x.d)); const max = Math.max(...ds.map((x) => x.d));
    impacts = ds.map((c) => {
      const ratio = max === min ? 0 : (c.d - min) / (max - min);
      const tone = ratio < 0.34 ? 'good' : ratio < 0.67 ? 'mid' : 'bad';
      return { ...c, ratio, tone, best: c.d === min };
    });
  }

  const next = () => { if (step + 1 >= STEPS.length) setDone(true); else setStep(step + 1); };
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="page fade-in">
      <div className="hero" style={{ paddingBottom: 18 }}>
        <span className="pill"><Icon name="leaf" size={15} /> {t('calc.pill')}</span>
        <h1 style={{ marginTop: 8 }}>{t('calc.title')}</h1>
        <p>{t('calc.intro')}</p>
      </div>

      <div className="pledge" style={{ marginBottom: 16 }}>
        <span className="pledge-seal"><Icon name="school" size={22} /></span>
        <div>
          <b>{t('calc.pledgeTitle')} <span className="pledge-stamp">{t('calc.pledgeStamp')}</span></b>
          <p>{t('calc.pledgeBody')}</p>
        </div>
      </div>

      <div className="calc-stage">
        <div className="calc-main card">
          <div className="scene-head" style={{ '--cat': CATEGORY_META[S.cat] ? CATEGORY_META[S.cat].color : 'var(--primary)' }}>
            <span className="scene-ic"><Icon name={S.icon} size={26} /></span>
            <div><small>{t(base + '.scene')} · {t('calc.sceneWord')} {step + 1}/{STEPS.length}</small><h2>{t(base + '.title')}</h2></div>
          </div>

          <BanaBubble text={t(base + '.bana')} />

          <div className="step-anim" key={S.id}>
            {S.field ? (
              <div className="impact-choices">
                {impacts.map((c) => (
                  <button key={c.v} className={'ichoice ' + c.tone + (a[S.field] === c.v ? ' sel' : '')} onClick={() => set(S.field, c.v)}>
                    {c.best ? <span className="best-tag">{t('calc.best')}</span> : null}
                    <span className="choice-ic"><Icon name={c.icon} size={26} /></span>
                    <span className="ichoice-label">{t(base + '.choices.' + c.v)}</span>
                    <span className="impact-bar"><i style={{ width: `${20 + c.ratio * 80}%` }} /></span>
                    <span className="impact-kg">{c.d.toFixed(1)} kg/day</span>
                  </button>
                ))}
              </div>
            ) : null}

            {(S.sliders || []).map((sl) => (
              (!sl.showIf || sl.showIf(a)) ? (
                <div className="field big-field" key={sl.key}>
                  <label>{t(base + '.sliders.' + sl.key)}: <span className="val">{a[sl.key]}{sl.unit ? ` ${sl.unit}` : ''}</span></label>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step} value={a[sl.key]} onChange={(e) => set(sl.key, +e.target.value)} />
                </div>
              ) : null
            ))}

            {(S.toggles || []).map((tg) => (
              <div className="field" key={tg.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <label style={{ margin: 0 }}>{t(base + '.toggles.' + tg.key)}</label>
                <div className="toggle">
                  <button className={a[tg.key] ? 'on' : ''} onClick={() => set(tg.key, true)}>{t('calc.yes')}</button>
                  <button className={!a[tg.key] ? 'on' : ''} onClick={() => set(tg.key, false)}>{t('calc.no')}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="step-nav">
            <button className="btn ghost" onClick={back} disabled={step === 0}><Icon name="arrowLeft" size={18} /> {t('calc.back')}</button>
            <button className="btn" onClick={next}>
              {step + 1 >= STEPS.length ? <><Icon name="leaf" size={18} /> {t('calc.reveal')}</> : <>{t('calc.next')} <Icon name="arrowRight" size={18} /></>}
            </button>
          </div>
        </div>

        <aside className="calc-side">
          <EcoMeter daily={live.daily} breakdown={live.breakdown} />
          <Trail step={step} go={setStep} />
          <div className="side-hint muted">{t('calc.hint')}</div>
        </aside>
      </div>
    </div>
  );
}

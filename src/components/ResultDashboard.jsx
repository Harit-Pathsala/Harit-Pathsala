import React, { useEffect, useMemo, useState } from 'react';
import {
  calculateFootprint, getTotalImpactMessage, getTipsForAnswers,
  CATEGORY_META, DESTRUCTION_MESSAGES, DESTRUCTION_MESSAGES_NE, BENCHMARKS, BANA_FALLBACK, BANA_FALLBACK_NE,
} from '../logic.js';
import { BanaBubble, BanaFace, askBana } from './Bana.jsx';
import Icon from './Icons.jsx';
import { setLastResult } from '../store.js';
import { useLang } from '../i18n.jsx';

const CAT_NE = { transport: 'यातायात', electricity_home: 'घरको बिजुली', cooking: 'इन्धन', food: 'खाना', waste: 'फोहोर', water: 'पानी', electricity_school: 'स्कुलको बिजुली', carbon_sink: 'रूख' };

function scoreColor(s) {
  return s >= 90 ? 'var(--primary)' : s >= 70 ? 'var(--primary-light)' : s >= 40 ? 'var(--warning)' : 'var(--danger)';
}
function scoreMeta(s) {
  if (s >= 90) return { key: 'champion', icon: 'trophy' };
  if (s >= 70) return { key: 'greener', icon: 'leaf' };
  if (s >= 40) return { key: 'room', icon: 'sprout' };
  return { key: 'emergency', icon: 'flame' };
}

const SAVE_ICON = { money: 'coin', plant: 'sprout', nature: 'mountain', water: 'droplet', fun: 'play' };

function ScoreRing({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  const col = scoreColor(score);
  return (
    <div className="score-ring">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent-warm)" strokeWidth="12" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="num"><b>{score}</b><span>ECO SCORE</span></div>
    </div>
  );
}

function Donut({ segments, onSlice }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div className="donut-box">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-soft)" strokeWidth="20" />
        {segments.map((s) => {
          const frac = s.value / total;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={s.key} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={dash} strokeDashoffset={offset} transform="rotate(-90 60 60)"
              style={{ cursor: 'pointer', transition: 'stroke-width .15s' }} onClick={() => onSlice(s)}
            >
              <title>{s.label}</title>
            </circle>
          );
        })}
        <text x="60" y="56" textAnchor="middle" fontFamily="Baloo 2" fontWeight="800" fontSize="13" fill="var(--primary)">{total.toFixed(1)}</text>
        <text x="60" y="70" textAnchor="middle" fontSize="7" fill="var(--muted)" fontWeight="700">kg CO₂/day</text>
      </svg>
    </div>
  );
}

function TreeGlyph({ filled }) {
  return (
    <svg viewBox="0 0 24 32">
      <rect x="10" y="20" width="4" height="9" fill="#6b4226" />
      <path d="M12 2 L20 18 H4 Z" fill={filled ? '#2d6a4f' : '#cfd8cf'} />
      <path d="M12 8 L18 22 H6 Z" fill={filled ? '#52b788' : '#dde6dd'} />
    </svg>
  );
}

export default function ResultDashboard({ answers, onRestart }) {
  const { lang, t } = useLang();
  const res = useMemo(() => calculateFootprint(answers), [answers]);
  useEffect(() => { setLastResult(res); }, [res]);
  const impact = getTotalImpactMessage(res.daily, lang);
  const tips = useMemo(() => getTipsForAnswers(answers, 4, lang), [answers, lang]);
  const [sliceKey, setSliceKey] = useState(null);
  const [banaText, setBanaText] = useState('');
  const [offline, setOffline] = useState(false);

  const segs = Object.entries(res.breakdown)
    .filter(([k, v]) => k !== 'carbon_sink' && v > 0)
    .map(([k, v]) => ({ key: k, value: v, color: CATEGORY_META[k].color, label: `${(lang === 'ne' ? CAT_NE[k] : CATEGORY_META[k].label)} · ${v.toFixed(2)} kg` }))
    .sort((x, y) => y.value - x.value);
  const topCat = segs[0];

  const treesNeeded = Math.max(1, Math.ceil(res.yearly / 21));
  const treesOffset = Math.min(treesNeeded, answers.treesCount);
  const sm = scoreMeta(res.ecoScore);
  const impactIcon = impact.tone === 'high' ? 'warning' : impact.tone === 'medium' ? 'info' : 'leaf';

  useEffect(() => {
    let alive = true;
    const ctx = `Daily footprint ${res.daily} kg CO2, eco score ${res.ecoScore}/100. Biggest category: ${topCat ? CATEGORY_META[topCat.key].label : 'none'}.`;
    askBana(ctx, answers, lang).then((reply) => {
      if (!alive) return;
      if (reply) { setBanaText(reply); setOffline(false); }
      else {
        setOffline(true);
        const FB = lang === 'ne' ? BANA_FALLBACK_NE : BANA_FALLBACK;
        setBanaText(impact.tone === 'high' ? FB.high : impact.tone === 'medium' ? FB.medium : FB.low);
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.daily, lang]);

  const benchMax = Math.max(BENCHMARKS.globalAvg, res.daily) * 1.05;
  const bench = [
    { name: 'You', v: res.daily, c: scoreColor(res.ecoScore) },
    { name: 'Nepal avg', v: BENCHMARKS.nepalAvg, c: 'var(--primary-light)' },
    { name: 'Global avg', v: BENCHMARKS.globalAvg, c: 'var(--bark)' },
  ];

  return (
    <div className="page fade-in">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="pill"><Icon name="leaf" size={15} /> {t('result.pill')}</span>
        <button className="btn ghost" onClick={onRestart}><Icon name="refresh" size={18} /> {t('result.startOver')}</button>
      </div>

      <div className="dash">
        <div className="card center">
          <ScoreRing score={res.ecoScore} />
          <div className="score-label" style={{ color: scoreColor(res.ecoScore), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name={sm.icon} size={22} /> {t('result.score.' + sm.key)}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 20, marginTop: 14 }}>
            <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{t('result.daily')}</div><b style={{ fontFamily: 'Baloo 2', fontSize: '1.3rem' }}>{res.daily} kg</b></div>
            <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{t('result.monthly')}</div><b style={{ fontFamily: 'Baloo 2', fontSize: '1.3rem' }}>{res.monthly} kg</b></div>
            <div><div className="muted" style={{ fontWeight: 800, fontSize: '.72rem', letterSpacing: '.05em' }}>{t('result.yearly')}</div><b style={{ fontFamily: 'Baloo 2', fontSize: '1.3rem' }}>{res.yearly} kg</b></div>
          </div>
        </div>

        <div className={'impact ' + impact.tone}>
          <h3><Icon name={impactIcon} size={20} /> {impact.headline}</h3>
          <p>{impact.destruction}</p>
          <p className="money"><Icon name="coin" size={17} /> {impact.moneyWasted}</p>
        </div>

        <div className="card">
          <h3 className="card-h"><Icon name="bowl" size={18} /> {t('result.fromWhere')}</h3>
          <Donut segments={segs} onSlice={(s) => setSliceKey(s.key)} />
          <div className="legend">
            {segs.map((s) => (
              <span key={s.key} onClick={() => setSliceKey(s.key)}>
                <i style={{ background: s.color }} /><Icon name={CATEGORY_META[s.key].icon} size={15} style={{ color: s.color }} />{lang === 'ne' ? CAT_NE[s.key] : CATEGORY_META[s.key].label}
              </span>
            ))}
          </div>
          {sliceKey ? (
            <div className="impact medium" style={{ marginTop: 12 }}>
              <b className="impact-head"><Icon name={CATEGORY_META[sliceKey].icon} size={18} /> {lang === 'ne' ? CAT_NE[sliceKey] : CATEGORY_META[sliceKey].label}</b>
              <p>{((lang === 'ne' ? DESTRUCTION_MESSAGES_NE : DESTRUCTION_MESSAGES)[sliceKey] || (() => ''))(res.breakdown[sliceKey])}</p>
            </div>
          ) : (
            <div className="muted center" style={{ fontWeight: 700, fontSize: '.85rem', marginTop: 8 }}>{t('result.tapSlice')}</div>
          )}
        </div>

        <div className="card">
          <h3 className="card-h"><Icon name="bolt" size={18} /> {t('result.compare')}</h3>
          <div className="bars">
            {bench.map((b) => (
              <div className="bar-row" key={b.name}>
                <div className="lab"><span>{b.name}</span><span>{b.v.toFixed(1)} kg/day</span></div>
                <div className="track"><i style={{ width: `${Math.min(100, (b.v / benchMax) * 100)}%`, background: b.c }} /></div>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontWeight: 700, fontSize: '.82rem', marginTop: 6 }}>{t('result.benchNote')}</div>
        </div>

        <div className="card full">
          <h3 className="card-h"><Icon name="tree" size={18} /> {t('result.treesTitle')}</h3>
          <div className="muted" style={{ fontWeight: 700 }}>
            {t('result.treesNeedA')} <b style={{ color: 'var(--primary)' }}>{Math.max(0, treesNeeded - treesOffset)}</b> {t('result.treesNeedB')}
          </div>
          <div className="trees-vis">
            {Array.from({ length: Math.min(40, treesNeeded) }).map((_, i) => (
              <TreeGlyph key={i} filled={i < treesOffset} />
            ))}
            {treesNeeded > 40 ? <span className="muted" style={{ fontWeight: 800, alignSelf: 'center' }}>+{treesNeeded - 40} more</span> : null}
          </div>
        </div>

        <div className="full">
          <h3 className="section-h"><Icon name="sprout" size={20} /> {t('result.tipsTitle')}</h3>
          {tips.length ? (
            tips.map((t, i) => {
              const sv = t.savingsMessage;
              const keys = ['money', 'plant', 'nature', 'water', 'fun'].filter((k) => sv[k]).slice(0, 3);
              return (
                <div className="tip" key={i}>
                  <div className="head"><Icon name="bulb" size={18} /> {t.tip}</div>
                  <div className="saves">{keys.map((k) => (
                    <div key={k}><Icon name={SAVE_ICON[k]} size={16} /> {sv[k]}</div>
                  ))}</div>
                </div>
              );
            })
          ) : (
            <div className="card soft" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
              <Icon name="leaf" size={20} style={{ color: 'var(--primary)' }} /> {t('result.allGood')}
            </div>
          )}
        </div>

        <div className="card full">
          <BanaBubble text={banaText || t('result.thinking')} offline={offline} />
          <div className="muted" style={{ fontWeight: 800, marginTop: 10, display: 'flex', alignItems: 'center', gap: 9 }}>
            <BanaFace size={26} /> {t('result.challenge')}
          </div>
        </div>
      </div>
    </div>
  );
}

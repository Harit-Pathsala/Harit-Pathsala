import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { sfx } from '../game/sfx.js';
import { calculateSchoolFootprint, SCHOOL_DAYS } from '../logic.js';

/* ============================================================================
 * Whole-School Carbon Snapshot
 * Lets a school estimate its own yearly emissions from real daily activity —
 * commuting, electricity, canteen cooking, and waste — so students see how
 * their SCHOOL emits, not just one person. Offline, bilingual, saved locally.
 * ==========================================================================*/

const STORE_KEY = 'harit_schoolcarbon_v1';
const DEFAULTS = {
  students: 400, staff: 25, distanceKm: 3,
  shareActive: 50, sharePublic: 35, sharePrivate: 15,
  elecProfile: 'moderate', elecCustomKwh: 20, solar: false,
  cooks: true, cookFuel: 'firewood', cookAmtPerDay: 15,
  wasteKgDay: 20, wasteMethod: 'bin', treesOnGround: 20,
};

function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')) }; }
  catch (_) { return { ...DEFAULTS }; }
}

const CAT = {
  commute: { en: 'Commuting', ne: 'आवतजावत', icon: 'bus', color: '#f4a261' },
  electricity: { en: 'Electricity', ne: 'बिजुली', icon: 'bulb', color: '#52b788' },
  cooking: { en: 'Canteen cooking', ne: 'क्यान्टिन खाना', icon: 'flame', color: '#e76f51' },
  waste: { en: 'Waste', ne: 'फोहोर', icon: 'trash', color: '#6b4226' },
};

function Seg({ value, options, onChange }) {
  const { lang } = useLang();
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, background: 'var(--surface-soft)', padding: 4, borderRadius: 12, border: '1.5px solid var(--border-soft,#e3ebe0)' }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => { onChange(o.v); sfx.select(); }} data-sfx-silent
          style={{ border: 'none', borderRadius: 9, padding: '7px 12px', fontWeight: 800, fontSize: '.84rem', cursor: 'pointer',
            background: value === o.v ? 'var(--primary)' : 'transparent', color: value === o.v ? '#fff' : 'var(--ink)' }}>
          {lang === 'ne' ? o.ne : o.en}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '.92rem' }}>{label}</span>
        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{value}{unit ? ` ${unit}` : ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '.95rem', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export default function SchoolCarbon() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [inp, setInp] = useState(load);
  const set = (k, v) => setInp((s) => ({ ...s, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(inp)); } catch (_) { /* */ } }, [inp]);

  const r = useMemo(() => calculateSchoolFootprint(inp), [inp]);
  const shareTotal = (inp.shareActive + inp.sharePublic + inp.sharePrivate) || 1;
  const pct = (v) => Math.round((v / (r.gross || 1)) * 100);

  const tips = {
    commute: tt('Commuting is your biggest source. Encourage walking, cycling and a shared school bus, and group students who live nearby.', 'आवतजावत सबैभन्दा ठूलो स्रोत हो। हिँड्न, साइकल चलाउन र साझा स्कुल बस प्रयोग गर्न प्रोत्साहन गर्नुहोस्।'),
    electricity: tt('Nepal\u2019s grid is mostly hydropower, so electricity is already low-carbon. Solar panels and switch-off habits trim it further.', 'नेपालको ग्रिड प्रायः जलविद्युत् भएकाले बिजुली पहिल्यै कम-कार्बन छ। सौर्य प्यानल र बत्ती बन्द गर्ने बानीले अझ घटाउँछ।'),
    cooking: tt('Firewood smoke harms lungs and the climate. Switching the canteen to LPG, biogas or induction (clean on Nepal\u2019s grid) cuts this a lot.', 'दाउराको धुवाँले फोक्सो र जलवायुलाई हानि गर्छ। क्यान्टिनलाई एलपीजी, बायोग्यास वा इन्डक्सनमा बदल्दा धेरै घट्छ।'),
    waste: tt('Burning waste is the worst option \u2014 toxic smoke and black carbon. Compost food scraps, segregate, and cut plastic to slash this.', 'फोहोर जलाउनु सबैभन्दा नराम्रो \u2014 विषाक्त धुवाँ र कालो कार्बन। कम्पोस्ट, छुट्याउने र प्लास्टिक घटाउँदा धेरै कम हुन्छ।'),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, alignItems: 'start' }}>
      {/* INPUTS */}
      <div className="card">
        <p className="muted" style={{ fontWeight: 600, margin: '0 0 16px' }}>{tt('Tell us about a normal school day. The estimate updates live. We count about', 'सामान्य विद्यालय दिनबारे बताउनुहोस्। अनुमान तुरुन्तै अपडेट हुन्छ। हामी वर्षको करिब')} {SCHOOL_DAYS} {tt('school days a year.', 'विद्यालय दिन गणना गर्छौं।')}</p>

        <Field label={tt('People', 'मानिस')}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[['students', tt('Students', 'विद्यार्थी')], ['staff', tt('Teachers & staff', 'शिक्षक र कर्मचारी')]].map(([k, lbl]) => (
              <label key={k} style={{ flex: '1 1 130px' }}>
                <div className="muted" style={{ fontWeight: 700, fontSize: '.82rem', marginBottom: 4 }}>{lbl}</div>
                <input type="number" min="0" value={inp[k]} onChange={(e) => set(k, Math.max(0, +e.target.value || 0))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '2px solid var(--border)', fontWeight: 800, color: 'var(--ink)', background: 'var(--surface)' }} />
              </label>
            ))}
          </div>
        </Field>

        <Field label={tt('How students & staff travel', 'विद्यार्थी र कर्मचारी कसरी आउँछन्')}>
          <Slider label={tt('Average distance (one way)', 'औसत दूरी (एकतर्फी)')} value={inp.distanceKm} min={0} max={20} step={0.5} unit="km" onChange={(v) => set('distanceKm', v)} />
          <div style={{ height: 8 }} />
          <Slider label={tt('Walk / cycle', 'हिँड्ने / साइकल')} value={inp.shareActive} min={0} max={100} unit="%" onChange={(v) => set('shareActive', v)} />
          <Slider label={tt('Bus / microbus', 'बस / माइक्रोबस')} value={inp.sharePublic} min={0} max={100} unit="%" onChange={(v) => set('sharePublic', v)} />
          <Slider label={tt('Motorbike / car', 'मोटरसाइकल / कार')} value={inp.sharePrivate} min={0} max={100} unit="%" onChange={(v) => set('sharePrivate', v)} />
          <div className="muted" style={{ fontWeight: 700, fontSize: '.76rem', marginTop: 2 }}>{tt('Shares are balanced automatically', 'अनुपात स्वतः मिलाइन्छ')} ({Math.round(inp.shareActive / shareTotal * 100)}/{Math.round(inp.sharePublic / shareTotal * 100)}/{Math.round(inp.sharePrivate / shareTotal * 100)})</div>
        </Field>

        <Field label={tt('Electricity', 'बिजुली')}>
          <Seg value={inp.elecProfile} onChange={(v) => set('elecProfile', v)} options={[
            { v: 'minimal', en: 'Light', ne: 'न्यून' }, { v: 'moderate', en: 'Moderate', ne: 'मध्यम' },
            { v: 'heavy', en: 'Heavy', ne: 'उच्च' }, { v: 'custom', en: 'Custom', ne: 'आफ्नै' }]} />
          {inp.elecProfile === 'custom' && (<div style={{ marginTop: 10 }}><Slider label={tt('Electricity per day', 'दैनिक बिजुली')} value={inp.elecCustomKwh} min={0} max={200} unit="kWh" onChange={(v) => set('elecCustomKwh', v)} /></div>)}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
            <input type="checkbox" checked={inp.solar} onChange={(e) => { set('solar', e.target.checked); sfx.toggle(); }} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
            {tt('School has solar panels', 'विद्यालयमा सौर्य प्यानल छ')}
          </label>
        </Field>

        <Field label={tt('Canteen cooking', 'क्यान्टिन खाना')}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
            <input type="checkbox" checked={inp.cooks} onChange={(e) => { set('cooks', e.target.checked); sfx.toggle(); }} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
            {tt('The school cooks meals / snacks', 'विद्यालयले खाना/खाजा पकाउँछ')}
          </label>
          {inp.cooks && (<>
            <Seg value={inp.cookFuel} onChange={(v) => set('cookFuel', v)} options={[
              { v: 'firewood', en: 'Firewood', ne: 'दाउरा' }, { v: 'lpg', en: 'LPG gas', ne: 'एलपीजी' }, { v: 'electric', en: 'Induction', ne: 'इन्डक्सन' }]} />
            <div style={{ marginTop: 10 }}>
              <Slider label={inp.cookFuel === 'electric' ? tt('Electricity per day', 'दैनिक बिजुली') : tt('Fuel per day', 'दैनिक इन्धन')}
                value={inp.cookAmtPerDay} min={0} max={inp.cookFuel === 'electric' ? 60 : 50} unit={inp.cookFuel === 'electric' ? 'kWh' : 'kg'} onChange={(v) => set('cookAmtPerDay', v)} />
            </div>
          </>)}
        </Field>

        <Field label={tt('Waste', 'फोहोर')}>
          <Slider label={tt('Waste produced per day', 'दैनिक फोहोर')} value={inp.wasteKgDay} min={0} max={120} unit="kg" onChange={(v) => set('wasteKgDay', v)} />
          <div style={{ marginTop: 8 }}>
            <Seg value={inp.wasteMethod} onChange={(v) => set('wasteMethod', v)} options={[
              { v: 'compost', en: 'Compost', ne: 'कम्पोस्ट' }, { v: 'bin', en: 'Municipal bin', ne: 'नगर बिन' }, { v: 'burn', en: 'Burn it', ne: 'जलाउने' }]} />
          </div>
        </Field>

        <Field label={tt('Trees on school grounds', 'विद्यालय परिसरका रूख')}>
          <Slider label={tt('Mature trees growing', 'हुर्किएका रूख')} value={inp.treesOnGround} min={0} max={300} unit="" onChange={(v) => set('treesOnGround', v)} />
        </Field>
      </div>

      {/* RESULTS */}
      <div style={{ position: 'sticky', top: 12 }}>
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(160deg,#1f7a3a,#2f9e44)', color: '#fff' }}>
          <div style={{ fontWeight: 800, opacity: .92, letterSpacing: '.04em', fontSize: '.84rem' }}>{tt('YOUR SCHOOL\u2019S FOOTPRINT', 'तपाईंको विद्यालयको फुटप्रिन्ट')}</div>
          <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 'clamp(2.6rem,7vw,3.6rem)', lineHeight: 1.05, margin: '4px 0' }}>{r.tonnesNet}</div>
          <div style={{ fontWeight: 800, opacity: .95 }}>{tt('tonnes CO\u2082 / year', 'टन CO\u2082 / वर्ष')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
            <div><div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{r.dailyNet}</div><div style={{ fontSize: '.74rem', fontWeight: 700, opacity: .9 }}>{tt('kg / day', 'किलो / दिन')}</div></div>
            <div><div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{r.perStudentYear}</div><div style={{ fontSize: '.74rem', fontWeight: 700, opacity: .9 }}>{tt('kg / student / yr', 'किलो / विद्यार्थी / वर्ष')}</div></div>
            <div><div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{r.people}</div><div style={{ fontSize: '.74rem', fontWeight: 700, opacity: .9 }}>{tt('people', 'मानिस')}</div></div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <b style={{ color: 'var(--ink)' }}>{tt('Where it comes from', 'कहाँबाट आउँछ')}</b>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {Object.keys(CAT).map((k) => {
              const val = r.breakdown[k] || 0; const p = pct(val);
              return (
                <div key={k}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon name={CAT[k].icon} size={17} style={{ color: CAT[k].color }} />
                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '.9rem', flex: 1 }}>{tt(CAT[k].en, CAT[k].ne)}</span>
                    <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: '.84rem' }}>{(val / 1000).toFixed(1)}t · {p}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: 'var(--border-soft,#e3ebe0)', overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: CAT[k].color, borderRadius: 999, transition: 'width .4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 12, background: 'var(--surface-soft)', border: '1.5px solid var(--border-soft,#e3ebe0)', display: 'flex', gap: 10 }}>
            <Icon name="leaf" size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)' }}>{tips[r.biggestKey]}</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, color: 'var(--ink)' }}>
            <Icon name="tree" size={20} style={{ color: 'var(--primary)' }} />
            {r.treesStillNeeded > 0
              ? <span>{tt('About', 'करिब')} <b style={{ color: 'var(--primary)' }}>{r.treesStillNeeded.toLocaleString()}</b> {tt('more trees would absorb the rest each year.', 'थप रूखले बाँकी हरेक वर्ष सोस्नेछन्।')}</span>
              : <span>{tt('Your trees already offset this footprint. Outstanding!', 'तपाईंका रूखले यो फुटप्रिन्ट पहिल्यै सन्तुलन गर्छन्। उत्कृष्ट!')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

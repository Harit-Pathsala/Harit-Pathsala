import React, { useEffect, useRef, useState } from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useGameStore } from '../state/gameStore.ts';
import { useAuth } from '../data/auth.jsx';
import { getCarbon } from '../data/db.js';
import { CATEGORY_META } from '../logic.js';
import {
  pickChatModel, buildIndex, answerQuestion, makePlan,
  isPlanIntent, isAmbiguous, TOPIC_TO_FOCUS,
  isGreeting, isIdentity, isOnTopic,
} from '../rag.js';

let UID = 0; const uid = () => { UID += 1; return UID; };
const FOCUS_KEYS = ['transport', 'cooking', 'food', 'waste'];

// pull numbered steps out of a plan's text so they can be saved as checklist items
function parseSteps(text) {
  if (!text) return [];
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  let steps = lines.filter((l) => /^\d+[.)]/.test(l)).map((l) => l.replace(/^\d+[.)]\s*/, '').trim());
  if (!steps.length) { const m = text.match(/\d+[.)]\s*[^\n]+/g); if (m) steps = m.map((s) => s.replace(/^\d+[.)]\s*/, '').trim()); }
  return steps.map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 4).slice(0, 6).map((tx) => ({ text: tx }));
}

export default function AskBanaPage() {
  const { lang, t } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { user } = useAuth();
  const todos = useGameStore((s) => s.todos);
  const levelsPassed = useGameStore((s) => s.levelsPassed);
  const ecoPoints = useGameStore((s) => s.ecoPoints);
  const valley = useGameStore((s) => s.valley);
  const addTodos = useGameStore((s) => s.addTodos);
  const toggleTodo = useGameStore((s) => s.toggleTodo);
  const clearTodos = useGameStore((s) => s.clearTodos);

  // a compact, private context about the logged-in student so Bana can greet by
  // name and tailor advice to their real data (footprint, progress, to-dos)
  function personaContext() {
    if (!user) return '';
    const first = (user.name || '').split(' ')[0] || user.name;
    const lines = [];
    lines.push(`You are talking with a student named ${first}. Address them warmly by their first name (e.g. "Namaste ${first}!").`);
    const hist = user.role === 'student' ? getCarbon(user.id) : [];
    const latest = hist.length ? hist[hist.length - 1] : null;
    if (latest) {
      const pos = Object.entries(latest.breakdown || {}).filter(([k, v]) => k !== 'carbon_sink' && v > 0).sort((x, y) => y[1] - x[1]);
      const big = pos.length ? (CATEGORY_META[pos[0][0]]?.label || pos[0][0]) : 'unknown';
      lines.push(`Their measured footprint is about ${latest.yearly} kg CO2 per year (eco score ${latest.ecoScore} out of 100); biggest source: ${big}.`);
    } else {
      lines.push(`They have not measured their carbon footprint yet — gently encourage them to try the Calculator.`);
    }
    lines.push(`Game progress: ${levelsPassed.length} levels completed, ${ecoPoints} eco points, ${valley.trees} trees grown.`);
    const openTodos = todos.filter((td) => !td.done).map((td) => td.text).slice(0, 4);
    if (openTodos.length) lines.push(`Their current open eco to-dos: ${openTodos.join('; ')}.`);
    lines.push(`Use these personal details to make help specific and motivating. Keep their name natural, do not overuse it.`);
    return lines.join(' ');
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('connecting');
  const [busy, setBusy] = useState(false);
  const model = useRef(null);
  const flow = useRef(null);        // { answers, focusKey }
  const history = useRef([]);       // [{role, content}] rolling memory
  const logRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await pickChatModel();
      if (!alive) return;
      model.current = m;                          // null -> rule-based fallback
      setStatus(m ? 'ready' : 'local');
      const idx = await buildIndex(lang);
      if (alive && m && idx.mode === 'keyword') setStatus('keyword');
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (model.current) buildIndex(lang); }, [lang]); // warm the other language's index
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages]);

  const push = (msg) => setMessages((m) => [...m, { id: uid(), ...msg }]);
  const patch = (id, fn) => setMessages((m) => m.map((x) => (x.id === id ? fn(x) : x)));

  async function runStream(kind, payload) {
    setBusy(true);
    const steps = kind === 'plan' ? t('ask.stepsPlan') : t('ask.stepsAnswer');
    const id = uid();
    setMessages((m) => [...m, { id, role: 'bana', text: '', streaming: true, steps }]);
    const onToken = (tok) => patch(id, (x) => ({ ...x, text: x.text + tok }));
    const hist = history.current.slice();
    const userContext = personaContext();
    let result;
    try {
      result = kind === 'plan'
        ? await makePlan({ model: model.current, answers: payload.answers, modifier: payload.modifier, focusKey: payload.focusKey, history: hist, lang, onToken, userContext })
        : await answerQuestion({ model: model.current, query: payload.query, history: hist, lang, onToken, userContext });
    } catch (_) { result = null; }
    if (!result || !result.text) {
      patch(id, (x) => ({ ...x, streaming: false, steps: null, error: true, text: t('ask.error') }));
    } else {
      let savedCount = 0;
      if (kind === 'plan') {
        const tasks = (result.tasks && result.tasks.length) ? result.tasks : parseSteps(result.text);
        if (tasks.length) { addTodos(tasks.map((tk) => ({ text: tk.text || tk, tag: tk.tag }))); savedCount = tasks.length; }
      }
      patch(id, (x) => ({ ...x, streaming: false, steps: null, text: result.text, sources: result.sources, refine: kind === 'plan' ? { answers: payload.answers, focusKey: payload.focusKey } : null, offerPlan: kind === 'answer', savedCount }));
      // remember this exchange
      const userTurn = kind === 'plan'
        ? `${payload.modifier ? payload.modifier + ' — ' : ''}plan for ${payload.answers.area || ''}, ${payload.answers.focus || ''}`
        : payload.query;
      history.current.push({ role: 'user', content: userTurn }, { role: 'assistant', content: result.text });
      if (history.current.length > 12) history.current = history.current.slice(-12);
    }
    setBusy(false);
  }

  function nextQuestion(a, focusKey) {
    if (!a.area) return { key: 'area', ...t('ask.flow.area') };
    if (!a.focus) return { key: 'focus', ...t('ask.flow.focus') };
    if (!a.detail) { const d = t('ask.flow.detail.' + focusKey); return d && d.q ? { key: 'detail', ...d } : null; }
    return null;
  }
  function advanceFlow() {
    const f = flow.current;
    const q = nextQuestion(f.answers, f.focusKey);
    if (q) push({ role: 'mcq', q: q.q, options: q.options, qkey: q.key });
    else { const answers = f.answers; const fk = f.focusKey; flow.current = null; push({ role: 'bana', text: t('ask.writingPlan'), streaming: false, note: true }); runStream('plan', { answers, focusKey: fk }); }
  }
  function startFlow(preset, focusKey, intro) {
    flow.current = { answers: preset || {}, focusKey: focusKey || null };
    push({ role: 'bana', text: intro || t('ask.planIntro'), streaming: false });
    advanceFlow();
  }
  function pickOption(msgId, value, qkey, index) {
    if (!flow.current) return;
    patch(msgId, (x) => ({ ...x, chosen: value }));
    push({ role: 'user', text: value });
    flow.current.answers[qkey] = value;
    if (qkey === 'focus') flow.current.focusKey = FOCUS_KEYS[index];
    setTimeout(advanceFlow, 140);
  }

  // a quick canned Bana reply (no model call) that still joins the memory
  function sayBana(text) {
    push({ role: 'bana', text, streaming: false });
    history.current.push({ role: 'assistant', content: text });
    if (history.current.length > 12) history.current = history.current.slice(-12);
  }

  function route(text) {
    const first2 = user?.name ? user.name.split(' ')[0] : '';
    // 1) simple greeting -> greet back by name
    if (isGreeting(text)) {
      sayBana(first2
        ? tt(`Hi ${first2}! How can I help you?`, `नमस्ते ${first2}! म कसरी मद्दत गर्न सक्छु?`)
        : tt('Hi! How can I help you with your carbon footprint today?', 'नमस्ते! आज तपाईंको कार्बन फुटप्रिन्टबारे म कसरी मद्दत गरूँ?'));
      return;
    }
    // 2) "who are you" / identity questions
    if (isIdentity(text)) {
      sayBana(tt(
        `I'm Bana, a red panda who helps Nepali students understand and reduce their carbon footprint. Ask me about energy, transport, cooking, waste, water or trees in Nepal!`,
        `म बाना हुँ — नेपाली विद्यार्थीलाई आफ्नो कार्बन फुटप्रिन्ट बुझ्न र घटाउन सघाउने रातो पाण्डा। ऊर्जा, यातायात, खाना पकाउने, फोहोर, पानी वा रूखबारे सोध्नुहोस्!`));
      return;
    }
    // 3) plan / topic flows
    if (isPlanIntent(text)) { startFlow(); return; }
    if (isAmbiguous(text)) {
      const key = (text.toLowerCase().match(/[a-z\u0900-\u097f]+/g) || []).map((w) => TOPIC_TO_FOCUS[w]).find(Boolean);
      if (key) {
        const i = FOCUS_KEYS.indexOf(key);
        const focusLabel = t('ask.flow.focus').options[i];
        startFlow({ focus: focusLabel }, key, t('ask.ambigIntro'));
      } else startFlow(undefined, null, t('ask.ambigIntro'));
      return;
    }
    // 4) off-topic -> politely decline instead of hallucinating
    if (!isOnTopic(text)) {
      sayBana(tt(
        `Sorry, I can't help with that — I only answer questions about carbon footprint, climate and the environment in Nepal. Try asking me about energy, transport, cooking, waste or trees!`,
        `माफ गर्नुहोस्, म त्यसमा मद्दत गर्न सक्दिनँ — म नेपालको कार्बन फुटप्रिन्ट, जलवायु र वातावरणबारे मात्र जवाफ दिन्छु। ऊर्जा, यातायात, खाना पकाउने, फोहोर वा रूखबारे सोध्नुहोस्!`));
      return;
    }
    runStream('answer', { query: text });
  }
  function submit() { const text = input.trim(); if (!text || busy || status === 'offline') return; push({ role: 'user', text }); setInput(''); route(text); }
  function sendNow(text) { push({ role: 'user', text }); route(text); }

  const empty = messages.length === 0;
  const doneCount = todos.filter((td) => td.done).length;
  const allDone = todos.length > 0 && doneCount === todos.length;
  const first = user?.name ? user.name.split(' ')[0] : '';
  const hour = new Date().getHours();
  const tod = hour < 12 ? tt('Good morning', 'शुभ प्रभात') : hour < 17 ? tt('Good afternoon', 'शुभ दिन') : tt('Good evening', 'शुभ साँझ');
  const welcomeText = first
    ? tt(`${tod}, ${first}! I'm Bana. Ask me about your carbon footprint, cooking, transport, trees or waste in Nepal — or tap a starter below.`,
         `${tod}, ${first}! म बाना हुँ। आफ्नो कार्बन फुटप्रिन्ट, खाना, यातायात, रूख वा फोहोरबारे सोध्नुहोस् — वा तलको सुझाव ट्याप गर्नुहोस्।`)
    : t('ask.welcome');
  return (
    <div className="page fade-in">
      <div className="hero">
        <span className="pill"><Icon name="chat" size={15} /> {t('ask.pill')}</span>
        <h1 style={{ marginTop: 8 }}>{t('ask.title')}</h1>
        <p>{t('ask.intro')}</p>
      </div>

      {todos.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="book" size={18} /> {tt('My Eco To-Do', 'मेरो इको सूची')}</h3>
            <span className="muted" style={{ fontWeight: 800 }}>{doneCount}/{todos.length} {tt('done', 'सकियो')}</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, overflow: 'hidden', margin: '8px 0 12px', backgroundColor: '#e6efe0' }}>
            <div style={{ height: '100%', width: `${todos.length ? (doneCount / todos.length) * 100 : 0}%`, background: '#2f9e44', transition: 'width .25s' }} />
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {todos.map((td) => (
              <label key={td.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', opacity: td.done ? 0.55 : 1 }}>
                <input type="checkbox" checked={td.done} onChange={() => toggleTodo(td.id)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: '#2f9e44' }} />
                <span style={{ textDecoration: td.done ? 'line-through' : 'none', fontWeight: 600 }}>{td.text}</span>
              </label>
            ))}
          </div>
          {allDone && <div style={{ marginTop: 12, fontWeight: 800, color: '#2f9e44', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="sparkle" size={16} /> {tt('All done — you\u2019re becoming an Eco Hero!', 'सबै सकियो — तपाईं इको हिरो बन्दै!')}</div>}
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={clearTodos}>{tt('Clear list', 'सूची खाली गर्नुहोस्')}</button>
        </div>
      )}

      <div className="card chat-card">
        <div className={'chat-status ' + status}>
          <BanaFace size={30} />
          <div><b>Bana</b><span>{t('ask.' + status)}</span></div>
        </div>

        <div className="chat-log" ref={logRef}>
          {empty ? (<div className="chat-welcome"><BanaFace size={64} /><p>{welcomeText}</p></div>) : null}
          {messages.map((m) => {
            if (m.role === 'user') return (<div key={m.id} className="bubble-row user"><div className="bubble user">{m.text}</div></div>);
            if (m.role === 'mcq') return (
              <div key={m.id} className="bubble-row bana">
                <BanaFace size={34} />
                <div className="mcq">
                  <div className="bubble bana">{m.q}</div>
                  <div className="mcq-opts">
                    {m.options.map((o, i) => (
                      <button key={o} className={'mcq-opt' + (m.chosen === o ? ' chosen' : '')} disabled={!!m.chosen} onClick={() => pickOption(m.id, o, m.qkey, i)}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
            return (
              <div key={m.id} className="bubble-row bana">
                <BanaFace size={34} />
                <div style={{ flex: 1 }}>
                  {m.streaming && !m.text && m.steps ? (
                    <div className="agent-steps">
                      {m.steps.map((s, i) => (<div className="agent-step" key={s} style={{ animationDelay: (i * 0.5) + 's' }}><span className="agent-dot"><i /></span>{s}</div>))}
                    </div>
                  ) : (
                    <div className={'bubble bana' + (m.error ? ' error' : '') + (m.note ? ' note' : '')}>
                      {m.text || (m.streaming ? <span className="dots"><i /><i /><i /></span> : '')}
                      {m.streaming && m.text ? <span className="cursor">&nbsp;</span> : null}
                    </div>
                  )}
                  {m.sources && m.sources.length ? (
                    <div className="sources"><Icon name="book" size={14} /> {t('ask.sources')}
                      {m.sources.map((s) => <span key={s.id} className="src-chip">{(s[lang] ? s[lang].title : s.en.title).replace(/^(Q:|प्रश्न:)\s*/, '')}</span>)}
                    </div>
                  ) : null}
                  {m.refine ? (
                    <div className="followups">
                      {t('ask.refine').map((r) => (<button key={r} className="followup" disabled={busy} onClick={() => { push({ role: 'user', text: r }); runStream('plan', { answers: m.refine.answers, focusKey: m.refine.focusKey, modifier: r }); }}>{r}</button>))}
                    </div>
                  ) : null}
                  {m.offerPlan ? (<div className="followups"><button className="followup accent" disabled={busy} onClick={() => startFlow()}>{t('ask.makePlan')}</button></div>) : null}
                  {m.savedCount ? (<div className="muted" style={{ fontWeight: 700, marginTop: 8 }}>{tt('Saved ' + m.savedCount + ' steps to your to-do list above.', 'माथिको सूचीमा ' + m.savedCount + ' कदम सुरक्षित।')}</div>) : null}
                </div>
              </div>
            );
          })}
        </div>

        {empty ? (
          <div className="chat-suggest">
            {t('ask.suggestions').map((s) => (<button key={s} className="sugg" disabled={status === 'offline'} onClick={() => sendNow(s)}>{s}</button>))}
          </div>
        ) : null}

        <div className="chat-input">
          <input value={input} placeholder={status === 'offline' ? t('ask.placeholderOff') : t('ask.placeholder')}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} disabled={status === 'offline'} />
          <button className="btn" onClick={submit} disabled={busy || status === 'offline' || !input.trim()}><Icon name="send" size={18} /></button>
        </div>
        {status === 'offline' ? (<div className="muted" style={{ fontWeight: 700, fontSize: '.82rem', marginTop: 10 }}>{t('ask.offlineHint')}</div>) : null}
      </div>
    </div>
  );
}

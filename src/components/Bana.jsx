import React, { useState, useEffect } from 'react';
import { BANA_FALLBACK } from '../logic.js';

export function BanaFace({ size = 74 }) {
  return (
    <svg className="bana-face" viewBox="0 0 100 100" width={size} height={size} aria-label="Bana the red panda">
      <ellipse className="tail" cx="14" cy="64" rx="18" ry="7" fill="#b5651d" transform="rotate(-15 14 64)" />
      <path className="tail" d="M2 64 q8 -4 24 0" stroke="#7a3f10" strokeWidth="3" fill="none" transform="rotate(-15 14 64)" />
      <circle cx="50" cy="52" r="34" fill="#d9762e" />
      <path d="M22 28 q-6 -16 8 -16 q10 0 8 14 z" fill="#c45a1c" />
      <path d="M78 28 q6 -16 -8 -16 q-10 0 -8 14 z" fill="#c45a1c" />
      <path d="M24 24 q-3 -9 5 -9 q6 0 5 8 z" fill="#f4d9c0" />
      <path d="M76 24 q3 -9 -5 -9 q-6 0 -5 8 z" fill="#f4d9c0" />
      <ellipse cx="33" cy="58" rx="13" ry="15" fill="#fff" />
      <ellipse cx="67" cy="58" rx="13" ry="15" fill="#fff" />
      <ellipse cx="36" cy="48" rx="9" ry="11" fill="#6b3410" />
      <ellipse cx="64" cy="48" rx="9" ry="11" fill="#6b3410" />
      <circle className="eye" cx="37" cy="49" r="4.5" fill="#1a0e06" />
      <circle className="eye" cx="63" cy="49" r="4.5" fill="#1a0e06" />
      <circle cx="38.5" cy="47.5" r="1.4" fill="#fff" />
      <circle cx="64.5" cy="47.5" r="1.4" fill="#fff" />
      <path d="M44 64 q6 6 12 0" stroke="#1a0e06" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="62" rx="4" ry="3" fill="#1a0e06" />
    </svg>
  );
}

const BANA_SYSTEM = {
  en: "You are Bana, a friendly red panda who lives in Nepal's forests near Ilam. You help school students (Grade 6-10) understand their carbon footprint in simple, warm language. Speak like a kind older sibling. Use simple English. Occasionally say 'Namaste!', 'Ramro cha!', 'Dhanyabad'. You ONLY talk about climate, carbon footprint, Nepal's environment, and eco-friendly actions for students. Keep every reply under 60 words. End with one specific, actionable tip a Nepal school student can do TODAY. Never be preachy. Be encouraging and fun.",
  ne: "तपाईं बाना हुनुहुन्छ — इलामनेरका जंगलमा बस्ने मैत्रीपूर्ण रातो पाण्डा। कक्षा ६-१० का विद्यार्थीलाई उनीहरूको कार्बन फुटप्रिन्ट सरल, न्यानो भाषामा बुझाउनुहुन्छ। दयालु दाजु/दिदीझैं बोल्नुहोस्। जवाफ सधैं सरल नेपाली (देवनागरी) मा मात्र दिनुहोस्, अङ्ग्रेजी होइन। केवल जलवायु, कार्बन फुटप्रिन्ट, नेपालको वातावरण र विद्यार्थीका हरित कामबारे कुरा गर्नुहोस्। हरेक जवाफ ६० शब्दभित्र राख्नुहोस् र आज गर्न सकिने एउटा ठोस सुझावले अन्त्य गर्नुहोस्। उत्साहजनक र रमाइलो हुनुहोस्।",
};

const OLLAMA_URL =
  (typeof window !== 'undefined' && window.HARIT_OLLAMA) || 'http://localhost:11434';

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } catch (_) {
    clearTimeout(t);
    return null;
  }
}

// Quick check: is Ollama reachable AND are CORS origins allowed? Returns a usable
// model name, or null. This fails fast (3.5s) so the UI can fall back promptly.
async function pickModel() {
  const res = await fetchWithTimeout(OLLAMA_URL + '/api/tags', { method: 'GET' }, 3500);
  if (!res) {
    console.warn('[Bana] Could not reach Ollama at ' + OLLAMA_URL + '/api/tags. Is Ollama running, and did you set OLLAMA_ORIGINS=* then restart it? (A CORS error above this line means origins are not allowed.)');
    return null;
  }
  if (!res.ok) { console.warn('[Bana] Ollama /api/tags returned HTTP ' + res.status); return null; }
  let data;
  try { data = await res.json(); } catch (_) { return null; }
  const names = (data.models || []).map((m) => m.name || '');
  if (!names.length) { console.warn('[Bana] Ollama is running but NO models are installed. In a terminal run:  ollama pull llama3.2'); return null; }
  const model = (
    names.find((n) => n.startsWith('bana'))
    || names.find((n) => n.startsWith('llama3.2'))
    || names.find((n) => n.startsWith('llama'))
    || names[0]
  );
  console.info('[Bana] Ollama reachable. Models: ' + names.join(', ') + ' → using "' + model + '"');
  return model;
}

// Generate Bana's reply via local Ollama. Picks whatever model is installed,
// gives the first generation up to 30s (model load on CPU can be slow), and
// returns null on any failure so the caller uses the built-in BANA_FALLBACK.
export async function askBana(userContext, answers, lang = 'en') {
  const model = await pickModel();
  if (!model) return null; // Ollama not running, model not pulled, or CORS blocked
  const langRule = lang === 'ne' ? '\nIMPORTANT: reply ONLY in simple Nepali (Devanagari).' : '';
  const prompt = `Student's situation: ${userContext}\nStudent answered: ${JSON.stringify(answers)}${langRule}\nBana's response:`;
  const body = { model, stream: false, prompt, keep_alive: '10m' };
  if (!model.startsWith('bana')) body.system = BANA_SYSTEM[lang] || BANA_SYSTEM.en; // base models need the persona
  const res = await fetchWithTimeout(
    OLLAMA_URL + '/api/generate',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    30000,
  );
  if (!res) { console.warn('[Bana] Generation request timed out (>30s) or failed.'); return null; }
  if (!res.ok) { console.warn('[Bana] Ollama /api/generate returned HTTP ' + res.status + ' (model "' + model + '" may not be pulled).'); return null; }
  let data;
  try { data = await res.json(); } catch (_) { return null; }
  return data && data.response ? String(data.response).trim() : null;
}

export function BanaBubble({ text, offline }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    if (!text) return undefined;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  const typing = shown.length < (text ? text.length : 0);
  return (
    <div className="bana">
      <BanaFace />
      <div style={{ flex: 1 }}>
        <div className="bana-bubble">
          {shown}
          {typing ? <span className="cursor">&nbsp;</span> : null}
        </div>
        {offline ? <div className="bana-offline">{BANA_FALLBACK.offline}</div> : null}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../data/auth.jsx';
import { sfx } from '../game/sfx.js';

export default function Login() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);

  const submit = () => {
    if (!username.trim() || !password) { setErr(tt('Enter your username and password.', 'प्रयोगकर्ता नाम र पासवर्ड लेख्नुहोस्।')); return; }
    const r = login(username, password);
    if (r.error === 'no_user') { setErr(tt('No account with that username.', 'त्यो प्रयोगकर्ता नाम भएको खाता छैन।')); sfx.wrong(); return; }
    if (r.error === 'bad_password') { setErr(tt('Wrong password. Please try again.', 'पासवर्ड मिलेन। फेरि प्रयास गर्नुहोस्।')); sfx.wrong(); return; }
    setErr(''); sfx.start();
  };

  const field = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '2.5px solid #2b3a24', fontWeight: 700, color: '#2b3a24', background: '#fff', fontSize: '1rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, display: 'grid', placeItems: 'center', padding: 20, overflow: 'auto', background: 'radial-gradient(120% 120% at 50% 12%, #f4fbeb 0%, #d8edc4 100%)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 92, height: 92, borderRadius: '50%', background: 'rgba(255,255,255,.6)', boxShadow: '0 8px 26px rgba(120,90,40,.18)' }}><BanaFace size={72} /></div>
          <h1 style={{ margin: '14px 0 2px', fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, color: '#2b3a24', fontSize: '1.6rem' }}>{tt('Welcome back', 'फेरि स्वागत छ')}</h1>
          <div style={{ fontFamily: "'Patrick Hand',cursive", color: '#5d7a4f', fontSize: '1.05rem' }}>हरित पाठशाला · Harit Pathsala</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.92)', border: '2.5px solid #2b3a24', borderRadius: 20, padding: 20, boxShadow: '5px 6px 0 #2b3a24' }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 800, color: '#2b3a24', fontSize: '.88rem', display: 'block', marginBottom: 5 }}>{tt('Username', 'प्रयोगकर्ता नाम')}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus autoComplete="username" style={field} />
          </label>
          <label style={{ display: 'block', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, color: '#2b3a24', fontSize: '.88rem', display: 'block', marginBottom: 5 }}>{tt('Password', 'पासवर्ड')}</span>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="current-password" style={{ ...field, paddingRight: 64 }} />
              <button onClick={() => setShow((s) => !s)} data-sfx-silent style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#5d7a4f', fontWeight: 800, fontSize: '.78rem', cursor: 'pointer' }}>{show ? tt('Hide', 'लुकाउनुहोस्') : tt('Show', 'देखाउनुहोस्')}</button>
            </div>
          </label>

          {err && <div style={{ color: '#c0392b', fontWeight: 700, fontSize: '.86rem', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="warning" size={15} /> {err}</div>}

          <button onClick={submit} style={{ width: '100%', marginTop: 16, border: 'none', borderRadius: 26, padding: '13px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', background: '#2f9e44', color: '#fff', boxShadow: '0 5px 0 #1f6e30', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="lock" size={18} /> {tt('Log in', 'लग इन')}
          </button>
        </div>

        <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 14, background: 'rgba(255,255,255,.7)', border: '1.5px dashed #9ab98a', fontSize: '.8rem', color: '#46603a', fontWeight: 700 }}>
          <div style={{ marginBottom: 4 }}>{tt('First time? Try the demo accounts:', 'पहिलो पटक? डेमो खाता प्रयोग गर्नुहोस्:')}</div>
          <div style={{ fontFamily: 'monospace' }}>admin / admin123 · teacher / teacher123 · bishesh / student123</div>
        </div>
      </div>
    </div>
  );
}

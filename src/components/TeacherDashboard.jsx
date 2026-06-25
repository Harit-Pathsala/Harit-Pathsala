import React, { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../data/auth.jsx';
import { sfx } from '../game/sfx.js';
import * as db from '../data/db.js';
import { loadSaveFor } from '../game/save.ts';
import GreenGuidelines from './GreenGuidelines.jsx';
import GreenSchool from './GreenSchool.jsx';

const TOTAL_LEVELS = 18;
const inputS = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '2px solid var(--border)', fontWeight: 700, color: 'var(--ink)', background: 'var(--surface)', fontSize: '.92rem' };
const labelS = { fontWeight: 800, color: 'var(--ink)', fontSize: '.82rem', display: 'block', marginBottom: 5 };

function Stat({ icon, value, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
      <Icon name={icon} size={22} style={{ color: color || 'var(--primary)' }} />
      <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div className="muted" style={{ fontWeight: 700, fontSize: '.76rem' }}>{label}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,30,18,.5)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 440, maxHeight: '88vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} data-sfx-silent style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { user, logout } = useAuth();
  const cls = user?.classId ? db.getClass(user.classId) : null;
  const [tab, setTab] = useState('students');
  const [, force] = useState(0); const refresh = () => force((n) => n + 1);
  const [saves, setSaves] = useState({});
  const [modal, setModal] = useState(null); // {kind:'student'|'task', mode, data}
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  const students = db.getStudents(user?.classId);
  const tasks = db.getClassTasks(user?.classId);
  const clsLabel = cls ? (cls.name + (cls.section ? ` ${cls.section}` : '')) : tt('unassigned', 'तोकिएको छैन');

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(students.map(async (s) => [s.id, await loadSaveFor(s.id)]));
      if (alive) setSaves(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.classId, students.length]);

  const latestCarbon = (sid) => { const h = db.getCarbon(sid); return h.length ? h[h.length - 1] : null; };
  const rows = students.map((s) => {
    const save = saves[s.id];
    return { s, carbon: latestCarbon(s.id), levels: save ? save.levelsPassed.length : 0,
      todosDone: save ? save.todos.filter((t) => t.done).length : 0, todosTotal: save ? save.todos.length : 0,
      tasksDone: tasks.filter((t) => (t.doneBy || {})[s.id]).length, eco: save ? save.ecoPoints : 0 };
  });
  const avgScore = (() => { const v = rows.map((r) => r.carbon?.ecoScore).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '—'; })();
  const totalTrees = rows.reduce((n, r) => n + (saves[r.s.id]?.valley.trees || 0), 0);
  const measured = rows.filter((r) => r.carbon).length;

  // ---- CRUD ----
  const addStudent = () => { setForm({}); setModal({ kind: 'student', mode: 'add' }); setMsg(''); };
  const editStudent = (s) => { setForm({ name: s.name, username: s.username, password: '' }); setModal({ kind: 'student', mode: 'edit', data: s }); setMsg(''); };
  const addTask = () => { setForm({}); setModal({ kind: 'task', mode: 'add' }); setMsg(''); };
  const close = () => { setModal(null); setMsg(''); };

  const save = () => {
    const { kind, mode, data } = modal;
    let r;
    if (kind === 'student') {
      const patch = { role: 'student', name: form.name, username: form.username, classId: user.classId };
      if (mode === 'add') r = db.createUser({ ...patch, password: form.password });
      else { if (form.password) patch.password = form.password; r = db.updateUser(data.id, patch); }
    } else {
      if (!String(form.title || '').trim()) { setMsg(tt('Please enter a task title.', 'कृपया कार्यको शीर्षक लेख्नुहोस्।')); sfx.wrong(); return; }
      r = db.createTask({ title: form.title, desc: form.desc, classId: user.classId });
    }
    if (r && r.error) {
      setMsg(r.error === 'username_taken' ? tt('That username is already taken.', 'त्यो प्रयोगकर्ता नाम पहिले नै छ।') : r.error === 'username_required' ? tt('Username is required.', 'प्रयोगकर्ता नाम चाहिन्छ।') : tt('Could not save.', 'सुरक्षित गर्न सकिएन।'));
      sfx.wrong(); return;
    }
    sfx.correct(); close(); refresh();
  };
  const del = (kind, item) => {
    const label = item.name || item.title;
    if (!window.confirm(tt(`Delete “${label}”? This cannot be undone.`, `“${label}” हटाउने? यो फिर्ता गर्न मिल्दैन।`))) return;
    if (kind === 'student') db.deleteUser(item.id); else db.deleteTask(item.id);
    sfx.pop(); refresh();
  };

  const Tab = ({ id, icon, en, ne, n }) => (
    <button onClick={() => { setTab(id); sfx.tab(); }} data-sfx-silent
      style={{ border: 'none', borderRadius: 11, padding: '9px 15px', fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
        background: tab === id ? 'var(--primary)' : 'transparent', color: tab === id ? '#fff' : 'var(--ink)' }}>
      <Icon name={icon} size={17} /> {tt(en, ne)} {n != null && <span style={{ opacity: .7, fontWeight: 700 }}>{n}</span>}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg,#f3f7ee)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px', background: 'var(--surface)', borderBottom: '2px solid var(--border-soft,#e3ebe0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="book" size={20} /></div>
          <div><b style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>{tt('Teacher Dashboard', 'शिक्षक ड्यासबोर्ड')}</b><div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>{user?.name} · {tt('Class', 'कक्षा')}: {clsLabel}</div></div>
        </div>
        <button className="btn ghost" onClick={() => { sfx.click(); logout(); }}><Icon name="lock" size={16} /> {tt('Log out', 'लग आउट')}</button>
      </header>

      <div className="page" style={{ maxWidth: 980 }}>
        {!cls ? (
          <div className="card"><p style={{ fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{tt('You are not assigned to a class yet. Ask the administrator to assign you one.', 'तपाईंलाई अहिलेसम्म कक्षा तोकिएको छैन। एडमिनलाई सम्पर्क गर्नुहोस्।')}</p></div>
        ) : (<>
          <div style={{ display: 'inline-flex', gap: 6, background: 'var(--surface-soft)', padding: 5, borderRadius: 14, border: '1.5px solid var(--border-soft,#e3ebe0)', marginBottom: 16, flexWrap: 'wrap' }}>
            <Tab id="students" icon="users" en="Students" ne="विद्यार्थी" n={students.length} />
            <Tab id="tasks" icon="target" en="Class Tasks" ne="कक्षा कार्य" n={tasks.length} />
            <Tab id="green" icon="sprout" en="Green School" ne="हरित विद्यालय" n={null} />
          </div>

          {tab === 'students' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 16 }}>
              <Stat icon="users" value={students.length} label={tt('Students', 'विद्यार्थी')} />
              <Stat icon="calculator" value={`${measured}/${students.length}`} label={tt('Measured', 'नापे')} color="#f4a261" />
              <Stat icon="leaf" value={avgScore + (avgScore === '—' ? '' : '%')} label={tt('Avg eco score', 'औसत इको स्कोर')} />
              <Stat icon="tree" value={totalTrees} label={tt('Trees (game)', 'रूख')} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ color: 'var(--ink)', margin: 0 }}>{tt('Each student', 'प्रत्येक विद्यार्थी')}</h3>
              <button className="btn" onClick={addStudent}><Icon name="sprout" size={16} /> {tt('Add student', 'विद्यार्थी थप्नुहोस्')}</button>
            </div>
            {!students.length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No students in this class yet. Add your first student.', 'यो कक्षामा अहिलेसम्म विद्यार्थी छैन।')}</p>}
            <div style={{ display: 'grid', gap: 10 }}>
              {rows.map(({ s, carbon, levels, todosDone, todosTotal, tasksDone, eco }) => (
                <div key={s.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{s.name.slice(0, 1).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <b style={{ color: 'var(--ink)' }}>{s.name}</b>
                      <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>@{s.username}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.82rem' }}>
                      <div><div className="muted" style={{ fontWeight: 700 }}>{tt('Footprint', 'फुटप्रिन्ट')}</div><b style={{ color: carbon ? '#e76f51' : 'var(--muted)' }}>{carbon ? `${carbon.yearly} kg/yr` : tt('not yet', 'अझै छैन')}</b></div>
                      <div><div className="muted" style={{ fontWeight: 700 }}>{tt('Eco score', 'इको स्कोर')}</div><b style={{ color: 'var(--primary)' }}>{carbon ? `${carbon.ecoScore}%` : '—'}</b></div>
                      <div><div className="muted" style={{ fontWeight: 700 }}>{tt('Game level', 'खेल तह')}</div><b style={{ color: 'var(--ink)' }}>{levels}/{TOTAL_LEVELS}</b></div>
                      <div><div className="muted" style={{ fontWeight: 700 }}>{tt('Eco points', 'इको अंक')}</div><b style={{ color: '#e9a23b' }}>{eco}</b></div>
                      <div><div className="muted" style={{ fontWeight: 700 }}>{tt('Class tasks', 'कक्षा कार्य')}</div><b style={{ color: '#9b59b6' }}>{tasksDone}/{tasks.length}</b></div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn ghost" style={{ padding: '7px 10px' }} onClick={() => editStudent(s)} title={tt('Edit', 'सम्पादन')}><Icon name="refresh" size={15} /></button>
                      <button onClick={() => del('student', s)} data-sfx-silent title={tt('Delete', 'हटाउनुहोस्')} style={{ border: '2px solid #e7b4b4', background: '#fff', color: '#c0392b', borderRadius: 10, padding: '7px 10px', fontWeight: 800, cursor: 'pointer', fontSize: '.84rem' }}>{tt('Delete', 'हटाउनुहोस्')}</button>
                    </div>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'var(--border-soft,#e3ebe0)', marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${(levels / TOTAL_LEVELS) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {tab === 'tasks' && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h3 style={{ color: 'var(--ink)', margin: 0 }}>{tt('Class tasks', 'कक्षा कार्य')}</h3>
                <div className="muted" style={{ fontWeight: 700, fontSize: '.82rem' }}>{tt('Tasks set by the admin, plus any you add — every student in your class sees them.', 'एडमिनले तोकेका र तपाईंले थपेका कार्य — तपाईंको कक्षाका सबै विद्यार्थीले देख्छन्।')}</div>
              </div>
              <button className="btn" onClick={addTask}><Icon name="sprout" size={16} /> {tt('Add task', 'कार्य थप्नुहोस्')}</button>
            </div>
            {!tasks.length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No tasks yet. Add a green action for your class to complete.', 'अहिलेसम्म कार्य छैन।')}</p>}
            <div style={{ display: 'grid', gap: 10 }}>
              {tasks.map((t) => (
                <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="target" size={17} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ color: 'var(--ink)' }}>{t.title}</b>
                    {t.desc && <div style={{ fontSize: '.85rem', color: 'var(--ink)', marginTop: 2 }}>{t.desc}</div>}
                    <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem', marginTop: 2 }}>{Object.keys(t.doneBy || {}).length}/{students.length} {tt('students done', 'विद्यार्थीले पूरा गरे')}</div>
                  </div>
                  <button onClick={() => del('task', t)} data-sfx-silent style={{ border: '2px solid #e7b4b4', background: '#fff', color: '#c0392b', borderRadius: 10, padding: '7px 11px', fontWeight: 800, cursor: 'pointer', fontSize: '.84rem' }}>{tt('Delete', 'हटाउनुहोस्')}</button>
                </div>
              ))}
            </div>
          </>)}

          {tab === 'green' && (<>
            <GreenGuidelines />
            <GreenSchool />
          </>)}
        </>)}
      </div>

      {modal && (
        <Modal title={(modal.mode === 'add' ? tt('Add ', 'थप्नुहोस् ') : tt('Edit ', 'सम्पादन ')) + (modal.kind === 'student' ? tt('student', 'विद्यार्थी') : tt('task', 'कार्य'))} onClose={close}>
          <div style={{ display: 'grid', gap: 12 }}>
            {modal.kind === 'student' && (<>
              <label><span style={labelS}>{tt('Full name', 'पूरा नाम')}</span><input style={inputS} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span style={labelS}>{tt('Username', 'प्रयोगकर्ता नाम')}</span><input style={inputS} value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
              <label><span style={labelS}>{modal.mode === 'edit' ? tt('New password (leave blank to keep)', 'नयाँ पासवर्ड (खाली राख्न सकिन्छ)') : tt('Password', 'पासवर्ड')}</span><input style={inputS} value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>{tt('This student will be added to your class', 'यो विद्यार्थी तपाईंको कक्षामा थपिनेछ')}: <b>{clsLabel}</b></div>
            </>)}
            {modal.kind === 'task' && (<>
              <label><span style={labelS}>{tt('Task title', 'कार्यको शीर्षक')}</span><input style={inputS} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={tt('e.g. Start a class compost bin', 'जस्तै कक्षाको कम्पोस्ट बिन सुरु गर्ने')} /></label>
              <label><span style={labelS}>{tt('Description / instructions', 'विवरण / निर्देशन')}</span><textarea style={{ ...inputS, minHeight: 70, resize: 'vertical' }} value={form.desc || ''} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>{tt('Every student in your class will receive this task.', 'तपाईंको कक्षाका सबै विद्यार्थीले यो कार्य पाउनेछन्।')}</div>
            </>)}
            {msg && <div style={{ color: '#c0392b', fontWeight: 700, fontSize: '.85rem' }}>{msg}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn ghost" onClick={close}>{tt('Cancel', 'रद्द')}</button>
              <button className="btn" onClick={save}>{tt('Save', 'सुरक्षित')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../data/auth.jsx';
import { sfx } from '../game/sfx.js';
import * as db from '../data/db.js';
import GreenGuidelines from './GreenGuidelines.jsx';
import GreenSchool from './GreenSchool.jsx';

const inputS = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '2px solid var(--border)', fontWeight: 700, color: 'var(--ink)', background: 'var(--surface)', fontSize: '.92rem' };
const labelS = { fontWeight: 800, color: 'var(--ink)', fontSize: '.82rem', display: 'block', marginBottom: 5 };

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

export default function AdminDashboard() {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const { user, logout } = useAuth();
  const [section, setSection] = useState('students');
  const [, force] = useState(0); const refresh = () => force((n) => n + 1);
  const [modal, setModal] = useState(null); // {type, mode, data}
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  const classes = db.getClasses();
  const teachers = db.getTeachers();
  const students = db.getStudents();
  const className = (id) => { const c = db.getClass(id); return c ? (c.name + (c.section ? ` ${c.section}` : '')) : tt('— no class —', '— कक्षा छैन —'); };

  const openAdd = (type) => { setForm(type === 'task' ? { classId: classes[0]?.id || '' } : type === 'class' ? {} : { classId: classes[0]?.id || '' }); setModal({ type, mode: 'add' }); setMsg(''); };
  const openEdit = (type, data) => { setForm({ ...data, password: type === 'class' || type === 'task' ? undefined : '' }); setModal({ type, mode: 'edit', data }); setMsg(''); };
  const close = () => { setModal(null); setMsg(''); };

  const save = () => {
    const { type, mode, data } = modal;
    let r;
    if (type === 'class') r = mode === 'add' ? db.createClass(form) : db.updateClass(data.id, { name: form.name, grade: form.grade, section: form.section });
    else if (type === 'task') r = mode === 'add' ? db.createTask(form) : db.updateTask(data.id, { title: form.title, desc: form.desc, classId: form.classId });
    else { // teacher / student
      const patch = { role: type, name: form.name, username: form.username, classId: form.classId || null };
      if (mode === 'add') r = db.createUser({ ...patch, password: form.password });
      else { if (form.password) patch.password = form.password; r = db.updateUser(data.id, patch); }
    }
    if (r && r.error) {
      setMsg(r.error === 'username_taken' ? tt('That username is already taken.', 'त्यो प्रयोगकर्ता नाम पहिले नै छ।') : r.error === 'username_required' ? tt('Username is required.', 'प्रयोगकर्ता नाम चाहिन्छ।') : tt('Could not save.', 'सुरक्षित गर्न सकिएन।'));
      sfx.wrong(); return;
    }
    sfx.correct(); close(); refresh();
  };

  const del = (type, item) => {
    const label = item.name || item.title;
    if (!window.confirm(tt(`Delete “${label}”? This cannot be undone.`, `“${label}” हटाउने? यो फिर्ता गर्न मिल्दैन।`))) return;
    if (type === 'class') db.deleteClass(item.id);
    else if (type === 'task') db.deleteTask(item.id);
    else db.deleteUser(item.id);
    sfx.pop(); refresh();
  };

  const Tab = ({ id, icon, en, ne, n }) => (
    <button onClick={() => { setSection(id); sfx.tab(); }} data-sfx-silent
      style={{ border: 'none', borderRadius: 11, padding: '9px 15px', fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
        background: section === id ? 'var(--primary)' : 'transparent', color: section === id ? '#fff' : 'var(--ink)' }}>
      <Icon name={icon} size={17} /> {tt(en, ne)} <span style={{ opacity: .7, fontWeight: 700 }}>{n}</span>
    </button>
  );

  const Row = ({ children, onEdit, onDelete }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button className="btn ghost" style={{ padding: '7px 11px' }} onClick={onEdit}><Icon name="refresh" size={15} /> {tt('Edit', 'सम्पादन')}</button>
      <button onClick={onDelete} data-sfx-silent style={{ border: '2px solid #e7b4b4', background: '#fff', color: '#c0392b', borderRadius: 10, padding: '7px 11px', fontWeight: 800, cursor: 'pointer', fontSize: '.84rem' }}>{tt('Delete', 'हटाउनुहोस्')}</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg,#f3f7ee)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px', background: 'var(--surface)', borderBottom: '2px solid var(--border-soft,#e3ebe0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="shield" size={21} /></div>
          <div><b style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>{tt('Admin Dashboard', 'एडमिन ड्यासबोर्ड')}</b><div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>हरित पाठशाला · {user?.name}</div></div>
        </div>
        <button className="btn ghost" onClick={() => { sfx.click(); logout(); }}><Icon name="lock" size={16} /> {tt('Log out', 'लग आउट')}</button>
      </header>

      <div className="page" style={{ maxWidth: 920 }}>
        <div style={{ display: 'inline-flex', gap: 6, background: 'var(--surface-soft)', padding: 5, borderRadius: 14, border: '1.5px solid var(--border-soft,#e3ebe0)', marginBottom: 16, flexWrap: 'wrap' }}>
          <Tab id="students" icon="users" en="Students" ne="विद्यार्थी" n={students.length} />
          <Tab id="teachers" icon="book" en="Teachers" ne="शिक्षक" n={teachers.length} />
          <Tab id="classes" icon="school" en="Classes" ne="कक्षा" n={classes.length} />
          <Tab id="tasks" icon="target" en="Class Tasks" ne="कक्षा कार्य" n={db.getTasks().length} />
          <Tab id="green" icon="sprout" en="Green School" ne="हरित विद्यालय" n="" />
        </div>

        {section === 'green' && (<>
          <GreenGuidelines />
          <GreenSchool />
        </>)}

        {section !== 'green' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn" onClick={() => openAdd(section === 'tasks' ? 'task' : section === 'classes' ? 'class' : section === 'teachers' ? 'teacher' : 'student')}>
            <Icon name="sprout" size={16} /> {tt('Add new', 'नयाँ थप्नुहोस्')}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {section === 'students' && students.map((s) => (
            <Row key={s.id} onEdit={() => openEdit('student', s)} onDelete={() => del('student', s)}>
              <b style={{ color: 'var(--ink)' }}>{s.name}</b>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem' }}>@{s.username} · {className(s.classId)}</div>
            </Row>
          ))}
          {section === 'students' && !students.length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No students yet. Add one to get started.', 'अहिलेसम्म विद्यार्थी छैन।')}</p>}

          {section === 'teachers' && teachers.map((tch) => (
            <Row key={tch.id} onEdit={() => openEdit('teacher', tch)} onDelete={() => del('teacher', tch)}>
              <b style={{ color: 'var(--ink)' }}>{tch.name}</b>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem' }}>@{tch.username} · {tt('Class', 'कक्षा')}: {className(tch.classId)}</div>
            </Row>
          ))}
          {section === 'teachers' && !teachers.length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No teachers yet.', 'अहिलेसम्म शिक्षक छैन।')}</p>}

          {section === 'classes' && classes.map((c) => (
            <Row key={c.id} onEdit={() => openEdit('class', c)} onDelete={() => del('class', c)}>
              <b style={{ color: 'var(--ink)' }}>{c.name}</b>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem' }}>{tt('Grade', 'कक्षा')} {c.grade || '—'}{c.section ? ` · ${tt('Section', 'सेक्सन')} ${c.section}` : ''} · {db.getStudents(c.id).length} {tt('students', 'विद्यार्थी')}</div>
            </Row>
          ))}
          {section === 'classes' && !classes.length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No classes yet.', 'अहिलेसम्म कक्षा छैन।')}</p>}

          {section === 'tasks' && db.getTasks().map((t) => (
            <Row key={t.id} onEdit={() => openEdit('task', t)} onDelete={() => del('task', t)}>
              <b style={{ color: 'var(--ink)' }}>{t.title}</b>
              <div className="muted" style={{ fontWeight: 700, fontSize: '.84rem' }}>{className(t.classId)} · {Object.keys(t.doneBy || {}).length} {tt('done', 'पूरा')}</div>
              {t.desc && <div style={{ fontSize: '.85rem', color: 'var(--ink)', marginTop: 3 }}>{t.desc}</div>}
            </Row>
          ))}
          {section === 'tasks' && !db.getTasks().length && <p className="muted" style={{ fontWeight: 700 }}>{tt('No class tasks yet. Assign a green-school action to a class.', 'अहिलेसम्म कक्षा कार्य छैन।')}</p>}
        </div>
        </>)}
      </div>

      {modal && (
        <Modal title={(modal.mode === 'add' ? tt('Add ', 'थप्नुहोस् ') : tt('Edit ', 'सम्पादन ')) + tt({ class: 'class', task: 'task', teacher: 'teacher', student: 'student' }[modal.type], { class: 'कक्षा', task: 'कार्य', teacher: 'शिक्षक', student: 'विद्यार्थी' }[modal.type])} onClose={close}>
          <div style={{ display: 'grid', gap: 12 }}>
            {modal.type === 'class' && (<>
              <label><span style={labelS}>{tt('Class name', 'कक्षाको नाम')}</span><input style={inputS} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tt('e.g. Grade 6', 'जस्तै कक्षा ६')} /></label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1 }}><span style={labelS}>{tt('Grade', 'कक्षा/श्रेणी')}</span><input style={inputS} value={form.grade || ''} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="6" /></label>
                <label style={{ flex: 1 }}><span style={labelS}>{tt('Section', 'सेक्सन')}</span><input style={inputS} value={form.section || ''} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" /></label>
              </div>
            </>)}

            {(modal.type === 'teacher' || modal.type === 'student') && (<>
              <label><span style={labelS}>{tt('Full name', 'पूरा नाम')}</span><input style={inputS} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span style={labelS}>{tt('Username', 'प्रयोगकर्ता नाम')}</span><input style={inputS} value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
              <label><span style={labelS}>{modal.mode === 'edit' ? tt('New password (leave blank to keep)', 'नयाँ पासवर्ड (खाली राख्न सकिन्छ)') : tt('Password', 'पासवर्ड')}</span><input style={inputS} value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <label><span style={labelS}>{tt('Class', 'कक्षा')}</span>
                <select style={inputS} value={form.classId || ''} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                  <option value="">{tt('— no class —', '— कक्षा छैन —')}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
            </>)}

            {modal.type === 'task' && (<>
              <label><span style={labelS}>{tt('Task title', 'कार्यको शीर्षक')}</span><input style={inputS} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label><span style={labelS}>{tt('Description', 'विवरण')}</span><textarea style={{ ...inputS, minHeight: 70, resize: 'vertical' }} value={form.desc || ''} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
              <label><span style={labelS}>{tt('For class', 'कुन कक्षाका लागि')}</span>
                <select style={inputS} value={form.classId || ''} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
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

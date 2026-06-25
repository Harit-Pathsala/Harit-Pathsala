// data/db.js — local-first "database" for the school system.
// Everything lives in localStorage so the app runs fully offline on a school PC
// with no server. When this is later wrapped as a desktop app, only this module
// needs to swap localStorage for SQLite/a file — the rest of the app is unchanged.

const NS = 'harit.';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function read(table, fallback) {
  try { const v = JSON.parse(localStorage.getItem(NS + table)); return v == null ? fallback : v; }
  catch (_) { return fallback; }
}
function write(table, value) {
  try { localStorage.setItem(NS + table, JSON.stringify(value)); } catch (_) { /* quota / private mode */ }
}

/* ── seed: first run creates an admin + a demo class/teacher/students so the
   dashboards are immediately usable and testable ──────────────────────────── */
export function seedIfEmpty() {
  let users = read('users', null);
  if (users && users.length) return;
  const classId = uid();
  const classes = [{ id: classId, name: 'Grade 6 A', grade: '6', createdAt: Date.now() }];
  users = [
    { id: uid(), role: 'admin', username: 'admin', password: 'admin123', name: 'Administrator', classId: null, createdAt: Date.now() },
    { id: uid(), role: 'teacher', username: 'teacher', password: 'teacher123', name: 'Mina Sharma', classId, createdAt: Date.now() },
    { id: uid(), role: 'student', username: 'bishesh', password: 'student123', name: 'Bishesh Thapa', classId, createdAt: Date.now() },
    { id: uid(), role: 'student', username: 'anita', password: 'student123', name: 'Anita Gurung', classId, createdAt: Date.now() },
  ];
  write('classes', classes);
  write('users', users);
  write('tasks', [
    { id: uid(), classId, title: 'School clean-up campaign', desc: 'Whole class collects and segregates litter on the grounds.', createdAt: Date.now(), doneBy: {} },
    { id: uid(), classId, title: 'Plant 5 trees in the school garden', desc: 'Each group plants and labels a native sapling.', createdAt: Date.now(), doneBy: {} },
  ]);
}

/* ── users ─────────────────────────────────────────────────────────────── */
export const getUsers = () => read('users', []);
export const getUser = (id) => getUsers().find((u) => u.id === id) || null;
export const getStudents = (classId) => getUsers().filter((u) => u.role === 'student' && (!classId || u.classId === classId));
export const getTeachers = () => getUsers().filter((u) => u.role === 'teacher');
export const findByUsername = (username) => getUsers().find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase()) || null;

export function createUser({ role, username, password, name, classId }) {
  const users = getUsers();
  const uname = String(username || '').trim();
  if (!uname) return { error: 'username_required' };
  if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) return { error: 'username_taken' };
  const u = { id: uid(), role, username: uname, password: String(password || ''), name: String(name || uname).trim(), classId: classId || null, createdAt: Date.now() };
  users.push(u); write('users', users); return { user: u };
}
export function updateUser(id, patch) {
  const users = getUsers(); const i = users.findIndex((u) => u.id === id); if (i < 0) return { error: 'not_found' };
  if (patch.username) {
    const uname = String(patch.username).trim();
    if (users.some((u) => u.id !== id && u.username.toLowerCase() === uname.toLowerCase())) return { error: 'username_taken' };
    patch = { ...patch, username: uname };
  }
  users[i] = { ...users[i], ...patch }; write('users', users); return { user: users[i] };
}
export function deleteUser(id) {
  write('users', getUsers().filter((u) => u.id !== id));
  try { localStorage.removeItem(NS + 'carbon.' + id); } catch (_) { /* */ }
}

/* ── classes ───────────────────────────────────────────────────────────── */
export const getClasses = () => read('classes', []);
export const getClass = (id) => getClasses().find((c) => c.id === id) || null;
export function createClass({ name, grade, section }) {
  const classes = getClasses();
  const c = { id: uid(), name: String(name || '').trim() || 'New Class', grade: String(grade || '').trim(), section: String(section || '').trim(), createdAt: Date.now() };
  classes.push(c); write('classes', classes); return { cls: c };
}
export function updateClass(id, patch) {
  const classes = getClasses(); const i = classes.findIndex((c) => c.id === id); if (i < 0) return { error: 'not_found' };
  classes[i] = { ...classes[i], ...patch }; write('classes', classes); return { cls: classes[i] };
}
export function deleteClass(id) {
  write('classes', getClasses().filter((c) => c.id !== id));
  // unassign members and remove that class's tasks
  write('users', getUsers().map((u) => (u.classId === id ? { ...u, classId: null } : u)));
  write('tasks', getTasks().filter((t) => t.classId !== id));
}

/* ── class tasks (green-school actions the admin assigns per class) ──────── */
export const getTasks = () => read('tasks', []);
export const getClassTasks = (classId) => getTasks().filter((t) => t.classId === classId);
export function createTask({ classId, title, desc }) {
  const tasks = getTasks();
  const t = { id: uid(), classId, title: String(title || '').trim() || 'New task', desc: String(desc || '').trim(), createdAt: Date.now(), doneBy: {} };
  tasks.push(t); write('tasks', tasks); return { task: t };
}
export function updateTask(id, patch) {
  const tasks = getTasks(); const i = tasks.findIndex((t) => t.id === id); if (i < 0) return { error: 'not_found' };
  tasks[i] = { ...tasks[i], ...patch }; write('tasks', tasks); return { task: tasks[i] };
}
export function deleteTask(id) { write('tasks', getTasks().filter((t) => t.id !== id)); }
export function setTaskDone(taskId, studentId, done) {
  const tasks = getTasks(); const i = tasks.findIndex((t) => t.id === taskId); if (i < 0) return;
  const doneBy = { ...(tasks[i].doneBy || {}) };
  if (done) doneBy[studentId] = Date.now(); else delete doneBy[studentId];
  tasks[i] = { ...tasks[i], doneBy }; write('tasks', tasks);
}

/* ── per-student carbon history (each calculator result is saved here) ───── */
export const getCarbon = (userId) => read('carbon.' + userId, []);
export function addCarbon(userId, record) {
  if (!userId) return;
  const list = getCarbon(userId);
  list.push({ ts: Date.now(), ...record });
  write('carbon.' + userId, list.slice(-50)); // keep the most recent 50
}
export function clearCarbon(userId) { try { localStorage.removeItem(NS + 'carbon.' + userId); } catch (_) { /* */ } }

// average of every student's most-recent footprint — used for the result comparison
export function getSchoolAverage() {
  const students = getStudents();
  const latest = [];
  for (const s of students) { const h = getCarbon(s.id); if (h.length) latest.push(h[h.length - 1]); }
  if (!latest.length) return null;
  const avg = (k) => latest.reduce((a, r) => a + (r[k] || 0), 0) / latest.length;
  return { count: latest.length, daily: +avg('daily').toFixed(2), yearly: Math.round(avg('yearly')), ecoScore: Math.round(avg('ecoScore')) };
}

/* ── session ───────────────────────────────────────────────────────────── */
export const getSession = () => read('session', null);
export const setSession = (userId) => write('session', userId ? { userId } : null);

export const ADMIN_HINT = { username: 'admin', password: 'admin123' };

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { seedIfEmpty, findByUsername, getUser, getSession, setSession } from './db.js';
import { setSaveUser } from '../game/save.ts';
import { useGameStore } from '../state/gameStore.ts';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const hydrate = useGameStore((s) => s.hydrate);

  // restore an existing session on load
  useEffect(() => {
    seedIfEmpty();
    const s = getSession();
    const u = s ? getUser(s.userId) : null;
    if (u) { setSaveUser(u.role === 'student' ? u.id : null); setUser(u); }
    setReady(true);
  }, []);

  // whenever the logged-in student changes, load that student's game slot
  useEffect(() => {
    if (user && user.role === 'student') { setSaveUser(user.id); hydrate(); }
  }, [user, hydrate]);

  const login = useCallback((username, password) => {
    const u = findByUsername(username);
    if (!u) return { error: 'no_user' };
    if (String(u.password) !== String(password)) return { error: 'bad_password' };
    setSaveUser(u.role === 'student' ? u.id : null);
    setSession(u.id);
    setUser(u);
    return { user: u };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setSaveUser(null);
    setUser(null);
  }, []);

  // refresh the in-memory user object after an admin edits their own record, etc.
  const refreshUser = useCallback(() => { if (user) { const u = getUser(user.id); if (u) setUser(u); } }, [user]);

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

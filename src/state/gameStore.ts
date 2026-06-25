// gameStore.ts — global game state (Zustand). Holds progression and the
// persistent "green valley", and mirrors every change to IndexedDB.
// Organised in clear slices (progression / valley / meta); these can be split
// into separate slice creators as the store grows.
import { create } from 'zustand';
import { loadSave, persistSave, emptySave, type SaveState, type ValleyState, type TodoItem } from '../game/save';

interface GameState extends SaveState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  // progression slice
  recordResult: (levelId: number, scorePercent: number, passed: boolean) => void;
  // valley slice
  addRestoration: (trees: number, co2: number) => void;
  resetValley: () => void;
  // Bana to-do slice
  addTodos: (items: { text: string; tag?: string }[]) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearTodos: () => void;
  // eco-world slice
  addEcoPoints: (n: number) => void;
  plantTree: (cost: number) => boolean;   // returns false if not enough points
  setTreeGoal: (n: number) => void;
  buildEco: (kind: 'bins' | 'treatment' | 'solar' | 'transit', cost: number) => boolean;
  fixProblem: (id: string, cost: number) => boolean;   // spend ecopoints to fix a world problem
  // world-healing journey slice
  pendingHeal: { from: number; to: number; key: string } | null;
  completeLevel: (key: string) => boolean;   // mark a level done -> heals the world one step (idempotent)
  clearPendingHeal: () => void;
}

export const TOTAL_LEVELS = 18;   // missions + explorers that make up the journey

const todayISO = () => new Date().toISOString().slice(0, 10);
const yesterdayISO = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

function snapshot(s: GameState): SaveState {
  return {
    version: 1,
    levelsPassed: s.levelsPassed,
    bestScore: s.bestScore,
    valley: s.valley,
    todos: s.todos,
    ecoPoints: s.ecoPoints,
    treeGoal: s.treeGoal,
    ecoBuild: s.ecoBuild,
    ecoFixed: s.ecoFixed,
    done: s.done,
    streakDays: s.streakDays,
    lastPlayed: s.lastPlayed,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...emptySave(),
  hydrated: false,
  pendingHeal: null,

  hydrate: async () => {
    const saved = await loadSave();
    const today = todayISO();
    let streak = saved.streakDays;
    if (saved.lastPlayed !== today) {
      streak = saved.lastPlayed === yesterdayISO() ? saved.streakDays + 1 : 1;
    }
    set({ ...saved, streakDays: streak, lastPlayed: today, hydrated: true });
    persistSave(snapshot(get()));
  },

  recordResult: (levelId, scorePercent, passed) => {
    set((s) => {
      const levelsPassed = passed && !s.levelsPassed.includes(levelId)
        ? [...s.levelsPassed, levelId]
        : s.levelsPassed;
      const bestScore = { ...s.bestScore, [levelId]: Math.max(s.bestScore[levelId] || 0, scorePercent) };
      return { levelsPassed, bestScore };
    });
    persistSave(snapshot(get()));
  },

  completeLevel: (key) => {
    const wasDone = !!get().done[key];
    if (!wasDone) set((s) => ({ done: { ...s.done, [key]: true } }));
    const after = Object.keys(get().done).length;
    // ALWAYS play the "world recovering" animation on a win (even on replay),
    // while the permanent progress (done count) stays idempotent.
    const to = Math.min(1, after / TOTAL_LEVELS);
    const from = Math.max(0, (after - 1) / TOTAL_LEVELS);
    set({ pendingHeal: { from, to, key } });
    if (!wasDone) persistSave(snapshot(get()));
    return !wasDone;
  },

  clearPendingHeal: () => set({ pendingHeal: null }),

  addRestoration: (trees, co2) => {
    set((s): Partial<GameState> => {
      const valley: ValleyState = {
        trees: s.valley.trees + trees,
        co2Saved: +(s.valley.co2Saved + Math.max(0, co2)).toFixed(2),
        clarity: Math.min(1, s.valley.clarity + 0.03 * trees + 0.01),
      };
      return { valley };
    });
    persistSave(snapshot(get()));
  },

  resetValley: () => {
    set({ ...emptySave(), hydrated: true });
    persistSave(emptySave());
  },

  addTodos: (items) => {
    set((s): Partial<GameState> => {
      const existing = new Set(s.todos.map((t) => t.text.trim().toLowerCase()));
      const fresh: TodoItem[] = items
        .filter((it) => it.text && it.text.trim() && !existing.has(it.text.trim().toLowerCase()))
        .map((it, i) => ({ id: `t${Date.now()}_${i}`, text: it.text.trim(), done: false, ts: Date.now(), tag: it.tag }));
      return { todos: [...s.todos, ...fresh] };
    });
    persistSave(snapshot(get()));
  },
  toggleTodo: (id) => {
    set((s): Partial<GameState> => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
    persistSave(snapshot(get()));
  },
  removeTodo: (id) => {
    set((s): Partial<GameState> => ({ todos: s.todos.filter((t) => t.id !== id) }));
    persistSave(snapshot(get()));
  },
  clearTodos: () => {
    set((): Partial<GameState> => ({ todos: [] }));
    persistSave(snapshot(get()));
  },

  addEcoPoints: (n) => {
    set((s): Partial<GameState> => ({ ecoPoints: Math.max(0, s.ecoPoints + Math.round(n)) }));
    persistSave(snapshot(get()));
  },
  plantTree: (cost) => {
    const s = get();
    if (s.ecoPoints < cost) return false;
    set((st): Partial<GameState> => ({
      ecoPoints: st.ecoPoints - cost,
      valley: {
        trees: st.valley.trees + 1,
        co2Saved: +(st.valley.co2Saved + 21).toFixed(2),  // ~21 kg CO2/yr per young tree
        clarity: Math.min(1, st.valley.clarity + 0.02),
      },
    }));
    persistSave(snapshot(get()));
    return true;
  },
  setTreeGoal: (n) => {
    set((): Partial<GameState> => ({ treeGoal: Math.max(1, Math.round(n)) }));
    persistSave(snapshot(get()));
  },
  buildEco: (kind, cost) => {
    const s = get();
    if (s.ecoPoints < cost) return false;
    const eb = s.ecoBuild || { bins: 0, treatment: 0, solar: 0, transit: 0 };
    set((st): Partial<GameState> => ({
      ecoPoints: st.ecoPoints - cost,
      ecoBuild: { ...eb, [kind]: (eb[kind] || 0) + 1 },
      valley: { ...st.valley, co2Saved: +(st.valley.co2Saved + 12).toFixed(2), clarity: Math.min(1, st.valley.clarity + 0.05) },
    }));
    persistSave(snapshot(get()));
    return true;
  },
  fixProblem: (id, cost) => {
    const s = get();
    const fixed = s.ecoFixed || {};
    if (s.ecoPoints < cost || fixed[id]) return false;
    set((st): Partial<GameState> => ({
      ecoPoints: st.ecoPoints - cost,
      ecoFixed: { ...(st.ecoFixed || {}), [id]: true },
      valley: { ...st.valley, co2Saved: +(st.valley.co2Saved + 21).toFixed(2), clarity: Math.min(1, st.valley.clarity + 0.16) },
    }));
    persistSave(snapshot(get()));
    return true;
  },
}));

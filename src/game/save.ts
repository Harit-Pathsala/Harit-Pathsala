// save.ts — persistent save via IndexedDB (localForage). Stores the player's
// progression and their growing "green valley". Gradual-TS module.
import localforage from 'localforage';

export interface ValleyState {
  trees: number;
  co2Saved: number; // kg CO2e cumulatively avoided
  clarity: number;  // 0..1 how clear/healed the valley looks
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  ts: number;       // created timestamp
  tag?: string;     // focus area, e.g. transport / cooking
}

export interface EcoBuild {
  bins: number;       // dustbins placed → clears litter
  treatment: number;  // water-treatment plant → cleans the river
  solar: number;      // clean-energy → clears smog
  transit: number;    // clean buses/EVs → clears smog
}

export interface SaveState {
  version: number;
  levelsPassed: number[];
  bestScore: Record<number, number>; // levelId -> best %
  valley: ValleyState;
  todos: TodoItem[];                  // Bana's saved eco to-do checklist
  ecoPoints: number;                  // earned from missions, spent planting trees
  treeGoal: number;                   // trees to plant to cancel the footprint (from quiz)
  ecoBuild: EcoBuild;                 // (legacy) eco-world cleanup counts
  ecoFixed: Record<string, boolean>;  // which world pollution problems are fixed
  streakDays: number;
  lastPlayed: string | null; // YYYY-MM-DD
}

const KEY = 'harit_valley_v1';
const db = localforage.createInstance({ name: 'harit-pathsala', storeName: 'save' });

export const emptySave = (): SaveState => ({
  version: 1,
  levelsPassed: [],
  bestScore: {},
  valley: { trees: 0, co2Saved: 0, clarity: 0 },
  todos: [],
  ecoPoints: 0,
  treeGoal: 20,
  ecoBuild: { bins: 0, treatment: 0, solar: 0, transit: 0 },
  ecoFixed: {},
  streakDays: 0,
  lastPlayed: null,
});

export async function loadSave(): Promise<SaveState> {
  try {
    const s = await db.getItem<SaveState>(KEY);
    // merge so saves written before a field existed still load cleanly
    return s && s.version === 1 ? { ...emptySave(), ...s } : emptySave();
  } catch {
    return emptySave();
  }
}

export async function persistSave(s: SaveState): Promise<void> {
  try {
    await db.setItem(KEY, s);
  } catch {
    /* storage may be unavailable (private mode / quota) — fail silently */
  }
}

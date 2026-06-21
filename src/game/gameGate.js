import { createContext, useContext, useRef, useEffect } from 'react';

// Lets the GameShell tell a mounted game whether it is "active" yet. While Bana's
// intro is on screen the game stays mounted (so the environment is visible) but
// frozen — timers and motion only run once the player dismisses the intro.
export const GameGate = createContext({ active: true });

export function useGameActiveRef() {
  const { active } = useContext(GameGate);
  const ref = useRef(active);
  useEffect(() => { ref.current = active; }, [active]);
  return ref;
}

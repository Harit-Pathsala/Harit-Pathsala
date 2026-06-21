# Explorer Game Logic — Harit Pathsala

The Explorer is a 2.5-D isometric journey through **five Nepali landscapes**.
The player walks a student avatar into glowing decision rings; each choice
either heals or harms the world, and the scene reacts in real time.

---

## 1. The five worlds

| Lv | World | Theme | Real-world lesson |
|---|---|---|---|
| 1 | Baglung Village | mid-hill firewood & forest | biogas vs firewood, walking, composting |
| 2 | Chitwan Farmland | Terai rice fields | paddy methane (AWD), compost, no stubble burning, solar pumps |
| 3 | Kathmandu City | dense, smoggy | bus vs car, dal bhat, switch-off culture, rooftop solar |
| 4 | Kali Gandaki Valley | river/construction | hydro vs coal, riverbank trees, debris management |
| 5 | Himalayan Trail | ice & fragile forest | solar light, refill stations, GLOF safety, anti-logging |

Each level holds **5–6 decision events**. Every event has a "green" choice and a
"grey" choice, an explanation, and a world **effect**.

---

## 2. Rendering (Three.js)

- **Camera:** `OrthographicCamera` at (20, 20, 20) looking at origin — classic
  isometric. Frustum size `F = 18`, recomputed on resize to keep aspect correct.
- **Materials:** `MeshToonMaterial` only, for a flat storybook look. Geometry is
  all primitives (Box, Cylinder, Cone, Sphere, Torus) — no external models, so
  the whole app stays a single file with no asset downloads.
- **Avatar:** box body + sphere head + box "school bag", bobbing via
  `sin(t)` for a lively idle.
- **Decoration:** ~26 randomly scattered trees (avoiding the centre), plus a
  river strip used by water-themed events.
- **Event markers:** a glowing cylinder "pylon" + a spinning `TorusGeometry`
  ring placed evenly on a circle of radius 7.

## 3. Movement & input

WASD / arrow keys map to **isometric diagonals** (screen-up = world −x−z, etc.)
so movement feels natural on the tilted grid. On touch devices an on-screen
D-pad appears (`'ontouchstart' in window`). The camera **lerps** to follow the
player each frame (`camera.position.lerp(target, 0.08)`).

## 4. Triggering an event

Inside the render loop, when the avatar comes within `1.4` units of an unspent
marker, the loop **pauses** itself and raises the event into React state. React
shows Bana's prompt and the choices. This is the key bridge between the
imperative Three.js loop and declarative React UI — done through a small mutable
`api.current` object plus a `paused` flag.

## 5. Choosing — world reacts

`choose(i)` records the decision, updates the running CO₂ tally, and calls
`api.current.applyEffect(effect)`:

| effect | what happens on screen |
|---|---|
| `smog_on` | scene gains brown `FogExp2` haze |
| `sky_hazy` | sky tint turns dusty |
| `sky_clear` | sky & fog reset to the level's clean colour |
| `add_tree` | a new tree pops into the world |
| `leaves_grow` | ground lerps greener |
| `leaves_wither` | ground lerps toward barren brown |
| `river_clean` / `river_dirty` | river strip turns blue / muddy |

The marker is then "consumed" (turns green, stops triggering), a consequence
card explains the science, and on dismiss the game resumes — or, if all events
are done, shows the level summary.

## 6. Scoring & progression

```
completeLevel(decisions):
  correct     = count(isCorrect)
  scorePercent= round(correct / total × 100)
  passed      = scorePercent ≥ 60      # 60% threshold
  co2Delta    = Σ (isCorrect ? −co2Impact : +co2Impact)
  unlockNext  = passed
```

Passing (**≥ 60%**) unlocks the next world (`maxUnlocked`). The level pills show
locked / active / completed states. Replaying the **same** level forces a
full scene rebuild via an incrementing `runId` in the effect dependencies, so
consumed markers reset correctly.

## 7. Cleanup

Every scene tears down on unmount/level-change: `cancelAnimationFrame`,
`ResizeObserver.disconnect`, key-listener removal, `renderer.dispose()`,
`scene.clear()`, and DOM canvas removal — no leaks when switching tabs or levels.

## 8. Why these design choices

- **Primitives + toon shading** → tiny file, fast on a school laptop, charming.
- **Orthographic iso** → readable layout, no perspective distortion, very
  "mobile game" feel for Grade 6–10.
- **Pause-on-proximity** → players never miss an event, and the imperative loop
  and React UI stay cleanly separated.

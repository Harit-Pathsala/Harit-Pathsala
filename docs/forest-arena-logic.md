# Forest Arena Logic — Harit Pathsala

The Forest Arena is a **class-vs-class** game played on a hexagonal map. There is
**no attacking** — classes compete only by *growing* and *claiming* forest. The
healthiest, biggest forest wins. This keeps the competition positive and
on-message for a school climate platform.

---

## 1. The board

A 7×7 hex field using **axial coordinates** `(q, r)` with both ranging −3…3
(49 cells). Four classes start at the corners:

| Class | Home (q,r) | Colour |
|---|---|---|
| Class 8A (the player) | (−2, −2) | `#52b788` |
| Class 8B | (2, −2) | `#95d5b2` |
| Class 9A | (−2, 2) | `#74c69d` |
| Class 9B | (2, 2) | `#40916c` |

Each cell stores `{ q, r, owner, trees }`. Home cells start with 8 trees; neutral
cells with 4.

### Hex → world coordinates

```
hexToWorld(q, r) = { x: 1.8·q,  z: 1.8·(r + q/2) }
```

This is the standard axial→pixel mapping (with a 1.8-unit hex size), giving the
offset-row look of a flat-top hex grid. Adjacency uses the six axial directions:

```
HEX_DIRS = [ (1,0), (1,−1), (0,−1), (−1,0), (−1,1), (0,1) ]
```

---

## 2. Rendering (Three.js)

- **Hex tiles:** one shared `CylinderGeometry(0.85, 0.85, 0.18, 6)` rotated 30°,
  one `MeshToonMaterial` per cell so colour can change independently.
- **Trees:** a single **`InstancedMesh`** (cap **500** instances) for trunks and
  another for canopies — this is what lets hundreds of trees render at 60 fps on
  a modest laptop. Trees are placed in a ring inside each owned cell, and their
  **scale grows with the cell's health** (more trees → taller forest).
- **Particles:** a small `Points` cloud bursts **green & rising** on a correct
  answer, **brown & falling** on a wrong one, fading via material opacity.
- **Camera:** orthographic, isometric framing, resize-aware.

### Forest health states (drives tile colour & tree size)

```
trees ≤ 2  → Degraded  (#8b6914)
trees ≤ 6  → Young      (#95d5b2)
trees ≤ 11 → Healthy    (#52b788)
trees ≤ 16 → Thriving   (#2d6a4f)
trees ≥ 17 → Old Growth (#1b4332, emissive glow)
```

---

## 3. The economy

```
correct answer : +10 points, +2 trees (to all your cells)
wrong answer   : −8 points, −1 tree
claim a patch  : −50 points, gain an adjacent neutral cell (starts at 6 trees)
trees clamp to [0, 20] per cell
```

If a class's points go **negative**, it loses its weakest non-home cell (which
returns to neutral) and points reset to 0 — a gentle penalty that can never wipe
out a class's home base.

## 4. Turn flow

1. A random question from the **30-question bank** is shown to the player
   (always answering for Class 8A).
2. `answer(i)` scores the player, then **each rival class auto-answers** with a
   70% correct chance, so the leaderboard moves even in single-player.
3. A particle burst + feedback card (with the explanation) appears.
4. "Next question" advances; "Claim patch" spends 50 points to expand.

## 5. Claiming

`claim()` searches the player's owned cells for any **neutral neighbour** (using
`hexNeighbors`) and converts the first one found, seeding it with 6 trees. The
button is disabled until the player has ≥ 50 points, so expansion is a real
strategic choice against growing existing cells.

## 6. Leaderboard

Ranks classes by `points + total trees`. For each class it shows points, total
trees, cells owned, and a **health %** = `trees / (cells × 20)`. The leader is
crowned **"Most Eco Class"**. The board re-renders from React state on every
answer, and the Three.js scene re-syncs via `api.current.render(cells)`.

## 7. The 30 questions

The bank (`ARENA_QUESTIONS`) covers the platform's whole science surface:
emission factors, GHG-Protocol scopes (1/2/3), Nepal-specific facts (NEA 0.12,
44% forest cover, black-carbon glacier melt, GLOF, the red panda), waste,
cooking fuels, transport, water, and best-practice actions. Every question
carries a one-line **"why"** so the arena teaches, not just tests. A unit test
asserts all 30 have a valid answer index.

## 8. Why this design

- **Grow, don't attack** → competition stays kind and reinforces the real-world
  goal (more trees, healthier forests).
- **InstancedMesh** → hundreds of trees with one draw call; smooth on school
  hardware and keeps the single-file build light.
- **Rivals auto-answer** → the game is alive and tense even with one player at
  the front of a classroom.
- **Shared `logic.js`** → identical emission science across calculator, explorer,
  and arena.

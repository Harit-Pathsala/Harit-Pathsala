# City Walk — alive Kathmandu Valley (Stage 1)

A living, mission-oriented exploration scene built on the project's existing
vanilla Three.js setup (no React Three Fiber — keeps it light for school
laptops, matching the hackathon "design for constraints" brief).

## What's new
- `src/game/nepalKit.js` — a **reusable** Nepal component library (pure Three.js).
  Every builder returns a `THREE.Group`; living systems return `update(dt)`.
  - Architecture: `makeNewariHouse`, `makePagodaTemple` (Nyatapola-style tiered
    roofs + tundal struts + golden gajur), `makeStupa` (Boudhanath dome with
    painted all-seeing Buddha eyes on the harmika + 13-step golden spire +
    radiating prayer flags), `makeGumba` (Tibetan monastery: maroon benma
    frieze, golden roof, dharma wheel + deer), `makeHospital`, `makeShop`.
  - Vehicles: `makeMicrobus` (green Sajha), `makeTempo` (Safa three-wheeler),
    `makeMotorbike`, `makeTaxi`.
  - Nature/sky: `makeHimalayas`, `makeSun`, `makeBird` + `makeBirdFlock`
    (pigeons circling the stupa), `makeTree`, `makeCloud`, `makePrayerFlags`.
  - Street life: `makeStreetLamp`, `makePowerPole` (the unmistakable Kathmandu
    tangle of wires), `makeDustbin`.
  - Systems: `makeTraffic(scene, routes)` (vehicles follow road polylines),
    `buildKathmanduValley(scene)` composes the whole dense valley and returns
    `{ update, spots, houses, stupa, pagoda }`.
- `src/components/CityExplorer.jsx` — the playable scene: a walk-animated
  student, drag-to-look third-person camera, day lighting + shadows, and the
  real mission loop driven by `EXPLORER_LEVELS` (Kathmandu, id 3) and
  `completeLevel` from `logic.js`. Walk to a glowing numbered spot → make a
  carbon decision → the **world responds** (sky clears or smogs, trees grow) →
  CO₂ is tracked with the real Nepal emission factors. A simple 2D **Bana
  briefing** card states the challenge per level. Added as a new "City Walk"
  tab (the original Explorer is untouched).

## Why these factors
All CO₂ numbers come straight from `logic.js` `EF` (e.g. Nepal grid 0.12,
firewood 1.747, LPG 2.983, car 0.192, tree 21/yr) — never invented.

## Staging plan
- **Stage 1 (this):** reusable kit + alive Kathmandu + mission loop + Bana tab.
- **Stage 2:** biome variants of the kit for the other four levels (Baglung
  hills, Chitwan Terai, Kali Gandaki canyon, Khumbu Himalaya); merge the alive
  world into the main Explorer for all five levels.
- **Stage 3:** performance pass (InstancedMesh for houses/trees/wires, LOD on
  the Himalaya range), NPC pedestrians, ambient sound (temple bells, market,
  birds), photo mode.

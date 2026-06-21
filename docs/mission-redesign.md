# Harit Pathsala — Behavior-Change Redesign (Quiz → Missions)

## Why this redesign
The current loop is a *quiz in a 3D coat*: walk to a glowing number, read a prompt,
pick A/B/C. The research is clear that this is the **weakest** form of a
behavior-change game. We are pivoting to **mission-based, embodied exploration**.

## What the research says (deep dive)
Evidence synthesized from peer-reviewed work on environmental serious games and
behavior-design theory:

1. **Two mediators turn play into real-world behavior: *psychological ownership*
   and *self-efficacy*.** Games change behavior when the player feels *"this place
   is mine"* and *"my actions visibly change the outcome."* (Nature *Scientific
   Reports* 2025, s41598-025-11297-z.)
2. **Embodied, enactive, first-person action beats abstract choice.** A mixed-methods
   study in India (EnerCities) found players who *took actions in first person* and
   *saw wrong actions produce undesirable effects* actually shifted their mindsets —
   games as "objects-to-think-with." (PMC7829066.)
3. **Theory of Planned Behavior**: intention is driven by *attitude + social norm +
   perceived behavioral control*. Show the green option is **doable**, **normal**,
   and **good**.
4. **Fogg Behavior Model (B = MAP)**: a behavior fires only when *Motivation × Ability
   × Prompt* converge. So: make the green action **low-friction**, motivate with
   **hope/restoration not fear**, and **prompt at the moment of action**. Motivation
   drives = sensation, *anticipation (hope > fear)*, belonging. (behaviormodel.org.)
5. **Self-Determination Theory** (autonomy, competence, relatedness) → intrinsic
   motivation + flow. Autonomy = real choices and multiple routes; Competence = a
   clear, beatable goal with live feedback; Relatedness = your valley, your class,
   sharing. Controlling design (surveillance, heavy extrinsic rewards) *backfires*.
6. Gamification has the **strongest evidence in transport, energy, and waste** —
   exactly the commute / computer-lab / tree-and-waste missions below.
   (Morganti 2017, *Gaming for Earth*; de Salas 2022, *Simulation & Gaming*.)

## The new core loop (every level)
> **A day with a goal.** You *are* a Nepali student. You explore, you *do* things,
> and the world + a live meter react instantly.

- **Live Carbon Meter** (HUD stack) fills as you emit, drains as you save — using the
  real emission factors already in `logic.js` (grid 0.12, firewood 1.747, LPG 2.983,
  car 0.192/km, a tree = 21 kg/yr…). Never invented.
- **Choices made by doing**, not by reading: walk to the bike and ride it; flip the
  lab switch; drop litter in the right bin. The decision *is* the interaction.
- **Immediate consequence**: the meter moves AND the world responds (sky clears or
  hazes, a tree grows or topples, the river runs clear or grey, a device hums or
  goes quiet) — and the consequence **persists** (leave the lights on, the haze stays).
- **A goal + a gentle constraint**: e.g. *"keep today under 1.5 kg CO₂"* or *"plant
  100 trees before dusk."* Beatable, replayable, **never punished** — over budget just
  means *"try tomorrow, here's what to change."*
- **Ownership + relatedness**: your valley persists and grows (already saved to
  IndexedDB), a class leaderboard, and a shareable snapshot of *your* greener valley.

## The five missions (one per biome)
Each is exploration + embodied choices + a live goal — not a quiz.

**L1 · The School Commute — *Carbon Budget Journey* (home → school).**
Leave home; at the gate **choose how you travel**: walk/cycle (0), shared microbus
(low per-km), motorbike, or the family car (0.192 kg/km × ~5 km). You *ride* it
(animated) and the meter ticks — a little for the bus, a jump for the car. En route,
contextual micro-choices tied to objects (idle vs engine-off at the light; local fruit
vs packaged snack). Arrive at school: the sky over your route reflects your total.
**Win:** under 1.5 kg. *(transport domain; embodied; live competence feedback.)*

**L2 · Plant 100 Trees — *EcoPoints vs a Constraint* (Chitwan/Baglung).**
Roam the green biome earning **EcoPoints** by doing high-impact green tasks (pick
litter, switch off an idle pump, choose compost). Points fund saplings; each tree
shows its 21 kg/yr offset. Plant toward **100 trees before dusk** (timer). Trees pop
in, birds return, clarity rises. **Win:** 100 trees within the day. *(ownership +
self-efficacy + a clear progress goal.)*

**L3 · The Computer Lab — *Energy Audit* (Kathmandu school).**
Run the school day on the smallest footprint. In the lab, **switch on only the PCs you
need, turn them off when you leave, lights off in daylight, fan over AC.** Each switch
toggles a visible device state and the meter (grid EF 0.12). Leave a PC on and a haze
grows over the school and the meter keeps climbing; turn it off and it stops. **Win:**
finish the day under the energy budget. *(energy domain; instant cause→effect; the
switch is the action; persistent consequence.)*

**L4 · Waste & the River — *Sort & Compost* (Kali Gandaki).**
Collect scattered waste and **sort it correctly** (organic → compost, recyclables,
landfill); choose **compost vs burning** (burning adds smoke + CO₂). The riverbank runs
clean or grey based on your choices. **Win:** clear the waste before the monsoon
(timer). *(waste domain; visible river state; ownership.)*

**L5 · The Mountain Trail — *Climate Stewardship / Capstone* (Khumbu).**
A trek where camp choices matter: **firewood (1.747) vs LPG (2.983) vs solar** for
cooking; tend a sapling nursery. The glacier/snow and glacial-lake level reflect the
**aggregate** of your habits across all levels — the capstone mirror of who you've
become. *(relatedness to place; long-term consequence; reflection.)*

## Implementation plan (incremental, build-verified each step)
- **Mission engine**: a per-level `mission` data model — `{ type, goal, budget,
  constraints, waypoints, interactables }` — plus a `MissionHUD` (animated carbon
  meter, EcoPoints, goal progress, timer).
- **Interactables**: evolve the current "station" into walk-up objects whose actions
  *do* things (ride a vehicle, toggle a device, plant/sort) instead of opening a quiz.
- **New systems**: transport ride animation along a route; persistent device states
  (lab); EcoPoint economy; timer/constraint + no-punishment retry; win/lose evaluation.
- **Build order**: **L1 commute vertical slice first** (transport choice + ride + live
  meter + sky consequence + budget) → then L3 lab → L2 trees → L4 waste → L5 capstone.

## Fixed in this pass (bugs)
1. Fullscreen button now actually goes **fullscreen** (photo mode is its own 📷 button).
2. Left/right movement **corrected** (strafe sign was inverted).
3. Power-pole wires now **run pole-to-pole along the avenue** (no longer crossing it).
4. Restoration trees spawn **beside the student on open ground** (never inside houses).
5. Wrong choices now **topple a tree** (deforestation) instead of only smoke.
6. **Zebra crossings** added at the crossroads.
7. *Other levels* exist (the level pills switch all five biomes) — but per this redesign
   they will each become a real mission, not a reskinned quiz.

# Harit Pathsala — A Behavior-Change Mission Game (Research-Driven Design)

This document designs the game from research on what actually changes behavior and
what makes games engaging — not from any single example. Sources are cited inline.

---

## Part 1 — What the research actually says

**A. How games change real behavior**
- The two things that mediate *play → real action* are **psychological ownership**
  ("this is mine") and **self-efficacy** ("my actions visibly change the outcome").
  (Nature *Sci. Reports* 2025.)
- **Embodied, first-person action** changes mindsets; abstract multiple-choice does
  not. Players who *act* and *see consequences* shift attitudes. (EnerCities study, PMC7829066.)
- **Fogg B=MAP**: behavior fires only when *Motivation × Ability × Prompt* meet —
  make the green action **easy**, motivate with **hope, not fear**, prompt **at the
  moment of action**. (behaviormodel.org.)
- **Self-Determination Theory**: autonomy + competence + relatedness → intrinsic
  motivation and flow.

**B. The most successful real case — Ant Forest (600M+ users, 400M+ real trees)**
- Loop: **real low-carbon action → "green energy" points → grow a virtual tree →
  a real tree is planted.** (ScienceDirect 2024; WEF 2020.)
- **Real-time feedback** on a dashboard + **very low friction** ("I don't do anything
  extra but I'm helping"). (Wiley TIBR 2025.)
- **Social/collective**: share energy, compare and grow forests together.
- The **"green experience" mechanism** (NBER 2025): *seeing the environment visibly
  improve* increases appreciation and drives **more** green behavior — a virtuous loop.

**C. Gamification depth — points/badges/leaderboards are NOT the game**
- PBL is the "outer shell… decoration." Good designers ask **"how do I want players to
  FEEL?"** first, then choose mechanics. (Yu-kai Chou, *Actionable Gamification*.)
- Six principles of real engagement: **mastery, meaningful choice, calibrated challenge,
  rewarded exploration, identity, real social interdependence.** (UX Magazine.)
- **Narrative-driven missions** + meaningful progression engage learners the most;
  **performance graphs** (compare to *your own* past) build mastery better than
  leaderboards of strangers. (Springer EDR 2026; ScienceDirect 2016.)

**D. Quest/mission craft**
- **Character & personal stakes** beat "save the world": threaten what the hero loves
  and engagement soars — even with simple mechanics. (Game Developer, Open-World LD.)
- **Onboarding = the first cluster of missions**: simple to complete but gripping,
  endearing characters, build empathy fast — this is where players get attached.
- Strong quest types: **timed challenge** (urgency), **investigation** (explore, gather
  clues), **emergent** (objectives from the world reacting to you). (LinkedIn/Meegle.)
- **Guidance/visibility**: even open worlds guide with narrative + visual cues
  ("guiding wind," glowing markers). Clear **goal, variety, surprise, reward, progression.**

---

## Part 2 — Design pillars (how we want the player to FEEL)

1. **"This valley is mine."** — Ownership. A persistent home valley that is *yours*.
2. **"I can see I made a difference."** — Self-efficacy + the *green-experience* loop:
   the world visibly heals (or chokes) from your actions, immediately and cumulatively.
3. **"I did it myself."** — Embodied autonomy: you *do* the action (ride, switch, plant,
   sort) and you have **multiple real routes** to the goal, not one right answer.
4. **"I'm getting better."** — Mastery: beat **your own** best footprint; a personal
   performance graph; new tools unlock as you improve.
5. **"We're in this together."** — A class/community forest you grow together; share a
   snapshot of your valley.
6. **"This matters, and I care about them."** — Higher meaning + a character: **Bana**
   the companion and **your student**, with personal stakes (the haze makes your little
   sister cough; the monsoon threatens your village).

> The anti-pattern we are deleting: walk to a number, read text, pick A/B/C. Every
> decision becomes an **action in the world**, prompted at the moment it matters.

---

## Part 3 — Core structure

- **You** = a Nepali student you name (identity). **Bana** = companion + "guiding wind"
  (gentle guidance, never nagging).
- **The world** = the five biomes, explorable. Missions are visible markers, but green
  **micro-actions work anywhere** (pick up litter, switch off an idle tap) → emergent play.
- **Meta-goal (Epic Meaning)** = bring Nepal's air back / grow your valley across a
  "carbon journey." The valley **persists** (already saved to IndexedDB) and visibly improves.
- **Two live readouts (real `logic.js` emission factors — never invented):**
  - **Carbon meter** — a stack that fills as you emit, drains as you save (grid 0.12,
    car 0.192/km, firewood 1.747, LPG 2.983, a tree = 21 kg/yr…).
  - **EcoPoints** — earned by green actions; fund trees (the Ant Forest loop).
  - **Performance graph** — *your* daily footprint over days (mastery vs your past).
- **No punishment.** Over budget → "try tomorrow — here's the one change that helps most."
- **Progression/gating** — master a mission to unlock a **tool** (bicycle → solar panel →
  compost kit → rainwater tank) and the **next biome**.

---

## Part 4 — The mission set (richer than commute/trees/lab)

Each mission = *Hook (story) · Goal · You DO · Choices · Consequence (world + meter) ·
Constraint · serves which driver.* Mission **types** are varied on purpose (journey,
economy, investigation, restoration, defense, capstone).

**M0 · "Bana Wakes the Valley" — Onboarding (Baglung village).**
*Hook:* Bana shows you the valley as it could be vs the haze creeping in; your sister
coughs. *You:* take three tiny, can't-fail actions (switch off a light, plant one
sapling, pick up litter) and watch the sky brighten instantly. *Serves:* empathy +
self-efficacy + the green-experience "aha." (Onboarding must be simple but gripping.)

**M1 · "The School Commute" — Timed Journey (home → school).**
*Goal:* reach school keeping the morning under **1.5 kg CO₂**. *You:* leave home, and at
the gate **choose and ride** your transport — walk/cycle (0), shared microbus (low/km),
motorbike, family car (0.192/km × ~5 km) — with a ride animation and the meter ticking
live; emergent choices en route (engine off at the light, local fruit vs packaged snack).
*Consequence:* the sky along your route reflects your total. *Type:* journey + timed.

**M2 · "The Energy Leak Hunt" — Investigation (Kathmandu school).**
*Goal:* find and fix the school's wasted energy before the day ends. *You:* **explore**
rooms, spot leaks (PCs left on, lights in daylight, AC with windows open), and **flip
switches**; each fix drains the meter and lifts the haze over the school; a left-on
device keeps emitting. *Type:* investigation/emergent — the world reacts to your search.

**M3 · "Plant 100 Trees" — Economy + Constraint (Chitwan farmland).**
*Goal:* grow your forest to **100 trees before dusk**. *You:* roam earning **EcoPoints**
from high-impact green tasks (compost vs burn, fix an idle pump, shade-grow saplings);
points fund trees that **pop in**, birds return, clarity rises (Ant Forest loop, made
embodied). *Type:* collection economy + timed; ownership + green-experience.

**M4 · "Clean the Kali Gandaki" — Restoration (canyon river).**
*Goal:* restore the riverbank before the monsoon. *You:* collect and **sort** waste
(organic→compost, recycle, landfill), choose **compost over burning**; the river runs
clear or grey with your choices. *Type:* build/restore + timed; visible system feedback.

**M5 · "Camp on the Glacier Trail" — Trade-offs (Khumbu).**
*Goal:* trek and run camp at the lowest footprint. *You:* choose cooking fuel —
**firewood (1.747) vs LPG (2.983) vs solar** — tend a sapling nursery, manage warmth vs
emissions. *Type:* resource trade-offs; introduces scarcity/strategy.

**M6 · "Monsoon Day" — Emergent Defense (any biome).**
*Hook:* a heavy-rain event. *You:* prep the village (rainwater harvest, clear drains,
move the compost) under time pressure; choices made earlier (tree cover, clean drains)
**pay off or punish** now — showing that habits compound. *Type:* emergent/defense.

**M7 · "Our Class Forest" — Collective (meta).**
A shared forest that **everyone's** EcoPoints grow; compare your *own* footprint graph
over time. *Serves:* social interdependence + mastery (vs your past, not strangers).

*(Capstone reflection:* the glacier, the valley clarity, and your performance graph
mirror the player's habits across all missions — "look who you've become.")*

---

## Part 5 — What to build (engine) and in what order

**New systems**
- **Mission engine** — per-level data model: `{ id, type, story, goal, budget,
  constraints (timer/points), waypoints, interactables, win }`.
- **Mission HUD** — animated **carbon meter**, **EcoPoints**, goal/progress, timer, and a
  small **performance graph** of past footprints.
- **Interactables** — evolve the current "station" so walking up triggers an **action**
  (ride / switch / plant / sort), not a quiz; choices are contextual buttons on the object.
- **Transport ride** — student rides bike/bus along a route (animation) with live metering.
- **Device states** — switches/lights/AC that persist and keep emitting until fixed.
- **EcoPoint economy** + tree funding; **tool/biome gating**; **win/lose + no-punishment retry.**
- (Save/valley persistence and the weather/audio systems already exist.)

**Build order (each step build-verified and playable):**
1. **M1 commute vertical slice** — proves the whole engine: transport choice + ride +
   live carbon meter + sky consequence + 1.5 kg goal + retry.
2. **M2 energy-leak investigation** — device states + room exploration.
3. **M3 plant-100-trees** — EcoPoint economy + timer.
4. **M0 onboarding** wrapper + Bana intro + tool/biome gating.
5. **M4 river / M5 trail / M6 monsoon / M7 class forest** — round out variety + capstone.

---

## Appendix — research sources
Nature Sci Reports s41598-025-11297-z · PMC7829066 (EnerCities) · behaviormodel.org
(Fogg) · Ryan & Deci SDT · ScienceDirect S0301479724010247 & WEF 2020 & Wiley TIBR 2025
& NBER w34074 (Ant Forest) · Yu-kai Chou *Actionable Gamification* / Octalysis · UX
Magazine "Beyond Points & Badges" · Springer EDR s11423-026-10591-5 · Game Developer
"Open-World Level Design" · ELVTR / Meegle quest design.

# Harit Pathsala Explorer — Game Design & Architecture Spec
*Sections 1–7 (planning) below; Section 8 (production code) is implemented in the repo — see `src/game/biomes.js` and the new `buildBiome` engine in `src/game/nepalKit.js`. This builds directly on `docs/research-phase-0.md` (full citations live there).*

Target reality (the binding constraints): Nepali **school laptops** (older integrated GPUs, low VRAM), **intermittent power/bandwidth**, **bilingual EN/NE**, students **~12–16**. Stack already in place: **Vite 5 + React 18 + vanilla Three.js 0.160**, with real Nepal emission factors in `logic.js`.

---

## SECTION 1 — Research Summary

### 1.1 Technical domain
| Area | Finding | Source |
|---|---|---|
| Renderer | WebGPU is production-ready since three.js r171 (one-line swap, auto WebGL2 fallback, ~95% coverage), but WebGPU's gains are in compute/high-draw-call scenes; WebGLRenderer is maintenance-mode yet recommended for pure WebGL2 | three.js manual; utsubo; vr.org |
| R3F vs vanilla | R3F adds no render overhead; the binding rule is "mutate in the loop, never setState per-frame" | r3f pitfalls; pmndrs #1288 |
| Draw calls | Target <100; InstancedMesh (same geo) and BatchedMesh (varied geo, shared material, since r156) cut calls 90%+; share materials, merge static, atlas/KTX2/Draco, dispose | utsubo "100 tips"; threejsroadmap; three docs |
| Lighting | Bake lightmaps/AO; minimise dynamic lights & shadow maps on weak GPUs; atmospheric perspective via fog is free | perf guides |
| Weather | Particle precipitation doesn't scale (more intensity = more particles = frame drops); animated-texture rain is constant-cost; frustum-restrict particles; fog cheap | fxguide; A.Gomez |
| Audio | Web Audio = modular node graph + gain layering + PannerNode spatialisation; adaptive audio uses vertical layers + horizontal transitions (crossfade/stinger/silence); autoplay blocked until gesture | web.dev; MDN; gamedeveloper.com |
| Devices | Small bundle, lazy-load, cap pixelRatio, dispose, dynamic quality drop, offline-friendly | perf guides + constraint |

### 1.2 Game-design domain
| Area | Finding | Source |
|---|---|---|
| Exploration loop | BOTW "Triangle Rule" — triangular obstacles occlude what's behind, so movement *reveals* content → curiosity loop; "gravity" funnels via landmarks; only 1–2 attractors on screen | gamedeveloper.com; gmtk; sourcegaming |
| Env storytelling | Journey narrates via architecture/animation/music/pacing, not dialogue; emotion is the organising principle | positioniseverything; gamedeveloper.com |
| Engagement psych | GBL lifts near-term engagement; achievement effects modest & design-dependent; 13–15 band prefers GBL most; **decorative detail raises extraneous cognitive load**; engagement flows affective→cognitive→content; cap sessions ~20–30 min | ResearchGate syntheses; Mayer coherence |
| Restoration | Terra Nil makes healing the reward — juicy, forgiving, reintroduces wildlife, "Appreciate" beat | shacknews; destructoid; sciencefriday |
| Retention | Cozy-game loop = short daily ritual, **no punishment**, ownership/visible growth, seasonal anticipation; avoid dark loops | AC/Stardew analyses; ACM ACNH study |
| Discovery | Discovery→curiosity→discovery; reward density + curiosity gap; intrinsic > extrinsic | BOTW analyses; SDT |

### 1.3 Systems domain
| Area | Finding | Source |
|---|---|---|
| Motivation | SDT: autonomy + competence + relatedness → intrinsic motivation (linked to flow); gamification boosts motivation/autonomy/relatedness but barely moves competence | tuni.fi; Frontiers; Springer meta-analysis |
| Progression | World transformation reads as progress better than a number bar | derivation from Terra Nil/AC |
| UI | Spatial in-world markers are accepted; the real immersion-killer is persistent already-internalised data; best practice = minimal, contextual, world-styled UI; clarity first for learning | wayline; nastyrodent; cognitive-load |

### 1.4 Evidence → direction (the through-line)
Every strand points the same way: **make the world itself carry the teaching and the reward, keep interruptions minimal, never punish, and design for intrinsic motivation.** Our existing effect system (smog↔clear, withered↔thriving, trees, returning birds) is already the right primary channel; the work is to deepen it, parameterise it across biomes, and keep it performant and purposeful.

---

## SECTION 2 — Key Insights (Top 20)

1. **World-state is the lesson and the reward.** Smog vs clear sky teaches the carbon point *and* rewards the choice. (Journey + Terra Nil + Mayer coherence)
2. **Dense ≠ decorative.** Every object must be a source, a sink, or a navigation landmark, or it's cognitive-load tax. (Mayer coherence; ResearchGate)
3. **Tie the *action* to the *content*.** The clickable choice must *be* the carbon decision; the consequence must *be* the science. (GBL engagement progression)
4. **Show 1–2 objectives at a time, reveal the rest on approach.** (BOTW triangle/gravity)
5. **A visible distant goal pulls players without instruction** — the Himalaya and the stupa spire. (Journey)
6. **Never punish; teach on a wrong answer.** Forgiveness sustains motivation and is sound pedagogy. (AC; "cruelty isn't a teaching tool")
7. **Restoration must be juicy** — eased animation + sound + colour + returning life. (Terra Nil)
8. **Design for ARC** (autonomy/competence/relatedness) over coins. (SDT)
9. **Extrinsic points barely build competence** — anchor rewards to real knowledge and visible healing. (Springer meta-analysis)
10. **Short, daily-ritual sessions** fit students and avoid fatigue. (AC; session-length evidence)
11. **Ownership drives return** — a persistent "your green valley" that visibly grows. (AC/Stardew)
12. **Ethical retention only** — no FOMO timers or dark loops, especially for kids. (AC critique)
13. **Mutate in the loop, never setState per-frame.** (R3F pitfalls — applies to our vanilla loop too)
14. **WebGL2 now, renderer-swappable later.** Our hardware is the WebGPU fallback tail. (three.js manual; utsubo)
15. **Draw calls are the silent killer; instance/batch toward <300.** (utsubo; threejsroadmap)
16. **Bake/fake lighting; one shadow light max** on weak GPUs. (perf guides)
17. **Weather is mood-first** — fog + light shifts, with capped camera-locked particles that auto-off on low FPS. (fxguide)
18. **Audio: layered ambient + stingers + silence**, Howler + Web Audio + procedural fallback, init on gesture. (web.dev; gamedeveloper.com)
19. **Minimal, contextual UI** — spatial beacons, popups on contact, fade internalised data, world-styled. (nastyrodent; wayline)
20. **End on emotion** — a photo/"appreciate" moment of the healed valley, shareable to spread awareness. (Terra Nil; relatedness)

---

## SECTION 3 — Game Design Decisions (with alternatives rejected)

| # | Decision | Justification | Alternatives considered → why rejected |
|---|---|---|---|
| D1 | **Environment-exploration with a per-spot decision loop** (walk → glowing spot → carbon choice → world responds) | Action=content; intrinsic curiosity; already in `CityExplorer` | (a) Quiz-only → fails "exploration/alive"; (b) Free sandbox builder (Terra Nil-like) → too abstract for the curriculum + heavier |
| D2 | **Five real Nepal biomes** (Baglung/Chitwan/Kathmandu/Kali Gandaki/Khumbu) from one parameterised builder | Authenticity brief; Genshin biome identity; reuse | Single generic map → loses authenticity + the geography lesson |
| D3 | **World-state as primary feedback** (sky/foliage/wildlife/river) | Journey; coherence principle | Text/number feedback → higher load, lower immersion |
| D4 | **No-punishment, teach-on-wrong** | AC; pedagogy | Score penalties/lives → discourages risk-taking & learning |
| D5 | **Bana = simple per-level 2D briefing** (one challenge per level) | User's explicit instruction; minimal UI; lower load | Full RAG chat companion → distracting, heavy, off-brief |
| D6 | **Reveal-on-approach + 1–2 active objectives** | BOTW gravity/triangle | All objectives flagged at once → overwhelm, no curiosity |
| D7 | **Persistent "your green valley" + gentle streaks + Nepali festival events** | Ownership retention; ethical | Daily reward chains/FOMO → dark pattern, unethical for kids |
| D8 | **Intrinsic-first rewards**; coins only as light scaffolding | SDT; meta-analysis | Heavy points/badges economy → barely builds competence |
| D9 | **Completion photo/"appreciate" mode**, shareable | Emotional achievement + awareness spread | Text "Level complete" toast → no emotional payoff |
| D10 | **Keep the rigged student + walk cycle; add NPCs later** | User liked it; movement-as-personality | Capsule/avatar → the rejected "barren" feel |
| D11 | **Bilingual everything via existing i18n** | Brief; equity | English-only → excludes most users |

---

## SECTION 4 — Technical Decisions (with estimates)

| # | Decision | Justification | Estimate / target |
|---|---|---|---|
| T1 | **Vanilla Three.js, WebGL2 default**, single `createRenderer()` seam for future WebGPU | Matches codebase; hardware is fallback tail; smaller ship | Bundle ~239 KB gz (current); no rewrite to add WebGPU later |
| T2 | **Mutate in RAF loop; React state only for HUD/overlays**; pause loop when tab hidden or overlay open | R3F principle; battery on laptops | Avoids 60 Hz React churn; idle CPU when paused |
| T3 | **Instancing pass**: `InstancedMesh` (trees/lamps/bins), `BatchedMesh` (houses), merged geometry (wires/roads) | Draw-call reduction | ~3,550 renderables → **<300 draw calls** |
| T4 | **One directional shadow light + hemi + ambient**; contact-shadow blobs, baked/vertex AO | Weak-GPU lighting cost | 1 shadow map (2048, tightened) vs N dynamic lights |
| T5 | **Weather = fog/light mood + capped camera-locked billboard particles**, auto-off under FPS threshold | Particles don't scale on low-end | Hard cap (e.g. ≤400 sprites); disable < ~40 fps |
| T6 | **Audio: Howler + thin Web Audio crossfade + procedural synth fallback**; adaptive by biome & sky-state; PositionalAudio for bells; init on gesture | Cross-browser + zero-asset audible + adaptive | 5 ambient beds + ~8 SFX; lazy-decoded |
| T7 | **Per-biome param object** drives one `buildBiome(scene, params)` engine returning `{update, spots}` | DRY; scalable to 5 levels | One engine vs five bespoke scenes |
| T8 | **Dynamic quality scaler** (pixelRatio cap 1.5–2; reduce shadow res, particle count, fog distance on low FPS) | Wide hardware range | Aim 30–60 fps on iGPU |
| T9 | **Persist save in localStorage** (`harit_valley`), bridged via `store.js` | Ownership/retention; offline | <5 KB JSON |
| T10 | **Dispose all GPU resources on unmount** (already done); lazy-load level assets | Memory on low VRAM | Prevents context loss/leaks |

---

## SECTION 5 — Risk Analysis (Top 10 + mitigations)

| # | Risk | Type | Mitigation |
|---|---|---|---|
| R1 | **Low-end FPS** (too many draw calls on iGPUs) | Tech | Instancing/batching to <300 calls; dynamic quality scaler; LOD; tight active radius; measure `renderer.info` |
| R2 | **Eye-candy drowns the lesson** (extraneous load) | Design | Coherence rule: every object purposeful; minimal UI; A/B the decision clarity |
| R3 | **Scope blow-up** (5 biomes × deep systems) | Scope | Staged roadmap (§7); one parameterised engine; ship per-biome increments |
| R4 | **WebGL context loss / memory** on weak devices | Tech | Dispose on unmount; cap textures; lazy-load; `webglcontextlost` handler with reload |
| R5 | **Audio autoplay blocked / missing assets** | Tech | Init on first gesture; procedural fallback so it's audible with zero files |
| R6 | **Cultural mis-step** (sacred imagery, stereotyping) | Design | Respectful stylisation per brief; review Newari/Buddhist details; no caricature; community check |
| R7 | **Bundle too big for low bandwidth** | Tech | Code-split levels; KTX2/Draco if assets added; keep three-only baseline |
| R8 | **Mobile/touch ergonomics** (dpad + camera drag conflict) | UX | Separate zones; large hit targets; test on phones; keyboard parity |
| R9 | **Retention dark-pattern creep** | Design/ethics | Hard rule: no FOMO timers/loss penalties; gentle streaks only |
| R10 | **i18n drift** (NE strings missing for new content) | Design | Every new string added to both dictionaries; `t()` English fallback already in place |

---

## SECTION 6 — Final Architecture

### 6.1 System diagram (text)
```
┌──────────────────────────────────────────────────────────────────────┐
│ App.jsx  (tabs: calc | explore | city | ask)  + LanguageProvider      │
│          + ErrorBoundary                                              │
└───────────────┬──────────────────────────────────────────────────────┘
                │ renders
        ┌───────▼─────────────────────────┐     ┌────────────────────────┐
        │ BiomeExplorer.jsx (generic)     │     │ Calculator / AskBana   │
        │  React: HUD, overlays, Bana tab │     │ (existing features)    │
        │  ─ owns renderer/camera/loop    │     └────────────────────────┘
        └───────┬─────────────────────────┘
                │ imperative (refs, no per-frame setState)
   ┌────────────▼─────────────┐   reads   ┌───────────────────────────────┐
   │ GAME ENGINE (src/game)   │◄──────────│ logic.js                       │
   │  nepalKit.js  builders   │           │  EF (emission factors)         │
   │  buildBiome(scene,params)│           │  EXPLORER_LEVELS (5×events)    │
   │  biomes.js   param sets  │           │  completeLevel()               │
   │  systems: traffic, birds,│           └───────────────────────────────┘
   │   weather, missions      │
   │  audio/ (Howler+WebAudio)│   persists ┌───────────────────────────────┐
   │  save.js (localStorage)  │◄──────────►│ store.js  (shared bridge)      │
   └──────────────────────────┘            │  + harit_valley (save state)  │
                │ uses                      └───────────────────────────────┘
        ┌───────▼─────────┐
        │ Three.js WebGL2 │  (createRenderer seam → future WebGPU)
        └─────────────────┘
   UI styling: styles.css design tokens  ·  i18n.jsx (EN/NE)  ·  Icons/Bana
```

### 6.2 Folder structure (target)
```
src/
  App.jsx, main.jsx, store.js, logic.js, i18n.jsx, styles.css
  components/
    Navbar.jsx, Calculator.jsx, ExplorerGame.jsx (legacy), AskBana.jsx, Bana.jsx, Icons.jsx
    CityExplorer.jsx        (current Kathmandu scene; becomes a thin wrapper)
    BiomeExplorer.jsx       (NEW — generic scene for any level)
    BanaBrief.jsx           (NEW — simple 2D per-level challenge tab)
  game/
    nepalKit.js             (builders + buildBiome engine + living systems)
    biomes.js               (NEW — per-level BiomeParams)
    missions.js             (NEW — maps level events → spots, decision resolution)
    save.js                 (NEW — localStorage "your green valley")
    quality.js              (NEW — dynamic perf scaler)
    audio/
      engine.js             (NEW — Howler + Web Audio graph, channels)
      registry.js           (NEW — SoundDef catalog incl. procedural voices)
      procedural.js         (NEW — Web Audio synth fallback)
  docs/  (research-phase-0.md, this file, city-explorer.md, …)
```

### 6.3 Data model
```ts
// Biome parameters — one per level, drives buildBiome()
BiomeParams = {
  id:int; name:string; name_ne:string;
  archetype:'urban'|'rural'|'canyon'|'alpine';
  ground:hex; sky:hex; skySmog:hex;
  fog:{ near:number; far:number };
  sun:{ color:hex; intensity:number; pos:[x,y,z] };
  hemi:{ sky:hex; ground:hex; intensity:number };
  himalaya:{ count:int; radius:number; height:number } | null;
  vegetation:{ kind:'tree'|'conifer'|'bush'; density:int; scale:[min,max] };
  landmarks: Array<{ type:string; x:number; z:number; ry?:number }>;
  houses?: { blocks:Array<{cx,cz}>; storeys:[min,max] };
  traffic?: { routes:Vec3[][]; perRoute:int } | null;
  birds?: { center:[x,y,z]; n:int; radius:number } | null;
  weather:'clear'|'monsoon'|'dust'|'snow';
  audio:{ ambient:string; ambientAlt:string; weather?:string };
  spots: Record<string,[x,z]>;   // mission anchors keyed by landmark role
}

// From logic.js (existing) — unchanged
Level  = { id; name; name_ne; theme; blurb; blurb_ne; events:Event[] }
Event  = { prompt; prompt_ne; landmark; spot; spot_ne; explainRight; explainRight_ne; choices:Choice[] }
Choice = { label; label_ne; correct:bool; co2Impact:number; effect:Effect }
Effect = 'smog_on'|'sky_clear'|'sky_hazy'|'leaves_grow'|'leaves_wither'|'add_tree'|'river_clean'|'river_dirty'
Decision = { isCorrect:bool; co2Impact:number }     // fed to completeLevel()

// Save state (NEW) — persisted in localStorage 'harit_valley'
SaveState = {
  levelsPassed:int[]; bestScore:Record<levelId,pct>;
  trees:int; co2Saved:number; streakDays:int; lastPlayed:ISODate;
  valley:{ trees:int; clarity:0..1 };   // the persistent "your valley"
}

// Audio (NEW)
SoundDef = { key; channel:'ambient'|'sfx'|'ui'|'music'; loop:bool; volume:number; src?:url; synth?:VoiceId }
```

### 6.4 Render pipeline
```
init: WebGLRenderer(antialias) → pixelRatio=min(2,DPR) → PCFSoftShadow → sRGB
scene: background=sky; Fog(sky, near, far)
lights: Hemisphere + Ambient(0.25) + 1 Directional (shadow, tight cam)
ground: large plane (biome ground colour) receiveShadow
content: buildBiome(scene, params) → himalayas, sun-glow, roads/traffic (urban),
         instanced vegetation, instanced/merged props, landmarks, bird flock, prayer flags, clouds
actors: makeStudent() + mission beacons (spatial UI)
loop (RAF, dt-clamped):
   1 input → move student (clamped) + animateStudent
   2 camera soft-follow + drag-orbit yaw
   3 city.update(dt)  (traffic, birds, flags, clouds, wheels)
   4 weather.update(dt) (capped particles; quality-gated)
   5 sky/light easing toward target (effect responses)
   6 proximity → trigger decision overlay (paused gate)
   7 quality.sample(fps) → scale if needed
   8 renderer.render
teardown: cancel RAF; dispose geometries/materials/textures; remove canvas
```

### 6.5 Audio pipeline
```
AudioContext (created on first user gesture)
  master Gain
    ├ ambient bus  → biome bed A ⇄ bed B  (crossfade by sky-state: clear↔smog)
    │                + weather loop (monsoon/snow) gated by weather state
    ├ sfx bus      → decision stingers (right/wrong), restore "pop", UI taps
    └ spatial      → PositionalAudio: temple bell @stupa, traffic hum (urban)
Fallback: if a SoundDef has no src (no asset), procedural.js synthesises the voice
          via oscillators/noise so the build is audible with zero binary assets.
Howler handles file decode/playback/cross-browser; Web Audio gain nodes do the
adaptive crossfades. Everything lazy-decoded; muted until first interaction.
```

### 6.6 State architecture
- **Imperative game state** (positions, traffic, effect targets, active station) lives in **refs/closures inside the RAF loop** — never React state (avoids per-frame re-render). *(R3F principle, applied to vanilla.)*
- **React state** holds only **occasional UI**: HUD totals, the active decision, the consequence panel, the level summary, the Bana brief.
- **Persistent state** (`SaveState`) in **localStorage** via `save.js`, surfaced through the existing `store.js` bridge so the Calculator/Arena/Explorer can share "your valley" and results.
- **i18n** via `LanguageProvider`/`useLang`; every string in both dictionaries.

---

## SECTION 7 — Production Roadmap

**Dependency order (each builds on the last):**
```
biomes.js (data) ─▶ buildBiome engine ─▶ BiomeExplorer (generic component)
                                   │
missions.js (event↔spot) ──────────┤
save.js + store bridge ────────────┼─▶ retention/ownership UI
audio/ engine+registry+procedural ─┘
quality.js ───────────────────────▶ perf-safe across all biomes
```

### Phase A — Biome backbone *(Section 8 starts here)*
- **A1 `biomes.js`**: the five `BiomeParams` sets (this commit). *Checkpoint: all 5 params validate.*
- **A2 `buildBiome(scene, params)`** engine in `nepalKit` (this commit), with Kathmandu reproduced via params. *Checkpoint: headless build of every biome + `vite build` pass.*
- **A3 `BiomeExplorer.jsx`**: generalise `CityExplorer` to take a `levelId`, load `biomes[id]` + `EXPLORER_LEVELS[id]`, run the alive scene + decision loop + Bana brief. *Checkpoint: all 5 levels playable; level pills switch biomes.*

### Phase B — Feel & feedback
- **B1** Restoration juice (eased growth + colour + returning birds) and `BanaBrief.jsx` polish.
- **B2** BOTW layout pass (reveal-on-approach, 1–2 active objectives, landmark sightlines).
- **B3** Photo/"appreciate" completion mode. *Checkpoint: emotional payoff per level.*

### Phase C — Systems
- **C1** `audio/` (Howler + Web Audio + procedural; adaptive by biome/sky-state; bells). *Checkpoint: audible with zero assets; crossfades on state change.*
- **C2** `save.js` persistent "your green valley" + gentle streaks + festival events. *Checkpoint: progress survives reload; no dark patterns.*
- **C3** Weather layers (capped, quality-gated) per biome.

### Phase D — Performance & polish
- **D1** Instancing/batching pass → `<300` draw calls; `quality.js` scaler. *Checkpoint: 30–60 fps on a low-end target; `renderer.info` verified.*
- **D2** Mobile/touch ergonomics, context-loss handler, lazy-load, bundle split.
- **D3** Cultural & accessibility review; full EN/NE parity. *Checkpoint: ship-ready.*

**Milestones:** M1 = all 5 biomes playable (A); M2 = feel complete (B); M3 = systems complete (C); M4 = performance-hardened, ship-ready (D).

---

## SECTION 8 — Implementation
Production code begins now, at **Phase A**, following this architecture:
- `src/game/biomes.js` — the five `BiomeParams` sets (data backbone).
- `src/game/nepalKit.js` — adds the `buildBiome(scene, params)` engine (Kathmandu reproduced via params; the existing `buildKathmanduValley` is retained so `CityExplorer` keeps working).
Verified with a headless build of every biome and a production `vite build`. Phase A3 (the generic `BiomeExplorer` component) is the immediate next commit.

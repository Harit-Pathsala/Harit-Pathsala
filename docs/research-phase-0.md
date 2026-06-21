# Phase 0 — Research & Evidence-Based Decisions
### Harit Pathsala · Nepal carbon-footprint exploration game
*Researched mid-2026. Every decision below is tied to a source (see References) or to established, well-documented design practice. Scope is constrained by the real target: Nepali school laptops, intermittent power and low bandwidth, bilingual EN/NE, students ~12–16 (Grade 6–10).*

---

## 0. Executive summary — the headline decisions

1. **Renderer: stay WebGL2-first, architect renderer-swappable.** Three.js made WebGPU production-ready in r171 (Sep 2025) with a one-line swap and automatic WebGL2 fallback, and coverage is now ~95%. But our target hardware (older integrated GPUs, unstable drivers) is exactly the ~5% tail, and WebGPU's wins are in compute / very high draw-call scenes we won't hit. **Decision: keep the default WebGL renderer now; keep the renderer boundary clean so WebGPU is a later flag, not a rewrite.**
2. **Keep vanilla Three.js (not R3F).** R3F adds no rendering overhead, but also no necessity here; the codebase is already vanilla and lighter to ship. The one rule that matters — *mutate in the render loop, never in React state per-frame* — we already follow (React state only drives occasional UI).
3. **The dense world must be *meaningful*, not decorative.** The single most important research finding for an *educational* game: task-irrelevant visual detail raises **extraneous cognitive load** and can *reduce* learning (Mayer's coherence principle). So our density earns its place only because it *is* the lesson — a living city that shows real emission sources, with the sky/foliage state as the feedback channel.
4. **Communicate through the world, minimise the HUD.** Journey and BOTW both teach without text; the field of evidence on diegetic/minimal UI says persistent on-screen data the player has already internalised is the main immersion-killer. **Decision: environmental state = primary feedback; spatial in-world beacons; popups only on contact; HUD unobtrusive.**
5. **Restoration is the reward; never punish.** Terra Nil's loop and the cozy-game retention literature converge: make the healing *visible and juicy*, keep it forgiving, let the valley be "yours" and visibly grow. Wrong answers teach, they don't penalise.
6. **Design for intrinsic motivation (SDT: autonomy, competence, relatedness).** Lean on curiosity, mastery of real knowledge, and a healing world — not on coins/badges, which the gamification meta-analysis shows boost motivation and autonomy but barely move *competence*.

---

## 1. Technical direction (objectives 7–17)

### 1.1 Renderer — WebGPU vs WebGL2
**Evidence.** Since three.js **r171 (Sep 2025)** WebGPU is "production-ready" via `import … from 'three/webgpu'` with **automatic WebGL2 fallback**; Safari 26 closed the last gap and coverage is ~95% (utsubo, vr.org). The three.js manual confirms `WebGPURenderer` is the strategic direction and `WebGLRenderer` is now maintenance-mode (no big new features) but still recommended for pure WebGL2 apps. Caveat from the manual: **custom `onBeforeCompile`/`RawShaderMaterial` shaders are not supported under WebGPU** (you move to TSL/node materials). One conservative source still flags Safari/Firefox WebGPU as uneven in early 2026.
**Decision.** **WebGL2 now** (three's default renderer, which our project already uses). Architect a single `createRenderer()` seam so WebGPU becomes a one-line opt-in later. Rationale: our bottleneck will be **draw calls and fill on weak iGPUs**, not compute; WebGPU's headline gains (compute shaders, high-draw-call binding model) don't pay off for a low-poly stylised valley, and the fallback path is the path our hardware would take anyway.

### 1.2 R3F vs vanilla Three.js
**Evidence.** R3F is "a thin React reconciler, not an abstraction layer that adds overhead"; components run in the render loop outside React (R3F docs; simplified.media). The canonical pitfall: **never `setState` in `useFrame`** — it pumps 60 re-renders/sec through React's scheduler (R3F "Performance pitfalls"; pmndrs discussion #1288). Use frame deltas, `needsUpdate` flags, and `frameloop="demand"` + `invalidate()` for *static* scenes to save battery.
**Decision.** **Stay vanilla.** It matches the existing code, ships less JS, and the "mutate in the loop" principle is already how our `ExplorerGame`/`CityExplorer` work (React state only for HUD/overlays that change occasionally). We will *not* adopt on-demand rendering because the scene is continuously animated (traffic, birds) — instead we **pause the RAF loop when the tab is hidden or a decision overlay is open** to save power on laptops.

### 1.3 Performance budget & draw-call strategy
**Evidence.** Consensus 2026 target: **< ~100 draw calls** for smooth 60 fps; instancing/batching cuts calls 90 %+ (utsubo "100 tips"; threejsroadmap "Draw Calls"). **InstancedMesh** = many copies of the *same* geometry+material in one call (a demo cut 9,000→300). **BatchedMesh** (since r156) = many *different* geometries sharing *one* material, each independently cull-able/visibility-toggle-able (three.js docs; forum guidance: 2–4 geometries → separate InstancedMeshes; many geometries → BatchedMesh). Caveat: InstancedMesh can be *slower* than shared-geometry meshes when vertex count per instance is very high (issue #30352) — not our case (low-poly props). Also: share materials, merge static geometry, use texture **atlases / DataArrayTextures**, **KTX2/Basis** textures + **Draco** geometry, and **dispose** everything; profile with **stats-gl / `renderer.info.render.calls` / Spector.js**.
**Decision (our scene measured at ~3,550 renderables).** Stage-3 perf pass:
- **Trees, street lamps, dustbins, market baskets → `InstancedMesh`** (identical geo, one material each).
- **Newari houses → `BatchedMesh`** (varied geometries, one shared brick/plaster atlas material) so each house can still be frustum-culled.
- **Power-line wires & road dashes → merged `BufferGeometry`** (static).
- Share one `MeshStandardMaterial` per palette colour; cap `pixelRatio` at 2 (1.5 on low-end); **target < ~300 draw calls** and verify with `renderer.info`.
- Per-biome **LOD**: the Himalaya backdrop and far houses swap to billboards/low-poly at distance; frustum culling is automatic but we keep the active radius tight.

### 1.4 Lighting pipeline (baked vs dynamic, PBR, IBL)
**Evidence.** Performance guides repeatedly recommend **baking** lightmaps/shadows/AO and minimising real-time lights/shadow maps; IBL/PBR is great but shadow maps and many dynamic lights are the costly part on weak GPUs.
**Decision.** Keep the **stylised single-directional "sun" + hemisphere + ambient** model we already use (cheap, readable). Use **one** shadow-casting light with a tight shadow camera; bake/fake AO via vertex colours or a cheap contact-shadow blob under actors rather than full dynamic shadows on every prop. Atmospheric perspective (depth via haze) comes free from `THREE.Fog`, which we already drive for smog.

### 1.5 Dynamic weather (objective 11)
**Evidence.** Particle precipitation looks good and runs on GPU but **does not scale** — heavier rain = more particles = frame drops, especially on low-end (fxguide; Andres Gomez). Frustum-restrict particles to the camera. **Animated-texture / scrolling-double-cone** rain has *constant* cost regardless of intensity (Wang & Wade) — better for weak hardware. Fog is cheap and hardware-accelerated. Integrate weather with audio (reverb/dampening) and lighting (designthegame).
**Decision.** Weather is **mood first, simulation last**: drive it primarily with **fog colour/density + light intensity/tint** (which we already do for smog↔clear). Add **capped, camera-locked billboard layers**: monsoon rain (Terai/Chitwan), snow (Himalaya), dust-haze (Kathmandu) — animated-texture style with a hard particle cap and an auto-off on low-FPS. This ties to the hackathon's monsoon theme and our existing `sky_hazy`/`smog_on` effects.

### 1.6 Audio (objective 13)
**Evidence.** Web Audio API gives a modular node graph, gain-based layering, and `PannerNode` spatialisation (source–listener, distance + directional models; y-is-up, opposite of graphics) — three.js wraps this as `AudioListener`/`PositionalAudio` (web.dev; MDN). Adaptive-audio practice: **vertical layering** + **horizontal transitions** (crossfade, splice, stinger, or *silence* between cues), timed on musical boundaries, optionally driven by a valence/arousal/tension model (gamedeveloper.com; Elias). Browsers block autoplay → init on a user gesture.
**Decision.** **Howler.js for robust cross-browser playback + a thin Web Audio crossfade layer**, with a **procedural synth fallback** so the game is audible with zero binary assets (this is the audio engine already in progress). Adaptive ambient bed crossfades by **biome and by sky-state** (clear → birdsong/market; smog → muffled/low); decision **stingers** on right/wrong; optional **PositionalAudio** for temple bells at the stupa and traffic. **Silence as a tool** in the Himalaya level (thin air, sparse sound) — straight from Journey's altitude arc. Soundscape palette from the Nepal brief: temple bells, market hum, river, prayer-flag wind, pigeon flocks.

### 1.7 Camera (objective 14)
**Decision.** Keep the **soft third-person follow + drag-to-orbit** we have (lerped position, look-at the student). Add a **photo/"appreciate" mode** (objective 22) at level completion: free-orbit, hide HUD, optional depth-of-field and a warm filter, shareable snapshot — both an emotional achievement (see §3) and an awareness-spreading hook.

### 1.8 Procedural world & art direction (objectives 12, 16)
**Evidence + practice.** Noise-based undulation + instanced scatter is the standard cheap way to fill space; biome blending via per-region parameters. Stylised "atmospheric perspective" (BOTW/Ghibli) reads well and is cheap (fog + desaturation with distance). **But** the coherence principle (§2.3) means scatter must be *purposeful*.
**Decision.** Per-level **biome parameter set** (ground colour, fog, sky, props, vegetation, weather, audio) drives one shared scene builder — extend `nepalKit`'s `buildKathmanduValley` into a `buildBiome(params)`. Keep the flat-shaded low-poly look (already in place); use distance haze for depth. Vegetation/props instanced. **No purely decorative clutter** — every object type maps to something a student can reason about (a source, a sink, or a landmark that aids navigation).

### 1.9 Target-device constraints (objective 7)
**Decision/guardrails.** Small initial bundle (our three-only build gzips ~239 KB — acceptable; lazy-load levels); cap pixel ratio; 30–60 fps target with a **dynamic quality drop** (reduce particles/shadow res on low FPS); dispose all GPU resources on unmount (already done); KTX2/Draco if we add assets; **offline-friendly PWA** later for intermittent connectivity; keep everything keyboard-and-touch (school laptops + phones).

---

## 2. Game-design direction (objectives 1–6)

### 2.1 Exploration loop without instruction (1)
**Evidence.** BOTW's **"Triangle Rule"** (Fujibayashi/Yonezu, CEDEC): obstacles shaped as triangles let players choose over-or-around and **occlude what's behind**, so cresting a rise *reveals* the next thing — a self-sustaining curiosity loop; **"gravity"** uses topography and attractor landmarks to funnel players, with only **a couple of attractors visible at once** so they're never overwhelmed (gamedeveloper.com; gmtk; sourcegaming). Journey gives a single **visible distant goal** (the mountain) as constant pull.
**Decision.** A compact valley, but apply the principles: the **stupa spire, pagoda, gumba-on-a-rise, and the Himalaya** act as attractor landmarks and sightline anchors; **reveal the next mission spot as the player approaches the current one** (breadcrumb), and **show only 1–2 glowing objectives at a time**, not all six. Gentle layout "gravity" toward the temple plaza.

### 2.2 Environmental storytelling without text (2)
**Evidence.** Journey's narrative comes from "architecture, animation, music, pacing, environmental staging rather than dialogue"; emotion is the *organising principle*, not decoration (positioniseverything; gamedeveloper.com).
**Decision.** The **world state is the story and the lesson**: smog vs clear sky, withered vs thriving foliage, returning birds, a clean vs choked river. This is already our effect system — we lean into it as the primary language and keep written text to the essential decision + one-line explanation.

### 2.3 Student engagement psychology (3) — *the critical constraint*
**Evidence.** GBL reliably lifts **near-term engagement**; achievement effects are **modest and design-dependent** (games don't teach by themselves) (researchgate syntheses). **Younger adolescents (13–15) prefer GBL most** — our exact band. Engagement builds **affective (optimal challenge) → cognitive (playfulness) → content (game-action tied to content)**. **Decorative/seductive detail increases extraneous cognitive load** and dilutes learning. Session-length evidence: long sessions fatigue younger learners; interventions cap ~20–30 min.
**Decision.** **Tie the game *action* to the *content*** (the action *is* the carbon choice; the consequence *is* the science) — the strongest lever. **Bite-size levels (~10–20 min).** **Optimal, scaffolded challenge** for flow. Ruthlessly **minimise extraneous detail in the UI and keep world detail purposeful** so attention lands on the decision and its visible consequence.

### 2.4 Environmental mechanics / restoration loop (4)
**Evidence.** Terra Nil makes **restoration itself the reward** — the "satisfying swoosh" of land turning green, tranquil art and music; it's **forgiving, not punishing**, ends by **reintroducing wildlife** and an **"Appreciate"** beat (shacknews; destructoid; sciencefriday). Framed by an in-world "guide," not a story.
**Decision.** Make green choices trigger **juicy, eased, audible restoration** (sky clears, trees pop in with a sound, birds return, colour saturates). Keep it **forgiving**; end each level with wildlife/clean-air payoff and an **"appreciate" photo moment**. Bana is our "guide" framing.

### 2.5 Long-session retention (5)
**Evidence.** Cozy-game retention = **short daily ritual**, **no punishment for skipping**, **ownership and slow visible growth**, **anticipation via seasonal/real-time events**, and an explicit warning against **"vicious retention loops"** — especially important for children (AC/Stardew analyses; ACM ACNH study; substack). Watch the **completion plateau** when finite content runs out.
**Decision.** **Ethical, low-pressure retention**: a persistent **"your green valley"** that visibly accumulates trees/clean air across sessions (use the existing store/localStorage); **gentle, non-coercive streaks**; **Nepali festival tie-ins** (Dashain/Tihar/Holi/Lhosar) as seasonal events from the cultural brief; class/teacher framing for **relatedness**. No dark patterns, no FOMO timers that punish.

### 2.6 Discovery / curiosity (6)
**Evidence.** BOTW's reward loop: discovery fuels curiosity which fuels more discovery; reward *density* and the **curiosity gap** (occlusion → "what's over there?") keep players moving. Intrinsic curiosity outperforms extrinsic nudging (SDT).
**Decision.** Seed **optional discoveries** in the valley (a hidden red panda, a heritage plaque, an extra tree-planting spot) that reward exploration with knowledge + small world-healing — density without clutter, and all on-theme.

---

## 3. Systems design (objectives 18–22)

### 3.1 Intrinsic vs extrinsic motivation (18)
**Evidence.** **SDT (Ryan & Deci)**: satisfying **autonomy, competence, relatedness** drives intrinsic motivation and links to **flow**; games are strong intrinsic-motivation vehicles (tuni.fi; frontiersin; Wikipedia "Game engagement theory"). A gamification **meta-analysis** found it raises **intrinsic motivation, autonomy, relatedness** but has **minimal effect on competence** (Springer 2024). School-year intrinsic motivation *declines* when these needs go unmet.
**Decision.** Design for **ARC**: *autonomy* (free exploration, real choices, pick objective order); *competence* (balanced challenge + immediate world feedback + a visible eco-score / mastery of real facts); *relatedness* (Bana companion, class leaderboard, shareable valley). Use **coins/badges sparingly** as scaffolding and **anchor rewards to meaningful in-world change and real knowledge**, since extrinsic points alone won't build competence.

### 3.2 Progression = world transformation (19)
**Decision.** Progress is shown **as the world healing**, not as a number bar: each correct decision and each level visibly upgrades the valley from smoggy/degraded toward clear/thriving. This doubles as the achievement system (below) and the retention hook (the valley is "yours").

### 3.3 Achievements — visual & emotional, not textual (20)
**Decision.** Replace badge popups with **in-world milestones**: a returning bird flock, a street of new trees, a cleared sky, a river running clear, a fully-healed valley snapshot. Emotional payoff > text toast.

### 3.4 Minimal / contextual UI (21)
**Evidence.** Diegetic UI maximises immersion but is costly and risks clutter; **spatial** 3D markers are an accepted convention; the real immersion-killer is **persistent on-screen data the player has already internalised**. The Last of Us II is the exemplar: non-diegetic UI that's **minimal, contextual, muted, and inherits the world's visual language**; BOTW leans on world cues over HUD (wayline; nastyrodent; corporationpop). For an *educational* tool, **practicality/clarity comes first**.
**Decision.** **Spatial beacons in-world** (our glowing numbered rings — keep), **decision popups only on contact**, **HUD chips unobtrusive** and styled in our existing green design language, and **fade info the player has internalised**. Crucially, the **decision text stays crystal-clear** (it's the lesson) — we don't sacrifice that to diegesis.

### 3.5 Photo mode & immersion (22)
**Decision.** A completion **photo/"appreciate" mode** (free orbit, hidden HUD, optional DOF + warm filter) — emotional reward, and a **shareable image of the healed valley** that supports relatedness and spreads awareness (the project's actual mission).

---

## 4. Competitor analysis — principles extracted (not mechanics)

| Title | Principle to borrow | How we apply it |
|---|---|---|
| **Journey** | Emotion as the organising principle; one visible distant goal as pull; wordless staging | Himalaya/stupa as constant pull; world-state as narrative; minimal text |
| **Breath of the Wild** | Triangle Rule + "gravity"; only 1–2 attractors on screen; discovery→curiosity loop; minimal signposting | Landmark sightlines; reveal next spot on approach; show few objectives at once |
| **Death Stranding** | Walking *is* the gameplay; terrain as deliberate challenge; traversal builds connection | Make walking the valley pleasant and meaningful; the commute itself is a carbon decision |
| **Firewatch** | Dialogue-free environmental narrative; expressive, warm art; camera as companion | Environmental feedback over exposition; warm stylised palette; soft cinematic camera |
| **Subnautica** | Wonder + dread drive exploration; coherent ecosystem | Wonder (alive Kathmandu, returning wildlife); mild "dread" of smog/degradation as motivation |
| **Terra Nil** | Restoration as the core loop; juicy healing feedback; forgiving; reintroduce wildlife; "Appreciate" beat | Juicy eased restoration on green choices; no punishment; wildlife payoff; photo mode |
| **ABZU / Flower** | Wordless awakening; fauna interaction; colour & light as emotion; movement as personality | Birds/animals respond to a healthier world; colour saturation as reward; good walk feel |
| **Animal Crossing** | Daily ritual; **no punishment**; ownership; seasonal anticipation; UGC/social | Persistent "your valley"; gentle streaks; Nepali festival events; class sharing |
| **Stardew Valley** | Mastery loop; personal investment; emergent variety; legacy | Eco-score mastery of real facts; valley you invest in; varied biomes/levels |
| **Genshin Impact** | Distinct biome identity; vertical traversal; readable stylisation | Five authentic Nepal biomes from one parameterised builder; verticality (hills, rooftops) |
| **Monument Valley** | Composition, perspective, silent clarity; calm | Clean framing; calm tone; clarity over clutter (also serves cognitive load) |

---

## 5. Decisions applied to the Harit Pathsala roadmap

**Stage 2 — biomes & integration (build on `nepalKit`)**
- Refactor `buildKathmanduValley` → **`buildBiome(params)`**; add **per-level parameter sets** (ground, sky, fog, props, vegetation, weather, audio) for Baglung hills, Chitwan Terai, Kali Gandaki canyon, Khumbu Himalaya.
- Apply BOTW attractor/reveal layout per biome; **1–2 active objectives shown**; landmark sightlines.
- **Restoration juice**: eased animation + stinger + colour/birds on every green choice.
- **Bana** remains the simple per-level briefing/"guide" (as the user specified) — one challenge per level, no heavy chat.

**Stage 3 — performance, audio, weather, polish**
- **Instancing pass**: `InstancedMesh` (trees/props), `BatchedMesh` (houses), merged geometry (wires/roads); target **< ~300 draw calls**, verified via `renderer.info`; cap pixelRatio; dynamic quality drop; pause loop when hidden/overlay open.
- **Audio engine**: Howler + Web Audio crossfade + procedural fallback; adaptive by biome/sky-state; PositionalAudio temple bells; silence at altitude; init-on-gesture.
- **Weather**: fog/light mood + capped camera-locked billboard rain/snow/dust, auto-off on low FPS.
- **Minimal UI** pass; **photo/"appreciate" mode**; **persistent "your green valley"** + gentle streaks + festival events.
- **Ethical guardrails**: no dark retention patterns; forgiving, no-punishment; everything bilingual and keyboard/touch.

**Renderer note.** Stay WebGL2; keep a `createRenderer()` seam so WebGPU is a future opt-in, not a rewrite.

---

## References
- Three.js — WebGPURenderer manual: https://threejs.org/manual/en/webgpurenderer.html
- Three.js — BatchedMesh docs: https://threejs.org/docs/pages/BatchedMesh.html ; proposal #22376
- "What's New in Three.js (2026)" & "100 Three.js Tips (2026)" & WebGPU migration guide — utsubo.com
- "Draw Calls: The Silent Killer" & "Three.js Post-Processing in 2026" — threejsroadmap.com
- WebGPU baseline 2026 — vr.org ; WebGL/Three.js practical note — simplified.media
- React Three Fiber — Performance Pitfalls (r3f.docs.pmnd.rs) ; pmndrs discussion #1288
- Web Audio game audio — web.dev ; MDN Web Audio API & spatialization basics
- Adaptive/generative game audio — gamedeveloper.com ; elias.audio
- Weather rendering — fxguide (Game environments: rain) ; A.Gomez (geometry-shader rain/snow) ; designthegame.com
- Journey / Jenova Chen — positioniseverything.net ; gamedeveloper.com ("A Personal Journey") ; GDC 2013 "Designing Journey"
- BOTW triangle rule / gravity — gamedeveloper.com ("Gravity to go Forward") ; gmtk.substack.com ; sourcegaming.info ; nintendolife.com
- Terra Nil — shacknews.com ; pcgamer.com ; destructoid.com ; sciencefriday.com
- Cozy-game retention — alibaba product-insights analyses ; ACM ACNH retention study (3450337.3483483) ; switchbladegaming.com ; substack (Animal Crossing)
- SDT / intrinsic motivation — tuni.fi PlayLab ; Frontiers (Academical) ; Springer gamification meta-analysis (s11423-023-10337-7) ; Wikipedia "Game engagement theory"
- GBL engagement / cognitive load — ResearchGate syntheses (392852144, 318457365) ; Frontiers ECE meta-analysis (fpsyg.2024.1307881)
- Diegetic/minimal UI — wayline.io ; nastyrodent.com ; medium (Salama, Ardeni) ; corporationpop.co.uk ; sunstrikestudios.com

// biomes.js — per-level BiomeParams that drive the generic buildBiome() engine.
// Pure data (no THREE import). Colours/themes derive from EXPLORER_LEVELS in
// logic.js; archetypes and props derive from the Nepal authenticity brief.
//
// `spots`     : mission anchors keyed by the event.landmark type (the generic
//               BiomeExplorer places a glowing beacon at each).
// `landmarks` : actual 3D objects buildBiome() places (includes one per spot,
//               plus decorative/cultural landmarks). Types without a dedicated
//               nepalKit builder render as a labelled placeholder marker until
//               their builder lands (Phase A/B).

const spotsToLandmarks = (spots, extra = []) =>
  Object.entries(spots).map(([type, [x, z]]) => ({ type, x, z })).concat(extra);

/* L1 — Baglung Village (mountain village: firewood, footpaths, forest) */
const baglung = (() => {
  const spots = {
    house: [-14, 10], signpost: [9, -12], leafpile: [14, 13], school: [-18, -13], shop: [7, 8],
  };
  return {
    id: 1, name: 'Baglung Village', name_ne: 'बागलुङ गाउँ', archetype: 'rural',
    ground: 0xb9985a, sky: 0x9fd6ec, skySmog: 0xc9b49a,
    fog: { near: 55, far: 190 },
    sun: { color: 0xfff0d0, intensity: 2.1, pos: [-50, 65, -40] },
    hemi: { sky: 0xcfe8f5, ground: 0x7a6038, intensity: 0.9 },
    himalaya: { count: 12, radius: 150, height: 50 },
    vegetation: { kind: 'conifer', density: 60, scale: [0.9, 1.6] },
    houses: null, traffic: null,
    birds: { center: [0, 14, 0], n: 8, radius: 11 },
    weather: 'clear', prayerFlags: true,
    audio: { ambient: 'ambient_hills', ambientAlt: 'ambient_hills_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots, [{ type: 'pagoda', x: 0, z: 4 }]),
  };
})();

/* L2 — Chitwan Farmland (Terai rice fields: water, soil, stubble) */
const chitwan = (() => {
  const spots = {
    paddy: [-12, 12], compost: [10, -10], tractor: [16, 14], stubble: [-18, -12], pump: [6, 18],
  };
  return {
    id: 2, name: 'Chitwan Farmland', name_ne: 'चितवन खेतीयोग्य भूमि', archetype: 'rural',
    ground: 0x7cb342, sky: 0x9fd6ec, skySmog: 0xb8b48a,
    fog: { near: 60, far: 200 },
    sun: { color: 0xfff2d8, intensity: 2.2, pos: [-40, 70, -30] },
    hemi: { sky: 0xcfeefb, ground: 0x4a7022, intensity: 0.9 },
    himalaya: { count: 9, radius: 170, height: 34 },
    vegetation: { kind: 'tree', density: 50, scale: [0.9, 1.5] },
    houses: null, traffic: null,
    birds: { center: [0, 12, 0], n: 12, radius: 13 },
    weather: 'monsoon', prayerFlags: false,
    audio: { ambient: 'ambient_terai', ambientAlt: 'ambient_terai_smog', weather: 'rain' },
    spots,
    landmarks: spotsToLandmarks(spots),
  };
})();

/* L3 — Kathmandu City (dense, smoggy, fast) — the hero urban biome */
const kathmandu = (() => {
  const spots = {
    busstop: [3, -12], shop: [8, -7], school: [-16, 16],
    dustbin: [2.4, 12], waterstation: [-11, 14], building: [16, -16],
  };
  return {
    id: 3, name: 'Kathmandu City', name_ne: 'काठमाडौँ सहर', archetype: 'urban',
    ground: 0x9bbd6e, sky: 0x9ec9e8, skySmog: 0xcdbb94,
    fog: { near: 50, far: 200 },
    sun: { color: 0xfff2dc, intensity: 2.1, pos: [-50, 70, -40] },
    hemi: { sky: 0xcfe8f5, ground: 0x6b5a3e, intensity: 0.9 },
    himalaya: { count: 13, radius: 165, height: 50 },
    vegetation: { kind: 'tree', density: 18, scale: [0.9, 1.3] },
    houses: { blocks: [{ cx: 16, cz: 16 }, { cx: -16, cz: 16 }, { cx: 16, cz: -16 }, { cx: -16, cz: -16 }, { cx: 30, cz: 8 }, { cx: -30, cz: 8 }], storeys: [2, 4] },
    traffic: { perRoute: 2 },
    birds: { center: [-11, 11, 10], n: 16, radius: 9 },
    weather: 'dust', prayerFlags: true,
    audio: { ambient: 'ambient_city', ambientAlt: 'ambient_city_smog', weather: 'dust' },
    spots,
    landmarks: spotsToLandmarks(spots, [
      { type: 'pagoda', x: 9, z: 9 }, { type: 'stupa', x: -11, z: 10 },
      { type: 'gumba', x: 26, z: -22, ry: -0.4 }, { type: 'hospital', x: -24, z: -20, ry: Math.PI },
    ]),
  };
})();

/* L4 — Kali Gandaki Valley (river canyon under construction) */
const kaligandaki = (() => {
  const spots = {
    powerplant: [-16, -14], riverbank: [12, 12], construction: [16, -12], toilet: [-12, 14], stones: [6, -18],
  };
  return {
    id: 4, name: 'Kali Gandaki Valley', name_ne: 'कालीगण्डकी उपत्यका', archetype: 'canyon',
    ground: 0x8d8378, sky: 0x86c8e0, skySmog: 0xb6b29a,
    fog: { near: 50, far: 180 },
    sun: { color: 0xfff1d6, intensity: 2.0, pos: [-45, 60, -35] },
    hemi: { sky: 0xbfe6f2, ground: 0x5a5048, intensity: 0.9 },
    himalaya: { count: 14, radius: 140, height: 56 },
    vegetation: { kind: 'conifer', density: 14, scale: [0.9, 1.5] },
    clearings: [{ x: 0, z: -24, r: 7 }, { x: 0, z: 0, r: 7 }, { x: 0, z: 24, r: 7 }],
    houses: null, traffic: null,
    birds: { center: [0, 16, 0], n: 7, radius: 12 },
    weather: 'dust', prayerFlags: true,
    audio: { ambient: 'ambient_canyon', ambientAlt: 'ambient_canyon_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots),
  };
})();

/* L5 — Himalayan Trail (ice, thinning forest, fragile glacial lake) */
const himalaya = (() => {
  const spots = {
    tent: [-12, 12], waterstation: [10, -10], glaciallake: [14, 14], nursery: [-16, -12], timbertruck: [6, 18],
  };
  return {
    id: 5, name: 'Himalayan Trail', name_ne: 'हिमाली बाटो', archetype: 'alpine',
    ground: 0xeaf2f6, sky: 0xbfe6f2, skySmog: 0xc8d4dc,
    fog: { near: 40, far: 170 },
    sun: { color: 0xffffff, intensity: 2.3, pos: [-40, 75, -30] },
    hemi: { sky: 0xdff0fb, ground: 0x9fb0bb, intensity: 0.9 },
    himalaya: { count: 16, radius: 130, height: 60 },
    vegetation: { kind: 'conifer', density: 14, scale: [0.7, 1.2] },
    clearings: [{ x: 9, z: 9, r: 17 }],
    houses: null, traffic: null,
    birds: { center: [0, 18, 0], n: 5, radius: 12 },
    weather: 'snow', prayerFlags: true,
    audio: { ambient: 'ambient_alpine', ambientAlt: 'ambient_alpine_wind', weather: 'snow' },
    spots,
    landmarks: spotsToLandmarks(spots),
  };
})();

/* L6 — Dhulikhel (Himalayan hill station: terraces, pine, sunrise viewpoint) */
const dhulikhel = (() => {
  const spots = {
    house: [-13, 9], signpost: [10, -11], terrace: [14, 12], waterstation: [-17, -12], school: [7, 16],
  };
  return {
    id: 6, name: 'Dhulikhel', name_ne: 'धुलिखेल', archetype: 'rural',
    ground: 0x8fae54, sky: 0x9fd6ec, skySmog: 0xc9b49a,
    fog: { near: 60, far: 200 },
    sun: { color: 0xfff0d0, intensity: 2.2, pos: [-50, 65, -40] },
    hemi: { sky: 0xcfe8f5, ground: 0x6f6038, intensity: 0.9 },
    himalaya: { count: 16, radius: 150, height: 58 },
    vegetation: { kind: 'conifer', density: 52, scale: [0.9, 1.7] },
    houses: null, traffic: null,
    birds: { center: [0, 15, 0], n: 9, radius: 12 },
    weather: 'clear', prayerFlags: true,
    audio: { ambient: 'ambient_hills', ambientAlt: 'ambient_hills_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots, [
      { type: 'viewtower', x: 0, z: -9 }, { type: 'pagoda', x: 11, z: 7, ry: -0.4 },
      { type: 'terrace', x: -13, z: -5 }, { type: 'terrace', x: 13, z: 9, ry: Math.PI }, { type: 'house', x: -9, z: 15 },
    ]),
  };
})();

/* L7 — Janakpur (Mithila Terai: Janaki Mandir, sacred ponds, culture) */
const janakpur = (() => {
  const spots = {
    pond: [-12, 12], house: [12, 11], shop: [16, -12], busstop: [-16, -11], leafpile: [6, 18],
  };
  return {
    id: 7, name: 'Janakpur', name_ne: 'जनकपुर', archetype: 'rural',
    ground: 0x9cae5a, sky: 0x9fd6ec, skySmog: 0xc7bd8a,
    fog: { near: 60, far: 210 },
    sun: { color: 0xfff2d8, intensity: 2.25, pos: [-40, 70, -30] },
    hemi: { sky: 0xcfeefb, ground: 0x5a6a2a, intensity: 0.9 },
    himalaya: { count: 6, radius: 195, height: 18 },
    vegetation: { kind: 'tree', density: 30, scale: [0.9, 1.5] },
    clearings: [{ x: 0, z: -7, r: 9 }],
    houses: null, traffic: null,
    birds: { center: [0, 13, 0], n: 12, radius: 13 },
    weather: 'clear', prayerFlags: false,
    audio: { ambient: 'ambient_terai', ambientAlt: 'ambient_terai_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots, [
      { type: 'janaki_mandir', x: 0, z: -7 }, { type: 'pond', x: 15, z: 11 },
      { type: 'house', x: -15, z: 13 }, { type: 'house', x: 14, z: -14, ry: Math.PI },
    ]),
  };
})();

/* L8 — Lumbini (birthplace of Buddha: Maya Devi temple, Ashoka pillar, monastic zone) */
const lumbini = (() => {
  const spots = {
    pond: [-12, 11], bodhitree: [12, 10], monastery: [16, -13], riverbank: [-16, -12], waterstation: [6, 17],
  };
  return {
    id: 8, name: 'Lumbini', name_ne: 'लुम्बिनी', archetype: 'rural',
    ground: 0x86b352, sky: 0x9fd6ec, skySmog: 0xc7bd8a,
    fog: { near: 60, far: 210 },
    sun: { color: 0xfff4dc, intensity: 2.2, pos: [-45, 70, -32] },
    hemi: { sky: 0xd2f0fb, ground: 0x4f6a26, intensity: 0.9 },
    himalaya: { count: 7, radius: 195, height: 20 },
    vegetation: { kind: 'tree', density: 36, scale: [0.9, 1.6] },
    clearings: [{ x: 0, z: -8, r: 9 }],
    houses: null, traffic: null,
    birds: { center: [0, 14, 0], n: 10, radius: 13 },
    weather: 'clear', prayerFlags: true,
    audio: { ambient: 'ambient_terai', ambientAlt: 'ambient_terai_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots, [
      { type: 'mayadevi', x: 0, z: -8 }, { type: 'ashoka_pillar', x: -3.6, z: -7.4 },
      { type: 'monastery', x: -16, z: -14, ry: 0.5 }, { type: 'stupa', x: 18, z: 9 },
      { type: 'gumba', x: -18, z: 9, ry: 0.4 }, { type: 'bodhitree', x: 8, z: 8 },
    ]),
  };
})();

/* L9 — Shuklaphanta (far-west Terai grassland & sal forest: wildlife, wetland) */
const shuklaphanta = (() => {
  const spots = {
    house: [-13, 9], riverbank: [12, 12], nursery: [15, -12], leafpile: [-16, -12], signpost: [6, 17],
  };
  return {
    id: 9, name: 'Shuklaphanta', name_ne: 'शुक्लाफाँटा', archetype: 'rural',
    ground: 0x9cb85a, sky: 0x9fd6ec, skySmog: 0xc7bd8a,
    fog: { near: 60, far: 210 },
    sun: { color: 0xfff2d8, intensity: 2.25, pos: [-40, 70, -30] },
    hemi: { sky: 0xcfeefb, ground: 0x5a6a2a, intensity: 0.9 },
    himalaya: { count: 6, radius: 195, height: 16 },
    vegetation: { kind: 'tree', density: 44, scale: [0.9, 1.6] },
    houses: null, traffic: null,
    birds: { center: [0, 13, 0], n: 14, radius: 14 },
    weather: 'clear', prayerFlags: false,
    audio: { ambient: 'ambient_terai', ambientAlt: 'ambient_terai_smog', weather: null },
    spots,
    landmarks: spotsToLandmarks(spots, [{ type: 'house', x: -15, z: 13 }, { type: 'leafpile', x: 14, z: 18 }]),
  };
})();

export const BIOMES = {
  1: baglung, 2: chitwan, 3: kathmandu, 4: kaligandaki, 5: himalaya,
  6: dhulikhel, 7: janakpur, 8: lumbini, 9: shuklaphanta,
};

export function getBiome(levelId) {
  return BIOMES[levelId] || BIOMES[3];
}

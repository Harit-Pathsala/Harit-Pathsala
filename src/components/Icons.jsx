import React from 'react';

/* ============================================================================
 * Icons.jsx — hand-built vector icon set for Harit Pathsala
 * One cohesive line-icon family (24×24 grid, round caps/joins, currentColor).
 * No emoji anywhere in the app — every glyph is real SVG that scales crisply
 * and inherits text colour. Usage: <Icon name="bus" size={22} />
 * ==========================================================================*/

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
  /* ── Navigation / app ─────────────────────────────────────────── */
  calculator: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" {...P} />
      <rect x="7.5" y="5" width="9" height="3.5" rx="1" {...P} />
      <circle cx="8.6" cy="12.4" r=".5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.4" r=".5" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="12.4" r=".5" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="15.6" r=".5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.6" r=".5" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.6" r=".5" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="18.8" r=".5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.8" r=".5" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="18.8" r=".5" fill="currentColor" stroke="none" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" {...P} />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" {...P} />
    </>
  ),
  forest: (
    <>
      <path d="M8 3.5 4 11h8z" {...P} />
      <path d="M8 8 4.8 14h6.4z" {...P} />
      <path d="M8 14v6.5" {...P} />
      <path d="M16 6 13 12h6z" {...P} />
      <path d="M16 6v14.5" {...P} />
    </>
  ),

  /* ── Categories ───────────────────────────────────────────────── */
  bus: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2.5" {...P} />
      <path d="M4 11h16" {...P} />
      <path d="M7 17v2.5M17 17v2.5" {...P} />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" {...P} />,
  flame: (
    <path d="M12 3c2.5 3 5 5.2 5 9a5 5 0 0 1-10 0c0-1.6.7-2.8 1.6-3.7C9 9.8 9.5 11 11 11c1.3-2-1-4 1-8z" {...P} />
  ),
  bowl: (
    <>
      <path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0z" {...P} />
      <path d="M9 6.5c0-1 .8-1.8 1.5-2.5M12 6.5c0-1 .8-1.8 1.5-2.5" {...P} />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16" {...P} />
      <path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5" {...P} />
      <path d="M9 6.5V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v2" {...P} />
      <path d="M10 10.5v6.5M14 10.5v6.5" {...P} />
    </>
  ),
  droplet: <path d="M12 3c3 4 5.5 6.5 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.5 9 7 12 3z" {...P} />,
  school: (
    <>
      <path d="M3 9.5 12 4l9 5.5" {...P} />
      <path d="M5 11v8.5h14V11" {...P} />
      <path d="M10 19.5v-4.5h4v4.5" {...P} />
      <path d="M12 4V2" {...P} />
    </>
  ),
  tree: (
    <>
      <path d="M12 3c2.6 1.4 4.2 3.6 4.2 6.2a4.2 4.2 0 0 1-2.2 3.8c1.7.4 3 1.7 3 3.3 0 1.8-1.8 2.7-5 2.7s-5-.9-5-2.7c0-1.6 1.3-2.9 3-3.3a4.2 4.2 0 0 1-2.2-3.8C7.8 6.6 9.4 4.4 12 3z" {...P} />
      <path d="M12 19.5v2.5" {...P} />
    </>
  ),

  /* ── Transport choices ────────────────────────────────────────── */
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.6" {...P} />
      <path d="M13 7v5l3 3 1.5 4M13 12l-3.5 1.5-2 4.5M13 9l3 1" {...P} />
    </>
  ),
  bicycle: (
    <>
      <circle cx="6" cy="16.5" r="3.5" {...P} />
      <circle cx="18" cy="16.5" r="3.5" {...P} />
      <path d="M6 16.5 10 8h4l3.5 8.5M10 8l4.5.5M14 8.5l-2 5.5" {...P} />
      <path d="M9.5 8h-2" {...P} />
    </>
  ),
  van: (
    <>
      <path d="M3 7h10l5 4v6H3z" {...P} />
      <path d="M13 7v4h5" {...P} />
      <circle cx="7" cy="17" r="1.8" {...P} />
      <circle cx="16" cy="17" r="1.8" {...P} />
    </>
  ),
  motorbike: (
    <>
      <circle cx="5.5" cy="16.5" r="3.2" {...P} />
      <circle cx="18.5" cy="16.5" r="3.2" {...P} />
      <path d="M5.5 16.5 9 10h5l1.5 3.5 3 3M9 10h6M14 7h3" {...P} />
    </>
  ),
  car: (
    <>
      <path d="M3 16v-3l2.5-5.5A2 2 0 0 1 7.3 6h9.4a2 2 0 0 1 1.8 1.5L21 13v3" {...P} />
      <path d="M3 13h18" {...P} />
      <circle cx="7.5" cy="16.5" r="1.8" {...P} />
      <circle cx="16.5" cy="16.5" r="1.8" {...P} />
    </>
  ),

  /* ── Energy / cooking choices ─────────────────────────────────── */
  bulb: (
    <>
      <path d="M9 16a6 6 0 1 1 6 0c-.6.5-1 1.2-1 2H10c0-.8-.4-1.5-1-2z" {...P} />
      <path d="M9.5 20h5M10.5 22h3" {...P} />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" {...P} />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" {...P} />
    </>
  ),
  logs: (
    <>
      <ellipse cx="7" cy="8" rx="2.2" ry="3.5" {...P} />
      <path d="M7 4.5v7M9.2 8c5 0 5 0 8 0M9.2 5.2c5 0 5 0 7.5 0M9.2 10.8c5 0 5 0 7.5 0" {...P} />
      <ellipse cx="17" cy="16" rx="2.2" ry="3.5" {...P} />
      <path d="M17 12.5v7M4.8 16c5 0 7 0 9.9 0M4.8 13.2c5 0 7 0 9.9 0M4.8 18.8c5 0 7 0 9.9 0" {...P} />
    </>
  ),
  cylinder: (
    <>
      <rect x="7.5" y="6" width="9" height="15" rx="2.5" {...P} />
      <path d="M10 6V4.2A1.2 1.2 0 0 1 11.2 3h1.6A1.2 1.2 0 0 1 14 4.2V6" {...P} />
      <path d="M7.5 11h9" {...P} />
    </>
  ),
  induction: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" {...P} />
      <circle cx="12" cy="12" r="3.5" {...P} />
      <path d="M10.5 10.5c1 .8 2 .2 3 1" {...P} />
    </>
  ),
  mixed: (
    <>
      <path d="M5 16a3.5 3.5 0 0 0 7 0c0-2-1.7-3-2.5-5C8 13 6.7 12 6.5 10.5 5.5 12 5 13.5 5 16z" {...P} />
      <path d="M14 8h5M14 12h5M14 16h5" {...P} />
    </>
  ),

  /* ── Food choices ─────────────────────────────────────────────── */
  package: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" {...P} />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" {...P} />
    </>
  ),
  meat: (
    <>
      <path d="M16.5 4.5a4.5 4.5 0 0 1 0 9c-1 3-3.5 5-6 5a4.5 4.5 0 0 1 0-9c1-3 3.5-5 6-5z" {...P} />
      <circle cx="16" cy="8" r="1.4" {...P} />
    </>
  ),
  veg: (
    <>
      <path d="M12 8c3-4 8-4 8-4s0 5-4 8M12 8c-3-4-8-4-8-4s0 5 4 8" {...P} />
      <path d="M12 8c2 1 3 3 3 6a3 3 0 0 1-6 0c0-3 1-5 3-6z" {...P} />
    </>
  ),

  /* ── Waste choices ────────────────────────────────────────────── */
  sprout: (
    <>
      <path d="M12 21v-9" {...P} />
      <path d="M12 12C12 8 9 6 4.5 6c0 4 3 6 7.5 6z" {...P} />
      <path d="M12 13.5c0-3 2.2-4.5 5.5-4.5 0 3-2.2 4.5-5.5 4.5z" {...P} />
    </>
  ),
  bin: (
    <>
      <path d="M5 7.5h14l-1 13a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 20.5z" {...P} />
      <path d="M4 7.5h16M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5" {...P} />
    </>
  ),
  dump: (
    <>
      <path d="M3 20h18" {...P} />
      <path d="M4.5 20 7 11l4 2 3-5 2.5 4 3.5-1 .5 9" {...P} />
    </>
  ),

  /* ── School-electricity choices ───────────────────────────────── */
  candle: (
    <>
      <rect x="9" y="9" width="6" height="12" rx="1.5" {...P} />
      <path d="M12 9V7" {...P} />
      <path d="M12 6.5c1.2-.8 1.2-2.2 0-3.5-1.2 1.3-1.2 2.7 0 3.5z" {...P} />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5" width="14" height="9.5" rx="1.5" {...P} />
      <path d="M3 18.5h18l-1-2.5H4z" {...P} />
    </>
  ),
  factory: (
    <>
      <path d="M3 21V11l6 3.5V11l6 3.5V8h6v13z" {...P} />
      <path d="M18 8V4M6 7V4" {...P} />
    </>
  ),

  /* ── Feedback / status ────────────────────────────────────────── */
  check: <path d="M5 12.5 10 17.5 19.5 7" {...P} />,
  x: <path d="M6 6 18 18M18 6 6 18" {...P} />,
  refresh: (
    <>
      <path d="M20 11A8 8 0 1 0 18 17" {...P} />
      <path d="M20 5v6h-6" {...P} />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" {...P} />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" {...P} />,
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" {...P} />
      <path d="M7 5.5H4.5V7A3 3 0 0 0 7 9.9M17 5.5h2.5V7A3 3 0 0 1 17 9.9" {...P} />
      <path d="M12 13v3M9 20h6M9.5 20c0-1.4 1-2 2.5-2s2.5.6 2.5 2" {...P} />
    </>
  ),
  star: <path d="M12 3.5 14.2 8.5 19.5 9 15.5 12.7 16.6 18 12 15.3 7.4 18 8.5 12.7 4.5 9 9.8 8.5z" {...P} />,
  leaf: (
    <>
      <path d="M5 19C4 12 8 5 19 5c0 11-7 15-14 14z" {...P} />
      <path d="M9 15c2.5-3 5-4.5 8-5.5" {...P} />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" {...P} />
      <path d="M12 7.5v9M14.3 9.3c-.5-.9-1.4-1.3-2.4-1.3-1.4 0-2.4.8-2.4 2s1 1.6 2.4 2 2.4.9 2.4 2-1 2-2.4 2c-1 0-2-.5-2.4-1.3" {...P} />
    </>
  ),
  mountain: <path d="M3 19h18L14 7l-3.5 5.5-2-2.5z" {...P} />,
  play: (
    <>
      <circle cx="12" cy="12" r="9" {...P} />
      <path d="M10 8.5 16 12l-6 3.5z" {...P} />
    </>
  ),
  smog: (
    <>
      <path d="M6 11a4 4 0 0 1 7.7-1.5A3.2 3.2 0 0 1 19 12" {...P} />
      <path d="M4 14.5h13M7 18h11" {...P} />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 22 20H2z" {...P} />
      <path d="M12 9v5" {...P} />
      <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" {...P} />
      <path d="M12 11v5" {...P} />
      <circle cx="12" cy="7.8" r=".7" fill="currentColor" stroke="none" />
    </>
  ),

  /* ── Fullscreen ───────────────────────────────────────────────── */
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...P} />,
  collapse: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" {...P} />,

  /* ── Chat ─────────────────────────────────────────────────────── */
  chat: (
    <>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z" {...P} />
      <path d="M7 10h10M7 13h6" {...P} />
    </>
  ),
  send: <path d="M4 11.5 20 4l-7.5 16-2.2-6.3z" {...P} />,
  book: (
    <>
      <path d="M5 4.5h9a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H5z" {...P} />
      <path d="M19 6.5a2 2 0 0 1 0 0v11A2.5 2.5 0 0 0 16.5 20" {...P} />
      <path d="M8 8.5h6M8 11.5h5" {...P} />
    </>
  ),
  /* ── added: map landmarks, world, chrome (hand-drawn, no emoji) ──── */
  lock: (<><rect x="5" y="10.5" width="14" height="9.5" rx="2" {...P} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...P} /></>),
  pin: (<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" {...P} /><circle cx="12" cy="10" r="2.4" {...P} /></>),
  temple: (<><path d="M5 9.5h14L16.5 12h-9z" {...P} /><path d="M6.5 6.8h11L12 3.2z" {...P} /><path d="M8 12v8M16 12v8M8 20h8M11 20v-4h2v4" {...P} /></>),
  wheel: (<><circle cx="12" cy="12" r="8" {...P} /><circle cx="12" cy="12" r="2.3" {...P} /><path d="M12 4.2v3M12 16.8v3M4.2 12h3M16.8 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" {...P} /></>),
  wheat: (<><path d="M12 21V8.5" {...P} /><path d="M12 8.5c0-2 1.7-3 1.7-3s.6 2-1.7 3zM12 8.5c0-2-1.7-3-1.7-3s-.6 2 1.7 3zM12 13c0-1.7 1.7-2.6 1.7-2.6s.5 1.7-1.7 2.6zM12 13c0-1.7-1.7-2.6-1.7-2.6s-.5 1.7 1.7 2.6zM12 17.5c0-1.7 1.7-2.6 1.7-2.6s.5 1.7-1.7 2.6zM12 17.5c0-1.7-1.7-2.6-1.7-2.6s-.5 1.7 1.7 2.6z" {...P} /></>),
  city: (<><path d="M3 21V11l5-2.5V21M8 21V5.5l6-2.5V21M14 21V9l5 2.5V21" {...P} /><path d="M3 21h18" {...P} /></>),
  sunrise: (<><circle cx="12" cy="13" r="3.4" {...P} /><path d="M12 5.2v2M5.5 9.2l1.4 1.4M19 9.2l-1.4 1.4M3 18.2h18" {...P} /></>),
  boat: (<><path d="M3.5 14h17l-2.4 5H5.9z" {...P} /><path d="M12 14V5l6 5" {...P} /></>),
  rain: (<><path d="M7.5 13.5a3.8 3.8 0 0 1 .5-7.5A4.8 4.8 0 0 1 17 7a3.4 3.4 0 0 1-.5 6.5z" {...P} /><path d="M9 16l-1 2.4M12.4 16l-1 2.4M15.8 16l-1 2.4" {...P} /></>),
  backpack: (<><rect x="6" y="7.5" width="12" height="13.5" rx="3" {...P} /><path d="M9 7.5V6A3 3 0 0 1 15 6v1.5M9 13h6M10.5 13v3h3v-3" {...P} /></>),
  basket: (<><path d="M5 9.5h14L17.5 20.5h-11z" {...P} /><path d="M8.5 9.5 10.5 4.5M15.5 9.5 13.5 4.5M5 12.5h14" {...P} /></>),
  deer: (<><path d="M9.2 20.5c-1.4-1.9-1.9-3.8-1.9-5.7a4.7 4.7 0 0 1 9.4 0c0 1.9-.5 3.8-1.9 5.7z" {...P} /><path d="M9 9 6.6 5.2 5 6.8M9.3 9 7.4 4.4M15 9l2.4-3.8L19 6.8M14.7 9l1.9-4.6" {...P} /></>),
  recycle: (<><path d="M7 9.5a6 6 0 0 1 9.6-2.2" {...P} /><path d="M16.8 4v3.6h-3.6" {...P} /><path d="M17 14.5a6 6 0 0 1-9.6 2.2" {...P} /><path d="M7.2 20v-3.6h3.6" {...P} /></>),
  globe: (<><circle cx="12" cy="12" r="8.4" {...P} /><path d="M3.6 12h16.8M12 3.6c2.4 2.4 2.4 14.4 0 16.8M12 3.6c-2.4 2.4-2.4 14.4 0 16.8" {...P} /></>),
  sound: (<><path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" {...P} /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" {...P} /></>),
  mute: (<><path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" {...P} /><path d="M15.5 9l4.5 6M20 9l-4.5 6" {...P} /></>),
  sparkle: <path d="M12 3l1.8 5.7L19.5 12l-5.7 1.8L12 19.5l-1.8-5.7L4.5 12l5.7-1.8z" {...P} />,
  heart: <path d="M12 20.5S3.6 14.9 3.6 9A4.4 4.4 0 0 1 12 7.1 4.4 4.4 0 0 1 20.4 9c0 5.9-8.4 11.5-8.4 11.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
  camera: (<><rect x="3" y="7" width="18" height="13" rx="2.5" {...P} /><path d="M8 7l1.4-2.5h5.2L16 7" {...P} /><circle cx="12" cy="13.5" r="3.1" {...P} /></>),
  clock: (<><circle cx="12" cy="12" r="8.4" {...P} /><path d="M12 7v5l3.4 2" {...P} /></>),
  users: (<><circle cx="9" cy="8.5" r="3" {...P} /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...P} /><path d="M16 6.2a2.8 2.8 0 0 1 0 5.4M17.5 14.5c2.2.5 3.8 2.3 3.8 4.5" {...P} /></>),
  shield: (<><path d="M12 3l7 2.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5z" {...P} /><path d="M9 12l2 2 4-4" {...P} /></>),
  target: (<><circle cx="12" cy="12" r="8.5" {...P} /><circle cx="12" cy="12" r="4.6" {...P} /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>),
  download: (<><path d="M12 3v11" {...P} /><path d="M8 11l4 4 4-4" {...P} /><path d="M5 19h14" {...P} /></>),
  user: (<><circle cx="12" cy="8" r="4" {...P} /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" {...P} /></>),
  logout: (<><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" {...P} /><path d="M10 12h10M17 9l3 3-3 3" {...P} /></>),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.6" fill="currentColor" stroke="none" />,
};

export default function Icon({ name, size = 24, className = '', style, title }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg
      className={'ic ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
}

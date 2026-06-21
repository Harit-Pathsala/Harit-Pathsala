import * as THREE from 'three';

// Hand-drawn paper "sticker" billboards for 3D scenes — a rounded white card with
// an ink border and a hand-lettered label (and, for bins, a simple line icon).
// Replaces emoji-on-canvas billboards so nothing in-game uses emoji.

const INK = '#2b3a24', PAPER = '#f8fcf2';

// A few simple, robust single-path line icons (24-unit space).
const PATHS = {
  sprout: 'M12 21v-7 M12 14c-3 0-5-2-5-5 3 0 5 2 5 5 M12 12.5c2.6 0 4-1.6 4-4.2-2.6 0-4 1.6-4 4.2',
  recycle: 'M7 9.5a6 6 0 0 1 9.6-2.2 M16.8 4v3.6h-3.6 M17 14.5a6 6 0 0 1-9.6 2.2 M7.2 20v-3.6h3.6',
  bin: 'M6 8h12 M9 8V6h6v2 M7.5 8l1 12h7l1-12 M10.5 11v6 M13.5 11v6',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z M9 15c2.5-3 5-4.5 8-5.5',
  bag: 'M6 8h12l-1 12H7z M9 8V6.5A3 3 0 0 1 15 6.5V8',
};

function roundRect(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r);
  x.closePath();
}

export function stickerTexture({ icon, label, accent } = {}) {
  const S = 256;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d'); x.clearRect(0, 0, S, S);

  // paper card
  roundRect(x, 20, 22, S - 40, S - 44, 34);
  x.fillStyle = PAPER; x.fill();
  x.lineWidth = 9; x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();

  // optional colour strip along the top
  if (accent) {
    x.save(); roundRect(x, 20, 22, S - 40, S - 44, 34); x.clip();
    x.globalAlpha = 0.5; x.fillStyle = accent; x.fillRect(20, 22, S - 40, 46); x.restore();
  }

  // optional line icon (upper area)
  if (icon && PATHS[icon]) {
    x.save();
    const sc = 4.3, iw = 24 * sc, ix = (S - iw) / 2, iy = 46;
    x.translate(ix, iy); x.scale(sc, sc);
    x.lineWidth = 1.7; x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round';
    x.stroke(new Path2D(PATHS[icon]));
    x.restore();
  }

  // hand-lettered label (wrapped to fit)
  if (label) {
    x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle';
    const size = 36; x.font = `${size}px 'Patrick Hand','Baloo 2',sans-serif`;
    const words = String(label).split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (x.measureText(test).width > S - 54 && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = size + 4;
    const region = icon ? [168, S - 30] : [34, S - 34];
    let yy = (region[0] + region[1]) / 2 - (lines.length - 1) * lh / 2;
    for (const ln of lines) { x.fillText(ln, S / 2, yy); yy += lh; }
  }

  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.needsUpdate = true; return t;
}

export const BIN_ICON = { compost: 'sprout', recycle: 'recycle', landfill: 'bin' };
export const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);

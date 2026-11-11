// Clue Dive pixel art, all drawn in code: a tiny rasterizer that fills shapes pixel by pixel (no smoothing), then shades
// every shape like hand-made pixel art (lit from the top left, dark along the bottom right) and draws a dark outline.
// Everything here returns small canvases (1 canvas pixel = 1 art pixel) that the game scales up with hard edges:
//   subHull(cols, rows) the class submarine with round windows for the crew · propeller(f) · MONSTERS (9, 4 frames each)
//   fish / jelly / whale / turtle / gull sprites for the ocean · coral, rock and ruin pieces · the treasure chest

const INK = '#140c28';
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = (a) => '#' + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export function mix(a, b, f) { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); }
// three tones of one colour: lit (towards warm white), base, shade (towards deep blue)
export const tones = (c) => [mix(c, '#fff4d8', .32), c, mix(c, '#1a1450', .42)];

// ---------- the rasterizer ----------
export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.m = new Int16Array(w * h).fill(-1); this.mats = []; this.keys = new Map(); }
  // a material: '#rrggbb' (shaded), { flat: '#..' } (one colour), { glow: '#..' } (one colour, shines in the dark)
  mat(c) {
    const key = typeof c === 'string' ? c : JSON.stringify(c);
    if (this.keys.has(key)) return this.keys.get(key);
    const m = typeof c === 'string' ? { t: tones(c) } : c.flat ? { t: [c.flat, c.flat, c.flat], flat: 1 } : { t: [c.glow, c.glow, c.glow], flat: 1, glow: 1 };
    this.mats.push(m); this.keys.set(key, this.mats.length - 1); return this.mats.length - 1;
  }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.m[y * this.w + x] = c === null ? -1 : this.mat(c); }
  ell(cx, cy, rx, ry, c) {
    const k = c === null ? null : c;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, k);
    }
    return this;
  }
  circ(cx, cy, r, c) { return this.ell(cx, cy, r, r, c); }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  poly(pts, c) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + .5, py = y + .5; let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.set(x, y, c);
    }
    return this;
  }
  // a stroke: thickness t can taper from t0 to t1 along the way
  line(x0, y0, x1, y1, c, t0 = 1, t1 = t0) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, t = t0 + (t1 - t0) * f;
      if (t <= 1.2) this.set(x, y, c); else this.circ(x, y, t / 2, c);
    }
    return this;
  }
  path(pts, c, t0 = 1, t1 = t0) {   // a smooth stroke through points, tapering
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let run = 0;
    for (let i = 1; i < pts.length; i++) { const a = run / total, b = (run + seg[i - 1]) / total; this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, t0 + (t1 - t0) * a, t0 + (t1 - t0) * b); run += seg[i - 1]; }
    return this;
  }
  // turn it into a canvas: shading + outline. flip: mirror left-right
  render({ outline = INK, flip = false, shade = true } = {}) {
    const { w, h, m, mats } = this, c = canvas(w + 2, h + 2), g = c.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const i = at(x, y), X = (flip ? w - 1 - x : x) + 1;
      if (i < 0) {
        if (outline && (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0)) { g.fillStyle = outline; g.fillRect(X, y + 1, 1, 1); }
        continue;
      }
      const mt = mats[i]; let tone = 1;
      if (shade && !mt.flat) {
        const up = at(x, y - 1) !== i, left = at(x - 1, y) < 0, down = at(x, y + 1) < 0 || at(x, y + 2) < 0, right = at(x + 1, y) < 0;
        if (flip ? up || right : up || left) tone = 0; else if (flip ? down || left : down || right) tone = 2;
      }
      g.fillStyle = mt.t[tone]; g.fillRect(X, y + 1, 1, 1);
    }
    return c;
  }
}
const flipCanvas = (c) => { const f = canvas(c.width, c.height), g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f; };
export { flipCanvas };

// ---------- the class submarine (facing right) ----------
// cols × rows round windows (holes) for the crew; returns the hull, where each window is, the lamp and the propeller
export function subHull(cols, rows) {
  const D = 15, GAP = 22, padL = 34, padR = 40;
  const L = padL + cols * GAP + padR, H = rows * GAP + 22, top = 20, W = L + 26, Ht = top + H + 12;
  const P = new Pix(W, Ht), cy = top + H / 2;
  const HULL = '#ffc23a', BELLY = '#ff8a2a', TRIM = '#2ab8b0', DARK = '#3a3a6a', METAL = '#a8b4d8';
  // the conning tower and periscope
  const tx = padL + Math.max(0, cols * GAP * .22);
  P.rect(tx + 6, 2, 3, 12, DARK); P.rect(tx + 6, 2, 9, 3, DARK); P.rect(tx + 13, 1, 3, 5, METAL);
  P.poly([[tx - 4, top + 3], [tx, top - 9], [tx + 30, top - 9], [tx + 36, top + 3]], HULL);
  P.rect(tx + 2, top - 6, 26, 2, TRIM);
  // tail fins and the body: a long rounded capsule
  P.poly([[10, cy - 2], [2, top - 4], [16, top - 2], [24, cy - 6]], TRIM);
  P.poly([[10, cy + 2], [2, top + H + 6], [16, top + H + 4], [24, cy + 6]], TRIM);
  P.ell(L - H * .55, cy, H * .62, H / 2, HULL);
  P.ell(H * .5 + 6, cy, H * .5, H / 2 - 1, HULL);
  P.rect(H * .5 + 6, top, L - H * 1.05 - 6, H, HULL);
  // the orange belly and the teal bands
  for (let x = 0; x < W; x++) for (let y = Math.floor(cy + H * .26); y < Ht; y++) if (P.m[y * W + x] === P.mat(HULL)) P.set(x, y, BELLY);
  for (const bx of [padL - 8, L - padR + 4]) for (let y = 0; y < Ht; y++) for (let x = bx; x < bx + 3; x++) { const i = P.m[y * W + x]; if (i === P.mat(HULL) || i === P.mat(BELLY)) P.set(x, y, TRIM); }
  // nose lamp
  P.circ(L - 4, cy + 2, 4.5, METAL); P.circ(L - 3.5, cy + 2, 3, { glow: '#fff6c0' });
  // windows: a riveted ring and a hole
  const holes = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = padL + c * GAP + GAP / 2 + (r % 2 ? GAP * .25 : 0), y = top + 11 + r * GAP;
    P.circ(x, y, D / 2 + 2.5, METAL); P.circ(x, y, D / 2, null);
    holes.push({ x: x + 1, y: y + 1, r: D / 2 });   // +1: the outline border of the rendered canvas
  }
  // rivets along the body
  for (let x = padL; x < L - padR; x += 6) { P.set(x, top + 2, { flat: '#fff0b0' }); P.set(x + 3, top + H - 3, { flat: '#c86a1a' }); }
  const c = P.render();
  // a glint on each window's glass
  const g = c.getContext('2d');
  for (const o of holes) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(Math.round(o.x - 3), Math.round(o.y - 5), 2, 1); g.fillRect(Math.round(o.x - 5), Math.round(o.y - 3), 1, 2); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(Math.round(o.x + 2), Math.round(o.y + 3), 2, 1); }
  return { canvas: c, holes, w: c.width, h: c.height, lamp: { x: L - 2, y: cy + 3 }, prop: { x: 2, y: cy + 1 }, cy: cy + 1 };
}
// the propeller seen from the side: 4 frames of the blades turning
export function propeller(f) {
  const P = new Pix(9, 21), k = [1, .55, .1, .55][f & 3], up = f & 2 ? -1 : 1;
  P.rect(4, 6, 3, 9, '#8a96c0');
  P.ell(3, 10.5 - 6 * k * up, 2.5, Math.max(1, 6 * k), '#c8d2f0');
  P.ell(3, 10.5 + 6 * (1 - k) * up, 2.5, Math.max(1, 6 * (1 - k) + 1), '#c8d2f0');
  return P.render();
}

// ---------- sea monsters (facing left), 4 frames each; f = 0…3 ----------
const SPARK = { glow: '#fff27a' }, EYE = { glow: '#fff6c0' }, PUPIL = { flat: '#140c28' }, TOOTH = { flat: '#ffffff' };
function eye(P, x, y, r = 2, col = EYE) { P.circ(x, y, r, col); P.set(x - .5, y, PUPIL); }
function teeth(P, x0, x1, y, down = true) { for (let x = x0; x < x1; x += 2) P.poly(down ? [[x, y], [x + 2, y], [x + 1, y + 2.5]] : [[x, y], [x + 2, y], [x + 1, y - 2.5]], TOOTH); }
const A = (f) => (f / 4) * Math.PI * 2;

const DRAW = {
  crab(P, f) {   // 56 × 40
    const a = A(f), claw = Math.sin(a) > 0 ? 1 : 0;
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { const bx = 28 + s * (8 + k * 5); P.path([[bx, 24], [bx + s * 6, 30 + (k + f) % 2], [bx + s * 8, 38]], '#c83a2a', 2.2, 1.4); }
    P.ell(30, 22, 17, 10, '#e8503a');
    P.ell(30, 17, 12, 5, '#f07a52');
    for (const [x, h] of [[24, 9], [32, 8]]) { P.line(x, 14, x, 14 - h, '#c83a2a', 2); eye(P, x, 14 - h - 1, 2.2); }
    // the giant claw out in front
    P.path([[15, 24], [9, 28], [6, 22]], '#e8503a', 4, 4);
    P.ell(6, 16, 7, 6, '#ff6a4a');
    P.poly([[1, 12 - claw * 3], [12, 12], [4, 16]], null); P.poly([[0, 13 - claw * 2], [6, 13 - claw * 2], [2, 9 - claw * 3]], '#ff8a6a');
    P.ell(42, 14, 5, 4, '#e8503a'); P.poly([[40, 11], [48, 9], [46, 13]], '#ff8a6a');
    teeth(P, 25, 35, 25);
  },
  eel(P, f) {   // 84 × 30
    const a = A(f), pts = [];
    for (let i = 0; i <= 24; i++) { const x = 8 + i * 3, y = 15 + Math.sin(i * .45 - a) * (2 + i * .18); pts.push([x, y]); }
    P.path(pts, '#2a7a62', 10, 2.5);
    pts.forEach(([x, y], i) => { if (i % 3 === 1 && i < 21) P.set(x, y + 1, { flat: '#e8e04a' }); });
    P.ell(9, 15 + Math.sin(-a) * 2, 8, 6, '#2a8a6a');
    eye(P, 6, 13 + Math.sin(-a) * 2, 1.6);
    P.line(2, 17 + Math.sin(-a) * 2, 9, 18 + Math.sin(-a) * 2, PUPIL);
    for (let k = 0; k < 5; k++) { const i = 3 + k * 4 + (f % 2) * 2, [x, y] = pts[Math.min(i, pts.length - 1)]; P.line(x, y - 5, x + 2, y - 9 - (k % 2), SPARK); P.line(x + 2, y - 9 - (k % 2), x, y - 12, SPARK); }
    P.poly([[78, pts[24][1] - 1], [83, pts[24][1] - 6], [83, pts[24][1] + 5]], '#2a7a62');
  },
  jelly(P, f) {   // 44 × 60
    const a = A(f), pulse = Math.sin(a) * 1.5;
    for (let k = 0; k < 7; k++) {
      const x0 = 8 + k * 4.4, pts = [];
      for (let i = 0; i < 9; i++) pts.push([x0 + Math.sin(i * .7 + a + k) * (1 + i * .35), 26 + i * 4]);
      P.path(pts, k % 2 ? { glow: '#ff9ae0' } : '#b88aff', 2, 1);
    }
    P.ell(22, 18, 17 + pulse, 13 - pulse * .5, '#c79aff');
    P.ell(22, 24, 14 + pulse, 4, '#9a6ae0');
    P.ell(15, 12, 4, 3, { flat: '#f0e0ff' });
    for (const [x, y] of [[13, 19], [22, 16], [30, 20], [26, 10]]) P.set(x, y, { glow: '#ff9ae0' });
    eye(P, 17, 20, 1.8); eye(P, 27, 20, 1.8);
  },
  shark(P, f) {   // 92 × 46
    const a = A(f), tail = Math.sin(a) * 5;
    P.poly([[70, 22], [90, 6 + tail], [84, 22 + tail * .3], [90, 38 + tail]], '#5a6a9a');
    P.poly([[6, 22], [20, 10], [60, 10], [76, 20], [60, 32], [20, 33]], '#6a7aaa');
    P.poly([[36, 11], [46, -2 + 2], [54, 11]], '#5a6a9a');
    P.poly([[32, 30], [26, 42], [44, 31]], '#5a6a9a');
    P.poly([[10, 26], [22, 31], [56, 31], [62, 28], [20, 27]], '#d8def0');
    for (let x = 28; x < 62; x += 7) P.line(x, 12, x - 3, 24, '#4a5a8a', 1);
    eye(P, 16, 17, 2, { glow: '#ff5a5a' });
    P.poly([[6, 23], [20, 24], [14, 29]], { flat: '#3a1430' }); teeth(P, 8, 18, 23);
  },
  squid(P, f) {   // 84 × 56
    const a = A(f);
    for (let k = 0; k < 6; k++) {
      const y0 = 20 + k * 3.2, pts = [];
      for (let i = 0; i < 12; i++) pts.push([30 - i * 2.6, y0 + Math.sin(i * .55 + a + k * .8) * (1 + i * .5) + (k - 2.5) * i * .5]);
      P.path(pts, '#d8405a', 3.2, 1);
    }
    P.path([[30, 26], [14, 44], [4, 50 + Math.sin(a) * 3]], '#e8506a', 2.6, 1.4);
    P.ell(36, 28, 10, 11, '#e8506a');
    P.poly([[40, 18], [82, 26], [40, 38]], '#d8405a');
    P.poly([[70, 24], [83, 14], [80, 27], [83, 38], [70, 30]], '#c83050');
    for (const [x, y] of [[52, 24], [60, 29], [48, 32], [66, 27]]) P.set(x, y, { flat: '#ff9ab0' });
    eye(P, 33, 24, 3.2, { glow: '#fff27a' });
  },
  angler(P, f) {   // 70 × 58
    const a = A(f), sway = Math.sin(a) * 2;
    P.path([[34, 18], [26, 4], [14, 3 + sway], [10, 10 + sway]], '#3a4a8a', 2, 1.2);
    P.circ(10, 12 + sway, 3.5, { glow: '#ffe27a' }); P.set(9, 11 + sway, { glow: '#ffffff' });
    P.poly([[58, 30], [69, 18 + sway], [66, 31], [69, 44 - sway]], '#2a3a7a');
    P.ell(38, 32, 24, 19, '#3a4a8a');
    P.poly([[34, 15], [44, 8], [48, 16]], '#2a3a7a'); P.poly([[40, 49], [48, 56], [52, 47]], '#2a3a7a');
    // the huge mouth
    const open = 4 + (f % 2) * 3;
    P.poly([[14, 30 - open], [36, 33], [14, 36 + open]], { flat: '#1a0a20' });
    teeth(P, 15, 33, 30 - open); for (let x = 15; x < 33; x += 3) P.poly([[x, 36 + open], [x + 2, 36 + open], [x + 1, 33 + open - 2]], TOOTH);
    eye(P, 30, 24, 3, { glow: '#9af0ff' });
    for (const [x, y] of [[48, 26], [52, 36], [44, 40]]) P.set(x, y, { glow: '#9af0ff' });
  },
  serpent(P, f) {   // 130 × 64
    const a = A(f), pts = [];
    for (let i = 0; i <= 30; i++) { const x = 14 + i * 3.8, y = 34 + Math.sin(i * .38 - a) * (6 + i * .4); pts.push([x, y]); }
    P.path(pts, '#2ab890', 13, 3);
    pts.forEach(([x, y], i) => { if (i % 2 === 0 && i < 27) { const t = 13 - i * .33; P.poly([[x - 2, y - t / 2 + 1], [x + 1, y - t / 2 - 5], [x + 3, y - t / 2 + 1]], '#ff7a4a'); } });
    pts.forEach(([x, y], i) => { if (i < 26) P.set(x, y + 3 - i * .08, { flat: '#f0e070' }); });
    const [hx, hy] = pts[0];
    P.ell(hx - 2, hy - 1, 12, 8, '#2ac8a0');
    P.poly([[hx - 14, hy + 1], [hx - 4, hy + 3], [hx - 13, hy + 6]], { flat: '#1a0a20' }); teeth(P, hx - 13, hx - 4, hy + 2);
    P.path([[hx + 2, hy - 7], [hx + 8, hy - 15], [hx + 14, hy - 16]], '#ffd24a', 2.5, 1);
    P.path([[hx - 3, hy - 7], [hx, hy - 16], [hx + 5, hy - 19]], '#ffd24a', 2.5, 1);
    eye(P, hx - 4, hy - 3, 2.2, { glow: '#ffef7a' });
  },
  kraken(P, f) {   // 120 × 100
    const a = A(f);
    for (let k = 0; k < 8; k++) {
      const side = k < 4 ? -1 : 1, sp = (k % 4), pts = [];
      const x0 = 64 + (k - 3.5) * 4, y0 = 52;
      for (let i = 0; i < 16; i++) {
        const t = i / 15, curl = Math.sin(t * 3 + a * 1.5 + k) * (5 + t * 14);
        pts.push([x0 + side * t * (16 + sp * 12) + curl * .6, y0 + t * (28 + sp * 4) + Math.cos(t * 4 + a + k) * 3 * t]);
      }
      P.path(pts, k % 2 ? '#a83a8a' : '#b8489a', 9, 2);
      pts.forEach(([x, y], i) => { if (i % 3 === 1 && i < 12) P.set(x, y + 1, { flat: '#ffc8e8' }); });
    }
    P.ell(64, 32, 26, 28, '#b8489a');
    P.ell(64, 10, 14, 8, '#c858aa');
    for (const [x, y] of [[52, 18], [74, 14], [60, 6], [80, 30]]) P.circ(x, y, 2, '#d878c0');
    eye(P, 52, 38, 5, { glow: '#ffe24a' }); eye(P, 76, 38, 5, { glow: '#ffe24a' });
    P.rect(51, 37, 3, 3, PUPIL); P.rect(75, 37, 3, 3, PUPIL);
  },
  leviathan(P, f) {   // 160 × 76
    const a = A(f), tail = Math.sin(a) * 6;
    P.poly([[126, 40], [158, 18 + tail], [148, 40 + tail * .3], [158, 64 + tail]], '#24406e');
    P.poly([[14, 40], [30, 18], [70, 10], [120, 20], [134, 40], [118, 58], [60, 64], [26, 58]], '#2a4a7a');
    for (let x = 34; x < 122; x += 9) P.poly([[x, 16 + (x > 90 ? (x - 90) * .1 : 0)], [x + 4, 4 + (x % 2) * 3], [x + 8, 16]], '#3a6aa0');
    P.poly([[20, 46], [34, 56], [90, 60], [120, 52], [34, 48]], '#9ab8e0');
    for (let x = 40; x < 116; x += 10) P.line(x, 22, x - 4, 50, '#1e3a66', 2);
    P.poly([[60, 52], [52, 74], [78, 56]], '#24406e'); P.poly([[92, 50], [92, 70], [106, 52]], '#24406e');
    // the jaw, open and shut
    const open = (f % 2) * 4;
    P.poly([[6, 34 - open], [40, 38], [10, 46 + open]], { flat: '#1a0a20' });
    teeth(P, 8, 36, 35 - open); for (let x = 9; x < 34; x += 3) P.poly([[x, 46 + open], [x + 2, 46 + open], [x + 1, 43 + open]], TOOTH);
    eye(P, 34, 27, 3.2, { glow: '#7af0ff' });
    for (const [x, y] of [[54, 32], [70, 30], [86, 33], [102, 36]]) P.set(x, y, { glow: '#7af0ff' });
  },
};
const MSIZE = { crab: [56, 40], eel: [84, 30], jelly: [44, 62], shark: [92, 46], squid: [84, 56], angler: [70, 58], serpent: [130, 64], kraken: [120, 100], leviathan: [160, 78] };
export const MONSTERS = [
  { id: 'crab', name: 'Giant Crab', tier: 1 }, { id: 'eel', name: 'Electric Eel', tier: 1 }, { id: 'jelly', name: 'Ghost Jelly', tier: 1 },
  { id: 'shark', name: 'Iron Shark', tier: 2 }, { id: 'squid', name: 'Giant Squid', tier: 2 }, { id: 'angler', name: 'Anglerfish', tier: 2 },
  { id: 'serpent', name: 'Sea Serpent', tier: 3 }, { id: 'kraken', name: 'The Kraken', tier: 3 }, { id: 'leviathan', name: 'The Leviathan', tier: 3 },
];
export const monsterById = (id) => MONSTERS.find((m) => m.id === id) || MONSTERS[0];
const monsterCache = new Map();
export function monsterFrame(id, f = 0, flip = false) {
  const key = id + f + flip; if (monsterCache.has(key)) return monsterCache.get(key);
  const [w, h] = MSIZE[id], P = new Pix(w, h); DRAW[id](P, f & 3);
  const c = P.render({ flip }); monsterCache.set(key, c); return c;
}
const urlCache = new Map();
export function monsterURL(id, f = 0, flip = false) { const key = id + f + flip; if (!urlCache.has(key)) urlCache.set(key, monsterFrame(id, f, flip).toDataURL()); return urlCache.get(key); }

// ---------- small sea life for the ocean ----------
export function fishSprite(kind, f) {
  const P = new Pix(12, 8), wag = f % 2;
  const col = { gold: '#ffc83a', blue: '#4ab8ff', pink: '#ff7ab8', lime: '#9af04a', silver: '#c8d2f0' }[kind] || '#ffc83a';
  P.ell(5.5, 4, 4.5, 3, col);
  P.poly([[9, 4], [12, 1 + wag], [12, 7 - wag]], mix(col, '#1a1450', .25));
  P.line(4, 1.5, 6, 1, mix(col, '#1a1450', .25));
  P.set(2.6, 3.4, PUPIL);
  return P.render();
}
export function jellySprite(f, col = '#c89aff') {
  const P = new Pix(10, 14), p = f % 2;
  P.ell(5, 4, 4.5 - p * .6, 3.5 + p * .5, col);
  for (let k = 0; k < 4; k++) P.line(2 + k * 2, 7, 2 + k * 2 + ((k + f) % 2 ? 1 : -1), 13 - p, { glow: '#ff9ae0' });
  return P.render({ outline: null });
}
export function whaleSprite(f) {
  const P = new Pix(70, 28), t = f % 2 ? 3 : 0;
  P.poly([[54, 12], [70, 2 + t], [64, 13], [70, 22 - t]], '#3a6ab8');
  P.ell(28, 14, 27, 11, '#4a7ac8');
  P.poly([[4, 16], [30, 22], [52, 18], [30, 25], [8, 21]], '#c8daf0');
  for (let x = 8; x < 40; x += 4) P.line(x, 19, x + 2, 23, '#9ab8e0');
  P.poly([[26, 22], [18, 28], [34, 24]], '#3a6ab8');
  P.set(10, 12, PUPIL);
  return P.render();
}
export function turtleSprite(f) {
  const P = new Pix(26, 16), fl = f % 2 ? 2 : -1;
  P.poly([[8, 9], [2, 14 + fl], [10, 12]], '#6ac87a'); P.poly([[18, 9], [24, 15 - fl], [16, 12]], '#6ac87a');
  P.ell(13, 8, 9, 6, '#8a6a3a');
  for (const [x, y] of [[10, 6], [15, 6], [12, 9]]) P.circ(x, y, 1.5, '#b8945a');
  P.ell(3, 8, 3, 2.5, '#6ac87a'); P.set(2, 7, PUPIL);
  return P.render();
}
export function gullSprite(f) {
  const rows = f % 2 ? ['.ww...ww.', 'w..www..w', '....d....'] : ['w.......w', '.ww.d.ww.', '...www...'];
  const c = canvas(9, 3), g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = ch === 'w' ? '#ffffff' : '#ffb03a'; g.fillRect(x, y, 1, 1); }));
  return c;
}
export function chestSprite() {
  const P = new Pix(30, 24);
  P.poly([[2, 4], [28, 4], [26, 0], [4, 0]], '#8a5a2a');
  P.rect(3, 11, 24, 12, '#9a6432');
  for (let x = 5; x < 26; x += 3) P.circ(x, 10 - (x % 6) / 3, 2.2, '#ffd23a');
  P.circ(15, 7, 2.5, { glow: '#7af0ff' }); P.circ(9, 8, 1.5, { glow: '#ff7ab8' }); P.circ(21, 8, 1.8, { glow: '#9af04a' });
  P.rect(3, 14, 24, 2, '#ffd23a'); P.rect(13, 13, 4, 5, '#ffd23a'); P.set(15, 15, PUPIL);
  return P.render();
}
// coral, sea plants, rocks and ruins (for the walls of the ocean)
export function coralSprite(kind, seed) {
  const r = rng(seed), P = new Pix(22, 22);
  if (kind === 'fan') { const col = ['#ff6a9a', '#ff9a4a', '#c86aff'][(r() * 3) | 0]; for (let k = 0; k < 9; k++) { const a = -Math.PI * (.15 + .7 * k / 8); P.path([[11, 21], [11 + Math.cos(a) * 6, 21 + Math.sin(a) * 6 - 2], [11 + Math.cos(a) * 10, 21 + Math.sin(a) * 10 - 3]], col, 2, 1); } }
  else if (kind === 'branch') { const col = ['#ffb03a', '#ff6a6a', '#ffe24a'][(r() * 3) | 0]; const br = (x, y, a, l, d) => { const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; P.line(x, y, x2, y2, col, 3 - d * .6); if (d < 3) { br(x2, y2, a - .5, l * .7, d + 1); br(x2, y2, a + .45, l * .7, d + 1); } }; br(11, 21, -Math.PI / 2, 7, 0); }
  else if (kind === 'brain') { P.ell(11, 16, 9, 6, ['#ff8ab8', '#9ad87a', '#ffc86a'][(r() * 3) | 0]); for (let x = 4; x < 19; x += 3) P.line(x, 12, x + 1, 20, { flat: '#c85a8a' }); }
  else if (kind === 'anemone') { const col = ['#ff5a8a', '#7af0d8', '#ffd24a'][(r() * 3) | 0]; P.ell(11, 19, 5, 3, '#a83a6a'); for (let k = 0; k < 8; k++) { const x = 6 + k * 1.5; P.line(11, 18, x + (k - 3.5) * .6, 9 + (k % 3), col, 1.6, 1); } }
  else if (kind === 'glowplant') { const col = r() < .5 ? '#3af0ff' : '#ff4ae0'; for (let k = 0; k < 4; k++) { const x = 6 + k * 3.5; P.line(x, 21, x + (r() - .5) * 4, 8 + r() * 6, '#1a3a5a', 1.6, 1); P.circ(x + (r() - .5) * 4, 7 + r() * 6, 1.4, { glow: col }); } }
  return P.render({ outline: kind === 'glowplant' ? null : INK });
}
export function columnSprite(h, broken, seed) {
  const r = rng(seed), P = new Pix(14, h);
  P.rect(0, h - 4, 14, 4, '#5a6aa0'); P.rect(2, 4, 10, h - 8, '#6a7ab0');
  for (let x = 4; x < 12; x += 3) P.line(x, 6, x, h - 6, '#4a5a90');
  if (!broken) P.rect(0, 0, 14, 4, '#5a6aa0'); else P.poly([[2, 4], [12, 4], [12, 1 + r() * 3], [8, 4 - r() * 3], [5, 2]], '#6a7ab0');
  for (let k = 0; k < 4; k++) P.set(3 + r() * 8, 8 + r() * (h - 16), { glow: '#3af0d8' });
  return P.render();
}
export function wreckSprite() {
  const P = new Pix(96, 46);
  P.poly([[2, 24], [86, 30], [94, 44], [10, 44]], '#7a4a2a');
  for (let y = 28; y < 44; y += 4) P.line(6, y, 90, y + 2, '#5a3418');
  P.poly([[60, 26], [80, 4], [82, 6], [64, 28]], '#6a3a20');
  P.rect(36, 6, 3, 22, '#6a3a20'); P.poly([[39, 8], [58, 12], [39, 20]], '#d8c8a0');
  P.circ(24, 36, 3, null); P.circ(48, 38, 3, null);
  P.poly([[70, 30], [80, 34], [74, 40]], null);
  return P.render();
}
export function lighthouseSprite(on) {
  const P = new Pix(18, 44);
  P.poly([[4, 42], [14, 42], [12, 10], [6, 10]], '#f4f0ff');
  for (const y of [16, 26, 36]) P.rect(5, y, 8, 4, '#e84a5a');
  P.rect(5, 4, 8, 6, '#3a3a6a'); P.rect(6, 5, 6, 4, on ? { glow: '#fff6a0' } : { flat: '#8a8aa8' });
  P.poly([[4, 4], [9, 0], [14, 4]], '#e84a5a');
  return P.render();
}

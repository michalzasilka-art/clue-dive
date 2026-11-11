// Clue Dive: the ocean, one very tall painting (six ChatGPT paintings stacked: the harbour, the coral reef, the kelp
// forest with a shipwreck, the twilight zone, the midnight zone and the Lost City; built by Foxino/Clue Dive/Art/
// build_art.py into dive/art/sea-*.webp). World units: 320 wide; the teacher's 16:9 board shows a 320 × 180 window
// and a camera glides down as the class submarine dives; a phone shows the middle.
// On top, every frame, smooth and soft: sun beams, glints, bubbles (from vents and from the submarine's propeller),
// drifting fish, a turtle, a whale, jellyfish, marine snow and glowing specks in the deep, the darkness of the deep with
// the submarine's lights cutting through it, and the treasure's golden glow.
import { META } from './art/sea-meta.js?v=3';

const SEA = META.sea, PPU = SEA.w / 320;                  // painting pixels per world unit
export const W = 320, VH = 180, WH = Math.round(SEA.h / PPU);
const TOPS = SEA.tops.map((t) => t / PPU), PIC = SEA.pic / PPU;
export const SURFACE = Math.round(PIC * (META.surface ?? .3));   // the waterline in the harbour painting
export const FLOOR = Math.round(WH - PIC * (META.floor ?? .12)); // the sea floor in the Lost City painting
const NAMES = ['The Harbour', 'Coral Reef', 'Kelp Forest', 'Twilight Zone', 'Midnight Zone', 'The Lost City'];
export const ZONES = NAMES.map((n, i) => [n, i ? Math.round(TOPS[i] + 80 / PPU) : 0]);
export const zoneAt = (y) => { let z = ZONES[0][0]; for (const [n, top] of ZONES) if (y >= top) z = n; return z; };
export const depthM = (y) => Math.max(0, Math.round((y - SURFACE) * 3000 / (FLOOR - 30 - SURFACE)));   // the floor ≈ 3000 m
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random, rnd = (a, b) => a + R() * (b - a);
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const WATER = [[0, '#7fd0f8'], [SURFACE, '#5ad0f0'], [TOPS[1], '#2fa8d8'], [TOPS[2], '#1676b8'], [TOPS[3], '#0e4a8e'], [TOPS[4], '#0a2a62'], [TOPS[5], '#06143a'], [WH, '#040c26']];
export function waterAt(y) {
  for (let i = 1; i < WATER.length; i++) if (y <= WATER[i][0]) {
    const [y0, a] = WATER[i - 1], [y1, b] = WATER[i], f = clamp((y - y0) / (y1 - y0), 0, 1), p = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
    const A = p(a), B = p(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * f)).join(',')})`;
  }
  return '#040c26';
}
const art = (name) => { const im = new Image(); im.decoding = 'async'; im.src = new URL(`art/${name}.webp?v=3`, import.meta.url).href; return im; };
const has = (name) => !!META.sprites[name];

export function ocean(cv, { phone = false } = {}) {
  const g = cv.getContext('2d');
  let s = 1, vw = W, vh = VH, camY = 0, target = 0, onFrame = null, last = 0, sub = null;
  const slices = Array.from({ length: SEA.slices }, (_, i) => art(`sea-${i}`));
  const ready = Promise.all(slices.map((im) => (im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; }))));
  const SPR = Object.fromEntries(['fish-school', 'jellyfish', 'turtle', 'whale', 'treasure'].filter(has).map((n) => [n, art(n)]));
  const dark = document.createElement('canvas'), dg = dark.getContext('2d');
  const fit = () => {
    const cssW = cv.clientWidth || 960, cssH = cv.clientHeight || 540, dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = phone ? (cssW > cssH * 1.1 ? W : 190) : W;
    cv.width = Math.min(2400, Math.round(cssW * dpr)); cv.height = Math.round(cv.width * cssH / cssW);
    s = cv.width / vw; vh = cv.height / s;
    dark.width = Math.ceil(cv.width / 3); dark.height = Math.ceil(cv.height / 3);   // the darkness is soft: a third of the size is plenty
  };
  fit(); addEventListener('resize', fit);
  const x0 = () => (W - vw) / 2;
  const X = (x) => (x - x0()) * s, Y = (y) => (y - camY) * s;
  const seen = (a, b) => b > camY - 10 && a < camY + vh + 10;

  // life
  const schools = Array.from({ length: 6 }, (_, i) => ({ y: rnd(SURFACE + 40, TOPS[3]), x: rnd(0, W), v: (R() < .5 ? -1 : 1) * rnd(7, 13), k: rnd(.7, 1.1), ph: R() * 6 }));
  const jellies = Array.from({ length: 10 }, () => ({ x: rnd(30, 290), y: rnd(TOPS[3], FLOOR - 60), ph: R() * 6, k: rnd(.6, 1) }));
  const bubbles = [], snow = Array.from({ length: 80 }, () => ({ x: R() * W, y: R(), r: rnd(.3, .9) })), specks = Array.from({ length: 70 }, () => ({ x: R() * W, y: rnd(TOPS[4], WH), ph: R() * 9, c: R() < .5 ? '120,240,255' : '255,110,230' }));
  const vents = Array.from({ length: 18 }, () => ({ x: R() < .5 ? rnd(8, 40) : rnd(280, 312), y: rnd(TOPS[1], FLOOR), t: R() * 3 }));
  let turtle = { x: W + 60, y: rnd(TOPS[1], TOPS[2]), next: 2500 }, whale = { x: -120, next: 5000 };

  function sprite(name, x, y, w, flip, alpha = 1) {   // x, y: the centre, w: the width in world units
    const im = SPR[name]; if (!im || !im.complete || !im.naturalWidth) return;
    const ww = w * s, hh = ww * im.naturalHeight / im.naturalWidth;
    g.globalAlpha = alpha;
    if (flip) { g.save(); g.translate(X(x), Y(y)); g.scale(-1, 1); g.drawImage(im, -ww / 2, -hh / 2, ww, hh); g.restore(); }
    else g.drawImage(im, X(x) - ww / 2, Y(y) - hh / 2, ww, hh);
    g.globalAlpha = 1;
  }
  function frame(t) {
    requestAnimationFrame(frame);
    if (t - last < 28) return;
    const dt = Math.min(.1, (t - (last || t)) / 1000); last = t;
    camY += (target - camY) * .08; if (Math.abs(target - camY) < .02) camY = target;
    const cw = cv.width, ch = cv.height;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    // the painting (water colour first, so nothing flashes while a slice loads)
    const bg = g.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, waterAt(camY)); bg.addColorStop(1, waterAt(camY + vh)); g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    const sp = SEA.slice / PPU;
    slices.forEach((im, i) => {
      const top = i * sp; if (top > camY + vh + 2 || top + sp < camY - 2 || !im.complete || !im.naturalWidth) return;
      g.drawImage(im, X(0), Y(top), W * s, im.naturalHeight / PPU * s + 1);
    });
    // sun beams in the bright water
    if (seen(SURFACE, TOPS[2] + 200)) {
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) {
        const bx = 24 + k * 55 + 14 * Math.sin(t / 5200 + k), wd = 14 + (k % 3) * 8, glow = .5 + .5 * Math.sin(t / 2600 + k * 1.7), y0 = SURFACE + 4, y1 = TOPS[2] + 160;
        const gr = g.createLinearGradient(0, Y(y0), 0, Y(y1)); gr.addColorStop(0, `rgba(230,250,255,${.16 * glow})`); gr.addColorStop(1, 'rgba(230,250,255,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(X(bx - wd / 2), Y(y0)); g.lineTo(X(bx + wd / 2), Y(y0)); g.lineTo(X(bx + wd * 1.4 + (y1 - y0) * .25), Y(y1)); g.lineTo(X(bx - wd * .6 + (y1 - y0) * .25), Y(y1)); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    // fish, a turtle, a whale
    for (const f of schools) {
      f.x += f.v * dt; if (f.x > W + 60) f.x = -60; if (f.x < -60) f.x = W + 60;
      const y = f.y + Math.sin(t / 1400 + f.ph) * 6; if (seen(y - 20, y + 20)) sprite('fish-school', f.x, y, 46 * f.k, f.v > 0);
    }
    if (t > turtle.next) { turtle.x -= 8 * dt; const y = turtle.y + Math.sin(t / 1600) * 5; if (seen(y - 20, y + 20)) sprite('turtle', turtle.x, y, 34, false); if (turtle.x < -50) { turtle.x = W + 50; turtle.y = rnd(TOPS[1] + 40, TOPS[3]); turtle.next = t + rnd(9000, 20000); } }
    if (t > whale.next) { whale.x += 6 * dt; const y = TOPS[3] + 120 + Math.sin(t / 2600) * 8; if (seen(y - 40, y + 40)) sprite('whale', whale.x, y, 120, true, .85); if (whale.x > W + 130) { whale.x = -130; whale.next = t + rnd(15000, 32000); } }
    // bubbles
    for (const v of vents) { if (!seen(v.y - 60, v.y)) continue; v.t -= dt; if (v.t <= 0) { v.t = rnd(.2, .9); bubbles.push({ x: v.x, y: v.y, v: rnd(12, 22), r: rnd(.6, 1.6), life: rnd(2, 4) }); } }
    if (sub) { const n = sub.moving ? 3 : R() < .5 ? 1 : 0; for (let i = 0; i < n; i++) bubbles.push({ x: sub.prop.x + rnd(-2, 2), y: sub.prop.y + rnd(-4, 4), v: rnd(10, 24), r: rnd(.6, 1.8), life: rnd(1.2, 2.6) }); }
    g.lineWidth = Math.max(1, .3 * s);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.life -= dt; b.y -= b.v * dt; b.x += Math.sin(b.y / 7) * .12;
      if (b.life <= 0 || b.y < SURFACE) { bubbles.splice(i, 1); continue; }
      if (!seen(b.y, b.y)) continue;
      const x = X(b.x), y = Y(b.y), r = b.r * s;
      g.strokeStyle = 'rgba(235,252,255,.7)'; g.fillStyle = 'rgba(235,252,255,.12)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * .35, y - r * .35, r * .3, 0, 7); g.fill();
    }
    if (bubbles.length > 400) bubbles.splice(0, bubbles.length - 400);
    // jellyfish and marine snow in the deep
    for (const j of jellies) { const y = j.y + Math.sin(t / 2600 + j.ph) * 18, k = 1 + Math.sin(t / 500 + j.ph) * .06; if (seen(y - 20, y + 20)) sprite('jellyfish', j.x + Math.sin(t / 3000 + j.ph) * 8, y, 16 * j.k * k, false, .9); }
    if (camY + vh > TOPS[3] - 100) {
      for (const f of snow) { f.y = (f.y + dt * .018) % 1; const y = camY + f.y * vh, a = smooth(TOPS[3] - 100, TOPS[3] + 200, y); if (a <= 0) continue; g.fillStyle = `rgba(210,225,255,${.45 * a})`; g.beginPath(); g.arc(X(f.x + Math.sin(t / 2000 + f.x) * 4), f.y * ch, f.r * s * .5, 0, 7); g.fill(); }
    }
    // the darkness of the deep, with the submarine's lights cut out of it (drawn small and soft, then stretched)
    const dk = smooth(TOPS[3] - 150, TOPS[5], camY + vh / 2) * (phone ? .45 : .72);
    if (dk > .01) {
      const k = dark.width / cw;
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, dark.width, dark.height); dg.fillStyle = '#01040f'; dg.fillRect(0, 0, dark.width, dark.height);
      if (sub) {
        dg.globalCompositeOperation = 'destination-out';
        const cx = X(sub.x) * k, cy = Y(sub.y) * k, r = sub.w * .8 * s * k;
        const rg = dg.createRadialGradient(cx, cy, r * .25, cx, cy, r); rg.addColorStop(0, 'rgba(0,0,0,.95)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        dg.fillStyle = rg; dg.beginPath(); dg.ellipse(cx, cy, r * 1.25, r, 0, 0, 7); dg.fill();
        // the searchlight: a cone ahead and a little down from the nose lamp
        const lx = X(sub.lamp.x) * k, ly = Y(sub.lamp.y) * k, len = 170 * s * k, sway = Math.sin(t / 1800) * .06, ang = .2 + sway;
        const cg = dg.createLinearGradient(lx, ly, lx + len * Math.cos(ang), ly + len * Math.sin(ang)); cg.addColorStop(0, 'rgba(0,0,0,.9)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
        dg.fillStyle = cg; dg.beginPath(); dg.moveTo(lx, ly - 2); dg.lineTo(lx + len * Math.cos(ang - .32), ly + len * Math.sin(ang - .32)); dg.lineTo(lx + len * Math.cos(ang + .32), ly + len * Math.sin(ang + .32)); dg.lineTo(lx, ly + 2); dg.fill();
      }
      g.globalAlpha = dk; g.drawImage(dark, 0, 0, cw, ch); g.globalAlpha = 1;
      // what glows shines through the dark
      g.globalCompositeOperation = 'lighter';
      for (const p of specks) { if (!seen(p.y, p.y)) continue; const a = Math.sin(t / 650 + p.ph); if (a < .1) continue; const x = X(p.x + Math.sin(t / 3000 + p.ph) * 6), y = Y(p.y), r = 1.6 * s; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${p.c},${.9 * a * dk})`); rg.addColorStop(1, `rgba(${p.c},0)`); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
      if (sub) { const lx = X(sub.lamp.x), ly = Y(sub.lamp.y), r = 7 * s, rg = g.createRadialGradient(lx, ly, 0, lx, ly, r); rg.addColorStop(0, `rgba(255,248,210,${.8 * dk})`); rg.addColorStop(1, 'rgba(255,248,210,0)'); g.fillStyle = rg; g.fillRect(lx - r, ly - r, r * 2, r * 2); }
      g.globalCompositeOperation = 'source-over';
    }
    // the treasure on the floor, and its golden glow
    if (seen(FLOOR - 70, FLOOR + 20)) {
      sprite('treasure', W / 2, FLOOR - 12 + Math.sin(t / 900) * .6, 44, false);
      const p = .7 + .3 * Math.sin(t / 650), cx = X(W / 2), cy = Y(FLOOR - 10), r = 50 * s;
      g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, `rgba(255,210,80,${.35 * p})`); rg.addColorStop(1, 'rgba(255,210,80,0)'); g.fillStyle = rg; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
    }
    if (onFrame) onFrame(camY, t, dk);
  }
  requestAnimationFrame(frame);
  const api = {
    ready,
    get y() { return camY; }, get viewH() { return vh; }, get viewW() { return vw; }, get scale() { return s; },
    look(y, now) { target = clamp(y, 0, WH - vh); if (now) camY = target; },
    rest(now) { target = 0; if (now) camY = target; },
    onFrame(fn) { onFrame = fn; },
    setSub(o) { sub = o; },
    burst(x, y, n = 20) { for (let i = 0; i < n; i++) bubbles.push({ x: x + rnd(-10, 10), y: y + rnd(-8, 8), v: rnd(14, 34), r: rnd(.6, 2), life: rnd(1, 2.4) }); },
  };
  (window.CDW ||= []).push(api);   // for testing in the browser console
  return api;
}

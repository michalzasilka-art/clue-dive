// Clue Dive: the ocean, a tall pixel-art world drawn in code. World units: 320 wide, 2600 tall; the teacher's 16:9
// board shows a 320 × 180 window of it and a camera glides down as the class submarine dives; a phone shows the middle.
// Top to bottom: the harbour (sky, a lighthouse island, the waves) → the coral reef → the kelp forest with a shipwreck →
// the twilight zone → the midnight zone → the Lost City on the sea floor with the treasure.
// The still scenery is built once into one picture (1 pixel per world unit); on top, every frame, in whole pixels:
// clouds and gulls, waves, light rays, caustics, bubbles, shoals of fish, a turtle, swaying kelp, jellyfish, a whale,
// marine snow and glowing deep-sea life, then the darkness of the deep with the submarine's lights cutting through it.
import { rng, canvas, mix, clamp, fishSprite, jellySprite, whaleSprite, turtleSprite, gullSprite, chestSprite, coralSprite, columnSprite, wreckSprite, lighthouseSprite } from './sea-art.js';

export const W = 320, VH = 180, WH = 2600, SURFACE = 112, FLOOR = 2548;
export const ZONES = [['The Harbour', 0], ['Coral Reef', 300], ['Kelp Forest', 700], ['Twilight Zone', 1100], ['Midnight Zone', 1550], ['The Lost City', 2050]];
export const zoneAt = (y) => { let z = ZONES[0][0]; for (const [n, top] of ZONES) if (y >= top) z = n; return z; };
export const depthM = (y) => Math.max(0, Math.round((y - SURFACE) * 1.25));   // the Lost City floor ≈ 3000 m
const R = Math.random, rnd = (a, b) => a + R() * (b - a);
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const step = (a, n = 4) => Math.round(a * n) / n;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + .5) / 16;

const WATER = [[SURFACE, '#6ad6f2'], [300, '#3ab2e0'], [700, '#1a7cc2'], [1100, '#104e98'], [1550, '#0a2c6a'], [2050, '#081c48'], [WH, '#050f2e']];
const SKY = [[0, '#58b4fa'], [SURFACE, '#c4ecff']];
function stopsAt(stops, y) {
  for (let i = 1; i < stops.length; i++) if (y <= stops[i][0]) { const [y0, c0] = stops[i - 1], [y1, c1] = stops[i]; return mix(c0, c1, clamp((y - y0) / (y1 - y0), 0, 1)); }
  return stops[stops.length - 1][1];
}
export const waterAt = (y) => (y < SURFACE ? stopsAt(SKY, y) : stopsAt(WATER, y));
const rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// ---------- the still scenery, built once ----------
function noise1(seed) { const r = rng(seed), pts = Array.from({ length: 400 }, () => r()); return (x) => { const i = Math.floor(x), f = x - i, a = pts[((i % 400) + 400) % 400], b = pts[(((i + 1) % 400) + 400) % 400]; return a + (b - a) * f * f * (3 - 2 * f); }; }
function buildScenery() {
  const c = canvas(W, WH), g = c.getContext('2d'), img = g.createImageData(W, WH), d = img.data, r = rng(11);
  const n1 = noise1(3), n2 = noise1(7), n3 = noise1(13), n4 = noise1(21);
  // the walls of the deep: left edge xl(y), right edge xr(y)
  const wallL = (y) => { if (y < 260) return -1; const k = smooth(260, 420, y), deep = y > 1100 ? 14 : 0; return k * (12 + 22 * n1(y / 70) + 9 * n2(y / 19) + deep + (y > 2050 ? 10 : 0)); };
  const wallR = (y) => { if (y < 260) return W + 1; const k = smooth(260, 420, y), deep = y > 1100 ? 14 : 0; return W - k * (12 + 22 * n3(y / 70) + 9 * n4(y / 19) + deep + (y > 2050 ? 10 : 0)); };
  // cobblestones: jittered cells, the nearest centre owns the pixel
  const CW = 12, CH = 8, hsh = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const stone = (x, y) => {
    const gx = Math.floor(x / CW), gy = Math.floor(y / CH); let d1 = 1e9, d2 = 1e9, own = null;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = gx + i, cy = gy + j, ox = (cx + .2 + hsh(cx, cy) * .6) * CW, oy = (cy + .2 + hsh(cy, cx + 7) * .6) * CH, d = ((x - ox) / CW) ** 2 * 1.4 + ((y - oy) / CH) ** 2;
      if (d < d1) { d2 = d1; d1 = d; own = [ox, oy, hsh(cx + 3, cy + 5)]; } else if (d < d2) d2 = d;
    }
    return { crack: Math.sqrt(d2) - Math.sqrt(d1) < .13, dy: y - own[1], v: own[2] };
  };
  // a palette of 40 water steps, dithered between neighbours (pixel-art banding)
  const N = 40, pal = Array.from({ length: N }, (_, i) => rgb(waterAt(i / (N - 1) * WH)));
  for (let y = 0; y < WH; y++) {
    const fi = y / WH * (N - 1), xl = wallL(y), xr = wallR(y), wc = waterAt(y), rockC = mix(wc, '#22163a', .5);
    const rock = rgb(rockC), rockA = rgb(mix(rockC, '#3a2a4a', .25)), rockB = rgb(mix(rockC, '#2a4a6a', .2)), lite = rgb(mix(rockC, '#e8f4ff', .2)), mid = rgb(mix(rockC, '#05030c', .28)), rim = rgb(mix(wc, '#e8f4ff', .3)), dark = rgb(mix(rockC, '#05030c', .62));
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; let col;
      if (y >= FLOOR + 6 * n2(x / 23) - 3) {   // the sea floor: dark sand with ripples
        const sand = rgb(mix('#3a3a62', '#5a5274', bayer(x, y) > .5 && (x + y * 3) % 7 === 0 ? 1 : 0)); col = sand;
      } else if (x < xl || x > xr) {
        const edge = x < xl ? xl - x : x - xr;
        if (edge < 1.5) col = rim;
        else {   // boulders: each pixel belongs to the nearest stone; cracks between stones, lit tops, shaded bottoms
          const st = stone(x, y), base = st.v < .33 ? rockA : st.v < .66 ? rock : rockB;
          col = st.crack ? dark : st.dy < -2.2 ? lite : st.dy > 2.6 ? mid : base;
          if (!st.crack && bayer(x, y) > .9 && st.v > .5) col = lite;
        }
      } else {
        const k = Math.min(N - 1, Math.floor(fi + bayer(x, y))); col = pal[k];
        if (y < SURFACE) col = rgb(stopsAt(SKY, y + (bayer(x, y) - .5) * 6));
      }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const stamp = (im, x, y) => g.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height));
  const glows = [], kelps = [], vents = [];
  // the harbour: a rocky island with the lighthouse, a wooden pier
  g.fillStyle = '#4a5a7a'; g.beginPath(); g.moveTo(0, SURFACE + 6); g.lineTo(0, 84); g.lineTo(18, 74); g.lineTo(38, 80); g.lineTo(54, 96); g.lineTo(62, SURFACE + 6); g.fill();
  g.fillStyle = '#6a7a9a'; g.fillRect(18, 74, 20, 3); g.fillStyle = '#5aa04a'; g.fillRect(14, 74, 30, 2);
  for (let x = 228; x < 320; x += 12) { g.fillStyle = '#6a4a2a'; g.fillRect(x, 96, 3, 24); }
  g.fillStyle = '#9a6a3a'; g.fillRect(222, 92, 98, 5); g.fillStyle = '#c88a4a'; g.fillRect(222, 92, 98, 1);
  // the reef: corals along both walls
  for (let y = 330; y < 720; y += 14 + r() * 16) for (const side of [0, 1]) {
    if (r() < .3) continue;
    const inset = r() < .6 ? 4 + r() * 4 : -6 - r() * 10, x = side ? wallR(y) - inset : wallL(y) + inset;   // on the edge, or set into the rock
    stamp(coralSprite(['fan', 'branch', 'brain', 'anemone'][(r() * 4) | 0], (r() * 1e6) | 0), x, y + 6);
  }
  // kelp roots (the kelp itself sways every frame)
  for (let y = 560; y < 1120; y += 14 + r() * 18) for (const side of [0, 1]) { if (r() < .35) continue; kelps.push({ x: side ? wallR(y) - 3 - r() * 4 : wallL(y) + 3 + r() * 4, y, h: 40 + r() * 70, ph: r() * 6, side }); }
  // the shipwreck resting on the right wall
  stamp(wreckSprite(), W - 52, 968);
  // glowing plants in the deep
  for (let y = 1560; y < 2400; y += 10 + r() * 16) for (const side of [0, 1]) {
    if (r() < .4) continue; const x = side ? wallR(y) - 6 : wallL(y) + 6, sp = coralSprite('glowplant', (r() * 1e6) | 0);
    stamp(sp, x, y + 6); glows.push({ im: sp, x: Math.round(x - sp.width / 2), y: Math.round(y + 6 - sp.height), ph: r() * 6 });
  }
  // the Lost City: columns on the walls and the floor, an arch, the treasure
  for (let y = 2080; y < 2520; y += 30 + r() * 30) for (const side of [0, 1]) if (r() < .7) stamp(columnSprite(30 + ((r() * 30) | 0), r() < .5, (r() * 1e6) | 0), side ? wallR(y) - 8 : wallL(y) + 8, y + 8);
  for (const [x, h, br] of [[70, 56, false], [106, 40, true], [214, 44, true], [250, 60, false]]) stamp(columnSprite(h, br, x), x, FLOOR + 3);
  g.fillStyle = '#6a7ab0'; g.fillRect(64, FLOOR - 56, 54, 6); g.fillStyle = '#7a8ac0'; g.fillRect(64, FLOOR - 56, 54, 1);
  stamp(chestSprite(), W / 2, FLOOR + 2);
  // vents that breathe bubbles
  for (let y = 420; y < 2400; y += 90 + r() * 120) { const side = r() < .5; vents.push({ x: side ? wallL(y) + 1 : wallR(y) - 1, y, t: r() * 4 }); }
  return { c, glows, kelps, vents, wallL, wallR };
}

// ---------- the scene ----------
export function ocean(cv, { phone = false } = {}) {
  const g = cv.getContext('2d');
  let s = 1, vw = W, vh = VH, camY = 0, target = 0, onFrame = null, last = 0, free = false;
  let sc = null; const ready = new Promise((ok) => setTimeout(() => { sc = buildScenery(); ok(); }, 0));
  let sub = null;    // { x, y, w, h, lamp: { x, y } } in world units, set by the board
  const fit = () => {
    const cssW = cv.clientWidth || 960, cssH = cv.clientHeight || 540;
    vw = phone ? (cssW > cssH * 1.1 ? W : 190) : W;
    s = cssW / vw >= 3.5 ? 2 : 1;
    cv.width = Math.round(vw * s); cv.height = Math.round(cv.width * cssH / cssW); vh = cv.height / s;
    g.imageSmoothingEnabled = false; dark.width = cv.width; dark.height = cv.height;
  };
  const dark = canvas(10, 10), dg = dark.getContext('2d');
  fit(); addEventListener('resize', fit);
  const x0 = () => (W - vw) / 2;
  const X = (x) => Math.round((x - x0()) * s), Y = (y) => Math.round((y - camY) * s);
  const seen = (a, b) => b > camY - 8 && a < camY + vh + 8;
  const blit = (im, x, y) => g.drawImage(im, x, y, im.width * s, im.height * s);

  // living things
  const FISH = ['gold', 'blue', 'pink', 'lime', 'silver'].map((k) => [fishSprite(k, 0), fishSprite(k, 1)]);
  const JELLY = [[jellySprite(0), jellySprite(1)], [jellySprite(0, '#7ac8ff'), jellySprite(1, '#7ac8ff')]];
  const WHALE = [whaleSprite(0), whaleSprite(1)], TURTLE = [turtleSprite(0), turtleSprite(1)], GULL = [gullSprite(0), gullSprite(1)];
  const LIGHT = [lighthouseSprite(false), lighthouseSprite(true)];
  const r0 = rng(5);
  const schools = Array.from({ length: 9 }, (_, i) => ({ kind: (r0() * 5) | 0, y: 160 + r0() * 900, x: r0() * W, v: (r0() < .5 ? -1 : 1) * (8 + r0() * 8), n: 4 + ((r0() * 8) | 0), ph: r0() * 6 }));
  const jellies = Array.from({ length: 14 }, () => ({ x: 20 + r0() * 280, y: 1100 + r0() * 1300, ph: r0() * 6, k: (r0() * 2) | 0 }));
  const bubbles = [], snow = Array.from({ length: 70 }, () => ({ x: r0() * W, y: r0() })), twinkles = Array.from({ length: 60 }, () => ({ x: r0() * W, y: 1500 + r0() * 1050, ph: r0() * 9, c: r0() < .5 ? '#3af0ff' : '#ff6ae0' }));
  let whale = { x: -80, next: 6000 }, turtle = { x: 400, next: 3000, y: 420 }, gulls = Array.from({ length: 3 }, () => ({ x: r0() * W, y: 20 + r0() * 50, v: 6 + r0() * 6 }));
  const clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 90 + r0() * 40, y: 14 + r0() * 40, w: 26 + r0() * 30, v: 1.5 + r0() * 2 }));

  function frame(t) {
    requestAnimationFrame(frame);
    if (t - last < 30) return;
    const dt = Math.min(.1, (t - (last || t)) / 1000); last = t;
    camY += (target - camY) * .08; if (Math.abs(target - camY) < .05) camY = target;
    const cw = cv.width, ch = cv.height;
    g.imageSmoothingEnabled = false;
    if (!sc) { g.fillStyle = waterAt(camY + vh / 2); g.fillRect(0, 0, cw, ch); if (onFrame) onFrame(camY, t); return; }
    // the still scenery: the visible strip of the big picture, 1 world unit = s canvas pixels
    const sy = Math.floor(camY), off = (camY - sy) * s;
    g.drawImage(sc.c, Math.round(x0()), sy, Math.round(vw), Math.ceil(vh) + 2, 0, -Math.round(off), Math.round(vw) * s, (Math.ceil(vh) + 2) * s);

    // the sky and the harbour
    if (seen(0, SURFACE + 10)) {
      g.fillStyle = '#fff6c8'; const sx = X(272), syy = Y(30); g.globalAlpha = .9; g.fillRect(sx - 6 * s, syy - 6 * s, 12 * s, 12 * s); g.fillRect(sx - 8 * s, syy - 4 * s, 16 * s, 8 * s); g.fillRect(sx - 4 * s, syy - 8 * s, 8 * s, 16 * s); g.globalAlpha = 1;
      for (const cl of clouds) {
        cl.x += cl.v * dt; if (cl.x > W + 40) cl.x = -cl.w - 20;
        g.fillStyle = '#ffffff'; const x = X(cl.x), y = Y(cl.y), w = Math.round(cl.w * s), h = 4 * s;
        g.fillRect(x, y, w, h); g.fillRect(x + w * .15, y - h, w * .45, h); g.fillRect(x + w * .45, y - h * 1.6, w * .3, h); g.fillStyle = '#d8eeff'; g.fillRect(x, y + h - s, w, s);
      }
      for (const gl of gulls) { gl.x += gl.v * dt; if (gl.x > W + 10) gl.x = -10; blit(GULL[((t / 220) | 0) % 2], X(gl.x), Y(gl.y + Math.sin(t / 700 + gl.v) * 3)); }
      blit(LIGHT[((t / 900) | 0) % 2], X(28) - 9 * s, Y(76) - 44 * s);
    }
    // the waves
    if (seen(SURFACE - 6, SURFACE + 8)) {
      for (let x = 0; x < W; x++) {
        const wy = SURFACE + Math.round(Math.sin(x / 9 + t / 600) * 1.4 + Math.sin(x / 23 - t / 900) * 1.2);
        g.fillStyle = '#c4ecff'; g.fillRect(X(x), Y(SURFACE - 4), s, Y(wy) - Y(SURFACE - 4));
        g.fillStyle = '#ffffff'; g.fillRect(X(x), Y(wy), s, s);
        if ((x + ((t / 120) | 0)) % 17 === 0) g.fillRect(X(x), Y(wy) - s, s, s);
      }
    }
    // sun rays and caustics in the bright water
    if (seen(SURFACE, 760)) {
      g.globalCompositeOperation = 'lighter'; g.fillStyle = '#e8fbff';
      for (let k = 0; k < 6; k++) {
        const bx = 20 + k * 58 + 14 * Math.sin(t / 5000 + k), wdt = 10 + (k % 3) * 6, glow = .5 + .5 * Math.sin(t / 2400 + k * 1.7);
        const top = Math.max(0, Y(SURFACE)), bot = Math.min(ch - 1, Y(760));
        for (let yy = top; yy <= bot; yy += 1) {
          const wy = camY + yy / s, f = (wy - SURFACE) / (760 - SURFACE), a = step(.09 * glow * (1 - f) * Math.min(1, f * 8), 40); if (a <= 0) continue;
          g.globalAlpha = a; g.fillRect(X(bx + (wy - SURFACE) * .3 - wdt / 2), yy, Math.round(wdt * s), 1);
        }
      }
      g.globalAlpha = 1;
      for (let k = 0; k < 40; k++) {   // caustics: little light ripples near the top
        const cx = (k * 37 + t / 50 * ((k % 3) + 1)) % W, cy = SURFACE + 6 + ((k * 53) % 150);
        if (!seen(cy, cy)) continue;
        g.globalAlpha = step(.35 * (.5 + .5 * Math.sin(t / 300 + k)) * (1 - (cy - SURFACE) / 160), 4); g.fillRect(X(cx), Y(cy), 3 * s, s);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    // kelp: stacked leaves that sway
    for (const k of sc.kelps) {
      if (!seen(k.y - k.h, k.y)) continue;
      for (let i = 0; i < k.h; i += 2) {
        const f = i / k.h, x = k.x + Math.sin(t / 900 + k.ph + f * 3) * f * 7 + (k.side ? -1 : 1) * f * 6, y = k.y - i;
        g.fillStyle = i % 6 < 3 ? '#3aa04a' : '#2a7a3a'; g.fillRect(X(x), Y(y), 2 * s, 2 * s);
        if (i % 8 === 0 && i > 4) { g.fillStyle = '#5ac85a'; g.fillRect(X(x + (i % 16 ? 2 : -3)), Y(y), 3 * s, s); }
      }
    }
    // shoals of fish, a turtle, the whale
    for (const sh of schools) {
      sh.x += sh.v * dt; if (sh.x > W + 60) sh.x = -60; if (sh.x < -60) sh.x = W + 60;
      if (!seen(sh.y - 20, sh.y + 20)) continue;
      const fr = FISH[sh.kind];
      for (let i = 0; i < sh.n; i++) {
        const fx = sh.x - Math.sign(sh.v) * (i % 4) * 9 + Math.sin(t / 500 + i) * 2, fy = sh.y + ((i * 7) % 15) - 7 + Math.sin(t / 700 + i + sh.ph) * 3;
        const im = fr[((t / 200 + i) | 0) % 2];
        if (sh.v > 0) { g.save(); g.translate(X(fx) + im.width * s, Y(fy)); g.scale(-1, 1); g.drawImage(im, 0, 0, im.width * s, im.height * s); g.restore(); } else blit(im, X(fx), Y(fy));
      }
    }
    if (t > turtle.next && seen(300, 700)) { turtle.x -= 9 * dt; if (turtle.x < -40) { turtle.x = W + 40; turtle.y = rnd(330, 680); turtle.next = t + rnd(8000, 20000); } if (seen(turtle.y - 10, turtle.y + 10)) blit(TURTLE[((t / 500) | 0) % 2], X(turtle.x), Y(turtle.y + Math.sin(t / 900) * 3)); }
    if (t > whale.next && seen(1080, 1500)) { whale.x += 7 * dt; if (whale.x > W + 80) { whale.x = -80; whale.next = t + rnd(15000, 30000); } const im = WHALE[((t / 800) | 0) % 2]; g.save(); g.translate(X(whale.x) + im.width * s, Y(1260 + Math.sin(t / 2000) * 6)); g.scale(-1, 1); g.globalAlpha = .75; g.drawImage(im, 0, 0, im.width * s, im.height * s); g.restore(); g.globalAlpha = 1; }
    // bubbles: from vents, and from the submarine's propeller
    for (const v of sc.vents) { if (!seen(v.y - 40, v.y)) continue; v.t -= dt; if (v.t <= 0) { v.t = rnd(.15, .6); bubbles.push({ x: v.x + rnd(-1, 1), y: v.y, v: rnd(10, 18), r: R() < .3 ? 2 : 1, life: rnd(2, 4) }); } }
    if (sub) { const n = sub.moving ? 3 : R() < .5 ? 1 : 0; for (let i = 0; i < n; i++) bubbles.push({ x: sub.prop.x + rnd(-2, 2), y: sub.prop.y + rnd(-3, 3), v: rnd(8, 20), r: R() < .4 ? 2 : 1, life: rnd(1.2, 2.6) }); }
    g.fillStyle = '#e8fbff';
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.life -= dt; b.y -= b.v * dt; b.x += Math.sin(b.y / 6) * .15;
      if (b.life <= 0 || b.y < SURFACE) { bubbles.splice(i, 1); continue; }
      if (!seen(b.y, b.y)) continue;
      g.globalAlpha = .75; const x = X(b.x), y = Y(b.y);
      if (b.r > 1) { g.fillRect(x, y - s, s * 2, s); g.fillRect(x - s, y, s, s * 2); g.fillRect(x + 2 * s, y, s, s * 2); g.fillRect(x, y + 2 * s, s * 2, s); } else g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1; if (bubbles.length > 400) bubbles.splice(0, bubbles.length - 400);
    // jellyfish drifting in the deep
    for (const j of jellies) { const y = j.y + Math.sin(t / 2600 + j.ph) * 20; if (!seen(y - 14, y + 14)) continue; blit(JELLY[j.k][((t / 450 + j.ph) | 0) % 2], X(j.x + Math.sin(t / 3000 + j.ph) * 8), Y(y)); }
    // marine snow in the deep
    if (camY + vh > 1000) {
      g.fillStyle = '#c8d8ff';
      for (const f of snow) { f.y = (f.y + dt * .02) % 1; const y = camY + f.y * vh, a = smooth(1000, 1500, y); if (a <= 0) continue; g.globalAlpha = .5 * a; g.fillRect(X(f.x + Math.sin(t / 2000 + f.x) * 4), Math.round(f.y * ch), s, s); }
      g.globalAlpha = 1;
    }

    // the darkness of the deep, with the submarine's lights carved out of it
    const dk = smooth(950, 2150, camY + vh / 2) * (phone ? .5 : .78);
    if (dk > .01) {
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, cw, ch); dg.fillStyle = '#01040f'; dg.fillRect(0, 0, cw, ch);
      if (sub) {
        dg.globalCompositeOperation = 'destination-out';
        const cx = X(sub.x), cy = Y(sub.y);
        for (const [r, a] of [[sub.w * .95, .35], [sub.w * .75, .35], [sub.w * .58, .5]]) {
          dg.globalAlpha = a; dg.fillStyle = '#000'; const rr = r * s;
          for (let yy = -rr; yy <= rr; yy += s) { const hw = Math.sqrt(rr * rr - yy * yy) * 1.15; dg.fillRect(Math.round(cx - hw), Math.round(cy + yy), Math.round(hw * 2), s); }
        }
        // the searchlight: a cone ahead and down from the nose lamp
        const lx = X(sub.lamp.x), ly = Y(sub.lamp.y), len = 150 * s, sway = Math.sin(t / 1800) * .08;
        for (const [spread, a] of [[.42, .3], [.28, .45]]) {
          dg.globalAlpha = a;
          for (let i = 0; i < len; i += s) { const hw = i * spread + 2 * s, cy2 = ly + i * (.22 + sway); dg.fillRect(lx + i, Math.round(cy2 - hw), s, Math.round(hw * 2)); }
        }
        dg.globalAlpha = 1;
      }
      g.globalAlpha = step(dk, 20); g.drawImage(dark, 0, 0); g.globalAlpha = 1;
      // what glows shines through the dark
      g.globalCompositeOperation = 'lighter';
      for (const gp of sc.glows) { if (!seen(gp.y, gp.y + gp.im.height)) continue; g.globalAlpha = step(.35 + .3 * Math.sin(t / 700 + gp.ph), 6) * dk; blit(gp.im, X(gp.x), Y(gp.y)); }
      for (const tw of twinkles) { if (!seen(tw.y, tw.y)) continue; const a = Math.sin(t / 600 + tw.ph); if (a < .3) continue; g.globalAlpha = step(a, 3) * dk; g.fillStyle = tw.c; g.fillRect(X(tw.x + Math.sin(t / 3000 + tw.ph) * 6), Y(tw.y), s, s); }
      for (const j of jellies) { const y = j.y + Math.sin(t / 2600 + j.ph) * 20; if (!seen(y - 14, y + 14)) continue; g.globalAlpha = .45 * dk; blit(JELLY[j.k][((t / 450 + j.ph) | 0) % 2], X(j.x + Math.sin(t / 3000 + j.ph) * 8), Y(y)); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    // the treasure's golden glow on the floor
    if (seen(FLOOR - 60, FLOOR + 10)) {
      g.globalCompositeOperation = 'lighter'; const p = .7 + .3 * Math.sin(t / 600);
      for (const [r, a] of [[34, .05], [22, .08], [12, .12]]) { g.globalAlpha = step(a * p, 50); g.fillStyle = '#ffd24a'; const rr = r * s, cx = X(W / 2), cy = Y(FLOOR - 8); for (let yy = -rr; yy <= rr; yy += s) { const hw = Math.sqrt(rr * rr - yy * yy); g.fillRect(Math.round(cx - hw), Math.round(cy + yy), Math.round(hw * 2), s); } }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (onFrame) onFrame(camY, t, dk);
  }
  requestAnimationFrame(frame);
  const api = {
    ready,
    get y() { return camY; }, get viewH() { return vh; }, get viewW() { return vw; }, get scale() { return s; },
    look(y, now) { free = true; target = clamp(y, 0, WH - vh); if (now) camY = target; },
    rest(now) { free = false; target = 0; if (now) camY = target; },
    onFrame(fn) { onFrame = fn; },
    setSub(o) { sub = o; },
    burst(x, y, n = 20) { for (let i = 0; i < n; i++) bubbles.push({ x: x + rnd(-8, 8), y: y + rnd(-6, 6), v: rnd(14, 34), r: R() < .4 ? 2 : 1, life: rnd(1, 2.4) }); },
    darkAt: (y) => smooth(950, 2150, y) * (phone ? .5 : .78),
  };
  (window.CDW ||= []).push(api);   // for testing in the browser console
  return api;
}

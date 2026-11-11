// Clue Dive uses Clue Quest's pixel heroes: our six Foxino characters and six winter animals, each a 16×16 map (one letter per
// pixel, '.' see-through, 'k' the dark outline), drawn on a 16×22 canvas so a hat fits on top. `hat: [x, y]` is
// where a hat sits: the head's top row and its middle column. Fixed traits follow the vault's Character Creation
// Rules (Foxino: purple-and-orange fox, green eyes, yellow T-shirt, orange shorts; Stella: orange fox, purple streak,
// side braid, teal eyes, blue overalls with a yellow star; Pix: green elf, eyes ALWAYS under her lime bangs, purple
// cap with an orange brim; Charlie: lavender ghost, purple hair, sleepy eyes, black hoodie with a skull, headphones
// with an orange X; Rob: cyan robot, black screen face, heart antenna, orange battery window; Gummy: pink-and-blue
// gummy alien, curly antennae, big purple eyes, buck teeth).

const K = '#1d1430';
export const HEROES = [
  // ---- our characters ----
  { id: 'foxino', name: 'Foxino', ours: true, hat: [7, 3], pal: { p: '#8a4ad0', P: '#5e2e9a', o: '#f2802a', w: '#fff4e4', g: '#4ad06a', y: '#ffd23a', e: K }, map: [
    '.kk..........kk.',
    '.kpk........kok.',
    '.kPpk......kook.',
    '.kpppkkkkkkoook.',
    '.kppppppoooooook',
    '.kpppppoooooook.',
    '.kppwgppoowgook.',
    '.kppggppooggook.',
    '.kpwwwwwwwwwwok.',
    '.kowwwwkkwwwwok.',
    '..kwwwkwwkwwwk..',
    '...kkyyyyyykk...',
    '..kpyyyyyyyypk..',
    '..kpkyyyyyykpk..',
    '...koookkoook...',
    '...kppk..kppk...'] },
  { id: 'stella', name: 'Stella', ours: true, hat: [7, 3], pal: { o: '#f2802a', O: '#c45a1a', p: '#9a4ae0', c: '#ffd8b0', w: '#fff4e4', t: '#2ac8c0', b: '#3a6ad8', y: '#ffd23a', e: K }, map: [
    '.kk..........kk.',
    '.kok........kok.',
    '.kock......kcok.',
    '.koockkkkkkcook.',
    '.koooppoooooook.',
    '.kooppoooooooko.',
    '.koowtoooowtook.',
    '.koottoooottook.',
    '.kowwwwwwwwwwok.',
    '.kowwwwkkwwwwok.',
    '.kokwwkwwkwwk...',
    '.kokkwbwwbwkk...',
    '.kokbbbybbbbk...',
    '.kpkbbyyybbbk...',
    '..k.kbbbkbbbk...',
    '....kook.kook...'] },
  { id: 'pix', name: 'Pix', ours: true, hat: [7, 0], pal: { u: '#7a3ad0', o: '#ff8a2a', l: '#a8f04a', L: '#7ac832', g: '#5cc85a', w: '#ffffff', s: '#8a90a8', S: '#5e6478', r: '#d8505a', e: K }, map: [
    '....kkkkkkkk....',
    '...kuuuuuuuuk...',
    '..kuuuuuuuuuuk..',
    '.kooooooooooook.',
    'kgklllLlllLlllkg',
    '.kglllLlllLlllk.',
    '..kllllllllllk..',
    '..klLggggggLlk..',
    '..klgggkkgggLk..',
    '...klgggggglk...',
    '...kuwwwwwwuk...',
    '..kuuuwwwwuuuk..',
    '..kgkooooookgk..',
    '...kssssssssk...',
    '...ksSsk.ksSsk..',
    '...kuuk...kuuk..'] },
  { id: 'charlie', name: 'Charlie', ours: true, hat: [7, 1], pal: { m: '#8a5ad8', M: '#6a3ab0', l: '#d8c8f4', L: '#b8a4e0', b: '#1e1a28', w: '#ffffff', x: '#ff8a2a', e: K }, map: [
    '....k.kk.k......',
    '...kmkmmkmkk....',
    '..kmmMmmmmMmmk..',
    '.kmmmmmmmmmmmmk.',
    'kkkmMmmmmmmMmkkk',
    'kxklllllllllllxk',
    'kkklMMllllMMlkkk',
    '..klwkllllwklk..',
    '..kllllkkklllk..',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '.kbbbbwwwbbbbbk.',
    '.klbbbwkwbbbblk.',
    '..kbbbbwbbbbbk..',
    '...kLlllllllk...',
    '.....kLlllk.....'] },
  { id: 'rob', name: 'Rob', ours: true, hat: [7, 2], pal: { r: '#ff4a6a', c: '#4ad8f0', C: '#2aa0c8', t: '#7af8ff', o: '#ff8a2a', y: '#ffe04a', e: K }, map: [
    '.......rr.......',
    '........k.......',
    '.....kkkkkk.....',
    '...kkcccccckk...',
    '..kcccccccccck..',
    '.kcckkkkkkkkcck.',
    '.kcckttkkttkcck.',
    '.kcckkkkkkkkcck.',
    '..kcckkttkkcck..',
    '...kcccccccck...',
    '..kCcckkkkccCk..',
    '.kcckkoyokkcck..',
    '.kcckkooykkcck..',
    '..kCcckkkkcCk...',
    '...kcck..kcck...',
    '...kkkk..kkkk...'] },
  { id: 'gummy', name: 'Gummy', ours: true, hat: [7, 3], pal: { p: '#ff6ac0', P: '#d8409a', b: '#5ab8ff', w: '#ffffff', v: '#8a3ad8', e: K }, map: [
    '..kpk......kpk..',
    '...kpk....kpk...',
    '....kbk..kbk....',
    '.....kppppk.....',
    '....kppppppk....',
    '...kpwwppwwpk...',
    '...kpwvppwvpk...',
    '...kppppppppk...',
    '...kpkkkkkkpk...',
    '...kppkwwkppk...',
    '....kppbbppk....',
    '...kpkbbppkpk...',
    '.....kpbbpk.....',
    '.....kbpkbk.....',
    '.....kpkkpk.....',
    '....kppk.kbbk...'] },
  // ---- winter animals ----
  { id: 'bear', name: 'Polar Bear', hat: [7, 3], pal: { w: '#f4f6ff', W: '#c8d0ea', g: '#a8b0cc', e: K }, map: [
    '................',
    '..kkk......kkk..',
    '.kwwwk....kwwwk.',
    '.kwgwkkkkkkwgwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwkkwwwwkkwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwgkkgwwwwk.',
    '.kWwwwwkkwwwwWk.',
    '..kkwwwwwwwwkk..',
    '.kwwwwwwwwwwwwk.',
    'kwwkWwwwwwwWkwwk',
    '.kkkwwwwwwwwkkk.',
    '...kwwwkkwwwk...',
    '...kggk..kggk...'] },
  { id: 'penguin', name: 'Penguin', hat: [7, 1], pal: { n: '#2a3460', w: '#ffffff', e: K, y: '#ffa030' }, map: [
    '................',
    '.....kkkkkk.....',
    '...kknnnnnnkk...',
    '..knnnnnnnnnnk..',
    '..knwwwnnwwwnk..',
    '.knnwewnnwewnnk.',
    '.knnwwyyyywwnnk.',
    '.knnwwwyywwwnnk.',
    '.knnwwwwwwwwnnk.',
    'knnnwwwwwwwwnnnk',
    'knnnwwwwwwwwnnnk',
    'kknnwwwwwwwwnnkk',
    '.knnwwwwwwwwnnk.',
    '..knnwwwwwwnnk..',
    '...kyyykkyyyk...',
    '...kkkk..kkkk...'] },
  { id: 'reindeer', name: 'Reindeer', hat: [7, 2], pal: { a: '#e8c890', d: '#9a5e34', D: '#7a4424', c: '#e8cca4', r: '#e8404a', e: K }, map: [
    '.a.a........a.a.',
    '.aaa........aaa.',
    '..a.kkkkkkkk.a..',
    '..akddddddddka..',
    '.kdkddddddddkdk.',
    '..kddddddddddk..',
    '..kdkkddddkkdk..',
    '..kddddddddddk..',
    '..kdccccccccdk..',
    '...kccckkccck...',
    '....kcccccck....',
    '...kddddddddk...',
    '..kdkddccddkdk..',
    '...kDddddddDk...',
    '...kdkk..kkdk...',
    '...kkk....kkk...'] },
  { id: 'owl', name: 'Snowy Owl', hat: [7, 3], pal: { w: '#ffffff', W: '#d8dcec', y: '#ffd23a', o: '#ff9a3a', e: K }, map: [
    '................',
    '..k..........k..',
    '..kwk......kwk..',
    '..kwwkkkkkkwwk..',
    '.kwwwwwwwwwwwwk.',
    '.kwkkkwwwwkkkwk.',
    '.kkyykwwwwkyykk.',
    '.kwkkkwwwwkkkwk.',
    '.kwwwwwoowwwwwk.',
    '.kwwkwwoowwkwwk.',
    'kwwwwwwwwwwwwwwk',
    'kWkwwwwkwwwwkwWk',
    'kWwwwkwwwwkwwwWk',
    '.kwwwwwwwwwwwwk.',
    '..kkwwwwwwwwkk..',
    '....kyyk.kyyk...'] },
  { id: 'hare', name: 'Snow Hare', hat: [7, 4], pal: { w: '#ffffff', W: '#d8dcec', p: '#ffa8c0', b: '#4a8aff', e: K }, map: [
    '...kk......kk...',
    '..kwpk....kpwk..',
    '..kwpk....kpwk..',
    '..kwpk....kpwk..',
    '...kwkkkkkkwk...',
    '..kwwwwwwwwwwk..',
    '.kwwbbwwwwbbwwk.',
    '.kwwbkwwwwbkwwk.',
    '.kpwwwwppwwwwpk.',
    '..kwwwkwwkwwwk..',
    '...kkwwwwwwkk...',
    '..kwwwwwwwwwwk..',
    '.kwkwwwwwwwwkwk.',
    '..kWwwwwwwwwWk..',
    '...kwwk..kwwk...',
    '...kkkk..kkkkww.'] },
  { id: 'husky', name: 'Husky', hat: [7, 3], pal: { g: '#7a849c', G: '#5a6278', w: '#ffffff', b: '#4ab8ff', r: '#ff6a7a', e: K }, map: [
    '.kk..........kk.',
    '.kgk........kgk.',
    '.kgwk......kwgk.',
    '.kggkkkkkkkkggk.',
    '.kgggggwwgggggk.',
    '.kggggwwwwggggk.',
    '.kgwbbwwwwbbwgk.',
    '.kgwwwwwwwwwwgk.',
    '.kgwwwwkkwwwwgk.',
    '..kwwwkrrkwwwk..',
    '...kkgggggkkk...',
    '..kggwwwwwwggk..',
    '.kgkgwwwwwwgkgk.',
    '..kGgwwwwwwgGk..',
    '...kggkkkkggk...',
    '...kwwk..kwwk...'] },
];
export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];

// ---- hats: drawn on top of the head, centred on the hero's hat point (bottom row sits on the head's top row) ----
export const HATS = [
  { id: 'none', name: 'No hat', map: [] },
  { id: 'santa', name: 'Santa hat', pal: { r: '#e83a4a', R: '#b02232', w: '#ffffff' }, map: [
    '........ww.',
    '......kkww.',
    '....kkrrk..',
    '...krrrRk..',
    '..krrrrrRk.',
    '.kwwwwwwwwk'] },
  { id: 'beanie', name: 'Bobble hat', pal: { t: '#2ac8a8', T: '#1a9a80', w: '#ffffff' }, map: [
    '....www....',
    '....kwk....',
    '..kktttkk..',
    '.kttTtTttk.',
    '.kTtTtTtTk.',
    '.kwwwwwwwk.'] },
  { id: 'crown', name: 'Crown', pal: { y: '#ffd23a', Y: '#e0a020', r: '#ff4a6a', b: '#4a8aff' }, map: [
    '.k..k..k.',
    'kyk.kyk.ky',
    'kyykyyykyk',
    'kyryybyyrk',
    'kYYYYYYYYk'] },
  { id: 'tophat', name: 'Top hat', pal: { b: '#2a2440', B: '#423a60', r: '#e83a4a' }, map: [
    '..kkkkkk..',
    '..kbBbbk..',
    '..kbBbbk..',
    '..krrrrk..',
    'kkbbbbbbkk'] },
  { id: 'elf', name: 'Elf hat', pal: { g: '#3ac85a', G: '#2a9a44', y: '#ffd23a', r: '#e83a4a' }, map: [
    'yy.........',
    'ykk........',
    '..kgkk.....',
    '...kggkk...',
    '...kgggGk..',
    '..rrrrrrrr.'] },
  { id: 'antlers', name: 'Antlers', pal: { a: '#c88a4a', A: '#9a6230', r: '#e83a4a' }, map: [
    'a.a......a.a',
    'aaa......aaa',
    '.a........a.',
    '.aA......Aa.',
    '..AAAAAAAA..'] },
  { id: 'earmuffs', name: 'Earmuffs', pal: { p: '#ff8ad8', P: '#d860b0', g: '#8a90a8' }, map: [
    '...kkkkkkkkkk...',
    '..kg........gk..',
    '.kg..........gk.',
    'kppk........kppk',
    'kPpk........kpPk'], low: 3 },
];
export const hatById = (id) => HATS.find((h) => h.id === id) || HATS[0];

const cache = new Map();
function paint(g, map, pal, ox, oy, s) {
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = ch === 'k' ? K : (pal[ch] || '#f0f');
    g.fillRect((ox + x) * s, (oy + y) * s, s, s);
  }));
}
// hero + hat on a 16×22 canvas (6 empty rows on top for the hat)
export function spriteURL(id, { hat = 'none', scale = 4 } = {}) {
  const key = id + '|' + hat + '|' + scale;
  if (cache.has(key)) return cache.get(key);
  const h = heroById(id), t = hatById(hat), c = document.createElement('canvas');
  c.width = 16 * scale; c.height = 22 * scale;
  const g = c.getContext('2d');
  paint(g, h.map, h.pal, 0, 6, scale);
  if (t.map.length) {
    const w = Math.max(...t.map.map((r) => r.length)), [hx, hy] = h.hat;
    const ox = Math.round(hx + .5 - w / 2), oy = 6 + hy - t.map.length + 1 + (t.low || 0);
    paint(g, t.map, t.pal, ox, oy, scale);
  }
  const url = c.toDataURL(); cache.set(key, url); return url;
}
// just the hat, for the picker
export function hatURL(id, scale = 4) {
  if (ART.ok && ART.hats && ART.meta.hats[id]) return artHatURL(id);
  const key = 'hat|' + id + '|' + scale;
  if (cache.has(key)) return cache.get(key);
  const t = hatById(id), c = document.createElement('canvas');
  const w = Math.max(1, ...t.map.map((r) => r.length)), hgt = Math.max(1, t.map.length);
  // cropped to the hat (a square, so every button lines up)
  const side = t.map.length ? Math.max(w, hgt) + 2 : 12; c.width = c.height = side * scale;
  const g = c.getContext('2d');
  if (t.map.length) paint(g, t.map, t.pal, Math.round((side - w) / 2), Math.round((side - hgt) / 2), scale);
  else { const m = side / 2; g.strokeStyle = '#b8b4c8'; g.lineWidth = scale * 1.2; g.beginPath(); g.arc(m * scale, m * scale, (m - 2) * scale, 0, 7); g.moveTo((m - 2.8) * scale, (m + 2.8) * scale); g.lineTo((m + 2.8) * scale, (m - 2.8) * scale); g.stroke(); }
  const url = c.toDataURL(); cache.set(key, url); return url;
}

// ---- a bunch of balloons on strings (n balloons, gold = a golden streak balloon). 24×24 pixels; strings meet at the
// bottom middle, where the hero's hands are ----
const BALLOON = ['..kkk..', '.kcwck.', 'kcwcccK', 'kcccccK', 'kcccccK', '.kcccK.', '..kKk..', '...k...'];
const COLORS = ['#ff4a5a', '#4a8aff', '#3ac85a', '#ff8ad8', '#a86aff', '#ffa030'];
const SPOTS = [[8, 1], [2, 4], [14, 4], [5, 0], [11, 0], [8, 6]];
export function balloonsURL(n = 3, gold = false, seed = 0, scale = 4) {
  n = Math.max(1, Math.min(6, n));
  const key = 'b|' + n + '|' + gold + '|' + (seed % 6) + '|' + scale;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 24 * scale; c.height = 24 * scale;
  const g = c.getContext('2d'), s = scale;
  const spots = SPOTS.slice(0, n);
  // strings first
  g.fillStyle = '#e8eaf6';
  for (const [x, y] of spots) {
    const x0 = x + 3, y0 = y + 8, x1 = 11.5, y1 = 23;
    for (let k = 0; k <= 1; k += 1 / 24) g.fillRect(Math.round(x0 + (x1 - x0) * k) * s, Math.round(y0 + (y1 - y0) * k) * s, s, s);
  }
  spots.forEach(([x, y], i) => {
    const isGold = gold && i === 0, col = isGold ? '#ffd23a' : COLORS[(i + seed) % COLORS.length];
    BALLOON.forEach((row, yy) => [...row].forEach((ch, xx) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'k' ? K : ch === 'w' ? '#ffffff' : ch === 'K' ? shade(col) : col;
      g.fillRect((x + xx) * s, (y + yy) * s, s, s);
    }));
    if (isGold) { g.fillStyle = '#fff8c0'; g.fillRect((x + 2) * s, (y + 2) * s, s, s); g.fillRect((x + 4) * s, (y + 4) * s, s, s); }
  });
  const url = c.toDataURL(); cache.set(key, url); return url;
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(v * .68);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}
export const heroImg = (id, hat, cls = '') => `<img class="px-img ${cls}" src="${spriteURL(id, { hat })}" alt="">`;

// ---------- painted heroes (ChatGPT sheets → art/heroes, built by Clue Quest/Heroes/build_sprites.py) ----------
// Each hero: 4 frames side by side (0 hang, 1 legs swing, 2 blink, 3 cheer) and a head point for the hat.
// Once every sheet has loaded they replace the small code sprites above; until then (or if they fail) the code
// sprites are used, so the game always works.
const ART = { ok: false, meta: null, sheets: {}, hats: null, headroom: 0 };
const artCache = new Map();
export const artReady = (async () => {
  try {
    const base = new URL('art/heroes/', import.meta.url);
    const meta = await (await fetch(new URL('sprites.json?v=3', base))).json();
    const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
    const ids = Object.keys(meta.heroes);
    const ims = await Promise.all(ids.map((id) => load(new URL(id + '.png?v=3', base))));
    ids.forEach((id, i) => { ART.sheets[id] = ims[i]; });
    if (Object.keys(meta.hats || {}).length) ART.hats = await load(new URL('hats.png?v=3', base));
    ART.meta = meta;
    ART.headroom = Math.max(0, ...Object.values(meta.hats || {}).map((h) => h.h)) - 2;
    ART.ok = HEROES.every((h) => ART.sheets[h.id]);
  } catch (e) { ART.ok = false; }
  return ART.ok;
})();
export const hasArt = () => ART.ok;
function artURL(id, hat, frame, scale) {
  const key = id + '|' + hat + '|' + frame + '|' + scale;
  if (artCache.has(key)) return artCache.get(key);
  const m = ART.meta.heroes[id], sh = ART.sheets[id], hm = hat !== 'none' && ART.meta.hats ? ART.meta.hats[hat] : null;
  if (frame >= (m.frames || 4)) frame = FALLBACK[frame] ?? 0;
  const hr = ART.headroom, w = m.w, h = m.h + hr;
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(sh, frame * m.w, 0, m.w, m.h, 0, hr * scale, m.w * scale, m.h * scale);
  if (hm && ART.hats) {
    // the skull top in this frame (ears, antlers and antennae stick up past it); the brim sinks a little over the head
    const hd = (m.heads && m.heads[frame]) || m.head, sink = hm.sink ?? Math.round(hm.h * .3);
    const hx = hd.x - hm.w / 2, hy = hr + hd.y - hm.h + sink;
    g.drawImage(ART.hats, hm.x, hm.y, hm.w, hm.h, Math.round(hx) * scale, Math.round(hy) * scale, hm.w * scale, hm.h * scale);
  }
  const url = c.toDataURL(); artCache.set(key, url); return url;
}
// which frame a hanging hero shows at time t. Frames: 0 hang · 1 legs swing · 2 blink · 3 cheer · 4 wave ·
// 5 legs swing the other way · 6 sad · 7 big cheer (4–7 come from the second sheet; without it they fall back).
// mood: 'idle' | 'cheer' (right answer) | 'sad' (wrong) | 'rise' (climbing); true/false still mean rise/idle.
export function heroFrame(t, seed = 0, mood = 'idle') {
  if (mood === true) mood = 'rise'; else if (!mood) mood = 'idle';
  if (mood === 'cheer') return (t / 220 | 0) % 2 ? 7 : 3;
  if (mood === 'rise') return (t / 300 | 0) % 2 ? 3 : 7;
  if (mood === 'sad') return 6;
  const tt = t + seed * 977;
  if (tt % 3700 < 150) return 2;                                   // a blink now and then
  if (tt % 9000 > 7600) return (tt / 260 | 0) % 2 ? 4 : 0;         // a little wave every few seconds
  return [0, 1, 0, 5][(tt / 430 | 0) % 4];                          // legs swinging one way, then the other
}
const FALLBACK = [0, 1, 2, 3, 0, 1, 0, 3];
// where a hero's face is in its picture (hero pixels, the hat's headroom included), to frame it in a porthole
export function heroFace(id) {
  if (ART.ok && ART.meta.heroes[id]) { const m = ART.meta.heroes[id], hd = (m.heads && m.heads[0]) || m.head; return { x: hd.x, y: ART.headroom + hd.y + 11, w: m.w, h: m.h + ART.headroom }; }
  const h = heroById(id); return { x: h.hat[0] + .5, y: 6 + h.hat[1] + 5, w: 16, h: 22 };
}
// where the raised hands hold the balloon strings, measured down from the top of the hero picture as a share of its
// width: the top of the head (a hat, drawn over the strings, hides the knot)
export function heroHold(id) {
  if (ART.ok && ART.meta.heroes[id]) { const m = ART.meta.heroes[id], hd = (m.heads && m.heads[0]) || m.head; return (ART.headroom + hd.y + 1) / m.w; }
  const h = heroById(id); return (6 + h.hat[1]) / 16;
}
const codeSpriteURL = spriteURL;
export function heroURL(id, { hat = 'none', frame = 0, scale = 3 } = {}) {
  return ART.ok ? artURL(id, hat, frame, scale) : codeSpriteURL(id, { hat, scale: Math.max(2, scale + 1) });
}

// a painted hat on its own (for the hat buttons), in a square with a little room around it
function artHatURL(id) {
  const key = 'arthat|' + id; if (artCache.has(key)) return artCache.get(key);
  const hm = ART.meta.hats[id], side = Math.max(hm.w, hm.h) + 4, sc = 3, c = document.createElement('canvas');
  c.width = c.height = side * sc; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(ART.hats, hm.x, hm.y, hm.w, hm.h, Math.round((side - hm.w) / 2) * sc, Math.round((side - hm.h) / 2) * sc, hm.w * sc, hm.h * sc);
  const url = c.toDataURL(); artCache.set(key, url); return url;
}

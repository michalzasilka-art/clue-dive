// Clue Quest shared bits: the QR code, pixel confetti, small helpers (the snowy world is in world.js).

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
export const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
export function show(id) {
  for (const s of $$('.screen')) s.hidden = s.id !== id;
  document.body.dataset.screen = id;
}

// ---------- QR code (qrcode-generator, loaded as lib/qrcode.js) drawn with crisp square modules ----------
export function qrCanvas(text, px = 8) {
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, c = document.createElement('canvas');
  c.width = c.height = (n + m * 2) * px;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#1d1430';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * px, (r + m) * px, px, px);
  return c;
}

// ---------- pixel confetti over the whole screen ----------
export function confetti(ms = 4000) {
  const c = document.createElement('canvas'); c.className = 'confetti';
  document.body.appendChild(c);
  const g = c.getContext('2d'), S = 6;
  const fit = () => { c.width = Math.ceil(innerWidth / S); c.height = Math.ceil(innerHeight / S); };
  fit();
  const COLORS = ['#ff5a5a', '#ffd24a', '#4a8aff', '#3ac85a', '#ff8ad8', '#ffffff'];
  const bits = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, v: .25 + Math.random() * .5, d: Math.random() * 6, col: COLORS[(Math.random() * COLORS.length) | 0] }));
  const t0 = performance.now();
  const step = (t) => {
    g.clearRect(0, 0, c.width, c.height);
    for (const b of bits) { b.y += b.v; b.d += .05; const x = Math.round(b.x + Math.sin(b.d) * 2); g.fillStyle = b.col; g.fillRect(x, Math.round(b.y), 1, ((b.d | 0) % 2) + 1); if (b.y > c.height && t - t0 < ms) b.y = -2; }
    if (t - t0 < ms + 4000) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}

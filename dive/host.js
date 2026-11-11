// Clue Dive, the teacher's big screen: the class crews one submarine and dives from the harbour to the Lost City.
// Pick a topic → lobby (code + QR; every student who joins appears behind a porthole of the submarine) → each round:
// the clue (answers only on the phones); a student who picks the right word FAST (before the monster line on the
// clock) summons a sea monster that bursts out of the dark beside the submarine with their name → the answer with how
// many picked each word → DIVE: the submarine sinks deeper the more of the class got it right, the monsters swim off →
// next clue → the podium (coins: right answers, speed, monsters, streaks). This browser is the game.
import { $, $$, esc, shuffle, store, show, qrCanvas, confetti, ordinal } from './ui.js';
import { ocean, W, VH, WH, SURFACE, FLOOR, ZONES, zoneAt, depthM } from './ocean.js';
import { subHull, propeller, MONSTERS, monsterById, monsterURL } from './sea-art.js';
import { HEROES, HATS, heroURL, heroFrame, artReady, heroFace } from './sprites.js';
import { SETS, setById, parseCustom } from './words.js';
import { hostGame } from './net.js';
import { sfx, unlock, music, setMuted, isMuted } from './sound.js';

const LETTERS = ['a', 'b', 'c'];
const SPX = .62;                 // world units per art pixel of the submarine and the monsters
const MON_FRAC = .6;             // a right answer in the first 60 % of the time summons a monster
const START_Y = SURFACE + 6;     // the submarine floats at the harbour, half out of the water
const END_Y = FLOOR - 34;        // a perfect class lands by the treasure
const img = (id, hat = 'none', cls = '') => `<img class="px-img hero-img ${cls}" src="${heroURL(id, { hat })}" alt="">`;

$('#app').innerHTML = `
<div class="stage" id="worldStage"><canvas id="world"></canvas>
  <div id="subWrap"><div id="inside"></div><div id="crew"></div><img class="px-img" id="hull" alt=""><img class="px-img" id="prop" alt=""><div id="seatTags"></div><div id="extraCrew"></div></div>
  <div id="mons"></div>
  <div id="gauge"><div class="rail"></div><div id="gaugeZones"></div><div id="gaugeSub"><span id="gaugeM">0 m</span></div></div>
  <div id="zoneBanner" hidden></div><div id="monBanner" hidden></div></div>
<div class="corner"><button class="btn px ghost" id="menuBtn" title="Back to the start menu">MENU</button><button class="btn px ghost" id="muteBtn" title="Sound on/off">SOUND ON</button></div>
<section class="screen" id="setup"><div class="stage">
  <div class="logo">CLUE <i>DIVE</i></div>
  <div class="sub">Read the clue, pick the word on your phone. Answer fast to call up a sea monster, and dive with your class to the Lost City!</div>
  <div id="sets"></div>
  <div id="options">
    <div class="choice px" data-k="rounds"><span>QUESTIONS</span><button class="px" data-v="5">5</button><button class="px" data-v="10">10</button><button class="px" data-v="15">15</button><button class="px" data-v="0">ALL</button></div>
    <div class="choice px" data-k="secs"><span>SECONDS</span><button class="px" data-v="10">10</button><button class="px" data-v="20">20</button><button class="px" data-v="30">30</button></div>
    <button class="btn px green" id="create">CREATE GAME</button>
  </div>
  <div class="modal" id="mine" hidden><div class="px">
    <h2>MY WORDS</h2>
    <p>One word per line: <b>word ; description ; wrong answer ; wrong answer</b>. The wrong answers are optional: missing ones are taken from your other words.</p>
    <textarea id="mineText" spellcheck="false" placeholder="umbrella ; You open it when it rains. ; raincoat ; boots&#10;bridge ; You walk over it to cross a river. ; tunnel ; road"></textarea>
    <div class="err" id="mineErr"></div>
    <div class="row"><button class="btn px ghost" id="mineCancel">CANCEL</button><button class="btn px" id="mineSave">SAVE WORDS</button></div>
  </div></div>
  <div id="loading" hidden>OPENING THE GAME…</div>
</div></section>

<section class="screen" id="lobby" hidden><div class="stage">
  <div class="join px">
    <div class="jt"><div class="how">Join on your phone:<br><b id="joinUrl">fugio.co/dive</b></div>
    <div class="code"><small>GAME CODE</small><span id="code">------</span></div></div>
    <div class="qrbox"><canvas id="qr"></canvas><div>SCAN ME</div></div>
  </div>
  <div class="lobby-hint" id="lobbyHint">PICK YOUR HERO AND HAT ON YOUR PHONE.<br>YOU WILL APPEAR IN A WINDOW OF THE SUBMARINE!</div>
  <div class="crewlist" id="crewList"></div>
  <div class="bar">
    <div class="count px"><span id="count">0</span> IN THE CREW</div>
    <div class="topic px" id="lobbyTopic"></div>
    <button class="btn px ghost" id="backSetup">TOPIC</button>
    <button class="btn px green" id="startBtn" disabled>DIVE!</button>
  </div>
</div></section>

<section class="screen" id="question" hidden><div class="stage">
  <div id="clue" class="px"><div class="cl-top"><span id="qNum">1 / 10</span><span id="qTopic"></span></div><p id="clueText"></p><small id="clueHint">ANSWER FAST ON YOUR PHONE TO CALL A SEA MONSTER!</small></div>
  <div id="timer" class="px"><span id="timerN">20</span><i id="timerBar"></i><b id="monLine"></b></div>
  <div id="answered"><div class="px" id="ansCount">0 / 0 ANSWERED</div></div>
  <button class="btn px" id="qSkip">SKIP</button>
</div></section>

<section class="screen" id="results" hidden><div class="stage">
  <div id="resPanel" class="px">
    <div class="rp-lbl">THE ANSWER IS</div><div class="rp-word" id="rpWord"></div>
    <div class="rp-clue" id="rpClue"></div>
    <div id="bars"></div>
    <div class="rp-sum" id="rpSum"></div>
  </div>
  <button class="btn px green" id="resNext">DIVE!</button>
</div></section>

<section class="screen" id="fly" hidden><div class="stage">
  <div class="board-panel px"><h2>MOST COINS</h2><div id="rows"></div></div>
  <div class="streak-panel px" id="monPanel"></div>
  <button class="btn px green" id="flyNext">NEXT CLUE</button>
</div></section>

<section class="screen" id="podium" hidden><div class="stage">
  <h1 class="logo">WINNERS!</h1>
  <div class="deepest px" id="deepest"></div>
  <div id="steps"></div>
  <div class="again"><button class="btn px green" id="againBtn">PLAY AGAIN</button></div>
</div></section>`;

const cam = ocean($('#world'));
artReady.then(() => { setsHTML(); buildSub(); });

// ---------- settings (the same as Clue Quest's) ----------
const prefs = store.get('dive-host', { set: 'animals', rounds: 10, secs: 20 });
let custom = store.get('clue-mine', '');
function setsHTML() {
  const cards = SETS.map((s) => `<button class="set px${prefs.set === s.id ? ' on' : ''}" data-id="${s.id}">${img(s.icon, s.hat)}<span><b>${esc(s.title)}</b><small>${s.level} · ${s.words.length} WORDS</small></span></button>`);
  const n = parseCustom(custom).words.length;
  cards.push(`<button class="set px${prefs.set === 'mine' ? ' on' : ''}" data-id="mine">${img('charlie', 'tophat')}<span><b>My words</b><small>${n ? n + ' WORDS · EDIT' : 'WRITE YOUR OWN'}</small></span></button>`);
  $('#sets').innerHTML = cards.join('');
}
function optsHTML() { for (const box of $$('.choice')) for (const b of $$('button', box)) b.classList.toggle('on', String(prefs[box.dataset.k]) === b.dataset.v); }
setsHTML(); optsHTML();
$('#sets').addEventListener('click', (e) => {
  const b = e.target.closest('.set'); if (!b) return;
  unlock(); sfx.pick();
  if (b.dataset.id === 'mine') { openMine(); return; }
  prefs.set = b.dataset.id; store.set('dive-host', prefs); setsHTML();
});
$('#options').addEventListener('click', (e) => {
  const b = e.target.closest('.choice button'); if (!b) return;
  unlock(); sfx.tap();
  prefs[b.closest('.choice').dataset.k] = +b.dataset.v; store.set('dive-host', prefs); optsHTML();
});
function openMine() { $('#mineText').value = custom; $('#mineErr').textContent = ''; $('#mine').hidden = false; $('#mineText').focus(); }
$('#mineCancel').onclick = () => { $('#mine').hidden = true; };
$('#mineSave').onclick = () => {
  const t = $('#mineText').value, { words, errors } = parseCustom(t);
  if (words.length < 3) { $('#mineErr').textContent = errors[0] || 'Write at least 3 words.'; return; }
  custom = t; store.set('clue-mine', t);
  prefs.set = 'mine'; store.set('dive-host', prefs);
  $('#mine').hidden = true; setsHTML();
  if (errors.length) toast(errors[0]);
};
$('#menuBtn').onclick = () => { if (phase === 'setup' || confirm('Leave this game and go back to the menu?')) location.href = new URL('./', location.href).href; };
const muteBtn = $('#muteBtn');
const drawMute = () => { muteBtn.textContent = isMuted() ? 'SOUND OFF' : 'SOUND ON'; };
muteBtn.onclick = () => { unlock(); setMuted(!isMuted()); store.set('clue-mute', isMuted()); drawMute(); };
setMuted(!!store.get('clue-mute', false)); drawMute();
function toast(text, ms = 3500) {
  const t = document.createElement('div'); t.className = 'toast px'; t.textContent = text;
  document.querySelector('.screen:not([hidden]) .stage').appendChild(t); setTimeout(() => t.remove(), ms);
}

// ---------- the game ----------
const players = new Map();   // pid → { pid, name, char, hat, coins, streak, best, online, last, seat, mons: [], joined }
let net = null, phase = 'setup', rounds = [], qi = -1, qStart = 0, qDur = 20000, answers = new Map(), timerT = null, topicTitle = '';
let lastTick = -1, closeT = null, seats = 0, lastZone = '', subY = START_Y, subShown = START_Y, stepY = 200, diveT = null;
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 14) || 'Player';
const validChar = (c) => (HEROES.some((h) => h.id === c) ? c : HEROES[0].id);
const validHat = (h) => (HATS.some((x) => x.id === h) ? h : 'none');
const list = () => [...players.values()];
const ranked = () => list().sort((a, b) => b.coins - a.coins || a.joined - b.joined);
const placeOf = (pid) => { const me = players.get(pid); return 1 + list().filter((p) => p.coins > me.coins).length; };
const r5 = (m) => Math.round(m / 5) * 5;
const MON_BONUS = [0, 25, 50, 100];
// which monster comes: faster = bigger; deeper water = stranger creatures
function pickMonster(tier, y) {
  if (tier >= 3) return y < 1100 ? 'serpent' : y < 2050 ? 'kraken' : 'leviathan';
  if (tier === 2) return y < 700 ? 'shark' : y < 1550 ? 'squid' : 'angler';
  return y < 700 ? 'crab' : y < 1550 ? 'eel' : 'jelly';
}
function qMessage() {
  const r = rounds[qi];
  return { type: 'q', n: qi + 1, total: rounds.length, desc: r.desc, opts: r.opts, left: Math.max(0, qDur - (performance.now() - qStart)), dur: qDur, mon: MON_FRAC, y: subY };
}
const meOf = (p) => ({ name: p.name, char: p.char, hat: p.hat, coins: p.coins, streak: p.streak, mons: p.mons.length });
function screenFor(pid) {
  const p = players.get(pid), me = meOf(p);
  if (phase === 'q') return { ...qMessage(), me, got: answers.has(pid) ? answers.get(pid).choice : null };
  if (phase === 'results' || phase === 'fly') return { type: 'res', me, ...resultFor(pid) };
  if (phase === 'podium') return endFor(pid);
  return { type: 'wait', me, topic: topicTitle, y: subY };
}

async function openGame() {
  if (net) { goLobby(); return; }
  $('#loading').hidden = false; $('#create').disabled = true;
  try {
    net = await hostGame({
      onHello(pid, me, isNew) {
        let p = players.get(pid);
        if (!p) { p = { pid, coins: 0, streak: 0, best: 0, joined: performance.now(), last: null, seat: seats++, mons: [] }; players.set(pid, p); }
        p.name = cleanName(me.name); p.char = validChar(me.char); p.hat = validHat(me.hat); p.online = true;
        if (isNew) { if (phase === 'lobby') sfx.join(); popTag(p, p.name); }
        refresh();
        return screenFor(pid);
      },
      onMessage(pid, m) {
        const p = players.get(pid); if (!p) return;
        if (m.type === 'look') { p.name = cleanName(m.name); p.char = validChar(m.char); p.hat = validHat(m.hat); refresh(); }
        else if (m.type === 'answer') answer(pid, m);
      },
      onGone(pid) { const p = players.get(pid); if (p) { p.online = false; refresh(); } },
    });
  } catch (e) {
    $('#loading').hidden = true; $('#create').disabled = false;
    toast(e.message || 'Could not open the game.'); return;
  }
  $('#loading').hidden = true; $('#create').disabled = false;
  $('#code').textContent = net.code.slice(0, 3) + ' ' + net.code.slice(3);
  const url = new URL('./', location.href); url.search = '?code=' + net.code;
  const qr = qrCanvas(url.href, 8), c = $('#qr'); c.width = qr.width; c.height = qr.height; c.getContext('2d').drawImage(qr, 0, 0);
  $('#joinUrl').textContent = (location.host.replace(/^www\./, '') + new URL('./', location.href).pathname).replace(/\/$/, '');
  goLobby();
}
function pickRounds() {
  const words = prefs.set === 'mine' ? parseCustom(custom).words : (setById(prefs.set) || SETS[0]).words;
  topicTitle = prefs.set === 'mine' ? 'My words' : (setById(prefs.set) || SETS[0]).title;
  const n = prefs.rounds ? Math.min(prefs.rounds, words.length) : words.length;
  rounds = shuffle(words).slice(0, n).map(([word, desc, w1, w2]) => { const opts = shuffle([word, w1, w2]); return { word, desc, opts, right: opts.indexOf(word) }; });
  stepY = (END_Y - START_Y) / Math.max(1, rounds.length);   // a perfect round sinks one step; a perfect game lands by the treasure
}
function goLobby() {
  phase = 'lobby'; qi = -1; pickRounds(); lastZone = ZONES[0][0]; subY = subShown = START_Y;
  for (const p of players.values()) { p.coins = 0; p.streak = 0; p.best = 0; p.last = null; p.mons = []; }
  clearMonsters(true);
  $('#lobbyTopic').textContent = `${topicTitle} · ${rounds.length} clues · ${prefs.secs}s`;
  show('lobby'); lookAtSub(true); refresh(); music(true);
  for (const p of players.values()) net.send(p.pid, screenFor(p.pid));
}
function refresh() {
  if (phase === 'lobby') {
    const ps = list();
    $('#count').textContent = ps.filter((p) => p.online).length;
    $('#startBtn').disabled = !ps.some((p) => p.online);
    $('#lobbyHint').hidden = ps.length > 0;
    $('#crewList').innerHTML = ps.map((p) => `<span class="cm px${p.online ? '' : ' off'}" data-pid="${p.pid}">${img(p.char, p.hat)}${esc(p.name)}</span>`).join('');
  } else if (phase === 'q') drawAnswered();
  buildSub();
}
$('#crewList').addEventListener('click', (e) => {   // tap a name twice to take that player out
  if (phase !== 'lobby') return;
  const k = e.target.closest('.cm'); if (!k) return;
  if (!k.classList.contains('ask')) { $$('#crewList .ask').forEach((x) => x.classList.remove('ask')); k.classList.add('ask'); setTimeout(() => k.classList.remove('ask'), 3000); return; }
  const pid = k.dataset.pid; net.kick(pid); players.delete(pid); reseat(); refresh();
});
function reseat() { let i = 0; for (const p of list().sort((a, b) => a.seat - b.seat)) p.seat = i++; seats = i; }
$('#create').onclick = () => { unlock(); sfx.tap(); openGame(); };
$('#backSetup').onclick = () => { sfx.tap(); music(false); phase = 'setup'; show('setup'); for (const p of players.values()) net.send(p.pid, { type: 'wait', me: meOf(p), topic: '', y: subY }); };

// ---------- the submarine: a hull with a round window for everyone in the crew ----------
let hull = null, layout = '', seatEls = new Map();
const PROPS = [0, 1, 2, 3].map((f) => propeller(f).toDataURL());
function buildSub() {
  const n = Math.max(4, players.size), rows = n > 26 ? 3 : 2, cols = Math.min(13, Math.max(3, Math.ceil(n / rows)));
  const key = cols + 'x' + rows;
  if (key !== layout) {
    layout = key; hull = subHull(cols, rows);
    $('#hull').src = hull.canvas.toDataURL();
    const W2 = hull.w;
    $('#subWrap').style.setProperty('--hw', W2); $('#subWrap').style.setProperty('--hh', hull.h);
    $('#inside').style.cssText = `left:${(hull.holes[0].x - 10) / W2 * 100}%;right:${(W2 - hull.holes[hull.holes.length - 1].x - 12) / W2 * 100}%;top:${(hull.holes[0].y - 10) / hull.h * 100}%;bottom:${(hull.h - hull.holes[hull.holes.length - 1].y - 10) / hull.h * 100}%`;
    $('#prop').style.cssText = `left:${(hull.prop.x - 2) / W2 * 100}%;top:${(hull.prop.y - 11.5) / hull.h * 100}%;width:${11 / W2 * 100}%`;
    seatEls.clear(); $('#crew').innerHTML = ''; $('#seatTags').innerHTML = '';
  }
  // seat everyone (join order) in the windows, top row first
  const shown = list().sort((a, b) => a.seat - b.seat).slice(0, hull.holes.length);
  for (const [pid, el] of seatEls) if (!shown.some((p) => p.pid === pid)) { el.remove(); seatEls.delete(pid); }
  shown.forEach((p, i) => {
    const o = hull.holes[i]; let el = seatEls.get(p.pid);
    if (!el) {   // the face sits under the hull (seen through the window); the lamp and the name tag above it
      el = { glass: document.createElement('div'), tag: document.createElement('div') };
      el.glass.className = 'glass'; el.glass.innerHTML = '<img class="px-img" alt="">'; el.tag.className = 'stag'; el.tag.innerHTML = '<i class="lamp"></i><span class="ptag"></span>';
      $('#crew').appendChild(el.glass); $('#seatTags').appendChild(el.tag); seatEls.set(p.pid, el);
    }
    for (const b of [el.glass, el.tag]) { b.style.left = ((o.x - o.r) / hull.w * 100) + '%'; b.style.top = ((o.y - o.r) / hull.h * 100) + '%'; b.style.width = (o.r * 2 / hull.w * 100) + '%'; b.style.height = (o.r * 2 / hull.h * 100) + '%'; }
    const f = heroFace(p.char), im = el.glass.firstChild;
    im.style.width = (f.w / (o.r * 2) * 100) + '%'; im.style.left = ((o.r - f.x) / (o.r * 2) * 100) + '%'; im.style.top = ((o.r - f.y) / (o.r * 2) * 100) + '%';
    el.glass.classList.toggle('off', !p.online); el.tag.classList.toggle('below', i >= hull.holes.length / 2);
    if (!el.tag.classList.contains('tagged')) el.tag.querySelector('.ptag').textContent = p.name;
  });
  const extra = players.size - shown.length;
  $('#extraCrew').textContent = extra > 0 ? `+${extra} CREW` : '';
}
function popTag(p, text, ms = 2600) {
  setTimeout(() => {
    const s2 = seatEls.get(p.pid); if (!s2) return;
    const el = s2.tag, t = el.querySelector('.ptag'); t.textContent = text; el.classList.remove('tagged'); void el.offsetWidth; el.classList.add('tagged');
    clearTimeout(el.tagT); el.tagT = setTimeout(() => { el.classList.remove('tagged'); t.textContent = p.name; }, ms);
  }, 60);
}
// where the submarine is (world units): centred, its body at subShown
// a small crew gets a bigger submarine (bigger faces in the windows); a big crew's is long and uses the monsters' pixel size
const subScale = () => (hull ? Math.max(SPX, Math.min(.9, 150 / hull.w)) : SPX);
const subBox = () => { const k = subScale(), w = hull ? hull.w * k : 120, h = hull ? hull.h * k : 50; return { x: W / 2 - w / 2 - 6, y: subShown - (hull ? hull.cy : 30) * k, w, h, k }; };
function lookAtSub(now) { cam.look(subShown - VH * .56, now); }

// ---------- sea monsters ----------
const mons = [];   // { el, id, x, y, tx, ty, dir, born, leaving, w, h, p }
// where monsters wait, as a share of the board (the submarine is in the middle, the clue panel at the top left)
const SLOTS = [[.12, .5], [.88, .5], [.11, .8], [.89, .8], [.36, .88], [.64, .88], [.5, .95], [.26, .66]];   // all below the clue panel
const SLOT_ORDER = { 1: [0, 1, 2, 3, 7, 6, 4, 5], 2: [1, 0, 3, 2, 7, 6, 4, 5], 3: [4, 5, 6, 2, 3, 0, 1, 7] };   // big ones take the wide places at the bottom
function summon(p, id, tier) {
  const m = monsterById(id), vw = cam.viewW, x0 = (W - vw) / 2;
  const used = new Set(mons.filter((x) => !x.leaving).map((x) => x.slot));
  let slot = SLOT_ORDER[tier].find((i) => !used.has(i));
  if (slot == null) { const old = mons.filter((x) => !x.leaving).sort((a, b) => a.born - b.born)[0]; if (old) { old.leaving = performance.now(); slot = old.slot; } else slot = 0; }
  const [sx, sy] = SLOTS[slot], cx = x0 + sx * vw, cy = cam.y + sy * VH;
  const el = document.createElement('div'); el.className = 'mon t' + tier;
  el.innerHTML = `<img class="px-img" alt=""><span class="mtag px">${esc(p.name)}</span>`;
  $('#mons').appendChild(el);
  const size = { crab: 56, eel: 84, jelly: 44, shark: 92, squid: 84, angler: 70, serpent: 130, kraken: 120, leviathan: 160 }[id];
  const scale = tier === 3 ? .9 : tier === 2 ? .8 : .7, w = size * SPX * scale;
  const face = cx > W / 2 ? 1 : -1;   // face the submarine
  const mo = { el, id, slot, x: face > 0 ? W + w : -w, y: cy + (Math.random() - .5) * 20, tx: cx, ty: cy, face, born: performance.now(), leaving: 0, w, tier, p, ph: Math.random() * 6 };
  mons.push(mo);
  setTimeout(() => { sfx.roar(); cam.burst(cx, cy, 24); const st = $('#worldStage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }, 500);
  if (tier === 3) banner('#monBanner', `${p.name} called up ${m.name.toUpperCase()}!`, 2600);
}
function clearMonsters(now) { for (const m of mons) { if (now) m.el.remove(); else m.leaving ||= performance.now(); } if (now) mons.length = 0; }

// ---------- every frame: the submarine, the crew, the monsters follow the camera ----------
let lastSeatT = 0;
cam.onFrame((camY, t, dk) => {
  if (!hull) return;
  const sb = subBox(), vw = cam.viewW, x0 = (W - vw) / 2;
  const wrap = $('#subWrap');
  const bob = Math.sin(t / 900) * 1.2 + (subShown <= START_Y + 1 ? Math.sin(t / 600) * 1.4 : 0);
  wrap.style.left = ((sb.x - x0) / vw * 100) + '%'; wrap.style.top = ((sb.y + bob - camY) / VH * 100) + '%'; wrap.style.width = (sb.w / vw * 100) + '%';
  const pf = PROPS[((t / (diveT ? 50 : 110)) | 0) % 4]; if ($('#prop').getAttribute('src') !== pf) $('#prop').src = pf;
  cam.setSub({ x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 + bob, w: sb.w, h: sb.h, lamp: { x: sb.x + hull.lamp.x * sb.k, y: sb.y + hull.lamp.y * sb.k + bob }, prop: { x: sb.x + hull.prop.x * sb.k, y: sb.y + hull.prop.y * sb.k + bob }, moving: !!diveT });
  // the crew animate: blink, look around, cheer or droop after an answer
  if (t - lastSeatT > 140) {
    lastSeatT = t;
    for (const p of players.values()) {
      const el = seatEls.get(p.pid); if (!el) continue;
      const mood = phase === 'results' || phase === 'fly' ? (p.last ? (p.last.ok ? 'cheer' : p.last.none ? 'idle' : 'sad') : 'idle') : diveT ? 'rise' : 'idle';
      const src = heroURL(p.char, { hat: p.hat, frame: heroFrame(t, p.seat, mood), scale: 3 }), im = el.glass.firstChild;
      if (im.getAttribute('src') !== src) im.src = src;
      el.tag.classList.toggle('done', phase === 'q' && answers.has(p.pid));
    }
  }
  // monsters: rush in to their place by the submarine, hover and snap, swim away when the dive starts
  for (let i = mons.length - 1; i >= 0; i--) {
    const m = mons[i], age = (t - m.born) / 1000;
    let x, y;
    if (m.leaving) {
      const k = (t - m.leaving) / 1000; m.x += m.face * -(40 + k * 120) * .016 * 2; x = m.x; y = m.y - k * 6;
      if (k > 2.5 || x < -m.w * 2 || x > W + m.w * 2) { m.el.remove(); mons.splice(i, 1); continue; }
      m.el.style.opacity = Math.max(0, 1 - k / 2.5).toFixed(2);
    } else {
      const k = Math.min(1, age / 1.1), e = 1 - Math.pow(1 - k, 3);
      // keep the slot next to the moving submarine
      const [sx, sy] = SLOTS[m.slot]; m.tx = x0 + sx * vw; m.ty = camY + sy * VH;
      x = m.x + (m.tx - m.x) * e; y = m.y + (m.ty - m.y) * e;
      if (k >= 1) { m.x = m.tx; m.y = m.ty; }
      x += Math.sin(t / 700 + m.ph) * 3; y += Math.sin(t / 1100 + m.ph) * 4;
    }
    const fr = ((t / (m.leaving ? 90 : 160) + m.ph * 3) | 0) % 4, src = monsterURL(m.id, fr, m.face < 0);
    const im = m.el.firstChild; if (im.getAttribute('src') !== src) im.src = src;
    m.el.style.left = ((x - m.w / 2 - x0) / vw * 100) + '%'; m.el.style.top = ((y - camY) / VH * 100) + '%'; m.el.style.width = (m.w / vw * 100) + '%';
    // far from the submarine's lights, deep monsters are dark shapes with glowing eyes
    const dist = Math.hypot(x - (sb.x + sb.w / 2), y - (sb.y + sb.h / 2)) / sb.w;
    m.el.style.filter = dk > .05 ? `brightness(${(1 - dk * Math.min(.75, Math.max(0, dist - .4))).toFixed(2)})` : '';
  }
  // the depth gauge
  $('#gaugeSub').style.top = (subShown / WH * 100).toFixed(2) + '%';
  $('#gaugeM').textContent = depthM(subShown) + ' m';
});
$('#gaugeZones').innerHTML = ZONES.map(([name, top], i) => { const bot = ZONES[i + 1] ? ZONES[i + 1][1] : WH; return `<div class="gz" style="top:${(top / WH * 100).toFixed(2)}%;height:${((bot - top) / WH * 100).toFixed(2)}%"><span>${esc(name)}</span></div>`; }).join('');

// ---------- a round: the clue ----------
$('#startBtn').onclick = () => {
  unlock(); music(false); sfx.dive(); sfx.splash();
  startQuestion(0);
};
function startQuestion(i) {
  clearTimeout(closeT);
  qi = i; phase = 'q'; answers = new Map(); qDur = prefs.secs * 1000; qStart = performance.now(); lastTick = -1;
  const r = rounds[qi];
  $('#qNum').textContent = `CLUE ${qi + 1} / ${rounds.length}`;
  $('#qTopic').textContent = topicTitle.toUpperCase();
  $('#clueText').textContent = r.desc;
  $('#clue').classList.remove('pop'); void $('#clue').offsetWidth; $('#clue').classList.add('pop');
  $('#monLine').style.bottom = ((1 - MON_FRAC) * 100) + '%';
  show('question'); sfx.sonar(); lookAtSub();
  for (const p of players.values()) net.send(p.pid, { ...qMessage(), me: meOf(p) });
  drawAnswered(); tickTimer();
}
function tickTimer() {
  clearTimeout(timerT);
  if (phase !== 'q') return;
  const left = Math.max(0, qDur - (performance.now() - qStart)), s = Math.ceil(left / 1000);
  $('#timerN').textContent = s; $('#timer').classList.toggle('low', s <= 5);
  $('#timer').classList.toggle('montime', left / qDur > 1 - MON_FRAC);
  $('#clueHint').textContent = left / qDur > 1 - MON_FRAC ? 'ANSWER FAST ON YOUR PHONE TO CALL A SEA MONSTER!' : 'ANSWER ON YOUR PHONE!';
  $('#timerBar').style.height = (left / qDur * 100).toFixed(1) + '%';
  if (s !== lastTick) { if (s <= 5 && s > 0) sfx.tick(); lastTick = s; }
  if (left <= 0) { showResults(); return; }
  timerT = setTimeout(tickTimer, 100);
}
function drawAnswered() {
  const on = list().filter((p) => p.online || answers.has(p.pid));
  $('#ansCount').textContent = `${answers.size} / ${on.length} ANSWERED`;
}
function answer(pid, m) {
  if (phase !== 'q' || m.n !== qi + 1 || answers.has(pid)) return;
  const choice = m.choice | 0; if (choice < 0 || choice > 2) return;
  const t = performance.now() - qStart, p = players.get(pid), ok = choice === rounds[qi].right;
  const fast = 1 - t / qDur, tier = ok && t < qDur * MON_FRAC ? (fast > .8 ? 3 : fast > .6 ? 2 : 1) : 0;
  const mon = tier ? pickMonster(tier, subY) : null;
  answers.set(pid, { choice, t, tier, mon });
  net.send(pid, { type: 'got', choice });
  sfx.tap(); drawAnswered();
  if (mon) summon(p, mon, tier);   // a fast right answer: a sea monster bursts out of the dark
  if (!list().some((x) => x.online && !answers.has(x.pid))) { clearTimeout(closeT); closeT = setTimeout(() => { if (phase === 'q') showResults(); }, 1400); }
}
$('#qSkip').onclick = () => { if (phase === 'q') showResults(); };

// ---------- the answer ----------
function resultFor(pid) {
  const p = players.get(pid), r = rounds[qi] || rounds[rounds.length - 1], l = p.last || { none: true };
  const m = l.mon ? monsterById(l.mon) : null;
  return { ok: !!l.ok, none: !!l.none, word: r.word, gain: l.gain || 0, bonus: l.bonus || 0, mon: m ? { id: m.id, name: m.name, tier: m.tier, coins: l.monCoins } : null, pts: l.pts || 0, coins: p.coins, streak: p.streak, place: placeOf(pid), of: players.size, last: qi === rounds.length - 1, zone: zoneAt(subY), depth: depthM(subY), y: subY };
}
function showResults() {
  if (phase !== 'q') return;
  clearTimeout(timerT); clearTimeout(closeT);
  phase = 'results';
  const r = rounds[qi], counts = [0, 0, 0];
  let right = 0;
  for (const p of players.values()) {
    const a = answers.get(p.pid);
    if (!a) { p.last = { ok: false, none: true }; p.streak = 0; continue; }
    counts[a.choice]++;
    if (a.choice === r.right) {
      right++; p.streak++; p.best = Math.max(p.best, p.streak);
      const gain = r5(50 + 50 * Math.max(0, 1 - a.t / qDur)), bonus = p.streak >= 2 ? 10 * (Math.min(p.streak, 5) - 1) : 0, monCoins = MON_BONUS[a.tier || 0];
      if (a.mon) p.mons.push(a.mon);
      p.coins += gain + bonus + monCoins; p.last = { ok: true, gain, bonus, monCoins, mon: a.mon, pts: gain + bonus + monCoins };
    } else { p.streak = 0; p.last = { ok: false }; }
  }
  // how deep this round takes the class: more right answers, deeper (always a little)
  const crew = Math.max(1, list().filter((p) => p.online || answers.has(p.pid)).length), share = right / crew;
  subY = Math.min(END_Y, subY + stepY * (.3 + .7 * share));
  $('#rpWord').textContent = r.word.toUpperCase();
  $('#rpClue').textContent = r.desc;
  const max = Math.max(1, ...counts);
  $('#bars').innerHTML = r.opts.map((o, k) => `<div class="bar-row${k === r.right ? ' win' : ' lose'}"><span class="bw opt-${LETTERS[k]} px"><span class="shape"></span>${esc(o)}</span><span class="bt"><i class="opt-${LETTERS[k]}" style="--w:${(counts[k] / max * 100).toFixed(0)}%"></i></span><b>${counts[k]}</b></div>`).join('');
  const nMon = list().filter((p) => p.last && p.last.mon).length;
  $('#rpSum').textContent = `${counts[r.right]} OF ${answers.size} GOT IT RIGHT` + (nMon ? ` · ${nMon} SEA MONSTER${nMon > 1 ? 'S' : ''}!` : '');
  $('#resNext').textContent = 'DIVE!';
  show('results'); sfx.reveal();
  for (const p of players.values()) net.send(p.pid, { type: 'res', me: meOf(p), ...resultFor(p.pid) });
}
$('#resNext').onclick = () => { if (phase === 'results') dive(); };

// ---------- DIVE: the submarine sinks, the monsters swim off, the leaders and the best monster ----------
function dive() {
  phase = 'fly';
  const rk = ranked();
  $('#rows').innerHTML = rk.slice(0, 5).map((p, i) => `<div class="rank" style="animation-delay:${.3 + i * .12}s"><span class="pl">${1 + rk.filter((x) => x.coins > p.coins).length}</span>${img(p.char, p.hat)}<span class="nm">${esc(p.name)}</span><span class="sc">${p.coins}</span></div>`).join('');
  const best = list().filter((p) => p.last && p.last.mon).sort((a, b) => monsterById(b.last.mon).tier - monsterById(a.last.mon).tier || b.last.pts - a.last.pts)[0];
  $('#monPanel').innerHTML = best
    ? `<h2>BIGGEST MONSTER</h2><div class="sp"><img class="px-img mon-mini" src="${monsterURL(best.last.mon, 0)}" alt=""><div><b>${esc(best.name)}</b><span class="fire">${esc(monsterById(best.last.mon).name.toUpperCase())}</span><small>+${best.last.monCoins} COINS</small></div></div>`
    : '<h2>BIGGEST MONSTER</h2><div class="sp"><small>NO MONSTER THIS TIME: ANSWER FASTER!</small></div>';
  $('#flyNext').textContent = qi === rounds.length - 1 ? 'RESULTS' : 'NEXT CLUE';
  show('fly'); sfx.dive();
  clearMonsters(false);
  const from = subShown, to = subY, t0 = performance.now(), D = 3200;
  cancelAnimationFrame(diveT);
  const stepF = (t) => {
    const k = Math.min(1, (t - t0) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    subShown = from + (to - from) * e; lookAtSub();
    if (k < 1) { diveT = requestAnimationFrame(stepF); return; }
    diveT = null;
    const z = zoneAt(subY);
    if (z !== lastZone) { lastZone = z; banner('#zoneBanner', `WELCOME TO ${z.toUpperCase()}!`, 3000); sfx.right(); }
  };
  diveT = requestAnimationFrame(stepF);
}
function banner(sel, text, ms) {
  const b = $(sel); b.textContent = text.toUpperCase(); b.hidden = false;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(b.t); b.t = setTimeout(() => { b.hidden = true; }, ms);
}
$('#flyNext').onclick = () => {
  if (phase !== 'fly') return;
  if (qi === rounds.length - 1) podium(); else startQuestion(qi + 1);
};

// ---------- the podium ----------
function endFor(pid) { const p = players.get(pid); return { type: 'end', me: meOf(p), place: placeOf(pid), of: players.size, coins: p.coins, mons: p.mons, depth: depthM(subY), zone: zoneAt(subY), floor: subY >= END_Y - 1 }; }
function podium() {
  phase = 'podium';
  const rk = ranked(), top = rk.slice(0, 3), order = [[1, top[1]], [0, top[0]], [2, top[2]]];
  const floor = subY >= END_Y - 1;
  $('#deepest').innerHTML = floor ? `THE CLASS REACHED THE LOST CITY AT ${depthM(subY)} m AND FOUND THE TREASURE!` : `THE CLASS DIVED TO ${depthM(subY)} m: ${esc(zoneAt(subY).toUpperCase())}`;
  $('#steps').innerHTML = order.filter(([, p]) => p).map(([i, p]) => `<div class="step p${i + 1}">${img(p.char, p.hat, i === 0 ? 'hop' : '')}<div class="nm">${esc(p.name)}</div><div class="sc">${p.coins} coins</div><div class="mons">${p.mons.slice(-6).map((id) => `<img class="px-img" src="${monsterURL(id, 0)}" alt="">`).join('')}</div><div class="blk px">${i + 1}</div></div>`).join('');
  show('podium'); sfx.fanfare(); confetti(5000); clearMonsters(true); cam.look(WH - VH);   // down to the treasure on the sea floor
  for (const p of players.values()) net.send(p.pid, endFor(p.pid));
}
$('#againBtn').onclick = () => { sfx.tap(); goLobby(); };

// keyboard: space/enter = the main button of the screen
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('textarea, input')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    const b = { setup: '#create', lobby: '#startBtn', results: '#resNext', fly: '#flyNext' }[phase];
    if (b && !$(b).disabled) { e.preventDefault(); $(b).click(); }
  }
});
show('setup'); cam.look(0, true);
window.CD = {   // for testing in the browser console
  players, get phase() { return phase; }, get subY() { return subY; },
  summon: (name, id, tier) => summon({ name }, id, tier),
  jump(y) { subY = subShown = y; lookAtSub(true); },
  fake(n) { for (let i = 0; i < n; i++) { const k = players.size, pid = 'fake' + k; players.set(pid, { pid, name: 'Kid ' + (k + 1), char: HEROES[k % HEROES.length].id, hat: HATS[1 + (k % (HATS.length - 1))].id, coins: 0, streak: 0, best: 0, joined: performance.now(), last: null, seat: seats++, mons: [], online: true }); } buildSub(); },
  screen(id) { phase = id; show(id); },
};

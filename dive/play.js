// Clue Dive, a student's phone: game code (or straight in from the QR code) → hero, hat and name → wait (you sit
// behind a porthole of the class submarine) → each round read the clue and tap one of 3 words; a right answer before
// the monster line on the clock calls up a sea monster on the big screen → right/wrong, coins, your monster, place →
// final. Behind it all, the ocean at the depth the class has reached.
import { $, $$, esc, store, show, ordinal } from './ui.js';
import { ocean, zoneAt, depthM } from './ocean.js';
import { CREW, crewURL, validCrew, monsterURL, artURL } from './crew.js';
import { joinGame, cleanCode } from './net.js';
import { sfx, unlock } from './sound.js';

const cam = ocean($('#sky'), { phone: true });
const LETTERS = ['a', 'b', 'c'];
// you, behind a brass porthole of the submarine
const pod = (id) => `<div class="pod ${id}"><div class="window"><img class="phero" alt=""></div><img class="ring" src="${artURL('porthole')}" alt=""></div>`;

$('#app').innerHTML = `
<section class="screen" id="menu"><div class="col">
  <div class="spacer"></div>
  <div class="logo big">CLUE<br><i>DIVE</i></div>
  <div class="tagline">THE DEEP SEA QUIZ</div>
  <div class="spacer"></div>
  <button class="btn px green" id="menuJoin">JOIN THE DIVE</button>
  <p class="mode-note">Your teacher shows the submarine on the big screen. Type the game code from it, or scan its QR code.</p>
  <button class="btn px ghost" id="menuBoard">TEACHER: OPEN THE BIG SCREEN</button>
  <div style="height:8px"></div>
</div></section>

<section class="screen" id="join" hidden><div class="col">
  <div class="logo">CLUE<br><i>DIVE</i></div>
  <div class="card px">
    <h2>GAME CODE</h2>
    <div class="digits" id="digits">${'<span class="px"></span>'.repeat(6)}<input id="codeIn" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" aria-label="Game code"></div>
    <p class="err" id="joinErr"></p>
    <button class="btn px" id="codeGo">NEXT</button>
  </div>
  <p class="hint">Type the code from the big screen, or scan its QR code.</p>
  <button class="btn px ghost" id="joinBack">BACK</button>
</div></section>

<section class="screen" id="me" hidden><div class="col">
  <div class="code-chip px" id="meCode">GAME ------</div>
  ${pod('pick')}
  <div class="card px">
    <h2>PICK YOUR CREW MEMBER</h2>
    <div class="heroes crewpick" id="heroes"></div>
    <h2 style="margin-top:16px">YOUR NAME</h2>
    <input class="namebox" id="nameIn" maxlength="14" autocomplete="off" autocapitalize="words" placeholder="Your name">
    <p class="err" id="meErr"></p>
    <button class="btn px green" id="meGo">JOIN THE CREW</button>
  </div>
</div></section>

<section class="screen" id="wait" hidden><div class="col">
  <div class="spacer"></div>
  <div class="wait-msg" id="waitTop">YOU'RE IN THE CREW!</div>
  ${pod('waiting')}
  <div class="me-name" id="waitName"></div>
  <div class="wait-msg blink" id="waitMsg">FIND YOUR WINDOW IN THE SUBMARINE<br>ON THE BIG SCREEN!</div>
  <div class="spacer"></div>
  <button class="btn px ghost" id="changeHero">CHANGE CREW MEMBER</button>
</div></section>

<section class="screen" id="q" hidden><div class="col">
  <div class="ptop"><div class="px" id="pNum">1/10</div><div class="tbar"><i id="tbar"></i><b id="pMon"></b></div><div class="px" id="pScore">0</div></div>
  <div class="monhint" id="monHint">ANSWER FAST TO CALL A SEA MONSTER!</div>
  <div class="px" id="pclue"><small>WHAT IS IT?</small><span id="pclueText"></span></div>
  <div class="pans" id="pans"></div>
  <div class="locked" id="locked" hidden>ANSWER LOCKED IN!<br><span class="blink">WATCH THE BIG SCREEN…</span></div>
</div></section>

<section class="screen" id="res" hidden><div class="col">
  <div class="verdict" id="verdict"></div>
  <div class="moncard px" id="monCard" hidden><div class="lbl">YOU CALLED UP</div><img id="monImg" alt=""><div class="mn" id="monName"></div></div>
  <div class="podwrap" id="resPod">${pod('result')}</div>
  <div class="res-card px"><div class="lbl">THE WORD WAS</div><div class="w" id="resWord"></div><div class="pts" id="resPts"></div><div class="bonus" id="resBonus"></div></div>
  <div class="stats"><div class="px"><span class="tag">COINS</span><b id="resScore">0</b></div><div class="px"><span class="tag">PLACE</span><b id="resPlace">-</b></div></div>
  <p class="hint" id="resHint">Look at the big screen.</p>
</div></section>

<section class="screen" id="end" hidden><div class="col">
  <div class="spacer"></div>
  <div class="verdict" id="endTitle">GAME OVER</div>
  ${pod('final')}
  <div class="stats"><div class="px"><span class="tag">PLACE</span><b id="endPlace">-</b></div><div class="px"><span class="tag">COINS</span><b id="endScore">0</b></div></div>
  <div class="endmons px" id="endMons"></div>
  <p class="hint" id="endDepth"></p>
  <div class="spacer"></div>
</div></section>

<section class="screen" id="lost" hidden><div class="col">
  <div class="spacer"></div>
  <div class="verdict no" id="lostTitle">OH NO!</div>
  <div class="card px"><p id="lostMsg" style="font-size:18px;margin:0 0 16px">The connection to the game was lost.</p><button class="btn px" id="rejoin">JOIN AGAIN</button><button class="btn px ghost" id="newCode" style="margin-top:16px">ANOTHER CODE</button></div>
  <div class="spacer"></div>
</div></section>`;

// ---------- who am I (the same hero and name as in Clue Quest, if this phone played it) ----------
const saved = store.get('dive-me', null) || { ...store.get('clue-me', {}), code: '', at: 0 };
const me = {
  pid: saved.pid || Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0')).join(''),
  name: saved.name || '',
  char: CREW.some((h) => h.id === saved.char) ? saved.char : CREW[(Math.random() * CREW.length) | 0].id,
  hat: 'none',
};
const save = () => store.set('dive-me', { pid: me.pid, name: me.name, char: me.char, hat: me.hat, code: game ? game.code : saved.code, at: Date.now() });
let game = null, code = '', editing = false, cur = null, picked = null, tbarT = null, joining = false, monT = null;
// your hero behind a porthole: face in the middle of the window
function drawPods(which, mood = 'idle') {
  for (const el of $$('.pod.' + which)) { el.querySelector('.phero').src = crewURL(me.char); el.dataset.mood = mood; }
}
const atDepth = (y) => { if (typeof y === 'number') cam.look(y - cam.viewH * .5); };

// ---------- the code ----------
const codeIn = $('#codeIn');
function drawDigits() {
  const v = codeIn.value; $$('#digits span').forEach((s, i) => { s.textContent = v[i] || ''; s.classList.toggle('cur', i === Math.min(v.length, 5) && document.activeElement === codeIn); });
}
codeIn.addEventListener('input', () => { codeIn.value = cleanCode(codeIn.value); $('#joinErr').textContent = ''; drawDigits(); if (codeIn.value.length === 6) goCode(); });
codeIn.addEventListener('focus', drawDigits); codeIn.addEventListener('blur', drawDigits);
codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') goCode(); });
$('#codeGo').onclick = goCode;
function goCode() {
  unlock();
  const c = cleanCode(codeIn.value);
  if (c.length !== 6) { $('#joinErr').textContent = 'The code has 6 numbers.'; $('#digits').classList.remove('shake'); void $('#digits').offsetWidth; $('#digits').classList.add('shake'); return; }
  code = c; sfx.tap(); openMe(false);
}
$('#joinBack').onclick = () => { sfx.tap(); show('menu'); };

// ---------- hero, hat and name ----------
function drawPicks() {
  $('#heroes').innerHTML = CREW.map((h) => `<button class="hero${h.id === me.char ? ' on' : ''}${h.ours ? ' ours' : ''}" data-id="${h.id}"><img class="portrait" src="${crewURL(h.id)}" alt="">${esc(h.name)}</button>`).join('');
  drawPods('pick');
}
$('#heroes').addEventListener('click', (e) => { const b = e.target.closest('.hero'); if (!b) return; unlock(); sfx.pick(); me.char = b.dataset.id; drawPicks(); bounce(); });
function bounce() { const f = $('.pod.pick'); f.classList.remove('boing'); void f.offsetWidth; f.classList.add('boing'); }
function openMe(edit) {
  editing = edit;
  $('#nameIn').value = me.name; $('#meErr').textContent = '';
  $('#meGo').textContent = edit ? 'SAVE' : 'JOIN THE CREW'; me.char = validCrew(me.char);
  $('#meCode').textContent = 'GAME ' + code.slice(0, 3) + ' ' + code.slice(3);
  drawPicks(); show('me');
}
$('#nameIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#nameIn').blur(); });
$('#meGo').onclick = async () => {
  unlock();
  const n = $('#nameIn').value.replace(/\s+/g, ' ').trim();
  if (!n) { $('#meErr').textContent = 'Type your name first.'; $('#nameIn').focus(); return; }
  me.name = n.slice(0, 14); save(); sfx.tap();
  if (editing && game) { game.send({ type: 'look', name: me.name, char: me.char, hat: me.hat }); drawWait(); show('wait'); return; }
  connect();
};
$('#changeHero').onclick = () => { sfx.tap(); openMe(true); };

// ---------- connecting ----------
async function connect() {
  if (joining) return; joining = true;
  $('#meGo').disabled = true; $('#meGo').textContent = 'JOINING…'; $('#rejoin').disabled = true;
  try {
    game = await joinGame(code, me);
  } catch (e) {
    joining = false; $('#meGo').disabled = false; $('#meGo').textContent = 'JOIN THE CREW'; $('#rejoin').disabled = false;
    if (e.code === 'no such game' || e.code === 'bad code' || e.code === 'kicked') {
      if (document.body.dataset.screen === 'lost') { lost(e.message); return; }
      show('join'); codeIn.value = ''; drawDigits(); $('#joinErr').textContent = e.message; return;
    }
    if (document.body.dataset.screen === 'lost') lost(e.message); else $('#meErr').textContent = e.message;
    return;
  }
  joining = false; $('#meGo').disabled = false; $('#rejoin').disabled = false;
  save(); sfx.join();
  history.replaceState(null, '', location.pathname + '?code=' + code);
  game.on('wait', onWait); game.on('q', onQ); game.on('got', onGot); game.on('res', onRes); game.on('end', onEnd);
  game.on('kicked', () => { game.close(); game = null; lost('The teacher removed you from this game.', true); });
  game.onLost(() => { game = null; lost('Lost the connection. Joining again…'); setTimeout(connect, 700); });
  route(game.first);
}
function route(m) { if (!m) return; ({ wait: onWait, q: onQ, res: onRes, end: onEnd }[m.type] || onWait)(m); }
function lost(msg, kicked) {
  clearInterval(tbarT);
  $('#lostMsg').textContent = msg; $('#rejoin').hidden = !!kicked;
  show('lost');
}
$('#rejoin').onclick = () => { unlock(); connect(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.body.dataset.screen === 'lost' && !$('#rejoin').hidden && !joining) connect(); });
$('#newCode').onclick = () => { codeIn.value = ''; drawDigits(); $('#joinErr').textContent = ''; show('join'); };

// ---------- the rounds ----------
const buzz = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) { /* no buzz */ } };
function drawWait(m) {
  drawPods('waiting'); $('#waitName').textContent = me.name;
  if (m) $('#waitTop').textContent = m.topic ? 'YOU\'RE IN THE CREW! · ' + m.topic.toUpperCase() : 'YOU\'RE IN THE CREW!';
}
function onWait(m) {
  clearInterval(tbarT); drawWait(m); atDepth(m.y); show('wait');
  if (m.boss) { $('#waitTop').textContent = 'BOSS BATTLE!'; $('#waitMsg').innerHTML = `${esc(m.boss.name)} BLOCKS THE WAY!<br>ANSWER RIGHT TO FIRE TORPEDOES!`; buzz([80, 60, 80]); }
  else $('#waitMsg').innerHTML = 'FIND YOUR WINDOW IN THE SUBMARINE<br>ON THE BIG SCREEN!';
}
function onQ(m) {
  cur = m; picked = m.got ?? null;
  $('#pNum').textContent = `${m.n}/${m.total}`;
  $('#pScore').textContent = (m.me ? m.me.coins || 0 : 0) + ' ¢';
  $('#pclueText').textContent = m.desc;
  $('#pMon').style.left = ((1 - m.mon) * 100) + '%';
  $('#monHint').textContent = m.boss ? `BOSS BATTLE! RIGHT ANSWERS FIRE TORPEDOES AT ${m.boss.name}!` : 'ANSWER FAST TO CALL A SEA MONSTER!';
  document.body.classList.toggle('battle', !!m.boss);
  $('#pans').innerHTML = m.opts.map((o, k) => `<button class="pbtn px opt-${LETTERS[k]} pop" style="animation-delay:${k * .08}s" data-k="${k}"><span class="shape"></span><span>${esc(o)}</span></button>`).join('');
  $('#locked').hidden = picked == null;
  markPicked(); atDepth(m.y);
  show('q'); window.scrollTo(0, 0); $('#q').scrollTop = 0;
  const end = performance.now() + m.left, bar = $('#tbar');
  clearInterval(tbarT);
  const step = () => {
    const f = Math.max(0, (end - performance.now()) / m.dur), mon = m.boss ? f > 0 : f > 1 - m.mon;
    bar.style.width = (Math.round(f * 20) * 5) + '%'; bar.classList.toggle('low', f < .25); bar.classList.toggle('mon', mon);
    $('#monHint').classList.toggle('gone', !mon || picked != null);
    if (f <= 0) clearInterval(tbarT);
  };
  step(); tbarT = setInterval(step, 100);
  if (picked == null && m.n === 1) sfx.start();
}
function markPicked() {
  $$('#pans .pbtn').forEach((b) => { const k = +b.dataset.k; b.disabled = picked != null; b.classList.toggle('picked', k === picked); b.classList.toggle('faded', picked != null && k !== picked); });
}
$('#pans').addEventListener('click', (e) => {
  const b = e.target.closest('.pbtn'); if (!b || picked != null || !cur || !game) return;
  picked = +b.dataset.k; sfx.tap(); buzz(30);
  game.send({ type: 'answer', n: cur.n, choice: picked });
  markPicked(); $('#locked').hidden = false; $('#monHint').classList.add('gone');
});
function onGot(m) { picked = m.choice; markPicked(); $('#locked').hidden = false; }
function onRes(m) {
  clearInterval(tbarT); clearInterval(monT);
  const v = $('#verdict');
  v.textContent = m.ok ? (m.torp ? 'TORPEDO HIT!' : m.mon ? 'MONSTER!' : 'RIGHT!') : m.none ? 'TIME\'S UP!' : 'OOPS!';
  v.className = 'verdict pop ' + (m.ok ? 'ok' : 'no');
  const card = $('#monCard');
  const shown = m.mon || (m.torp && m.torp.boss);
  card.hidden = !shown; $('#resPod').hidden = !!shown;
  if (m.torp && m.torp.boss) {
    $('#monImg').src = monsterURL(m.torp.boss.id); card.querySelector('.lbl').textContent = 'YOUR TORPEDO HIT';
    $('#monName').textContent = `-${m.torp.dmg} HP · ${m.torp.boss.hp > 0 ? m.torp.boss.hp + ' HP LEFT' : 'DEFEATED!'}`; card.className = 'moncard px t3';
  } else if (m.mon) {
    card.querySelector('.lbl').textContent = 'YOU CALLED UP';
    $('#monName').textContent = m.mon.name.toUpperCase();
    $('#monImg').src = monsterURL(m.mon.id);
    card.className = 'moncard px t' + m.mon.tier;
  } else drawPods('result', m.ok ? 'cheer' : m.none ? 'idle' : 'sad');
  $('#resWord').textContent = m.word;
  $('#resPts').textContent = m.ok ? `+${m.pts} COINS` : 'NO COINS THIS TIME';
  $('#resPts').style.color = m.ok ? '' : '#c02a3a';
  const bits = [];
  if (m.ok && m.mon) bits.push(`MONSTER +${m.mon.coins}`);
  if (m.ok && m.bonus) bits.push(`STREAK ×${m.streak} +${m.bonus}`);
  if (m.torp) bits.push(`TORPEDO +${m.torp.coins}`);
  if (m.bossWin) bits.push(`BOSS DEFEATED +${m.bossBonus}`);
  $('#resBonus').textContent = bits.join(' · ') || (m.ok ? 'ANSWER FASTER TO CALL A MONSTER!' : '');
  $('#resScore').textContent = m.coins;
  $('#resPlace').textContent = `${ordinal(m.place)}/${m.of}`;
  $('#resHint').textContent = m.last ? 'That was the last clue! Look at the big screen.' : `The submarine is at ${m.depth} m in ${m.zone}. Watch the big screen!`;
  atDepth(m.y);
  show('res');
  if (m.ok) (m.mon || m.torp ? sfx.roar : sfx.right)(); else sfx.wrong();
  buzz(m.ok ? (m.mon ? [60, 40, 60, 40, 120] : [40, 60, 40]) : 200);
}
function onEnd(m) {
  clearInterval(tbarT); clearInterval(monT);
  $('#endTitle').textContent = m.place === 1 ? 'YOU WON!' : m.place <= 3 ? 'TOP 3!' : 'GAME OVER';
  $('#endTitle').className = 'verdict pop' + (m.place <= 3 ? ' ok' : '');
  drawPods('final', m.place <= 3 ? 'cheer' : 'idle');
  $('#endPlace').textContent = `${ordinal(m.place)}/${m.of}`;
  $('#endScore').textContent = m.coins;
  $('#endMons').innerHTML = m.mons && m.mons.length ? `<small>YOUR MONSTERS</small><div>${m.mons.map((id) => `<img src="${monsterURL(id)}" alt="">`).join('')}</div>` : '<small>NO MONSTERS THIS TIME</small>';
  $('#endDepth').textContent = m.floor ? `Your class reached the Lost City at ${m.depth} m and found the treasure!` : `Your class dived to ${m.depth} m (${m.zone}).`;
  show('end');
  if (m.place <= 3) sfx.fanfare();
}

// ---------- the start menu ----------
function openMenu() { cam.rest(); show('menu'); }
$('#menuJoin').onclick = () => { unlock(); sfx.tap(); codeIn.value = ''; drawDigits(); show('join'); setTimeout(() => codeIn.focus(), 50); };
$('#menuBoard').onclick = () => { unlock(); sfx.tap(); location.href = new URL('./?host', location.href).href; };

// ---------- start: straight in from the QR code (?code=123456), back in after a reload, or the menu ----------
const urlCode = cleanCode(new URLSearchParams(location.search).get('code'));
drawDigits();
for (const w of ['waiting', 'result', 'final']) drawPods(w);
if (urlCode.length === 6) {
  code = urlCode; codeIn.value = urlCode; drawDigits();
  if (me.name && saved.code === urlCode && Date.now() - (saved.at || 0) < 3 * 3600e3) { openMe(false); connect(); }
  else openMe(false);
} else openMenu();

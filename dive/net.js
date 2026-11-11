// Clue Dive networking (the same as Clue Quest's, on its own topics and peer names, so the two games' codes never meet): no game server of our own and no accounts. The teacher's browser is the game; phones
// reach it through free public message servers:
//   1. three public MQTT brokers (HiveMQ, EMQX, Mosquitto) over secure WebSockets: built for thousands of small
//      devices, so a whole class behind one school IP is fine. The teacher listens on all of them at once and a
//      phone uses whichever answers first, so one broker being down or blocked does not matter.
//   2. the PeerJS signalling server (port 443) as a fallback for networks that only allow port 443. It was the
//      only route at first (2026-11-10), but it bans an IP for an hour after a few hundred connections, which a
//      school (everyone behind one IP) could reach, so phones only use it when no broker answers.
// Brokers are public, so everything on them is encrypted (AES-GCM, key derived from the game code) and the topics
// are hashed: anyone watching sees random topic names and noise, never names or answers.
// Phones are known by a player id (pid) they keep in localStorage, so a phone that sleeps or reloads comes back
// as the same player with the same score.
//
//   const H = await hostGame({ onHello(pid, me, isNew) → first message for that phone, onMessage(pid, m), onGone(pid) })
//   H.code   H.send(pid, msg)   H.sendAll(msg)   H.kick(pid)   H.online(pid)   H.close()
//   const G = await joinGame(code, { pid, name, char, hat })   rejects with Error .code 'no such game' | 'network' | 'bad code' | 'kicked' | 'full'
//   G.on(type, fn)   G.send(msg)   G.onLost(fn)   G.close()    G.first: the host's first message (from onHello)   G.via: route used

const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const PEER_PREFIX = 'fugio-dive-';
const PING = 4000, GONE = 15000, ALIVE_EVERY = 20000;
const DEBUG = /[?&]debug\b/.test(location.search);
const log = (...a) => { if (DEBUG) console.log('clue', ...a); };
const MESSAGES = {
  'no such game': 'No game with that code. Check the code on the big screen.',
  network: 'No connection. Check the internet and try again.',
  'bad code': 'The game code has 6 numbers.',
  kicked: 'The teacher removed you from this game.',
  full: 'This game is full.',
};
function oops(code) { const e = new Error(MESSAGES[code] || code); e.code = code; return e; }
export const cleanCode = (c) => String(c || '').replace(/\D/g, '').slice(0, 6);
const newCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
export const MAX_PLAYERS = 60;
const te = new TextEncoder(), td = new TextDecoder();

// ---------- the game's secret: topic names and the encryption key, both from the code ----------
async function secrets(code) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode('fugio-dive-topic:' + code)));
  const base = 'fugio-cd/' + Array.from(h.slice(0, 10), (b) => b.toString(16).padStart(2, '0')).join('');
  const raw = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: te.encode('fugio-clue-dive-v1'), iterations: 60000, hash: 'SHA-256' }, raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return {
    base,
    async seal(obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj)))); const out = new Uint8Array(12 + c.length); out.set(iv); out.set(c, 12); return out; },
    async open(bytes) { try { return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)))); } catch (e) { return null; } },
  };
}

// ---------- a tiny MQTT 3.1.1 client over WebSocket (QoS 0 only, which is all we need) ----------
const mstr = (s) => { const b = te.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
const mlen = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return o; };
const mpkt = (h, body) => { const head = [h, ...mlen(body.length)], out = new Uint8Array(head.length + body.length); out.set(head); out.set(body, head.length); return out; };
function mqtt(url, timeout = 6000) {
  return new Promise((ok, fail) => {
    let ws, buf = new Uint8Array(0), pid = 1, ping = null, closed = false;
    const msgs = [], gone = [];
    try { ws = new WebSocket(url, 'mqtt'); } catch (e) { fail(e); return; }
    ws.binaryType = 'arraybuffer';
    const t = setTimeout(() => { try { ws.close(); } catch (e) { /* gone */ } fail(new Error('timeout')); }, timeout);
    const api = {
      url,
      sub(topic) { ws.send(mpkt(0x82, [pid >> 8, pid & 255, ...mstr(topic), 0])); pid = (pid % 65000) + 1; },
      pub(topic, bytes, retain = false) { if (ws.readyState !== 1) return; const head = mstr(topic), body = new Uint8Array(head.length + bytes.length); body.set(head); body.set(bytes, head.length); ws.send(mpkt(retain ? 0x31 : 0x30, body)); },
      onMessage: (f) => msgs.push(f),
      onClose: (f) => gone.push(f),
      get open() { return ws.readyState === 1 && !closed; },
      close() { closed = true; clearInterval(ping); try { ws.send(new Uint8Array([0xe0, 0])); ws.close(); } catch (e) { /* gone */ } },
    };
    ws.onopen = () => ws.send(mpkt(0x10, [...mstr('MQTT'), 4, 2, 0, 45, ...mstr('fcd' + rid(12))]));
    ws.onerror = () => {};
    ws.onclose = () => { clearTimeout(t); clearInterval(ping); if (!closed) { closed = true; for (const f of gone) f(); } fail(new Error('closed')); };
    ws.onmessage = (e) => {
      const more = new Uint8Array(e.data), b = new Uint8Array(buf.length + more.length); b.set(buf); b.set(more, buf.length); buf = b;
      for (;;) {   // pull out every complete packet
        if (buf.length < 2) break;
        let len = 0, mul = 1, i = 1, byte;
        do { if (i >= buf.length) return; byte = buf[i++]; len += (byte & 127) * mul; mul *= 128; } while (byte & 128);
        if (buf.length < i + len) break;
        const hdr = buf[0], type = hdr >> 4, body = buf.slice(i, i + len); buf = buf.slice(i + len);
        if (type === 2) {   // CONNACK
          clearTimeout(t);
          if (body[1] !== 0) { fail(new Error('refused')); ws.close(); return; }
          ping = setInterval(() => { try { ws.send(new Uint8Array([0xc0, 0])); } catch (er) { /* gone */ } }, 25000);
          ok(api);
        } else if (type === 3) {   // PUBLISH
          const tl = (body[0] << 8) | body[1], topic = td.decode(body.slice(2, 2 + tl)), qos = (hdr >> 1) & 3;
          const payload = body.slice(2 + tl + (qos ? 2 : 0));
          for (const f of msgs) try { f(topic, payload); } catch (er) { console.error('clue mqtt', er); }
        }
      }
    };
  });
}

// ---------- the PeerJS route (port 443 fallback): messages ride in the signalling server's CANDIDATE envelope ----------
let peerLib = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!peerLib) peerLib = new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = new URL('lib/peerjs.min.js', import.meta.url).href; s.async = true;
    s.onload = () => (window.Peer ? ok(window.Peer) : fail(oops('network')));
    s.onerror = () => { peerLib = null; s.remove(); fail(oops('network')); };
    document.head.appendChild(s);
  });
  return peerLib;
}
function openPeer(Peer, id) {
  return new Promise((ok, fail) => {
    // the error handler is only for opening: once open, a 'peer-unavailable' must not destroy the peer
    const bad = (e) => { clearTimeout(t); p.off('open', good); p.destroy(); fail(e); };
    const good = () => { clearTimeout(t); p.off('error', bad); ok(p); };
    const p = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    const t = setTimeout(() => { p.off('open', good); p.off('error', bad); p.destroy(); fail({ type: 'network' }); }, 9000);
    p.once('open', good); p.once('error', bad);
  });
}
const ENV = { candidate: { candidate: 'candidate:1 1 udp 2122260223 192.0.2.1 9 typ host', sdpMid: '0', sdpMLineIndex: 0 }, type: 'data', connectionId: 'dc_dive' };
function peerRoute(peer) {
  const sock = peer.socket, fns = [], gone = [];
  sock.on('message', (d) => {
    if (!d || !d.src) return;
    if (d.type === 'CANDIDATE' && d.payload && d.payload.clue1) { for (const f of fns) f(d.src, d.payload.m); setTimeout(() => { try { peer._lostMessages && peer._lostMessages.delete(ENV.connectionId); } catch (e) { /* fine */ } }, 0); }
    else if (d.type === 'EXPIRE') for (const f of gone) f(d.src);
  });
  peer.on('disconnected', () => setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* tried */ } }, 800));
  return {
    name: 'peerjs',
    send(dst, m) { try { sock.send({ type: 'CANDIDATE', dst, payload: { ...ENV, clue1: 1, m } }); } catch (e) { /* closing */ } },
    on: (f) => fns.push(f), onExpire: (f) => gone.push(f),
    close() { setTimeout(() => { try { peer.destroy(); } catch (e) { /* gone */ } }, 300); },
  };
}

// ---------- the teacher ----------
export async function hostGame(h) {
  // a code nobody is using right now on the first broker that answers
  let code = '', S = null;
  const routes = [];          // { name, send(addr, m), close() }
  const byPid = new Map();    // pid → { route, addr, seen }
  const byAddr = new Map();   // route|addr → pid
  const banned = new Set();
  let closed = false;
  const drop = (pid, tell = true) => {
    const e = byPid.get(pid); if (!e) return;
    byPid.delete(pid); if (byAddr.get(e.route.name + '|' + e.addr) === pid) byAddr.delete(e.route.name + '|' + e.addr);
    if (tell && !closed) h.onGone(pid);
  };
  function incoming(route, addr, m) {
    if (!m || typeof m !== 'object') return;
    const key = route.name + '|' + addr;
    if (m.type === 'hello') {
      const id = String(m.pid || addr).slice(0, 40);
      if (banned.has(id)) return route.send(addr, { type: 'refuse', why: 'kicked' });
      const old = byPid.get(id), isNew = !old;
      if (isNew && byPid.size >= MAX_PLAYERS) return route.send(addr, { type: 'refuse', why: 'full' });
      if (old && (old.route !== route || old.addr !== addr)) { byAddr.delete(old.route.name + '|' + old.addr); old.route.send(old.addr, { type: 'replaced' }); }
      byPid.set(id, { route, addr, seen: Date.now() }); byAddr.set(key, id);
      const first = h.onHello(id, m.me || {}, isNew);
      route.send(addr, { type: 'welcome', code, first });
      log('hello via', route.name, id);
      return;
    }
    const pid = byAddr.get(key), e = pid && byPid.get(pid);
    if (!e) { route.send(addr, { type: 'who' }); return; }
    e.seen = Date.now();
    if (m.type === 'ping') route.send(addr, { type: 'pong' });
    else h.onMessage(pid, m);
  }

  // open the brokers (all at once); the game needs at least one route
  const tries = BROKERS.map((url) => mqtt(url).catch(() => null));
  const first = await Promise.race([Promise.any(tries.map((p) => p.then((c) => c || Promise.reject()))).catch(() => null), new Promise((r) => setTimeout(() => r(null), 7000))]);
  for (let k = 0; k < 6 && !code; k++) {
    const c = newCode(), s = await secrets(c);
    if (first && await aliveOn(first, s)) continue;   // someone else's game has this code
    code = c; S = s;
  }
  if (!code) { code = newCode(); S = await secrets(code); }
  const T = { h: S.base + '/h', a: S.base + '/a', p: (id) => S.base + '/p/' + id };
  const brokerConns = [];
  function addBroker(conn) {
    if (!conn || closed) return;
    brokerConns.push(conn);
    const route = { name: conn.url, send: async (addr, m) => { if (conn.open) conn.pub(T.p(addr), await S.seal(m)); }, close: () => conn.close() };
    routes.push(route);
    conn.sub(T.h);
    conn.onMessage(async (topic, bytes) => { if (topic !== T.h) return; const d = await S.open(bytes); if (d && d.f) incoming(route, String(d.f).slice(0, 24), d.m); });
    const alive = async () => { if (conn.open && !closed) conn.pub(T.a, await S.seal({ alive: Date.now() }), true); };
    alive(); const ai = setInterval(alive, ALIVE_EVERY);
    conn.onClose(() => {   // a broker dropped: take it out, try to come back in a moment
      clearInterval(ai); routes.splice(routes.indexOf(route), 1); brokerConns.splice(brokerConns.indexOf(conn), 1);
      for (const [pid, e] of byPid) if (e.route === route) drop(pid);
      if (!closed) setTimeout(() => mqtt(conn.url).then(addBroker).catch(() => {}), 3000);
    });
    log('host on', conn.url);
  }
  tries.forEach((p) => p.then(addBroker));
  // PeerJS (port 443) too, if the server will have us
  const peerReady = loadPeer().then((Peer) => openPeer(Peer, PEER_PREFIX + code)).then((peer) => {
    if (closed) { peer.destroy(); return; }
    const R = peerRoute(peer), route = { name: 'peerjs', send: (addr, m) => R.send(addr, m), close: () => R.close() };
    routes.push(route);
    R.on((src, m) => incoming(route, src, m));
    R.onExpire((src) => { const pid = byAddr.get('peerjs|' + src); if (pid) drop(pid); });
    log('host on peerjs');
    return true;
  }).catch((e) => { log('peerjs unavailable', e && e.type); return false; });
  if (!first && !(await peerReady)) throw oops('network');

  const sweep = setInterval(() => { const now = Date.now(); for (const [pid, e] of byPid) if (now - e.seen > GONE) drop(pid); }, 3000);
  const send = (pid, msg) => { const e = byPid.get(pid); if (e) e.route.send(e.addr, msg); };
  const close = async () => {
    if (closed) return;
    for (const pid of byPid.keys()) send(pid, { type: 'bye' });
    closed = true; clearInterval(sweep);
    for (const c of brokerConns) if (c.open) c.pub(T.a, new Uint8Array(0), true);   // clear the "alive" note
    setTimeout(() => { for (const r of routes) r.close(); }, 400);
  };
  addEventListener('pagehide', close);
  return {
    code, send, close,
    sendAll(msg) { for (const pid of byPid.keys()) send(pid, msg); },
    online: (pid) => byPid.has(pid),
    kick(pid) { banned.add(pid); send(pid, { type: 'kicked' }); drop(pid, false); },
  };
}
// is a game with these secrets running on this broker? (its retained "alive" note is fresh)
function aliveOn(conn, S) {
  return new Promise((ok) => {
    const topic = S.base + '/a', t = setTimeout(() => ok(false), 1200);
    conn.onMessage(async (tp, bytes) => { if (tp !== topic || !bytes.length) return; const d = await S.open(bytes); if (d && Date.now() - d.alive < 3 * ALIVE_EVERY) { clearTimeout(t); ok(true); } });
    conn.sub(topic);
  });
}

// ---------- a student ----------
export async function joinGame(rawCode, me) {
  const code = cleanCode(rawCode);
  if (code.length !== 6) throw oops('bad code');
  const S = await secrets(code), myId = rid(10);
  const T = { h: S.base + '/h', a: S.base + '/a', me: S.base + '/p/' + myId };
  const handlers = {}, lost = [];
  let closed = false, route = null, first = null, heard = Date.now(), pinger = null;
  const hello = { type: 'hello', pid: me.pid, me: { name: me.name, char: me.char, hat: me.hat } };

  // 1. the brokers, all at once. The first one where the game's "alive" note shows up gets our hello (only one, so
  //    the teacher never sees us on two routes); the others are closed once the game has welcomed us.
  const conns = [];
  const viaBroker = new Promise((ok, fail) => {
    let pending = BROKERS.length, chosen = null, done = false;
    const finish = (err, val) => { if (done) return; done = true; for (const c of conns) if (!val || c !== val.r.conn) c.close(); err ? fail(err) : ok(val); };
    const giveUp = () => { if (--pending === 0 && !chosen) finish(oops('no such game')); };
    BROKERS.forEach((url) => mqtt(url).then((conn) => {
      if (done || closed) { conn.close(); return; }
      conns.push(conn);
      let mine = false;
      const r = { name: url, conn, send: async (m) => { if (conn.open) conn.pub(T.h, await S.seal({ f: myId, m })); }, close: () => conn.close() };
      conn.sub(T.me); conn.sub(T.a);
      const quiet = setTimeout(() => { if (chosen !== r) giveUp(); }, 2500);                         // no game here
      conn.onMessage(async (topic, bytes) => {
        if (topic === T.a) {
          if (!bytes.length || chosen) return;
          const d = await S.open(bytes);
          if (d && Date.now() - d.alive < 3 * ALIVE_EVERY && !chosen) { chosen = r; clearTimeout(quiet); r.send(hello); setTimeout(() => { if (!mine) finish(oops('network')); }, 6000); }
          return;
        }
        if (topic !== T.me) return;
        const m = await S.open(bytes); if (!m) return;
        if (!mine) {
          if (m.type === 'welcome') { mine = true; finish(null, { r, first: m.first }); }
          else if (m.type === 'refuse') finish(oops(m.why));
          return;
        }
        deliver(m);
      });
      conn.onClose(() => { if (mine) drop(); });
    }).catch(giveUp));
  });
  // 2. PeerJS on port 443, only when no broker can be reached at all
  const viaPeer = () => loadPeer().then((Peer) => openPeer(Peer)).then((peer) => new Promise((ok, fail) => {
    const R = peerRoute(peer), hostId = PEER_PREFIX + code;
    const r = { name: 'peerjs', send: (m) => R.send(hostId, m), close: () => R.close() };
    const t = setTimeout(() => { r.close(); fail(oops('no such game')); }, 9000);
    let mine = false;
    R.onExpire((src) => { if (src !== hostId) return; if (!mine) { clearTimeout(t); r.close(); fail(oops('no such game')); } else drop(); });
    R.on((src, m) => {
      if (src !== hostId || !m) return;
      if (!mine) { if (m.type === 'welcome') { mine = true; clearTimeout(t); ok({ r, first: m.first }); } else if (m.type === 'refuse') { clearTimeout(t); r.close(); fail(oops(m.why)); } return; }
      deliver(m);
    });
    r.send(hello);
  }), () => { throw oops('network'); });

  function deliver(m) {
    heard = Date.now();
    if (m.type === 'who') { route && route.send(hello); return; }
    if (m.type === 'bye' || m.type === 'replaced') { drop(); return; }
    if (m.type === 'pong') return;
    for (const f of handlers[m.type] || []) try { f(m); } catch (e) { console.error('clue', m.type, e); }
  }
  const cleanup = () => { clearInterval(pinger); removeEventListener('pagehide', close); if (route) route.close(); };
  function drop() { if (closed) return; closed = true; cleanup(); for (const f of lost) f(); }
  function close() { if (closed) return; closed = true; cleanup(); }

  let got;
  try { got = await viaBroker; }
  catch (e) {
    if (e.code === 'kicked' || e.code === 'full') throw e;
    log('no broker route (' + e.code + '), trying peerjs');
    try { got = await viaPeer(); } catch (e2) { throw e.code === 'no such game' || e2.code === 'no such game' ? oops('no such game') : e2; }
  }
  route = got.r; first = got.first; heard = Date.now();
  log('joined via', route.name);
  pinger = setInterval(() => { if (Date.now() - heard > GONE) drop(); else route.send({ type: 'ping' }); }, PING);
  addEventListener('pagehide', close);
  return {
    code, via: route.name, get first() { return first; },
    on(type, fn) { (handlers[type] ||= []).push(fn); },
    onLost(fn) { lost.push(fn); },
    send(msg) { if (!closed) route.send(msg); },
    close,
  };
}

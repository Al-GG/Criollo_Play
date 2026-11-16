'use strict';
// Multijugador con PeerJS (WebRTC): los navegadores se conectan directo entre sí.
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)
//
// Cómo funciona:
//  - El ANFITRIÓN crea la sala (código VOLA-1234). Su juego manda: simula el viento, los rivales de la
//    computadora y decide quién corta a quién. Cada amigo que entra toma el lugar de un rival de la computadora.
//  - Cada INVITADO simula su propio volantín (así los controles responden al tiro) y le manda su estado al
//    anfitrión ~20 veces por segundo. El anfitrión le devuelve ~15 veces por segundo cómo está todo.
//  - PeerJS usa un servidor gratuito solo para "presentar" a los jugadores; después los datos van directo.

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const NET_PREFIX = 'volantines-cl-';      // prefijo de las salas en el servidor público de PeerJS
const NET_SNAP_HZ = 15, NET_ME_HZ = 20;   // envíos por segundo (anfitrión → invitados / invitado → anfitrión)
const NET_MAX_GUESTS = 3;                 // hasta 4 personas por sala

const NET = {
  role: null,          // null (un jugador) | 'host' | 'guest'
  peer: null, code: null, myId: null, connected: false,
  conns: new Map(),    // anfitrión: peerId → { conn, flyer }
  hostConn: null,      // invitado: conexión con el anfitrión
  ghosts: new Map(),   // invitado: id → volantinero que llega por la red
  sendAcc: 0,
};
let lobbyOpen = false;

// Colores para los amigos que se unen (personaje y volantín)
const GUEST_LOOKS = [
  { shirt: 0x1f6fd1, cap: 0xffd500, kite: [0x1f6fd1, 0xffd500, 0x1f6fd1, 0xffd500], tail: [0xffd500, 0x1f6fd1] },
  { shirt: 0x2bb3a3, cap: 0xffffff, kite: [0x2bb3a3, 0xffffff, 0xff6b9a, 0xffffff], tail: [0xff6b9a, 0x2bb3a3] },
  { shirt: 0xf28c28, cap: 0x222222, kite: [0xf28c28, 0x222222, 0xf28c28, 0xffffff], tail: [0x222222, 0xf28c28] },
];

// Ids de red de los volantineros locales
player.netId = NET_JOIN_CODE ? null : 'host';
rivals.forEach((r, i) => { r.netId = 'ai' + i; });

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((ok, falla) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.onload = ok;
    s.onerror = () => falla(new Error('No se pudo cargar PeerJS (¿hay internet?)'));
    document.head.appendChild(s);
  });
}

// ---------- Interfaz: sala ----------
const lobbyEl = document.getElementById('lobby');
function openLobby() {
  refreshLobby();
  lobbyEl.hidden = false;
  lobbyOpen = true;
  keys.Space = false; mouseDown = false;
}
// Muestra "crear / unirse" o, si ya está en una sala, el código y el botón para salir
function refreshLobby() {
  const inRoom = !!NET.role;
  document.getElementById('lobbyStart').hidden = inRoom;
  document.getElementById('lobbyLeave').hidden = !inRoom;
  if (NET.role === 'host') {
    setNetStatus(`Tu sala: <b class="code">VOLA-${NET.code}</b><br>${NET.conns.size
      ? 'Jugando con ' + [...NET.conns.values()].map(c => c.flyer.name).join(', ') + '.'
      : 'Pásale este código a tus amigos. Esperando jugadores...'}`);
  } else if (NET.role === 'guest') {
    setNetStatus(NET.connected ? `Estás en la sala <b class="code">VOLA-${NET.code}</b> como ${player.name}.` : `Conectando a VOLA-${NET.code}...`);
  }
}

// Salir de la sala: corta las conexiones y vuelve al juego normal en el mismo escenario y hora
function netLeave() {
  NET.leaving = true;
  for (const { conn } of NET.conns.values()) conn.close();
  NET.hostConn?.close();
  NET.peer?.destroy();
  backToSolo();
}
function backToSolo() {
  location.href = `${location.pathname}?escenario=${BIOME_KEY}&hora=${TIME_KEY}`;
}
document.getElementById('lobbyLeave').addEventListener('click', netLeave);
function closeLobby() { lobbyEl.hidden = true; lobbyOpen = false; }
function setNetStatus(html) { document.getElementById('netStatus').innerHTML = html; }
function updateNetHud() {
  if (lobbyOpen) refreshLobby();   // si la ventana de sala está abierta, actualizar quién está
  const hud = document.getElementById('net');
  if (!NET.role) { hud.hidden = true; return; }
  hud.hidden = false;
  const humans = 1 + (NET.role === 'host' ? NET.conns.size : [...NET.ghosts.values()].filter(g => g.human).length);
  hud.textContent = NET.role === 'host'
    ? `👥 Sala VOLA-${NET.code} · ${humans} jugador${humans > 1 ? 'es' : ''}`
    : (NET.connected ? `👥 En sala VOLA-${NET.code} · ${humans} jugadores` : `👥 Conectando a VOLA-${NET.code}...`);
}

document.getElementById('btnNet').addEventListener('click', openLobby);
document.getElementById('lobbyClose').addEventListener('click', closeLobby);
document.getElementById('lobbyHost').addEventListener('click', netHost);
document.getElementById('lobbyJoin').addEventListener('click', () => {
  const code = document.getElementById('lobbyCode').value.replace(/\D/g, '');
  if (code.length !== 4) { setNetStatus('El código tiene 4 números, por ejemplo <b>VOLA-4821</b>.'); return; }
  // Recarga la página como invitado (así parte limpio, sin rivales propios)
  location.href = location.pathname + '?unirse=' + code;
});
document.getElementById('lobbyCode').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('lobbyJoin').click();
});

// ---------- Utilidades compartidas ----------
const round2 = v => Math.round(v * 100) / 100;
const netName = f => f.isPlayer ? (NET.role === 'host' ? 'Jugador 1' : f.name) : f.name;

function removeFlyer(f) {
  scene.remove(f.rig.root, f.kite, f.stringLine, f.tailLine, f.hl, ...f.bows.map(b => b.mesh));
  if (f.label) scene.remove(f.label);
  const i = flyers.indexOf(f); if (i >= 0) flyers.splice(i, 1);
  const j = rivals.indexOf(f); if (j >= 0) rivals.splice(j, 1);
  attackers.delete(f);
  engaged.clear();   // los enredos usan índices de flyers: se recalculan solos
}

function setFlyerLook(f, look) {
  const pos = f.rig.root.position.clone(), rotY = f.rig.root.rotation.y;
  scene.remove(f.rig.root);
  f.rig = buildCharacter(look);
  f.look = look;
  f.rig.root.position.copy(pos);
  f.rig.root.rotation.y = rotY;
  scene.add(f.rig.root);
}

// Un lugar libre cerca del área de juego, lejos de los demás
function freeSpot() {
  for (let tries = 0; tries < 300; tries++) {
    const x = RIVAL_SPOT.x[0] + Math.random() * (RIVAL_SPOT.x[1] - RIVAL_SPOT.x[0]);
    const z = RIVAL_SPOT.z[0] + Math.random() * (RIVAL_SPOT.z[1] - RIVAL_SPOT.z[0]);
    if (Math.abs(x) < 3 && z < -3) continue;
    if (flyers.every(f => Math.hypot(x - f.rig.root.position.x, z - f.rig.root.position.z) >= RIVAL_SPOT.minSep)) return [x, 0, z];
  }
  return [(Math.random() - 0.5) * 20, 0, 4];
}

// Estado que viaja por la red
function flyerSnapshot(f) {
  const r = f.rig.root.position;
  return {
    id: f.netId, name: netName(f), human: !!(f.human || f.isPlayer),
    kiteType: f.kiteType, kiteColors: f.kiteColors, tailColors: f.tailColors, look: f.look || null,
    at: [round2(r.x), round2(r.z)],
    p: [round2(f.pos.x), round2(f.pos.y), round2(f.pos.z)], L: round2(f.L), s: f.state,
    sv: round2(f.steerVis), pi: round2(f.pullIn), ri: round2(f.releaseIn), ra: round2(f.rollAngle),
    d: round2(f.damage), m: f.mode,
  };
}
// Aplica el estado recibido a un volantinero que se mueve por la red (se suaviza en netUpdate)
function applyRemoteState(f, s, fromGuest) {
  if (!(fromGuest && time < (f.netLockUntil || 0))) {
    if (f.state !== 'flying' && s.s === 'flying') f.damage = 0;   // volvió a subir: hilo nuevo
    f.state = s.s;
  }
  if (!f.netPos) { f.netPos = new V3(...s.p); f.pos.copy(f.netPos); }
  else f.netPos.set(...s.p);
  f.L = s.L; f.steerVis = s.sv; f.pullIn = s.pi; f.releaseIn = s.ri; f.rollAngle = s.ra;
  if (s.kiteType !== f.kiteType && KITE_TYPES[s.kiteType]) buildKiteParts(f, s.kiteType);
  if (!fromGuest) { f.damage = s.d; f.mode = s.m; }
  if (f.pos.y > 6) f.armed = true;
}

// ---------- Anfitrión ----------
async function netHost() {
  if (NET.role) { setNetStatus(`Tu sala es <b>VOLA-${NET.code}</b>`); return; }
  setNetStatus('Creando sala...');
  try { await loadPeerJS(); } catch (e) { setNetStatus(e.message); return; }
  const intentar = n => {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const peer = new Peer(NET_PREFIX + code);
    peer.on('open', () => {
      Object.assign(NET, { role: 'host', peer, code, myId: 'host', connected: true });
      player.netId = 'host';
      player.human = true;
      refreshLobby();   // muestra el código y el botón para salir
      updateNetHud();
    });
    peer.on('connection', hostAccept);
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && n < 5) { peer.destroy(); intentar(n + 1); }   // código ocupado: otro
      else setNetStatus('No se pudo crear la sala (' + err.type + ').');
    });
  };
  intentar(0);
}

function hostAccept(conn) {
  conn.on('data', msg => hostOnData(conn, msg));
  conn.on('close', () => hostDrop(conn));
  conn.on('error', () => hostDrop(conn));
}

function hostOnData(conn, msg) {
  let g = NET.conns.get(conn.peer);
  if (msg.t === 'ask') {
    // Primero le cuento al invitado dónde jugamos, para que cargue el mismo escenario y hora
    if (!g && NET.conns.size >= NET_MAX_GUESTS) { conn.send({ t: 'full' }); return; }
    conn.send({ t: 'info', biome: BIOME_KEY, hora: TIME_KEY });
    return;
  }
  if (msg.t === 'hello' && !g) {
    if (NET.conns.size >= NET_MAX_GUESTS) { conn.send({ t: 'full' }); return; }
    const n = NET.conns.size;
    const L = GUEST_LOOKS[n % GUEST_LOOKS.length];
    // Toma el lugar de un rival de la computadora (si queda alguno)
    let at;
    const ai = rivals[rivals.length - 1];
    if (ai) { at = [ai.rig.root.position.x, 0, ai.rig.root.position.z]; removeFlyer(ai); }
    else at = freeSpot();
    const usados = new Set([...NET.conns.values()].map(c => c.flyer.name));
    let num = 2; while (usados.has('Jugador ' + num)) num++;
    const name = 'Jugador ' + num;
    const look = { shirt: L.shirt, cap: L.cap, pants: 0x2f3f5a, hair: 0x2a1a10 };
    const f = createFlyer({ name, at, look, kiteColors: L.kite, tailColors: L.tail,
      kiteType: KITE_TYPES[msg.kiteType] ? msg.kiteType : 'clasico' });
    f.remote = true; f.human = true; f.netId = 'g-' + conn.peer; f.look = look;
    flyers.push(f);
    engaged.clear();
    NET.conns.set(conn.peer, { conn, flyer: f });
    conn.send({ t: 'welcome', id: f.netId, name, at, look, kiteColors: L.kite, tailColors: L.tail });
    showToast(`👥 ${name} se unió a la sala`);
    updateNetHud();
    return;
  }
  if (g && msg.t === 'me') applyRemoteState(g.flyer, msg, true);
}

function hostDrop(conn) {
  const g = NET.conns.get(conn.peer);
  if (!g) return;
  NET.conns.delete(conn.peer);
  removeFlyer(g.flyer);
  showToast(`👥 ${g.flyer.name} salió de la sala`);
  updateNetHud();
}

function hostBroadcast(msg) {
  for (const { conn } of NET.conns.values()) if (conn.open) conn.send(msg);
}

// Llamado desde cutFlyer (comision.js): el anfitrión avisa a todos los cortes
function netOnCut(victim, by) {
  if (NET.role !== 'host' || !NET.conns.size) return;
  if (victim.remote) victim.netLockUntil = time + 1.5;   // que no "reviva" con un mensaje atrasado
  hostBroadcast({ t: 'cut', victim: victim.netId, by: by.netId, vn: netName(victim), bn: netName(by) });
}

// ---------- Invitado ----------
async function netJoin(code) {
  Object.assign(NET, { role: 'guest', code });
  updateNetHud();
  try { await loadPeerJS(); } catch (e) { showMsg('Sin conexión<small>' + e.message + '</small>'); return; }
  const peer = new Peer();
  NET.peer = peer;
  peer.on('open', () => {
    const conn = peer.connect(NET_PREFIX + code);
    NET.hostConn = conn;
    conn.on('open', () => conn.send({ t: 'ask' }));
    conn.on('data', guestOnData);
    conn.on('close', guestLost);
  });
  peer.on('error', err => {
    if (err.type === 'peer-unavailable') {
      showMsg(`No existe la sala VOLA-${code}<small>Revisa el código. Volviendo al modo de un jugador...</small>`);
      setTimeout(backToSolo, 3500);
    } else showToast('Problema de conexión: ' + err.type);
  });
}

function guestOnData(msg) {
  if (msg.t === 'full') {
    showMsg('La sala está llena<small>Volviendo al modo de un jugador...</small>');
    setTimeout(backToSolo, 3500);
  } else if (msg.t === 'info') {
    // Si el anfitrión juega en otro escenario u hora, recarga con los mismos
    if (msg.biome !== BIOME_KEY || msg.hora !== TIME_KEY) {
      location.href = `${location.pathname}?escenario=${msg.biome}&hora=${msg.hora}&unirse=${NET.code}`;
      return;
    }
    NET.hostConn.send({ t: 'hello', kiteType: player.kiteType });
  } else if (msg.t === 'welcome') {
    Object.assign(NET, { myId: msg.id, connected: true });
    player.netId = msg.id;
    player.name = msg.name;
    setFlyerLook(player, msg.look);
    player.kiteColors = msg.kiteColors;
    player.tailColors = msg.tailColors;
    buildKiteParts(player, player.kiteType);
    player.rig.root.position.set(msg.at[0], 0, msg.at[2]);
    resetFlyer(player);
    showToast(`👥 Conectado a la sala VOLA-${NET.code} como ${msg.name}`);
    updateNetHud();
  } else if (msg.t === 'snap' && NET.connected) {
    guestApplySnap(msg);
  } else if (msg.t === 'cut' && NET.connected) {
    if (msg.victim === NET.myId) {
      player.state = 'cut';
      player.timer = 5;
      lost++;
      showMsg(`¡Te comisionó ${msg.bn}!<small>Tu volantín se fue con el viento...</small>`);
    } else if (msg.by === NET.myId) {
      score++;
      showToast(`¡Comisionaste a ${msg.vn}! ✂️`);
    } else showToast(`${msg.bn} comisionó a ${msg.vn}`);
  }
}

function guestApplySnap(msg) {
  // Viento del anfitrión (todos vuelan con el mismo)
  windBase.side = msg.w.side; windBase.up = msg.w.up; windBase.fwd = msg.w.fwd;
  if (windName !== msg.w.name) { windName = msg.w.name; showWindAlert(msg.w.name, msg.w.side); }
  windChangeAt = time + msg.w.next;

  const vistos = new Set();
  for (const s of msg.f) {
    if (s.id === NET.myId) { player.damage = s.d; continue; }
    vistos.add(s.id);
    let g = NET.ghosts.get(s.id);
    if (!g) {
      g = createFlyer({ name: s.name, at: [s.at[0], 0, s.at[1]], look: s.look || undefined,
        kiteColors: s.kiteColors, tailColors: s.tailColors, kiteType: s.kiteType });
      g.remote = true; g.netId = s.id; g.human = s.human;
      flyers.push(g);
      NET.ghosts.set(s.id, g);
      engaged.clear();
      updateNetHud();
    }
    applyRemoteState(g, s, false);
  }
  for (const [id, g] of NET.ghosts) if (!vistos.has(id)) { removeFlyer(g); NET.ghosts.delete(id); updateNetHud(); }

  // Enredos (para las chispas y el panel de duelo)
  engaged.clear();
  for (const [a, b, x, y, z] of msg.e) {
    const fa = a === NET.myId ? player : NET.ghosts.get(a);
    const fb = b === NET.myId ? player : NET.ghosts.get(b);
    if (fa && fb) engaged.set(flyers.indexOf(fa) + '-' + flyers.indexOf(fb), new V3(x, y, z));
  }
}

function guestLost() {
  if (!NET.connected || NET.leaving) return;
  NET.connected = false;
  showMsg('Se perdió la conexión con la sala<small>Volviendo al modo de un jugador...</small>');
  setTimeout(backToSolo, 3500);
}

// ---------- Cada cuadro ----------
// ¿El viento lo manda el anfitrión? (el invitado no lo simula)
const netWindIsRemote = () => NET.role === 'guest' && NET.connected;

function netUpdate(dt) {
  if (!NET.role) return;
  // Suaviza a los que se mueven por la red
  const k = 1 - Math.exp(-15 * dt);
  for (const f of flyers) {
    if (!f.remote) continue;
    if (f.netPos) f.pos.lerp(f.netPos, k);
    windAt(f.pos.y, f.wind);
    if (f.state === 'cut') f.spin += dt * 3;
  }

  NET.sendAcc += dt;
  if (NET.role === 'host' && NET.conns.size) {
    if (NET.sendAcc < 1 / NET_SNAP_HZ) return;
    NET.sendAcc = 0;
    const e = [];
    for (const [key, p] of engaged) {
      const [a, b] = key.split('-').map(Number);
      if (flyers[a] && flyers[b]) e.push([flyers[a].netId, flyers[b].netId, round2(p.x), round2(p.y), round2(p.z)]);
    }
    hostBroadcast({
      t: 'snap',
      w: { side: round2(windBase.side), up: round2(windBase.up), fwd: round2(windBase.fwd), name: windName, next: round2(windChangeAt - time) },
      f: flyers.map(flyerSnapshot),
      e,
    });
  } else if (NET.role === 'guest' && NET.connected && NET.hostConn?.open) {
    if (NET.sendAcc < 1 / NET_ME_HZ) return;
    NET.sendAcc = 0;
    const s = flyerSnapshot(player);
    NET.hostConn.send({ t: 'me', p: s.p, L: s.L, s: s.s, sv: s.sv, pi: s.pi, ri: s.ri, ra: s.ra, kiteType: s.kiteType });
  }
}

// Si la página se abrió con ?unirse=1234, conectarse al tiro
if (NET_JOIN_CODE) netJoin(NET_JOIN_CODE);

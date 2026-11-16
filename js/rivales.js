'use strict';
// Rivales: personalidades, grupo de rivales, posiciones al azar e IA
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Rivales (controlados por la computadora) ----------
// Personalidades: cada rival sube a su altura (30-40 m) y recién ahí juega a su manera.
//  climbAlt   altura a la que sube antes de atacar
//  steerGain  qué tan rápido mueve el volantín hacia su objetivo; steerDamp lo frena (más = más suave)
//  toughness  qué tan curado está su hilo (más = aguanta más el serrucho)
//  attackTime cuánto dura un ataque; rest = pausa mínima entre ataques [mín, máx]; eagerness = ganas de atacar
//  wanderRange cuánto se mueve de lado a lado al pasear (m); wanderTime cada cuánto cambia de rumbo [mín, máx]
//  zigChance probabilidad de hacer zigzag en vez de ir a un punto; zigFreq rapidez del zigzag
//  sawFreq / saw  ritmo y forma de serruchar cuando está enredado
const STYLES = {
  // Rápido: ataques cortos y seguidos, se mueve ligero y serrucha con tirones, pero su hilo es más débil
  rapido: {
    label: 'rápido', climbAlt: 30, steerGain: 0.22, steerDamp: 0.18, toughness: 0.75,
    attackTime: 10, rest: [4, 8], eagerness: 1.6, sawFreq: 7,
    wanderRange: 14, wanderTime: [2, 4], zigChance: 0.4, zigFreq: 1.6,
    saw: w => w > -0.5 ? { pull: 1 } : { give: 0.6 },
  },
  // Pícaro: se pone por encima de tu volantín y se tira en picada para cruzar el hilo; serrucha dando hilo
  picada: {
    label: 'pícaro', climbAlt: 36, steerGain: 0.15, steerDamp: 0.25, toughness: 1.0,
    attackTime: 16, rest: [8, 14], eagerness: 1.0, sawFreq: 2.5,
    wanderRange: 12, wanderTime: [3, 6], zigChance: 0.25, zigFreq: 1.0,
    saw: w => w > 0 ? { give: 1 } : { pull: 0.6 },
  },
  // Defensivo: sube alto y casi nunca te busca, pero si te acercas se defiende con hilo muy curado
  defensivo: {
    label: 'defensivo', climbAlt: 40, steerGain: 0.1, steerDamp: 0.35, toughness: 1.5,
    counterDist: 12, attackTime: 12, rest: [15, 25], eagerness: 0.4, sawFreq: 1.5,
    wanderRange: 8, wanderTime: [4, 8], zigChance: 0.15, zigFreq: 0.7,
    saw: () => ({ pull: 0.75 }),
  },
};

// Grupo de posibles rivales: en cada partida salen 3 o 4 al azar, en posiciones distintas.
const RIVAL_POOL = [
  { name: 'el Pancho', style: 'rapido',    shirt: 0x2e9b4f, cap: 0xffffff, kite: [0x2e9b4f, 0xffffff, 0x2e9b4f, 0xffffff], tail: [0xffffff, 0x2e9b4f] },
  { name: 'la Coni',   style: 'picada',    shirt: 0x7b3fb5, cap: 0xff8c1a, kite: [0xff8c1a, 0x7b3fb5, 0xff8c1a, 0x7b3fb5], tail: [0xff8c1a, 0x7b3fb5] },
  { name: 'el Tito',   style: 'defensivo', shirt: 0x333333, cap: 0xffd500, kite: [0x111111, 0xffd500, 0x111111, 0xffd500], tail: [0xffd500, 0x111111] },
  { name: 'la Javi',   style: 'rapido',    shirt: 0xd62839, cap: 0x222222, kite: [0xd62839, 0xffffff, 0xd62839, 0xffffff], tail: [0xffffff, 0xd62839] },
  { name: 'el Nacho',  style: 'picada',    shirt: 0x1f6fd1, cap: 0xffffff, kite: [0x1f6fd1, 0xffffff, 0xd62839, 0xffffff], tail: [0x1f6fd1, 0xd62839] },
  { name: 'la Fran',   style: 'defensivo', shirt: 0xe86fb0, cap: 0x5a2a82, kite: [0xe86fb0, 0x5a2a82, 0xe86fb0, 0x5a2a82], tail: [0x5a2a82, 0xe86fb0] },
];

// Posiciones al azar cerca del jugador (que está en 0,0), pero sin quedar pegados entre ellos.
const RIVAL_SPOT = { minSep: 4.5, maxDist: 12, x: [-11, 11], z: [-11, 2] };
function chooseRivals() {
  const count = Math.random() < 0.5 ? 3 : 4;
  // Mezcla el grupo y toma los primeros, con máximo 2 del mismo estilo para que haya variedad
  const shuffled = [...RIVAL_POOL].sort(() => Math.random() - 0.5);
  const chosen = [], perStyle = {};
  for (const r of shuffled) {
    if (chosen.length >= count) break;
    if ((perStyle[r.style] || 0) >= 2) continue;
    perStyle[r.style] = (perStyle[r.style] || 0) + 1;
    chosen.push({ ...r });
  }
  const spots = [[0, 0]];   // el jugador
  for (const r of chosen) {
    let x, z;
    for (let tries = 0; tries < 300; tries++) {
      x = RIVAL_SPOT.x[0] + Math.random() * (RIVAL_SPOT.x[1] - RIVAL_SPOT.x[0]);
      z = RIVAL_SPOT.z[0] + Math.random() * (RIVAL_SPOT.z[1] - RIVAL_SPOT.z[0]);
      if (Math.hypot(x, z) > RIVAL_SPOT.maxDist) continue;
      if (Math.abs(x) < 3 && z < -3) continue;   // no pararse justo delante, bajo tu hilo
      if (spots.every(([sx, sz]) => Math.hypot(x - sx, z - sz) >= RIVAL_SPOT.minSep)) break;
    }
    spots.push([x, z]);
    r.at = [+x.toFixed(1), 0, +z.toFixed(1)];
  }
  return chosen;
}
const RIVALS = chooseRivals();


// ---------- IA de los rivales ----------
// Los 3 rivales siempre están elevando, cada uno a su altura (30-40 m según su estilo).
// Cada cierto tiempo, al azar, alguno va a tu altura a atacarte a su manera,
// pero nunca más de MAX_ATTACKERS a la vez. El resto sigue paseando arriba.
const MAX_ATTACKERS = 2;
const ATTACK_CHANCE = 0.12;   // probabilidad por segundo de que un rival listo decida atacar (× su "ganas")
const attackers = new Set();
const rand = ([a, b]) => a + Math.random() * (b - a);

function playerAttackable() {
  const P = player;
  return started && P.state === 'flying' && P.pos.y > 10 && P.vel.y > -3;
}

function stopAttack(f) {
  if (attackers.delete(f)) f.restUntil = time + rand(f.style.rest);
  f.mode = 'cruise';
  f.dive = false;
}

function aiThink(f, dt) {
  const st = f.style, P = player;
  f.pullT = f.releaseT = f.steerT = 0;
  if (f.state !== 'flying') { stopAttack(f); return; }

  // 1) Subida: listo cuando se mantiene cerca de su altura un par de segundos
  if (!f.ready) {
    f.readyTime = f.pos.y > st.climbAlt - 4 ? f.readyTime + dt : 0;
    if (f.readyTime > 2) { f.ready = true; f.restUntil = time + rand(st.rest); }
  }

  // 2) ¿Ataca?
  const canHit = f.ready && playerAttackable();
  const foe = engagedWith(f);
  if (attackers.has(f)) {
    if (foe === P) f.attackEnd = Math.max(f.attackEnd, time + 2);   // enredado: no se rinde
    if (!canHit || time > f.attackEnd) stopAttack(f);
  } else if (canHit && attackers.size < MAX_ATTACKERS && time > f.restUntil) {
    // El defensivo además responde de inmediato si te le acercas
    const provoked = st.counterDist && f.pos.distanceTo(P.pos) < st.counterDist;
    if (provoked || Math.random() < ATTACK_CHANCE * st.eagerness * dt) {
      attackers.add(f);
      f.mode = 'attack';
      f.dive = false;
      f.attackEnd = time + st.attackTime;
      showToast(provoked ? `¡${f.name} se defiende!` : `¡${f.name} (${st.label}) va por tu volantín con su ${f.kt.name.toLowerCase()}!`);
    }
  }

  // 3) Objetivo: su lugar de paseo, o cruzar el hilo del jugador
  // Paseo: cada cierto tiempo elige al azar un nuevo punto hacia un lado, o hace zigzag un rato
  if (time > f.wanderUntil) {
    f.wanderUntil = time + rand(st.wanderTime);
    f.zigzag = Math.random() < st.zigChance;
    f.wanderX = f.homeX + (Math.random() * 2 - 1) * st.wanderRange;
  }
  let tx = f.zigzag
    ? f.homeX + Math.sin(time * st.zigFreq + f.phase) * st.wanderRange * 0.7
    : f.wanderX;
  let ty = st.climbAlt;
  let tL = st.climbAlt * 1.4;
  if (f.mode === 'attack') {
    const side = Math.sign(f.rig.root.position.x - P.rig.root.position.x) || 1;
    if (f.styleName === 'picada' && !f.dive) {
      // Primero se pone encima de tu volantín...
      tx = P.pos.x + side * 2;
      ty = P.pos.y + 10;
      if (f.pos.y > P.pos.y + 7 && Math.abs(f.pos.x - P.pos.x) < 5) f.dive = true;
    } else {
      // ...y luego (o directamente, si es rápido) pasa al otro lado para cruzar los hilos
      tx = P.pos.x - side * 4;
      ty = Math.max(P.pos.y + (f.dive ? -3 : 1), 10);
    }
    tL = Math.hypot(tx - f.anchor.x, ty - f.anchor.y, P.pos.z - f.anchor.z) * 1.1;
  }

  // 4) Control del hilo
  const dy = ty - f.pos.y;
  if (foe) {
    // Serruchar a su estilo
    const s = st.saw(Math.sin(time * st.sawFreq + f.sawPhase));
    f.pullT = s.pull || 0;
    f.releaseT = s.give || 0;
  } else {
    // Ángulo del volantín sobre el horizonte, visto desde la mano (0° = al ras, 90° = encima)
    const d = f.pos.distanceTo(f.anchor) || 1;
    const elev = Math.asin(clamp((f.pos.y - f.anchor.y) / d, -1, 1)) * 180 / Math.PI;
    const taut = d > f.L - 0.3;
    if (f.vel.y < -1.2 && f.L > 10 && elev < 55) {
      f.pullT = 1;                                  // se está cayendo: tirar
    } else if (f.pos.y < 6) {
      // Despegando: tironcitos solo si no sube, sin acortar demasiado el hilo
      f.pullT = f.L > 6 && f.vel.y < 0.5 ? 0.8 : 0;
    } else if (dy > 2 && taut && elev > 40 && f.L < tL) {
      f.releaseT = 1;                               // va firme y alto: dar hilo para que suba más
    } else if (dy > 2 && elev < 35) {
      f.pullT = 0.4;                                // está muy echado: tirar un poco para levantarlo
    } else if (dy < -3 && f.L > 10) {
      f.pullT = 0.7;                                // tiene que bajar: recoger hilo
    }
  }

  // 5) Dirección, con la agilidad de su estilo
  f.steerT = clamp((tx - f.pos.x) * st.steerGain - f.vel.x * st.steerDamp, -1, 1);
  if (f.pos.y < 6) f.steerT *= 0.3;               // muy bajo: prioriza subir derecho
}


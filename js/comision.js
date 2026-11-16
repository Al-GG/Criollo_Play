'use strict';
// Comisión: contacto entre hilos, serrucho y cortes; cola e hilo
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Comisión: contacto entre hilos ----------
const _d1 = new V3(), _d2 = new V3(), _r = new V3(), _c1 = new V3(), _c2 = new V3(), _mid = new V3();
// Distancia mínima entre dos segmentos 3D (deja el punto medio del contacto en _mid)
function segDist(p1, q1, p2, q2) {
  _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2);
  const a = _d1.dot(_d1), e = _d2.dot(_d2), ff = _d2.dot(_r);
  const c = _d1.dot(_r), b = _d1.dot(_d2), denom = a * e - b * b;
  let s = denom > 1e-9 ? clamp((b * ff - c * e) / denom, 0, 1) : 0;
  let t = (b * s + ff) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
  else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  _c1.copy(p1).addScaledVector(_d1, s);
  _c2.copy(p2).addScaledVector(_d2, t);
  _mid.addVectors(_c1, _c2).multiplyScalar(0.5);
  return _c1.distanceTo(_c2);
}
const SEG_IDX = [0, 3, 6, 9, 12, 15, 18, 21, 23];
function stringDist(A, B, outPoint) {
  let best = Infinity;
  for (let i = 0; i < SEG_IDX.length - 1; i++) {
    for (let j = 0; j < SEG_IDX.length - 1; j++) {
      const d = segDist(A.pts[SEG_IDX[i]], A.pts[SEG_IDX[i + 1]], B.pts[SEG_IDX[j]], B.pts[SEG_IDX[j + 1]]);
      if (d < best) { best = d; outPoint.copy(_mid); }
    }
  }
  return best;
}

const engaged = new Map();   // "i-j" -> punto de contacto
function engagedWith(f) {
  const i = flyers.indexOf(f);
  for (const key of engaged.keys()) {
    const [a, b] = key.split('-').map(Number);
    if (a === i || b === i) return flyers[a === i ? b : a];
  }
  return null;
}
// Fuerza de serrucho: tirar o dar hilo rápido roza más el hilo del otro
const sawPower = f => (0.2 + 1.3 * f.pullIn + 0.8 * f.releaseIn) * f.kt.saw;

function cutFlyer(victim, by) {
  victim.state = 'cut';
  victim.timer = victim.isPlayer ? 5 : 8;
  for (const key of [...engaged.keys()]) {
    const [a, b] = key.split('-').map(Number);
    if (flyers[a] === victim || flyers[b] === victim) engaged.delete(key);
  }
  if (by.isPlayer) {
    score++;
    showToast(`¡Comisionaste a ${victim.name}! ✂️`);
  } else if (victim.isPlayer) {
    lost++;
    showMsg(`¡Te comisionó ${by.name}!<small>Tu volantín se fue con el viento...</small>`);
  } else {
    showToast(`${by.name} comisionó a ${victim.name}`);
  }
  netOnCut(victim, by);   // multijugador: el anfitrión avisa el corte a todos
}

const contactPt = new V3();
function updateCombat(dt) {
  for (const f of flyers) if (!engagedWith(f)) f.damage = Math.max(0, f.damage - DAMAGE_HEAL * dt);

  for (let i = 0; i < flyers.length; i++) {
    for (let j = i + 1; j < flyers.length; j++) {
      const A = flyers[i], B = flyers[j], key = `${i}-${j}`;
      if (A.state !== 'flying' || B.state !== 'flying' || !A.armed || !B.armed) { engaged.delete(key); continue; }
      const d = stringDist(A, B, contactPt);
      const was = engaged.has(key);
      // Histéresis: cuesta engancharse, pero una vez enredados siguen rozando
      if (d < CONTACT_IN || (was && d < CONTACT_OUT)) engaged.set(key, contactPt.clone());
      else { engaged.delete(key); continue; }

      A.damage += sawPower(B) * SAW_RATE * dt / A.toughness;
      B.damage += sawPower(A) * SAW_RATE * dt / B.toughness;
      if (A.damage >= 1 && A.damage >= B.damage) cutFlyer(A, B);
      else if (B.damage >= 1) cutFlyer(B, A);
    }
  }
}

// Cola: cadena verlet con harto roce del aire y una "forma de reposo" suave
// (cuelga hacia abajo y hacia donde sopla el viento), para que no latiguee al dirigir.
const TAIL_DAMP = 0.86;      // menos = la cola conserva menos impulso (más tranquila)
const TAIL_SETTLE = 2.5;     // qué tan rápido vuelve a su forma de reposo
const tailRest = new V3();
function tailPhysics(f, dt, attach) {
  const tail = f.tail;
  if (tail.length < 2) return;   // pavo: sin cola
  tail[0].p.copy(attach);
  tailRest.set(f.wind.x * 0.5, -4, f.wind.z * 0.5).normalize();
  const settle = 1 - Math.exp(-TAIL_SETTLE * dt);
  for (let i = 1; i < tail.length; i++) {
    const t = tail[i];
    const v = tmp.subVectors(t.p, t.o).multiplyScalar(TAIL_DAMP);
    t.o.copy(t.p);
    t.p.add(v);
    t.p.x += f.wind.x * 0.9 * dt * dt;
    t.p.y += (-3 + f.wind.y * 0.9) * dt * dt;
    t.p.z += f.wind.z * 0.9 * dt * dt;
    // Tira suavemente hacia la forma de reposo
    t.p.x += (attach.x + tailRest.x * i * TAIL_SEG - t.p.x) * settle;
    t.p.y += (attach.y + tailRest.y * i * TAIL_SEG - t.p.y) * settle;
    t.p.z += (attach.z + tailRest.z * i * TAIL_SEG - t.p.z) * settle;
  }
  for (let it = 0; it < 4; it++) {
    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1].p, b = tail[i].p;
      const delta = tmp.subVectors(b, a);
      const len = delta.length() || 1e-6;
      b.copy(a).addScaledVector(delta, TAIL_SEG / len);
    }
  }
}

// Puntos del hilo (con comba); si está cortado, cuelga del volantín
function computeString(f) {
  if (f.state === 'cut') {
    const wn = tmp.copy(f.wind).normalize();
    for (let i = 0; i < STRING_PTS; i++) {
      const s = i / (STRING_PTS - 1);
      f.pts[i].copy(f.pos).addScaledVector(wn, s * 2.5);
      f.pts[i].y -= s * 6;
      f.pts[i].x += Math.sin(time * 4 + s * 6) * 0.15 * s;
    }
    return;
  }
  const dist = f.pos.distanceTo(f.anchor);
  const sag = 0.02 * dist + Math.max(0, f.L - dist) * 0.5;
  for (let i = 0; i < STRING_PTS; i++) {
    const s = i / (STRING_PTS - 1);
    f.pts[i].lerpVectors(f.anchor, f.pos, s);
    f.pts[i].y -= Math.sin(Math.PI * s) * sag;
  }
}


'use strict';
// Volantín: tipos, forma, volantinero (hilo, cola, etiqueta), física y giros de rueda
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Tipos de volantín ----------
// Cada tipo cambia la física (peso, cuánto lo empuja el aire, agilidad), su hilo y su forma.
//  mass masa · k cuánto lo empuja el aire · lift sustentación · drag arrastre · side agilidad al dirigir
//  toughness resistencia del hilo · saw fuerza para serruchar · tail largo de la cola (0 = sin cola)
//  wobble inestabilidad (se mueve solo de lado a lado) · rollPush cuánto lo corren los giros de rueda
const KITE_TYPES = {
  necla: {
    name: 'Ñecla', desc: 'Chica, rápida y ágil, pero su hilo es frágil.',
    size: 0.75, shape: 'diamond', rhombus: { top: 1.05, side: 0.42, mid: 0.3, bottom: -0.8 }, twoTone: true, mass: 0.2, k: 0.13, lift: 0.95, drag: 0.3, side: 0.5,
    toughness: 0.7, saw: 1.25, tail: 8, wobble: 0, rollPush: 1,
    stats: { Subida: 3, Agilidad: 5, Resistencia: 2, Corte: 4 },
  },
  clasico: {
    name: 'Volantín', desc: 'El de siempre: parejo en todo.',
    size: 1, shape: 'diamond', mass: 0.3, k: 0.18, lift: 0.9, drag: 0.3, side: 0.3,
    toughness: 1, saw: 1, tail: 14, wobble: 0, rollPush: 1,
    stats: { Subida: 3, Agilidad: 3, Resistencia: 3, Corte: 3 },
  },
  chonchon: {
    name: 'Chonchón', desc: 'Hexagonal, estable y fácil de subir, pero lento para comisionar.',
    size: 1.2, shape: 'hexagon', mass: 0.38, k: 0.24, lift: 0.95, drag: 0.34, side: 0.18,
    toughness: 1.3, saw: 0.75, tail: 16, wobble: 0, rollPush: 0.5,
    stats: { Subida: 5, Agilidad: 1, Resistencia: 5, Corte: 2 },
  },
  pavo: {
    name: 'Pavo', desc: 'Sin cola: muy rápido y filoso, pero inestable y difícil de controlar.',
    size: 1, shape: 'diamond', rhombus: { top: 0.85, side: 0.85, mid: 0, bottom: -0.85 }, fringe: true, mass: 0.26, k: 0.18, lift: 0.85, drag: 0.26, side: 0.55,
    toughness: 0.9, saw: 1.35, tail: 0, wobble: 0.55, rollPush: 1.3,
    stats: { Subida: 2, Agilidad: 5, Resistencia: 3, Corte: 5 },
  },
};
const KITE_KEYS = Object.keys(KITE_TYPES);
const KITE_VISUAL_SCALE = 1.5;   // los volantines se dibujan más grandes para que se distingan de lejos (no cambia la física)
const PLAYER_CAN_PICK = true;    // false: el jugador usa el clásico; los tipos son solo para los rivales

// ---------- Volantín (forma) ----------
// Devuelve el grupo 3D y la altura (local) de la punta de abajo, donde se amarra la cola.
function makeKite(colors, kt) {
  const g = new THREE.Group();
  const stickMat = new THREE.MeshBasicMaterial({ color: 0x5b3b1e });
  const addTri = (a, b, c, color) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    geo.computeVertexNormals();
    // Un poco de brillo propio para que los colores se vean aunque estén a contraluz
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
    m.castShadow = true;
    g.add(m);
  };
  let bottomY;
  if (kt.shape === 'hexagon') {
    // Chonchón: hexágono con tres varillas cruzadas
    const R = 0.85, c = [0, 0, 0];
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 2 + i * Math.PI / 3;
      return [Math.cos(a) * R, Math.sin(a) * R, 0];
    });
    pts.forEach((p, i) => addTri(p, pts[(i + 1) % 6], c, colors[i % colors.length]));
    [0, Math.PI / 3, -Math.PI / 3].forEach(a => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, R * 2, 0.03), stickMat);
      s.rotation.z = a;
      s.position.z = -0.02;
      g.add(s);
    });
    bottomY = -R;
  } else {
    // Rombo: cada tipo con sus proporciones (ñecla angosta y alta, pavo ancho y cuadrado)
    const P = kt.rhombus || { top: 0.9, side: 0.65, mid: 0.1, bottom: -0.75 };
    const top = [0, P.top, 0], right = [P.side, P.mid, 0], bottom = [0, P.bottom, 0], left = [-P.side, P.mid, 0], c = [0, P.mid, 0];
    // La ñecla va en dos colores (arriba / abajo); el resto en cuatro
    const cols = kt.twoTone ? [colors[0], colors[1], colors[1], colors[0]] : colors;
    [[top, right, c], [right, bottom, c], [bottom, left, c], [left, top, c]].forEach((t, i) => addTri(...t, cols[i]));
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, P.top - P.bottom, 0.03), stickMat);
    v.position.set(0, (P.top + P.bottom) / 2, -0.02);
    const h = new THREE.Mesh(new THREE.BoxGeometry(P.side * 2, 0.03, 0.03), stickMat);
    h.position.set(0, P.mid, -0.02);
    g.add(v, h);
    if (kt.fringe) {
      // Pavo: flecos largos de papel colgando de las puntas de los lados (se ven de lejos)
      [-1, 1].forEach(s => {
        for (let k = 0; k < 5; k++) {
          const x = s * (P.side - 0.04 * k), len = 0.7 + k * 0.12;
          addTri([x - 0.035, P.mid, 0.005], [x + 0.035, P.mid, 0.005], [x + s * 0.1, P.mid - len, 0.005], k % 2 ? colors[1] : colors[3] ?? colors[0]);
        }
      });
    }
    bottomY = P.bottom;
  }
  g.scale.setScalar(kt.size * KITE_VISUAL_SCALE);
  return { group: g, bottomY: bottomY * kt.size * KITE_VISUAL_SCALE, localBottomY: bottomY };
}

// ---------- Volantinero: personaje + volantín + hilo + cola ----------
const STRING_PTS = 24, TAIL_SEG = 0.35;
const bowGeo = new THREE.PlaneGeometry(0.28, 0.12);

// Etiqueta de texto que siempre mira a la cámara y se ve a través de todo
const LABEL_TIME = 15, LABEL_FADE = 2;   // segundos que se muestran los nombres al empezar, y cuánto tardan en desaparecer
let labelsFrom = null;                    // momento en que empieza a contar (al cerrar el selector)
function makeLabelSprite() {
  const cv = document.createElement('canvas');
  cv.width = 384; cv.height = 64;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 9;
  sp.userData.cv = cv;
  scene.add(sp);
  return sp;
}
function setLabelText(sp, text) {
  const cv = sp.userData.cv, g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  g.font = 'bold 28px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = Math.min(cv.width - 4, g.measureText(text).width + 28);
  g.fillStyle = 'rgba(0, 0, 0, 0.45)';
  g.beginPath();
  if (g.roundRect) g.roundRect((cv.width - w) / 2, 8, w, 48, 16); else g.rect((cv.width - w) / 2, 8, w, 48);
  g.fill();
  g.fillStyle = '#fff';
  g.fillText(text, cv.width / 2, 33);
  sp.material.map.needsUpdate = true;
}

// Arma (o rearma, si cambia de tipo) el volantín y su cola
function buildKiteParts(f, typeKey) {
  if (f.kite) {
    scene.remove(f.kite, f.tailLine, ...f.bows.map(b => b.mesh));
    f.tailGeo.dispose();
  }
  const kt = KITE_TYPES[typeKey];
  f.kiteType = typeKey;
  f.kt = kt;
  f.toughness = (f.style?.toughness ?? 1) * kt.toughness;
  if (f.label) setLabelText(f.label, `${f.name} · ${kt.name}`);

  const { group, bottomY, localBottomY } = makeKite(f.kiteColors, kt);
  f.kite = group;
  f.tailAttachY = bottomY;
  f.tailLocalY = localBottomY;
  scene.add(group);

  f.tail = [];
  for (let i = 0; i < kt.tail; i++) f.tail.push({ p: new V3(), o: new V3() });
  f.tailGeo = new THREE.BufferGeometry();
  f.tailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(Math.max(1, kt.tail) * 3), 3));
  f.tailLine = new THREE.Line(f.tailGeo, new THREE.LineBasicMaterial({ color: f.tailColors[1] }));
  f.tailLine.frustumCulled = false;
  f.tailLine.visible = kt.tail > 1;
  scene.add(f.tailLine);
  f.bows = [];
  for (let i = 2; i < kt.tail; i += 2) {
    const b = new THREE.Mesh(bowGeo, new THREE.MeshBasicMaterial({ color: f.tailColors[(i / 2) % 2], side: THREE.DoubleSide }));
    scene.add(b);
    f.bows.push({ mesh: b, idx: i });
  }
}

function createFlyer(o) {
  const rig = buildCharacter(o.look);
  rig.root.position.set(...o.at);
  scene.add(rig.root);

  const stringGeo = new THREE.BufferGeometry();
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(STRING_PTS * 3), 3));
  const stringLine = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  stringLine.frustumCulled = false;
  scene.add(stringLine);

  // Resaltado cuando este volantín te ataca: anillo rojo + flecha encima (se ven a través de todo)
  const hl = new THREE.Group();
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.09, 8, 32), hlMat);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), hlMat);
  arrow.rotation.x = Math.PI;      // apunta hacia abajo
  arrow.position.y = 2.6;
  hl.add(ring, arrow);
  hl.renderOrder = 10;
  hl.children.forEach(c => c.renderOrder = 10);
  hl.visible = false;
  scene.add(hl);

  // Etiqueta flotante con nombre y tipo de volantín (solo rivales)
  const label = o.isPlayer ? null : makeLabelSprite();

  const f = {
    name: o.name, isPlayer: !!o.isPlayer, look: o.look,
    styleName: o.style, style: STYLES[o.style],
    kiteColors: o.kiteColors, tailColors: o.tailColors,
    kite: null, tail: [], tailGeo: null, tailLine: null, bows: [],
    rig, stringGeo, stringLine, hl, ring, arrow, label,
    pts: Array.from({ length: STRING_PTS }, () => new V3()),
    anchor: new V3(o.at[0], 1.3, o.at[2] - 0.4),
    pos: new V3(), vel: new V3(), wind: new V3(),
    L: 10, maxAlt: 0, damage: 0, armed: false,
    state: 'flying', timer: 0, spin: 0, phase: Math.random() * 10,
    pullIn: 0, releaseIn: 0, steerIn: 0, steerVis: 0,
    pullT: 0, releaseT: 0, steerT: 0,
    // IA
    mode: 'cruise', ready: false, readyTime: 0, restUntil: 0, attackEnd: 0, dive: false,
    sawPhase: Math.random() * 6, homeX: o.at[0] * 0.8,
    wanderUntil: 0, wanderX: o.at[0] * 0.8, zigzag: false,
    roll: null, rollAngle: 0, rollPush: 0, nextRollAt: 5 + Math.random() * 10,
  };
  buildKiteParts(f, o.kiteType || 'clasico');
  resetFlyer(f);
  return f;
}

function resetFlyer(f) {
  const r = f.rig.root.position;
  f.pos.set(r.x, 2.5, r.z - 9);
  f.vel.set(0, 0, 0);
  f.L = 10;
  f.maxAlt = 0;
  f.damage = 0;
  f.state = 'flying';
  f.timer = 0;
  f.steerVis = 0;
  f.armed = !f.isPlayer ? false : started;
  f.kite.visible = true;
  // Los rivales vuelven a la fase de subida
  f.mode = 'cruise';
  f.ready = false;
  f.readyTime = 0;
  f.dive = false;
  const bottom = f.pos.clone().add(new V3(0, f.tailAttachY, 0));
  f.tail.forEach((t, i) => { t.p.copy(bottom).y -= i * TAIL_SEG * 0.5; t.o.copy(t.p); });
}


// Tipo de volantín guardado de la partida anterior
function savedKiteType() {
  let k = null;
  try { k = localStorage.getItem('volantines.tipo'); } catch (e) {}
  return KITE_TYPES[k] ? k : 'clasico';
}

// ---------- Física de un volantín ----------
const tmp = new V3(), rel = new V3(), force = new V3();
function stepFlyer(f, dt) {
  // Rampa suave de las entradas
  f.steerIn += clamp(f.steerT - f.steerIn, -STEER_RAMP * dt, STEER_RAMP * dt);
  f.releaseIn += clamp(f.releaseT - f.releaseIn, -RELEASE_RAMP * 2 * dt, RELEASE_RAMP * dt);
  f.pullIn += clamp(f.pullT - f.pullIn, -PULL_RAMP * 2 * dt, PULL_RAMP * dt);
  f.steerVis += (f.steerIn - f.steerVis) * Math.min(1, dt * 5);

  if (f.state === 'crashed') {
    f.timer -= dt;
    if (f.timer <= 0) { resetFlyer(f); if (f.isPlayer) showMsg(''); }
    return;
  }

  windAt(f.pos.y, f.wind);
  const free = f.state === 'cut';   // hilo cortado: el volantín se va con el viento

  // Largo del hilo
  let reelSpeed = 0;
  if (!free) {
    if (f.pullIn > 0.001 && f.L > MIN_L) {
      reelSpeed = REEL_IN * f.pullIn * f.pullIn;   // curva suave al inicio
      f.L = Math.max(MIN_L, f.L - reelSpeed * dt);
    }
    if (f.releaseIn > 0) f.L = Math.min(MAX_L, f.L + REEL_OUT * f.releaseIn * dt);
  }

  // Fuerzas aerodinámicas
  rel.subVectors(f.wind, f.vel);
  const kt = f.kt;
  const q = kt.k * rel.lengthSq();
  let liftFactor = 0.25;
  if (!free) {
    tmp.subVectors(f.pos, f.anchor);
    const elev = Math.asin(clamp(tmp.y / (tmp.length() || 1), -1, 1));
    liftFactor = 0.4 + 0.8 * Math.cos(elev);
  }
  force.set(0, 0, 0);
  force.addScaledVector(rel.normalize(), kt.drag * q);      // arrastre
  force.y += kt.lift * q * liftFactor;                      // sustentación
  if (!free) {
    force.x += (f.steerIn + f.rollPush * kt.rollPush) * kt.side * q;   // dirección (+ empujón al girar como rueda)
    // Inestabilidad (pavo): se va solo de lado a lado
    if (kt.wobble) force.x += kt.wobble * 0.3 * q * (Math.sin(time * 2.3 + f.phase) * 0.6 + Math.sin(time * 5.1 + f.phase * 2) * 0.4);
  }
  force.y -= kt.mass * 9.8;                                 // gravedad

  f.vel.addScaledVector(force, dt / kt.mass);
  f.vel.multiplyScalar(0.995);
  f.pos.addScaledVector(f.vel, dt);

  // Restricción del hilo
  if (!free) {
    tmp.subVectors(f.pos, f.anchor);
    const dist = tmp.length();
    if (dist > f.L) {
      tmp.divideScalar(dist);
      f.pos.copy(f.anchor).addScaledVector(tmp, f.L);
      const radial = f.vel.dot(tmp);
      if (radial > -reelSpeed) f.vel.addScaledVector(tmp, -radial - reelSpeed);
    }
  } else {
    f.spin += dt * 3;
    f.timer -= dt;
    if (f.timer <= 0) { resetFlyer(f); if (f.isPlayer) showMsg(''); return; }
  }

  // Los rivales se "arman" (pueden chocar) una vez que despegan
  if (!f.isPlayer && !f.armed && f.pos.y > 6) f.armed = true;

  // Suelo
  if (f.pos.y < 0.4) {
    f.pos.y = 0.4;
    if (free) { f.vel.set(0, 0, 0); }
    else if (f.armed) {
      f.state = 'crashed';
      f.timer = f.isPlayer ? 2.5 : 4;
      if (f.isPlayer) showMsg(`¡Se cayó el volantín!<small>Máxima: ${f.maxAlt.toFixed(1)} m</small>`);
    } else f.vel.y = Math.max(0, f.vel.y);
  }

  f.maxAlt = Math.max(f.maxAlt, f.pos.y);
}

// ---------- Giros de rueda ----------
// Cada cierto tiempo (al azar) cada volantín da una o dos vueltas completas como rueda,
// hacia la izquierda o la derecha, y en ese rato se corre un poco hacia ese lado.
const ROLL_EVERY = [8, 18];     // segundos entre giros [mín, máx]
const ROLL_TIME = [0.9, 1.5];   // duración de un giro [mín, máx]
const ROLL_PUSH = 0.5;          // cuánto lo corre hacia el lado (0 = solo visual)
function updateRoll(f) {
  if (f.state !== 'flying' || f.pos.y < 6) {
    f.roll = null; f.rollAngle = 0; f.rollPush = 0;
    return;
  }
  if (!f.roll && time > f.nextRollAt) {
    f.roll = { start: time, dur: rand(ROLL_TIME), dir: Math.random() < 0.5 ? -1 : 1, turns: Math.random() < 0.3 ? 2 : 1 };
  }
  if (!f.roll) return;
  const t = (time - f.roll.start) / f.roll.dur;
  if (t >= 1) {
    f.roll = null; f.rollAngle = 0; f.rollPush = 0;
    f.nextRollAt = time + rand(ROLL_EVERY);
    return;
  }
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // parte y termina suave
  f.rollAngle = f.roll.dir * f.roll.turns * Math.PI * 2 * ease;
  f.rollPush = f.roll.dir * Math.sin(Math.PI * t) * ROLL_PUSH;
}


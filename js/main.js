'use strict';
// Principal: rayas de viento, chispas, dibujo de cada cuadro y ciclo del juego
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Rayas de viento ----------
const STREAKS = 220;
const streakPos = new Float32Array(STREAKS * 6);
const streakCol = new Float32Array(STREAKS * 8);
const streakGeo = new THREE.BufferGeometry();
streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 4));
const streakLines = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, depthWrite: false
}));
streakLines.frustumCulled = false;
scene.add(streakLines);
const streaks = [];
for (let i = 0; i < STREAKS; i++) streaks.push({ p: new V3(), life: 0, max: 1 });

function spawnStreak(s, center, first) {
  s.p.set(
    center.x + (Math.random() - 0.5) * 70,
    Math.max(1, center.y + (Math.random() - 0.4) * 35),
    center.z + (Math.random() - 0.5) * 70
  );
  s.max = 1.2 + Math.random() * 1.8;
  s.life = first ? Math.random() * s.max : 0;
}
let streaksInit = false;

// Chispas donde se rozan los hilos
const sparks = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  m.visible = false;
  scene.add(m);
  sparks.push(m);
}


// ---------- Render ----------
const camTarget = new V3(0, 5, -10);
const camPos = new V3(0, 3, 7);
const up = new V3(0, 1, 0);

function updateFlyerVisuals(f, dt) {
  // Personaje mira hacia su volantín
  const r = f.rig.root;
  const targetYaw = Math.atan2(-(f.pos.x - r.position.x), -(f.pos.z - r.position.z));
  let dYaw = targetYaw - r.rotation.y;
  dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  r.rotation.y += dYaw * Math.min(1, dt * 4);
  animateRig(f, dt);
  // El hilo sale de la mano derecha
  r.updateMatrixWorld(true);
  f.rig.armR.hand.getWorldPosition(f.anchor);

  updateHighlight(f);

  // Etiqueta sobre el volantín rival: solo al inicio de la partida, luego se desvanece.
  // Tamaño parejo en pantalla aunque esté lejos.
  if (f.label) {
    const shown = labelsFrom === null ? 0 : time - labelsFrom;
    // Los jugadores de verdad (multijugador) mantienen su nombre siempre visible
    const fade = f.human ? 1 : 1 - THREE.MathUtils.smoothstep(shown, LABEL_TIME, LABEL_TIME + LABEL_FADE);
    f.label.material.opacity = fade;
    f.label.visible = fade > 0 && f.state !== 'crashed';
    const dist = camera.position.distanceTo(f.pos);
    const s = dist * 0.04;
    f.label.position.set(f.pos.x, f.pos.y + 1.2 * f.kt.size * KITE_VISUAL_SCALE + s * 0.6, f.pos.z);
    f.label.scale.set(s * 6, s, 1);
  }

  // Volantín: mira a su dueño, con giro según dirección (o da vueltas si está cortado)
  const k = f.kite;
  k.position.copy(f.pos);
  k.up.copy(up);
  if (f.state === 'cut') {
    k.lookAt(tmp.copy(f.pos).sub(f.wind));
    k.rotateZ(f.spin);
    k.rotateX(Math.sin(f.spin * 0.7) * 0.8);
  } else {
    k.lookAt(f.anchor);
    k.rotateX(-0.35);
    k.rotateZ(-f.steerVis * 0.4 + Math.sin(time * 6 + f.phase) * 0.04 + f.rollAngle);
  }

  // Cola
  k.updateMatrixWorld();
  const attach = new V3(0, f.tailLocalY, 0).applyMatrix4(k.matrixWorld);
  tailPhysics(f, dt, attach);
  const tp = f.tailGeo.attributes.position;
  f.tail.forEach((t, i) => tp.setXYZ(i, t.p.x, t.p.y, t.p.z));
  tp.needsUpdate = true;
  f.bows.forEach(b => {
    b.mesh.position.copy(f.tail[b.idx].p);
    b.mesh.lookAt(camera.position);
  });

  // Hilo
  computeString(f);
  const sp = f.stringGeo.attributes.position;
  f.pts.forEach((p, i) => sp.setXYZ(i, p.x, p.y, p.z));
  sp.needsUpdate = true;
}

// Resalta el volantín que te está atacando: anillo y flecha rojos que laten,
// de tamaño parejo aunque esté lejos, y su hilo se pone rojo.
function updateHighlight(f) {
  const on = !f.isPlayer && f.state === 'flying' && f.mode === 'attack';
  f.hl.visible = on;
  f.stringLine.material.color.set(on ? 0xff4040 : 0xffffff);
  if (!on) return;
  const pulse = 1 + Math.sin(time * 8) * 0.12;
  const scale = Math.max(1, camera.position.distanceTo(f.pos) / 22) * pulse;
  f.hl.position.copy(f.pos);
  f.hl.scale.setScalar(scale);
  f.ring.lookAt(camera.position);
  f.arrow.position.y = 2.6 + Math.sin(time * 5) * 0.3;
  f.ring.material.opacity = 0.65 + Math.sin(time * 8) * 0.25;
}

const el = id => document.getElementById(id);
function setBar(bar, value) {
  bar.style.width = (clamp(value, 0, 1) * 100).toFixed(0) + '%';
  bar.style.background = value > 0.6 ? '#6be36b' : value > 0.3 ? '#ffd23f' : '#ff5a4f';
}

function updateVisuals(dt) {
  flyers.forEach(f => updateFlyerVisuals(f, dt));
  const pos = player.pos;

  // Cámara
  // Detrás del jugador, desde donde está parado (en multijugador cada uno tiene su lugar)
  const home = player.rig.root.position;
  const desiredPos = new V3(home.x + (pos.x - home.x) * 0.15, 2.5 + pos.y * 0.08, home.z + 8 + player.L * 0.08);
  camPos.lerp(desiredPos, Math.min(1, dt * 2));
  const desiredTarget = new V3().lerpVectors(player.anchor, pos, 0.7);
  camTarget.lerp(desiredTarget, Math.min(1, dt * 3));
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  // Mar: oleaje suave
  if (sea) sea.position.y = SEA_LEVEL + Math.sin(time * 0.8) * 0.06;

  // Ambiente: banderas, pájaros y barco
  updateFlags();
  updateBirds(dt);
  updateShip(dt);

  // Nubes
  clouds.forEach(c => {
    c.position.z -= wind.length() * 0.02 * dt * 10;
    c.position.x += wind.x * 0.05 * dt;
    if (c.position.z < CLOUD_Z[0]) c.position.z += CLOUD_Z[1] - CLOUD_Z[0];
    if (Math.abs(c.position.x) > 380) c.position.x = -Math.sign(c.position.x) * 370;
  });

  // Chispas en los puntos de contacto
  let si = 0;
  for (const p of engaged.values()) {
    if (si >= sparks.length) break;
    const s = sparks[si++];
    s.visible = true;
    s.position.copy(p);
    s.scale.setScalar(0.6 + Math.random() * 0.9);
  }
  for (; si < sparks.length; si++) sparks[si].visible = false;

  // Rayas de viento: se mueven con el viento, más largas y visibles si sopla fuerte
  if (!streaksInit) { streaks.forEach(s => spawnStreak(s, camTarget, true)); streaksInit = true; }
  const kiteAltF = 1 + Math.max(0, pos.y) / 45;
  const strength = clamp((wind.length() - 2) / 10, 0.15, 1);
  streaks.forEach((s, i) => {
    s.life += dt;
    // viento a la altura de la raya (más fuerte arriba)
    const altF = (1 + Math.max(0, s.p.y) / 45) / kiteAltF;
    const vx = wind.x * altF, vy = wind.y * altF, vz = wind.z * altF;
    s.p.x += vx * dt * 1.6; s.p.y += vy * dt * 1.6; s.p.z += vz * dt * 1.6;
    if (s.life > s.max || s.p.distanceTo(camTarget) > 55) spawnStreak(s, camTarget, false);

    const sp = Math.hypot(vx, vy, vz) || 1;
    const len = 0.35 * sp * (0.6 + strength);
    const k = i * 6;
    streakPos[k] = s.p.x; streakPos[k + 1] = s.p.y; streakPos[k + 2] = s.p.z;
    streakPos[k + 3] = s.p.x - vx / sp * len;
    streakPos[k + 4] = s.p.y - vy / sp * len;
    streakPos[k + 5] = s.p.z - vz / sp * len;
    const fade = Math.sin(Math.PI * Math.min(1, s.life / s.max));
    streakCol.set([1, 1, 1, fade * (0.25 + 0.55 * strength), 1, 1, 1, 0], i * 8);
  });
  streakGeo.attributes.position.needsUpdate = true;
  streakGeo.attributes.color.needsUpdate = true;

  // HUD
  el('alt').textContent = pos.y.toFixed(1);
  el('max').textContent = player.maxAlt.toFixed(1);
  el('len').textContent = player.L.toFixed(0);
  setBar(el('hpBar'), 1 - player.damage);
  el('wind').textContent = (wind.length() * 3.6).toFixed(0);
  el('windArrow').textContent = wind.x > 1 ? '→' : wind.x < -1 ? '←' : '↑';
  el('windType').textContent = windName;
  el('windNext').textContent = Math.max(0, Math.ceil(windChangeAt - time));
  el('score').textContent = score;
  el('lost').textContent = lost;
  const climbing = rivals.filter(r => r.state === 'flying' && !r.ready).length;
  const threats = flyers.filter(r => r !== player && r.mode === 'attack');
  el('threat').textContent = threats.length ? `⚠️ Te ataca: ${threats.map(r => r.name).join(' y ')}`
    : climbing ? `Rivales subiendo: ${climbing}`
    : 'Rivales arriba, atentos...';

  // Panel de duelo cuando el jugador está enredado
  const foe = engagedWith(player);
  el('duel').hidden = !foe;
  if (foe) {
    el('duelName').textContent = el('duelName2').textContent = foe.name;
    setBar(el('duelMe'), 1 - player.damage);
    setBar(el('duelThem'), 1 - foe.damage);
  }
}

const clock = new THREE.Clock();
function loop() {
  const frame = Math.min(clock.getDelta(), 0.05);

  // Entradas del jugador
  const pulling = !pickerOpen && !lobbyOpen && (keys.Space || mouseDown);
  if (pulling && !started) { started = true; player.armed = true; showMsg(''); }
  player.pullT = pulling && player.state === 'flying' ? 1 : 0;
  player.releaseT = (keys.KeyS || keys.ArrowDown) && player.state === 'flying' ? 1 : 0;
  player.steerT = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (player.state !== 'flying') player.steerT = 0;

  // Rivales de la computadora (solo en el juego del anfitrión o de un jugador)
  rivals.forEach(r => aiThink(r, frame));
  flyers.forEach(f => { if (!f.remote) updateRoll(f); });

  const steps = 4;
  for (let i = 0; i < steps; i++) {
    time += frame / steps;
    if (!netWindIsRemote()) updateWind(time);       // el invitado usa el viento del anfitrión
    flyers.forEach(f => { if (!f.remote) stepFlyer(f, frame / steps); });   // los de la red llegan ya movidos
  }
  windAt(player.pos.y, wind);

  netUpdate(frame);
  updateVisuals(frame);
  if (NET.role !== 'guest') updateCombat(frame);   // los cortes los decide el anfitrión
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// Ajusta cámara y lienzo al tamaño de la ventana. Se llama también al arrancar: si la ventana cambió
// de tamaño mientras cargaba (pasa en celulares con la barra de direcciones), la imagen no queda deformada.
function ajustarTamano() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', ajustarTamano);
ajustarTamano();
loop();

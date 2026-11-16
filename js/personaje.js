'use strict';
// Personaje: muñeco articulado y su animación
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Personaje (con articulaciones) ----------
// El modelo mira hacia -z (hacia el volantín). Cada articulación es un Group que se rota.
function buildCharacter(look = {}) {
  const mats = {
    skin:  new THREE.MeshLambertMaterial({ color: look.skin ?? 0xe9b98f }),
    shirt: new THREE.MeshLambertMaterial({ color: look.shirt ?? 0xd9412b }),
    pants: new THREE.MeshLambertMaterial({ color: look.pants ?? 0x2f4f8a }),
    shoe:  new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
    hair:  new THREE.MeshLambertMaterial({ color: look.hair ?? 0x3b2414 }),
    cap:   new THREE.MeshLambertMaterial({ color: look.cap ?? 0x1e5bd8 }),
    wood:  new THREE.MeshLambertMaterial({ color: 0xa0703c }),
    thread:new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }),
  };
  const shadow = m => { m.castShadow = true; return m; };
  // Segmento que cuelga hacia abajo desde su pivote
  const limb = (len, r, mat) => {
    const m = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 8), mat));
    m.position.y = -len / 2;
    return m;
  };

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);
  hips.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), mats.pants)));

  // Piernas
  const makeLeg = side => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.02, 0);
    hip.add(limb(0.44, 0.08, mats.pants));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    knee.add(limb(0.42, 0.07, mats.pants));
    const foot = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), mats.shoe));
    foot.position.set(0, -0.43, -0.05);
    knee.add(foot);
    hip.add(knee);
    hips.add(hip);
    return { hip, knee };
  };
  const legL = makeLeg(-1), legR = makeLeg(1);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);
  const chest = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.22, 4, 10), mats.shirt));
  chest.scale.z = 0.65;
  chest.position.y = 0.28;
  torso.add(chest);

  // Cabeza
  const headG = new THREE.Group();
  headG.position.y = 0.6;
  torso.add(headG);
  headG.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), mats.skin)));
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mats.skin));
  head.position.y = 0.16;
  headG.add(head);
  const hair = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.147, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair));
  hair.position.y = 0.17;
  hair.rotation.x = 0.25;
  headG.add(hair);
  const cap = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mats.cap));
  cap.position.y = 0.19;
  headG.add(cap);
  const visor = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16, 1, false, -Math.PI / 2, Math.PI), mats.cap));
  visor.position.set(0, 0.22, -0.1);
  visor.rotation.x = 0.15;
  headG.add(visor);
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.skin);
    e.position.set(s * 0.14, 0.15, 0.01);
    headG.add(e);
  });

  // Brazos
  const makeArm = side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.25, 0.46, 0);
    torso.add(shoulder);
    shoulder.add(limb(0.3, 0.065, mats.shirt));
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    elbow.add(limb(0.27, 0.05, mats.skin));
    shoulder.add(elbow);
    const hand = new THREE.Group();
    hand.position.y = -0.29;
    hand.add(shadow(new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), mats.skin)));
    elbow.add(hand);
    return { shoulder, elbow, hand };
  };
  const armL = makeArm(-1), armR = makeArm(1);

  // Carrete en la mano izquierda
  const spool = new THREE.Group();
  const core = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 14), mats.thread));
  const rimA = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 14), mats.wood));
  const rimB = rimA.clone();
  rimA.position.y = 0.07; rimB.position.y = -0.07;
  spool.add(core, rimA, rimB);
  spool.rotation.z = Math.PI / 2;
  spool.position.set(0.05, -0.05, 0);
  armL.hand.add(spool);

  return { root, hips, torso, headG, legL, legR, armL, armR, spool };
}

function animateRig(f, dt) {
  const rig = f.rig;
  const pull = f.pullIn, give = f.releaseIn, st = f.steerVis, t = time + f.phase;
  const breath = Math.sin(t * 2.2) * 0.015;
  const tug = Math.sin(t * 10) * 0.1 * pull;            // tironcitos al tirar
  const hasString = f.state !== 'cut';

  // Brazo derecho: sostiene el hilo (si se cortó, lo baja)
  rig.armR.shoulder.rotation.x = hasString ? 1.2 - 0.5 * pull + 0.25 * give + tug + breath : 0.3;
  rig.armR.shoulder.rotation.z = -0.2 + st * 0.25;
  rig.armR.elbow.rotation.x = hasString ? 0.3 + 1.0 * pull : 0.2;
  // Brazo izquierdo: carrete más abajo
  rig.armL.shoulder.rotation.x = 0.75 - 0.2 * pull + 0.15 * give - tug * 0.5;
  rig.armL.shoulder.rotation.z = 0.25 + st * 0.2;
  rig.armL.elbow.rotation.x = 0.9 + 0.4 * pull;
  rig.spool.rotation.x += (give * 18 - pull * 12) * dt;  // gira al dar o recoger hilo

  // Torso: se echa hacia atrás al tirar, se inclina al dirigir
  rig.torso.rotation.x = 0.18 * pull - 0.05 * give + breath;
  rig.torso.rotation.z = -st * 0.12;
  rig.headG.rotation.x = 0.35 + 0.1 * pull;            // mira hacia arriba al volantín

  // Piernas: postura abierta, rodillas flexionadas al tirar
  rig.hips.position.y = 0.9 - 0.07 * pull;
  rig.legL.hip.rotation.x = 0.2 + 0.25 * pull;
  rig.legL.knee.rotation.x = -0.15 - 0.45 * pull;
  rig.legR.hip.rotation.x = -0.25 + 0.15 * pull;
  rig.legR.knee.rotation.x = -0.05 - 0.35 * pull;
  rig.legL.hip.rotation.z = -0.06;
  rig.legR.hip.rotation.z = 0.06;
}


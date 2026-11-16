'use strict';
// Estado del juego: variables compartidas, constantes, jugador y rivales
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Estado ----------
let started = false, time = 0, score = 0, lost = 0;
const wind = new V3();   // viento a la altura del volantín del jugador (para HUD, nubes, rayas)

const REEL_IN = 4, REEL_OUT = 3, MIN_L = 3, MAX_L = 150;
// Entradas suavizadas (suben/bajan gradualmente al mantener la tecla)
const STEER_RAMP = 1.5, RELEASE_RAMP = 1.2, PULL_RAMP = 1.5;
// Comisión
const CONTACT_IN = 0.7, CONTACT_OUT = 2.0, SAW_RATE = 0.5, DAMAGE_HEAL = 0.03;

const player = createFlyer({
  name: 'Tú', isPlayer: true, at: [0, 0, 0],
  kiteColors: [0xffd500, 0xe0262b, 0x1e5bd8, 0xffffff], tailColors: [0xffd500, 0x1e5bd8],
  kiteType: PLAYER_CAN_PICK ? savedKiteType() : 'clasico',
});
// Reparte los tipos de volantín al azar entre los rivales, sin repetir (con 4 rivales salen los 4 tipos)
const rivalKiteTypes = [...KITE_KEYS].sort(() => Math.random() - 0.5);
// Como invitado de una sala no hay rivales propios: llegan los del anfitrión por la red
const rivals = (NET_JOIN_CODE ? [] : RIVALS).map((r, i) => createFlyer({
  name: r.name, at: r.at, style: r.style,
  look: { shirt: r.shirt, cap: r.cap, pants: 0x3a3a48, hair: 0x1f140c },
  kiteColors: r.kite, tailColors: r.tail,
  kiteType: rivalKiteTypes[i % rivalKiteTypes.length],   // tipos al azar, sin repetir mientras alcancen
}));
const flyers = [player, ...rivals];


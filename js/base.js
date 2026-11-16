'use strict';
// Base: atajos de three.js usados en todo el juego
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

const V3 = THREE.Vector3;
const clamp = THREE.MathUtils.clamp;

// Multijugador: si la página se abrió con ?unirse=1234, este navegador es invitado de esa sala
const NET_JOIN_CODE = (new URLSearchParams(location.search).get('unirse') || '').replace(/\D/g, '').slice(0, 4) || null;

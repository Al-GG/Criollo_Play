'use strict';
// Viento: tipos de viento, cambios cada 10 s y viento según altura
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Viento ----------
// Cada WIND_PERIOD segundos se elige un nuevo tipo de viento y se pasa a él suavemente.
const WIND_PERIOD = 10, WIND_BLEND = 2.5;
const WIND_TYPES = [
  { name: 'Calma',   speed: 3.6, side: 0.4, gust: 0.4, gustFreq: 0.6 },
  { name: 'Brisa',   speed: 5.5, side: 1.0, gust: 0.8, gustFreq: 0.8 },
  { name: 'Fuerte',  speed: 8.0, side: 1.2, gust: 1.2, gustFreq: 1.0 },
  { name: 'Ráfagas', speed: 5.5, side: 1.5, gust: 3.0, gustFreq: 1.6 },
  { name: 'Lateral', speed: 5.0, side: 3.5, gust: 0.8, gustFreq: 0.8 },
];
let windFrom = { speed: 5.5, side: 0, gust: 0.8, gustFreq: 0.8 };
let windTo = { ...WIND_TYPES[1], side: 0 };
let windName = 'Brisa', windChangeAt = WIND_PERIOD;
const windCur = { ...windTo };
const windBase = { side: 0, up: 0, fwd: 5 };

function pickWind() {
  let type;
  do { type = WIND_TYPES[Math.floor(Math.random() * WIND_TYPES.length)]; } while (type.name === windName);
  windFrom = { ...windCur };
  windTo = { ...type, side: type.side * (Math.random() < 0.5 ? -1 : 1) };
  windName = type.name;
  showWindAlert(type.name, windTo.side);
}

// Calcula el viento base del momento (sin altura)
function updateWind(t) {
  if (t >= windChangeAt) { pickWind(); windChangeAt = t + WIND_PERIOD; }
  // Transición suave entre el viento anterior y el nuevo
  const s = THREE.MathUtils.smoothstep(t - (windChangeAt - WIND_PERIOD), 0, WIND_BLEND);
  for (const k of ['speed', 'side', 'gust', 'gustFreq']) windCur[k] = windFrom[k] + (windTo[k] - windFrom[k]) * s;

  const f = windCur.gustFreq;
  const gust = windCur.gust * (0.6 * Math.sin(t * 1.3 * f) + 0.3 * Math.sin(t * 2.9 * f + 1.3) + 0.25 * Math.sin(t * 5.1 * f + 4));
  windBase.fwd = Math.max(0.5, windCur.speed + gust);
  windBase.side = windCur.side + 0.4 * Math.sin(t * 0.37) + gust * 0.3;
  windBase.up = 0.3 * Math.sin(t * 0.5);
}
// Viento a una altura dada (más fuerte arriba)
function windAt(y, out) {
  const w = BIOME.wind;   // cada escenario tiene su viento (la playa sopla más)
  return out.set(windBase.side * w, windBase.up, -windBase.fwd * w * (1 + Math.max(0, y) / 45));
}

const windAlertEl = document.getElementById('windAlert');
let windAlertTimer;
function showWindAlert(name, side) {
  const arrow = Math.abs(side) > 1 ? (side > 0 ? ' →' : ' ←') : '';
  windAlertEl.textContent = `Viento: ${name}${arrow}`;
  windAlertEl.classList.add('show');
  clearTimeout(windAlertTimer);
  windAlertTimer = setTimeout(() => windAlertEl.classList.remove('show'), 2200);
}


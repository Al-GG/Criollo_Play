'use strict';
// Controles (teclado, mouse, táctil), escenario actual y selector de volantín
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Controles ----------
const keys = {};
let mouseDown = false;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;   // escribiendo en un campo (código de sala): no mover el volantín
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyR') { resetFlyer(player); showMsg(''); }
  if (e.code === 'KeyM') openLobby();
  if (e.code === 'KeyE') nextBiome();
  if (e.code === 'KeyV' && PLAYER_CAN_PICK) openPicker();
  if (pickerOpen && /^Digit[1-9]$/.test(e.code)) {
    const key = KITE_KEYS[+e.code.slice(5) - 1];
    if (key) choosePlayerKite(key);
  }
});
addEventListener('keyup', e => keys[e.code] = false);
// Click / toque sobre el escenario = tirar (cuenta los dedos para el multitáctil)
const canvasPointers = new Set();
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => { canvasPointers.add(e.pointerId); mouseDown = true; });
const canvasUp = e => { canvasPointers.delete(e.pointerId); mouseDown = canvasPointers.size > 0; };
cv.addEventListener('pointerup', canvasUp);
cv.addEventListener('pointercancel', canvasUp);
cv.addEventListener('pointerleave', canvasUp);

// Botones táctiles: cada uno simula una tecla mientras se mantiene presionado
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
function enableTouchUI() {
  document.body.classList.add('touch');
  if (!started) showMsg('¡Tira para elevar el volantín!<small>Mantén el botón TIRAR</small>');
}
if (isTouch) enableTouchUI();
addEventListener('touchstart', enableTouchUI, { once: true });

document.querySelectorAll('#touch button[data-key]').forEach(btn => {
  const code = btn.dataset.key;
  const down = e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); keys[code] = true; btn.classList.add('on'); };
  const up = () => { keys[code] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
});
document.getElementById('btnReset').addEventListener('pointerdown', e => { e.preventDefault(); resetFlyer(player); showMsg(''); });
document.getElementById('btnScene').addEventListener('pointerdown', e => { e.preventDefault(); nextBiome(); });
document.getElementById('btnKite').addEventListener('pointerdown', e => { e.preventDefault(); openPicker(); });

// ---------- Selector de volantín ----------
// El jugador elige su volantín al empezar (tecla V o botón para cambiar); los rivales reciben uno al azar.
// Con PLAYER_CAN_PICK = false el jugador usa siempre el clásico.
// Dibujito del volantín para la tarjeta
function kiteSVG(kt, colors) {
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  let shapes;
  if (kt.shape === 'hexagon') {
    const p = Array.from({ length: 6 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      return [32 + Math.cos(a) * 26, 30 + Math.sin(a) * 26];
    });
    shapes = p.map((q, i) => `<polygon points="32,30 ${q} ${p[(i + 1) % 6]}" fill="${hex(colors[i % 4])}"/>`).join('');
  } else {
    const s = kt.size * 29, P = kt.rhombus || { top: 0.9, side: 0.65, mid: 0.1, bottom: -0.75 };
    const T = [32, 30 - P.top * s], R = [32 + P.side * s, 30 - P.mid * s], B = [32, 30 - P.bottom * s], Lf = [32 - P.side * s, 30 - P.mid * s], C = [32, 30 - P.mid * s];
    const cols = kt.twoTone ? [colors[0], colors[1], colors[1], colors[0]] : colors;
    shapes = [[T, R], [R, B], [B, Lf], [Lf, T]].map(([a, b], i) => `<polygon points="${C} ${a} ${b}" fill="${hex(cols[i])}"/>`).join('');
    if (kt.fringe) shapes += `<path d="M${Lf} l-3,20 M${Lf[0] + 3},${Lf[1]} l-2,23 M${R} l3,20 M${R[0] - 3},${R[1]} l2,23" stroke="${hex(colors[1])}" stroke-width="2"/>`;
  }
  const bottom = kt.shape === 'hexagon' ? 56 : 30 - (kt.rhombus?.bottom ?? -0.75) * kt.size * 29;
  const tail = kt.tail ? `<path d="M32,${bottom} q5,4 0,8 q-5,4 0,8" stroke="#1e5bd8" stroke-width="1.5" fill="none"/>` : '';
  return `<svg viewBox="0 0 64 74" aria-hidden="true">${shapes}${tail}</svg>`;
}

let pickerOpen = false;
const pickerEl = document.getElementById('picker');
function openPicker() {
  const cur = player.kiteType;
  document.getElementById('cards').innerHTML = KITE_KEYS.map((k, i) => {
    const kt = KITE_TYPES[k];
    const stats = Object.entries(kt.stats).map(([n, v]) =>
      `<div class="stat"><span>${n}</span><span class="pips">${'●'.repeat(v)}${'○'.repeat(5 - v)}</span></div>`).join('');
    return `<div class="card${k === cur ? ' sel' : ''}" data-kite="${k}">
      ${kiteSVG(kt, player.kiteColors)}<h3>${kt.name}</h3><p>${kt.desc}</p>${stats}
      <span class="key">tecla ${i + 1}</span></div>`;
  }).join('');
  pickerEl.querySelectorAll('.card').forEach(c =>
    c.addEventListener('click', () => choosePlayerKite(c.dataset.kite)));
  pickerEl.hidden = false;
  document.getElementById('msg').style.visibility = 'hidden';   // que no se vea el mensaje detrás
  pickerOpen = true;
}
function choosePlayerKite(key) {
  try { localStorage.setItem('volantines.tipo', key); } catch (e) {}
  if (key !== player.kiteType) buildKiteParts(player, key);
  resetFlyer(player);
  pickerEl.hidden = true;
  if (labelsFrom === null) labelsFrom = time;   // los nombres de los rivales empiezan a contar desde aquí
  document.getElementById('msg').style.visibility = '';
  pickerOpen = false;
  keys.Space = false; mouseDown = false;
  showMsg(started ? '' : `¡Tira para elevar tu ${KITE_TYPES[key].name.toLowerCase()}!<small>${document.body.classList.contains('touch') ? 'Mantén el botón TIRAR' : 'Mantén ESPACIO o el click'}</small>`);
}
if (PLAYER_CAN_PICK) openPicker();   // al empezar, elegir volantín
else labelsFrom = 0;

// Escenario: nombre en el HUD, aviso al empezar, y cambio al siguiente (recarga la página con ?escenario=...)
function nextBiome() {
  if (NET.role) { showToast('Para cambiar de escenario, primero sal de la sala (👥 → Salir de la sala)'); return; }
  const next = BIOME_KEYS[(BIOME_KEYS.indexOf(BIOME_KEY) + 1) % BIOME_KEYS.length];
  try { localStorage.setItem('volantines.ultimoEscenario', next); } catch (e) {}
  location.search = '?escenario=' + next;
}
document.getElementById('place').textContent = `📍 ${BIOME.name} · ${BIOME.place} · ${TOD.name}`;
setTimeout(() => showToast(`📍 ${BIOME.name} · ${BIOME.place} · ${TOD.name}`), 400);
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; canvasPointers.clear(); });

function showMsg(html) { document.getElementById('msg').innerHTML = html; }

const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}


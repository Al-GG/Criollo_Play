'use strict';
// Escenarios: biomas, renderer, cielo, hora del día, terreno, objetos, nubes y ambiente
// (Script clásico: comparte variables con los demás archivos de js/. Ver el orden de carga en index.html.)

// ---------- Escenarios (biomas de Chile) ----------
// Cada vez que se abre el juego se elige uno al azar (sin repetir el anterior).
// También se puede forzar con ?escenario=playa en la URL, o cambiar con la tecla E.
const BIOMES = {
  campo: {
    name: 'Campo', place: 'Valle Central',
    sky: [0x2f7fd0, 0xcfe8f5], hemi: [0xdff2ff, 0x5a7a3a], sunColor: 0xfff4e0, sunI: 1.5,
    ground: { base: 0x5fa843, dark: 0x3d7a32, dry: 0xb7b45a },
    shape: (x, z, n) => n * 30 - 6,
    mountains: { rock: 0x6f7f95, dark: 0x4f5d72, snowLine: 150, height: 1 },
    grass: { count: 4500, hue: 0.25, light: 0.28 }, flowers: 400,
    props: { count: 110, kinds: ['pine', 'round'], clustered: true },
    clouds: { count: 26, gray: 0 }, wind: 1,
  },
  bosque: {
    name: 'Bosque del sur', place: 'Los Lagos',
    sky: [0x4c84b8, 0xd3e1ea], hemi: [0xd8e6f0, 0x3a5a2a], sunColor: 0xf4f0e8, sunI: 1.25,
    ground: { base: 0x3f8a3a, dark: 0x285c2a, dry: 0x6f8f3a },
    shape: (x, z, n) => n * 42 - 8,
    mountains: { rock: 0x5d6b78, dark: 0x3f4b58, snowLine: 130, height: 1.1 }, volcano: true,
    grass: { count: 6000, hue: 0.28, light: 0.22 }, flowers: 150,
    props: { count: 320, kinds: ['pine', 'pine', 'round'], clustered: false, minDist: 30 },
    clouds: { count: 40, gray: 0.35 }, wind: 0.9,
  },
  desierto: {
    name: 'Desierto', place: 'Atacama',
    sky: [0x1a62cf, 0xf1dfc0], hemi: [0xfff0dc, 0x9a6a3a], sunColor: 0xffe8c8, sunI: 1.75,
    ground: { base: 0xd6a467, dark: 0xb77f4c, dry: 0xe9c690 },
    shape: (x, z, n) => n * 16 + Math.sin(x * 0.025 + n * 4) * 5 - 3,   // dunas
    mountains: { rock: 0x9a6a52, dark: 0x7a4f3e, snowLine: 210, height: 1.15 }, volcano: true,
    grass: { count: 300, hue: 0.13, light: 0.45 }, flowers: 0, rocks: 160,
    props: { count: 70, kinds: ['cactus'], clustered: false },
    clouds: { count: 4, gray: 0 }, wind: 1.05,
  },
  playa: {
    name: 'Playa', place: 'Costa central',
    sky: [0x2a8ae0, 0xd6eff9], hemi: [0xe8f6ff, 0xc9b78a], sunColor: 0xfff6e8, sunI: 1.6,
    ground: { base: 0xe6d3a3, dark: 0xd2b98a, dry: 0xf2e4ba, under: 0xa79a72 },
    // El mar está hacia donde sopla el viento: la arena baja suavemente desde z = -35
    shape: (x, z, n) => n * 7 - 1,
    terrain: (x, z, d, base) => z < -35 ? -Math.min(8, (-35 - z) * 0.12) : base,
    sea: true, mountains: null,
    grass: { count: 700, hue: 0.16, light: 0.4, behindOnly: true }, flowers: 0,
    props: { count: 45, kinds: ['palm'], clustered: false, behindOnly: true },
    clouds: { count: 14, gray: 0 }, wind: 1.15,
  },
  ciudad: {
    name: 'Ciudad', place: 'Santiago',
    sky: [0x3f86c8, 0xdcd6c6], hemi: [0xe8eef2, 0x6a6a5a], sunColor: 0xfff0d8, sunI: 1.4,
    ground: { base: 0x5c9a45, dark: 0x467a38, dry: 0x8c9a5a, far: 0x7c7c78 },
    shape: (x, z, n) => n * 3,
    mountains: { rock: 0x6f7686, dark: 0x515868, snowLine: 140, height: 1.2 },
    grass: { count: 3000, hue: 0.26, light: 0.3 }, flowers: 120,
    props: { count: 30, kinds: ['round'], clustered: false, maxDist: 70 }, buildings: 260,
    clouds: { count: 12, gray: 0.15 }, wind: 0.95,
  },
  cerros: {
    name: 'Cerros', place: 'Valparaíso',
    sky: [0x2f7fd0, 0xd8ecf6], hemi: [0xe2f2ff, 0x6a7a4a], sunColor: 0xfff2e0, sunI: 1.5,
    ground: { base: 0x6a9a48, dark: 0x4d7a38, dry: 0xa8a060, under: 0x8a8a70 },
    shape: (x, z, n) => n * 70 + 6,
    terrain: (x, z, d, base) => z < -260 ? Math.min(base, -10) : base,   // el mar al fondo
    sea: true, mountains: null,
    grass: { count: 3500, hue: 0.24, light: 0.3 }, flowers: 250,
    props: { count: 60, kinds: ['round'], clustered: true }, houses: 420,
    clouds: { count: 20, gray: 0 }, wind: 1.1,
  },
};

const BIOME_KEYS = Object.keys(BIOMES);
function pickBiome() {
  const asked = new URLSearchParams(location.search).get('escenario');
  if (asked && BIOMES[asked]) return asked;
  let last = null;
  try { last = localStorage.getItem('volantines.ultimoEscenario'); } catch (e) {}
  const options = BIOME_KEYS.filter(k => k !== last);
  const key = options[Math.floor(Math.random() * options.length)];
  try { localStorage.setItem('volantines.ultimoEscenario', key); } catch (e) {}
  return key;
}
const BIOME_KEY = pickBiome();
const BIOME = BIOMES[BIOME_KEY];

// ---------- Escena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- Hora del día (al azar; se puede forzar con ?hora=atardecer) ----------
// Se mezcla con los colores del escenario: blend = cuánto se impone el color de la hora.
const TIMES = {
  manana:    { name: 'Mañana',    top: 0x5f9fdc, horizon: 0xffe0bf, blend: 0.45, sun: 0xffe2b8, sunI: 1.2, hemiI: 0.75,
               sunPos: [-70, 30, 10], cloud: 0xfff0e2, disc: 0xfff2c8 },
  mediodia:  { name: 'Mediodía',  top: null, horizon: null, blend: 0, sun: null, sunI: null, hemiI: 0.85,
               sunPos: [30, 60, 20], cloud: 0xffffff, disc: null },
  atardecer: { name: 'Atardecer', top: 0x34508f, horizon: 0xff9448, blend: 0.8, sun: 0xffa060, sunI: 1.15, hemiI: 0.75,
               sunPos: [80, 16, -60], cloud: 0xffc0a0, disc: 0xffb070 },
};
const TIME_KEY = (() => {
  const asked = new URLSearchParams(location.search).get('hora');
  if (asked && TIMES[asked]) return asked;
  const keys = Object.keys(TIMES);
  return keys[Math.floor(Math.random() * keys.length)];
})();
const TOD = TIMES[TIME_KEY];

const SKY_TOP = new THREE.Color(BIOME.sky[0]), SKY_HORIZON = new THREE.Color(BIOME.sky[1]);
if (TOD.top != null) SKY_TOP.lerp(new THREE.Color(TOD.top), TOD.blend);
if (TOD.horizon != null) SKY_HORIZON.lerp(new THREE.Color(TOD.horizon), TOD.blend);
const scene = new THREE.Scene();
scene.background = SKY_HORIZON.clone();
scene.fog = new THREE.Fog(SKY_HORIZON, 140, 900);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2200);

scene.add(new THREE.HemisphereLight(BIOME.hemi[0], BIOME.hemi[1], TOD.hemiI));
const sun = new THREE.DirectionalLight(TOD.sun ?? BIOME.sunColor, TOD.sunI ?? BIOME.sunI);
sun.position.set(...TOD.sunPos);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
scene.add(sun);

// Cielo: esfera grande con degradado (color arriba, claro en el horizonte)
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(2000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: SKY_TOP }, horizon: { value: SKY_HORIZON } },
    vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vPos;
      void main() { float h = clamp(normalize(vPos).y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0); }`,
  })
));

// ---------- Ruido (para terreno y cordillera) ----------
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 4) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { sum += noise(x * f, z * f) * amp; f *= 2; amp *= 0.5; }
  return sum / (1 - Math.pow(0.5, oct));
}

// ---------- Terreno ----------
// Plano donde se juega (cerca del origen) y la forma del bioma hacia afuera.
const PLAY_CENTER_Z = -15;
function terrainHeight(x, z) {
  const d = Math.hypot(x, z - PLAY_CENTER_Z);
  const hills = THREE.MathUtils.smoothstep(d, 50, 140);
  const ripple = Math.max(0, fbm(x * 0.05, z * 0.05) - 0.55) * 0.6 * THREE.MathUtils.smoothstep(d, 15, 35);
  const base = hills * BIOME.shape(x, z, fbm(x * 0.011, z * 0.011)) + (1 - hills) * ripple;
  return BIOME.terrain ? BIOME.terrain(x, z, d, base) : base;
}
const SEA_LEVEL = -0.4;

{
  const geo = new THREE.PlaneGeometry(1800, 1800, 240, 240);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const G = BIOME.ground;
  const base = new THREE.Color(G.base), dark = new THREE.Color(G.dark), dry = new THREE.Color(G.dry);
  const far = G.far != null ? new THREE.Color(G.far) : null;
  const under = G.under != null ? new THREE.Color(G.under) : null;
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = terrainHeight(x, z);
    p.setY(i, h);
    const d = Math.hypot(x, z - PLAY_CENTER_Z);
    // Color: manchas, más seco/claro en lo alto
    const patch = fbm(x * 0.04 + 50, z * 0.04);
    c.copy(base).lerp(dark, clamp(patch - 0.35, 0, 1) * 0.9);
    c.lerp(dry, clamp(h / 22, 0, 0.75) + clamp(fbm(x * 0.02, z * 0.02 + 9) - 0.6, 0, 1) * 0.8);
    if (far) c.lerp(far, THREE.MathUtils.smoothstep(d, 75, 110) * 0.85);       // ciudad: pavimento
    if (under && h < 0.1) c.lerp(under, clamp((0.1 - h) / 1.5, 0, 1));          // arena mojada / fondo
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}

// Mar (playa y cerros)
let sea = null;
if (BIOME.sea) {
  sea = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshPhongMaterial({ color: 0x2a7fb3, specular: 0x9cc8e8, shininess: 80, transparent: true, opacity: 0.9 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  scene.add(sea);
}

// Cordillera al fondo (con nieve arriba)
if (BIOME.mountains) {
  const MT = BIOME.mountains;
  const W = 2400, D = 420;
  const geo = new THREE.PlaneGeometry(W, D, 300, 60);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const rock = new THREE.Color(MT.rock), rockDark = new THREE.Color(MT.dark), snow = new THREE.Color(0xf4f8fc), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const back = (D / 2 - z) / D;                       // 0 al frente, 1 al fondo
    const ridge = 1 - Math.abs(fbm(x * 0.004, z * 0.006, 5) * 2 - 1);   // crestas
    const h = Math.pow(ridge, 1.6) * (40 + back * 260) * MT.height * THREE.MathUtils.smoothstep(back, 0, 0.35);
    p.setY(i, h - 10);
    const snowLine = MT.snowLine + (fbm(x * 0.02, z * 0.02) - 0.5) * 60;
    c.copy(rock).lerp(rockDark, fbm(x * 0.03, z * 0.03));
    if (h > snowLine) c.lerp(snow, clamp((h - snowLine) / 25, 0, 1));
    c.lerp(SKY_HORIZON, 0.3);                           // un poco de 'aire' por la distancia
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mountains = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  mountains.position.set(0, 0, -560 - D / 2);
  scene.add(mountains);
}

// Volcán nevado (bosque del sur y desierto)
if (BIOME.volcano) {
  const H = 300, geo = new THREE.ConeGeometry(230, H, 64, 12, true);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const rock = new THREE.Color(BIOME.mountains.dark), snow = new THREE.Color(0xf6f9fc), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + H / 2;                         // 0 abajo, H arriba
    const ang = Math.atan2(p.getZ(i), p.getX(i));
    const line = H * (0.6 + Math.sin(ang * 7) * 0.05);  // nieve con borde irregular
    c.copy(rock);
    if (y > line) c.lerp(snow, clamp((y - line) / 20, 0, 1));
    c.lerp(SKY_HORIZON, 0.3);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const volcano = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  volcano.position.set(-220, H / 2 - 20, -720);
  scene.add(volcano);
}

// ---------- Objetos instanciados (árboles, cactus, casas, edificios, rocas, pasto) ----------
// Todas las copias de una misma pieza se dibujan juntas: así se pueden poner cientos sin ponerse lento.
const instGroups = new Map();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _c = new THREE.Color();
const UNIT = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  cone: new THREE.ConeGeometry(1, 1, 7),
  blob: new THREE.IcosahedronGeometry(1, 1),
  leaf: new THREE.ConeGeometry(1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  roof: new THREE.ConeGeometry(1, 1, 4),
  rock: new THREE.DodecahedronGeometry(1, 0),
  tuft: new THREE.ConeGeometry(0.07, 0.38, 3).translate(0, 0.19, 0),
  flower: new THREE.IcosahedronGeometry(0.06, 0),
};
const MAT = {
  smooth: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  flat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
};
function M(px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
function addInst(geoKey, matKey, matrix, color, shadow = true) {
  const key = geoKey + '|' + matKey;
  if (!instGroups.has(key)) instGroups.set(key, { geo: UNIT[geoKey], mat: MAT[matKey], items: [], shadow });
  instGroups.get(key).items.push([matrix, color]);
}
function flushInst() {
  for (const g of instGroups.values()) {
    const mesh = new THREE.InstancedMesh(g.geo, g.mat, g.items.length);
    g.items.forEach(([m, col], i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, _c.set(col)); });
    mesh.castShadow = g.shadow;
    mesh.frustumCulled = false;   // las copias están repartidas por todo el mapa
    scene.add(mesh);
  }
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Cada tipo de objeto: se arma con piezas relativas a su base (matriz T)
const PROPS = {
  pine(T) {
    addInst('cyl', 'smooth', T.clone().multiply(M(0, 1, 0, 0, 0, 0, 0.27, 2, 0.27)), 0x6e4a2b);
    [[1.8, 3], [1.4, 2.6], [1.0, 2.2]].forEach(([r, h], i) =>
      addInst('cone', 'flat', T.clone().multiply(M(0, 2.6 + i * 1.3, 0, 0, 0, 0, r, h, r)), pick([0x2b6b35, 0x2f7438, 0x275f30])));
  },
  round(T) {
    addInst('cyl', 'smooth', T.clone().multiply(M(0, 1.2, 0, 0, 0, 0, 0.27, 2.4, 0.27)), 0x6e4a2b);
    const col = pick([0x3f8a3a, 0x4d9a3f, 0x5a8f2f]);
    for (let i = 0; i < 3; i++) {
      const s = 1.2 + Math.random() * 0.7;
      addInst('blob', 'flat', T.clone().multiply(M((Math.random() - 0.5) * 1.4, 3.2 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4, 0, 0, 0, s)), col);
    }
  },
  palm(T) {
    const h = 6 + Math.random() * 3, lean = (Math.random() - 0.5) * 2.5, segs = 6;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const x0 = lean * t0 * t0, x1 = lean * t1 * t1;
      const ang = Math.atan2(x1 - x0, h / segs);
      addInst('cyl', 'smooth', T.clone().multiply(M((x0 + x1) / 2, (t0 + t1) / 2 * h, 0, 0, 0, -ang, 0.2 - t0 * 0.06, h / segs + 0.05, 0.2 - t0 * 0.06)), 0x8a6a45);
    }
    const top = new V3(lean, h, 0), up = new V3(0, 1, 0);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + Math.random() * 0.3, droop = 0.25 + Math.random() * 0.35;
      const dir = new V3(Math.cos(a) * Math.cos(droop), -Math.sin(droop), Math.sin(a) * Math.cos(droop)).normalize();
      const m = new THREE.Matrix4().compose(top.clone().addScaledVector(dir, 1.6), new THREE.Quaternion().setFromUnitVectors(up, dir), new V3(0.45, 3.2, 0.08));
      addInst('leaf', 'flat', T.clone().multiply(m), pick([0x3d8a3a, 0x4a9a40]));
    }
  },
  cactus(T) {
    const H = 2.5 + Math.random() * 2.5, col = pick([0x5f8f4a, 0x6a9a50]);
    addInst('cyl', 'smooth', T.clone().multiply(M(0, H / 2, 0, 0, 0, 0, 0.3, H, 0.3)), col);
    [-1, 1].forEach(s => {
      if (Math.random() < 0.25) return;
      const y = H * (0.35 + Math.random() * 0.2), up = 0.8 + Math.random() * 0.8;
      addInst('cyl', 'smooth', T.clone().multiply(M(s * 0.45, y, 0, 0, 0, Math.PI / 2, 0.18, 0.7, 0.18)), col);
      addInst('cyl', 'smooth', T.clone().multiply(M(s * 0.8, y + up / 2, 0, 0, 0, 0, 0.18, up, 0.18)), col);
    });
  },
  house(T) {
    const w = 3 + Math.random() * 2, h = 2.5 + Math.random() * 2.5;
    addInst('box', 'smooth', T.clone().multiply(M(0, h / 2, 0, 0, 0, 0, w, h, w * 0.9)),
      pick([0xe8423c, 0xf2c12e, 0x3ba3d9, 0x6cc070, 0xf28c28, 0xd95fa8, 0xf4f1e8, 0x8f5fd9]));
    addInst('roof', 'flat', T.clone().multiply(M(0, h + 0.6, 0, 0, Math.PI / 4, 0, w * 0.78, 1.2, w * 0.72)), pick([0x8a3a2a, 0x6a6a6a, 0xa85a3a]));
  },
  building(T) {
    const w = 8 + Math.random() * 10, d = 8 + Math.random() * 10, h = 10 + Math.pow(Math.random(), 2) * 55;
    addInst('box', 'smooth', T.clone().multiply(M(0, h / 2, 0, 0, 0, 0, w, h, d)), pick([0xb8b4aa, 0x9aa3ad, 0xd8d0bf, 0x8a8f96, 0xc9c2b2]));
    if (Math.random() < 0.4) addInst('box', 'smooth', T.clone().multiply(M(0, h + 1.2, 0, 0, 0, 0, w * 0.4, 2.4, d * 0.4)), 0x707478);
  },
  rock(T) {
    const s = 0.4 + Math.random() * 1.6;
    addInst('rock', 'flat', T.clone().multiply(M(0, s * 0.3, 0, Math.random() * 3, Math.random() * 3, 0, s, s * 0.7, s)), pick([0x8a6248, 0x9a7458, 0x6f4f3c]));
  },
};

function baseMatrix(x, z, scale) {
  return M(x, terrainHeight(x, z) - 0.05, z, 0, Math.random() * Math.PI * 2, 0, scale);
}
const nearPlayers = (x, z, r) => Math.hypot(x, z - PLAY_CENTER_Z) < r || RIVALS.some(rv => Math.hypot(x - rv.at[0], z - rv.at[2]) < 8);

// Árboles / cactus / palmeras
if (BIOME.props) {
  const P = BIOME.props;
  let placed = 0;
  for (let tries = 0; placed < P.count && tries < P.count * 25; tries++) {
    const x = (Math.random() - 0.5) * 460, z = 30 - Math.random() * 360;
    const d = Math.hypot(x, z - PLAY_CENTER_Z);
    if (nearPlayers(x, z, P.minDist ?? 28) || (P.maxDist && d > P.maxDist)) continue;
    if (P.behindOnly && z < -28) continue;                                     // playa: solo en la arena
    if (P.clustered && fbm(x * 0.03, z * 0.03 + 4) < 0.45) continue;          // en grupitos
    if (terrainHeight(x, z) < 0.2 && BIOME.sea) continue;
    PROPS[pick(P.kinds)](baseMatrix(x, z, 0.8 + Math.random() * 0.9));
    placed++;
  }
}
// Casas de colores en los cerros
for (let i = 0, tries = 0; i < (BIOME.houses || 0) && tries < 8000; tries++) {
  const x = (Math.random() - 0.5) * 700, z = 60 - Math.random() * 320;
  const h = terrainHeight(x, z);
  if (nearPlayers(x, z, 60) || h < 4) continue;
  PROPS.house(baseMatrix(x, z, 1)); i++;
}
// Edificios de la ciudad (lejos del parque donde se juega)
for (let i = 0, tries = 0; i < (BIOME.buildings || 0) && tries < 5000; tries++) {
  const a = Math.random() * Math.PI * 2, r = 110 + Math.random() * 360;
  const x = Math.cos(a) * r, z = PLAY_CENTER_Z + Math.sin(a) * r;
  if (z > 60) continue;
  PROPS.building(baseMatrix(x, z, 1)); i++;
}
// Rocas (desierto)
for (let i = 0; i < (BIOME.rocks || 0); i++) {
  const x = (Math.random() - 0.5) * 400, z = 40 - Math.random() * 300;
  if (nearPlayers(x, z, 12)) continue;
  PROPS.rock(baseMatrix(x, z, 1));
}
// Pasto y florcitas cerca del área de juego
{
  const G = BIOME.grass;
  for (let i = 0; i < (G?.count || 0); i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 55;
    const x = Math.cos(a) * r, z = PLAY_CENTER_Z + Math.sin(a) * r;
    if (G.behindOnly && z < -30) continue;
    if (BIOME.sea && terrainHeight(x, z) < 0.05) continue;
    const k = 0.6 + Math.random() * 0.9;
    addInst('tuft', 'smooth', M(x, terrainHeight(x, z), z, (Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5, k, k * (0.7 + Math.random() * 0.8), k),
      _c.setHSL(G.hue + Math.random() * 0.06, 0.5, G.light + Math.random() * 0.14).getHex(), false);
  }
  for (let i = 0; i < (BIOME.flowers || 0); i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 50;
    const x = Math.cos(a) * r, z = PLAY_CENTER_Z + Math.sin(a) * r;
    addInst('flower', 'smooth', M(x, terrainHeight(x, z) + 0.25 + Math.random() * 0.1, z), Math.random() < 0.6 ? 0xffd93b : 0xffffff, false);
  }
}
flushInst();

// ---------- Nubes esponjosas ----------
// Cada nube es un grupo de "motas" (sprites con textura suave); las de abajo un poco más grises.
function makePuffTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const puffTex = makePuffTexture();
const grayC = new THREE.Color(0x9aa4b0);
const puffMats = [0xffffff, 0xf2f5f9, 0xdde4ec].map(c =>
  new THREE.SpriteMaterial({ map: puffTex, color: new THREE.Color(c).lerp(grayC, BIOME.clouds.gray).multiply(new THREE.Color(TOD.cloud)), transparent: true, depthWrite: false, opacity: 0.92 }));

const clouds = [];
const CLOUD_Z = [-700, 120];
for (let i = 0; i < BIOME.clouds.count; i++) {
  const c = new THREE.Group();
  const w = 18 + Math.random() * 30, n = 9 + Math.floor(Math.random() * 8);
  for (let j = 0; j < n; j++) {
    const t = j / (n - 1);
    const x = (t - 0.5) * w + (Math.random() - 0.5) * 6;
    const hump = Math.sin(t * Math.PI);                       // más alta al centro
    const y = Math.random() * 5 * hump;
    const size = (8 + Math.random() * 8) * (0.6 + hump * 0.6);
    const sp = new THREE.Sprite(puffMats[y < 1.5 ? 2 : y < 3 ? 1 : 0]);
    sp.position.set(x, y, (Math.random() - 0.5) * 8);
    sp.scale.set(size, size * 0.8, 1);
    c.add(sp);
  }
  c.position.set((Math.random() - 0.5) * 700, 70 + Math.random() * 70, CLOUD_Z[0] + Math.random() * (CLOUD_Z[1] - CLOUD_Z[0]));
  scene.add(c);
  clouds.push(c);
}

// ---------- Ambiente: sol, banderas, pájaros y barco ----------
// Sol visible (mañana y atardecer, cuando está bajo): un brillo suave en el cielo
if (TOD.disc) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: TOD.disc, fog: false, depthWrite: false, transparent: true }));
  disc.position.copy(new V3(...TOD.sunPos).normalize().multiplyScalar(1500));
  disc.scale.setScalar(260);
  scene.add(disc);
}

// Banderas chilenas de Fiestas Patrias: mástiles alrededor del área de juego, flameando con el viento
function makeChileFlagTexture() {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 192, 64);
  g.fillStyle = '#d52b1e'; g.fillRect(0, 64, 192, 64);
  g.fillStyle = '#0039a6'; g.fillRect(0, 0, 64, 64);
  // Estrella blanca de 5 puntas
  g.fillStyle = '#ffffff';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 9 : 22, a = -Math.PI / 2 + i * Math.PI / 5;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const flags = [];
{
  const tex = makeChileFlagTexture();
  const FW = 3, FH = 2;
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  const flagMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const spots = [];
  for (let tries = 0; spots.length < 16 && tries < 600; tries++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 45;
    const x = Math.cos(a) * r, z = PLAY_CENTER_Z + Math.sin(a) * r;
    if (z > -4) continue;                                                   // solo hacia adelante: nunca tapan la cámara
    if (BIOME.sea && terrainHeight(x, z) < 0.2) continue;                   // no en el mar
    if (spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 9)) continue;
    spots.push([x, z]);
  }
  for (const [x, z] of spots) {
    const h = 7 + Math.random() * 3;
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), poleMat);
    pole.position.y = h / 2;
    pole.castShadow = true;
    const geo = new THREE.PlaneGeometry(FW, FH, 12, 4);
    geo.translate(FW / 2, 0, 0);                        // el borde izquierdo queda pegado al mástil
    const flag = new THREE.Mesh(geo, flagMat);
    flag.position.y = h - FH / 2 - 0.1;
    flag.castShadow = true;
    const holder = new THREE.Group();                   // gira la bandera según el viento
    holder.add(flag);
    g.add(pole, holder);
    scene.add(g);
    flags.push({ holder, flag, base: Float32Array.from(geo.attributes.position.array), phase: Math.random() * 6 });
  }
}
function updateFlags() {
  // La bandera apunta hacia donde sopla el viento y ondea más si sopla fuerte
  const yaw = Math.atan2(-wind.z, wind.x);
  const amp = clamp(wind.length() / 10, 0.15, 0.6);
  for (const f of flags) {
    f.holder.rotation.y = yaw + Math.sin(time * 0.7 + f.phase) * 0.15;
    const p = f.flag.geometry.attributes.position, b = f.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3];
      p.setZ(i, Math.sin(x * 2.2 - time * 7 + f.phase) * amp * (x / 3));
    }
    p.needsUpdate = true;
    f.flag.geometry.computeVertexNormals();
  }
}

// Pájaros: bandadas en V que cruzan el cielo de vez en cuando, aleteando
const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2a30, side: THREE.DoubleSide });
const wingGeo = new THREE.BufferGeometry();
wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, 0, 0, 0.25, 1.1, 0, 0.05], 3));
const flocks = [];
let nextFlockAt = 4;
function spawnFlock() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const n = 3 + Math.floor(Math.random() * 6);
  const y = 18 + Math.random() * 40, z = -20 - Math.random() * 90;
  const speed = 7 + Math.random() * 5;
  const group = new THREE.Group();
  group.position.set(-dir * 160, y, z);
  group.rotation.y = dir > 0 ? 0 : Math.PI;           // el grupo avanza por su +x
  const birds = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    b.position.set(-row * 2.2, (Math.random() - 0.5) * 0.6, i === 0 ? 0 : side * row * 1.8);   // formación en V
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 4), birdMat);
    body.rotation.z = -Math.PI / 2;
    const wl = new THREE.Mesh(wingGeo, birdMat), wr = new THREE.Mesh(wingGeo, birdMat);
    wl.rotation.y = Math.PI / 2; wr.rotation.y = -Math.PI / 2;   // alas hacia los lados
    const pl = new THREE.Group(), pr = new THREE.Group();
    pl.add(wl); pr.add(wr);
    b.add(body, pl, pr);
    b.scale.setScalar(1.3);
    group.add(b);
    birds.push({ pl, pr, phase: Math.random() * 6 });
  }
  scene.add(group);
  flocks.push({ group, birds, dir, speed });
}
function updateBirds(dt) {
  if (time > nextFlockAt) { spawnFlock(); nextFlockAt = time + 10 + Math.random() * 15; }
  for (let i = flocks.length - 1; i >= 0; i--) {
    const fl = flocks[i];
    fl.group.position.x += fl.dir * fl.speed * dt;
    fl.group.position.y += Math.sin(time * 0.5 + i) * 0.3 * dt;
    for (const b of fl.birds) {
      const flap = Math.sin(time * 9 + b.phase) * 0.6;
      b.pl.rotation.x = flap; b.pr.rotation.x = -flap;
    }
    if (Math.abs(fl.group.position.x) > 170) { scene.remove(fl.group); flocks.splice(i, 1); }
  }
}

// Barco en el horizonte (escenarios con mar): avanza lento de lado a lado y se mece
let ship = null;
if (BIOME.sea) {
  ship = new THREE.Group();
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(70, 7, 12), lam(0x8a1f1f));
  hull.position.y = 2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 12), lam(0x2a2a2a));
  deck.position.y = 6;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(6, 12, 4), lam(0x8a1f1f));   // proa en punta
  bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4;
  bow.position.set(41, 3.5, 0); bow.scale.set(1, 1, 0.75);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 10), lam(0xf2f2ee));
  bridge.position.set(-27, 11, 0);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 6, 8), lam(0xd9a020));
  chimney.position.set(-30, 18, 0);
  ship.add(hull, deck, bow, bridge, chimney);
  // Contenedores de colores
  const cols = [0xd62839, 0x1f6fd1, 0xf2a71b, 0x2e9b4f, 0xe86f2b];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 1 + (i + j) % 2; k++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.6, 5), lam(cols[(i * 3 + j + k) % cols.length]));
    c.position.set(-18 + i * 6.5, 8 + k * 2.7, j * 5.4 - 2.7);
    ship.add(c);
  }
  ship.userData = { z: BIOME_KEY === 'cerros' ? -480 : -360, speed: 2.5, x: -250 + Math.random() * 500, dir: Math.random() < 0.5 ? 1 : -1 };
  ship.rotation.y = ship.userData.dir > 0 ? 0 : Math.PI;
  ship.position.set(ship.userData.x, SEA_LEVEL - 1, ship.userData.z);
  scene.add(ship);
}
function updateShip(dt) {
  if (!ship) return;
  const u = ship.userData;
  ship.position.x += u.dir * u.speed * dt;
  if (Math.abs(ship.position.x) > 420) ship.position.x = -u.dir * 420;   // vuelve a entrar por el otro lado
  ship.position.y = SEA_LEVEL - 1 + Math.sin(time * 0.6) * 0.3;
  ship.rotation.z = Math.sin(time * 0.45) * 0.015;
}


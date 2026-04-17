import * as THREE from "three";

/* =========================
   Data: NOAA SWPC plasma
========================= */
const PLASMA_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json";

async function fetchLatestPlasma() {
  const r = await fetch(PLASMA_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const table = await r.json();

  const headers = table[0];
  const rows = table.slice(1);

  for (let i = rows.length - 1; i >= 0; i--) {
    const obj = Object.fromEntries(headers.map((h, j) => [h, rows[i][j]]));
    const density = Number(obj.density);
    const speed = Number(obj.speed);
    const temperature = Number(obj.temperature);
    if (Number.isFinite(density) && Number.isFinite(speed) && Number.isFinite(temperature)) {
      return { time: obj.time_tag, density, speed, temperature };
    }
  }
  throw new Error("No valid plasma rows found.");
}

/* =========================
   Helpers
========================= */
function ema(prev, next, alpha) {
  return prev == null ? next : prev + alpha * (next - prev);
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function normLinear(x, min, max) { return clamp01((x - min) / (max - min)); }
function normLog10(x, min, max) {
  const lx = Math.log10(Math.max(x, 1));
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  return clamp01((lx - lmin) / (lmax - lmin));
}
function lerp(a, b, k) { return a + (b - a) * k; }
function rand(a, b) { return a + Math.random() * (b - a); }

/* =========================
   Palette (multi-stop)
========================= */
const TEMP_STOPS = [
  { t: 0.00, c: "#1b1035" },
  { t: 0.18, c: "#2a7fff" },
  { t: 0.36, c: "#35ffd1" },
  { t: 0.55, c: "#b6ff4a" },
  { t: 0.72, c: "#ffe66d" },
  { t: 0.86, c: "#ff7a2f" },
  { t: 1.00, c: "#ff3bd4" },
];

function colorFromStops(t, stops) {
  t = clamp01(t);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return new THREE.Color(a.c).lerp(new THREE.Color(b.c), k);
    }
  }
  return new THREE.Color(stops.at(-1).c);
}

function setLegendGradient() {
  const el = document.querySelector("#legendBar");
  if (!el) return;
  const stopsCSS = TEMP_STOPS.map(s => `${s.c} ${Math.round(s.t * 100)}%`).join(", ");
  el.style.background = `linear-gradient(90deg, ${stopsCSS})`;
}
setLegendGradient();

/* =========================
   Plasma -> controls
========================= */
function plasmaToControls(p) {
  const n = normLinear(p.density, 0, 50);
  const v = normLinear(p.speed, 250, 900);
  const t = normLog10(p.temperature, 1e4, 1e6);
  return { n, v, t };
}

/* =========================
   Three.js setup
========================= */
const canvas = document.querySelector("#viz");
if (!canvas) throw new Error('Canvas not found. Expected <canvas id="viz"></canvas>.');

const hud = document.querySelector("#hud");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#05060a");

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
camera.position.set(0, 0, 22);

/* =========================
   Band sizing: auto-fit to view (5% margin)
========================= */
const VIEW_MARGIN = 0.95; // 5% margin

let bandLength = 40; // x extent
let bandHeight = 10; // y extent
let bandDepth = 6;   // z extent (artistic)

function updateBandToFillView() {
  // visible size at z=0 plane, camera at +z looking toward origin
  const dist = camera.position.z;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const viewHeight = 2 * Math.tan(vFov / 2) * dist;
  const viewWidth = viewHeight * camera.aspect;

  bandHeight = viewHeight * VIEW_MARGIN;
  bandLength = viewWidth * VIEW_MARGIN;

  // depth proportional to view size (keeps 3D feel without huge empty space)
  bandDepth = Math.min(viewHeight, viewWidth) * 0.22;
}

function resizeToCanvas() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  updateBandToFillView();
}
new ResizeObserver(resizeToCanvas).observe(canvas);
resizeToCanvas();

/* =========================
   Particles
========================= */
const COUNT = 1600;
const positions = new Float32Array(COUNT * 3);
const speeds = new Float32Array(COUNT);
const seeds = new Float32Array(COUNT);

const colors = new Float32Array(COUNT * 3);
const colorJitter = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) colorJitter[i] = Math.random();

function respawnParticle(i, xOverride = null) {
  const x = xOverride ?? (-bandLength * 0.5);
  const y = rand(-bandHeight * 0.5, bandHeight * 0.5);
  const z = rand(-bandDepth * 0.5, bandDepth * 0.5);

  positions[3*i+0] = x;
  positions[3*i+1] = y;
  positions[3*i+2] = z;

  speeds[i] = rand(0.7, 1.3);
  seeds[i] = Math.random() * 1000;
}

function initParticles() {
  for (let i = 0; i < COUNT; i++) {
    const x = rand(-bandLength * 0.5, bandLength * 0.5);
    respawnParticle(i, x);
  }
}
initParticles();

const geom = new THREE.BufferGeometry();
geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const mat = new THREE.PointsMaterial({
  size: 0.18,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
});

const points = new THREE.Points(geom, mat);
scene.add(points);

/* =========================
   Visual mapping
========================= */
let plasmaSmooth = { density: null, speed: null, temperature: null };
let controlsSmooth = { n: 0.2, v: 0.2, t: 0.2 };

const anim = {
  drift: 0.9,
  wobble: 0.25,
};

function updateParticleColors(tempT, densityN) {
  const base = colorFromStops(tempT, TEMP_STOPS);

  scene.background = null; // transparent background

  // Per-particle: hue/lightness variance; variance tightens when density is high
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const hueWiggle = lerp(0.12, 0.06, densityN);
  const lightWiggle = lerp(0.28, 0.14, densityN);

  for (let i = 0; i < COUNT; i++) {
    const j = colorJitter[i];

    const h = (hsl.h + (j - 0.5) * hueWiggle + 1) % 1;
    const s = THREE.MathUtils.clamp(hsl.s + (j - 0.5) * 0.10, 0, 1);
    const l = THREE.MathUtils.clamp(hsl.l + (j - 0.5) * lightWiggle, 0, 1);

    const c = new THREE.Color().setHSL(h, s, l);
    colors[3*i+0] = c.r;
    colors[3*i+1] = c.g;
    colors[3*i+2] = c.b;
  }

  geom.attributes.color.needsUpdate = true;
}

function applyControls(ctrl) {
  // Density: bigger particles + slightly less wobble (feels “compact”)
  mat.size = lerp(0.14, 0.26, ctrl.n);

  // Speed: faster drift + more wobble energy
  anim.drift = lerp(0.7, 3.2, ctrl.v);
  anim.wobble = lerp(0.10, 0.65, ctrl.v);

  // Temperature: palette + per-particle variance
  updateParticleColors(ctrl.t, ctrl.n);
}

/* =========================
   Animation loop
========================= */
function tick(tms) {
  const t = tms * 0.001;

  const baseV = anim.drift * 0.06;
  const wob = anim.wobble;

  for (let i = 0; i < COUNT; i++) {
    const ix = 3*i;

    // flow left -> right
    positions[ix+0] += baseV * speeds[i];

    // turbulence
    const s = seeds[i];
    positions[ix+1] += Math.sin(t * 1.7 + s) * 0.002 * wob;
    positions[ix+2] += Math.cos(t * 1.3 + s) * 0.002 * wob;

    // keep within band bounds (band fills view)
    positions[ix+1] = THREE.MathUtils.clamp(positions[ix+1], -bandHeight * 0.5, bandHeight * 0.5);
    positions[ix+2] = THREE.MathUtils.clamp(positions[ix+2], -bandDepth * 0.5, bandDepth * 0.5);

    // recycle at right edge
    if (positions[ix+0] > bandLength * 0.5) respawnParticle(i);
  }

  geom.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* =========================
   Poll plasma every minute
========================= */
async function updateLoop() {
  try {
    const p = await fetchLatestPlasma();

    plasmaSmooth.density = ema(plasmaSmooth.density, p.density, 0.25);
    plasmaSmooth.speed = ema(plasmaSmooth.speed, p.speed, 0.25);
    plasmaSmooth.temperature = ema(plasmaSmooth.temperature, p.temperature, 0.18);

    const ctrl = plasmaToControls(plasmaSmooth);
    controlsSmooth.n = ema(controlsSmooth.n, ctrl.n, 0.2);
    controlsSmooth.v = ema(controlsSmooth.v, ctrl.v, 0.2);
    controlsSmooth.t = ema(controlsSmooth.t, ctrl.t, 0.2);

    applyControls(controlsSmooth);

    if (hud) {
      hud.textContent =
      `Solar wind plasma (NOAA SWPC, near real-time)\n` +
        `time: ${p.time}\n` +
        `density n: ${p.density.toFixed(2)}\n` +
        `speed v: ${p.speed.toFixed(0)}\n` +
        `temp T: ${p.temperature.toExponential(2)}`;
    }
  } catch (e) {
    if (hud) hud.textContent = `Plasma update failed (retrying)\n${String(e)}`;
    console.warn(e);
  } finally {
    setTimeout(updateLoop, 60_000);
  }
}
updateLoop();
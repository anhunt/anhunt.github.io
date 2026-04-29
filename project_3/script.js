import * as THREE from "three";

console.log("script.js loaded");

/* =========================
   NOAA SWPC endpoints
========================= */
const PLASMA_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json";
const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

/* =========================
   Config
========================= */
const POLL_MS = 60_000; // 1 minute
const COUNT = 1600;
const VIEW_MARGIN = 0.95;

/* =========================
   Fetch helpers
========================= */
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function fetchLatestPlasma() {
  const table = await fetchJSON(PLASMA_URL);

  if (!Array.isArray(table) || !Array.isArray(table[0])) {
    console.log("Unexpected plasma JSON format:", table);
    throw new Error("Unexpected plasma JSON format (plasma).");
  }

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

async function fetchLatestKp() {
  const data = await fetchJSON(KP_URL);

  // Case A: array-of-objects
  if (Array.isArray(data) && data.length && typeof data[0] === "object" && !Array.isArray(data[0])) {
    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      const kp = Number(row.kp ?? row.Kp ?? row.kp_index ?? row.estimated_kp);
      const time = row.time_tag ?? row.time ?? row.datetime ?? row.date ?? "unknown";
      if (Number.isFinite(kp)) return { time, kp };
    }
    throw new Error("No valid Kp rows found (object format).");
  }

  // Case B: array-of-arrays
  if (Array.isArray(data) && data.length && Array.isArray(data[0])) {
    const headers = data[0];
    const rows = data.slice(1);

    const pick = (obj, keys) => {
      for (const k of keys) if (obj[k] != null && obj[k] !== "") return obj[k];
      return null;
    };

    for (let i = rows.length - 1; i >= 0; i--) {
      const obj = Object.fromEntries(headers.map((h, j) => [h, rows[i][j]]));
      const kpRaw = pick(obj, ["kp", "Kp", "kp_index", "estimated_kp"]);
      const timeRaw = pick(obj, ["time_tag", "time", "datetime", "date"]);
      const kp = Number(kpRaw);
      if (Number.isFinite(kp)) return { time: timeRaw ?? "unknown", kp };
    }
    throw new Error("No valid Kp rows found (table format).");
  }

  console.log("Unexpected Kp JSON format:", data);
  throw new Error("Unexpected Kp JSON format (kp).");
}

/* =========================
   Math helpers
========================= */
function ema(prev, next, alpha) {
  return prev == null ? next : prev + alpha * (next - prev);
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function normLinear(x, min, max) { return clamp01((x - min) / (max - min)); }
function lerp(a, b, k) { return a + (b - a) * k; }
function rand(a, b) { return a + Math.random() * (b - a); }

/* =========================
   Time formatting (UTC)
========================= */
function formatUTC(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

/* =========================
   Disturbance level + alert (from Kp)
========================= */
function disturbanceLevel(kp) {
  if (kp >= 9) return { label: "EXTREME", alert: "!!!!!" };
  if (kp >= 7) return { label: "STRONG STORM", alert: "!!!" };
  if (kp >= 5) return { label: "MINOR STORM", alert: "!!" };
  if (kp >= 3) return { label: "UNSETTLED", alert: "!" };
  return { label: "QUIET", alert: "SECURE" };
}

/* =========================
   Deterministic tarot-ish reading (metaphorical)
========================= */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickDeterministic(list, seed) {
  return list[seed % list.length];
}

function tarotReading({ v01, n01, t01, kp }) {
  const { label } = disturbanceLevel(kp);

  const windLow = [
    "The current moves like a slow river behind glass.",
    "A gentle drift suggests patience wins today.",
    "The air is quiet; small choices echo loudly.",
  ];
  const windMid = [
    "The current is awake—steady, watchful, and moving.",
    "Momentum builds in the background; follow the easiest path.",
    "The flow is confident. Don’t force it—ride it.",
  ];
  const windHigh = [
    "The current is restless—fast, sharp, and impossible to ignore.",
    "Everything accelerates. Say yes only to what can keep up.",
    "The wind is loud. Let it carry the brave plan forward.",
  ];

  const densLow = [
    "Space feels spacious: leave room for surprises.",
    "Less clutter means clearer signals.",
    "Empty pockets make the best inventory slots.",
  ];
  const densMid = [
    "The field is populated: collaboration beats solo grinding.",
    "You’re not alone in the stream—watch for patterns.",
    "Enough particles to make meaning, not noise.",
  ];
  const densHigh = [
    "The lane is crowded: boundaries are your shield.",
    "High density: choose one quest, ignore the side chatter.",
    "Compression brings focus—keep it simple and strong.",
  ];

  const tempLow = [
    "Cool tones: intuition whispers instead of shouting.",
    "The palette stays subtle—listen for the quiet yes.",
    "Cold light favors careful timing.",
  ];
  const tempMid = [
    "Warm glow: your instincts are readable and steady.",
    "Color shifts gently—adjust, don’t restart.",
    "Balanced heat: consistency becomes a superpower.",
  ];
  const tempHigh = [
    "Hot chroma: creativity runs bright and slightly feral.",
    "The colors flare—make something bold on purpose.",
    "High heat: channel energy into one clean move.",
  ];

  const kpQuiet = [
    "Disturbance is quiet: the universe is in low-power mode.",
    "Quiet field: your plan can be boring—and still work.",
    "Quiet skies: maintenance tasks succeed.",
  ];
  const kpUnsettled = [
    "Disturbance is unsettled: expect mild plot twists.",
    "Unsettled field: keep your schedule flexible.",
    "Unsettled skies: small glitches, easy fixes.",
  ];
  const kpMinor = [
    "Disturbance is minor storm: momentum comes with static.",
    "Minor storm: protect your focus like a rare item.",
    "Minor storm: bold moves work, but cost stamina.",
  ];
  const kpStrong = [
    "Disturbance is strong storm: the map is changing underfoot.",
    "Strong storm: take the shortcut, not the detour.",
    "Strong storm: verify once, then commit.",
  ];
  const kpExtreme = [
    "Disturbance is extreme: reality is in glitch-art mode.",
    "Extreme field: don’t multitask—pick one boss and finish it.",
    "Extreme storm: chaos is a ladder, if you climb carefully.",
  ];

  const windSet = v01 < 0.33 ? windLow : v01 < 0.66 ? windMid : windHigh;
  const densSet = n01 < 0.33 ? densLow : n01 < 0.66 ? densMid : densHigh;
  const tempSet = t01 < 0.33 ? tempLow : t01 < 0.66 ? tempMid : tempHigh;

  const kpSet =
    label === "QUIET" ? kpQuiet :
    label === "UNSETTLED" ? kpUnsettled :
    label === "MINOR STORM" ? kpMinor :
    label === "STRONG STORM" ? kpStrong :
    kpExtreme;

  const seedBase = `${Math.round(v01*100)}|${Math.round(n01*100)}|${Math.round(t01*100)}|${Math.round(kp*10)}`;
  const seed = hashString(seedBase);

  const s1 = pickDeterministic(windSet, seed);
  const s2 = pickDeterministic(densSet, seed >>> 1);
  const s3 = pickDeterministic(kpSet, seed >>> 2);

  return `${s1} ${s2} ${s3}`;
}

/* =========================
   DOM
========================= */
const canvas = document.querySelector("#viz");
if (!canvas) throw new Error('Canvas not found. Expected <canvas id="viz"></canvas>.');

const aboutBtn = document.querySelector("#aboutBtn");
const aboutModal = document.querySelector("#aboutModal");

const forecastDate = document.querySelector("#forecastDate");
const forecastAlert = document.querySelector("#forecastAlert");
const forecastReading = document.querySelector("#forecastReading");

const hudPlasma = document.querySelector("#hudPlasma");
const hudKp = document.querySelector("#hudKp");

console.log("DOM check:", {
  forecastDate: !!forecastDate,
  forecastAlert: !!forecastAlert,
  forecastReading: !!forecastReading,
  hudPlasma: !!hudPlasma,
  hudKp: !!hudKp,
  viz: !!canvas
});

/* =========================
   About modal behavior
========================= */
function openModal() {
  if (!aboutModal) return;
  aboutModal.hidden = false;
  const close = aboutModal.querySelector("[data-close]");
  if (close) close.focus();
}
function closeModal() {
  if (!aboutModal) return;
  aboutModal.hidden = true;
  if (aboutBtn) aboutBtn.focus();
}

if (aboutBtn && aboutModal) {
  aboutBtn.addEventListener("click", openModal);
  aboutModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !aboutModal.hidden) closeModal();
  });
}

/* =========================
   Three.js setup
========================= */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
camera.position.set(0, 0, 22);

/* =========================
   Band sizing: auto-fit to view
========================= */
let bandLength = 40;
let bandHeight = 10;
let bandDepth = 6;

function updateBandToFillView() {
  const dist = camera.position.z;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const viewHeight = 2 * Math.tan(vFov / 2) * dist;
  const viewWidth = viewHeight * camera.aspect;

  bandHeight = viewHeight * VIEW_MARGIN;
  bandLength = viewWidth * VIEW_MARGIN;
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
   Particle state
========================= */
const px = new Float32Array(COUNT);
const py = new Float32Array(COUNT);
const pz = new Float32Array(COUNT);
const speedMul = new Float32Array(COUNT);
const seed = new Float32Array(COUNT);
const colorJitter = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  speedMul[i] = rand(0.7, 1.3);
  seed[i] = Math.random() * 1000;
  colorJitter[i] = Math.random();
}

function respawn(i, xOverride = null) {
  px[i] = xOverride ?? (-bandLength * 0.5);
  py[i] = rand(-bandHeight * 0.5, bandHeight * 0.5);
  pz[i] = rand(-bandDepth * 0.5, bandDepth * 0.5);
}

for (let i = 0; i < COUNT; i++) {
  respawn(i, rand(-bandLength * 0.5, bandLength * 0.5));
}

/* =========================
   LineSegments geometry
========================= */
const linePositions = new Float32Array(COUNT * 2 * 3);
const lineColors = new Float32Array(COUNT * 2 * 3);

const geom = new THREE.BufferGeometry();
geom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
geom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

const lineMat = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
});

scene.add(new THREE.LineSegments(geom, lineMat));

/* =========================
   Visual mapping state
========================= */
let plasmaSmooth = { density: null, speed: null, temperature: null };
let kpSmooth = { kp: null };

let ctrl = { n: 0.2, v: 0.2, t: 0.5 };
const anim = { drift: 1.2, wobble: 0.08, streakLen: 1.0 };

function updateControlsFromPlasma(p) {
  const n = normLinear(p.density, 0, 50);
  const v = normLinear(p.speed, 250, 900);

  // tighter temp mapping so it changes more
  const t = clamp01((Math.log10(p.temperature) - Math.log10(8e4)) / (Math.log10(8e5) - Math.log10(8e4)));

  ctrl.n = ema(ctrl.n, n, 0.25);
  ctrl.v = ema(ctrl.v, v, 0.25);
  ctrl.t = ema(ctrl.t, t, 0.25);

  anim.drift = lerp(2.0, 7.0, ctrl.v);
  anim.wobble = lerp(0.02, 0.35, ctrl.v);
  anim.streakLen = lerp(0.8, 3.5, ctrl.v) * lerp(0.9, 1.2, ctrl.n);
}

function writeUI(p, k) {
  if (hudPlasma) {
    hudPlasma.textContent =
      `density: ${p.density.toFixed(2)} cm^-3\n` +
      `speed:   ${p.speed.toFixed(0)} km/s\n` +
      `temp:    ${p.temperature.toExponential(2)} K`;
  }

  if (hudKp) {
    const d = disturbanceLevel(k.kp);
    hudKp.textContent =
      `kp: ${k.kp.toFixed(1)}\n` +
      `disturbance: ${d.label}`;
  }

  if (forecastDate) forecastDate.textContent = formatUTC(p.time);
  if (forecastAlert) forecastAlert.textContent = disturbanceLevel(k.kp).alert;

  if (forecastReading) {
    forecastReading.textContent = tarotReading({ v01: ctrl.v, n01: ctrl.n, t01: ctrl.t, kp: k.kp });
  }
}

/* =========================
   Animation loop
========================= */
function tick(tms) {
  const t = tms * 0.001;

  const baseV = anim.drift * 0.06;
  const wob = anim.wobble;

  const hue = lerp(0.10, 0.98, ctrl.t);
  const sat = lerp(0.55, 0.98, ctrl.t);
  const lit = lerp(0.40, 0.72, ctrl.t);

  const hueWiggle = lerp(0.12, 0.06, ctrl.n);
  const litWiggle = lerp(0.22, 0.12, ctrl.n);

   for (let i = 0; i < COUNT; i++) {
    // Move particle
    px[i] += baseV * speedMul[i];

    // Gentle turbulence
    const s = seed[i];
    py[i] += Math.sin(t * 0.7 + s) * 0.002 * wob;
    pz[i] += Math.cos(t * 0.6 + s) * 0.002 * wob;

    // Keep within band bounds
    py[i] = THREE.MathUtils.clamp(py[i], -bandHeight * 0.5, bandHeight * 0.5);
    pz[i] = THREE.MathUtils.clamp(pz[i], -bandDepth * 0.5, bandDepth * 0.5);

    // Recycle when exiting right edge
    if (px[i] > bandLength * 0.5) respawn(i);

    // Streak length: global + per-particle variance
    const L = anim.streakLen * lerp(0.7, 1.3, speedMul[i]);

    // Segment endpoints
    const x0 = px[i], y0 = py[i], z0 = pz[i];
    const x1 = x0 - L, y1 = y0, z1 = z0;

    const base = i * 6;

    // positions
    linePositions[base + 0] = x0;
    linePositions[base + 1] = y0;
    linePositions[base + 2] = z0;
    linePositions[base + 3] = x1;
    linePositions[base + 4] = y1;
    linePositions[base + 5] = z1;

    // color (same for both endpoints)
    const j = colorJitter[i];
    const h = (hue + (j - 0.5) * hueWiggle + 1) % 1;
    const s2 = THREE.MathUtils.clamp(sat + (j - 0.5) * 0.12, 0, 1);
    const l2 = THREE.MathUtils.clamp(lit + (j - 0.5) * litWiggle, 0, 1);

    const c = new THREE.Color().setHSL(h, s2, l2);

    lineColors[base + 0] = c.r;
    lineColors[base + 1] = c.g;
    lineColors[base + 2] = c.b;
    lineColors[base + 3] = c.r;
    lineColors[base + 4] = c.g;
    lineColors[base + 5] = c.b;
  }

  geom.attributes.position.needsUpdate = true;
  geom.attributes.color.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* =========================
   Poll loop (visible errors)
========================= */
async function updateLoop() {
  try {
    if (forecastReading) forecastReading.textContent = "Updating…";

    const [p, k] = await Promise.all([fetchLatestPlasma(), fetchLatestKp()]);

    // Smooth raw values a bit
    plasmaSmooth.density = ema(plasmaSmooth.density, p.density, 0.25);
    plasmaSmooth.speed = ema(plasmaSmooth.speed, p.speed, 0.25);
    plasmaSmooth.temperature = ema(plasmaSmooth.temperature, p.temperature, 0.25);
    kpSmooth.kp = ema(kpSmooth.kp, k.kp, 0.35);

    // Update controls + derived animation params
    updateControlsFromPlasma(plasmaSmooth);

    // Write UI (use smoothed kp for stability)
    writeUI(
      {...p, density: plasmaSmooth.density, speed: plasmaSmooth.speed, temperature: plasmaSmooth.temperature },
      {...k, kp: kpSmooth.kp ?? k.kp }
    );
  } catch (e) {
    const msg = `Update failed: ${String(e)}`;
    console.warn(e);

    if (forecastReading) forecastReading.textContent = msg;
    if (hudPlasma) hudPlasma.textContent = msg;
    if (hudKp) hudKp.textContent = msg;
    if (forecastDate) forecastDate.textContent = "—";
    if (forecastAlert) forecastAlert.textContent = "—";
  } finally {
    setTimeout(updateLoop, POLL_MS);
  }
}

console.log("starting updateLoop");
updateLoop();
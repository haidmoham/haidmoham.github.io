import loadMujoco from './vendor/mujoco/mujoco.js';

const root = document.querySelector('[data-spider-artifact]');
const canvas = root.querySelector('[data-spider-canvas]');
const context = canvas.getContext('2d');
const playButton = root.querySelector('[data-play]');
const resetButton = root.querySelector('[data-reset]');
const status = root.querySelector('[data-status]');
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FOOT_NAMES = ['front_left', 'front_right', 'middle_left', 'middle_right', 'rear_left', 'rear_right'];
const TRIPOD_A = new Set([0, 3, 4]);
const COLORS = ['#7daeff', '#3d8bff', '#92c7ff', '#4d82d0', '#b5d7ff', '#6aa5eb'];
const STEP_SECONDS = 0.002;
const MAX_FRAME_SECONDS = 0.05;

let mujoco;
let model;
let data;
let bodyAccessors;
let footAccessors;
let groundGeomId;
let footGeomIds;
let animation;
let previousWallTime;
let accumulator = 0;
let phase = 0;
let lastSimulationTime = 0;
let running = false;

function readout(name) {
  return root.querySelector(`[data-${name}]`);
}

function smoothstep(value) {
  const bounded = Math.max(0, Math.min(1, value));
  return bounded * bounded * (3 - 2 * bounded);
}

function gaitTarget(currentPhase, leg) {
  const offset = TRIPOD_A.has(leg) ? 0 : 0.5;
  const cycle = (currentPhase + offset) % 1;
  if (cycle < 0.5) {
    const progress = cycle / 0.5;
    return [0.32 * (2 * smoothstep(progress) - 1), 0.8];
  }
  const progress = (cycle - 0.5) / 0.5;
  return [0.32 * (1 - 2 * smoothstep(progress)), 0.8 - 0.55 * Math.sin(Math.PI * progress)];
}

function contactStates() {
  const contacts = Array(FOOT_NAMES.length).fill(false);
  const contactVector = data.contact;
  try {
    for (let index = 0; index < contactVector.size(); index += 1) {
      const contact = contactVector.get(index);
      const otherGeom = contact.geom1 === groundGeomId ? contact.geom2 : contact.geom2 === groundGeomId ? contact.geom1 : -1;
      const foot = footGeomIds.indexOf(otherGeom);
      if (foot !== -1) contacts[foot] = true;
      contact.delete();
    }
  } finally {
    contactVector.delete();
  }
  return contacts;
}

function bodyErrors() {
  const w = data.qpos[3], x = data.qpos[4], y = data.qpos[5], z = data.qpos[6];
  // MuJoCo's body-frame gravity is R^T * [0, 0, -9.81]. Only the
  // third row of the body-to-world rotation contributes here.
  const r20 = 2 * (x * z - y * w);
  const r21 = 2 * (y * z + x * w);
  const r22 = 1 - 2 * (x * x + y * y);
  const gravityX = -9.81 * r20;
  const gravityY = -9.81 * r21;
  const gravityZ = -9.81 * r22;
  return [
    Math.atan2(gravityY, -gravityZ),
    Math.atan2(-gravityX, -gravityZ),
    data.qvel[3],
    data.qvel[4],
  ];
}

function applyGaitControl() {
  const contacts = contactStates();
  const simulationTime = data.time;
  const starting = simulationTime < 1.0;
  const expectedStance = FOOT_NAMES.map((_, leg) => starting || ((phase + (TRIPOD_A.has(leg) ? 0 : 0.5)) % 1) < 0.5);
  const deltaTime = Math.max(0, simulationTime - lastSimulationTime);
  lastSimulationTime = simulationTime;
  if (!starting) phase = (phase + 0.65 * deltaTime) % 1;

  const [roll, pitch, rollRate, pitchRate] = bodyErrors();
  for (let leg = 0; leg < FOOT_NAMES.length; leg += 1) {
    let [hip, knee] = starting ? [0, 0.8] : gaitTarget(phase, leg);
    const side = leg % 2 === 0 ? 1 : -1;
    const foreAft = leg < 2 ? 1 : leg >= 4 ? -1 : 0;
    hip += -0.10 * pitch - 0.01 * pitchRate * foreAft;
    knee += 0.06 * (pitch * foreAft + roll * side);
    if (expectedStance[leg] && !contacts[leg]) knee += 0.08;
    if (!expectedStance[leg] && contacts[leg]) knee -= 0.08;
    data.ctrl[2 * leg] = Math.max(-0.8, Math.min(0.8, hip));
    data.ctrl[2 * leg + 1] = Math.max(-1.4, Math.min(1.4, knee));
  }
  return { contacts, roll, pitch };
}

function setStandingPose() {
  data.qpos.set([0, 0, 0.5, 1, 0, 0, 0]);
  for (let leg = 0; leg < FOOT_NAMES.length; leg += 1) {
    data.qpos[7 + 2 * leg] = 0;
    data.qpos[7 + 2 * leg + 1] = 0.8;
    data.ctrl[2 * leg] = 0;
    data.ctrl[2 * leg + 1] = 0.8;
  }
  mujoco.mj_forward(model, data);
}

function point(position, camera) {
  return {
    x: 55 + (position[0] - camera.minX) / (camera.maxX - camera.minX) * (canvas.width - 110),
    y: canvas.height - 55 - (position[2] - camera.minZ) / (camera.maxZ - camera.minZ) * (canvas.height - 110),
  };
}

function drawLine(a, b, color, width) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
}

function draw(contacts) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111926';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(125,174,255,.12)';
  context.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 45) drawLine({ x, y: 0 }, { x, y: canvas.height }, 'rgba(125,174,255,.12)', 1);
  for (let y = 0; y < canvas.height; y += 45) drawLine({ x: 0, y }, { x: canvas.width, y }, 'rgba(125,174,255,.12)', 1);

  const torso = bodyAccessors.torso.xpos;
  const camera = { minX: torso[0] - 0.55, maxX: torso[0] + 0.55, minZ: 0, maxZ: 0.74 };
  const ground = point([0, 0, 0], camera).y;
  drawLine({ x: 0, y: ground }, { x: canvas.width, y: ground }, 'rgba(233,237,243,.35)', 2);
  const torsoPoint = point(torso, camera);

  FOOT_NAMES.forEach((name, index) => {
    const hip = point(bodyAccessors[name].xpos, camera);
    const knee = point(bodyAccessors[`${name}_shin`].xpos, camera);
    const foot = point(footAccessors[name].xpos, camera);
    drawLine(torsoPoint, hip, COLORS[index], 5);
    drawLine(hip, knee, COLORS[index], 5);
    drawLine(knee, foot, COLORS[index], 4);
    context.fillStyle = contacts[index] ? '#f6d365' : COLORS[index];
    context.beginPath();
    context.arc(foot.x, foot.y, contacts[index] ? 7 : 5, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = '#eef5ff';
  context.fillRect(torsoPoint.x - 28, torsoPoint.y - 15, 56, 30);
  context.strokeStyle = '#3d8bff';
  context.lineWidth = 3;
  context.strokeRect(torsoPoint.x - 28, torsoPoint.y - 15, 56, 30);
  context.fillStyle = '#9ba9bc';
  context.font = '14px JetBrains Mono, monospace';
  context.fillText('live MuJoCo WebAssembly', 20, 30);
  context.fillText('yellow = physical contact', 20, 52);
}

function updateReadout(state) {
  readout('time').textContent = `${data.time.toFixed(2)} s`;
  readout('x').textContent = `${data.qpos[0].toFixed(3)} m`;
  readout('z').textContent = `${data.qpos[2].toFixed(3)} m`;
  readout('contacts').textContent = `${state.contacts.filter(Boolean).length} / 6`;
  readout('attitude').textContent = `${state.roll.toFixed(3)} / ${state.pitch.toFixed(3)} rad`;
  readout('torque').textContent = `${data.qfrc_actuator[0].toFixed(3)} N·m`;
}

function render() {
  const state = applyGaitControl();
  draw(state.contacts);
  updateReadout(state);
}

function restart() {
  releaseAccessors();
  if (data) data.delete();
  data = new mujoco.MjData(model);
  phase = 0;
  lastSimulationTime = 0;
  accumulator = 0;
  setStandingPose();
  cacheAccessors();
  render();
}

function stop() {
  running = false;
  playButton.textContent = 'Resume';
  playButton.setAttribute('aria-pressed', 'false');
}

function frame(now) {
  if (!running) return;
  const elapsed = Math.min((now - previousWallTime) / 1000, MAX_FRAME_SECONDS);
  previousWallTime = now;
  accumulator += elapsed;
  while (accumulator >= STEP_SECONDS) {
    applyGaitControl();
    mujoco.mj_step(model, data);
    accumulator -= STEP_SECONDS;
  }
  render();
  animation = requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  previousWallTime = performance.now();
  playButton.textContent = 'Pause';
  playButton.setAttribute('aria-pressed', 'true');
  animation = requestAnimationFrame(frame);
}

function toggle() {
  if (running) stop(); else start();
}

function releaseAccessors() {
  if (bodyAccessors) Object.values(bodyAccessors).forEach((accessor) => accessor.delete());
  if (footAccessors) Object.values(footAccessors).forEach((accessor) => accessor.delete());
  bodyAccessors = undefined;
  footAccessors = undefined;
}

function cacheAccessors() {
  bodyAccessors = {};
  ['torso', ...FOOT_NAMES, ...FOOT_NAMES.map((name) => `${name}_shin`)].forEach((name) => {
    bodyAccessors[name] = data.body(name);
  });
  footAccessors = {};
  FOOT_NAMES.forEach((name) => {
    footAccessors[name] = data.geom(`${name}_foot`);
  });
}

async function initialise() {
  try {
    const [loadedMujoco, modelXml, manifest] = await Promise.all([
      loadMujoco(),
      fetch('./model/spider.xml').then((response) => {
        if (!response.ok) throw new Error('The Spider model could not load.');
        return response.text();
      }),
      fetch('./manifest.json').then((response) => {
        if (!response.ok) throw new Error('The Spider release manifest could not load.');
        return response.json();
      }),
    ]);
    mujoco = loadedMujoco;
    model = mujoco.MjModel.from_xml_string(modelXml);
    const ground = model.geom('ground');
    groundGeomId = ground.id;
    ground.delete();
    footGeomIds = FOOT_NAMES.map((name) => {
      const geom = model.geom(`${name}_foot`);
      const id = geom.id;
      geom.delete();
      return id;
    });
    restart();
    status.textContent = `Live · ${manifest.release} · MuJoCo ${mujoco.mj_versionString()} · ${manifest.spider_commit.slice(0, 8)}`;
    playButton.disabled = false;
    resetButton.disabled = false;
    playButton.textContent = reducedMotion ? 'Start simulation' : 'Pause';
    playButton.addEventListener('click', toggle);
    resetButton.addEventListener('click', restart);
    if (!reducedMotion) start();
  } catch (error) {
    status.textContent = 'Live simulation unavailable';
    root.querySelector('.spider-stage').innerHTML = `<p class="explorer-error">${error.message} See the canonical Spider repository for the native simulation.</p>`;
  }
}

window.addEventListener('pagehide', () => {
  if (animation) cancelAnimationFrame(animation);
  if (data) data.delete();
  releaseAccessors();
  if (model) model.delete();
});

initialise();

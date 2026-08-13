import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import loadMujoco from './vendor/mujoco/mujoco.js';

const root = document.querySelector('[data-spider-artifact]');
const stage = root.querySelector('[data-spider-stage]');
const canvas = root.querySelector('[data-spider-canvas]');
const playButton = root.querySelector('[data-play]');
const resetButton = root.querySelector('[data-reset]');
const cameraResetButton = root.querySelector('[data-camera-reset]');
const cameraFollowButton = root.querySelector('[data-camera-follow]');
const releaseSelect = root.querySelector('[data-release-select]');
const releaseDescription = root.querySelector('[data-release-description]');
const status = root.querySelector('[data-status]');
const perturbationSection = root.querySelector('[data-perturbation-section]');
const perturbationGrid = root.querySelector('[data-perturbation-grid]');
const perturbationCurrent = root.querySelector('[data-perturbation-current]');
const perturbationControls = root.querySelector('[data-perturbation-controls]');
const perturbationMagnitude = root.querySelector('[data-perturbation-magnitude]');
const perturbationDirection = root.querySelector('[data-perturbation-direction]');
const perturbationRun = root.querySelector('[data-perturbation-run]');
const modelMassReadout = root.querySelector('[data-model-mass]');
const modelGravityReadout = root.querySelector('[data-model-gravity]');
const perturbationForceReadout = root.querySelector('[data-perturbation-force]');
const chartCanvases = Object.fromEntries([...root.querySelectorAll('[data-chart]')].map((chart) => [chart.dataset.chart, chart]));
const glyphCanvases = Object.fromEntries([...root.querySelectorAll('[data-glyph]')].map((glyph) => [glyph.dataset.glyph, glyph]));
const glyphValues = Object.fromEntries([...root.querySelectorAll('[data-glyph-value]')].map((value) => [value.dataset.glyphValue, value]));
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FOOT_NAMES = ['front_left', 'front_right', 'middle_left', 'middle_right', 'rear_left', 'rear_right'];
const TRIPOD_A = new Set([0, 3, 4]);
const RELEASES = {
  'v0.0': {
    label: 'C-1N // 00 · SPAWN',
    model: './model/spider.xml',
    source: '47664909',
    description: 'Historical playback: the era’s locomotion controller runs against the SPAWN-era model. The checkpoint itself records only the deterministic spawn baseline.',
  },
  'v0.1': {
    label: 'C-1N // 01 · SHUFFLE',
    model: './model/shuffle.xml',
    source: '79033cd',
    description: 'Archived playback: the canonical 0.65 Hz shared-phase gait remains available only in this SHUFFLE checkpoint. Motion remains uncontrolled.',
  },
  'v0.2': {
    label: 'C-1N // 02 · STAND',
    model: './model/stand.xml',
    source: 'ccc115d',
    description: 'Current playback: this simplified visual controller uses torso attitude and all-six-foot contact to make bounded stance corrections that help C-1N remain vertical. It illustrates a closed loop; it does not reproduce the native controller or recover a lost contact or a 1 mg shove.',
  },
};
const STAND_TARGETS = Array.from({ length: 6 }, () => [0, -0.2, 1.1]).flat();
const PULSE_SECONDS = 0.2;
const OBSERVATION_SECONDS = 1;
const PERTURBATION_CASE_SECONDS = PULSE_SECONDS + OBSERVATION_SECONDS;
const PERTURBATION_CASES = [
  { magnitude: 0, angle: 0, label: '0 mg · control', shortLabel: '0 mg', state: 'control' },
  ...[0.25, 0.5, 0.75, 1].flatMap((magnitude) => Array.from({ length: 8 }, (_, index) => {
    const angle = index * 45;
    return {
      magnitude,
      angle,
      label: `${magnitude} mg · ${String(angle).padStart(3, '0')}°`,
      shortLabel: `${magnitude} mg · ${String(angle).padStart(3, '0')}°`,
      state: magnitude === 1 ? 'frontier-failure' : 'treatment',
    };
  })),
];
const COLORS = Array(6).fill('#7a8280');
const FOOT_COLOR = '#d90508';
const EYE_RADIUS = 0.05;
const PUPIL_RADIUS = 0.019;
const PUPIL_LIMIT = 0.025;
const PUPIL_RESTITUTION = 0.35;
const PUPIL_CONFIG = [
  { rest: new THREE.Vector2(-0.007, 0.003), stiffness: 68, damping: 6.5, splay: 1 },
  { rest: new THREE.Vector2(0.007, -0.002), stiffness: 84, damping: 7.5, splay: -1 },
];
const STEP_SECONDS = 0.002;
const MAX_FRAME_SECONDS = 0.05;
const TELEMETRY_WINDOW_SECONDS = 20;
const TELEMETRY_SAMPLE_SECONDS = 0.05;
const CHART_SURFACE = '#f2f5f8';
const CHART_GRID = 'rgba(47,105,173,.16)';
const CHART_AXIS = 'rgba(33,75,120,.38)';
const GLYPH_BASELINE = 'rgba(33,75,120,.5)';
const CHART_TEXT = '#4d6884';
const CHART_BLUE = '#2f69ad';
const CHART_INK = '#214b78';
const CHART_RED = '#b5433f';
const CAMERA_POSITION = new THREE.Vector3(1.1, -1.25, 0.92);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0.22);
const LOCAL_Y = new THREE.Vector3(0, 1, 0);

let mujoco;
let model;
let data;
let bodyAccessors;
let footAccessors;
let groundGeomId;
let footGeomIds;
let torsoBodyId;
let animation;
let previousWallTime;
let accumulator = 0;
let phase = 0;
let lastSimulationTime = 0;
let running = false;
let renderer;
let scene;
let camera;
let controls;
let resizeObserver;
let robotVisual;
let cameraFollow = false;
let telemetryHistory = [];
let lastTelemetrySampleTime = -Infinity;
let currentRelease = 'v0.2';
let currentPerturbationIndex = 0;
let perturbationPulse = { force: [0, 0, 0], startsAt: Infinity, remainingSteps: 0 };
let standRunMode = 'idle';
let perturbationControlsBound = false;
let pupilDynamics;

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
  const [w, x, y, z] = [data.qpos[3], data.qpos[4], data.qpos[5], data.qpos[6]];
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
  const starting = data.time < 1.0;
  const expectedStance = FOOT_NAMES.map((_, leg) => starting || ((phase + (TRIPOD_A.has(leg) ? 0 : 0.5)) % 1) < 0.5);
  const deltaTime = Math.max(0, data.time - lastSimulationTime);
  lastSimulationTime = data.time;
  if (!starting) phase = (phase + 0.65 * deltaTime) % 1;
  const [roll, pitch, rollRate, pitchRate] = bodyErrors();
  for (let leg = 0; leg < FOOT_NAMES.length; leg += 1) {
    let [hip, knee] = starting ? [0, 0.8] : gaitTarget(phase, leg);
    if (!starting && currentRelease === 'v0.1') hip = -hip;
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

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(upper, value));
}

function applyStandControl() {
  const contacts = contactStates();
  const [roll, pitch, rollRate, pitchRate] = bodyErrors();
  const supportReady = contacts.every(Boolean);
  for (let leg = 0; leg < FOOT_NAMES.length; leg += 1) {
    const base = 3 * leg;
    const side = leg % 2 === 0 ? 1 : -1;
    const foreAft = leg < 2 ? 1 : leg >= 4 ? -1 : 0;
    if (!supportReady) {
      data.ctrl[base] = STAND_TARGETS[base];
      data.ctrl[base + 1] = STAND_TARGETS[base + 1];
      data.ctrl[base + 2] = STAND_TARGETS[base + 2];
      continue;
    }
    // Simplified visual controller: measured attitude adjusts bounded targets
    // only while every foot remains declared in contact. It illustrates the
    // closed-loop idea; it does not reproduce the native controller or recover
    // a lost contact or shove.
    data.ctrl[base] = clamp(0.07 * (roll * side + 0.12 * rollRate * side), -0.8, 0.8);
    data.ctrl[base + 1] = clamp(-0.2 - 0.12 * (pitch * foreAft + 0.12 * pitchRate * foreAft), -0.8, 0.8);
    data.ctrl[base + 2] = clamp(1.1 + 0.07 * (pitch * foreAft + roll * side), -1.4, 1.4);
  }
  return { contacts, roll, pitch };
}

function applyReleaseControl() {
  if (currentRelease === 'v0.2') return applyStandControl();
  if (currentRelease === 'v0.0') return { contacts: contactStates(), roll: 0, pitch: 0 };
  return applyGaitControl();
}

function setReleasePose() {
  const targets = currentRelease === 'v0.2' ? STAND_TARGETS : Array.from({ length: 6 }, () => [0, 0.8]).flat();
  const jointCount = currentRelease === 'v0.2' ? 3 : 2;
  data.qpos.set([0, 0, currentRelease === 'v0.2' ? 0.45 : 0.5, 1, 0, 0, 0]);
  for (let leg = 0; leg < FOOT_NAMES.length; leg += 1) {
    for (let joint = 0; joint < jointCount; joint += 1) {
      const index = jointCount * leg + joint;
      data.qpos[7 + index] = targets[index];
      data.ctrl[index] = targets[index];
    }
  }
  mujoco.mj_forward(model, data);
}

function currentPerturbationCase() {
  return PERTURBATION_CASES[currentPerturbationIndex];
}

function clearPerturbationPulse() {
  perturbationPulse = { force: [0, 0, 0], startsAt: Infinity, remainingSteps: 0 };
  if (!data || torsoBodyId === undefined) return;
  const offset = torsoBodyId * 6;
  data.xfrc_applied[offset] = 0;
  data.xfrc_applied[offset + 1] = 0;
  data.xfrc_applied[offset + 2] = 0;
}

function schedulePerturbationPulse() {
  clearPerturbationPulse();
  if (currentRelease !== 'v0.2') return;
  const perturbation = currentPerturbationCase();
  if (!perturbation || perturbation.magnitude === 0) return;
  const forceMagnitudeN = perturbationForceNewtons(perturbation);
  const angleRadians = perturbation.angle * Math.PI / 180;
  perturbationPulse = {
    force: [forceMagnitudeN * Math.cos(angleRadians), forceMagnitudeN * Math.sin(angleRadians), 0],
    startsAt: data.time,
    remainingSteps: Math.max(1, Math.round(PULSE_SECONDS / model.opt.timestep)),
  };
}

function perturbationForceNewtons(perturbation) {
  if (!model || !perturbation || perturbation.magnitude === 0) return 0;
  return perturbation.magnitude * totalRobotMassKg() * currentGravityMagnitude();
}

function totalRobotMassKg() {
  if (!model) return 0;
  return Array.from(model.body_mass).slice(1).reduce((sum, mass) => sum + mass, 0);
}

function currentGravityMagnitude() {
  return model ? Math.abs(model.opt.gravity[2]) : 0;
}

function updateModelConstants() {
  if (modelMassReadout) modelMassReadout.textContent = `${totalRobotMassKg().toFixed(3)} kg`;
  if (modelGravityReadout) modelGravityReadout.textContent = `${currentGravityMagnitude().toFixed(3)} m/s²`;
}

function applyPerturbationPulse() {
  if (torsoBodyId === undefined) return;
  const offset = torsoBodyId * 6;
  const force = perturbationPulse.remainingSteps && data.time >= perturbationPulse.startsAt ? perturbationPulse.force : [0, 0, 0];
  data.xfrc_applied[offset] = force[0];
  data.xfrc_applied[offset + 1] = force[1];
  data.xfrc_applied[offset + 2] = force[2];
}

function completePerturbationStep() {
  if (!perturbationPulse.remainingSteps || data.time < perturbationPulse.startsAt) return;
  perturbationPulse.remainingSteps -= 1;
  if (!perturbationPulse.remainingSteps) clearPerturbationPulse();
}

function perturbationIndexFor(magnitude, angle) {
  if (magnitude === 0) return 0;
  return 1 + [0.25, 0.5, 0.75, 1].indexOf(magnitude) * 8 + angle / 45;
}

function setupPerturbationControls() {
  if (!perturbationControls || !perturbationMagnitude || !perturbationDirection || !perturbationRun) return;
  perturbationMagnitude.disabled = false;
  perturbationDirection.disabled = false;
  perturbationRun.disabled = false;
  if (perturbationControlsBound) return;
  perturbationMagnitude.addEventListener('change', () => {
    perturbationDirection.disabled = Number(perturbationMagnitude.value) === 0;
  });
  perturbationRun.addEventListener('click', runSelectedPerturbationCase);
  perturbationControlsBound = true;
}

function renderPerturbationGrid() {
  if (!perturbationSection || !perturbationGrid || !perturbationCurrent) return;
  const visible = currentRelease === 'v0.2';
  perturbationSection.hidden = !visible;
  if (!visible) {
    if (perturbationForceReadout) perturbationForceReadout.textContent = 'Current shove: STAND perturbation suite is unavailable in this checkpoint.';
    return;
  }
  setupPerturbationControls();
  const active = currentPerturbationCase();
  const runLabel = standRunMode === 'suite' ? 'STAND suite' : standRunMode === 'selected' ? 'selected case' : 'viewing case';
  const forceReadout = active.magnitude
    ? ` · current force ${perturbationForceNewtons(active).toFixed(3)} N · bearing ${String(active.angle).padStart(3, '0')}° · shove fires at reset for 200 ms · 1 s observation`
    : ' · current force 0.000 N · control, no shove';
  perturbationCurrent.textContent = `${runLabel} · case ${currentPerturbationIndex + 1} / ${PERTURBATION_CASES.length}: ${active.label}${forceReadout}${active.state === 'frontier-failure' ? ' · current failure frontier' : ''}`;
  if (perturbationForceReadout) {
    perturbationForceReadout.textContent = active.magnitude
      ? `Current shove: ${perturbationForceNewtons(active).toFixed(3)} N = ${active.magnitude} × ${totalRobotMassKg().toFixed(3)} kg × ${currentGravityMagnitude().toFixed(3)} m/s²`
      : 'Current shove: 0.000 N = control case (no applied force)';
  }
  if (perturbationMagnitude) perturbationMagnitude.value = String(active.magnitude);
  if (perturbationDirection) {
    perturbationDirection.value = String(active.angle);
    perturbationDirection.disabled = active.magnitude === 0;
  }
  perturbationGrid.replaceChildren(...PERTURBATION_CASES.map((perturbation, index) => {
    const cell = document.createElement('span');
    cell.className = `spider-perturbation-case${index === currentPerturbationIndex ? ' is-active' : ''}${perturbation.state === 'frontier-failure' ? ' is-frontier' : ''}`;
    cell.textContent = perturbation.magnitude === 0 ? 'control' : `${perturbation.magnitude} mg\n${String(perturbation.angle).padStart(3, '0')}°`;
    cell.style.cssText = 'cursor:default;pointer-events:none;white-space:pre-line';
    cell.title = `${perturbation.label}${perturbation.state === 'frontier-failure' ? ' — current recovery failure frontier' : ''}`;
    return cell;
  }));
  perturbationGrid.setAttribute('aria-label', `Non-interactive coverage map for all ${PERTURBATION_CASES.length} STAND perturbation cases. The highlighted case is ${active.label}.`);
}

function runSelectedPerturbationCase() {
  if (currentRelease !== 'v0.2') return;
  stop();
  currentPerturbationIndex = perturbationIndexFor(Number(perturbationMagnitude.value), Number(perturbationDirection.value));
  standRunMode = 'selected';
  restart();
  start();
}

function beginStandSuite() {
  currentPerturbationIndex = 0;
  standRunMode = 'suite';
  restart();
  start();
}

function advanceStandSuite() {
  const caseDuration = currentPerturbationCase().magnitude ? PERTURBATION_CASE_SECONDS : OBSERVATION_SECONDS;
  if (currentRelease !== 'v0.2' || !running || data.time < caseDuration) return;
  if (standRunMode === 'suite' && currentPerturbationIndex < PERTURBATION_CASES.length - 1) {
    currentPerturbationIndex += 1;
    restart();
    return;
  }
  standRunMode = 'idle';
  stop();
  renderPerturbationGrid();
}

function createSegment(color, radius) {
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.22, roughness: 0.45 });
  const segment = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
  segment.castShadow = true;
  segment.receiveShadow = true;
  scene.add(segment);
  return segment;
}

function createRobotVisual() {
  const torso = new THREE.Group();
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.32, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xaeb5b0, metalness: 0.28, roughness: 0.38 }),
  );
  const torsoEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(torsoMesh.geometry),
    new THREE.LineBasicMaterial({ color: 0x333337, transparent: true, opacity: 0.58 }),
  );
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  const cowl = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.25, 0.018),
    new THREE.MeshStandardMaterial({ color: 0x0e1111, metalness: 0.22, roughness: 0.45 }),
  );
  cowl.position.z = 0.078;
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.07, 10),
    new THREE.MeshStandardMaterial({ color: 0xebe0b8, metalness: 0.12, roughness: 0.5 }),
  );
  spine.rotation.y = Math.PI / 2;
  spine.position.set(-0.125, 0, 0.091);
  torso.add(torsoMesh, torsoEdges, cowl, spine);

  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5e9, roughness: 0.28, metalness: 0.04 });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x050606, roughness: 0.24, metalness: 0.12 });
  const eyePairs = PUPIL_CONFIG.map((config, index) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(EYE_RADIUS, 24, 16), eyeMaterial.clone());
    eye.position.set(0.235, index === 0 ? 0.065 : -0.065, 0.012);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(PUPIL_RADIUS, 18, 12), pupilMaterial.clone());
    eye.add(pupil);
    torso.add(eye);
    return { eye, pupil, config };
  });
  scene.add(torso);

  const legs = FOOT_NAMES.map((_, index) => {
    const color = COLORS[index];
    const foot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 18, 12),
      new THREE.MeshStandardMaterial({ color: FOOT_COLOR, emissive: 0x000000, metalness: 0.26, roughness: 0.34 }),
    );
    foot.castShadow = true;
    foot.receiveShadow = true;
    scene.add(foot);
    return { thigh: createSegment(color, 0.035), shin: createSegment(color, 0.029), foot };
  });

  robotVisual = {
    torso,
    legs,
    eyePairs,
    matrix: new THREE.Matrix4(),
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  };
  resetPupilDynamics();
}

function resetPupilDynamics() {
  pupilDynamics = PUPIL_CONFIG.map((config) => ({
    offset: config.rest.clone(),
    velocity: new THREE.Vector2(),
  }));
  if (robotVisual) updatePupilPositions();
}

function updatePupilPositions() {
  robotVisual.eyePairs.forEach(({ pupil }, index) => {
    const offset = pupilDynamics[index].offset;
    const forward = Math.sqrt(Math.max(0, (EYE_RADIUS - 0.006) ** 2 - offset.lengthSq()));
    pupil.position.set(forward, offset.x, offset.y);
  });
}

function updateResponsivePupils(deltaTime) {
  if (!pupilDynamics || !data || !robotVisual) return;
  const torso = bodyAccessors?.torso;
  if (!torso) return;
  const rotation = torso.xmat;
  const gravity = new THREE.Vector3(0, 0, -9.81);
  const gravityLocal = new THREE.Vector3(
    rotation[0] * gravity.x + rotation[3] * gravity.y + rotation[6] * gravity.z,
    rotation[1] * gravity.x + rotation[4] * gravity.y + rotation[7] * gravity.z,
    rotation[2] * gravity.x + rotation[5] * gravity.y + rotation[8] * gravity.z,
  );
  const qacc = data.qacc || [];
  const acceleration = new THREE.Vector3(qacc[0] || 0, qacc[1] || 0, qacc[2] || 0);
  const accelerationLocal = new THREE.Vector3(
    rotation[0] * acceleration.x + rotation[3] * acceleration.y + rotation[6] * acceleration.z,
    rotation[1] * acceleration.x + rotation[4] * acceleration.y + rotation[7] * acceleration.z,
    rotation[2] * acceleration.x + rotation[5] * acceleration.y + rotation[8] * acceleration.z,
  );
  const effective = gravityLocal.sub(accelerationLocal);
  const inertial = new THREE.Vector2(effective.y, effective.z).multiplyScalar(PUPIL_LIMIT / 6.867);
  inertial.x = Math.tanh(inertial.x / PUPIL_LIMIT) * PUPIL_LIMIT;
  inertial.y = Math.tanh(inertial.y / PUPIL_LIMIT) * PUPIL_LIMIT;
  const frontBack = 0.008 * Math.tanh(effective.x / 9.81);
  const elapsed = Math.min(Math.max(deltaTime || STEP_SECONDS, STEP_SECONDS), 1 / 30);
  pupilDynamics.forEach((state, index) => {
    const config = PUPIL_CONFIG[index];
    const target = config.rest.clone().add(inertial).add(new THREE.Vector2(config.splay * frontBack, 0));
    target.clampLength(0, PUPIL_LIMIT);
    const spring = target.sub(state.offset).multiplyScalar(config.stiffness).addScaledVector(state.velocity, -config.damping);
    state.velocity.addScaledVector(spring, elapsed);
    state.offset.addScaledVector(state.velocity, elapsed);
    if (state.offset.length() > PUPIL_LIMIT) {
      state.offset.setLength(PUPIL_LIMIT);
      state.velocity.multiplyScalar(-PUPIL_RESTITUTION);
    }
  });
  updatePupilPositions();
}

function positionFrom(accessor, target) {
  return target.set(accessor.xpos[0], accessor.xpos[1], accessor.xpos[2]);
}

function setMuJoCoRotation(object, matrixValues) {
  robotVisual.matrix.set(
    matrixValues[0], matrixValues[1], matrixValues[2], 0,
    matrixValues[3], matrixValues[4], matrixValues[5], 0,
    matrixValues[6], matrixValues[7], matrixValues[8], 0,
    0, 0, 0, 1,
  );
  object.quaternion.setFromRotationMatrix(robotVisual.matrix);
}

function setSegment(segment, start, end) {
  const direction = robotVisual.direction.subVectors(end, start);
  const length = direction.length();
  segment.position.addVectors(start, end).multiplyScalar(0.5);
  segment.scale.set(1, Math.max(length, 0.0001), 1);
  segment.quaternion.setFromUnitVectors(LOCAL_Y, direction.multiplyScalar(1 / Math.max(length, 0.0001)));
}

function updateRobotVisual(contacts) {
  const torso = bodyAccessors.torso;
  positionFrom(torso, robotVisual.torso.position);
  setMuJoCoRotation(robotVisual.torso, torso.xmat);

  FOOT_NAMES.forEach((name, index) => {
    const visual = robotVisual.legs[index];
    const hip = positionFrom(bodyAccessors[name], robotVisual.start);
    const knee = positionFrom(bodyAccessors[`${name}_shin`], robotVisual.end);
    setSegment(visual.thigh, hip, knee);
    const foot = positionFrom(footAccessors[name], robotVisual.start);
    setSegment(visual.shin, knee, foot);
    visual.foot.position.copy(foot);
    visual.foot.material.color.set(FOOT_COLOR);
    visual.foot.material.emissive.set(contacts[index] ? 0x260000 : 0x000000);
  });
  updateResponsivePupils(STEP_SECONDS);
}

function renderScene() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderScene();
}

function resetCamera() {
  setCameraFollow(false);
  camera.position.copy(CAMERA_POSITION);
  controls.target.copy(CAMERA_TARGET);
  controls.update();
  renderScene();
}

function setCameraFollow(enabled) {
  cameraFollow = enabled;
  cameraFollowButton.textContent = enabled ? 'Following Spider' : 'Follow Spider';
  cameraFollowButton.setAttribute('aria-pressed', String(enabled));
  if (!enabled || !bodyAccessors) return;

  const target = positionFrom(bodyAccessors.torso, robotVisual.start);
  target.z -= 0.25;
  robotVisual.direction.subVectors(camera.position, controls.target);
  controls.target.copy(target);
  camera.position.copy(target).add(robotVisual.direction);
  controls.update();
  renderScene();
}

function updateFollowCamera() {
  if (!cameraFollow) return;
  const target = positionFrom(bodyAccessors.torso, robotVisual.start);
  target.z -= 0.25;
  robotVisual.direction.subVectors(target, controls.target);
  camera.position.add(robotVisual.direction);
  controls.target.copy(target);
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xe8ecf1, 1);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8ecf1);
  scene.fog = new THREE.Fog(0xe8ecf1, 5.5, 20);
  scene.up.set(0, 0, 1);

  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 25);
  camera.up.set(0, 0, 1);
  camera.position.copy(CAMERA_POSITION);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = true;
  controls.minDistance = 0.45;
  controls.maxDistance = 4.5;
  controls.minPolarAngle = Math.PI * 0.1;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.addEventListener('change', renderScene);
  controls.addEventListener('start', () => setCameraFollow(false));
  controls.update();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ color: 0xe8ecf1, metalness: 0.02, roughness: 0.9 }),
  );
  ground.position.z = -0.012;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(24, 48, 0x7fa5c7, 0xc8d6e3);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.36;
  scene.add(grid);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7cbe0, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(1.8, -1.2, 2.6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x7fa5c7, 0.42);
  fillLight.position.set(-1.5, 1.2, 0.8);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.55);
  rimLight.position.set(-1.8, -1.4, 1.7);
  scene.add(rimLight);

  createRobotVisual();
  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(stage);
  resizeRenderer();
}

function updateReadout(state) {
  const jointVelocities = Array.from(data.qvel).slice(6);
  const actuatorForces = data.actuator_force
    ? Array.from(data.actuator_force)
    : Array.from(data.qfrc_actuator).slice(6);
  const rms = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(values.length, 1));
  readout('time').textContent = `${data.time.toFixed(2)} s`;
  readout('x').textContent = `${data.qpos[0].toFixed(3)} m`;
  readout('y').textContent = `${data.qpos[1].toFixed(3)} m`;
  readout('z').textContent = `${data.qpos[2].toFixed(3)} m`;
  readout('contacts').textContent = `${state.contacts.filter(Boolean).length} / 6`;
  readout('attitude').textContent = `${state.roll.toFixed(3)} / ${state.pitch.toFixed(3)} rad`;
  readout('joint-speed').textContent = `${rms(jointVelocities).toFixed(3)} rad/s`;
  readout('actuator-force').textContent = `${rms(actuatorForces).toFixed(3)} N·m`;
}

function recordTelemetry(state) {
  if (telemetryHistory.length && data.time - lastTelemetrySampleTime < TELEMETRY_SAMPLE_SECONDS) return;
  telemetryHistory.push({
    time: data.time,
    position: data.qpos[0],
    lateral: data.qpos[1],
    height: data.qpos[2],
    velocity: data.qvel[0],
    roll: state.roll,
    pitch: state.pitch,
  });
  lastTelemetrySampleTime = data.time;
  const firstVisibleTime = data.time - TELEMETRY_WINDOW_SECONDS;
  while (telemetryHistory.length > 1 && telemetryHistory[0].time < firstVisibleTime) telemetryHistory.shift();
  drawTelemetryCharts();
  drawTelemetryGlyphs();
}

function chartBounds(keys, { includeZero = false, minimum, minimumSpan = 0.1 } = {}) {
  const values = telemetryHistory.flatMap((sample) => keys.map((key) => sample[key]));
  let lower = Math.min(...values);
  let upper = Math.max(...values);
  if (includeZero) {
    lower = Math.min(lower, 0);
    upper = Math.max(upper, 0);
  }
  if (minimum !== undefined) lower = Math.min(lower, minimum);
  const span = Math.max(upper - lower, minimumSpan);
  const padding = span * 0.13;
  return { lower: minimum === undefined ? lower - padding : lower, upper: upper + padding };
}

function prepareChart(chartCanvas) {
  const bounds = chartCanvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  if (chartCanvas.width !== width * pixelRatio || chartCanvas.height !== height * pixelRatio) {
    chartCanvas.width = width * pixelRatio;
    chartCanvas.height = height * pixelRatio;
  }
  const context = chartCanvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawChart(chartName, series, bounds, unit, label) {
  const chartCanvas = chartCanvases[chartName];
  if (!chartCanvas || !telemetryHistory.length) return;
  const { context, width, height } = prepareChart(chartCanvas);
  const plot = { left: 40, top: 15, right: 10, bottom: 24 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const startTime = telemetryHistory[0].time;
  const endTime = Math.max(telemetryHistory.at(-1).time, startTime + 1);
  const timeRange = endTime - startTime;
  const valueRange = Math.max(bounds.upper - bounds.lower, 0.0001);
  const x = (time) => plot.left + (time - startTime) / timeRange * plotWidth;
  const y = (value) => plot.top + (1 - (value - bounds.lower) / valueRange) * plotHeight;

  context.fillStyle = CHART_SURFACE;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = CHART_GRID;
  context.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const guideY = plot.top + plotHeight * index / 4;
    context.beginPath();
    context.moveTo(plot.left, guideY);
    context.lineTo(width - plot.right, guideY);
    context.stroke();
  }
  context.strokeStyle = CHART_AXIS;
  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, height - plot.bottom);
  context.lineTo(width - plot.right, height - plot.bottom);
  context.stroke();

  context.fillStyle = CHART_TEXT;
  context.font = '10px JetBrains Mono, monospace';
  context.textBaseline = 'middle';
  context.fillText(`${bounds.upper.toFixed(2)} ${unit}`, 1, plot.top + 2);
  context.fillText(`${bounds.lower.toFixed(2)} ${unit}`, 1, height - plot.bottom - 2);
  context.textBaseline = 'alphabetic';
  context.fillText(`${startTime.toFixed(1)} s`, plot.left, height - 5);
  const endLabel = `${endTime.toFixed(1)} s`;
  context.fillText(endLabel, width - plot.right - context.measureText(endLabel).width, height - 5);

  context.save();
  context.beginPath();
  context.rect(plot.left, plot.top, plotWidth, plotHeight);
  context.clip();
  series.forEach(({ key, color }) => {
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    telemetryHistory.forEach((sample, index) => {
      if (index === 0) context.moveTo(x(sample.time), y(sample[key]));
      else context.lineTo(x(sample.time), y(sample[key]));
    });
    context.stroke();
  });
  context.restore();

  const latest = telemetryHistory.at(-1);
  const summary = series.map(({ key }) => `${key} ${latest[key].toFixed(3)} ${unit}`).join(', ');
  chartCanvas.setAttribute('aria-label', `${label} over the current simulation run. The horizontal axis is time. Latest: ${summary}.`);
}

function drawTelemetryCharts() {
  if (!telemetryHistory.length) return;
  drawChart('position', [{ key: 'position', color: CHART_BLUE }, { key: 'lateral', color: CHART_RED }], chartBounds(['position', 'lateral'], { includeZero: true, minimumSpan: 0.1 }), 'm', 'Torso ground-plane position');
  drawChart('height', [{ key: 'height', color: CHART_INK }], chartBounds(['height'], { minimum: 0, minimumSpan: 0.25 }), 'm', 'Torso height');
  drawChart('attitude', [{ key: 'roll', color: CHART_BLUE }, { key: 'pitch', color: CHART_RED }], chartBounds(['roll', 'pitch'], { includeZero: true, minimumSpan: 0.2 }), 'rad', 'Body roll and pitch');
}

function drawTelemetryGlyph(name, series, bounds, unit, label) {
  const glyphCanvas = glyphCanvases[name];
  if (!glyphCanvas || !telemetryHistory.length) return;
  const { context, width, height } = prepareChart(glyphCanvas);
  const inset = 3;
  const startTime = telemetryHistory[0].time;
  const endTime = Math.max(telemetryHistory.at(-1).time, startTime + 1);
  const timeRange = endTime - startTime;
  const valueRange = Math.max(bounds.upper - bounds.lower, 0.0001);
  const x = (time) => inset + (time - startTime) / timeRange * (width - inset * 2);
  const y = (value) => inset + (1 - (value - bounds.lower) / valueRange) * (height - inset * 2);

  context.strokeStyle = GLYPH_BASELINE;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(inset, height / 2);
  context.lineTo(width - inset, height / 2);
  context.stroke();

  const latest = telemetryHistory.at(-1);
  series.forEach(({ key, color }) => {
    context.strokeStyle = color;
    context.lineWidth = 1.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    telemetryHistory.forEach((sample, index) => {
      if (index === 0) context.moveTo(x(sample.time), y(sample[key]));
      else context.lineTo(x(sample.time), y(sample[key]));
    });
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.arc(x(latest.time), y(latest[key]), 1.8, 0, Math.PI * 2);
    context.fill();
  });

  const latestValue = series.length === 1
    ? `${latest[series[0].key].toFixed(2)} ${unit}`
    : `r ${latest.roll.toFixed(2)} · p ${latest.pitch.toFixed(2)}`;
  glyphValues[name].textContent = latestValue;
  glyphCanvas.setAttribute('aria-label', `${label} live trace over the current simulation run. The horizontal axis is time. Latest: ${latestValue}.`);
}

function drawTelemetryGlyphs() {
  if (!telemetryHistory.length) return;
  drawTelemetryGlyph('position', [{ key: 'position', color: CHART_BLUE }], chartBounds(['position'], { includeZero: true, minimumSpan: 0.1 }), 'm', 'Torso x position');
  drawTelemetryGlyph('velocity', [{ key: 'velocity', color: CHART_INK }], chartBounds(['velocity'], { includeZero: true, minimumSpan: 0.1 }), 'm/s', 'Forward velocity');
  drawTelemetryGlyph('attitude', [{ key: 'roll', color: CHART_BLUE }, { key: 'pitch', color: CHART_RED }], chartBounds(['roll', 'pitch'], { includeZero: true, minimumSpan: 0.2 }), 'rad', 'Body attitude');
}

function render() {
  const state = applyReleaseControl();
  updateRobotVisual(state.contacts);
  updateFollowCamera();
  controls.update();
  renderScene();
  updateReadout(state);
  recordTelemetry(state);
}

function restart() {
  releaseAccessors();
  if (data) {
    data.delete();
    data = undefined;
  }
  data = new mujoco.MjData(model);
  phase = 0;
  lastSimulationTime = 0;
  accumulator = 0;
  telemetryHistory = [];
  lastTelemetrySampleTime = -Infinity;
  setReleasePose();
  resetPupilDynamics();
  schedulePerturbationPulse();
  cacheAccessors();
  renderPerturbationGrid();
  render();
}

function updatePlayButton() {
  if (!playButton) return;
  if (currentRelease === 'v0.2') {
    if (running) playButton.textContent = standRunMode === 'selected' ? 'Pause selected case' : 'Pause STAND suite';
    else if (standRunMode === 'selected') playButton.textContent = 'Resume selected case';
    else if (standRunMode === 'suite') playButton.textContent = 'Resume STAND suite';
    else playButton.textContent = 'Play STAND suite';
  } else {
    playButton.textContent = running ? 'Pause simulation' : 'Play simulation';
  }
  playButton.setAttribute('aria-pressed', String(running));
}

async function loadRelease(release) {
  const definition = RELEASES[release];
  if (!definition) return;
  stop();
  status.textContent = `Loading ${definition.label}…`;
  const modelXml = await fetch(definition.model).then((response) => {
    if (!response.ok) throw new Error(`The ${definition.label} model could not load.`);
    return response.text();
  });
  releaseAccessors();
  if (data) {
    data.delete();
    data = undefined;
  }
  if (model) {
    model.delete();
    model = undefined;
  }
  currentRelease = release;
  standRunMode = 'idle';
  model = mujoco.MjModel.from_xml_string(modelXml);
  updateModelConstants();
  const torso = model.body('torso');
  torsoBodyId = torso.id;
  torso.delete();
  const ground = model.geom('ground');
  groundGeomId = ground.id;
  ground.delete();
  footGeomIds = FOOT_NAMES.map((name) => {
    const geom = model.geom(`${name}_foot`);
    const id = geom.id;
    geom.delete();
    return id;
  });
  releaseDescription.textContent = definition.description;
  status.textContent = `Live 3D · ${definition.label} · MuJoCo ${mujoco.mj_versionString()} · ${definition.source}`;
  if (currentRelease === 'v0.2') beginStandSuite();
  else {
    restart();
    updatePlayButton();
  }
}

function stop() {
  running = false;
  if (animation) cancelAnimationFrame(animation);
  animation = undefined;
  updatePlayButton();
}

function frame(now) {
  if (!running) return;
  const elapsed = Math.min((now - previousWallTime) / 1000, MAX_FRAME_SECONDS);
  previousWallTime = now;
  accumulator += elapsed;
  while (accumulator >= STEP_SECONDS) {
    applyReleaseControl();
    applyPerturbationPulse();
    mujoco.mj_step(model, data);
    completePerturbationStep();
    advanceStandSuite();
    accumulator -= STEP_SECONDS;
    if (!running) break;
  }
  render();
  if (running) animation = requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  previousWallTime = performance.now();
  updatePlayButton();
  animation = requestAnimationFrame(frame);
}

function toggle() {
  if (running) {
    stop();
    return;
  }
  if (currentRelease === 'v0.2' && standRunMode === 'idle') {
    beginStandSuite();
    return;
  }
  start();
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

function disposeRenderer() {
  if (resizeObserver) resizeObserver.disconnect();
  if (controls) controls.dispose();
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
  if (renderer) renderer.dispose();
}

async function initialise() {
  try {
    setupRenderer();
    const [loadedMujoco, manifest] = await Promise.all([
      loadMujoco(),
      fetch('./manifest.json').then((response) => {
        if (!response.ok) throw new Error('The Spider release manifest could not load.');
        return response.json();
      }),
    ]);
    mujoco = loadedMujoco;
    playButton.disabled = false;
    resetButton.disabled = false;
    cameraResetButton.disabled = false;
    cameraFollowButton.disabled = false;
    playButton.textContent = 'Play simulation';
    playButton.addEventListener('click', toggle);
    resetButton.addEventListener('click', restart);
    releaseSelect.addEventListener('change', () => loadRelease(releaseSelect.value).catch((error) => {
      status.textContent = 'Live simulation unavailable';
      stage.innerHTML = `<p class="explorer-error">${error.message} See the canonical Spider repository for the native simulation.</p>`;
    }));
    cameraResetButton.addEventListener('click', resetCamera);
    cameraFollowButton.addEventListener('click', () => setCameraFollow(!cameraFollow));
    await loadRelease(currentRelease);
  } catch (error) {
    disposeRenderer();
    status.textContent = 'Live simulation unavailable';
    stage.innerHTML = `<p class="explorer-error">${error.message} See the canonical Spider repository for the native simulation.</p>`;
  }
}

window.addEventListener('pagehide', () => {
  if (animation) cancelAnimationFrame(animation);
  clearPerturbationPulse();
  if (data) data.delete();
  releaseAccessors();
  if (model) model.delete();
  disposeRenderer();
});

window.addEventListener('resize', drawTelemetryCharts);

initialise();

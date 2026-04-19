/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  player.js  —  Third-person player (improved anatomy)            ║
 * ║  Same public API: initPlayer, updatePlayer, isPlayerActive,     ║
 * ║                   enterPlayerMode, exitPlayerMode                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as THREE from 'three';
import { scene, camera } from './scene.js';

// ── Tunables ──────────────────────────────────────────────────────────────
const WALK_SPEED   = 0.20;
const RUN_SPEED    = 0.50;
const GRAVITY      = -0.028;
const JUMP_VEL     = 0.38;
const GROUND_Y     = 0.0;
const CAM_HEIGHT   = 3.6;
const CAM_DIST     = 6.2;
const CAM_LERP     = 0.10;
const HEAD_BOB_AMP = 0.055;
const MAX_PITCH    =  0.55;
const MIN_PITCH    = -0.42;
const MOUSE_SENS   = 0.0028;

// ── State ─────────────────────────────────────────────────────────────────
let _active = false;
let _yaw = Math.PI, _pitch = 0.18;
let _velY = 0, _onGround = true;
let _walkTime = 0, _bobTime = 0, _moving = false;

const _pos     = new THREE.Vector3(0, 0, 22);
const _camPos  = new THREE.Vector3();
const _camLook = new THREE.Vector3();

const _keys = { w:false, s:false, a:false, d:false, space:false, shift:false };

// ── Mesh handles ──────────────────────────────────────────────────────────
let _root = null;
// Pivot groups (rotate from joint, geometry hangs below)
let _legL, _legR, _kneeL, _kneeR;
let _armL, _armR, _elbowL, _elbowR;
let _head, _torso;

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────
export function initPlayer() { _buildCharacter(); _bindKeys(); }
export function isPlayerActive() { return _active; }

export function enterPlayerMode() {
  _active = true;
  _root.visible = true;
  _pos.set(0, 0, 22);
  _yaw = Math.PI; _pitch = 0.18; _velY = 0; _walkTime = 0;
  _camPos.set(
    _pos.x + Math.sin(_yaw) * CAM_DIST,
    _pos.y + CAM_HEIGHT,
    _pos.z + Math.cos(_yaw) * CAM_DIST
  );
  _toggleHud(true);
  const c = document.getElementById('c');
  (c.requestPointerLock || c.mozRequestPointerLock || c.webkitRequestPointerLock)?.call(c);
}

export function exitPlayerMode() {
  _active = false;
  _root.visible = false;
  _toggleHud(false);
  document.exitPointerLock?.();
}

function _toggleHud(on) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v; };
  set('player-hud', on ? 'flex' : 'none');
  set('player-btn', on ? 'none' : 'flex');
  set('hint',       on ? 'none' : 'block');
  set('legend',     on ? 'none' : 'block');
  set('compass',    on ? 'none' : 'flex');
}

// ─────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────
export function updatePlayer() {
  if (!_active) return;

  const speed = _keys.shift ? RUN_SPEED : WALK_SPEED;
  const dYaw = _yaw;

  let dx = 0, dz = 0;
  if (_keys.w) { dx -= Math.sin(dYaw); dz -= Math.cos(dYaw); }
  if (_keys.s) { dx += Math.sin(dYaw); dz += Math.cos(dYaw); }
  if (_keys.a) { dx -= Math.cos(dYaw); dz += Math.sin(dYaw); }
  if (_keys.d) { dx += Math.cos(dYaw); dz -= Math.sin(dYaw); }

  _moving = (dx !== 0 || dz !== 0);

  if (_moving) {
    const len = Math.hypot(dx, dz);
    _pos.x += (dx / len) * speed;
    _pos.z += (dz / len) * speed;
    _walkTime += _keys.shift ? 0.14 : 0.085;
    _bobTime  += _keys.shift ? 0.18 : 0.10;
  }

  if (_keys.space && _onGround) { _velY = JUMP_VEL; _onGround = false; }
  _velY += GRAVITY;
  _pos.y += _velY;
  if (_pos.y <= GROUND_Y) { _pos.y = GROUND_Y; _velY = 0; _onGround = true; }

  const bob = (_moving && _onGround) ? Math.sin(_bobTime * 2) * HEAD_BOB_AMP : 0;

  _root.position.copy(_pos);
  _root.position.y += bob * 0.4; // subtle full-body bob

  if (_moving) {
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - _root.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    _root.rotation.y += diff * 0.18;
  }

  _animateLimbs();

  // Head tracks pitch
  if (_head) _head.rotation.x = -_pitch * 0.4;

  // Camera
  const tx = _pos.x + Math.sin(_yaw) * CAM_DIST;
  const ty = _pos.y + CAM_HEIGHT + bob * 0.5;
  const tz = _pos.z + Math.cos(_yaw) * CAM_DIST;
  _camPos.x += (tx - _camPos.x) * CAM_LERP;
  _camPos.y += (ty - _camPos.y) * CAM_LERP;
  _camPos.z += (tz - _camPos.z) * CAM_LERP;
  camera.position.copy(_camPos);

  _camLook.set(_pos.x, _pos.y + 1.4 + bob, _pos.z);
  camera.lookAt(_camLook);
  camera.rotateX(-_pitch * 0.25);
}

// ─────────────────────────────────────────────────────────────────────────
// LIMB ANIMATION  (rotation happens at joint pivots)
// ─────────────────────────────────────────────────────────────────────────
function _animateLimbs() {
  const t = _walkTime;
  const amp = _moving ? (_keys.shift ? 0.85 : 0.55) : 0;

  // Hip / shoulder swing (opposite phase L vs R; arms counter to legs)
  const swing = Math.sin(t * 7.0) * amp;

  _legL.rotation.x =  swing;
  _legR.rotation.x = -swing;

  _armL.rotation.x = -swing * 0.7;
  _armR.rotation.x =  swing * 0.7;

  // Knees & elbows bend on the back-swing (only flex one direction)
  const kneeL = Math.max(0,  Math.sin(t * 7.0 + Math.PI * 0.5)) * amp * 0.9;
  const kneeR = Math.max(0, -Math.sin(t * 7.0 + Math.PI * 0.5)) * amp * 0.9;
  _kneeL.rotation.x = kneeL;
  _kneeR.rotation.x = kneeR;

  const elbowBend = 0.25 + Math.abs(swing) * 0.4;
  _elbowL.rotation.x = elbowBend;
  _elbowR.rotation.x = elbowBend;

  // Idle: relax pose + gentle breathing
  if (!_moving) {
    const breath = Math.sin(Date.now() * 0.0022) * 0.02;
    _armL.rotation.z =  0.07 + breath;
    _armR.rotation.z = -0.07 - breath;
    _armL.rotation.x = 0.05;
    _armR.rotation.x = 0.05;
    _elbowL.rotation.x = 0.18;
    _elbowR.rotation.x = 0.18;
    _legL.rotation.x = 0; _legR.rotation.x = 0;
    _kneeL.rotation.x = 0; _kneeR.rotation.x = 0;
    if (_torso) _torso.position.y = breath * 0.5;
  } else {
    _armL.rotation.z =  0.05;
    _armR.rotation.z = -0.05;
    if (_torso) _torso.position.y = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// BUILD CHARACTER  (anatomically proportioned ~1.8m tall)
// Coordinate convention: feet at y=0, top of head ~1.85
// ─────────────────────────────────────────────────────────────────────────
function _buildCharacter() {
  _root = new THREE.Group();

  const skin   = new THREE.MeshLambertMaterial({ color: 0xf1c8a4 });
  const shirt  = new THREE.MeshLambertMaterial({ color: 0x1e50a8 });
  const cuff   = new THREE.MeshLambertMaterial({ color: 0x153d80 });
  const pants  = new THREE.MeshLambertMaterial({ color: 0x252840 });
  const shoe   = new THREE.MeshLambertMaterial({ color: 0x120a05 });
  const hair   = new THREE.MeshLambertMaterial({ color: 0x1a0e06 });
  const beltM  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eyeB   = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const eyeW   = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const lipM   = new THREE.MeshLambertMaterial({ color: 0xa85a4a });

  // ── PELVIS / HIPS (root anchor for legs) ──────────────────────────────
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.22, 0.32), pants);
  pelvis.position.y = 0.92;

  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.34), beltM);
  belt.position.y = 1.04;

  // ── TORSO (tapered: wider shoulders, narrower waist) ──────────────────
  _torso = new THREE.Group();
  _torso.position.y = 0; // keep at world; meshes positioned absolutely

  // Lower torso (waist)
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.30, 0.28), shirt);
  waist.position.y = 1.22;

  // Upper torso (chest) — slightly wider
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.40, 0.32), shirt);
  chest.position.y = 1.55;

  // Shoulder yoke (rounded look)
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.78, 10), shirt);
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 1.72;

  _torso.add(waist, chest, shoulders);

  // ── NECK ──────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.13, 10), skin);
  neck.position.y = 1.80;

  // ── HEAD (group pivot at neck top, head offset upward) ────────────────
  _head = new THREE.Group();
  _head.position.y = 1.87;

  // Skull — slightly egg-shaped (taller than wide)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), skin);
  skull.scale.set(1.0, 1.15, 1.05);
  skull.position.y = 0.05;

  // Jaw / chin
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.20), skin);
  jaw.position.set(0, -0.08, 0.01);

  // Hair cap
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.172, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair
  );
  hairCap.scale.set(1.0, 1.1, 1.05);
  hairCap.position.y = 0.06;

  // Hair back
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.18), hair);
  hairBack.position.set(0, 0.05, -0.05);

  // Ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skin);
    ear.scale.set(0.6, 1.2, 0.5);
    ear.position.set(sx * 0.165, 0.02, 0);
    _head.add(ear);
  }

  // Eyes (whites + pupils)
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeW);
    w.position.set(sx * 0.058, 0.04, 0.145);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), eyeB);
    p.position.set(sx * 0.058, 0.04, 0.168);
    _head.add(w, p);
  }

  // Brows
  for (const sx of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), hair);
    brow.position.set(sx * 0.058, 0.085, 0.158);
    _head.add(brow);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 6), skin);
  nose.rotation.x = Math.PI;
  nose.position.set(0, 0.005, 0.18);
  _head.add(nose);

  // Mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.015), lipM);
  mouth.position.set(0, -0.055, 0.165);
  _head.add(mouth);

  _head.add(skull, jaw, hairCap, hairBack);

  // ─────────────────────────────────────────────────────────────────────
  // ARMS — pivot at shoulder, elbow as child pivot
  // Shoulder Y ≈ 1.70, arm length ≈ 0.72 (upper 0.34 + fore 0.32 + hand 0.06)
  // ─────────────────────────────────────────────────────────────────────
  const buildArm = (side /* -1 left, +1 right */) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 1.70, 0);

    // Deltoid cap
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), shirt);
    shoulder.add(delt);

    // Upper arm — geometry hangs below pivot
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.34, 10), shirt);
    upper.position.y = -0.17;
    shoulder.add(upper);

    // Elbow pivot
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    shoulder.add(elbow);

    const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), cuff);
    elbow.add(elbowBall);

    // Forearm
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.32, 10), skin);
    fore.position.y = -0.16;
    elbow.add(fore);

    // Wrist + hand
    const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skin);
    wrist.position.y = -0.32;
    elbow.add(wrist);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.06), skin);
    hand.position.y = -0.40;
    elbow.add(hand);

    // Thumb
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.04), skin);
    thumb.position.set(side * 0.05, -0.36, 0.02);
    elbow.add(thumb);

    return { shoulder, elbow };
  };

  const La = buildArm(-1); _armL = La.shoulder; _elbowL = La.elbow;
  const Ra = buildArm( 1); _armR = Ra.shoulder; _elbowR = Ra.elbow;
  _armL.rotation.z =  0.07;
  _armR.rotation.z = -0.07;

  // ─────────────────────────────────────────────────────────────────────
  // LEGS — pivot at hip, knee as child pivot
  // Hip Y ≈ 0.92, leg length ≈ 0.92 (thigh 0.44 + shin 0.42 + foot 0.06)
  // ─────────────────────────────────────────────────────────────────────
  const buildLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, 0.92, 0);

    const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), pants);
    hip.add(hipBall);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.085, 0.44, 10), pants);
    thigh.position.y = -0.22;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);

    const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), pants);
    knee.add(kneeBall);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.06, 0.42, 10), pants);
    shin.position.y = -0.21;
    knee.add(shin);

    const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), shoe);
    ankle.position.y = -0.42;
    knee.add(ankle);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.30), shoe);
    foot.position.set(0, -0.46, 0.06);
    knee.add(foot);

    return { hip, knee };
  };

  const Ll = buildLeg(-1); _legL = Ll.hip; _kneeL = Ll.knee;
  const Lr = buildLeg( 1); _legR = Lr.hip; _kneeR = Lr.knee;

  // ── Assemble ────────────────────────────────────────────────────────
  _root.add(pelvis, belt, _torso, neck, _head, _armL, _armR, _legL, _legR);

  // Soft shadow blob (optional fake shadow disc)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  _root.add(shadow);

  _root.visible = false;
  scene.add(_root);
}

// ─────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────
function _bindKeys() {
  window.addEventListener('keydown', (e) => {
    if (!_active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    _keys.w = true; break;
      case 'KeyS': case 'ArrowDown':  _keys.s = true; break;
      case 'KeyA': case 'ArrowLeft':  _keys.a = true; break;
      case 'KeyD': case 'ArrowRight': _keys.d = true; break;
      case 'Space': e.preventDefault(); _keys.space = true; break;
      case 'ShiftLeft': case 'ShiftRight': _keys.shift = true; break;
      case 'Escape': exitPlayerMode(); break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    _keys.w = false; break;
      case 'KeyS': case 'ArrowDown':  _keys.s = false; break;
      case 'KeyA': case 'ArrowLeft':  _keys.a = false; break;
      case 'KeyD': case 'ArrowRight': _keys.d = false; break;
      case 'Space': _keys.space = false; break;
      case 'ShiftLeft': case 'ShiftRight': _keys.shift = false; break;
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!_active) return;
    const c = document.getElementById('c');
    const locked =
      document.pointerLockElement === c ||
      document.mozPointerLockElement === c ||
      document.webkitPointerLockElement === c;
    if (!locked) return;
    _yaw   -= e.movementX * MOUSE_SENS;
    _pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH, _pitch + e.movementY * MOUSE_SENS));
  });

  document.getElementById('c')?.addEventListener('click', () => {
    if (!_active) return;
    const c = document.getElementById('c');
    (c.requestPointerLock || c.mozRequestPointerLock || c.webkitRequestPointerLock)?.call(c);
  });

  _setupMobileControls();
}

// ─────────────────────────────────────────────────────────────────────────
// MOBILE
// ─────────────────────────────────────────────────────────────────────────
function _setupMobileControls() {
  const joyEl = document.getElementById('mobile-joy');
  const joyKnob = document.getElementById('mobile-joy-knob');
  if (!joyEl || !joyKnob) return;

  const DEAD = 12, MAX_R = 45;
  let joyOrigin = null, joyId = null;

  joyEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyOrigin = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (joyOrigin === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const dx = t.clientX - joyOrigin.x;
      const dy = t.clientY - joyOrigin.y;
      const dist = Math.hypot(dx, dy);
      const clamp = Math.min(dist, MAX_R);
      const nx = dist > 0 ? (dx / dist) * clamp : 0;
      const ny = dist > 0 ? (dy / dist) * clamp : 0;
      joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;
      _keys.w = dy < -DEAD;
      _keys.s = dy >  DEAD;
      _keys.a = dx < -DEAD;
      _keys.d = dx >  DEAD;
    }
  }, { passive: false });

  const _joyEnd = () => {
    joyOrigin = null; joyId = null;
    joyKnob.style.transform = 'translate(0,0)';
    _keys.w = _keys.s = _keys.a = _keys.d = false;
  };
  window.addEventListener('touchend', _joyEnd);
  window.addEventListener('touchcancel', _joyEnd);

  document.getElementById('mobile-jump')?.addEventListener('touchstart', (e) => {
    e.preventDefault(); _keys.space = true;
  }, { passive: false });
  document.getElementById('mobile-jump')?.addEventListener('touchend', () => {
    _keys.space = false;
  });

  let lookPrev = null, lookId2 = null;
  window.addEventListener('touchstart', (e) => {
    if (!_active) return;
    for (const t of e.changedTouches) {
      if (t.clientX > window.innerWidth * 0.55 && lookId2 === null) {
        lookId2 = t.identifier;
        lookPrev = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!_active || lookId2 === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookId2) continue;
      _yaw   -= (t.clientX - lookPrev.x) * 0.004;
      _pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH,
                  _pitch + (t.clientY - lookPrev.y) * 0.004));
      lookPrev = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) if (t.identifier === lookId2) lookId2 = null;
  });
}

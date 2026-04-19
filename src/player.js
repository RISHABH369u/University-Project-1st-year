/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  player.js  —  Third-person player mode for PTSNS Campus Tour   ║
 * ║                                                                  ║
 * ║  USAGE:                                                          ║
 * ║   import { initPlayer, updatePlayer, isPlayerActive,            ║
 * ║            enterPlayerMode, exitPlayerMode } from './player.js'; ║
 * ║                                                                  ║
 * ║  In main.js   → initPlayer();                                   ║
 * ║  In animate.js → if (isPlayerActive()) updatePlayer();          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as THREE from 'three';
import { scene, camera } from './scene.js';

// ── Constants ─────────────────────────────────────────────────────────────
const WALK_SPEED    = 0.20;
const RUN_SPEED     = 0.50;
const GRAVITY       = -0.028;
const JUMP_VEL      = 0.38;
const GROUND_Y      = 0.0;
const CAM_HEIGHT    = 3.6;     // camera Y above player feet
const CAM_DIST      = 6.2;     // camera distance behind player
const CAM_LERP      = 0.10;    // camera smooth follow (0=stiff,1=instant)
const HEAD_BOB_AMP  = 0.055;
const MAX_PITCH     = 0.55;    // look up/down limit (radians)
const MIN_PITCH     = -0.42;
const MOUSE_SENS    = 0.0028;

// ── Runtime State ─────────────────────────────────────────────────────────
let _active    = false;
let _yaw       = Math.PI;   // character facing direction
let _pitch     = 0.18;
let _velY      = 0;
let _onGround  = true;
let _walkTime  = 0;
let _bobTime   = 0;
let _moving    = false;

const _pos     = new THREE.Vector3(0, 0, 22);    // player world position
const _camPos  = new THREE.Vector3();             // smooth camera position
const _camLook = new THREE.Vector3();

const _keys = {
  w: false, s: false, a: false, d: false,
  space: false, shift: false,
};

// ── Mesh handles ──────────────────────────────────────────────────────────
let _root    = null;   // root group (moves + rotates)
let _legL    = null;
let _legR    = null;
let _armL    = null;
let _armR    = null;

// ─────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────

export function initPlayer() {
  _buildCharacter();
  _bindKeys();
}

export function isPlayerActive() { return _active; }

export function enterPlayerMode() {
  _active = true;
  _root.visible = true;

  // Reset position in front of gate
  _pos.set(0, 0, 22);
  _yaw   = Math.PI;
  _pitch = 0.18;
  _velY  = 0;
  _walkTime = 0;

  _camPos.set(
    _pos.x + Math.sin(_yaw) * CAM_DIST,
    _pos.y + CAM_HEIGHT,
    _pos.z + Math.cos(_yaw) * CAM_DIST
  );

  document.getElementById('player-hud').style.display = 'flex';
  document.getElementById('player-btn').style.display = 'none';
  document.getElementById('hint').style.display       = 'none';
  document.getElementById('legend').style.display     = 'none';
  document.getElementById('compass').style.display    = 'none';

  // Request pointer lock on canvas
  const canvas = document.getElementById('c');
  canvas.requestPointerLock =
    canvas.requestPointerLock       ||
    canvas.mozRequestPointerLock    ||
    canvas.webkitRequestPointerLock;
  canvas.requestPointerLock();
}

export function exitPlayerMode() {
  _active = false;
  _root.visible = false;

  document.getElementById('player-hud').style.display = 'none';
  document.getElementById('player-btn').style.display = 'flex';
  document.getElementById('hint').style.display       = 'block';
  document.getElementById('legend').style.display     = 'block';
  document.getElementById('compass').style.display    = 'flex';

  document.exitPointerLock?.();
}

// ─────────────────────────────────────────────────────────────────────────
//  UPDATE  (call every frame while active)
// ─────────────────────────────────────────────────────────────────────────

export function updatePlayer() {
  if (!_active) return;

  const speed  = _keys.shift ? RUN_SPEED : WALK_SPEED;
  const dYaw   = _yaw;

  // ── Movement direction ────────────────────────────────────────────
  let dx = 0, dz = 0;
  if (_keys.w) { dx -= Math.sin(dYaw); dz -= Math.cos(dYaw); }
  if (_keys.s) { dx += Math.sin(dYaw); dz += Math.cos(dYaw); }
  if (_keys.a) { dx -= Math.cos(dYaw); dz += Math.sin(dYaw); }
  if (_keys.d) { dx += Math.cos(dYaw); dz -= Math.sin(dYaw); }

  _moving = (dx !== 0 || dz !== 0);

  if (_moving) {
    const len = Math.sqrt(dx * dx + dz * dz);
    _pos.x += (dx / len) * speed;
    _pos.z += (dz / len) * speed;
    _walkTime += _keys.shift ? 0.14 : 0.085;
    _bobTime  += _keys.shift ? 0.18 : 0.10;
  }

  // ── Gravity & jump ────────────────────────────────────────────────
  if (_keys.space && _onGround) {
    _velY     = JUMP_VEL;
    _onGround = false;
  }

  _velY    += GRAVITY;
  _pos.y   += _velY;

  if (_pos.y <= GROUND_Y) {
    _pos.y    = GROUND_Y;
    _velY     = 0;
    _onGround = true;
  }

  // ── Head bob (vertical) ───────────────────────────────────────────
  const bob = _moving && _onGround
    ? Math.sin(_bobTime * 2) * HEAD_BOB_AMP
    : 0;

  // ── Character mesh position & facing ─────────────────────────────
  _root.position.copy(_pos);
  if (_moving) {
    // Rotate body to face movement direction
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - _root.rotation.y;
    // Normalise to -PI..PI
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    _root.rotation.y += diff * 0.18;
  }

  // ── Limb animation ───────────────────────────────────────────────
  _animateLimbs();

  // ── Camera ───────────────────────────────────────────────────────
  const targetCamX = _pos.x + Math.sin(_yaw) * CAM_DIST;
  const targetCamY = _pos.y + CAM_HEIGHT + bob * 0.5;
  const targetCamZ = _pos.z + Math.cos(_yaw) * CAM_DIST;

  _camPos.x += (targetCamX - _camPos.x) * CAM_LERP;
  _camPos.y += (targetCamY - _camPos.y) * CAM_LERP;
  _camPos.z += (targetCamZ - _camPos.z) * CAM_LERP;

  camera.position.copy(_camPos);

  // Look at character's chest height + bob
  _camLook.set(
    _pos.x,
    _pos.y + 1.1 + bob,
    _pos.z
  );
  camera.lookAt(_camLook);

  // Apply pitch tilt on top of lookAt
  camera.rotateX(-_pitch * 0.25);
}

// ─────────────────────────────────────────────────────────────────────────
//  PRIVATE — Limb Animation
// ─────────────────────────────────────────────────────────────────────────

function _animateLimbs() {
  const t = _walkTime;
  const amp = _moving ? (_keys.shift ? 0.68 : 0.42) : 0;

  // Leg swing (opposite phase)
  const legSwing = Math.sin(t * 7.0) * amp;
  _legL.rotation.x =  legSwing;
  _legR.rotation.x = -legSwing;

  // Arm swing (counter to legs)
  const armSwing = Math.sin(t * 7.0) * amp * 0.6;
  _armL.rotation.x = -armSwing;
  _armR.rotation.x =  armSwing;

  // Idle sway when standing
  if (!_moving) {
    const sway = Math.sin(Date.now() * 0.001) * 0.022;
    _armL.rotation.z =  0.08 + sway;
    _armR.rotation.z = -0.08 - sway;
    _legL.rotation.x = 0;
    _legR.rotation.x = 0;
  } else {
    _armL.rotation.z =  0.06;
    _armR.rotation.z = -0.06;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  PRIVATE — Build Character Mesh
// ─────────────────────────────────────────────────────────────────────────

function _buildCharacter() {
  _root = new THREE.Group();

  // Materials
  const skin   = new THREE.MeshLambertMaterial({ color: 0xf5c8a0 });
  const shirt  = new THREE.MeshLambertMaterial({ color: 0x1e50a8 });
  const pants  = new THREE.MeshLambertMaterial({ color: 0x252840 });
  const shoe   = new THREE.MeshLambertMaterial({ color: 0x150c00 });
  const hair   = new THREE.MeshLambertMaterial({ color: 0x120800 });
  const beltM  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eyeM   = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const whiteM = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // ─ HEAD ──────────────────────────────────────────────────────────
  const headG = new THREE.Group();
  headG.position.set(0, 1.86, 0);

  // Face
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), skin);

  // Hair top
  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.315, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hair
  );
  hairTop.position.y = 0.02;

  // Hair back/sides
  const hairBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.29, 0.28, 10, 1, true, 0.3, Math.PI * 1.4),
    hair
  );
  hairBack.position.y = -0.08;

  // Eyes
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeM);
    eye.position.set(sx, 0.04, 0.27);
    headG.add(eye);
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), whiteM);
    eyeWhite.position.set(sx, 0.04, 0.265);
    headG.add(eyeWhite);
  }

  // Ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.072, 6, 6), skin);
    ear.position.set(sx * 0.30, 0, 0);
    headG.add(ear);
  }

  headG.add(face, hairTop, hairBack);

  // ─ NECK ──────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.12, 0.20, 8), skin
  );
  neck.position.set(0, 1.51, 0);

  // ─ TORSO ─────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.78, 0.32), shirt);
  torso.position.set(0, 1.06, 0);

  // Shirt pocket
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.02), shirt);
  pocket.position.set(-0.17, 1.18, 0.17);

  // Belt
  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.085, 0.34), beltM);
  beltMesh.position.set(0, 0.655, 0);

  // ─ LEFT ARM ──────────────────────────────────────────────────────
  _armL = new THREE.Group();
  _armL.position.set(-0.42, 1.32, 0);

  const lShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.115, 7, 7), shirt);
  const lUpper    = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.38, 0.20), shirt);
  lUpper.position.y = -0.21;
  const lElbow = new THREE.Mesh(new THREE.SphereGeometry(0.10, 7, 7), shirt);
  lElbow.position.y = -0.42;
  const lFore  = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.34, 0.17), skin);
  lFore.position.y  = -0.60;
  const lHand  = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.10), skin);
  lHand.position.y  = -0.82;
  _armL.add(lShoulder, lUpper, lElbow, lFore, lHand);
  _armL.rotation.z = 0.08;

  // ─ RIGHT ARM ─────────────────────────────────────────────────────
  _armR = new THREE.Group();
  _armR.position.set(0.42, 1.32, 0);

  const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.115, 7, 7), shirt);
  const rUpper    = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.38, 0.20), shirt);
  rUpper.position.y = -0.21;
  const rElbow = new THREE.Mesh(new THREE.SphereGeometry(0.10, 7, 7), shirt);
  rElbow.position.y = -0.42;
  const rFore  = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.34, 0.17), skin);
  rFore.position.y  = -0.60;
  const rHand  = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.10), skin);
  rHand.position.y  = -0.82;
  _armR.add(rShoulder, rUpper, rElbow, rFore, rHand);
  _armR.rotation.z = -0.08;

  // ─ LEFT LEG ──────────────────────────────────────────────────────
  _legL = new THREE.Group();
  _legL.position.set(-0.18, 0.64, 0);

  const lHip   = new THREE.Mesh(new THREE.SphereGeometry(0.135, 7, 7), pants);
  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.45, 0.23), pants);
  lThigh.position.y = -0.225;
  const lKnee  = new THREE.Mesh(new THREE.SphereGeometry(0.120, 7, 7), pants);
  lKnee.position.y  = -0.46;
  const lShin  = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.40, 0.20), pants);
  lShin.position.y  = -0.65;
  const lShoe  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.115, 0.36), shoe);
  lShoe.position.set(0, -0.875, 0.04);
  _legL.add(lHip, lThigh, lKnee, lShin, lShoe);

  // ─ RIGHT LEG ─────────────────────────────────────────────────────
  _legR = new THREE.Group();
  _legR.position.set(0.18, 0.64, 0);

  const rHip   = new THREE.Mesh(new THREE.SphereGeometry(0.135, 7, 7), pants);
  const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.45, 0.23), pants);
  rThigh.position.y = -0.225;
  const rKnee  = new THREE.Mesh(new THREE.SphereGeometry(0.120, 7, 7), pants);
  rKnee.position.y  = -0.46;
  const rShin  = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.40, 0.20), pants);
  rShin.position.y  = -0.65;
  const rShoe  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.115, 0.36), shoe);
  rShoe.position.set(0, -0.875, 0.04);
  _legR.add(rHip, rThigh, rKnee, rShin, rShoe);

  // ─ Assemble ──────────────────────────────────────────────────────
  _root.add(headG, neck, torso, pocket, beltMesh,
            _armL, _armR, _legL, _legR);

  _root.visible = false;
  scene.add(_root);
}

// ─────────────────────────────────────────────────────────────────────────
//  PRIVATE — Input Bindings
// ─────────────────────────────────────────────────────────────────────────

function _bindKeys() {
  // ── Keyboard ─────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (!_active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    _keys.w     = true; break;
      case 'KeyS': case 'ArrowDown':  _keys.s     = true; break;
      case 'KeyA': case 'ArrowLeft':  _keys.a     = true; break;
      case 'KeyD': case 'ArrowRight': _keys.d     = true; break;
      case 'Space':   e.preventDefault(); _keys.space = true;  break;
      case 'ShiftLeft': case 'ShiftRight': _keys.shift = true; break;
      case 'Escape':  exitPlayerMode(); break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    _keys.w     = false; break;
      case 'KeyS': case 'ArrowDown':  _keys.s     = false; break;
      case 'KeyA': case 'ArrowLeft':  _keys.a     = false; break;
      case 'KeyD': case 'ArrowRight': _keys.d     = false; break;
      case 'Space':    _keys.space = false; break;
      case 'ShiftLeft': case 'ShiftRight': _keys.shift = false; break;
    }
  });

  // ── Mouse look (pointer lock) ─────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    if (!_active) return;
    const locked =
      document.pointerLockElement         === document.getElementById('c') ||
      document.mozPointerLockElement      === document.getElementById('c') ||
      document.webkitPointerLockElement   === document.getElementById('c');
    if (!locked) return;

    _yaw   -= e.movementX * MOUSE_SENS;
    _pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH, _pitch + e.movementY * MOUSE_SENS));
  });

  // ── Click canvas to re-lock pointer ──────────────────────────────
  document.getElementById('c')?.addEventListener('click', () => {
    if (_active) {
      const c = document.getElementById('c');
      (c.requestPointerLock || c.mozRequestPointerLock ||
       c.webkitRequestPointerLock)?.call(c);
    }
  });

  // ── Touch controls for mobile ─────────────────────────────────────
  _setupMobileControls();
}

// ─────────────────────────────────────────────────────────────────────────
//  PRIVATE — Mobile virtual joystick / buttons
// ─────────────────────────────────────────────────────────────────────────

function _setupMobileControls() {
  const joyEl   = document.getElementById('mobile-joy');
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
      const dist = Math.sqrt(dx * dx + dy * dy);
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
  window.addEventListener('touchend',    _joyEnd);
  window.addEventListener('touchcancel', _joyEnd);

  // Jump button
  document.getElementById('mobile-jump')?.addEventListener('touchstart', (e) => {
    e.preventDefault(); _keys.space = true;
  }, { passive: false });
  document.getElementById('mobile-jump')?.addEventListener('touchend', () => {
    _keys.space = false;
  });

  // Look via swipe on right half of screen
  let lookPrev = null, lookId2 = null;
  window.addEventListener('touchstart', (e) => {
    if (!_active) return;
    for (const t of e.changedTouches) {
      if (t.clientX > window.innerWidth * 0.55 && lookId2 === null) {
        lookId2  = t.identifier;
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
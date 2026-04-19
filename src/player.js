/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  player.js  —  Roblox R6-style character                         ║
 * ║  Public API: initPlayer · updatePlayer                           ║
 * ║              isPlayerActive · enterPlayerMode · exitPlayerMode   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as THREE from 'three';
import { scene, camera } from './scene.js';

// ─────────────────────────────────────────────────────────────────────────
// TUNABLES
// ─────────────────────────────────────────────────────────────────────────
const WALK_SPEED  = 0.20;
const RUN_SPEED   = 0.50;
const GRAVITY     = -0.028;
const JUMP_VEL    = 0.38;
const GROUND_Y    = 0.0;
const CAM_HEIGHT  = 4.2;
const CAM_DIST    = 7.0;
const CAM_LERP    = 0.10;
const MAX_PITCH   =  0.55;
const MIN_PITCH   = -0.42;
const MOUSE_SENS  = 0.0028;

// ─────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────
let _active   = false;
let _yaw      = Math.PI;
let _pitch    = 0.18;
let _velY     = 0;
let _onGround = true;
let _walkT    = 0;
let _moving   = false;

const _pos     = new THREE.Vector3(0, 0, 22);
const _camPos  = new THREE.Vector3();
const _camLook = new THREE.Vector3();

const _keys = { w:false, s:false, a:false, d:false, space:false, shift:false };

// ─────────────────────────────────────────────────────────────────────────
// CHARACTER PARTS  (filled in by _buildCharacter)
// ─────────────────────────────────────────────────────────────────────────
let _root;
let _head;           // full head group — rotates for pitch look
let _torso;          // torso group
let _armLG, _armRG;  // arm groups — pivot at shoulder (top of arm)
let _legLG, _legRG;  // leg groups — pivot at hip joint
let _tool;           // optional held prop (right hand child)
let _shadow;

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────
export function initPlayer() {
  _buildCharacter();
  _bindKeys();
}

export function isPlayerActive() { return _active; }

export function enterPlayerMode() {
  _active = true;
  _root.visible = true;
  _pos.set(0, 0, 22);
  _yaw = Math.PI; _pitch = 0.18; _velY = 0; _walkT = 0;
  _camPos.set(
    _pos.x + Math.sin(_yaw) * CAM_DIST,
    _pos.y + CAM_HEIGHT,
    _pos.z + Math.cos(_yaw) * CAM_DIST
  );
  _toggleHud(true);
  const c = document.getElementById('c');
  (c.requestPointerLock || c.mozRequestPointerLock)?.call(c);
}

export function exitPlayerMode() {
  _active = false;
  _root.visible = false;
  _toggleHud(false);
  document.exitPointerLock?.();
}

function _toggleHud(on) {
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.style.display = v; };
  s('player-hud',  on ? 'flex'  : 'none');
  s('player-btn',  on ? 'none'  : 'flex');
  s('hint',        on ? 'none'  : 'block');
  s('legend',      on ? 'none'  : 'block');
  s('compass',     on ? 'none'  : 'flex');
}

// ─────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────
export function updatePlayer() {
  if (!_active) return;

  const speed = _keys.shift ? RUN_SPEED : WALK_SPEED;

  let dx = 0, dz = 0;
  if (_keys.w) { dx -= Math.sin(_yaw); dz -= Math.cos(_yaw); }
  if (_keys.s) { dx += Math.sin(_yaw); dz += Math.cos(_yaw); }
  if (_keys.a) { dx -= Math.cos(_yaw); dz += Math.sin(_yaw); }
  if (_keys.d) { dx += Math.cos(_yaw); dz -= Math.sin(_yaw); }

  _moving = (dx !== 0 || dz !== 0);

  if (_moving) {
    const len = Math.hypot(dx, dz);
    _pos.x += (dx / len) * speed;
    _pos.z += (dz / len) * speed;
    _walkT += _keys.shift ? 0.145 : 0.088;
  }

  // Jump / gravity
  if (_keys.space && _onGround) { _velY = JUMP_VEL; _onGround = false; }
  _velY += GRAVITY;
  _pos.y += _velY;
  if (_pos.y <= GROUND_Y) { _pos.y = GROUND_Y; _velY = 0; _onGround = true; }

  // Root position
  _root.position.copy(_pos);

  // Body turns to face movement direction (smooth)
  if (_moving) {
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - _root.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    _root.rotation.y += diff * 0.20;
  }

  // Head always faces camera direction (independent of body)
  if (_head) {
    const bodyY = _root.rotation.y;
    _head.rotation.y  = _yaw - bodyY;          // horizontal face-toward-cam
    _head.rotation.x  = -_pitch * 0.5;         // tilt with camera pitch
  }

  // Animate limbs
  _animateLimbs();

  // Breathing bob (subtle, idle only)
  const breath = Math.sin(Date.now() * 0.0022) * 0.012;
  if (_torso) _torso.position.y = _moving ? 0 : breath;
  if (_head)  _head.position.y  = (CHAR.headY) + (_moving ? 0 : breath * 1.5);

  // Camera: smooth follow
  const jumpLift = (_pos.y > 0.1) ? _pos.y * 0.6 : 0;
  const tx = _pos.x + Math.sin(_yaw) * CAM_DIST;
  const ty = _pos.y + CAM_HEIGHT + jumpLift;
  const tz = _pos.z + Math.cos(_yaw) * CAM_DIST;
  _camPos.x += (tx - _camPos.x) * CAM_LERP;
  _camPos.y += (ty - _camPos.y) * CAM_LERP;
  _camPos.z += (tz - _camPos.z) * CAM_LERP;
  camera.position.copy(_camPos);

  _camLook.set(_pos.x, _pos.y + 1.5, _pos.z);
  camera.lookAt(_camLook);
  camera.rotateX(-_pitch * 0.22);

  // Shadow
  if (_shadow) {
    _shadow.position.y = -_pos.y + 0.02;
    _shadow.material.opacity = Math.max(0.05, 0.28 - _pos.y * 0.08);
    const sc = Math.max(0.5, 1 - _pos.y * 0.05);
    _shadow.scale.set(sc, 1, sc);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// LIMB ANIMATION  — Roblox R6 style: whole-limb rotation at joint pivot
//  No knee/elbow sub-pivots = no "polio" look
// ─────────────────────────────────────────────────────────────────────────
function _animateLimbs() {
  const t    = _walkT;
  const amp  = _moving ? (_keys.shift ? 0.78 : 0.50) : 0;
  const freq = 6.5;
  const swing = Math.sin(t * freq) * amp;

  // Legs: opposite phase
  if (_legLG) _legLG.rotation.x =  swing;
  if (_legRG) _legRG.rotation.x = -swing;

  // Arms: opposite to legs (counter-swing = natural walk)
  if (_armLG) _armLG.rotation.x = -swing * 0.65;
  if (_armRG) _armRG.rotation.x =  swing * 0.65;

  // Idle pose
  if (!_moving) {
    const b = Math.sin(Date.now() * 0.0022) * 0.015;
    if (_armLG) { _armLG.rotation.x = 0.04; _armLG.rotation.z =  0.08 + b; }
    if (_armRG) { _armRG.rotation.x = 0.04; _armRG.rotation.z = -0.08 - b; }
    if (_legLG) { _legLG.rotation.x = 0; }
    if (_legRG) { _legRG.rotation.x = 0; }
  } else {
    // Running: slight side-lean of arms
    if (_armLG) _armLG.rotation.z = 0.05;
    if (_armRG) _armRG.rotation.z = -0.05;
  }

  // Jump: raise arms on take-off
  if (!_onGround && _velY > 0.05) {
    if (_armLG) _armLG.rotation.x = -0.85;
    if (_armRG) _armRG.rotation.x = -0.85;
    if (_legLG) _legLG.rotation.x = -0.25;
    if (_legRG) _legRG.rotation.x =  0.25;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CHARACTER PROPORTIONS  (all in scene units = metres)
//
//   Roblox-inspired R6 body — big square head, block limbs, clean look
//   Total height: ~2.05 units
//
//   y=0        → floor (feet)
//   y=0→0.85   → legs
//   y=0.85→1.5 → torso
//   y=1.5→1.58 → neck
//   y=1.58→2.08→ head centre y=1.83
// ─────────────────────────────────────────────────────────────────────────
const CHAR = {
  // Torso
  torsoW: 0.58,  torsoH: 0.65,  torsoD: 0.28,
  torsoY: 1.175, // centre
  // Shoulder: top of torso
  shoulderY: 1.50,
  shoulderX: 0.41,
  // Arm: one rectangular piece, pivot at top centre
  armW: 0.24, armH: 0.62, armD: 0.24,
  // Hip: bottom of torso
  hipY:  0.86,
  hipX:  0.15,
  // Leg: one rectangular piece, pivot at top centre
  legW: 0.27, legH: 0.85, legD: 0.27,
  // Head
  headY: 1.83, // centre of head group
  headW: 0.50, headH: 0.50, headD: 0.50,
};

// ─────────────────────────────────────────────────────────────────────────
// MATERIALS — cool university student look
// Navy jacket + white shirt collar + dark jeans + white sneakers
// ─────────────────────────────────────────────────────────────────────────
function mkMat(col, em=0, emI=0) {
  return new THREE.MeshLambertMaterial({ color:col, emissive:em, emissiveIntensity:emI });
}

const MAT = {
  skin:    mkMat(0xf5c9a0),
  skinDk:  mkMat(0xe8b888),
  jacket:  mkMat(0x1a2a4a),          // dark navy jacket
  jacketL: mkMat(0x22376a),          // slightly lighter jacket
  stripe:  mkMat(0xe05520),          // orange accent stripe
  collar:  mkMat(0xf5f5f5),          // white shirt collar visible
  jeans:   mkMat(0x233050),          // dark blue jeans
  jeansD:  mkMat(0x1a2540),          // darker jeans (shoe area)
  shoe:    mkMat(0xfafafa),          // white sneakers
  shoeS:   mkMat(0xdddddd),          // shoe sole — slight grey
  cap:     mkMat(0xe05520),          // orange cap
  capB:    mkMat(0xc03e12),          // cap brim
  hair:    mkMat(0x110a04),          // very dark hair
  eyeW:    mkMat(0xffffff),
  eyeB:    mkMat(0x0a0a20),
  pupil:   mkMat(0x000000),
  smile:   mkMat(0xcc7755),
  gold:    mkMat(0xd4a520),          // belt buckle / watch
  belt:    mkMat(0x0a0a0a),
  zip:     mkMat(0x888888),
  logo:    mkMat(0xffffff, 0xffffff, 0.3),  // glowing logo on jacket
};

// box helper
const B = (w,h,d,m,x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
  me.position.set(x,y,z);
  if(rx||ry||rz) me.rotation.set(rx,ry,rz);
  me.castShadow = me.receiveShadow = true;
  return me;
};
const CY = (rt,rb,h,s,m,x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s), m);
  me.position.set(x,y,z);
  if(rx||ry||rz) me.rotation.set(rx,ry,rz);
  me.castShadow = true;
  return me;
};
const SP = (r,s,m,x=0,y=0,z=0) => {
  const me = new THREE.Mesh(new THREE.SphereGeometry(r,s,s), m);
  me.position.set(x,y,z);
  return me;
};

// ─────────────────────────────────────────────────────────────────────────
// BUILD CHARACTER
// ─────────────────────────────────────────────────────────────────────────
function _buildCharacter() {
  _root = new THREE.Group();

  // ══════════════════════════════════════════
  // 1. LEGS  (pivot group at hip joint Y)
  //    geometry hangs downward from y=0 in group space
  // ══════════════════════════════════════════
  const buildLeg = (side) => {
    const g = new THREE.Group();
    const {legW:lw, legH:lh, legD:ld, hipY, hipX} = CHAR;

    // Place group at hip joint
    g.position.set(side * hipX, hipY, 0);

    // Upper leg (jeans — top half)
    g.add(B(lw, lh*0.52, ld, MAT.jeans,   0, -lh*0.26, 0));
    // Lower leg (darker jeans)
    g.add(B(lw, lh*0.42, ld, MAT.jeansD,  0, -lh*0.71, 0));

    // Knee highlight
    g.add(B(lw+0.01, 0.06, ld+0.01, MAT.jacketL, 0, -lh*0.50, 0));

    // SHOE  (white, extends slightly forward)
    g.add(B(lw+0.02, 0.10, ld+0.08, MAT.shoe,    0,  -lh+0.06, 0.04));
    g.add(B(lw+0.01, 0.06, ld+0.05, MAT.shoeS,   0,  -lh+0.00, 0.03));

    // Shoe accent stripe
    g.add(B(lw+0.03, 0.03, ld+0.09, MAT.stripe,  0,  -lh+0.10, 0.04));

    return g;
  };

  _legLG = buildLeg(-1);
  _legRG = buildLeg( 1);
  _root.add(_legLG, _legRG);

  // ══════════════════════════════════════════
  // 2. TORSO GROUP  (stationary, centred at torsoY)
  // ══════════════════════════════════════════
  _torso = new THREE.Group();
  const {torsoW:tw, torsoH:th, torsoD:td, torsoY:ty} = CHAR;

  // Main jacket body
  _torso.add(B(tw,     th,     td,     MAT.jacket,  0, ty,  0));

  // Collar / shirt visible at neck (white strip)
  _torso.add(B(tw*0.5, 0.08,  td+0.01, MAT.collar,  0, ty+th*0.46, 0));

  // Jacket zipper line
  _torso.add(B(0.025,  th*0.7, td+0.01, MAT.zip,    0, ty-0.05, 0));

  // Orange side stripe on jacket (left + right)
  _torso.add(B(0.045, th,     td+0.01, MAT.stripe,  tw*0.44, ty, 0));
  _torso.add(B(0.045, th,     td+0.01, MAT.stripe, -tw*0.44, ty, 0));

  // University logo on chest (small glowing white square)
  _torso.add(B(0.12,  0.10,  td+0.015, MAT.logo,   -tw*0.22, ty+0.08, 0));

  // Pocket on chest (right)
  _torso.add(B(0.14, 0.11, td+0.01, MAT.jacketL,   tw*0.20, ty+0.10, 0));
  _torso.add(B(0.12, 0.01, td+0.02, MAT.zip,        tw*0.20, ty+0.05, 0));

  // Belt at waist bottom
  _torso.add(B(tw+0.01, 0.07, td+0.01, MAT.belt,    0, ty-th*0.44, 0));
  _torso.add(B(0.12,    0.12, td+0.02, MAT.gold,     0, ty-th*0.44, 0));  // buckle

  // Shoulder ridge (overhang at top of each shoulder)
  _torso.add(B(tw+0.05, 0.08, td+0.02, MAT.jacket, 0, ty+th*0.48, 0));

  // Small arm/shoulder round at each side
  _torso.add(SP(0.14, 10, MAT.jacket, -CHAR.shoulderX, CHAR.shoulderY, 0));
  _torso.add(SP(0.14, 10, MAT.jacket,  CHAR.shoulderX, CHAR.shoulderY, 0));

  _root.add(_torso);

  // ══════════════════════════════════════════
  // 3. ARMS  (pivot at shoulder — top of arm group)
  //    geometry hangs downward
  // ══════════════════════════════════════════
  const buildArm = (side) => {
    const g = new THREE.Group();
    const {armW:aw, armH:ah, armD:ad, shoulderX:sx, shoulderY:sy} = CHAR;

    g.position.set(side * sx, sy, 0);

    // Upper arm (jacket)
    g.add(B(aw,      ah*0.55, ad,      MAT.jacket,  0, -ah*0.275, 0));
    // Elbow round
    g.add(SP(aw*0.52, 8, MAT.jacketL, 0, -ah*0.55, 0));
    // Forearm (skin showing — pushed-up sleeve vibe)
    g.add(B(aw*0.88, ah*0.38, ad*0.88, MAT.skin,   0, -ah*0.75,  0));
    // Wrist
    g.add(SP(aw*0.42, 8, MAT.skinDk, 0, -ah*0.93, 0));
    // Hand (blocky Roblox hand)
    g.add(B(aw*0.94, ah*0.15, ad,     MAT.skin,    0, -ah+0.02,  0));

    // Orange jacket stripe on upper arm
    g.add(B(aw+0.01, 0.04,  ad+0.01, MAT.stripe,   0, -ah*0.10, 0));

    // Watch on left wrist
    if (side === -1) {
      g.add(B(aw*0.95+0.04, 0.05, ad*0.95+0.04, MAT.gold, 0, -ah*0.88, 0));
      g.add(B(aw*0.45,      0.04, ad*0.45,       MAT.eyeB, 0, -ah*0.88, (ad*0.95+0.04)/2+0.01));
    }

    return g;
  };

  _armLG = buildArm(-1);
  _armRG = buildArm( 1);
  _root.add(_armLG, _armRG);

  // ══════════════════════════════════════════
  // 4. NECK
  // ══════════════════════════════════════════
  _root.add(B(0.18, 0.13, 0.20, MAT.skin, 0, CHAR.shoulderY + 0.09, 0));

  // ══════════════════════════════════════════
  // 5. HEAD GROUP
  //    pivot / position = head centre
  // ══════════════════════════════════════════
  _head = new THREE.Group();
  _head.position.set(0, CHAR.headY, 0);

  const {headW:hw, headH:hh, headD:hd} = CHAR;

  // ── Skull (main block) ─────────────────────────────────────────────
  _head.add(B(hw,    hh,    hd,    MAT.skin,   0, 0,  0));

  // ── Hair top (cap-style flat coverage) ─────────────────────────────
  _head.add(B(hw+0.02, 0.06, hd+0.01, MAT.hair,  0, hh*0.47, 0));
  // Hair back
  _head.add(B(hw+0.01, hh*0.65, 0.04, MAT.hair,  0, 0,  -hd*0.49));
  // Hair sides (small tufts at temple)
  _head.add(B(0.04, hh*0.50, hd*0.5, MAT.hair, -hw*0.50, 0.05, -hd*0.15));
  _head.add(B(0.04, hh*0.50, hd*0.5, MAT.hair,  hw*0.50, 0.05, -hd*0.15));

  // ── Ears ───────────────────────────────────────────────────────────
  _head.add(B(0.04, 0.12, 0.08, MAT.skin, -hw*0.52, 0.02, 0));
  _head.add(B(0.04, 0.12, 0.08, MAT.skin,  hw*0.52, 0.02, 0));

  // ── Eyes  (Roblox style: white block + dark pupil) ─────────────────
  //  Left eye
  _head.add(B(0.12, 0.10, 0.03, MAT.eyeW, -hw*0.22, hh*0.10, hd*0.51));
  _head.add(B(0.06, 0.08, 0.03, MAT.eyeB, -hw*0.22, hh*0.10, hd*0.52));
  _head.add(B(0.03, 0.04, 0.03, MAT.collar, -hw*0.19, hh*0.12, hd*0.53)); // eye shine
  //  Right eye
  _head.add(B(0.12, 0.10, 0.03, MAT.eyeW,  hw*0.22, hh*0.10, hd*0.51));
  _head.add(B(0.06, 0.08, 0.03, MAT.eyeB,  hw*0.22, hh*0.10, hd*0.52));
  _head.add(B(0.03, 0.04, 0.03, MAT.collar, hw*0.25, hh*0.12, hd*0.53));

  // ── Eyebrows ───────────────────────────────────────────────────────
  _head.add(B(0.13, 0.03, 0.03, MAT.hair, -hw*0.22, hh*0.19, hd*0.51));
  _head.add(B(0.13, 0.03, 0.03, MAT.hair,  hw*0.22, hh*0.19, hd*0.51));

  // ── Nose  (small flat bump) ────────────────────────────────────────
  _head.add(B(0.05, 0.05, 0.04, MAT.skinDk, 0, -hh*0.04, hd*0.52));

  // ── Mouth  (Roblox smile — two angled white blocks) ────────────────
  _head.add(B(0.05, 0.02, 0.03, MAT.eyeB,  -0.04, -hh*0.20, hd*0.515, 0, 0,  0.45));
  _head.add(B(0.05, 0.02, 0.03, MAT.eyeB,   0.04, -hh*0.20, hd*0.515, 0, 0, -0.45));
  _head.add(B(0.06, 0.02, 0.03, MAT.eyeB,   0,    -hh*0.22, hd*0.515));  // bottom

  // ── CAP  (orange with brim — very Roblox) ─────────────────────────
  // Cap body (sits on top of head, slightly back)
  _head.add(B(hw+0.06, 0.18, hd+0.04, MAT.cap,  0,    hh*0.46+0.09,  -0.02));
  _head.add(B(hw+0.04, 0.14, hd*0.35, MAT.cap,  0,    hh*0.42,       -hd*0.30));
  // Brim (extends forward)
  _head.add(B(hw+0.04, 0.04, hd*0.55, MAT.capB, 0,    hh*0.38,        hd*0.45));
  // Cap button on top
  _head.add(B(0.06,    0.04, 0.06,    MAT.capB,  0,    hh*0.55+0.06,  -0.02));
  // Stripe on cap
  _head.add(B(hw+0.07, 0.04, 0.03,    MAT.collar, 0,   hh*0.46,       hd*0.18));

  _root.add(_head);

  // ══════════════════════════════════════════
  // 6. GROUND SHADOW  (blob under character)
  // ══════════════════════════════════════════
  _shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.25 })
  );
  _shadow.rotation.x = -Math.PI / 2;
  _shadow.position.y = 0.01;
  _root.add(_shadow);

  // ══════════════════════════════════════════
  // 7. HELD ITEM  — Roblox-style tool in right hand
  //    (backpack / satchel aesthetic)
  // ══════════════════════════════════════════
  // No tool by default — add items via addTool()

  _root.visible = false;
  scene.add(_root);
}

// ─────────────────────────────────────────────────────────────────────────
// OPTIONAL: add a prop to the right hand (called from outside)
// ─────────────────────────────────────────────────────────────────────────
export function setTool(mesh) {
  if (_tool && _armRG) _armRG.remove(_tool);
  _tool = mesh;
  if (mesh && _armRG) {
    mesh.position.set(0, -CHAR.armH + 0.06, 0.16);
    _armRG.add(mesh);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────
function _bindKeys() {
  window.addEventListener('keydown', e => {
    if (!_active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':              _keys.w     = true;  break;
      case 'KeyS': case 'ArrowDown':            _keys.s     = true;  break;
      case 'KeyA': case 'ArrowLeft':            _keys.a     = true;  break;
      case 'KeyD': case 'ArrowRight':           _keys.d     = true;  break;
      case 'Space':  e.preventDefault();        _keys.space = true;  break;
      case 'ShiftLeft': case 'ShiftRight':      _keys.shift = true;  break;
      case 'Escape': exitPlayerMode();          break;
    }
  });
  window.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':              _keys.w     = false; break;
      case 'KeyS': case 'ArrowDown':            _keys.s     = false; break;
      case 'KeyA': case 'ArrowLeft':            _keys.a     = false; break;
      case 'KeyD': case 'ArrowRight':           _keys.d     = false; break;
      case 'Space':                             _keys.space = false; break;
      case 'ShiftLeft': case 'ShiftRight':      _keys.shift = false; break;
    }
  });

  document.addEventListener('mousemove', e => {
    if (!_active) return;
    const c = document.getElementById('c');
    const locked =
      document.pointerLockElement === c ||
      document.mozPointerLockElement === c;
    if (!locked) return;
    _yaw   -= e.movementX * MOUSE_SENS;
    _pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH, _pitch + e.movementY * MOUSE_SENS));
  });

  document.getElementById('c')?.addEventListener('click', () => {
    if (!_active) return;
    const c = document.getElementById('c');
    (c.requestPointerLock || c.mozRequestPointerLock)?.call(c);
  });

  _setupMobileControls();
}

// ─────────────────────────────────────────────────────────────────────────
// MOBILE CONTROLS
// ─────────────────────────────────────────────────────────────────────────
function _setupMobileControls() {
  const joyEl   = document.getElementById('mobile-joy');
  const joyKnob = document.getElementById('mobile-joy-knob');
  if (!joyEl || !joyKnob) return;

  const DEAD = 12, MAX_R = 45;
  let joyOrigin = null, joyId = null;

  joyEl.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyOrigin = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (!joyOrigin) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const dx = t.clientX - joyOrigin.x, dy = t.clientY - joyOrigin.y;
      const dist = Math.hypot(dx, dy), cl = Math.min(dist, MAX_R);
      const nx = dist > 0 ? (dx / dist) * cl : 0;
      const ny = dist > 0 ? (dy / dist) * cl : 0;
      joyKnob.style.transform = `translate(${nx}px,${ny}px)`;
      _keys.w = dy < -DEAD; _keys.s = dy > DEAD;
      _keys.a = dx < -DEAD; _keys.d = dx > DEAD;
    }
  }, { passive: false });

  const _joyEnd = () => {
    joyOrigin = null; joyId = null;
    joyKnob.style.transform = 'translate(0,0)';
    _keys.w = _keys.s = _keys.a = _keys.d = false;
  };
  window.addEventListener('touchend',   _joyEnd);
  window.addEventListener('touchcancel',_joyEnd);

  document.getElementById('mobile-jump')?.addEventListener('touchstart', e => {
    e.preventDefault(); _keys.space = true;
  }, { passive: false });
  document.getElementById('mobile-jump')?.addEventListener('touchend', () => {
    _keys.space = false;
  });

  let lookPrev = null, lookId = null;
  window.addEventListener('touchstart', e => {
    if (!_active) return;
    for (const t of e.changedTouches) {
      if (t.clientX > window.innerWidth * 0.55 && lookId === null) {
        lookId = t.identifier;
        lookPrev = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (!_active || lookId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookId) continue;
      _yaw   -= (t.clientX - lookPrev.x) * 0.004;
      _pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH,
                  _pitch + (t.clientY - lookPrev.y) * 0.004));
      lookPrev = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });
  window.addEventListener('touchend', e => {
    for (const t of e.changedTouches)
      if (t.identifier === lookId) lookId = null;
  });
}
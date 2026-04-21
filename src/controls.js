/**
 * controls.js  —  Blender / Unreal Engine style viewport camera
 * ─────────────────────────────────────────────────────────────
 *  Right-click drag       →  Orbit  (Unreal style)
 *  Middle-click drag      →  Orbit  (Blender style)
 *  Shift + Middle drag    →  Pan    (Blender style)
 *  Shift + Right drag     →  Pan
 *  Scroll wheel           →  Zoom in / out
 *  F key (via devtool)    →  Focus on selection  (controls.target + controls.update)
 *
 *  All orbit/pan/zoom is suppressed automatically when:
 *    • Player mode is active            (isPlayerActive())
 *    • A TC gizmo is being dragged      (!window._dtCanOrbit())
 *    • The cursor is over a UI panel    (event path check)
 *
 *  Smoothing: every value eases toward its target each frame (damping).
 *  Feel: identical to Blender's Middle-mouse orbit.
 */

import { orbit, updateCam, camera, controls } from './scene.js';
import { isPlayerActive } from './player.js';

// ─── Tuning ──────────────────────────────────────────────────────────────────
const ORBIT_SPEED  = 0.006;   // rad / px
const PAN_SPEED    = 0.06;    // world-units / px  (scales with zoom)
const ZOOM_SPEED   = 0.08;    // fraction of r per scroll tick
const DAMP         = 0.12;    // 0 = instant, 1 = never arrives (0.10–0.15 feels Blender-ish)
const MIN_PHI      = 0.08;    // don't flip over the pole
const MAX_PHI      = Math.PI * 0.49;
const MIN_R        = 8;
const MAX_R        = 380;

// ─── Internal state ──────────────────────────────────────────────────────────

// "Target" values (what we want to reach)
const T = {
  theta: orbit.theta,
  phi:   orbit.phi,
  r:     orbit.r,
  tx:    orbit.tx,
  ty:    orbit.ty,
  tz:    orbit.tz,
};

// "Current" values (smoothed — written to orbit each frame)
const C = { ...T };

// Mouse tracking
let _dragging   = false;
let _panMode    = false;
let _lastX      = 0;
let _lastY      = 0;
let _button     = -1;   // which button started the drag

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _canAct() {
  if (isPlayerActive()) return false;
  if (typeof window._dtCanOrbit === 'function' && !window._dtCanOrbit()) return false;
  return true;
}

function _isOverUI(e) {
  // Allow events that originate directly on the canvas
  return e.target !== document.querySelector('canvas#c') &&
         e.target.tagName !== 'CANVAS';
}

// ─── Pointer events ──────────────────────────────────────────────────────────

function _onPointerDown(e) {
  if (!_canAct()) return;
  if (_isOverUI(e)) return;

  // Right-click (button 2) OR Middle-click (button 1)
  if (e.button !== 1 && e.button !== 2) return;

  e.preventDefault();
  _dragging = true;
  _button   = e.button;
  _lastX    = e.clientX;
  _lastY    = e.clientY;

  // Pan mode: Middle + Shift  OR  Right + Shift
  _panMode = e.shiftKey;

  window.addEventListener('pointermove', _onPointerMove);
  window.addEventListener('pointerup',   _onPointerUp);
}

function _onPointerMove(e) {
  if (!_dragging) return;
  if (!_canAct()) { _stopDrag(); return; }

  const dx = e.clientX - _lastX;
  const dy = e.clientY - _lastY;
  _lastX = e.clientX;
  _lastY = e.clientY;

  // Re-check shift mid-drag to allow switching between orbit/pan
  _panMode = e.shiftKey;

  if (_panMode) {
    // ── PAN ──
    // Move the look-at target along the camera's local right and up axes
    // so panning feels like Blender: Shift+drag moves the view in screen space.
    const scale = (T.r / 80) * PAN_SPEED;  // pan scales with zoom distance

    // Camera right vector (world space) — perpendicular to view, horizontal
    const rightX =  Math.cos(T.theta);
    const rightZ = -Math.sin(T.theta);

    // Camera up vector (world space) — derived from theta and phi
    const upX = -Math.sin(T.theta) * Math.cos(T.phi);
    const upY =  Math.sin(T.phi);
    const upZ = -Math.cos(T.theta) * Math.cos(T.phi);

    // dx maps to the right vector; dy maps to the up vector
    // (screen Y increases downward, so dy>0 = drag down = pan down = subtract up)
    T.tx -= (dx * rightX + dy * upX) * scale;
    T.ty -= dy * upY * scale;
    T.tz -= (dx * rightZ + dy * upZ) * scale;
  } else {
    // ── ORBIT ──
    T.theta -= dx * ORBIT_SPEED;
    T.phi    = Math.max(MIN_PHI, Math.min(MAX_PHI, T.phi + dy * ORBIT_SPEED));
  }
}

function _onPointerUp(e) {
  if (e.button === _button) _stopDrag();
}

function _stopDrag() {
  _dragging = false;
  _button   = -1;
  window.removeEventListener('pointermove', _onPointerMove);
  window.removeEventListener('pointerup',   _onPointerUp);
}

// ─── Scroll / Zoom ───────────────────────────────────────────────────────────

function _onWheel(e) {
  if (!_canAct()) return;
  if (_isOverUI(e)) return;
  e.preventDefault();

  // Zoom toward / away — scale factor feels natural like Blender
  const delta = e.deltaY > 0 ? 1 : -1;
  T.r = Math.max(MIN_R, Math.min(MAX_R, T.r * (1 + delta * ZOOM_SPEED)));
}

// ─── Context menu suppression (right-click menu) ─────────────────────────────

function _onContextMenu(e) {
  if (!isPlayerActive()) e.preventDefault();
}

// ─── Frame update (call from animate loop) ───────────────────────────────────

export function handleControls() {
  if (isPlayerActive()) return;

  // Sync target from controls.target (devtool F-key sets this)
  if (controls.target) {
    T.tx = controls.target.x;
    T.ty = controls.target.y;
    T.tz = controls.target.z;
  }

  // Smooth damp toward targets
  C.theta = C.theta + (T.theta - C.theta) * DAMP * 6;
  C.phi   = C.phi   + (T.phi   - C.phi)   * DAMP * 6;
  C.r     = C.r     + (T.r     - C.r)     * DAMP * 6;
  C.tx    = C.tx    + (T.tx    - C.tx)    * DAMP * 6;
  C.ty    = C.ty    + (T.ty    - C.ty)    * DAMP * 6;
  C.tz    = C.tz    + (T.tz    - C.tz)    * DAMP * 6;

  // Write smoothed values to orbit object → updateCam reads them
  orbit.theta = C.theta;
  orbit.phi   = C.phi;
  orbit.r     = C.r;
  orbit.tx    = C.tx;
  orbit.ty    = C.ty;
  orbit.tz    = C.tz;

  updateCam();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const _canvas = document.querySelector('canvas#c');

_canvas?.addEventListener('pointerdown',  _onPointerDown);
_canvas?.addEventListener('wheel',        _onWheel,       { passive: false });
_canvas?.addEventListener('contextmenu',  _onContextMenu);

// Sync initial state in case devtool or main.js changes orbit before first frame
export function syncControls() {
  T.theta = orbit.theta;
  T.phi   = orbit.phi;
  T.r     = orbit.r;
  T.tx    = orbit.tx;
  T.ty    = orbit.ty;
  T.tz    = orbit.tz;
  Object.assign(C, T);
}

// ─── Quick-reference cheatsheet (shown in console) ───────────────────────────
console.log(
  '%c🎥 Viewport Controls\n' +
  'Right-drag / Middle-drag  →  Orbit\n' +
  'Shift + drag              →  Pan\n' +
  'Scroll wheel              →  Zoom\n' +
  'F key (select object)     →  Focus',
  'color:#88b8ff;font-size:12px;'
);
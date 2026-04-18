/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           devtool.js — Blender-Inspired Three.js Level Editor        ║
 * ║──────────────────────────────────────────────────────────────────────║
 * ║  Tools   : Select (V) | Move (G) | Rotate (R) | Scale (S)           ║
 * ║            Draw Wall (W) | Add Object (A)                            ║
 * ║  Editing : Ctrl+D Duplicate | Del Delete | Ctrl+Z Undo               ║
 * ║            Tab Cycle-Snap | F Focus | Shift+DblClick Straight Wall   ║
 * ║  Save    : File System API → directly writes to main.js              ║
 * ║            localStorage   → auto-saves every change                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * SETUP IN main.js:
 *   import { initDevTool } from './devtool.js';
 *   // ... your existing code ...
 *   initDevTool();                       // call at end of main.js
 *
 * SETUP IN scene.js – make sure you export:
 *   export { scene, camera, renderer, controls };  // controls = OrbitControls instance
 */

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, controls } from './scene.js';
import { mkGulmohar, mkPeepal }  from './utils/trees.js';
import { mkStreetLight }         from './utils/lights.js';
import { mkBench, mkCar }        from './utils/props.js';
import { mkWall }                from './utils/wall.js';


// ═══════════════════════════════════════════════════════════════════════
// §1  OBJECT DEFINITIONS  (add new spawnable types here)
// ═══════════════════════════════════════════════════════════════════════

const OBJ_DEFS = {
  gulmohar:    { icon: '🌳', label: 'Gulmohar',    group: 'Trees',  spawn: (x, z) => mkGulmohar(x, z, 0.85),      code: (p, r, s) => `mkGulmohar(${p.x}, ${p.z}, ${s.x.toFixed(2)});` },
  peepal:      { icon: '🌲', label: 'Peepal',      group: 'Trees',  spawn: (x, z) => mkPeepal(x, z, 0.9),         code: (p, r, s) => `mkPeepal(${p.x}, ${p.z}, ${s.x.toFixed(2)});` },
  streetlight: { icon: '💡', label: 'Street Light',group: 'Lights', spawn: (x, z) => mkStreetLight(x, z),         code: (p)       => `mkStreetLight(${p.x}, ${p.z});` },
  bench:       { icon: '🪑', label: 'Bench',       group: 'Props',  spawn: (x, z) => mkBench(x, z, 0),            code: (p, r)    => `mkBench(${p.x}, ${p.z}, ${r.y.toFixed(3)});` },
  car_red:     { icon: '🚗', label: 'Car (Red)',   group: 'Props',  spawn: (x, z) => mkCar(x, z, 0xcc3333),       code: (p)       => `mkCar(${p.x}, ${p.z}, 0xcc3333);` },
  car_blue:    { icon: '🚙', label: 'Car (Blue)',  group: 'Props',  spawn: (x, z) => mkCar(x, z, 0x3355cc),       code: (p)       => `mkCar(${p.x}, ${p.z}, 0x3355cc);` },
  car_white:   { icon: '🚐', label: 'Car (White)', group: 'Props',  spawn: (x, z) => mkCar(x, z, 0xffffff),       code: (p)       => `mkCar(${p.x}, ${p.z}, 0xffffff);` },
};


// ═══════════════════════════════════════════════════════════════════════
// §2  STATE
// ═══════════════════════════════════════════════════════════════════════

const STATE = {
  tool:          'select',   // select | translate | rotate | scale | wall | add
  objects:       [],         // { mesh, type, params } — only DevTool-placed objects
  selected:      [],         // array of meshes
  undoStack:     [],         // { snapshot } of STATE.objects params before action
  snapSize:      0.5,        // grid snap increment
  wallStart:     null,       // THREE.Vector3 or null
  pendingType:   null,       // type key to place next click
  fileHandle:    null,       // FileSystemFileHandle for linked main.js
  dirty:         false,
};


// ═══════════════════════════════════════════════════════════════════════
// §3  RAYCASTER HELPERS
// ═══════════════════════════════════════════════════════════════════════

const _raycaster   = new THREE.Raycaster();
const _mouse       = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _iPt         = new THREE.Vector3();

function getGroundPoint(event) {
  _mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
  _mouse.y = (event.clientY / window.innerHeight)  * -2 + 1;
  _raycaster.setFromCamera(_mouse, camera);
  _raycaster.ray.intersectPlane(_groundPlane, _iPt);
  return _iPt.clone();
}

function snapV(v) { return Math.round(v / STATE.snapSize) * STATE.snapSize; }
function fmt(n)   { return +parseFloat(n).toFixed(2); }


// ═══════════════════════════════════════════════════════════════════════
// §4  TRANSFORM CONTROLS
// ═══════════════════════════════════════════════════════════════════════

const TC = new TransformControls(camera, renderer.domElement);
TC.setSize(0.9);
TC.addEventListener('dragging-changed', e => {
  if (controls) controls.enabled = !e.value;
});
TC.addEventListener('objectChange', () => {
  _refreshSelectionBox();
  _updatePropsPanel();
  _scheduleAutoSave();
});
scene.add(TC);


// ═══════════════════════════════════════════════════════════════════════
// §5  SELECTION BOX HELPER
// ═══════════════════════════════════════════════════════════════════════

const _selBox = new THREE.BoxHelper(new THREE.Mesh(), 0x00d4ff);
_selBox.visible = false;
scene.add(_selBox);

function _refreshSelectionBox() {
  if (STATE.selected.length === 1) {
    _selBox.setFromObject(STATE.selected[0]);
    _selBox.visible = true;
  } else {
    _selBox.visible = false;
  }
}

function selectObject(mesh, additive = false) {
  if (!additive) {
    STATE.selected = [];
    TC.detach();
  }
  if (mesh) {
    // Walk up to find root registered object
    let root = mesh;
    while (root.parent && !STATE.objects.find(e => e.mesh === root)) root = root.parent;

    if (!STATE.selected.includes(root)) {
      STATE.selected.push(root);
    }
    if (STATE.selected.length === 1) {
      TC.attach(STATE.selected[0]);
    }
  }
  _refreshSelectionBox();
  _updatePropsPanel();
}

function clearSelection() {
  STATE.selected = [];
  TC.detach();
  _selBox.visible = false;
  _updatePropsPanel();
}


// ═══════════════════════════════════════════════════════════════════════
// §6  OBJECT REGISTRY
// ═══════════════════════════════════════════════════════════════════════

function _register(mesh, type, extraParams = {}) {
  STATE.objects.push({ mesh, type, params: extraParams, id: `${type}_${Date.now()}` });
  _updateCodePanel();
  _updateStatusBar();
}

function _unregister(mesh) {
  const idx = STATE.objects.findIndex(e => e.mesh === mesh);
  if (idx > -1) STATE.objects.splice(idx, 1);
  scene.remove(mesh);
  _updateCodePanel();
  _updateStatusBar();
}

function _spawnObject(type, x, z) {
  const def  = OBJ_DEFS[type];
  if (!def)  return null;
  _pushUndo();
  const mesh = def.spawn(fmt(x), fmt(z));
  _register(mesh, type, { spawnX: fmt(x), spawnZ: fmt(z) });
  return mesh;
}


// ═══════════════════════════════════════════════════════════════════════
// §7  WALL DRAWING
// ═══════════════════════════════════════════════════════════════════════

let _wallLine   = null;
let _wallMarker = null;

function _createWallGhost() {
  const mat  = new THREE.LineBasicMaterial({ color: 0x00d4ff });
  const geo  = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  _wallLine  = new THREE.Line(geo, mat);
  scene.add(_wallLine);

  const mGeo    = new THREE.SphereGeometry(0.3, 8, 8);
  const mMat    = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  _wallMarker   = new THREE.Mesh(mGeo, mMat);
  _wallMarker.position.set(STATE.wallStart.x, 0.4, STATE.wallStart.z);
  scene.add(_wallMarker);
}

function _updateWallGhost(end) {
  if (!_wallLine || !STATE.wallStart) return;
  const pos = _wallLine.geometry.attributes.position;
  pos.setXYZ(0, STATE.wallStart.x, 0.2, STATE.wallStart.z);
  pos.setXYZ(1, end.x,             0.2, end.z);
  pos.needsUpdate = true;

  const dx  = end.x - STATE.wallStart.x;
  const dz  = end.z - STATE.wallStart.z;
  const len = Math.sqrt(dx*dx + dz*dz);
  _setHUD(`📏 ${len.toFixed(2)} u`);
}

function _clearWallGhost() {
  if (_wallLine)   { scene.remove(_wallLine);   _wallLine = null; }
  if (_wallMarker) { scene.remove(_wallMarker); _wallMarker = null; }
  STATE.wallStart = null;
  _setHUD('');
}

function _finishWall(end) {
  const sx = STATE.wallStart.x, sz = STATE.wallStart.z;
  const ex = end.x, ez = end.z;
  _pushUndo();
  const mesh = mkWall(sx, sz, ex, ez);
  const dx = ex - sx, dz = ez - sz;
  _register(mesh, 'wall', { sx, sz, ex, ez, length: fmt(Math.sqrt(dx*dx + dz*dz)) });
  _clearWallGhost();
  toast('✅ Wall placed');
}


// ═══════════════════════════════════════════════════════════════════════
// §8  UNDO / REDO
// ═══════════════════════════════════════════════════════════════════════

function _pushUndo() {
  // Simple snapshot: save current object count
  STATE.undoStack.push(STATE.objects.length);
  if (STATE.undoStack.length > 50) STATE.undoStack.shift();
}

function undo() {
  if (STATE.objects.length === 0) return;
  const last = STATE.objects[STATE.objects.length - 1];
  _unregister(last.mesh);
  clearSelection();
  toast('↩ Undone');
}


// ═══════════════════════════════════════════════════════════════════════
// §9  CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════

const BLOCK_START = '// ── DevTool: Generated Objects START ──';
const BLOCK_END   = '// ── DevTool: Generated Objects END ──';

function _generateCode() {
  const lines = [BLOCK_START];
  for (const { mesh, type, params } of STATE.objects) {
    const p  = { x: fmt(mesh.position.x), y: fmt(mesh.position.y), z: fmt(mesh.position.z) };
    const r  = mesh.rotation;
    const s  = mesh.scale;
    if (type === 'wall') {
      lines.push(`mkWall(${params.sx}, ${params.sz}, ${params.ex}, ${params.ez});`);
    } else {
      const def = OBJ_DEFS[type];
      if (def) lines.push(def.code(p, r, s));
    }
  }
  lines.push(BLOCK_END);
  return lines.join('\n');
}

function _updateCodePanel() {
  const el = document.getElementById('dt-code-text');
  if (el) el.textContent = _generateCode();
  _scheduleAutoSave();
}


// ═══════════════════════════════════════════════════════════════════════
// §10  PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════

const LS_KEY = 'devtool_v2_scene';
let _saveTimer = null;

function _scheduleAutoSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveToLocalStorage, 1000);
}

function _saveToLocalStorage() {
  const data = STATE.objects.map(({ type, params, mesh }) => ({
    type, params,
    pos:   mesh.position.toArray(),
    rot:   [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
    scale: mesh.scale.toArray(),
  }));
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  _setFileStatus('💾 Auto-saved');
}

async function _linkFile() {
  if (!window.showOpenFilePicker) {
    toast('❌ File System API not supported (use Chrome/Edge)');
    return;
  }
  try {
    [STATE.fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
    });
    document.getElementById('dt-link-btn').textContent = `📎 ${STATE.fileHandle.name}`;
    toast(`✅ Linked: ${STATE.fileHandle.name}`);
  } catch { /* cancelled */ }
}

async function _saveToFile() {
  if (!STATE.fileHandle) { toast('⚠️ Link a .js file first!'); return; }
  try {
    const file    = await STATE.fileHandle.getFile();
    let content   = await file.text();
    const newBlock = _generateCode();
    const pattern  = new RegExp(
      `${BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'g'
    );
    if (content.match(pattern)) {
      content = content.replace(pattern, newBlock);
    } else {
      content += '\n\n' + newBlock + '\n';
    }
    const writable = await STATE.fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    _setFileStatus('✅ Saved to file!');
    toast('✅ Saved to file!');
  } catch (err) {
    toast(`❌ Save failed: ${err.message}`);
  }
}

function _setFileStatus(msg) {
  const el = document.getElementById('dt-file-status');
  if (el) { el.textContent = msg; setTimeout(() => { el.textContent = ''; }, 3000); }
}


// ═══════════════════════════════════════════════════════════════════════
// §11  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════════════════

function _updatePropsPanel() {
  const panel = document.getElementById('dt-props-body');
  if (!panel) return;

  if (STATE.selected.length === 0) {
    panel.innerHTML = `<div class="dt-empty">Nothing selected<br><span>Click an object<br>or place one from the library</span></div>`;
    return;
  }

  const mesh  = STATE.selected[0];
  const entry = STATE.objects.find(e => e.mesh === mesh);
  const p     = mesh.position;
  const r     = mesh.rotation;
  const s     = mesh.scale;

  const bbox = new THREE.Box3().setFromObject(mesh);
  const dim  = new THREE.Vector3();
  bbox.getSize(dim);

  panel.innerHTML = `
    <div class="dt-prop-section">
      <div class="dt-prop-tag">${entry ? (OBJ_DEFS[entry.type]?.icon || '⬛') + ' ' + (OBJ_DEFS[entry.type]?.label || entry.type) : 'Object'}</div>
      ${entry?.type === 'wall' ? `<div class="dt-dim-badge">Wall Length: <b>${entry.params.length ?? '?'} u</b></div>` : ''}
    </div>

    <div class="dt-prop-section">
      <div class="dt-prop-head">📐 Dimensions (read-only)</div>
      <div class="dt-dim-row">
        <span>W <b>${fmt(dim.x)}</b></span>
        <span>H <b>${fmt(dim.y)}</b></span>
        <span>D <b>${fmt(dim.z)}</b></span>
      </div>
    </div>

    <div class="dt-prop-section">
      <div class="dt-prop-head">📍 Position</div>
      ${_xyzFields('pos', fmt(p.x), fmt(p.y), fmt(p.z))}
    </div>

    <div class="dt-prop-section">
      <div class="dt-prop-head">🔄 Rotation (°)</div>
      ${_xyzFields('rot',
        fmt(THREE.MathUtils.radToDeg(r.x)),
        fmt(THREE.MathUtils.radToDeg(r.y)),
        fmt(THREE.MathUtils.radToDeg(r.z))
      )}
    </div>

    <div class="dt-prop-section">
      <div class="dt-prop-head">📏 Scale</div>
      ${_xyzFields('scale', fmt(s.x), fmt(s.y), fmt(s.z))}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;">
      <button class="dt-btn" onclick="window._dt.duplicate()">⧉ Duplicate</button>
      <button class="dt-btn dt-btn-danger" onclick="window._dt.deleteSelected()">🗑 Delete</button>
    </div>
  `;

  // Bind inputs
  panel.querySelectorAll('.dt-xyz-input').forEach(input => {
    input.addEventListener('change', () => {
      const val  = parseFloat(input.value);
      const prop = input.dataset.prop;
      const axis = input.dataset.axis;
      if (isNaN(val)) return;
      if (prop === 'pos')   mesh.position[axis] = val;
      if (prop === 'rot')   mesh.rotation[axis]  = THREE.MathUtils.degToRad(val);
      if (prop === 'scale') mesh.scale[axis]      = val;
      _refreshSelectionBox();
      _updateCodePanel();
    });
  });
}

function _xyzFields(prop, x, y, z) {
  return `<div class="dt-xyz-row">
    ${['x','y','z'].map((a, i) => `
      <label class="dt-xyz-col">
        <span>${a.toUpperCase()}</span>
        <input class="dt-xyz-input" data-prop="${prop}" data-axis="${a}" type="number" value="${[x,y,z][i]}" step="0.1">
      </label>
    `).join('')}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════
// §12  TOOL SWITCHING
// ═══════════════════════════════════════════════════════════════════════

function setTool(tool) {
  STATE.tool = tool;

  // Update toolbar highlight
  document.querySelectorAll('.dt-tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });

  // TransformControls mode
  if      (tool === 'translate') { TC.setMode('translate'); if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'rotate')    { TC.setMode('rotate');    if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'scale')     { TC.setMode('scale');     if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'select')    { TC.setMode('translate'); }
  else                           { TC.detach(); }

  // Cancel wall ghost if switching away
  if (tool !== 'wall' && STATE.wallStart) _clearWallGhost();

  // Show/hide add palette
  const palette = document.getElementById('dt-add-palette');
  if (palette) palette.style.display = tool === 'add' ? 'flex' : 'none';

  // HUD
  if (tool !== 'wall') _setHUD('');

  _updateStatusBar();
}

const KEY_TO_TOOL = { v: 'select', g: 'translate', r: 'rotate', s: 'scale', w: 'wall', a: 'add' };


// ═══════════════════════════════════════════════════════════════════════
// §13  STATUS BAR & HUD
// ═══════════════════════════════════════════════════════════════════════

function _updateStatusBar() {
  const el = document.getElementById('dt-statusbar');
  if (!el) return;
  const toolNames = { select:'SELECT ↖', translate:'MOVE ✥', rotate:'ROTATE ↻', scale:'SCALE ⊞', wall:'DRAW WALL █', add:'ADD OBJECT ＋' };
  el.querySelector('#dt-sb-tool').textContent    = toolNames[STATE.tool] || STATE.tool.toUpperCase();
  el.querySelector('#dt-sb-objects').textContent = `Objects: ${STATE.objects.length}`;
  el.querySelector('#dt-sb-snap').textContent    = `Snap: ${STATE.snapSize}`;
}

function _updateCursorPos(x, z) {
  const el = document.getElementById('dt-sb-cursor');
  if (el) el.textContent = `X: ${fmt(x)}  Z: ${fmt(z)}`;
}

function _setHUD(text) {
  const el = document.getElementById('dt-wall-hud');
  if (!el) return;
  el.textContent  = text;
  el.style.display = text ? 'block' : 'none';
}


// ═══════════════════════════════════════════════════════════════════════
// §14  MOUSE / KEYBOARD EVENTS
// ═══════════════════════════════════════════════════════════════════════

function _onMouseMove(e) {
  const pt = getGroundPoint(e);
  _updateCursorPos(snapV(pt.x), snapV(pt.z));

  if (STATE.tool === 'wall' && STATE.wallStart) {
    let ex = snapV(pt.x), ez = snapV(pt.z);
    if (e.shiftKey) {
      const dx = Math.abs(ex - STATE.wallStart.x), dz = Math.abs(ez - STATE.wallStart.z);
      dx > dz ? ez = STATE.wallStart.z : ex = STATE.wallStart.x;
    }
    _updateWallGhost(new THREE.Vector3(ex, 0, ez));
  }

  if (STATE.selected.length === 1) _refreshSelectionBox();
}

function _onClick(e) {
  if (e.detail > 1) return; // part of dblclick

  const tool = STATE.tool;
  const pt   = getGroundPoint(e);

  // Object selection
  if (['select', 'translate', 'rotate', 'scale'].includes(tool)) {
    if (TC.dragging) return;

    _mouse.x = (e.clientX / window.innerWidth)  *  2 - 1;
    _mouse.y = (e.clientY / window.innerHeight)  * -2 + 1;
    _raycaster.setFromCamera(_mouse, camera);

    const hits = _raycaster.intersectObjects(STATE.objects.map(o => o.mesh), true);
    if (hits.length) {
      let root = hits[0].object;
      while (root.parent && !STATE.objects.find(en => en.mesh === root)) root = root.parent;
      selectObject(root, e.ctrlKey || e.metaKey);
    } else {
      clearSelection();
    }
  }

  // Add object
  if (tool === 'add' && STATE.pendingType) {
    const x = snapV(pt.x), z = snapV(pt.z);
    const mesh = _spawnObject(STATE.pendingType, x, z);
    if (mesh) { selectObject(mesh); toast(`✅ ${OBJ_DEFS[STATE.pendingType]?.label} placed`); }
  }
}

function _onDblClick(e) {
  if (STATE.tool !== 'wall') return;

  const pt = getGroundPoint(e);
  let ex = snapV(pt.x), ez = snapV(pt.z);

  // Straight-line snap with Shift
  if (e.shiftKey && STATE.wallStart) {
    const dx = Math.abs(ex - STATE.wallStart.x), dz = Math.abs(ez - STATE.wallStart.z);
    dx > dz ? ez = STATE.wallStart.z : ex = STATE.wallStart.x;
  }

  if (!STATE.wallStart) {
    STATE.wallStart = new THREE.Vector3(ex, 0, ez);
    _createWallGhost();
    toast('🟠 Wall started — Dbl-click to finish | Shift: straight line');
  } else {
    _finishWall(new THREE.Vector3(ex, 0, ez));
  }
}

function _onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const key = e.key.toLowerCase();

  // Tool hotkeys (not combined with Ctrl)
  if (!e.ctrlKey && KEY_TO_TOOL[key]) { setTool(KEY_TO_TOOL[key]); return; }

  // Ctrl+Z Undo
  if (e.ctrlKey && key === 'z') { e.preventDefault(); undo(); return; }

  // Ctrl+D Duplicate
  if (e.ctrlKey && key === 'd') { e.preventDefault(); window._dt.duplicate(); return; }

  // Delete / Backspace
  if (key === 'delete' || key === 'backspace') { window._dt.deleteSelected(); return; }

  // Escape
  if (key === 'escape') {
    _clearWallGhost();
    clearSelection();
    STATE.pendingType = null;
    return;
  }

  // Tab — cycle snap size
  if (key === 'tab') {
    e.preventDefault();
    const sizes = [0.25, 0.5, 1.0, 2.0];
    STATE.snapSize = sizes[(sizes.indexOf(STATE.snapSize) + 1) % sizes.length];
    toast(`📐 Snap: ${STATE.snapSize}`);
    _updateStatusBar();
    return;
  }

  // F — focus on selected
  if (key === 'f' && STATE.selected.length) {
    if (controls) { controls.target.copy(STATE.selected[0].position); controls.update(); }
    return;
  }

  // X / Y / Z — constrain axis while using TransformControls
  if (['x','y','z'].includes(key) && !e.ctrlKey) {
    TC.showX = key === 'x'; TC.showY = key === 'y'; TC.showZ = key === 'z';
    return;
  }
  if (key === 'q') { TC.showX = true; TC.showY = true; TC.showZ = true; }
}


// ═══════════════════════════════════════════════════════════════════════
// §15  GLOBAL API  (accessible from HTML onclick and console)
// ═══════════════════════════════════════════════════════════════════════

window._dt = {
  deleteSelected() {
    if (!STATE.selected.length) return;
    _pushUndo();
    STATE.selected.forEach(m => _unregister(m));
    TC.detach();
    STATE.selected = [];
    _selBox.visible = false;
    _updatePropsPanel();
    toast('🗑 Deleted');
  },
  duplicate() {
    if (!STATE.selected.length) return;
    const mesh  = STATE.selected[0];
    const entry = STATE.objects.find(e => e.mesh === mesh);
    if (!entry || entry.type === 'wall') { toast('⚠️ Cannot duplicate this type'); return; }
    const newMesh = _spawnObject(entry.type, mesh.position.x + 2, mesh.position.z + 2);
    if (newMesh) { selectObject(newMesh); toast('⧉ Duplicated'); }
  },
  getCode: _generateCode,
  getState: () => STATE,
};


// ═══════════════════════════════════════════════════════════════════════
// §16  TOAST
// ═══════════════════════════════════════════════════════════════════════

let _toastTimer = null;
function toast(msg) {
  const el = document.getElementById('dt-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}


// ═══════════════════════════════════════════════════════════════════════
// §17  UI CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════

function _buildUI() {
  // ── Styles ────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --dt-bg:      #161616;
      --dt-panel:   #1e1e1e;
      --dt-border:  #333;
      --dt-accent:  #0099ff;
      --dt-text:    #c8c8c8;
      --dt-hover:   #2a2a2a;
      --dt-active:  #0066bb;
      --dt-danger:  #cc3333;
      --dt-success: #22aa55;
      --dt-warn:    #ddaa22;
    }
    #dt-root *, #dt-root *::before, #dt-root *::after { box-sizing: border-box; }
    #dt-root { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; color: var(--dt-text); }

    /* ── Left Toolbar ─────────────────────────────────── */
    #dt-toolbar {
      position: fixed; left: 10px; top: 50%; transform: translateY(-50%);
      background: var(--dt-panel); border: 1px solid var(--dt-border);
      border-radius: 12px; padding: 8px 6px; display: flex;
      flex-direction: column; gap: 2px; z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .dt-tool-btn {
      width: 38px; height: 38px; border-radius: 8px; border: none;
      background: transparent; color: var(--dt-text); font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.12s, color 0.12s; position: relative;
    }
    .dt-tool-btn:hover  { background: var(--dt-hover); }
    .dt-tool-btn.active { background: var(--dt-active); color: #fff; }
    .dt-tool-btn .dt-tt {
      display: none; position: absolute; left: 46px; top: 50%;
      transform: translateY(-50%); background: #111; color: #fff;
      padding: 4px 10px; border-radius: 6px; white-space: nowrap;
      font-size: 11px; pointer-events: none; border: 1px solid #333;
      z-index: 10000;
    }
    .dt-tool-btn:hover .dt-tt { display: block; }
    .dt-tb-sep { height: 1px; background: var(--dt-border); margin: 4px 2px; }

    /* ── Right Panel ─────────────────────────────────── */
    #dt-right {
      position: fixed; right: 0; top: 0; width: 230px; height: 100vh;
      background: var(--dt-panel); border-left: 1px solid var(--dt-border);
      display: flex; flex-direction: column; z-index: 9998; overflow: hidden;
      box-shadow: -4px 0 20px rgba(0,0,0,0.5);
    }
    .dt-panel-hdr {
      background: var(--dt-bg); padding: 8px 12px;
      font-size: 10px; font-weight: 700; color: #666;
      text-transform: uppercase; letter-spacing: 1.2px;
      border-bottom: 1px solid var(--dt-border); flex-shrink: 0;
    }
    #dt-props-body {
      flex: 1; overflow-y: auto; padding: 10px;
      scrollbar-width: thin; scrollbar-color: #333 transparent;
    }
    .dt-empty {
      color: #555; text-align: center; margin-top: 30px;
      line-height: 1.8; font-size: 12px;
    }
    .dt-empty span { font-size: 11px; color: #444; }
    .dt-prop-section { margin-bottom: 10px; }
    .dt-prop-head { font-size: 10px; color: #666; margin-bottom: 4px; letter-spacing: 0.5px; }
    .dt-prop-tag {
      display: inline-block; background: #2a2a2a; border: 1px solid #3a3a3a;
      border-radius: 4px; padding: 3px 8px; font-size: 12px; font-weight: 600; color: #ddd;
    }
    .dt-dim-badge {
      display: inline-block; margin-top: 4px; font-size: 11px;
      color: var(--dt-accent); background: rgba(0,153,255,0.08);
      border: 1px solid rgba(0,153,255,0.2); border-radius: 4px; padding: 2px 8px;
    }
    .dt-dim-row { display: flex; gap: 8px; font-size: 12px; color: #888; }
    .dt-dim-row span { flex: 1; background: #1a1a1a; padding: 4px 6px; border-radius: 4px; text-align: center; }
    .dt-dim-row b { color: var(--dt-text); }
    .dt-xyz-row { display: flex; gap: 4px; }
    .dt-xyz-col { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .dt-xyz-col span { font-size: 9px; color: #555; text-align: center; font-weight: 700; letter-spacing: 0.5px; }
    .dt-xyz-input {
      width: 100%; padding: 4px 5px; background: #111; border: 1px solid var(--dt-border);
      color: var(--dt-text); border-radius: 5px; font-size: 11px; outline: none;
      text-align: center;
    }
    .dt-xyz-input:focus { border-color: var(--dt-accent); background: #151515; }

    /* ── Object Library ─────────────────────────────── */
    #dt-lib-body { overflow-y: auto; max-height: 180px; padding: 6px; flex-shrink: 0; }
    .dt-lib-group-label { font-size: 9px; color: #555; text-transform: uppercase;
      letter-spacing: 1px; padding: 4px 6px 2px; }
    .dt-lib-item {
      padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;
      color: var(--dt-text); transition: background 0.1s, color 0.1s;
      display: flex; align-items: center; gap: 6px; user-select: none;
    }
    .dt-lib-item:hover { background: var(--dt-hover); color: var(--dt-accent); }
    .dt-lib-item.active { background: rgba(0,102,187,0.25); color: var(--dt-accent); }

    /* ── File controls ───────────────────────────────── */
    #dt-file-ctrl { padding: 8px; border-top: 1px solid var(--dt-border); flex-shrink: 0; }
    #dt-file-status { font-size: 10px; color: var(--dt-success); min-height: 14px; text-align: center; margin-bottom: 4px; }

    /* ── Buttons ─────────────────────────────────────── */
    .dt-btn {
      padding: 5px 10px; border-radius: 6px; border: 1px solid var(--dt-border);
      background: var(--dt-hover); color: var(--dt-text); cursor: pointer;
      font-size: 11px; transition: all 0.12s; text-align: center;
    }
    .dt-btn:hover { background: var(--dt-active); color: #fff; border-color: var(--dt-accent); }
    .dt-btn-danger:hover { background: var(--dt-danger) !important; border-color: var(--dt-danger) !important; }
    .dt-btn-sm { padding: 3px 8px; font-size: 10px; }

    /* ── Bottom Code Panel ───────────────────────────── */
    #dt-bottom {
      position: fixed; bottom: 22px; left: 58px; right: 238px;
      background: var(--dt-bg); border: 1px solid var(--dt-border);
      border-radius: 10px 10px 0 0; z-index: 9997; overflow: hidden;
      transition: height 0.25s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
    }
    #dt-bottom.dt-collapsed { height: 32px; }
    #dt-bottom.dt-expanded  { height: 200px; }
    #dt-bottom-hdr {
      height: 32px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 12px; cursor: pointer; background: #1a1a1a;
      border-bottom: 1px solid var(--dt-border); user-select: none;
    }
    #dt-bottom-hdr span:first-child { font-size: 10px; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    #dt-bottom-hdr .dt-code-btns { display: flex; gap: 6px; }
    #dt-code-text {
      padding: 8px 12px; font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 11px; color: #7ec8e3; white-space: pre-wrap;
      height: calc(100% - 32px); overflow-y: auto; line-height: 1.6;
      scrollbar-width: thin; scrollbar-color: #333 transparent;
    }

    /* ── Status Bar ──────────────────────────────────── */
    #dt-statusbar {
      position: fixed; bottom: 0; left: 0; right: 0; height: 22px;
      background: var(--dt-active); display: flex; align-items: center;
      padding: 0 10px; gap: 18px; z-index: 9999; font-size: 11px; color: rgba(255,255,255,0.9);
    }
    #dt-statusbar span { opacity: 0.8; }
    #dt-statusbar #dt-sb-tool { font-weight: 700; opacity: 1; }

    /* ── Wall Length HUD ─────────────────────────────── */
    #dt-wall-hud {
      position: fixed; top: 40%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: #00d4ff; padding: 6px 20px;
      border-radius: 20px; font-size: 18px; font-weight: 700;
      pointer-events: none; display: none; z-index: 9999;
      border: 1px solid rgba(0,212,255,0.3); letter-spacing: 1px;
    }

    /* ── Add Palette ─────────────────────────────────── */
    #dt-add-palette {
      position: fixed; bottom: 50px; left: 50%; transform: translateX(-50%);
      background: var(--dt-panel); border: 1px solid var(--dt-border);
      border-radius: 12px; padding: 8px; gap: 6px; z-index: 9999;
      display: none; flex-wrap: wrap; max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .dt-palette-item {
      padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;
      background: var(--dt-hover); color: var(--dt-text);
      border: 1px solid transparent; transition: all 0.12s; white-space: nowrap;
    }
    .dt-palette-item:hover, .dt-palette-item.active {
      border-color: var(--dt-accent); color: #fff; background: rgba(0,102,187,0.3);
    }

    /* ── Snap indicator ─────────────────────────────── */
    #dt-snap-chip {
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7); color: #888; font-size: 11px;
      padding: 3px 14px; border-radius: 20px; z-index: 9997; pointer-events: none;
    }

    /* ── Toast ───────────────────────────────────────── */
    #dt-toast {
      position: fixed; bottom: 36px; left: 50%; transform: translateX(-50%);
      background: #111; color: #fff; padding: 7px 18px; border-radius: 20px;
      font-size: 12px; z-index: 99999; opacity: 0; transition: opacity 0.25s;
      pointer-events: none; border: 1px solid #333;
    }
    #dt-toast.show { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'dt-root';

  const TOOL_LIST = [
    { id: 'select',    icon: '↖', tip: 'Select (V)' },
    { id: 'translate', icon: '✥', tip: 'Move (G)' },
    { id: 'rotate',    icon: '↻', tip: 'Rotate (R)' },
    { id: 'scale',     icon: '⊞', tip: 'Scale (S)' },
    null, // separator
    { id: 'wall',      icon: '█', tip: 'Draw Wall (W)' },
    { id: 'add',       icon: '＋', tip: 'Add Object (A)' },
  ];

  const toolbarHTML = TOOL_LIST.map(t =>
    t === null
      ? `<div class="dt-tb-sep"></div>`
      : `<button class="dt-tool-btn${t.id === STATE.tool ? ' active' : ''}" data-tool="${t.id}" title="${t.tip}">
           ${t.icon}<span class="dt-tt">${t.tip}</span>
         </button>`
  ).join('');

  // Library grouped
  const groups = {};
  for (const [key, def] of Object.entries(OBJ_DEFS)) {
    (groups[def.group] = groups[def.group] || []).push({ key, def });
  }
  const libHTML = Object.entries(groups).map(([gname, items]) => `
    <div class="dt-lib-group-label">${gname}</div>
    ${items.map(({ key, def }) => `
      <div class="dt-lib-item" data-libtype="${key}">${def.icon} ${def.label}</div>
    `).join('')}
  `).join('');

  const paletteHTML = Object.entries(OBJ_DEFS).map(([key, def]) =>
    `<div class="dt-palette-item" data-paltype="${key}">${def.icon} ${def.label}</div>`
  ).join('');

  root.innerHTML = `
    <div id="dt-toolbar">${toolbarHTML}</div>

    <div id="dt-right">
      <div class="dt-panel-hdr">⚙ Properties</div>
      <div id="dt-props-body"><div class="dt-empty">Nothing selected<br><span>Click an object or<br>place one from the library</span></div></div>

      <div class="dt-panel-hdr">🗂 Object Library</div>
      <div id="dt-lib-body">${libHTML}</div>

      <div id="dt-file-ctrl">
        <div id="dt-file-status"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <button class="dt-btn dt-btn-sm" id="dt-link-btn">📎 Link .js</button>
          <button class="dt-btn dt-btn-sm" id="dt-save-file-btn">💾 Save File</button>
        </div>
        <button class="dt-btn dt-btn-sm" id="dt-copy-btn" style="width:100%">📋 Copy Code</button>
      </div>
    </div>

    <div id="dt-bottom" class="dt-collapsed">
      <div id="dt-bottom-hdr">
        <span>{ } Generated Code</span>
        <div class="dt-code-btns">
          <button class="dt-btn dt-btn-sm" onclick="navigator.clipboard.writeText(window._dt.getCode())">📋</button>
          <span id="dt-bottom-toggle">▲</span>
        </div>
      </div>
      <pre id="dt-code-text">// Place objects to generate code</pre>
    </div>

    <div id="dt-statusbar">
      <span id="dt-sb-tool">SELECT ↖</span>
      <span id="dt-sb-cursor">X: 0  Z: 0</span>
      <span id="dt-sb-objects">Objects: 0</span>
      <span id="dt-sb-snap">Snap: 0.5</span>
      <span style="margin-left:auto;opacity:0.5;">V:Select G:Move R:Rotate S:Scale W:Wall A:Add | Tab:Snap F:Focus Ctrl+D:Dup Del:Delete Ctrl+Z:Undo</span>
    </div>

    <div id="dt-wall-hud">📏 0.00 u</div>

    <div id="dt-snap-chip">Snap: ${STATE.snapSize}  ·  Tab to cycle</div>

    <div id="dt-add-palette">${paletteHTML}</div>

    <div id="dt-toast"></div>
  `;

  document.body.appendChild(root);

  // ── Bind events ────────────────────────────────────────────────────────

  // Toolbar
  root.querySelectorAll('.dt-tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // Library items
  root.querySelectorAll('.dt-lib-item').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.libtype;
      STATE.pendingType = type;
      // Highlight active
      root.querySelectorAll('.dt-lib-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      setTool('add');
      toast(`Click on ground to place ${OBJ_DEFS[type]?.label}`);
    });
  });

  // Add palette
  root.querySelectorAll('.dt-palette-item').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.paltype;
      STATE.pendingType = type;
      root.querySelectorAll('.dt-palette-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      toast(`Click on ground to place ${OBJ_DEFS[type]?.label}`);
    });
  });

  // Code panel toggle
  document.getElementById('dt-bottom-hdr').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const panel = document.getElementById('dt-bottom');
    const closed = panel.classList.contains('dt-collapsed');
    panel.classList.toggle('dt-collapsed', !closed);
    panel.classList.toggle('dt-expanded',   closed);
    document.getElementById('dt-bottom-toggle').textContent = closed ? '▼' : '▲';
  });

  // File controls
  document.getElementById('dt-link-btn').addEventListener('click', _linkFile);
  document.getElementById('dt-save-file-btn').addEventListener('click', _saveToFile);
  document.getElementById('dt-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(_generateCode());
    toast('📋 Copied to clipboard!');
  });

  // Snap chip sync
  setInterval(() => {
    const chip = document.getElementById('dt-snap-chip');
    if (chip) chip.textContent = `Snap: ${STATE.snapSize}  ·  Tab to cycle`;
  }, 500);
}


// ═══════════════════════════════════════════════════════════════════════
// §18  ANIMATE LOOP HOOK  (call this inside your animate() function)
// ═══════════════════════════════════════════════════════════════════════

export function updateDevTool() {
  // Keep selection box synced when object is being transformed
  if (STATE.selected.length === 1 && TC.dragging) {
    _selBox.setFromObject(STATE.selected[0]);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// §19  INIT
// ═══════════════════════════════════════════════════════════════════════

export function initDevTool() {
  _buildUI();

  const canvas = renderer.domElement;
  canvas.addEventListener('mousemove', _onMouseMove);
  canvas.addEventListener('click',     _onClick);
  canvas.addEventListener('dblclick',  _onDblClick);
  window.addEventListener('keydown',   _onKeyDown);

  console.log(
    '%c🛠️  DevTool v2 loaded\n' +
    'V:Select  G:Move  R:Rotate  S:Scale  W:Wall  A:Add\n' +
    'Tab:Snap  F:Focus  Ctrl+D:Dup  Del:Delete  Ctrl+Z:Undo\n' +
    'X/Y/Z: lock axis  Q: unlock all  Shift+DblClick: straight wall\n' +
    'Link main.js with 📎 button for real file saves!',
    'color:#00d4ff;font-size:13px;font-weight:bold;'
  );

  toast('🛠️ DevTool ready! V=Select W=Wall A=Add');
}
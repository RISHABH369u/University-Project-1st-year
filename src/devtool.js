/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  devtool.js v4  —  Minecraft Creative Mode Style                    ║
 * ║──────────────────────────────────────────────────────────────────────║
 * ║  E         → Open / Close Inventory                                  ║
 * ║  1–9       → Select hotbar slot                                      ║
 * ║  Click     → Place / Select object                                   ║
 * ║  W/D/R/S   → Draw Wall / Road / Divider / Scale tool                 ║
 * ║  G/T/Y     → Move / Rotate / …                                       ║
 * ║  Ctrl+Z/Y  → Undo / Redo                                             ║
 * ║  Ctrl+D    → Clone   Del → Delete   F → Focus   Tab → Snap           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * SETUP in main.js:
 *   import { initDevTool, updateDevTool } from './devtool.js';
 *   // in animate(): updateDevTool();
 *   initDevTool();
 *
 * CAMERA FIX — interaction.js orbit handlers TOP pe yeh add karo:
 *   import { isPlayerActive } from './player.js';
 *   // pointerdown / mousemove / wheel handlers mein:
 *   if (isPlayerActive() || !window._dtCanOrbit()) return;
 */

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, controls } from './scene.js';
import { mkWall }          from './utils/wall.js';
import { mkCampusRoad }    from './utils/roads.js';
import { mkCampusDivider } from './utils/roads.js';
import { buildObjDefs }    from './objects-registry.js';
import { isPlayerActive }  from './player.js';

const OBJ_DEFS = buildObjDefs();

// ══════════════════════════════════════════════════════════════════════════════
// §1  HOTBAR DEFINITION  (9 slots — fixed tools + draw tools)
// ══════════════════════════════════════════════════════════════════════════════

const HOTBAR_SLOTS = [
  { id: 'select',    icon: '↖', label: 'Select',   color: '#4d9eff', type: 'tool' },
  { id: 'translate', icon: '✥', label: 'Move',     color: '#4d9eff', type: 'tool' },
  { id: 'rotate',    icon: '↻', label: 'Rotate',   color: '#ff9f43', type: 'tool' },
  { id: 'scale',     icon: '⊞', label: 'Scale',    color: '#ff9f43', type: 'tool' },
  { id: 'wall',      icon: '█', label: 'Wall',     color: '#c8c8c8', type: 'draw' },
  { id: 'road',      icon: '🛣', label: 'Road',     color: '#6aab28', type: 'draw' },
  { id: 'divider',   icon: '🟩', label: 'Divider', color: '#6aab28', type: 'draw' },
  { id: null,        icon: '',  label: '',          color: '',        type: 'empty' },
  { id: null,        icon: '',  label: '',          color: '',        type: 'empty' },
];

// ══════════════════════════════════════════════════════════════════════════════
// §2  STATE
// ══════════════════════════════════════════════════════════════════════════════

const STATE = {
  tool:           'select',
  activeSlot:     0,          // 0-8 hotbar slot
  objects:        [],
  selected:       [],
  undoStack:      [],
  redoStack:      [],
  snapSize:       0.5,
  drawStart:      null,
  drawMode:       null,
  pendingType:    null,       // object type to place on click
  fileHandle:     null,
  isDraggingTC:   false,
  transformSpace: 'world',
  showGrid:       true,
  inventoryOpen:  false,
  invTab:         null,       // active inventory tab (group name)
  _uid:           0,
};

// Camera lock API — interaction.js mein add karo: if (!window._dtCanOrbit()) return;
window._dtCanOrbit = () => !STATE.isDraggingTC && !isPlayerActive();

const DRAW_TOOLS  = ['wall', 'road', 'divider'];
const DRAW_HEX    = { wall: 0x4d9eff, road: 0x6aab28, divider: 0xd4a017 };

// ══════════════════════════════════════════════════════════════════════════════
// §3  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const _ray   = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _gnd   = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _iPt   = new THREE.Vector3();

function _gndPt(e) {
  camera.updateMatrixWorld(true);
  const r = renderer.domElement.getBoundingClientRect();
  _mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  _mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  _ray.setFromCamera(_mouse, camera);
  return _ray.ray.intersectPlane(_gnd, _iPt) ? _iPt.clone() : new THREE.Vector3();
}

function snap(v) { return Math.round(v / STATE.snapSize) * STATE.snapSize; }
function fmt(n)  { return +parseFloat(n).toFixed(2); }
function uid()   { return `o${++STATE._uid}_${Date.now()}`; }

// ══════════════════════════════════════════════════════════════════════════════
// §4  GRID
// ══════════════════════════════════════════════════════════════════════════════

const _grid = new THREE.GridHelper(400, 200, 0x444455, 0x252535);
_grid.material.opacity = 0.25; _grid.material.transparent = true;
scene.add(_grid);

// ══════════════════════════════════════════════════════════════════════════════
// §5  TRANSFORM CONTROLS + CAMERA LOCK
// ══════════════════════════════════════════════════════════════════════════════

const TC = new TransformControls(camera, renderer.domElement);
TC.setSize(0.85);
TC.setSpace(STATE.transformSpace);

// _wasDragging: set when TC drag ends so the subsequent click event is ignored
let _wasDragging = false;

TC.addEventListener('dragging-changed', e => {
  STATE.isDraggingTC = e.value;
  if (!e.value) _wasDragging = true;   // drag just ended — ignore the next click
  if (controls) controls.enabled = !e.value;
  _blocker(e.value);
});
TC.addEventListener('objectChange', () => {
  _refreshSel(); _renderProps(); _schedSave(); _updateHierList();
});
scene.add(TC);

// _tcPointerDown: set when the pointer goes down on a TC gizmo axis handle so
// that _onClick does not deselect the object on a quick tap of the handle.
let _tcPointerDown = false;
renderer.domElement.addEventListener('pointerdown', () => {
  _wasDragging = false;            // clear any stale drag-end flag before new interaction
  _tcPointerDown = TC.object !== null && TC.axis !== null;
}, true);

// NOTE: The old "capture-phase killer" (_tcKill) that used
// window.addEventListener(ev, _tcKill, true) has been intentionally removed.
// It called stopImmediatePropagation() at the window level which prevented
// TransformControls from receiving its own pointermove/pointerdown events
// during a drag, making Move/Rotate/Scale completely non-functional.
// controls.js and interaction.js already guard against orbit during TC drag
// via window._dtCanOrbit(), so the killer is neither needed nor safe.

let _blk = null;
function _blocker(on) {
  if (on && !_blk) {
    _blk = document.createElement('div');
    // pointer-events:none — show grabbing cursor without intercepting events
    _blk.style.cssText = 'position:fixed;inset:0;z-index:8000;cursor:grabbing;pointer-events:none;';
    document.body.appendChild(_blk);
  } else if (!on && _blk) { _blk.remove(); _blk = null; }
}

window.addEventListener('pointerup', () => {
  _tcPointerDown = false;   // clear gizmo-tap flag if no click fired after pointerup
  if (!TC.dragging) {
    STATE.isDraggingTC = false;
    if (controls && !isPlayerActive()) controls.enabled = true;
    _blocker(false);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// §6  SELECTION
// ══════════════════════════════════════════════════════════════════════════════

const _selBox = new THREE.BoxHelper(new THREE.Mesh(), 0x4d9eff);
_selBox.visible = false;
scene.add(_selBox);

function _refreshSel() {
  if (!STATE.selected.length) { _selBox.visible = false; return; }
  if (STATE.selected.length === 1) {
    _selBox.setFromObject(STATE.selected[0]);
  } else {
    const b = new THREE.Box3();
    STATE.selected.forEach(m => b.expandByObject(m));
    const t = new THREE.Mesh(new THREE.BoxGeometry());
    b.getCenter(t.position); b.getSize(t.scale);
    _selBox.setFromObject(t);
  }
  _selBox.visible = true;
}

function selObj(mesh, additive = false) {
  if (!additive) { STATE.selected = []; TC.detach(); }
  if (mesh) {
    let r = mesh;
    while (r.parent && !STATE.objects.find(e => e.mesh === r)) r = r.parent;
    if (!STATE.selected.includes(r)) STATE.selected.push(r);
    if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); else TC.detach();
  }
  _refreshSel(); _renderProps(); _updateHierList();
}

function clrSel() {
  STATE.selected = []; TC.detach(); _selBox.visible = false;
  _renderProps(); _updateHierList();
}

// ══════════════════════════════════════════════════════════════════════════════
// §7  OBJECT REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

function reg(mesh, type, params = {}, label = null) {
  const e = { mesh, type, params, id: uid(),
              label: label || OBJ_DEFS[type]?.label || type, hidden: false };
  STATE.objects.push(e);
  _updateCode(); _updateSB(); _updateHierList();
  return e;
}

function unreg(mesh) {
  const i = STATE.objects.findIndex(e => e.mesh === mesh);
  if (i > -1) STATE.objects.splice(i, 1);
  scene.remove(mesh);
  _updateCode(); _updateSB(); _updateHierList();
}

function spawnObj(type, x, z) {
  const def = OBJ_DEFS[type]; if (!def) return null;
  const m = def.spawn(fmt(x), fmt(z));
  reg(m, type, { sx: fmt(x), sz: fmt(z) });
  return m;
}

// ══════════════════════════════════════════════════════════════════════════════
// §8  DRAW TOOL  (wall / road / divider)
// ══════════════════════════════════════════════════════════════════════════════

let _drawLine = null, _drawMarker = null;

function _drawStart(mode, pt) {
  STATE.drawMode  = mode;
  STATE.drawStart = pt.clone();
  const col = DRAW_HEX[mode];
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  _drawLine   = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col }));
  _drawMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
  _drawMarker.position.set(pt.x, 0.5, pt.z);
  scene.add(_drawLine); scene.add(_drawMarker);
  _setHUD(`${mode === 'wall' ? '█' : mode === 'road' ? '🛣' : '🟩'} Dbl-click to finish · Shift=straight`);
}

function _drawUpdate(end) {
  if (!_drawLine || !STATE.drawStart) return;
  const pos = _drawLine.geometry.attributes.position;
  pos.setXYZ(0, STATE.drawStart.x, 0.3, STATE.drawStart.z);
  pos.setXYZ(1, end.x, 0.3, end.z); pos.needsUpdate = true;
  const dx = end.x - STATE.drawStart.x, dz = end.z - STATE.drawStart.z;
  _setHUD(`📏 ${Math.sqrt(dx * dx + dz * dz).toFixed(2)} u · Dbl-click to finish`);
}

function _drawClear() {
  if (_drawLine)   { scene.remove(_drawLine);   _drawLine   = null; }
  if (_drawMarker) { scene.remove(_drawMarker); _drawMarker = null; }
  STATE.drawStart = null; STATE.drawMode = null; _setHUD('');
}

function _drawFinish(end) {
  const { x: sx, z: sz } = STATE.drawStart, { x: ex, z: ez } = end;
  const len = fmt(Math.sqrt((ex-sx)**2 + (ez-sz)**2));
  _pushUndo();
  let mesh, label, type;
  if (STATE.drawMode === 'wall') {
    mesh = mkWall(sx, sz, ex, ez); type = 'wall';
    label = `Wall ${STATE.objects.filter(o => o.type === 'wall').length + 1}`;
    toast('✅ Wall placed  ' + len + ' u');
  } else if (STATE.drawMode === 'road') {
    mesh = mkCampusRoad(sx, sz, ex, ez); type = '_road';
    label = `Road ${STATE.objects.filter(o => o.type === '_road').length + 1}`;
    toast('✅ Road placed  ' + len + ' u');
  } else {
    mesh = mkCampusDivider(sx, sz, ex, ez); type = '_divider';
    label = `Divider ${STATE.objects.filter(o => o.type === '_divider').length + 1}`;
    toast('✅ Divider placed  ' + len + ' u');
  }
  reg(mesh, type, { sx, sz, ex, ez, length: len }, label);
  _drawClear();
  if (mesh) selObj(mesh);
}

// ══════════════════════════════════════════════════════════════════════════════
// §9  UNDO / REDO
// ══════════════════════════════════════════════════════════════════════════════

function _snapState() {
  return STATE.objects.map(({ id, type, params, label, hidden, mesh }) => ({
    id, type, params: { ...params }, label, hidden,
    pos:   [...mesh.position.toArray()],
    rot:   [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
    scale: [...mesh.scale.toArray()],
  }));
}

function _pushUndo() {
  STATE.undoStack.push(_snapState());
  if (STATE.undoStack.length > 60) STATE.undoStack.shift();
  STATE.redoStack = [];
}

function undo() {
  if (!STATE.undoStack.length) return;
  STATE.redoStack.push(_snapState()); _restoreSnap(STATE.undoStack.pop()); toast('↩ Undo');
}

function redo() {
  if (!STATE.redoStack.length) return;
  STATE.undoStack.push(_snapState()); _restoreSnap(STATE.redoStack.pop()); toast('↪ Redo');
}

function _restoreSnap(snap) {
  const ids = new Set(snap.map(s => s.id));
  [...STATE.objects].forEach(e => { if (!ids.has(e.id)) unreg(e.mesh); });
  snap.forEach(s => {
    let e = STATE.objects.find(o => o.id === s.id);
    if (e) {
      e.mesh.position.fromArray(s.pos); e.mesh.rotation.set(...s.rot); e.mesh.scale.fromArray(s.scale);
      e.mesh.visible = !s.hidden; e.hidden = s.hidden; e.label = s.label;
    } else {
      let mesh = null;
      if (s.type === 'wall')     mesh = mkWall(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else if (s.type === '_road')    mesh = mkCampusRoad(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else if (s.type === '_divider') mesh = mkCampusDivider(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else { const def = OBJ_DEFS[s.type]; if (def) mesh = def.spawn(s.params.sx, s.params.sz); }
      if (mesh) {
        mesh.position.fromArray(s.pos); mesh.rotation.set(...s.rot); mesh.scale.fromArray(s.scale);
        const ne = reg(mesh, s.type, s.params, s.label); ne.id = s.id;
        if (s.hidden) { mesh.visible = false; ne.hidden = true; }
      }
    }
  });
  clrSel(); _updateCode(); _updateHierList(); _updateSB();
}

// ══════════════════════════════════════════════════════════════════════════════
// §10  ALIGN
// ══════════════════════════════════════════════════════════════════════════════

const ALIGN = {
  minX:()=>_aa('x','min'),  maxX:()=>_aa('x','max'),  centerX:()=>_aa('x','center'),
  minZ:()=>_aa('z','min'),  maxZ:()=>_aa('z','max'),  centerZ:()=>_aa('z','center'),
  groundY() { if (!STATE.selected.length) return; _pushUndo(); STATE.selected.forEach(m => m.position.y = 0); _schedSave(); toast('⬇ Y=0'); },
  distributeX: () => _dist('x'), distributeZ: () => _dist('z'),
};

function _aa(ax, mo) {
  if (STATE.selected.length < 2) { toast('⚠ Select 2+ objects'); return; }
  _pushUndo();
  const vs = STATE.selected.map(m => m.position[ax]);
  const t = mo === 'min' ? Math.min(...vs) : mo === 'max' ? Math.max(...vs) : (Math.min(...vs)+Math.max(...vs))/2;
  STATE.selected.forEach(m => m.position[ax] = t);
  _updateCode(); toast(`Aligned ${ax.toUpperCase()}`);
}

function _dist(ax) {
  if (STATE.selected.length < 3) { toast('⚠ Select 3+ objects'); return; }
  _pushUndo();
  const s = [...STATE.selected].sort((a, b) => a.position[ax] - b.position[ax]);
  const f = s[0].position[ax], l = s[s.length-1].position[ax];
  s.forEach((m, i) => m.position[ax] = f + ((l-f)/(s.length-1))*i);
  _updateCode(); toast(`Distributed ${ax.toUpperCase()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// §11  CODE GENERATION
// ══════════════════════════════════════════════════════════════════════════════

const BS = '// ── DevTool: Generated Objects START ──';
const BE = '// ── DevTool: Generated Objects END ──';

function _generateCode() {
  const lines = [BS];
  for (const { mesh, type, params } of STATE.objects) {
    const p = { x:fmt(mesh.position.x), y:fmt(mesh.position.y), z:fmt(mesh.position.z) };
    if      (type === 'wall')     lines.push(`mkWall(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type === '_road')    lines.push(`mkCampusRoad(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type === '_divider') lines.push(`mkCampusDivider(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else { const def = OBJ_DEFS[type]; if (def) lines.push(def.code(p, mesh.rotation, mesh.scale)); }
  }
  lines.push(BE);
  return lines.join('\n');
}

function _updateCode() {
  const el = document.getElementById('mc-code-pre');
  if (el) el.textContent = _generateCode();
  _schedSave();
}

// ══════════════════════════════════════════════════════════════════════════════
// §12  PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════

const LS_KEY = 'devtool_v4_scene';
let _saveT = null;
function _schedSave() {
  clearTimeout(_saveT);
  _saveT = setTimeout(() => {
    const data = STATE.objects.map(({ type, params, mesh, label, hidden }) => ({
      type, params, label, hidden,
      pos:   mesh.position.toArray(),
      rot:   [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      scale: mesh.scale.toArray(),
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    _flashStatus('💾 Saved');
  }, 800);
}

async function _linkFile() {
  if (!window.showOpenFilePicker) { toast('❌ Chrome/Edge needed'); return; }
  try {
    [STATE.fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JS', accept: { 'text/javascript': ['.js'] } }] });
    document.getElementById('mc-link-btn').textContent = `📎 ${STATE.fileHandle.name}`;
    toast('✅ Linked: ' + STATE.fileHandle.name);
  } catch {}
}

async function _saveToFile() {
  if (!STATE.fileHandle) { toast('⚠ Link a .js file first'); return; }
  try {
    const f = await STATE.fileHandle.getFile(); let c = await f.text();
    const nb = _generateCode();
    const eS = BS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const eE = BE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pat = new RegExp(`${eS}[\\s\\S]*?${eE}`, 'g');
    c = c.match(pat) ? c.replace(pat, nb) : c + '\n\n' + nb + '\n';
    const w = await STATE.fileHandle.createWritable(); await w.write(c); await w.close();
    _flashStatus('✅ Saved to file'); toast('✅ Saved!');
  } catch (err) { toast('❌ ' + err.message); }
}

function _flashStatus(msg) {
  const el = document.getElementById('mc-status-msg');
  if (el) { el.textContent = msg; setTimeout(() => el.textContent = '', 3000); }
}

// ══════════════════════════════════════════════════════════════════════════════
// §13  TOOL / SLOT SWITCHING
// ══════════════════════════════════════════════════════════════════════════════

function setSlot(idx) {
  STATE.activeSlot = idx;
  const slot = HOTBAR_SLOTS[idx];

  // Update hotbar visual
  document.querySelectorAll('.mc-hb-slot').forEach((el, i) => {
    el.classList.toggle('mc-hb-selected', i === idx);
  });

  if (!slot || slot.type === 'empty') {
    // Empty slot — if we have a pending type from inventory, keep it
    if (!STATE.pendingType) setTool('select');
    return;
  }

  if (slot.type === 'tool' || slot.type === 'draw') {
    STATE.pendingType = null;
    setTool(slot.id);
  }
}

function setTool(tool) {
  STATE.tool = tool;

  // Update toolbar buttons
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('mc-active', b.dataset.tool === tool));

  TC.detach();
  if      (tool === 'translate') { TC.setMode('translate'); if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); }
  else if (tool === 'rotate')    { TC.setMode('rotate');    if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); }
  else if (tool === 'scale')     { TC.setMode('scale');     if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); }
  else if (tool === 'select')    { TC.setMode('translate'); if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); }

  if (!DRAW_TOOLS.includes(tool) && STATE.drawStart) _drawClear();
  if (!DRAW_TOOLS.includes(tool)) _setHUD('');
  _updateSB();
}


// ══════════════════════════════════════════════════════════════════════════════
// §14  INVENTORY
// ══════════════════════════════════════════════════════════════════════════════

function openInventory() {
  STATE.inventoryOpen = true;
  const inv = document.getElementById('mc-inventory');
  if (inv) { inv.classList.add('mc-inv-open'); inv.classList.remove('mc-inv-closed'); }
  // Focus first tab if none selected
  if (!STATE.invTab) {
    const firstTab = document.querySelector('.mc-tab');
    if (firstTab) { STATE.invTab = firstTab.dataset.group; _renderInvGrid(); _updateTabs(); }
  }
}

function closeInventory() {
  STATE.inventoryOpen = false;
  const inv = document.getElementById('mc-inventory');
  if (inv) { inv.classList.remove('mc-inv-open'); inv.classList.add('mc-inv-closed'); }
}

function toggleInventory() {
  STATE.inventoryOpen ? closeInventory() : openInventory();
}

function _renderInvGrid() {
  const grid = document.getElementById('mc-inv-grid'); if (!grid) return;
  const group = STATE.invTab;
  const items = Object.entries(OBJ_DEFS).filter(([, def]) => def.group === group);
  grid.innerHTML = items.map(([key, def]) => `
    <div class="mc-inv-item" data-key="${key}" title="${def.label}">
      <div class="mc-inv-icon">${def.icon || '⬛'}</div>
      <div class="mc-inv-name">${def.label}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.mc-inv-item').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      STATE.pendingType = key;
      // Put in last hotbar slot as "held item"
      HOTBAR_SLOTS[7] = { id: key, icon: OBJ_DEFS[key]?.icon || '⬛', label: OBJ_DEFS[key]?.label || key, color: '#fff', type: 'place' };
      _rebuildHotbar();
      setSlot(7);
      setTool('add');
      closeInventory();
      toast(`🖐 Holding: ${OBJ_DEFS[key]?.label}  — Click ground to place`);
    });
  });
}

function _updateTabs() {
  document.querySelectorAll('.mc-tab').forEach(t => t.classList.toggle('mc-tab-active', t.dataset.group === STATE.invTab));
}

// ══════════════════════════════════════════════════════════════════════════════
// §15  STATUS BAR & HUD
// ══════════════════════════════════════════════════════════════════════════════

function _updateSB() {
  const tool = document.getElementById('mc-sb-tool');
  if (tool) {
    const names = { select:'SELECT ↖', translate:'MOVE ✥', rotate:'ROTATE ↻', scale:'SCALE ⊞', wall:'WALL █', road:'ROAD 🛣', divider:'DIVIDER 🟩', add:'PLACE' };
    tool.textContent = names[STATE.tool] || STATE.tool.toUpperCase();
  }
  const objs = document.getElementById('mc-sb-objs'); if (objs) objs.textContent = `${STATE.objects.length} objects`;
  const snp  = document.getElementById('mc-sb-snap'); if (snp)  snp.textContent  = `Snap: ${STATE.snapSize}`;
  const sp   = document.getElementById('mc-sb-space'); if (sp)  sp.textContent   = STATE.transformSpace === 'world' ? '🌐 World' : '📦 Local';

  if (STATE.pendingType) {
    const held = document.getElementById('mc-held');
    if (held) held.textContent = `🖐 ${OBJ_DEFS[STATE.pendingType]?.label || STATE.pendingType}`;
  } else {
    const held = document.getElementById('mc-held'); if (held) held.textContent = '';
  }
}

function _updateCursor(x, z) {
  const el = document.getElementById('mc-sb-cursor'); if (el) el.textContent = `${fmt(x)}, ${fmt(z)}`;
}

function _setHUD(t) {
  const el = document.getElementById('mc-hud'); if (!el) return;
  el.textContent = t; el.style.display = t ? 'block' : 'none';
}

// ══════════════════════════════════════════════════════════════════════════════
// §16  PROPERTIES PANEL
// ══════════════════════════════════════════════════════════════════════════════

function _renderProps() {
  const panel = document.getElementById('mc-props');
  if (!panel) return;

  if (!STATE.selected.length) {
    panel.style.display = 'flex';
    panel.innerHTML = `
      <div class="mc-props-panel-hdr">Properties</div>
      <div class="mc-props-empty">
        <div class="mc-props-empty-icon">⊡</div>
        <p>Select an object<br>to view properties</p>
      </div>
    `;
    return;
  }
  panel.style.display = 'flex';

  const mesh = STATE.selected[0];
  const entry = STATE.objects.find(e => e.mesh === mesh);
  const p = mesh.position, r = mesh.rotation, s = mesh.scale;
  const bbox = new THREE.Box3().setFromObject(mesh), dim = new THREE.Vector3();
  bbox.getSize(dim);

  const DRAWN = ['wall','_road','_divider'];
  const icon  = DRAWN.includes(entry?.type) ? (entry.type==='wall'?'█':entry.type==='_road'?'🛣':'🟩') : OBJ_DEFS[entry?.type]?.icon||'⬛';
  const label = DRAWN.includes(entry?.type) ? (entry.type==='wall'?'Wall':entry.type==='_road'?'Road':'Divider') : OBJ_DEFS[entry?.type]?.label||entry?.type||'Object';

  panel.innerHTML = `
    <div class="mc-props-head">
      <span class="mc-props-icon">${icon}</span>
      <input class="mc-props-label" id="mc-prop-label" value="${entry?.label||''}" placeholder="Label">
      <button class="mc-props-close" onclick="document.getElementById('mc-props').style.display='none'">×</button>
    </div>
    <div class="mc-props-type">${label}${entry?.params?.length?' · '+entry.params.length+' u':''}</div>
    <div class="mc-prop-dim">
      <span>W ${fmt(dim.x)}</span><span>H ${fmt(dim.y)}</span><span>D ${fmt(dim.z)}</span>
    </div>
    ${_mkXYZ('pos',fmt(p.x),fmt(p.y),fmt(p.z),'Position')}
    ${_mkXYZ('rot',fmt(THREE.MathUtils.radToDeg(r.x)),fmt(THREE.MathUtils.radToDeg(r.y)),fmt(THREE.MathUtils.radToDeg(r.z)),'Rotation °')}
    ${_mkXYZ('scale',fmt(s.x),fmt(s.y),fmt(s.z),'Scale')}
    ${STATE.selected.length >= 2 ? `
    <div class="mc-props-section-head">Align</div>
    <div class="mc-align-row">
      <button onclick="window._dt.align.minX()">←X</button>
      <button onclick="window._dt.align.centerX()">·X</button>
      <button onclick="window._dt.align.maxX()">X→</button>
      <button onclick="window._dt.align.minZ()">←Z</button>
      <button onclick="window._dt.align.centerZ()">·Z</button>
      <button onclick="window._dt.align.maxZ()">Z→</button>
      <button onclick="window._dt.align.groundY()">⬇Y0</button>
      <button onclick="window._dt.align.distributeX()">↔X</button>
      <button onclick="window._dt.align.distributeZ()">↔Z</button>
    </div>` : ''}
    <div class="mc-action-row">
      <button onclick="window._dt.duplicate()">⧉ Clone</button>
      <button onclick="window._dt.toggleHide()">👁</button>
      <button onclick="window._dt.focusSelected()">🎯</button>
      <button class="mc-delete" onclick="window._dt.deleteSelected()">🗑</button>
    </div>
  `;

  document.getElementById('mc-prop-label')?.addEventListener('change', e => {
    if (entry) { entry.label = e.target.value; _updateHierList(); }
  });

  panel.querySelectorAll('.mc-xyz-inp').forEach(inp => {
    inp.addEventListener('change', () => {
      const val = parseFloat(inp.value); if (isNaN(val)) return;
      const { prop, axis } = inp.dataset;
      _pushUndo();
      STATE.selected.forEach(m => {
        if (prop==='pos') m.position[axis] = val;
        if (prop==='rot') m.rotation[axis] = THREE.MathUtils.degToRad(val);
        if (prop==='scale') m.scale[axis] = val;
      });
      _refreshSel(); _updateCode();
    });
  });
}

function _mkXYZ(prop, x, y, z, lbl) {
  return `<div class="mc-xyz">
    <div class="mc-xyz-lbl">${lbl}</div>
    <div class="mc-xyz-row">
      ${['x','y','z'].map((a,i)=>`<label><span class="mc-ax-${a}">${a.toUpperCase()}</span><input class="mc-xyz-inp" data-prop="${prop}" data-axis="${a}" type="number" value="${[x,y,z][i]}" step="${prop==='rot'?1:0.1}"></label>`).join('')}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// §17  HIERARCHY LIST
// ══════════════════════════════════════════════════════════════════════════════

function _updateHierList() {
  const list = document.getElementById('mc-hier-list'); if (!list) return;
  if (!STATE.objects.length) { list.innerHTML = '<div class="mc-hier-empty">No objects in scene</div>'; return; }
  list.innerHTML = STATE.objects.map((entry, i) => {
    const isSel = STATE.selected.includes(entry.mesh);
    const DRAWN = ['wall','_road','_divider'];
    const icon = DRAWN.includes(entry.type) ? (entry.type==='wall'?'█':entry.type==='_road'?'🛣':'🟩') : OBJ_DEFS[entry.type]?.icon||'⬛';
    return `<div class="mc-hier-row${isSel?' mc-hier-sel':''}${entry.hidden?' mc-hier-hid':''}" data-idx="${i}">
      <span>${icon}</span>
      <span class="mc-hier-name">${entry.label}</span>
      <div class="mc-hier-acts">
        <button class="mc-hier-eye" data-idx="${i}">${entry.hidden?'🚫':'👁'}</button>
        <button class="mc-hier-del" data-idx="${i}">×</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.mc-hier-row').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.mc-hier-acts')) return;
      const en = STATE.objects[+el.dataset.idx]; if (en) selObj(en.mesh, e.ctrlKey || e.metaKey);
    });
  });
  list.querySelectorAll('.mc-hier-eye').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const en=STATE.objects[+btn.dataset.idx]; if(en){en.hidden=!en.hidden;en.mesh.visible=!en.hidden;_updateHierList();} });
  });
  list.querySelectorAll('.mc-hier-del').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const en=STATE.objects[+btn.dataset.idx]; if(en){_pushUndo();STATE.selected=STATE.selected.filter(m=>m!==en.mesh);if(!STATE.selected.length)TC.detach();unreg(en.mesh);_renderProps();toast('🗑');} });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §18  EVENTS
// ══════════════════════════════════════════════════════════════════════════════

function _onMove(e) {
  if (isPlayerActive() || STATE.isDraggingTC) return;
  const pt = _gndPt(e);
  _updateCursor(snap(pt.x), snap(pt.z));
  if (DRAW_TOOLS.includes(STATE.tool) && STATE.drawStart) {
    let ex = snap(pt.x), ez = snap(pt.z);
    if (e.shiftKey) { const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z); dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x; }
    _drawUpdate(new THREE.Vector3(ex, 0, ez));
  }
  if (STATE.selected.length === 1 && !TC.dragging) _refreshSel();
}

function _onClick(e) {
  if (isPlayerActive() || STATE.inventoryOpen) return;
  if (e.detail > 1 || TC.dragging || STATE.isDraggingTC) return;
  // Ignore the click that immediately follows the end of a TC drag (mouse-up
  // resets isDraggingTC before the click event fires, so we need a separate flag).
  if (_wasDragging) { _wasDragging = false; return; }
  // Ignore taps on a TC gizmo axis handle — the gizmo is not in STATE.objects
  // so the ray-cast would miss and incorrectly call clrSel().
  if (_tcPointerDown) { _tcPointerDown = false; return; }

  // Close props if clicking outside
  const props = document.getElementById('mc-props');
  if (props && !props.contains(e.target) && !renderer.domElement.contains(e.target)) return;

  const tool = STATE.tool; const pt = _gndPt(e);

  if (['select','translate','rotate','scale'].includes(tool)) {
    camera.updateMatrixWorld(true);
    const rc = renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX-rc.left)/rc.width)*2-1;
    _mouse.y = -((e.clientY-rc.top)/rc.height)*2+1;
    _ray.setFromCamera(_mouse, camera);
    const hits = _ray.intersectObjects(STATE.objects.map(o => o.mesh), true);
    if (hits.length) {
      let root = hits[0].object;
      while (root.parent && !STATE.objects.find(en => en.mesh === root)) root = root.parent;
      selObj(root, e.ctrlKey || e.metaKey);
      if (tool === 'select') setTool('translate');
    } else { clrSel(); }
  }

  if (tool === 'add' && STATE.pendingType) {
    _pushUndo();
    const m = spawnObj(STATE.pendingType, snap(pt.x), snap(pt.z));
    if (m) { selObj(m); toast(`✅ ${OBJ_DEFS[STATE.pendingType]?.label} placed`); }
  }
}

function _onDblClick(e) {
  if (isPlayerActive() || !DRAW_TOOLS.includes(STATE.tool)) return;
  const pt = _gndPt(e);
  let ex = snap(pt.x), ez = snap(pt.z);
  if (e.shiftKey && STATE.drawStart) {
    const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z); dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x;
  }
  if (!STATE.drawStart) { _drawStart(STATE.tool, new THREE.Vector3(ex,0,ez)); }
  else                  { _drawFinish(new THREE.Vector3(ex,0,ez)); }
}

function _onKey(e) {
  if (isPlayerActive()) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();

  // Inventory
  if (k === 'e' && !e.ctrlKey) { toggleInventory(); return; }
  if (k === 'escape') { if (STATE.inventoryOpen) { closeInventory(); return; } _drawClear(); clrSel(); STATE.pendingType=null; setTool('select'); return; }

  // Hotbar number keys
  if (!e.ctrlKey && k >= '1' && k <= '9') { setSlot(parseInt(k)-1); return; }

  // Undo/Redo/Clone
  if (e.ctrlKey && k==='z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && k==='y') { e.preventDefault(); redo(); return; }
  if (e.ctrlKey && k==='d') { e.preventDefault(); window._dt.duplicate(); return; }

  // Delete
  if (k==='delete'||k==='backspace') { window._dt.deleteSelected(); return; }

  // Snap cycle
  if (k==='tab') { e.preventDefault(); const sz=[0.1,0.25,0.5,1.0,2.0]; STATE.snapSize=sz[(sz.indexOf(STATE.snapSize)+1)%sz.length]; toast(`Snap: ${STATE.snapSize}`); _updateSB(); return; }

  // Focus / Grid / Space
  if (k==='f') { window._dt.focusSelected(); return; }
  if (k==='g'&&!e.ctrlKey) { STATE.showGrid=!STATE.showGrid; _grid.visible=STATE.showGrid; toast(STATE.showGrid?'Grid ON':'Grid OFF'); return; }
  if (k==='l') { STATE.transformSpace=STATE.transformSpace==='world'?'local':'world'; TC.setSpace(STATE.transformSpace); _updateSB(); return; }
  if (k==='h') { window._dt.toggleHide(); return; }
  if (k===' ') { e.preventDefault(); TC.visible=!TC.visible; return; }

  // Axis lock
  if (['x','y','z'].includes(k)&&!e.ctrlKey) { TC.showX=k==='x'; TC.showY=k==='y'; TC.showZ=k==='z'; return; }
  if (k==='q') { TC.showX=true; TC.showY=true; TC.showZ=true; }
}

// ══════════════════════════════════════════════════════════════════════════════
// §19  GLOBAL API
// ══════════════════════════════════════════════════════════════════════════════

window._dt = {
  deleteSelected() {
    if (!STATE.selected.length) return; _pushUndo();
    STATE.selected.forEach(m => unreg(m)); STATE.selected=[]; TC.detach(); _selBox.visible=false;
    _renderProps(); toast('🗑 Deleted');
  },
  duplicate() {
    if (!STATE.selected.length) return;
    const mesh=STATE.selected[0], entry=STATE.objects.find(e=>e.mesh===mesh);
    if (!entry||['wall','_road','_divider'].includes(entry.type)){toast('⚠ Cannot clone draw objects');return;}
    _pushUndo();
    const m = spawnObj(entry.type, mesh.position.x+STATE.snapSize*2, mesh.position.z+STATE.snapSize*2);
    if (m) { m.rotation.copy(mesh.rotation); m.scale.copy(mesh.scale); selObj(m); toast('⧉ Cloned'); }
  },
  toggleHide() {
    if (!STATE.selected.length) return;
    STATE.selected.forEach(m=>{const e=STATE.objects.find(o=>o.mesh===m);if(e){e.hidden=!e.hidden;m.visible=!e.hidden;}});
    _updateHierList(); toast('👁 Toggled');
  },
  focusSelected() {
    if (!STATE.selected.length) return;
    const t=new THREE.Vector3(); STATE.selected.forEach(m=>t.add(m.position)); t.divideScalar(STATE.selected.length);
    if (controls){controls.target.copy(t);controls.update();} toast('🎯 Focused');
  },
  align: ALIGN, undo, redo,
  getCode: _generateCode, getState: ()=>STATE, getObjects: ()=>STATE.objects,
};

// ══════════════════════════════════════════════════════════════════════════════
// §20  TOAST
// ══════════════════════════════════════════════════════════════════════════════

let _toastT = null;
function toast(msg) {
  const el = document.getElementById('mc-toast'); if (!el) return;
  el.textContent = msg; el.classList.add('mc-toast-show');
  clearTimeout(_toastT); _toastT = setTimeout(()=>el.classList.remove('mc-toast-show'), 2400);
}

// ══════════════════════════════════════════════════════════════════════════════
// §21  HOTBAR REBUILD  (when inventory selection changes)
// ══════════════════════════════════════════════════════════════════════════════

function _rebuildHotbar() {
  const hb = document.getElementById('mc-hotbar'); if (!hb) return;
  hb.innerHTML = HOTBAR_SLOTS.map((slot, i) => {
    const key = i+1;
    const isEmpty = slot.type === 'empty';
    return `<div class="mc-hb-slot${i===STATE.activeSlot?' mc-hb-selected':''}" data-slot="${i}" title="${slot.label||''}">
      <span class="mc-hb-key">${key}</span>
      <span class="mc-hb-icon" style="${slot.color?'color:'+slot.color:''}">${slot.icon||''}</span>
      ${!isEmpty?`<span class="mc-hb-label">${slot.label}</span>`:''}
    </div>`;
  }).join('');
  hb.querySelectorAll('.mc-hb-slot').forEach(el => {
    el.addEventListener('click', () => setSlot(+el.dataset.slot));
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §22  UI CONSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

function _buildUI() {

  // Build inventory groups from OBJ_DEFS
  const groups = {};
  for (const [k, def] of Object.entries(OBJ_DEFS))
    (groups[def.group] = groups[def.group] || []).push({ k, def });
  STATE.invTab = Object.keys(groups)[0] || null;

  const tabsHTML = Object.keys(groups).map(g =>
    `<button class="mc-tab${g===STATE.invTab?' mc-tab-active':''}" data-group="${g}">${g}</button>`
  ).join('');

  // CSS ──────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :root {
      --dt-bg:       #1a1a1a;
      --dt-surface:  #252526;
      --dt-surface2: #2d2d30;
      --dt-border:   #3e3e42;
      --dt-accent:   #4d9eff;
      --dt-green:    #4ec9b0;
      --dt-red:      #e74c3c;
      --dt-text:     #d4d4d4;
      --dt-text2:    #9d9d9d;
      --dt-text3:    #5f5f5f;
      --dt-sel:      rgba(77,158,255,0.18);
      --dt-hover:    rgba(255,255,255,0.05);
      --dt-font:     'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --dt-mono:     'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace;
      --dt-panel-w:  210px;
      --dt-props-w:  240px;
    }

    #mc-root * { box-sizing: border-box; margin: 0; }
    #mc-root { font-family: var(--dt-font); color: var(--dt-text); font-size: 13px; }

    /* ── HOTBAR ───────────────────────────────────── */
    #mc-hotbar {
      position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 2px; padding: 5px;
      background: var(--dt-surface);
      border: 1px solid var(--dt-border);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3);
      z-index: 9990;
    }




    .mc-hb-slot {
      width: 50px; height: 50px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 7px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      cursor: pointer; position: relative;
      transition: background 0.12s, border-color 0.12s;
      user-select: none; gap: 2px;
    }
    .mc-hb-slot:hover { background: var(--dt-hover); border-color: var(--dt-border); }
    .mc-hb-selected {
      background: var(--dt-sel) !important;
      border-color: var(--dt-accent) !important;
      box-shadow: inset 0 0 0 1px rgba(77,158,255,0.2);
    }
    .mc-hb-key {
      position: absolute; top: 3px; left: 5px;
      font-size: 9px; color: var(--dt-text3);
      font-family: var(--dt-font); line-height: 1;
    }
    .mc-hb-icon { font-size: 18px; line-height: 1; }
    .mc-hb-label { font-size: 8.5px; color: var(--dt-text2); text-align: center; max-width: 48px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .mc-hb-div { width: 1px; height: 36px; background: var(--dt-border); margin: 0 2px; }

    /* ── STATUS BAR ──────────────────────────────── */
    #mc-statusbar {
      position: fixed; bottom: 0; left: 0; right: 0; height: 24px;
      background: var(--dt-surface2);
      display: flex; align-items: center; gap: 14px; padding: 0 14px;
      font-size: 11px; color: var(--dt-text2);
      z-index: 9989; border-top: 1px solid var(--dt-border);
    }
    #mc-sb-tool { color: var(--dt-accent); font-weight: 600; letter-spacing: 0.3px; font-size: 11px; }
    #mc-held { color: var(--dt-green); }
    .mc-sb-sep { width: 1px; height: 12px; background: var(--dt-border); flex-shrink: 0; }

    /* ── HUD (draw length) ───────────────────────── */
    #mc-hud {
      position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
      background: rgba(26,26,26,0.92); color: var(--dt-accent);
      padding: 9px 22px; font-size: 14px; font-weight: 500;
      border: 1px solid var(--dt-accent); border-radius: 8px;
      pointer-events: none; display: none; z-index: 9999;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    /* ── PROPERTIES PANEL (right sidebar) ────────── */
    #mc-props {
      position: fixed; right: 0; top: 0; bottom: 24px;
      width: var(--dt-props-w);
      background: var(--dt-surface);
      border-left: 1px solid var(--dt-border);
      z-index: 9985;
      display: flex; flex-direction: column; overflow-y: auto;
    }
    .mc-props-panel-hdr {
      background: var(--dt-surface2); padding: 10px 12px;
      font-size: 10px; font-weight: 600; color: var(--dt-text2);
      border-bottom: 1px solid var(--dt-border);
      letter-spacing: 0.6px; text-transform: uppercase; flex-shrink: 0;
    }
    .mc-props-empty {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: var(--dt-text3); text-align: center; font-size: 12px; gap: 10px; padding: 20px;
    }
    .mc-props-empty-icon { font-size: 36px; opacity: 0.2; }
    .mc-props-head {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 12px 10px;
      background: var(--dt-surface2);
      border-bottom: 1px solid var(--dt-border);
      position: sticky; top: 0; z-index: 1; flex-shrink: 0;
    }
    .mc-props-icon { font-size: 15px; }
    .mc-props-label {
      flex: 1; background: var(--dt-bg); border: 1px solid var(--dt-border);
      color: var(--dt-text); font-family: var(--dt-font); font-size: 12px;
      padding: 4px 8px; border-radius: 4px; outline: none;
      transition: border-color 0.15s;
    }
    .mc-props-label:focus { border-color: var(--dt-accent); }
    .mc-props-close {
      background: none; border: none; color: var(--dt-text2); cursor: pointer;
      font-size: 14px; line-height: 1; padding: 3px 5px; border-radius: 3px;
      transition: color 0.12s, background 0.12s;
    }
    .mc-props-close:hover { color: var(--dt-red); background: rgba(231,76,60,0.1); }
    .mc-props-type { padding: 5px 12px; font-size: 11px; color: var(--dt-text2); background: var(--dt-surface); border-bottom: 1px solid var(--dt-border); flex-shrink: 0; }
    .mc-prop-dim { display: flex; gap: 4px; padding: 6px 12px; border-bottom: 1px solid var(--dt-border); flex-shrink: 0; }
    .mc-prop-dim span { flex: 1; text-align: center; font-size: 11px; color: var(--dt-text2); background: var(--dt-surface2); padding: 3px 4px; border-radius: 3px; border: 1px solid var(--dt-border); }
    .mc-xyz { padding: 6px 12px 8px; border-bottom: 1px solid var(--dt-border); flex-shrink: 0; }
    .mc-xyz-lbl { font-size: 10px; color: var(--dt-text3); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 500; }
    .mc-xyz-row { display: flex; gap: 4px; }
    .mc-xyz-row label { flex: 1; display: flex; flex-direction: column; align-items: stretch; gap: 0; }
    .mc-xyz-row label > span { font-size: 9px; font-weight: 700; text-align: center; padding: 2px 0; border-radius: 3px 3px 0 0; letter-spacing: 0.5px; }
    .mc-ax-x { color: #ff7b7b; background: rgba(255,123,123,0.14); }
    .mc-ax-y { color: #6bcb77; background: rgba(107,203,119,0.14); }
    .mc-ax-z { color: #4d9eff; background: rgba(77,158,255,0.14); }
    .mc-xyz-inp {
      width: 100%; background: var(--dt-surface2); border: 1px solid var(--dt-border);
      color: var(--dt-text); font-family: var(--dt-mono); font-size: 11px;
      padding: 4px 4px; text-align: center; outline: none;
      border-top: none; border-radius: 0 0 3px 3px;
      transition: border-color 0.15s;
    }
    .mc-xyz-inp:focus { border-color: var(--dt-accent); background: #222; }
    .mc-props-section-head { padding: 8px 12px 4px; font-size: 10px; font-weight: 600; color: var(--dt-text3); text-transform: uppercase; letter-spacing: 0.8px; flex-shrink: 0; }
    .mc-align-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 4px 12px 8px; flex-shrink: 0; }
    .mc-align-row button { background: var(--dt-surface2); border: 1px solid var(--dt-border); color: var(--dt-text2); font-family: var(--dt-font); font-size: 11px; padding: 5px 4px; cursor: pointer; border-radius: 3px; transition: background 0.1s, color 0.1s, border-color 0.1s; }
    .mc-align-row button:hover { background: var(--dt-hover); color: var(--dt-text); border-color: var(--dt-accent); }
    .mc-action-row { display: flex; gap: 4px; padding: 8px 12px; flex-shrink: 0; }
    .mc-action-row button { flex: 1; background: var(--dt-surface2); border: 1px solid var(--dt-border); color: var(--dt-text2); font-family: var(--dt-font); font-size: 12px; padding: 6px 4px; cursor: pointer; border-radius: 4px; transition: background 0.1s, color 0.1s; }
    .mc-action-row button:hover { background: var(--dt-hover); color: var(--dt-text); }
    .mc-action-row .mc-delete { color: var(--dt-red); border-color: rgba(231,76,60,0.25); }
    .mc-action-row .mc-delete:hover { background: rgba(231,76,60,0.12); border-color: var(--dt-red); }

    /* ── INVENTORY ────────────────────────────────── */
    #mc-inventory {
      position: fixed; inset: 0; z-index: 9995;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      pointer-events: none; opacity: 0; transition: opacity 0.15s;
    }
    #mc-inventory.mc-inv-open { opacity: 1; pointer-events: all; }
    #mc-inventory.mc-inv-closed { opacity: 0; pointer-events: none; }
    #mc-inv-box {
      width: 640px; max-width: 95vw;
      background: var(--dt-surface);
      border: 1px solid var(--dt-border); border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4);
      display: flex; flex-direction: column; max-height: 82vh; overflow: hidden;
    }
    #mc-inv-title {
      background: var(--dt-surface2); padding: 14px 16px;
      font-size: 14px; font-weight: 600; color: var(--dt-text);
      border-bottom: 1px solid var(--dt-border);
      display: flex; align-items: center; justify-content: space-between;
      border-radius: 10px 10px 0 0;
    }
    #mc-inv-title .mc-inv-title-icon { color: var(--dt-accent); margin-right: 8px; font-size: 15px; }
    #mc-inv-title button { background: rgba(255,255,255,0.06); border: 1px solid var(--dt-border); color: var(--dt-text2); font-family: var(--dt-font); font-size: 12px; padding: 4px 10px; cursor: pointer; border-radius: 4px; transition: background 0.12s, color 0.12s; }
    #mc-inv-title button:hover { background: rgba(231,76,60,0.14); color: var(--dt-red); }
    #mc-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 12px; background: var(--dt-surface); border-bottom: 1px solid var(--dt-border); }
    .mc-tab { padding: 4px 12px; background: transparent; cursor: pointer; border: 1px solid var(--dt-border); font-family: var(--dt-font); font-size: 12px; color: var(--dt-text2); border-radius: 4px; transition: background 0.1s, color 0.1s; }
    .mc-tab:hover { background: var(--dt-hover); color: var(--dt-text); }
    .mc-tab-active { background: var(--dt-sel) !important; border-color: var(--dt-accent) !important; color: var(--dt-accent) !important; }
    #mc-inv-grid {
      flex: 1; overflow-y: auto; display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px; padding: 12px; background: var(--dt-bg);
      scrollbar-width: thin; scrollbar-color: #444 #1a1a1a;
    }
    .mc-inv-item { background: var(--dt-surface); cursor: pointer; border: 1px solid var(--dt-border); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 4px; gap: 5px; transition: background 0.1s, border-color 0.1s; min-height: 74px; }
    .mc-inv-item:hover { background: var(--dt-surface2); border-color: var(--dt-accent); box-shadow: 0 0 0 1px rgba(77,158,255,0.2); }
    .mc-inv-icon { font-size: 24px; line-height: 1; }
    .mc-inv-name { font-size: 11px; color: var(--dt-text2); text-align: center; line-height: 1.3; }
    #mc-inv-search { padding: 8px 12px; border-top: 1px solid var(--dt-border); background: var(--dt-surface); display: flex; gap: 8px; align-items: center; border-radius: 0 0 10px 10px; }
    #mc-inv-search input { flex: 1; background: var(--dt-surface2); border: 1px solid var(--dt-border); color: var(--dt-text); font-family: var(--dt-font); font-size: 12px; padding: 6px 10px; border-radius: 4px; outline: none; transition: border-color 0.15s; }
    #mc-inv-search input:focus { border-color: var(--dt-accent); }
    #mc-inv-search span { color: var(--dt-text3); font-size: 11px; white-space: nowrap; }

    /* ── SCENE PANEL (left sidebar) ──────────────── */
    #mc-scene-panel {
      position: fixed; left: 0; top: 0; bottom: 24px;
      width: var(--dt-panel-w);
      background: var(--dt-surface);
      border-right: 1px solid var(--dt-border);
      box-shadow: 2px 0 10px rgba(0,0,0,0.25);
      z-index: 9980; display: flex; flex-direction: column;
      font-family: var(--dt-font);
    }
    #mc-scene-panel-hdr {
      background: var(--dt-surface2); padding: 10px 12px;
      font-size: 10px; font-weight: 600; color: var(--dt-text2);
      border-bottom: 1px solid var(--dt-border);
      display: flex; justify-content: space-between; align-items: center;
      letter-spacing: 0.6px; text-transform: uppercase; flex-shrink: 0;
    }
    #mc-scene-panel-hdr button { background: none; border: 1px solid transparent; color: var(--dt-text2); cursor: pointer; font-family: var(--dt-font); font-size: 11px; padding: 2px 6px; border-radius: 3px; transition: background 0.1s, color 0.1s; }
    #mc-scene-panel-hdr button:hover { background: var(--dt-hover); color: var(--dt-accent); border-color: var(--dt-border); }
    #mc-hier-list { flex: 1; overflow-y: auto; min-height: 0; }
    .mc-hier-empty { padding: 18px 12px; text-align: center; color: var(--dt-text3); font-size: 12px; }
    .mc-hier-row { display: flex; align-items: center; gap: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.025); white-space: nowrap; overflow: hidden; transition: background 0.08s; }
    .mc-hier-row:hover { background: var(--dt-hover); }
    .mc-hier-sel { background: var(--dt-sel) !important; color: var(--dt-accent); }
    .mc-hier-hid { opacity: 0.38; }
    .mc-hier-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .mc-hier-acts { display: flex; gap: 2px; opacity: 0; }
    .mc-hier-row:hover .mc-hier-acts { opacity: 1; }
    .mc-hier-eye, .mc-hier-del { background: none; border: none; cursor: pointer; font-size: 11px; padding: 1px 4px; color: var(--dt-text3); border-radius: 3px; transition: color 0.1s, background 0.1s; }
    .mc-hier-eye:hover { color: var(--dt-text); background: var(--dt-hover); }
    .mc-hier-del:hover { color: var(--dt-red); background: rgba(231,76,60,0.1); }

    /* ── DRAW TOOLS (inside scene panel footer) ── */
    #mc-draw-strip {
      border-top: 1px solid var(--dt-border);
      background: var(--dt-bg);
      padding: 8px 8px 6px; flex-shrink: 0;
    }
    #mc-draw-strip-lbl { font-size: 9px; color: var(--dt-text3); text-align: center; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; border-bottom: 1px solid var(--dt-border); margin-bottom: 5px; }
    .mc-draw-btn { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: transparent; cursor: pointer; border: 1px solid var(--dt-border); font-family: var(--dt-font); font-size: 12px; color: var(--dt-text2); border-radius: 4px; transition: background 0.1s, color 0.1s; width: 100%; margin-bottom: 3px; }
    .mc-draw-btn:hover { background: var(--dt-hover); color: var(--dt-text); }
    .mc-draw-btn.mc-active { background: var(--dt-sel); border-color: var(--dt-accent); color: var(--dt-accent); }
    .mc-draw-key { font-size: 9px; color: var(--dt-text3); margin-left: auto; }

    /* ── FILE OPS (inside scene panel footer) ─── */
    #mc-file-strip {
      border-top: 1px solid var(--dt-border);
      background: var(--dt-surface);
      padding: 6px 8px; flex-shrink: 0;
    }
    #mc-file-strip button, #mc-link-btn { background: var(--dt-surface2); cursor: pointer; border: 1px solid var(--dt-border); font-family: var(--dt-font); font-size: 11px; color: var(--dt-text2); padding: 5px 10px; border-radius: 4px; transition: background 0.1s, color 0.1s; width: 100%; margin-bottom: 3px; text-align: left; }
    #mc-file-strip button:hover, #mc-link-btn:hover { background: var(--dt-hover); color: var(--dt-text); }
    #mc-status-msg { font-size: 11px; color: var(--dt-green); text-align: center; min-height: 14px; margin-bottom: 3px; }

    /* ── CODE PANEL ───────────────────────────────── */
    #mc-code-panel {
      position: fixed; bottom: 24px; left: var(--dt-panel-w); right: var(--dt-props-w);
      background: var(--dt-bg);
      border: 1px solid var(--dt-border); border-bottom: none;
      z-index: 9978; overflow: hidden; display: none; flex-direction: column;
    }
    #mc-code-panel.mc-code-open { display: flex; height: 160px; }
    #mc-code-hdr { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--dt-surface2); border-bottom: 1px solid var(--dt-border); }
    #mc-code-hdr span { font-size: 12px; color: var(--dt-accent); font-weight: 500; }
    #mc-code-hdr button { background: var(--dt-surface); border: 1px solid var(--dt-border); color: var(--dt-text2); font-family: var(--dt-font); font-size: 12px; padding: 2px 8px; cursor: pointer; border-radius: 3px; transition: background 0.1s, color 0.1s; }
    #mc-code-hdr button:hover { color: var(--dt-text); background: var(--dt-hover); }
    #mc-code-pre { flex: 1; overflow: auto; padding: 8px 12px; font-family: var(--dt-mono); font-size: 11px; color: #9cdcfe; white-space: pre; line-height: 1.6; }

    /* ── TOAST ────────────────────────────────────── */
    #mc-toast {
      position: fixed; bottom: 82px; left: 50%; transform: translateX(-50%);
      background: var(--dt-surface2); color: var(--dt-text); padding: 8px 18px;
      font-family: var(--dt-font); font-size: 13px;
      border: 1px solid var(--dt-border); border-radius: 6px;
      z-index: 99999; opacity: 0; transition: opacity 0.2s; pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.45);
    }
    #mc-toast.mc-toast-show { opacity: 1; }

    /* ── CROSSHAIR ────────────────────────────────── */
    #mc-crosshair {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      pointer-events: none; z-index: 9970; display: none;
      width: 16px; height: 16px;
    }
    #mc-crosshair::before, #mc-crosshair::after {
      content: ''; position: absolute; background: rgba(255,255,255,0.7);
    }
    #mc-crosshair::before { width: 1px; height: 14px; left: 7px; top: 1px; }
    #mc-crosshair::after  { width: 14px; height: 1px; left: 1px; top: 7px; }
  `;
  document.head.appendChild(style);

  // HTML ─────────────────────────────────────────────────────────────────────
  const root = document.createElement('div'); root.id = 'mc-root';

  root.innerHTML = `
    <!-- Hotbar -->
    <div id="mc-hotbar"></div>

    <!-- Status bar -->
    <div id="mc-statusbar">
      <span id="mc-sb-tool">SELECT</span>
      <div class="mc-sb-sep"></div>
      <span id="mc-sb-cursor" style="color:#3a3a3a;font-family:var(--dt-mono)">0.00, 0.00</span>
      <div class="mc-sb-sep"></div>
      <span id="mc-held"></span>
      <span id="mc-sb-objs" style="color:#3a3a3a">0 objects</span>
      <div class="mc-sb-sep"></div>
      <span id="mc-sb-snap" style="color:#3a3a3a">Snap: 0.5</span>
      <div class="mc-sb-sep"></div>
      <span id="mc-sb-space" style="color:#3a3a3a">🌐 World</span>
      <span style="margin-left:auto;color:#333;font-size:10px">E = Library  ·  1-9 = Slots  ·  Tab = Snap  ·  F = Focus  ·  Ctrl+Z/Y = Undo/Redo</span>
    </div>

    <!-- Draw length HUD -->
    <div id="mc-hud"></div>

    <!-- Scene / Hierarchy panel (left sidebar) -->
    <div id="mc-scene-panel">
      <div id="mc-scene-panel-hdr">
        Scene
        <div style="display:flex;gap:3px">
          <button title="Toggle code panel" onclick="document.getElementById('mc-code-panel').classList.toggle('mc-code-open')">{ }</button>
          <button title="Undo" onclick="window._dt.undo()">↩</button>
          <button title="Redo" onclick="window._dt.redo()">↪</button>
        </div>
      </div>
      <div id="mc-hier-list"><div class="mc-hier-empty">No objects in scene</div></div>

      <!-- Draw tools (embedded in left panel footer) -->
      <div id="mc-draw-strip">
        <div id="mc-draw-strip-lbl">Draw Tools</div>
        <button class="mc-draw-btn" data-tool="wall">█ Wall<span class="mc-draw-key">W</span></button>
        <button class="mc-draw-btn" data-tool="road">🛣 Road<span class="mc-draw-key">D</span></button>
        <button class="mc-draw-btn" data-tool="divider">🟩 Divider<span class="mc-draw-key">I</span></button>
      </div>

      <!-- File ops (embedded in left panel footer) -->
      <div id="mc-file-strip">
        <div id="mc-status-msg"></div>
        <button id="mc-link-btn">📎 Link .js File</button>
        <button id="mc-save-btn">💾 Save to File</button>
        <button id="mc-copy-btn">📋 Copy Code</button>
      </div>
    </div>

    <!-- Properties panel (right sidebar) -->
    <div id="mc-props">
      <div class="mc-props-panel-hdr">Properties</div>
      <div class="mc-props-empty">
        <div class="mc-props-empty-icon">⊡</div>
        <p>Select an object<br>to view properties</p>
      </div>
    </div>

    <!-- Code panel -->
    <div id="mc-code-panel">
      <div id="mc-code-hdr">
        <span>{ } Generated Code</span>
        <div style="display:flex;gap:4px">
          <button onclick="navigator.clipboard.writeText(window._dt.getCode());window._dt.toast&&window._dt.toast('📋 Copied')">📋 Copy</button>
          <button onclick="document.getElementById('mc-code-panel').classList.remove('mc-code-open')">×</button>
        </div>
      </div>
      <pre id="mc-code-pre">// Draw or place objects to generate code</pre>
    </div>

    <!-- Inventory (object library) -->
    <div id="mc-inventory" class="mc-inv-closed">
      <div id="mc-inv-box">
        <div id="mc-inv-title">
          <div><span class="mc-inv-title-icon">⊞</span>Object Library</div>
          <button onclick="closeInventory ? closeInventory() : void(0)">✕ Close  [E]</button>
        </div>
        <div id="mc-tabs">${tabsHTML}</div>
        <div id="mc-inv-grid"></div>
        <div id="mc-inv-search">
          <input id="mc-inv-search-inp" type="text" placeholder="Search objects...">
          <span>ESC or E to close</span>
        </div>
      </div>
    </div>

    <!-- Crosshair -->
    <div id="mc-crosshair"></div>

    <!-- Toast -->
    <div id="mc-toast"></div>
  `;

  document.body.appendChild(root);

  // ── Bind draw tool buttons ─────────────────────────────────────────────────
  root.querySelectorAll('.mc-draw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      setTool(tool);
      // Sync hotbar highlight too
      const slotIdx = HOTBAR_SLOTS.findIndex(s => s.id === tool);
      if (slotIdx >= 0) setSlot(slotIdx);
    });
  });

  // ── Inventory tabs ─────────────────────────────────────────────────────────
  root.querySelectorAll('.mc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      STATE.invTab = tab.dataset.group;
      _updateTabs(); _renderInvGrid();
    });
  });

  // ── Inventory search ───────────────────────────────────────────────────────
  document.getElementById('mc-inv-search-inp')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    const grid = document.getElementById('mc-inv-grid'); if (!grid) return;
    if (!q) { _renderInvGrid(); return; }
    const items = Object.entries(OBJ_DEFS).filter(([k, def]) =>
      def.label.toLowerCase().includes(q) || def.group.toLowerCase().includes(q) || k.includes(q)
    );
    grid.innerHTML = items.map(([key, def]) => `
      <div class="mc-inv-item" data-key="${key}" title="${def.label}">
        <div class="mc-inv-icon">${def.icon||'⬛'}</div>
        <div class="mc-inv-name">${def.label}</div>
      </div>
    `).join('');
    grid.querySelectorAll('.mc-inv-item').forEach(el => {
      el.addEventListener('click', () => {
        STATE.pendingType = el.dataset.key;
        HOTBAR_SLOTS[7] = { id: el.dataset.key, icon: OBJ_DEFS[el.dataset.key]?.icon||'⬛', label: OBJ_DEFS[el.dataset.key]?.label||el.dataset.key, color:'#fff', type:'place' };
        _rebuildHotbar(); setSlot(7); setTool('add'); closeInventory();
        toast(`🖐 Holding: ${OBJ_DEFS[el.dataset.key]?.label}`);
      });
    });
  });

  // ── Inventory close button ─────────────────────────────────────────────────
  document.getElementById('mc-inv-title')?.querySelector('button')?.addEventListener('click', closeInventory);

  // ── Click outside inventory box to close ──────────────────────────────────
  document.getElementById('mc-inventory')?.addEventListener('click', e => {
    if (e.target === document.getElementById('mc-inventory')) closeInventory();
  });

  // ── File controls ──────────────────────────────────────────────────────────
  document.getElementById('mc-link-btn')?.addEventListener('click', _linkFile);
  document.getElementById('mc-save-btn')?.addEventListener('click', _saveToFile);
  document.getElementById('mc-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(_generateCode()); toast('📋 Copied!');
  });

  // ── Build hotbar ───────────────────────────────────────────────────────────
  _rebuildHotbar();

  // ── Render initial inventory grid ──────────────────────────────────────────
  _renderInvGrid();
}

// ══════════════════════════════════════════════════════════════════════════════
// §23  ANIMATE HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function updateDevTool() {
  const root = document.getElementById('mc-root');
  const inPlayer = isPlayerActive();

  // Hide devtool UI in player mode
  if (root) root.style.display = inPlayer ? 'none' : 'block';

  if (inPlayer) {
    TC.detach();
    return;
  }

  TC.visible = STATE.selected.length > 0;

  if (STATE.selected.length === 1 && TC.dragging) {
    _selBox.setFromObject(STATE.selected[0]);
    _renderProps();
  }

  // Sync draw tool buttons
  document.querySelectorAll('.mc-draw-btn').forEach(btn => {
    btn.classList.toggle('mc-active', btn.dataset.tool === STATE.tool);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §24  INIT
// ══════════════════════════════════════════════════════════════════════════════

export function initDevTool() {
  _buildUI();

  const cv = renderer.domElement;
  cv.addEventListener('mousemove', _onMove);
  cv.addEventListener('click',     _onClick);
  cv.addEventListener('dblclick',  _onDblClick);
  window.addEventListener('keydown', _onKey);

  _grid.visible = STATE.showGrid;

  // Expose toast for code panel button
  window._dt.toast = toast;

  console.log(
    '%c🎨 DevTool v4  —  Three-Editor Style\n' +
    'E=Library  1-9=Hotbar  W=Wall  D=Road  I=Divider\n' +
    'Ctrl+Z=Undo  Ctrl+Y=Redo  F=Focus  Tab=Snap  Del=Delete\n\n' +
    '⚠️ CAMERA FIX — interaction.js orbit handlers mein add karo:\n' +
    '   import { isPlayerActive } from \'./player.js\';\n' +
    '   if (isPlayerActive() || !window._dtCanOrbit()) return;',
    'color:#4d9eff;background:#1a1a1a;font-size:13px;font-weight:bold;padding:4px 8px;'
  );

  toast('✏️ Editor ready  ·  E = Open Object Library');
}
import * as THREE from 'three';
import { camera } from './scene.js';
import { clickable } from './world/buildings.js';

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

const panel = document.getElementById('panel');
const panelIcon = document.getElementById('panel-icon');
const panelName = document.getElementById('panel-name');
const panelDesc = document.getElementById('panel-desc');
const panelClose = document.getElementById('panel-close');

panelClose.addEventListener('click', () => {
  panel.style.display = 'none';
});

export function setupInteraction() {
  window.addEventListener('mouseup', (e) => {
    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(clickable, false);
    if (hits.length && hits[0].object.userData?.name) {
      const { name, desc, icon } = hits[0].object.userData;
      panelIcon.textContent = icon;
      panelName.textContent = name;
      panelDesc.textContent = desc;
      panel.style.display = 'block';
    }
  });
}

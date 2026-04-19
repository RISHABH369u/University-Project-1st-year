/**
 * animate.js — Main render loop
 *
 * Flow:
 *   Player active  →  updatePlayer() only   (devtool hidden, orbit disabled)
 *   Edit mode      →  handleControls() + updateDevTool()
 */

import { renderer, scene, camera } from './scene.js';
import { handleControls, syncControls } from './controls.js';
import { updateDevTool } from './devtool.js';
import { updatePlayer, isPlayerActive } from './player.js';

export function animate() {
  // Sync controls target values with initial orbit on first frame
  syncControls();

  let frameCount = 0;

  function loop() {
    requestAnimationFrame(loop);

    if (isPlayerActive()) {
      updatePlayer();
    } else {
      handleControls();
      updateDevTool();
    }

    renderer.render(scene, camera);

    frameCount++;
    if (frameCount === 2) {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
    }
  }

  loop();
}
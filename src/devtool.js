// Original content of devtool.js extracted from commit 38b70648e88ce95b7940c5e3672ccbe14509ed50
import { appMode } from './controls.js';

// Function definitions

function _onClick(event) {
    if (appMode === "PLAY") return;
    // Original _onClick functionality...
}

function _onDblClick(event) {
    if (appMode === "PLAY") return;
    // Original _onDblClick functionality...
}

function _onKey(event) {
    if (appMode === "PLAY") return;
    // Original _onKey functionality...
}

function updateDevTool() {
    if (appMode === 'PLAY') {
        document.getElementById('dt-root').style.display = 'none';
        // Disable TC functionality...
    }
    // Original updateDevTool functionality...
}

// Other existing code...
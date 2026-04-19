// Hide the dev tool UI components when appMode is PLAY
import { appMode } from './controls.js';

if (appMode === 'PLAY') {
    // Hide dt-root and dt-toolbar
    const dtRoot = document.getElementById('dt-root');
    const dtToolbar = document.getElementById('dt-toolbar');
    if (dtRoot) dtRoot.style.display = 'none';
    if (dtToolbar) dtToolbar.style.display = 'none';
    // Further hide other dev tool UI components
    const devToolComponents = document.querySelectorAll('.dev-tool-ui');
    devToolComponents.forEach(component => component.style.display = 'none');
}
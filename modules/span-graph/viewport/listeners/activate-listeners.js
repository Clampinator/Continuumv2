import { handleZoom } from '../actions/handle-zoom.js';

/**
 * HUD: ACTIVATE LISTENERS
 * Delegator for the Interaction Machine and Viewport controls.
 */
export function activateListeners(viewport) {
    if (!viewport.svg) return;

    // --- THE INTERACTION MACHINE (Pointer Machine) ---
    viewport.svg.addEventListener('pointerdown', (e) => {
        const rect = viewport.svg.getBoundingClientRect();
        viewport.pointerMachine.onDown(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', (e) => {
            const rect = viewport.svg.getBoundingClientRect();
            viewport.pointerMachine.onMove(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
        });

        window.addEventListener('pointerup', (e) => {
            const rect = viewport.svg.getBoundingClientRect();
            viewport.pointerMachine.onUp(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
        });
    }

    // --- VIEWPORT CONTROLS (Zoom/Pan) ---
    viewport.svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.8 : 1.25;
        const rect = viewport.container.getBoundingClientRect();
        
        const updates = handleZoom(viewport.viewState, factor, { 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
        });
        viewport.setViewState(updates);
    }, { passive: false });

    // Prevent default context menu on the SVG itself
    viewport.svg.addEventListener('contextmenu', (e) => e.preventDefault());
}

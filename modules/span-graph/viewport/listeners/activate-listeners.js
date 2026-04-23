import { onPointerDown } from './on-pointer-down.js';
import { onPointerMove } from './on-pointer-move.js';
import { onPointerUp } from './on-pointer-up.js';
import { onContextMenu } from './on-context-menu.js';
import { handleZoom } from '../actions/handle-zoom.js';

/**
 * Activates all event listeners for the Span Graph viewport.
 */
export function activateListeners(viewport) {
    if (!viewport.svg) return;

    viewport.svg.addEventListener('pointerdown', (e) => onPointerDown(e, viewport));

    if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', (e) => onPointerMove(e, viewport));
        window.addEventListener('pointerup', (e) => onPointerUp(e, viewport));
    }

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

    viewport.svg.addEventListener('contextmenu', (e) => onContextMenu(e, viewport));
}

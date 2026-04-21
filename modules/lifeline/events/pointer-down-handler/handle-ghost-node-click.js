import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * Initializes ghost node insertion mode if the target is an insert ghost.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 * @param {object} viewState 
 * @returns {boolean} True if the event was handled.
 */
export function handleGhostNodeClick(event, svg, viewState) {
    if (event.target.classList.contains('graph-node-insert-ghost')) {
        Sound.click();
        
        // AUTHORITY: Capture the exact interpolated coordinates at the moment of click.
        // This prevents the "Head Node Drift" if the mouse moves before pointerup.
        if (viewState.hoveredSegment) {
            viewState.insertionPoint = { ...viewState.hoveredSegment };
        }

        viewState.interactionMode = 'insert-event'; 
        viewState.isDragging = true; 
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return true;
    }
    return false;
}

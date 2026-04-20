import { Sound } from '/systems/continuum/modules/sound-manager.js';

/**
 * Initializes drag mode for "The Yet" nodes.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 * @param {object} viewState 
 * @returns {boolean} True if the event was handled.
 */
export function handleYetNodeDrag(event, svg, viewState) {
    if (event.target.classList.contains('graph-node-yet')) {
        Sound.click();
        viewState.isDragging = true;
        viewState.interactionMode = 'drag-yet';
        viewState.activeDragType = 'yet';
        viewState.draggedYetId = event.target.getAttribute('data-id');
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return true;
    }
    return false;
}

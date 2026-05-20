import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * Manages clicks or drags on empty graph space.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 * @param {object} viewState 
 * @param {object} graphData 
 */
export function handleBackgroundInteraction(event, svg, viewState, graphData) {
    const rect = svg.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const worldAge = (pointerX - viewState.x) / viewState.scaleX;
    const nowAge = graphData.nowNode?.age || 0;

    // 1. FUTURE PRIORITY: Clicking to the right of "Now" creates a floating Yet item
    if (event.button === 0 && worldAge > nowAge + 0.1) {
        viewState.interactionMode = 'create-yet';
        viewState.isDragging = true;
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return;
    }

    // 2. RETROSPECTIVE PRIORITY: Clicking on a highlighted path segment inserts an event
    if (viewState.hoveredSegment && event.button === 0) {
        Sound.click();
        viewState.interactionMode = 'insert-event';
        viewState.isDragging = true;
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return;
    }

    // 3. FALLBACK: Standard Panning logic
    if (event.button === 0) {
        viewState.interactionMode = 'pan';
        viewState.isDragging = true;
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
    }
}

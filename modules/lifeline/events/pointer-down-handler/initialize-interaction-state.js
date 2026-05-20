/**
 * Captures initial pointer coordinates and targets for tracking during an interaction.
 * @param {PointerEvent} event 
 * @param {object} viewState 
 */
export function initializeInteractionState(event, viewState) {
    viewState.pointerDownTarget = event.target;
    viewState.pointerDownX = event.clientX;
    viewState.pointerDownY = event.clientY;
    viewState.lastPointerX = event.clientX;
    viewState.lastPointerY = event.clientY;
    viewState.hasMovedSignificantDistance = false;
}

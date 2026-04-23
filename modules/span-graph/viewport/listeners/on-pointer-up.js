import { handleNodeDrop } from '../actions/handle-node-drop.js';

/**
 * Handles the pointerup event for the Span Graph.
 */
export function onPointerUp(event, viewport) {
    if (!viewport._interaction.isDragging) return;
    const state = viewport._interaction;
    
    if (viewport.tooltipManager) viewport.tooltipManager.hide();
    viewport.viewState.interactionMode = 'pan';
    
    if (!state.hasSignificantMovement) {
        // Clicks on rails for insertion
        if (state.isRailTarget && viewport._interaction.hoverWorldPos) {
            viewport._handleGhostNodeClick();
        }
    } else if (state.type === 'node') {
        // Drag end for node/NOW movement
        const world = state.currentWorld;
        handleNodeDrop(viewport, world, state.mode, state.nodeElement.classList.contains('graph-node-now'));
    }

    viewport._interaction.isDragging = false;
    viewport._render();
}

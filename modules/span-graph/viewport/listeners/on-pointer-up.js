import { handleNodeDrop } from '../actions/handle-node-drop.js';
import { resolveEraDrag } from '/systems/continuum-v2/modules/temporal-kernel/resolve-era-drag.js';

/**
 * Handles the pointerup event for the Span Graph.
 * DEEP DECIMATION REBUILT: Finalizes interaction state.
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
    } else if (state.type === 'create-era') {
        // ERA CREATION: Validate drag and open dialog
        _completeEraCreation(viewport, state);
    } else if (state.type === 'node') {
        // Drag end for node/NOW movement
        const world = state.currentWorld;
        const isNow = state.nodeElement?.classList.contains('graph-node-now');
        handleNodeDrop(viewport, world, state.mode, isNow);
    }

    viewport._interaction.isDragging = false;
    viewport._render();
}

/**
 * Completes an era creation drag gesture.
 * Validates via the kernel and opens the create era dialog.
 */
async function _completeEraCreation(viewport, state) {
    const startAge = state.startWorld?.eventAge || 0;
    const currentAge = state.currentWorld?.eventAge || 0;
    const result = resolveEraDrag(viewport.actor.system.eras, startAge, currentAge);

    if (!result.isValid) {
        viewport._interaction = { ...viewport._interaction, isDragging: false, type: null, mode: null };
        return;
    }

    viewport._interaction.isPending = true;
    viewport.viewState.interactionMode = 'dialog-open';

    // Set creation context for the dialog
    viewport.viewState.creationStartAgeSeconds = result.startAgeSeconds;
    viewport.viewState.creationCurrentAgeSeconds = currentAge;

    const { showCreateEraDialog } = await import('../../../span-graph-ui-dialogs.js');
    showCreateEraDialog(
        viewport.viewState,
        {},
        viewport.actor.sheet,
        viewport.svg,
        result.durationSeconds,
        Object.values(viewport.actor.system.eras || {}),
        result.isFirstEra
    );

    viewport._interaction = { ...viewport._interaction, isDragging: false, isPending: false, type: null, mode: null };
    viewport._render();
}
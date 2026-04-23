import { getDragMode, constrainMovement } from '/systems/continuum-v2/modules/span-graph/actions/drag-physics.js';

/**
 * Handles the pointermove event for the Span Graph.
 * ADI REBUILT: Consistent x/y coordinate isolation.
 */
export function onPointerMove(event, viewport) {
    const rect = viewport.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!viewport._interaction.isDragging) {
        viewport._updateGhostNodeHover(x, y);
        return;
    }

    const dx = x - viewport._interaction.startX;
    const dy = y - viewport._interaction.startY;

    // 1. Resolve Move Mode (Threshold Gate)
    if (!viewport._interaction.hasSignificantMovement) {
        if (Math.hypot(dx, dy) < 5) return;
        viewport._interaction.hasSignificantMovement = true;
        
        if (viewport._interaction.type === 'node') {
            const isNowNode = viewport._interaction.nodeElement?.classList.contains('graph-node-now');
            const history = viewport._interaction.cachedHistory || [];
            const lastEvent = history[history.length - 1];
            const spanRank = viewport.actor.system.spanning?.span || 0;

            viewport._interaction.mode = getDragMode(dx, dy, { 
                isNow: isNowNode, 
                lastEvent: lastEvent,
                spanRank: spanRank 
            });
            viewport.viewState.interactionMode = 'drag-node';
        }
    }

    // 2. Perform Movement
    if (viewport._interaction.type === 'node') {
        const rawWorld = viewport.screenToWorld(x, y);
        const world = constrainMovement(rawWorld, viewport._interaction.startWorld, viewport._interaction.mode);
        viewport._interaction.currentWorld = world;
        viewport._render();
    } else if (viewport._interaction.type === 'pan') {
        const newPan = {
            panX: viewport._interaction.startPanX + dx,
            panY: viewport._interaction.startPanY + dy
        };
        viewport.setViewState(newPan);
    }
}

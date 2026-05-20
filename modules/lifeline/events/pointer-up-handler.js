// modules/lifeline/events/pointer-up-handler.js
import { renderGraph } from '../../span-graph-render.js';
import { releaseSvgCapture } from './pointer-up-handler/release-svg-capture.js';
import { cleanupDragTooltips } from './pointer-up-handler/cleanup-drag-tooltips.js';
import { handleYetCreation } from './pointer-up-handler/handle-yet-creation.js';
import { handleEventInsertion } from './pointer-up-handler/handle-event-insertion.js';
import { handleYetDrop } from './pointer-up-handler/handle-yet-drop.js';
import { handleNodeDrop } from './pointer-up-handler/handle-node-drop.js';
import { handleEraCreation } from './pointer-up-handler/handle-age-creation.js';
import { handlePanningCleanup } from './pointer-up-handler/handle-panning-cleanup.js';

export async function handlePointerUp(event, svg, sheet, viewState, graphData) {
    if (!svg.isConnected || viewState.isProcessingPointer || viewState.interactionMode === 'dialog-open') return;

    releaseSvgCapture(event, svg);
    cleanupDragTooltips(sheet, viewState);

    const previousMode = viewState.interactionMode;
    const significantMove = viewState.hasMovedSignificantDistance;
    const isLeaveEvent = event.type === 'pointerleave' || event.type === 'mouseleave';

    viewState.isProcessingPointer = true;
    viewState.isDragging = false;
    viewState.dragTooltip = null; 

    try {
        if (isLeaveEvent) {
            viewState.interactionMode = 'pan';
            renderGraph(svg, viewState, graphData);
            return;
        }

        if (previousMode === 'create-yet' && !significantMove) {
            return handleYetCreation(viewState, graphData, sheet, svg);
        }

        if (previousMode === 'insert-event' && !significantMove && viewState.hoveredSegment) {
            return handleEventInsertion(viewState, graphData, sheet, svg);
        }

        if (previousMode === 'drag-yet') {
            return await handleYetDrop(event, svg, sheet, viewState, graphData);
        }

        if (previousMode === 'drag-node') {
            return await handleNodeDrop(event, svg, sheet, viewState, graphData);
        }

        if (previousMode === 'create-era') {
            return handleEraCreation(viewState, graphData, sheet, svg);
        }

        handlePanningCleanup(event, svg, sheet, viewState, graphData);
    } finally {
        viewState.pointerDownTarget = null;
        viewState.isProcessingPointer = false;
        // Reset movement flag so it doesn't block the `contextmenu` event that fires after right-click pointerup.
        // The right-click drag-tracking (map-pan mode) sets this flag for movements >5px, which would otherwise
        // suppress the context menu even on a normal right-click.
        viewState.hasMovedSignificantDistance = false;
    }
}

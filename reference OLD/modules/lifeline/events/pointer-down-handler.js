
import { initializeInteractionState } from './pointer-down-handler/initialize-interaction-state.js';
import { handleGhostNodeClick } from './pointer-down-handler/handle-ghost-node-click.js';
import { handleYetNodeDrag } from './pointer-down-handler/handle-yet-node-drag.js';
import { handleNowNodeDrag } from './pointer-down-handler/handle-now-node-drag.js';
import { handleEraCreationDrag } from './pointer-down-handler/handle-age-creation-drag.js';
import { handleBackgroundInteraction } from './pointer-down-handler/handle-background-interaction.js';

export function handlePointerDown(event, svg, sheet, viewState, graphData) {
    if (!svg.isConnected) return;
    if (viewState.interactionMode === 'dialog-open' || viewState.isProcessingPointer) return;

    // 1. Record initial interaction state
    initializeInteractionState(event, viewState);

    // NEW: Handle Right-Click dragging globally for Map Panning
    if (event.button === 2) {
        viewState.interactionMode = 'map-pan';
        viewState.isDragging = true;
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return;
    }

    // 2. Delegate to specialized handlers based on target type
    if (handleGhostNodeClick(event, svg, viewState)) return;
    if (handleYetNodeDrag(event, svg, viewState)) return;
    if (handleNowNodeDrag(event, svg, sheet, viewState, graphData)) return;
    if (handleEraCreationDrag(event, svg, viewState, graphData)) return;

    // 3. Fallback to background logic
    handleBackgroundInteraction(event, svg, viewState, graphData);
}

import { calculateConstrainedPosition } from './calculate-constrained-position.js';
import { generateDragTooltip } from './generate-drag-tooltip.js';

/**
 * Orchestrates the drag logic for the leading "Now" node.
 * @param {PointerEvent} event 
 * @param {DOMRect} rect 
 * @param {object} viewState 
 * @param {object} graphData 
 */
export function handleDrag(event, rect, viewState, graphData) {
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 1. Calculate physics and constraints (Blocks vertical for Rank 0)
    const { 
        constrained, 
        mode, 
        isValid, 
        spanningRestricted, 
        dx, 
        dy 
    } = calculateConstrainedPosition(mouseX, mouseY, viewState, graphData);
    
    // 2. Synchronize viewState and temporary graph data
    viewState.activeDragType = mode;
    viewState.isDragValid = isValid;
    
    // VISUAL PREVIEW ONLY: Not committed to DB. The NOW node reverts
    // if the drag is cancelled or the dialog is dismissed.
    graphData.nowNode.age = constrained.age;
    graphData.nowNode.time = constrained.time;

    // 3. Generate visual feedback
    viewState.dragTooltip = generateDragTooltip(
        constrained, 
        viewState.dragStartWorld, 
        mode, 
        graphData, 
        isValid, 
        spanningRestricted, 
        dx, 
        dy
    );
}

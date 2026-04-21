import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';
import { DragTooltipService } from '../../services/ui/drag-tooltip-service.js';

/**
 * Initializes spatial or temporal movement from the "Now" node.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 * @param {ActorSheet} sheet 
 * @param {object} viewState 
 * @param {object} graphData 
 * @returns {boolean} True if the event was handled.
 */
export function handleNowNodeDrag(event, svg, sheet, viewState, graphData) {
    if (event.target.classList.contains('graph-node-now')) {
        if (event.button === 0) {
            Sound.click();
            viewState.isDragging = true;
            viewState.interactionMode = 'drag-node';
            viewState.isDragValid = true; 
            viewState.activeDragType = null;
            viewState.dragStartScreenX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
            viewState.dragStartScreenY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
            viewState.dragStartWorld = { ...graphData.nowNode };

            // Create global HTML tooltip for the drag
            viewState.activeTooltipElement = DragTooltipService.create(sheet.actor.id, event);

            if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
            return true;
        }
    }
    return false;
}

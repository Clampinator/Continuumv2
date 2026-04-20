import { InteractionController } from '/systems/continuum/modules/lifeline/controllers/interaction-controller.js';
import { HoverHandler } from '/systems/continuum/modules/lifeline/handlers/hover-handler.js';
import { renderGraph } from '/systems/continuum/modules/span-graph-render.js';
import { DragTooltipService } from '../services/ui/drag-tooltip-service.js';
import { panMapByPixels } from '../../span-graph-map.js';

/**
 * Atomic handler for continuous pointer movement.
 */
export function handlePointerMove(event, svg, viewState, graphData, sheet) {
    if (!svg.isConnected) return;
    if (viewState.interactionMode === 'dialog-open' || viewState.isProcessingPointer) return;

    if (!viewState.isDragging) {
        HoverHandler.handle(event, svg, viewState, graphData);
        return;
    }
    
    const rect = svg.getBoundingClientRect();
    if (!viewState.hasMovedSignificantDistance) {
        if (Math.hypot(event.clientX - viewState.pointerDownX, event.clientY - viewState.pointerDownY) < 5) return; 
        viewState.hasMovedSignificantDistance = true;
        if (viewState.interactionMode === 'create-yet') viewState.interactionMode = 'pan';
    }

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    switch(viewState.interactionMode) {
        case 'pan':
        case 'insert-event':
        case 'create-yet':
            const dx = event.clientX - viewState.lastPointerX;
            const dy = event.clientY - viewState.lastPointerY;
            viewState.x += dx;
            viewState.y += dy;
            viewState.lastPointerX = event.clientX;
            viewState.lastPointerY = event.clientY;
            requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
            break;
        case 'map-pan':
            const mdx = event.clientX - viewState.lastPointerX;
            const mdy = event.clientY - viewState.lastPointerY;
            viewState.lastPointerX = event.clientX;
            viewState.lastPointerY = event.clientY;
            panMapByPixels(mdx, mdy, sheet.actor.id);
            break;
        case 'create-era':
            viewState.creationCurrentAgeSeconds = Math.max(viewState.creationStartAgeSeconds, (mouseX - viewState.x) / viewState.scaleX);
            requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
            break;
        case 'drag-node':
            InteractionController.onHeadDrag(event, rect, svg, viewState, graphData);
            if (viewState.activeTooltipElement) {
                DragTooltipService.update(viewState.activeTooltipElement, event, viewState.dragTooltip);
            }
            break;
        case 'drag-yet':
            // Milestone 5: Collision Detection for Fulfillment
            if (graphData.nowNode) {
                const nowX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
                const nowY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
                const dist = Math.hypot(mouseX - nowX, mouseY - nowY);
                
                // Detection threshold for "Now" drop zone
                const isOverNow = dist < 25;
                if (viewState.isYetFulfillmentTarget !== isOverNow) {
                    viewState.isYetFulfillmentTarget = isOverNow;
                    // Force redraw to update Now node appearance
                    requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
                }
            }
            InteractionController.onYetDrag(mouseX, mouseY, viewState, graphData, svg);
            break;
    }
}
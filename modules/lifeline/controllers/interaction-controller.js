import { HeadNodeHandler } from '/systems/continuum-v2/modules/lifeline/handlers/head-node-handler.js';
import { renderGraph } from '/systems/continuum-v2/modules/span-graph-render.js';

/**
 * Controller to route interactions to atomic handlers.
 */
export const InteractionController = {
    /**
     * Routes NOW node dragging.
     */
    onHeadDrag(event, rect, svg, viewState, graphData) {
        // Ensure the render guard allows this update
        viewState.forceRedraw = true;
        
        HeadNodeHandler.handleDrag(event, rect, viewState, graphData);
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
    },

    /**
     * Logic for snapping YET nodes.
     */
    onYetDrag(mouseX, mouseY, viewState, graphData, svg) {
        viewState.forceRedraw = true;
        viewState.dragCurrentX = mouseX;
        viewState.dragCurrentY = mouseY;
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
    }
};

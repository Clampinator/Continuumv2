// continuum/modules/span-graph-render.js
import { LayerManager } from '/systems/continuum-v2/modules/lifeline/painters/layer-manager.js';

/**
 * Main entry point for the graph rendering loop.
 */
export function renderGraph(svg, viewState, graphData) {
    if (!svg || !viewState || !graphData) return;
    
    // REDESIGNED: The previous camera-only guard was too aggressive, 
    // blocking updates for internal node movement (NOW node drag).
    // We now rely on the calling controllers to determine if a render is needed.
    
    LayerManager.render(svg, viewState, graphData);

    // Sync state for camera-dependent logic if needed elsewhere
    viewState.lastRenderedView = {
        x: viewState.x,
        y: viewState.y,
        scaleX: viewState.scaleX,
        scaleY: viewState.scaleY
    };
    viewState.forceRedraw = false;
}

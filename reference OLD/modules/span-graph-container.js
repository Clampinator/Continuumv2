// continuum/modules/span-graph-container.js
import { processGraphData } from './span-graph-data-processor.js';
import { getSheetContext } from './span-graph-state.js';
import { renderGraph } from './span-graph-render.js';
import { attachGraphListeners } from './span-graph-interactions.js';
import { fitGraphToView } from './span-graph-viewport.js';
import { initializeLifelineMap } from './span-graph-map.js';

/**
 * Initializes the Span Graph inside a specific sheet or application.
 */
export function initializeSpanGraph(html, sheet) {
    const svg = html.find('.span-graph-svg')[0];
    if (!svg) return;

    const { viewState, graphData } = getSheetContext(sheet);

    // 1. Process Data
    processGraphData(sheet, graphData);

    // 2. Attach Global/Interaction Listeners
    attachGraphListeners(svg, sheet);

    // 3. Real-time update hook - re-render whenever this actor's data changes.
    // Foundry's auto-render chain (actor._onUpdate -> sheet.render) is not
    // reliable for all clients and Foundry versions. This hook is the
    // authoritative update path for all clients including players.
    if (viewState._updateHookId !== undefined) {
        Hooks.off('updateActor', viewState._updateHookId);
        viewState._updateHookId = undefined;
    }
    viewState._updateHookId = Hooks.on('updateActor', (updatedActor) => {
        if (updatedActor.id !== sheet.actor.id) return;
        // Don't interrupt an active drag or dialog
        if (viewState.interactionMode === 'dialog-open' || viewState.isDragging) return;
        const liveSvg = sheet.element?.find('.span-graph-svg')[0];
        if (!liveSvg?.isConnected) {
            Hooks.off('updateActor', viewState._updateHookId);
            viewState._updateHookId = undefined;
            return;
        }
        processGraphData(sheet, graphData);
        renderGraph(liveSvg, viewState, graphData);
    });

    // 3. Initialize Map Background (Character View)
    const mapContainer = html.find('.lifeline-map-background')[0];
    if (mapContainer && sheet.actor) {
        const birthLat = sheet.actor.system.personal?.birthLat;
        const birthLng = sheet.actor.system.personal?.birthLng;
        // The service handles API loading and error reporting
        initializeLifelineMap(mapContainer, birthLat || 51.5072, birthLng || 0.1276, sheet.actor.id);
    }

    // 4. Setup Render Loop Guard
    // Note: We use a ResizeObserver to ensure initial draw and responsive scaling.
    // Disconnect the previous observer before creating a new one to prevent accumulation.
    if (viewState._resizeObserver) {
        viewState._resizeObserver.disconnect();
        viewState._resizeObserver = null;
    }

    const resizeObserver = new ResizeObserver((entries) => {
        if (!svg.isConnected) return;
        const entry = entries[0];
        if (entry.contentRect.width <= 0) return;

        if (!viewState.initialized) {
            viewState.initialized = true;
            fitGraphToView(svg, viewState, graphData);
        } else {
            renderGraph(svg, viewState, graphData);
        }
    });

    viewState._resizeObserver = resizeObserver;
    resizeObserver.observe(svg);

    // Immediate draw if possible
    if (svg.getBoundingClientRect().width > 0) {
        if (!viewState.initialized) {
            viewState.initialized = true;
            fitGraphToView(svg, viewState, graphData);
        } else {
            renderGraph(svg, viewState, graphData);
        }
    }
}

/**
 * Returns a subset of graph data for debugging purposes.
 */
export function getGraphDebugData(sheet) {
    const { viewState, graphData } = getSheetContext(sheet);
    return { viewState, graphData };
}

/**
 * High-level viewport control.
 */
export function fitGraph(sheet) {
    const svg = sheet.element.find('.span-graph-svg')[0];
    const { viewState, graphData } = getSheetContext(sheet);
    if (svg && viewState && graphData) {
        fitGraphToView(svg, viewState, graphData);
    }
}
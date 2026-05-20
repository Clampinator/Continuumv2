/**
 * Handles the zooming logic for the Span Graph viewport.
 * 
 * @param {Object} viewState - Current viewport state.
 * @param {number} factor - Zoom multiplier.
 * @param {Object|null} anchor - Screen {x, y} to zoom toward.
 * @returns {Object} New partial viewState.
 */
export function handleZoom(viewState, factor, anchor = null) {
    const oldZoom = viewState.zoom;
    const newZoom = Math.max(0.000000001, Math.min(oldZoom * factor, 100)); 
    
    if (!anchor) {
        return { zoom: newZoom };
    }

    const actualFactor = newZoom / oldZoom;
    return { 
        zoom: newZoom, 
        panX: anchor.x - (anchor.x - viewState.panX) * actualFactor, 
        panY: anchor.y - (anchor.y - viewState.panY) * actualFactor 
    };
}

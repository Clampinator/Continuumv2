/**
 * Handles the panning logic for the Span Graph viewport.
 * 
 * @param {Object} viewState - Current viewport state.
 * @param {number} dx - Delta X in screen pixels.
 * @param {number} dy - Delta Y in screen pixels.
 * @returns {Object} New partial viewState.
 */
export function handlePan(viewState, dx, dy) {
    return {
        panX: viewState.panX + dx,
        panY: viewState.panY + dy
    };
}

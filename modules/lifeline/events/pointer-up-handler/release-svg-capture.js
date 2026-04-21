/**
 * Releases pointer capture from the SVG element if it was active.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 */
export function releaseSvgCapture(event, svg) {
    if (event.pointerId && svg.releasePointerCapture && svg.hasPointerCapture?.(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
    }
}

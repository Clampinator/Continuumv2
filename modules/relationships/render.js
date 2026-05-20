
import { setupGraphView as setup } from './render/setup-graph-view.js';
import { renderElements as render, addArrowMarkers as addMarkers } from './render/render-elements.js';
import { tickSimulation as tick } from './render/tick-simulation.js';
import { updateTimeVisibility as update } from './render/update-time-visibility.js';

/**
 * Character Relationship Render Domain
 * Refactored into Atomic Units per the ALF Protocol.
 * 
 * Fragmentation Manifest:
 * - setupGraphView -> char-relationship-render/setup-graph-view.js
 * - renderElements -> char-relationship-render/render-elements.js
 * - tickSimulation -> char-relationship-render/tick-simulation.js
 * - updateTimeVisibility -> char-relationship-render/update-time-visibility.js
 */

/**
 * Proxies call to setup-graph-view unit.
 */
export function setupGraphView(container) {
    return setup(container);
}

/**
 * Proxies call to addArrowMarkers unit.
 */
export function addArrowMarkers(svg) {
    return addMarkers(svg);
}

/**
 * Proxies call to render-elements unit.
 */
export function renderElements(g, data) {
    return render(g, data);
}

/**
 * Proxies call to tick-simulation unit.
 */
export function tickSimulation(renderRefs) {
    return tick(renderRefs);
}

/**
 * Proxies call to update-time-visibility unit.
 */
export function updateTimeVisibility(renderRefs, time, data) {
    return update(renderRefs, time, data);
}

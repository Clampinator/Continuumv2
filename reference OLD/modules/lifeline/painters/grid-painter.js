import { drawGridLines } from './grid-painter/draw-grid-lines.js';
import { updateAxisLabels } from './grid-painter/update-axis-labels.js';

/**
 * Grid Painter Domain
 * Orchestrator for rendering background grid and axis metadata.
 */
export const GridPainter = {
    /**
     * Proxies call to the atomic draw-grid-lines unit.
     */
    draw(group, width, height, viewState) {
        return drawGridLines(group, width, height, viewState);
    },

    /**
     * Proxies call to the atomic update-axis-labels unit.
     */
    updateLabels(group, width, height, viewState) {
        return updateAxisLabels(group, width, height, viewState);
    }
};
import { drawGridLines } from './grid-painter/draw-grid-lines.js';
import { updateAxisLabels } from './grid-painter/update-axis-labels.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Compute formatted axis labels from viewport state.
TTL calls happen here so the atomic update-axis-labels painter
stays dumb (no TTL imports).
*/
function computeLegacyAxisLabels(width, height, viewState) {
    const ageLabels = [];
    const timeLabels = [];
    const gutterHeight = 35;

    for (let i = 0; i <= 5; i++) {
        const screenX = (width / 5) * i;
        const ageSeconds = (screenX - viewState.x) / viewState.scaleX;
        ageLabels.push({ screenX, label: formatSubjectiveAge(ageSeconds) });
    }

    for (let i = 0; i <= 5; i++) {
        const screenY = ((height - gutterHeight) / 5) * i;
        const timestamp = (screenY - viewState.y) / viewState.scaleY;
        const dt = timestampToDateString(timestamp);
        timeLabels.push({ screenY, date: dt.date, time: dt.time });
    }

    return { ageLabels, timeLabels };
}

/**
 * Grid Painter Domain
 * Orchestrator for rendering background grid and axis metadata.
 */
export const GridPainter = {
    draw(group, width, height, viewState) {
        return drawGridLines(group, width, height, viewState);
    },

    updateLabels(group, width, height, viewState) {
        const axisLabels = computeLegacyAxisLabels(width, height, viewState);
        return updateAxisLabels(group, width, height, viewState, axisLabels);
    }
};
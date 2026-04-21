import { normalizeDateInput } from '../../span-graph-utils.js';

/**
 * Validates date inputs and updates the time scale, axis, and actor flags.
 * @param {object} params - { minInput, maxInput, timeScale, axisGroup, xAxis, sheet }
 */
export function updateBoundsState({ minInput, maxInput, timeScale, axisGroup, xAxis, sheet }) {
    const sTs = new Date(normalizeDateInput(minInput.property("value"))).getTime();
    const eTs = new Date(normalizeDateInput(maxInput.property("value"))).getTime();
    
    if (!isNaN(sTs) && !isNaN(eTs) && sTs < eTs) {
        timeScale.domain([new Date(sTs), new Date(eTs)]);
        axisGroup.call(xAxis);
        sheet.actor.setFlag('continuum-v2', 'relMapTimeline', { start: sTs, end: eTs });
    }
}

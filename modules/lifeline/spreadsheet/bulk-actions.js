import { findEventPath } from './data-utils.js';
import { SECONDS_IN_YEAR } from '../../temporal-engine/constants.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { flattenEvents } from '../../span-graph-data-processor.js';

/**
 * Applies a relative time shift to multiple events.
 * Correctly maintains the Diagonal Authority by updating Date along with Age.
 * 
 * @param {Actor} actor 
 * @param {Array} eventIds 
 * @param {number} yearsDelta 
 */
export async function applyBulkTimeShift(actor, eventIds, yearsDelta) {
    if (!eventIds || eventIds.length === 0) return;

    const secondsDelta = yearsDelta * SECONDS_IN_YEAR;
    const updates = {};

    // 1. We must calculate the NEW state of the character to ensure the shift 
    // is applied to the projected timeline, not just a dead value.
    const history = flattenEvents(actor.system.eras || {});
    const state = getTemporalState(history);

    for (const eventId of eventIds) {
        const path = findEventPath(actor, eventId);
        if (!path) continue;

        const event = state.events.find(e => e.id === eventId);
        if (!event) continue;

        // Calculate NEW world coordinates
        const newAge = (event.age || 0) + secondsDelta;
        
        // Find the segment this new age belongs to
        const activeSegment = [...state.segments].reverse().find(s => s.startAge <= newAge) 
                           || state.segments[0];
        
        // RE-PROJECT: This is the fix. We don't just change age, we find the new Date.
        const ageDelta = newAge - activeSegment.startAge;
        const newTime = activeSegment.startTime + (ageDelta * 1000);
        
        // Convert ms timestamp to YYYY-MM-DD
        const dateObj = new Date(newTime);
        const newDateStr = dateObj.toISOString().split('T')[0];
        const newTimeStr = dateObj.toISOString().split('T')[1].substring(0, 5);

        updates[`${path}.age`] = newAge;
        
        if (event.isSpan) {
            updates[`${path}.spanFromDate`] = newDateStr;
            updates[`${path}.spanFromTime`] = newTimeStr;
        } else {
            updates[`${path}.date`] = newDateStr;
            updates[`${path}.time`] = newTimeStr;
        }
    }

    if (Object.keys(updates).length > 0) {
        console.log(`[LSS] Bulk shifting ${Object.keys(updates).length} events by ${yearsDelta} years. Recalculating projected dates.`);
        return await actor.update(updates);
    }
}

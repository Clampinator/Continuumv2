import { findEventPath } from './data-utils.js';
import { SECONDS_IN_YEAR } from '../../temporal-engine/constants.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { flattenEvents } from '../../span-graph-data-processor.js';
import { ReferenceResolver } from '../services/reference-resolver.js';

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

    // 1. Calculate canonical state
    const history = flattenEvents(actor.system.eras || {});
    const dobTimestamp = ReferenceResolver.resolveOrigin(actor);
    const state = getTemporalState(history);

    if (!state.segments || state.segments.length === 0) {
        ui.notifications.error("Cannot shift events: Timeline is empty or invalid.");
        return;
    }

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
        
        // RE-PROJECT: Calculate new Date
        const ageDelta = newAge - (activeSegment.startAge || 0);
        
        // AUTHORITY: Resolve the absolute startTime for this segment
        let segmentStartTime = activeSegment.startTime;
        
        // If startTime is a duration string (HH:MM:SS), resolve it against DOB
        if (typeof segmentStartTime === 'string') {
            segmentStartTime = dobTimestamp + (activeSegment.startAge * 1000);
        }

        const newTime = Number(segmentStartTime) + (ageDelta * 1000);
        
        if (isNaN(newTime) || newTime < 0) {
            console.error(`[LSS] Calculated invalid newTime ${newTime} for event ${eventId}`);
            continue;
        }

        // Convert ms timestamp to YYYY-MM-DD
        try {
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
        } catch (e) {
            console.error(`[LSS] Failed to format date for time ${newTime}`, e);
        }
    }

    if (Object.keys(updates).length > 0) {
        console.log(`[LSS] Bulk shifting ${Object.keys(updates).length} events. Recalculating projected dates.`);
        return await actor.update(updates);
    }
}

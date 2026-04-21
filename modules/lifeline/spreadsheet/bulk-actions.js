import { findEventPath } from './data-utils.js';
import { SECONDS_IN_YEAR_STRICT } from '../../temporal-engine/constants.js';

/**
 * Applies a relative time shift to multiple events.
 * GUARANTEE: Maintains 1:1 Diagonal Authority by applying the same delta
 * to both Subjective Age and Objective Date.
 * 
 * @param {Actor} actor 
 * @param {Array} eventIds 
 * @param {number} yearsDelta 
 */
export async function applyBulkTimeShift(actor, eventIds, yearsDelta) {
    if (!eventIds || eventIds.length === 0) return;

    const secondsDelta = yearsDelta * (SECONDS_IN_YEAR_STRICT || 31557600);
    const msDelta = secondsDelta * 1000;
    const updates = {};

    for (const eventId of eventIds) {
        const path = findEventPath(actor, eventId);
        if (!path) continue;

        const rawEvent = foundry.utils.getProperty(actor, path);
        
        // 1. SHIFT SUBJECTIVE AXIS (Age)
        const currentAge = Number(rawEvent.age) || 0;
        const newAge = currentAge + secondsDelta;

        // 2. SHIFT OBJECTIVE AXIS (Date/Time)
        // We use the existing date/time as the anchor to prevent rail-jumping
        const dateStr = rawEvent.isSpan ? rawEvent.spanFromDate : rawEvent.date;
        const timeStr = (rawEvent.isSpan ? rawEvent.spanFromTime : rawEvent.time) || "12:00:00";
        
        if (!dateStr) {
            console.warn(`[LSS] Event ${eventId} has no date anchor. Skipping objective shift.`);
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge;
            continue;
        }

        try {
            // Parse current time, add delta, format back
            const currentTs = new Date(`${dateStr}T${timeStr}`).getTime();
            if (isNaN(currentTs)) throw new Error("Invalid Date");

            const newTs = currentTs + msDelta;
            const dateObj = new Date(newTs);
            const newDateStr = dateObj.toISOString().split('T')[0];
            const newTimeStr = dateObj.toISOString().split('T')[1].substring(0, 5);

            // 3. APPLY SYNCED UPDATE
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge; // Keep engine sort in sync

            if (rawEvent.isSpan) {
                updates[`${path}.spanFromDate`] = newDateStr;
                updates[`${path}.spanFromTime`] = newTimeStr;
            } else {
                updates[`${path}.date`] = newDateStr;
                updates[`${path}.time`] = newTimeStr;
            }
        } catch (e) {
            console.error(`[LSS] Failed to shift date for event ${eventId} (${dateStr})`, e);
            // Fallback: update age only so at least something moves
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge;
        }
    }

    if (Object.keys(updates).length > 0) {
        console.log(`[LSS] Pure Delta Shift: Moving ${Object.keys(updates).length} events by ${yearsDelta} years.`);
        return await actor.update(updates);
    }
}

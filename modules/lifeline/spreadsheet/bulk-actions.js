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
        if (!rawEvent) continue;

        // 1. SHIFT SUBJECTIVE AXIS (Age)
        const currentAge = Number(rawEvent.age) || 0;
        const newAge = currentAge + secondsDelta;

        // 2. SHIFT OBJECTIVE AXIS (Date/Time)
        const dateStr = rawEvent.eventIsSpan ? rawEvent.eventSpanFromDate : rawEvent.date;
        const timeStr = (rawEvent.eventIsSpan ? rawEvent.eventSpanFromTime : rawEvent.time) || "12:00:00";
        
        if (!dateStr) {
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge;
            continue;
        }

        try {
            // ROBUST PARSING: Parse manually to avoid browser timezone/ISO weirdness
            const [y, m, d] = dateStr.split('-').map(Number);
            const [hh, mm] = timeStr.split(':').map(Number);
            
            // Create date using UTC specifically to avoid local timezone shifts
            const currentTs = Date.UTC(y, m - 1, d, hh, mm || 0);
            if (isNaN(currentTs)) throw new Error("Invalid Date");

            const newTs = currentTs + msDelta;
            const dateObj = new Date(newTs);
            
            // MANUAL FORMATTING: Avoid toISOString() which fails on historical years
            const newY = dateObj.getUTCFullYear();
            const newM = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const newD = String(dateObj.getUTCDate()).padStart(2, '0');
            const newHH = String(dateObj.getUTCHours()).padStart(2, '0');
            const newMM = String(dateObj.getUTCMinutes()).padStart(2, '0');

            const newDateStr = `${newY}-${newM}-${newD}`;
            const newTimeStr = `${newHH}:${newMM}`;

            // 3. APPLY SYNCED UPDATE
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge;

            if (rawEvent.eventIsSpan) {
                updates[`${path}.eventSpanFromDate`] = newDateStr;
                updates[`${path}.eventSpanFromTime`] = newTimeStr;
            } else {
                updates[`${path}.date`] = newDateStr;
                updates[`${path}.time`] = newTimeStr;
            }
        } catch (e) {
            console.error(`[LSS] Failed to shift date for event ${eventId} (${dateStr})`, e);
            updates[`${path}.age`] = newAge;
            updates[`${path}.sort`] = newAge;
        }
    }

    if (Object.keys(updates).length > 0) {

        return await actor.update(updates);
    }
}

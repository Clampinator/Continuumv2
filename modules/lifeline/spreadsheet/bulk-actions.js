import { findEventPath } from './data-utils.js';
import { SECONDS_IN_YEAR } from '../../temporal-engine/constants.js';

/**
 * Applies a relative time shift to multiple events.
 * @param {Actor} actor 
 * @param {Array} eventIds 
 * @param {number} yearsDelta 
 */
export async function applyBulkTimeShift(actor, eventIds, yearsDelta) {
    if (!eventIds || eventIds.length === 0) return;

    const secondsDelta = yearsDelta * SECONDS_IN_YEAR;
    const updates = {};

    for (const eventId of eventIds) {
        const path = findEventPath(actor, eventId);
        if (!path) continue;

        // Fetch current age
        const currentAge = foundry.utils.getProperty(actor, `${path}.age`) || 0;
        updates[`${path}.age`] = currentAge + secondsDelta;
    }

    if (Object.keys(updates).length > 0) {
        console.log(`[LSS] Bulk shifting ${Object.keys(updates).length} events by ${yearsDelta} years.`);
        return await actor.update(updates);
    }
}

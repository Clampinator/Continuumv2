/**
 * STATE: MIGRATE ERA EVENTS
 *
 * When an era's boundaries change (e.g. the user narrows an era by editing
 * its dateTo), events and experiences that now fall outside the era must be
 * migrated to whichever era their subjective age places them in.
 *
 * This function reads all events from all eras, determines the correct era
 * for each based on its eventAge, and returns an update object that:
 *   1. Adds orphaned events to their new era
 *   2. Removes orphaned events from their old era
 *   3. Migrates experiences to the era containing their LAST event (or NOW)
 *
 * Experiences belong to the era of their LAST node (including NOW).
 * This ensures ongoing experiences stay in the era where the character
 * currently is, not where the experience started.
 *
 * AUTHORITY: Uses resolveEventEra (Kernel) to determine correct era placement.
 * All mutations go through actor.update() - never direct database writes.
 *
 * @param {Actor} actor - The Foundry Actor instance
 * @returns {Object} Update object suitable for actor.update()
 */
import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';
import { resolveEventEra } from '/systems/continuum-v2/modules/temporal-kernel/resolve-event-era.js';

export function migrateEraEvents(actor) {
    const eras = actor.system.eras || {};
    const erasData = actor.system.eras;
    if (!erasData || typeof erasData !== 'object') return {};

    const boundaries = computeEraBoundaries(erasData);
    if (boundaries.length === 0) return {};

    // NOW age for ongoing experience placement
    const nowAge = Number(actor.system.personal?.subjectiveNow) || 0;
    const updates = {};

    for (const [eraId, era] of Object.entries(erasData)) {
        // Check era-level events
        const events = era.events || {};
        for (const [eventId, event] of Object.entries(events)) {
            const eventAge = Number(event.eventAge) || 0;
            const newEraId = resolveEventEra(erasData, eventAge);

            if (newEraId && newEraId !== eraId) {
                // Event belongs in a different era - migrate it
                const oldPath = `system.eras.${eraId}.events.-=${eventId}`;
                const newPath = `system.eras.${newEraId}.events.${eventId}`;
                updates[oldPath] = null;
                updates[newPath] = { ...event, sort: Number(event.sort) || 0 };
            }
        }

        // Check experiences
        const experiences = era.experiences || {};
        for (const [expId, exp] of Object.entries(experiences)) {
            const targetEraId = _resolveExperienceEra(exp, eraId, erasData, nowAge);

            if (targetEraId && targetEraId !== eraId) {
                // Experience belongs in a different era - migrate it
                const oldPath = `system.eras.${eraId}.experiences.-=${expId}`;
                const newPath = `system.eras.${targetEraId}.experiences.${expId}`;
                updates[oldPath] = null;
                updates[newPath] = { ...exp };
            }
        }
    }

    return updates;
}

/**
 * Determine which era an experience belongs to.
 *
 * An experience belongs to the era containing its LAST event.
 * For ongoing experiences (no dateTo), the "last event" is wherever
 * the character currently is (NOW node). This means ongoing experiences
 * stay with the character's current era.
 *
 * @param {Object} exp - Experience data object
 * @param {string} currentEraId - Era the experience currently lives in
 * @param {Object} erasData - Raw eras data from actor.system.eras
 * @param {number} nowAge - Current subjective age in seconds
 * @returns {string|null} Era ID the experience should live in
 */
function _resolveExperienceEra(exp, currentEraId, erasData, nowAge) {
    const events = Object.values(exp.events || {});

    // Find the last event's subjective age
    let maxAge = 0;
    for (const evt of events) {
        const age = Number(evt.eventAge) || 0;
        if (age > maxAge) maxAge = age;
    }

    // For ongoing experiences, use NOW as the reference point
    const isOngoing = !exp.dateTo || String(exp.dateTo).trim() === '';
    const referenceAge = isOngoing ? (nowAge > maxAge ? nowAge : maxAge) : maxAge;

    if (referenceAge <= 0 && events.length === 0) {
        // No events and no meaningful age: stay in current era
        return currentEraId;
    }

    return resolveEventEra(erasData, referenceAge);
}
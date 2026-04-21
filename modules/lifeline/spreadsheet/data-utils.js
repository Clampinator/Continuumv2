/**
 * Utilities for traversing and locating data within the actor system.
 */

/**
 * Finds the data path for a specific event ID.
 * @param {Actor} actor 
 * @param {string} eventId 
 * @returns {string|null}
 */
export function findEventPath(actor, eventId) {
    const system = actor.system;
    for (const [eraId, era] of Object.entries(system.eras || {})) {
        if (era.events?.[eventId]) {
            return `system.eras.${eraId}.events.${eventId}`;
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            if (exp.events?.[eventId]) {
                return `system.eras.${eraId}.experiences.${expId}.events.${eventId}`;
            }
        }
    }
    return null;
}

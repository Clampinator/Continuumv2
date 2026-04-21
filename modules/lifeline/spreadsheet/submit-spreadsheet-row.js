/**
 * Processes a single row update from the spreadsheet.
 * 
 * @param {Actor} actor - The actor being updated.
 * @param {string} eventId - The ID of the event.
 * @param {string} field - The field being changed.
 * @param {any} value - The new value.
 */
export async function submitSpreadsheetRow(actor, eventId, field, value) {
    const system = actor.system;
    let targetPath = null;

    // 1. Locate the event by searching through Eras and Experiences
    // (This is robust even if we don't pass the IDs directly)
    for (const [eraId, era] of Object.entries(system.eras || {})) {
        // Check Era Level
        if (era.events?.[eventId]) {
            targetPath = `system.eras.${eraId}.events.${eventId}.${field}`;
            break;
        }

        // Check Experiences
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            if (exp.events?.[eventId]) {
                targetPath = `system.eras.${eraId}.experiences.${expId}.events.${eventId}.${field}`;
                break;
            }
        }
        if (targetPath) break;
    }

    if (!targetPath) {
        console.warn(`[LSS] Could not find event ${eventId} in actor data.`);
        return;
    }

    console.log(`[LSS] Updating ${actor.name} path: ${targetPath} = ${value}`);
    
    // 2. Perform the update
    return await actor.update({ [targetPath]: value });
}

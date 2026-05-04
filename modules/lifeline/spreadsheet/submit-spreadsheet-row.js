import { findEventPath } from './data-utils.js';
import { pushSnapshot } from '../undo-manager.js';

/**
 * Processes a single row update from the spreadsheet.
 * 
 * @param {Actor} actor - The actor being updated.
 * @param {string} eventId - The ID of the event.
 * @param {string} field - The field being changed.
 * @param {any} value - The new value.
 */
export async function submitSpreadsheetRow(actor, eventId, field, value) {
    const path = findEventPath(actor, eventId);

    if (!path) {
        console.warn(`[LSS] Could not find event ${eventId} in actor data.`);
        return;
    }

    pushSnapshot(actor);

    const targetPath = `${path}.${field}`;

    return await actor.update({ [targetPath]: value });
}

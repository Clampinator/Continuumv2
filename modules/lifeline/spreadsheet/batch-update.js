import { submitSpreadsheetRow } from './submit-spreadsheet-row.js';

/**
 * Commits multiple rows to the actor's history.
 * @param {Actor} actor 
 * @param {Array} rows 
 */
export async function commitBatchRows(actor, rows) {
    if (!rows || rows.length === 0) return;
    
    ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.StartingBatchImport", {count: rows.length}));
    
    let count = 0;
    for (const row of rows) {
        // Find a way to identify if it's a new or existing event.
        // For CSV import, we usually assume these are NEW events to be added.
        // But for now, we'll use the existing submit logic which searches by ID.
        if (row.eventId) {
            await submitSpreadsheetRow(actor, row.eventId, 'eventTitle', row.eventTitle);
            // ... apply other fields
            count++;
        }
    }
    
    ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.SuccessfullyProcessed", {count}));
}

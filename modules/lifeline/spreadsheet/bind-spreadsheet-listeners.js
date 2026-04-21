import { submitSpreadsheetRow } from './submit-spreadsheet-row.js';

/**
 * Binds event listeners to the spreadsheet UI.
 * 
 * @param {LifelineSpreadsheetApp} app - The spreadsheet application.
 * @param {jQuery} html - The application's HTML fragment.
 */
export function bindSpreadsheetListeners(app, html) {
    // 1. Inline Edit Handler
    html.on('change', '.lss-field', async (event) => {
        const input = event.currentTarget;
        const row = input.closest('tr');
        const eventId = row.dataset.eventId;
        const fieldName = input.dataset.field; // e.g., 'date', 'age'
        
        if (eventId && fieldName) {
            await submitSpreadsheetRow(app.actor, eventId, fieldName, input.value);
        }
    });
}

import { submitSpreadsheetRow } from './submit-spreadsheet-row.js';
import { exportSpreadsheetCSV, importSpreadsheetCSV, downloadCSVTemplate } from './csv-tools.js';
import { applyBulkTimeShift } from './bulk-actions.js';

/**
 * Binds event listeners to the spreadsheet UI.
 * 
 * @param {LifelineSpreadsheetApp} app - The spreadsheet application.
 * @param {jQuery} html - The application's HTML fragment.
 */
export function bindSpreadsheetListeners(app, html) {
    const actor = app.actor;

    // 1. Inline Edit Handler
    html.on('change', '.lss-field', async (event) => {
        const input = event.currentTarget;
        const row = input.closest('tr');
        const eventId = row.dataset.eventId;
        const fieldName = input.dataset.field; // e.g., 'date', 'age'
        
        if (eventId && fieldName) {
            await submitSpreadsheetRow(actor, eventId, fieldName, input.value);
        }
    });

    // 2. Toolbar Actions
    html.on('click', '.lss-export-btn', (event) => {
        event.preventDefault();
        exportSpreadsheetCSV(actor);
    });

    html.on('click', '.lss-import-btn', (event) => {
        event.preventDefault();
        importSpreadsheetCSV(actor);
    });

    html.on('click', '.lss-template-btn', (event) => {
        event.preventDefault();
        downloadCSVTemplate();
    });

    html.on('click', '.lss-bulk-shift-btn', async (event) => {
        event.preventDefault();
        const selectedIds = Array.from(html.find('.lss-row-select:checked'))
            .map(el => el.dataset.eventId);
        
        if (selectedIds.length === 0) {
            ui.notifications.warn("No events selected for bulk shift.");
            return;
        }

        try {
            // Prompt for years delta
            const yearsStr = await Dialog.prompt({
                title: "Bulk Time Shift",
                content: `
                    <p>Shift ${selectedIds.length} selected events by how many years?</p>
                    <input type="number" id="years-delta" value="0" step="1" style="width: 100%; margin-bottom: 10px;"/>
                `,
                callback: (html) => html.find('#years-delta').val(),
                label: "Apply Shift",
                rejectClose: false // V13: prevent error on cancel
            });

            const yearsDelta = Number(yearsStr);
            if (!isNaN(yearsDelta) && yearsDelta !== 0) {
                await applyBulkTimeShift(actor, selectedIds, yearsDelta);
                app.render();
            }
        } catch (err) {
            // User closed the dialog without clicking 'Apply' - ignore the promise rejection
        }
    });

    // 3. Selection Handlers
    html.on('change', '.lss-select-all', (event) => {
        const checked = event.currentTarget.checked;
        html.find('.lss-row-select').prop('checked', checked);
    });
}

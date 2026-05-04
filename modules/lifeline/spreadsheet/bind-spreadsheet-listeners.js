import { submitSpreadsheetRow } from './submit-spreadsheet-row.js';
import { exportSpreadsheetCSV, downloadCSVTemplate } from './csv-tools.js';
import { importFromCsv } from './import-spreadsheet-csv.js';

// Namespace suffix for delegated events - allows clean teardown on re-render
const NS = '.lss';

/**
 * Binds event listeners to the spreadsheet UI.
 * Strips any previous listeners first to prevent accumulation across re-renders.
 * 
 * @param {LifelineSpreadsheetApp} app - The spreadsheet application.
 * @param {jQuery} html - The application's HTML fragment.
 */
export function bindSpreadsheetListeners(app, html) {
    const actor = app.actor;

    // AUTHORITY: Remove stale listeners before binding new ones.
    // Without this, each render piles on duplicate handlers that
    // fire in sequence, causing the sort toggle to flip-and-flip-back.
    html.off(NS);

    // 1. Inline Edit Handler
    html.on('change' + NS, '.lss-field', async (event) => {
        const input = event.currentTarget;
        const row = input.closest('tr');
        const eventId = row.dataset.eventId;
        const fieldName = input.dataset.field;

        if (eventId && fieldName) {
            app._submitting = true;
            try {
                await submitSpreadsheetRow(actor, eventId, fieldName, input.value);
            } finally {
                app._submitting = false;
            }
        }
    });

    // 2. Toolbar Actions
    html.on('click' + NS, '.lss-sort-toggle', (event) => {
        event.preventDefault();
        app._sortNewestFirst = !app._sortNewestFirst;
        app.render(true);
    });

    html.on('click' + NS, '.lss-export-btn', (event) => {
        event.preventDefault();
        exportSpreadsheetCSV(actor);
    });

    html.on('click' + NS, '.lss-import-btn', (event) => {
        event.preventDefault();
        importFromCsv(app);
    });

    html.on('click' + NS, '.lss-template-btn', (event) => {
        event.preventDefault();
        downloadCSVTemplate();
    });

    // ENTER on location inputs triggers adjacent map-pin button
    html.on('keydown' + NS, '.lss-n-location, .lss-field-location', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const input = $(event.currentTarget);
            // New row: pin btn is a sibling after the input
            const rowPin = input.siblings('.lss-map-pin-btn');
            // Existing row: pin btn is inside the same <td> wrapper
            const cellPin = input.closest('td').find('.lss-map-pin-btn');
            const btn = rowPin.length ? rowPin : cellPin;
            if (btn.length) btn.click();
        }
    });

    // 3. Selection Handlers
    html.on('change' + NS, '.lss-select-all', (event) => {
        const checked = event.currentTarget.checked;
        html.find('.lss-row-select').prop('checked', checked);
    });
}

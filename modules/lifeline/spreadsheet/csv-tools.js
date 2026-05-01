import { getSpreadsheetRows } from './get-spreadsheet-rows.js';

/**
 * Utilities for CSV Export and Import of Lifeline data.
 */

const CSV_HEADERS = [
    'ageShort', 'date', 'time', 'eventTitle', 'eventNotes', 'location', 'eventIsSpan', 
    'eventSpanToDate', 'eventSpanToTime', 'eventSpanToLocation'
];

/**
 * Exports the character's lifeline to a CSV file.
 * @param {Actor} actor - The actor instance.
 */
export function exportSpreadsheetCSV(actor) {
    const { rows } = getSpreadsheetRows(actor);
    
    const lines = [CSV_HEADERS.join(',')];

    for (const row of rows) {
        const values = CSV_HEADERS.map(header => {
            let val = row[header];
            if (val === undefined || val === null) val = '';
            
            let str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        });
        lines.push(values.join(','));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${actor.name}-lifeline.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Downloads a blank CSV template.
 */
export function downloadCSVTemplate() {
    const lines = [CSV_HEADERS.join(',')];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `continuum-lifeline-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and imports data from the selected CSV.
 * @param {Actor} actor - The actor instance.
 */
export async function importSpreadsheetCSV(actor) {
    // 1. Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = async readerEvent => {
            const content = readerEvent.target.result;
            const rows = _parseCSV(content);

            // TODO: Batch update actor data in Phase 3
            ui.notifications.info(`Imported ${rows.length} events from CSV. Implementation of data commit pending.`);
        };
    };

    input.click();
}

/**
 * Simple CSV parser.
 * @private
 */
function _parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });
        results.push(row);
    }
    return results;
}

import { getSpreadsheetRows } from './get-spreadsheet-rows.js';
import { TEMPLATE_HEADERS } from './download-csv-template.js';

const escape = (v) => {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportSpreadsheetCsv(actor) {
    const { rows, allEras } = getSpreadsheetRows(actor);

    const eraNameById = {};
    for (const { eraId, name } of allEras) eraNameById[eraId] = name;

    // Export in subjective age order - canonical chronological order.
    // rows already come from getSpreadsheetRows sorted by age.
    const lines = [TEMPLATE_HEADERS.join(',')];

    for (const row of rows) {
        const eraName = eraNameById[row.eraId] || '';
        // subjectiveAge is the raw seconds-from-birth value. Storing it lets a
        // CSV round-trip restore exact subjective positions without recomputation.
        const subjectiveAge = (typeof row.age === 'number' && row.age > 0) ? row.age : '';
        const values = [
            'event',
            row.eventIsSpan ? '' : (row.date || ''),
            row.eventIsSpan ? '' : (row.time || ''),
            row.eventTitle || '',
            row.eventNotes || '',
            row.eventIsSpan ? '' : (row.location || ''),
            row.eventIsSpan ? 'true' : '',
            row.eventSpanFromDate || '',
            row.eventSpanFromTime || '',
            row.eventSpanFromLocation || '',
            row.eventSpanToDate || '',
            row.eventSpanToTime || '',
            row.eventSpanToLocation || '',
            row.expName || '',
            '',
            '',
            eraName,
            '',
            subjectiveAge,
        ];
        lines.push(values.map(escape).join(','));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${actor.name}-lifeline.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

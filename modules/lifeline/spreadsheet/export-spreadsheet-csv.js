import { getSpreadsheetRows } from './get-spreadsheet-rows.js';
import { TEMPLATE_HEADERS } from './download-csv-template.js';

const escape = (v) => {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV section headers for structured metadata before event rows.
// Lines starting with @ are metadata sections, not event data.
const ERA_HEADER = '@era,id,name,age,dateFrom,dateTo,sort';
const EXPERIENCE_HEADER = '@experience,id,name,eraId,dateFrom,dateTo,isOngoing,sort';

/**
 * Exports the full character lifeline as CSV with era and experience metadata.
 *
 * FORMAT: Three sections, in order:
 *   1. @era section: one row per era (structural scaffolding)
 *   2. @experience section: one row per experience (event containers)
 *   3. Event rows: standard TEMPLATE_HEADERS columns (unchanged)
 *
 * The @ prefix is the section marker. Old importers that don't understand
 * @ lines will skip them (they won't match any eventTitle column).
 *
 * @param {Actor} actor - The Foundry actor to export
 */
export function exportSpreadsheetCsv(actor) {
    const { rows, allExperiences, allEras } = getSpreadsheetRows(actor);
    const rawEras = actor.system.eras || {};

    const eraNameById = {};
    for (const { eraId, name } of allEras) eraNameById[eraId] = name;

    const lines = [];

    // SECTION 1: @era rows
    // Preserves era structure so import can rebuild it.
    // Age is in seconds (authoritative for computeEraBoundaries).
    const hasEras = Object.keys(rawEras).length > 0;
    if (hasEras) {
        lines.push(ERA_HEADER);
        for (const { eraId, name } of allEras) {
            const era = rawEras[eraId];
            if (!era) continue;
            const eraRow = [
                eraId,
                era.name || name,
                era.age ?? 0,
                era.dateFrom || '',
                era.dateTo || '',
                era.sort ?? 0
            ];
            lines.push(eraRow.map(escape).join(','));
        }
        // Blank line separates sections for readability
        lines.push('');
    }

    // SECTION 2: @experience rows
    // Preserves experience containers so import can rebuild them.
    if (allExperiences.length > 0) {
        lines.push(EXPERIENCE_HEADER);
        for (const exp of allExperiences) {
            const rawExp = rawEras[exp.eraId]?.experiences?.[exp.expId];
            if (!rawExp) continue;
            const expRow = [
                exp.expId,
                rawExp.name || exp.name,
                exp.eraId,
                rawExp.dateFrom || '',
                rawExp.dateTo || '',
                rawExp.isOngoing ? 'true' : 'false',
                rawExp.sort ?? 0
            ];
            lines.push(expRow.map(escape).join(','));
        }
        lines.push('');
    }

    // SECTION 3: Event rows (unchanged format)
    lines.push(TEMPLATE_HEADERS.join(','));

    for (const row of rows) {
        const eraName = eraNameById[row.eraId] || '';
        // subjectiveAge: raw seconds-from-birth for exact round-trip positioning
        const subjectiveAge = row._ageSeconds > 0 ? row._ageSeconds : '';
        const values = [
            'event',
            row.eventIsSpan ? '' : (row.date || ''),
            row.eventIsSpan ? '' : (row.time || ''),
            row.eventTitle || '',
            row.eventNotes || '',
            row.eventIsSpan ? '' : (row.location || ''),
            row.eventIsSpan ? 'true' : '',
            row.eventIsRest ? 'true' : '',
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
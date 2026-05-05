import { submitNewRow } from './submit-spreadsheet-row.js';
import { parseBool, normalizeDate, parseCsv } from './parse-csv.js';
import { TEMPLATE_HEADERS } from './download-csv-template.js';
import { processGraphData } from '../../span-graph-data-processor.js';
import { getSheetContext } from '../../span-graph-state.js';
import { parseObjectiveTime } from '../../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../../temporal-translator/location-resolver.js';

let _importing = false; // prevents concurrent imports

// Finds an experience by name on the actor. Returns { eraId, expId } or null.
function _resolveExperienceByName(actor, name) {
    if (!name) return null;
    const target = name.toLowerCase().trim();
    for (const [eraId, era] of Object.entries(actor.system.eras || {})) {
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            if ((exp.name || '').toLowerCase().trim() === target) return { eraId, expId };
        }
    }
    return null;
}

/*
Finds the isBirth=true row, then detects which direction (forward or backward
in the file) contains the next populated row. That direction is the subjective
chronological order of the CSV. Returns Birth first, then all remaining rows
marching in that direction to the end of the file.
If no isBirth row is found, order is unchanged.
*/
function _orientFromBirth(rawHeaders, dataRows) {
    if (dataRows.length < 2) return dataRows;
    const bi = rawHeaders.indexOf('isbirth');
    if (bi < 0) return dataRows;

    let birthIdx = -1;
    for (let i = 0; i < dataRows.length; i++) {
        if (parseBool(dataRows[i][bi] ?? '')) { birthIdx = i; break; }
    }
    if (birthIdx < 0) return dataRows;

    const hasData = (cells) => cells && cells.some(c => (c ?? '').trim() !== '');

    // Detect direction: find the first populated row after Birth in the file.
    let forwardHasData = false;
    for (let i = birthIdx + 1; i < dataRows.length; i++) {
        if (hasData(dataRows[i])) { forwardHasData = true; break; }
    }

    const birthRow = dataRows[birthIdx];
    if (forwardHasData) {
        // CSV is oldest-first: march from Birth to end of file.
        return [birthRow, ...dataRows.slice(birthIdx + 1)];
    }

    // CSV is newest-first: Birth is near the bottom.
    // March backward (toward row 0) to get chronological order.
    return [birthRow, ...dataRows.slice(0, birthIdx).reverse()];
}

function _rowToFormValues(headers, cells, actor) {
    const get  = (name) => (cells[headers.indexOf(name)] ?? '').trim();
    const date = (name) => normalizeDate(get(name));

    const expName   = get('experience');
    const startExp  = parseBool(get('startExperience'));
    const endExp    = parseBool(get('endExperience'));

    let startNewExp      = false;
    let newExpName       = '';
    let experienceAction = '';
    let closeExperiences = '';

    if (expName) {
        if (startExp) {
            startNewExp = true;
            newExpName  = expName;
        } else {
            const found = _resolveExperienceByName(actor, expName);
            if (found) experienceAction = `move:${found.eraId}:${found.expId}`;
        }
        if (endExp) {
            const found = _resolveExperienceByName(actor, expName);
            if (found) closeExperiences = `${found.eraId}:${found.expId}`;
        }
    }

    // subjectiveAge: raw seconds-from-birth written by the exporter.
    // When present and non-zero, this is the canonical position for round-trips.
    // Phase 3 will use this to bypass graph-based insertion point computation.
    const rawSubjectiveAge = parseFloat(get('subjectiveAge'));
    const subjectiveAge = Number.isFinite(rawSubjectiveAge) && rawSubjectiveAge > 0
        ? rawSubjectiveAge : null;

    return {
        date:             date('date'),
        time:             get('time'),
        eventTitle:            get('eventTitle'),
        eventNotes:            get('eventNotes'),
        location:         get('location'),
        eventIsSpan:           parseBool(get('eventIsSpan')),
        eventIsRest:           parseBool(get('eventIsRest')),
        eventSpanFromDate:     date('eventSpanFromDate'),
        eventSpanFromTime:     get('eventSpanFromTime'),
        eventSpanFromLocation: get('eventSpanFromLocation'),
        eventSpanToDate:       date('eventSpanToDate'),
        eventSpanToTime:       get('eventSpanToTime'),
        eventSpanToLocation:   get('eventSpanToLocation'),
        startNewExp,
        newExpName,
        experienceAction,
        closeExperiences,
        reopenExperiences: '',
        subjectiveAge,
    };
}

/*
Wipes the entire lifeline (all eras, experiences, events) and rebuilds it
from the imported CSV. This is a destructive operation - the existing lifeline
is completely replaced by the CSV data.
*/
export async function importFromCsv(app) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';

    input.onchange = async () => {
        if (_importing) return void ui.notifications.warn("Import already in progress. Please wait.");
        _importing = true;

        const file = input.files?.[0];
        if (!file) { _importing = false; return; }

        const text = await file.text();
        // Strip BOM if present (common in Windows-exported CSVs)
        const cleanText = text.replace(/^\uFEFF/, '');
        const allRows = parseCsv(cleanText);
        if (allRows.length < 2) {
            _importing = false;
            return void ui.notifications.warn("CSV has no data rows.");
        }

        const rawHeaders = allRows[0].map(h => h.trim().toLowerCase());
        const dataRows   = _orientFromBirth(rawHeaders, allRows.slice(1));

        // Accept common header names for the event title column
        const titleAliases = ['eventtitle', 'title', 'name', 'event'];
        const hasTitleColumn = rawHeaders.some(h => titleAliases.includes(h));
        if (!hasTitleColumn) {
            _importing = false;
            const headerPreview = rawHeaders.slice(0, 10).join(', ');
            console.warn(`[CSV Import] Headers found: ${headerPreview}`);
            return void ui.notifications.error("CSV is missing a 'eventTitle' column. Download the template for the correct format.");
        }

        // Normalize title column name to 'eventTitle' if using an alias
        const titleIdx = rawHeaders.findIndex(h => titleAliases.includes(h));
        if (rawHeaders[titleIdx] !== 'eventtitle') {
            rawHeaders[titleIdx] = 'eventtitle';
        }

        const headers = rawHeaders.map(h => {
            const match = TEMPLATE_HEADERS.find(t => t.toLowerCase() === h);
            return match ?? h;
        });

        const actor = app.sheet.actor;

        // AUTHORITY: Resolve birth timestamp for consistent date->age computation
        const dob = actor.system.personal?.dob || '1970-01-01';
        const birthCtx = resolveLocationContext([], 0, actor);
        const birthTs = parseObjectiveTime(dob, '12:00:00', birthCtx);

        // WIPE: Remove all existing eras (this cascades to experiences and events)
        const existingEraIds = Object.keys(actor.system.eras || {});
        if (existingEraIds.length > 0) {
            const deletions = {};
            for (const eraId of existingEraIds) {
                deletions[`system.eras.-=${eraId}`] = null;
            }
            await actor.update(deletions);
        }

        // Create a default era to hold imported events
        const defaultEraId = foundry.utils.randomID();
        await actor.update({
            [`system.eras.${defaultEraId}.name`]: 'Imported Events',
            [`system.eras.${defaultEraId}.sort`]: 0
        });

        let imported = 0, skipped = 0;
        let lastValidTs = null;
        let lastValidAge = null;

        try {
            for (const cells of dataRows) {
                const fv = _rowToFormValues(headers, cells, actor);
                if (!fv.date && !fv.eventSpanFromDate) { skipped++; continue; }
                if (!fv.eventTitle)                    { skipped++; continue; }

                const ok = await submitNewRow(app.sheet, fv, { batchImport: true, lastSpanToTs: lastValidTs });
                if (ok) {
                    imported++;
                    // Track the last valid event's position for NOW sync
                    // AUTHORITY: Use parseObjectiveTime for UTC-accurate timestamps
                    const tsContext = resolveLocationContext([], lastValidAge || 0, actor);
                    if (fv.eventIsSpan && fv.eventSpanToDate) {
                        lastValidTs = parseObjectiveTime(
                            normalizeDate(fv.eventSpanToDate),
                            fv.eventSpanToTime || '12:00:00',
                            tsContext
                        );
                    } else {
                        lastValidTs = parseObjectiveTime(
                            normalizeDate(fv.date || fv.eventSpanFromDate),
                            fv.time || '12:00:00',
                            tsContext
                        );
                    }
                    // Compute age from timestamp if subjectiveAge not in CSV
                    if (fv.subjectiveAge && fv.subjectiveAge > 0) {
                        lastValidAge = fv.subjectiveAge;
                    } else if (lastValidTs && birthTs) {
                        lastValidAge = Math.max(0, Math.round((lastValidTs - birthTs) / 1000));
                    }
                    // Yield to let Foundry process each update before the next
                    await new Promise(r => setTimeout(r, 50));
                    processGraphData(app.sheet, getSheetContext(app.sheet).graphData);
                } else {
                    skipped++;
                }
            }
        } finally {
            _importing = false;
        }

        // AUTHORITY: Sync NOW to the last imported event's position.
        // After a full wipe-and-rebuild, the character's subjective/objective NOW
        // must point to the last event so the lifeline connects properly.
        if (lastValidTs || lastValidAge) {
            const nowUpdate = {};
            if (lastValidTs) nowUpdate['system.personal.objectiveNow'] = lastValidTs;
            if (lastValidAge) nowUpdate['system.personal.subjectiveNow'] = lastValidAge;
            await actor.update(nowUpdate);
            processGraphData(app.sheet, getSheetContext(app.sheet).graphData);
        }

        // Refresh the sheet to reflect the new data
        app.render(true);

        const parts = [`Import complete. ${imported} event${imported !== 1 ? 's' : ''} added`];
        if (skipped) parts.push(`${skipped} invalid row${skipped !== 1 ? 's' : ''} skipped`);
        ui.notifications.info(parts.join(', ') + '.');
    };

    input.click();
}

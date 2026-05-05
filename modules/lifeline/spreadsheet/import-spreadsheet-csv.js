import { parseBool, normalizeDate, parseCsv } from './parse-csv.js';
import { TEMPLATE_HEADERS } from './download-csv-template.js';
import { processGraphData } from '../../span-graph-data-processor.js';
import { getSheetContext } from '../../span-graph-state.js';
import { parseObjectiveTime } from '../../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../../temporal-translator/location-resolver.js';
import { resolveEventEra } from '../../temporal-kernel/resolve-event-era.js';
import { resolveRecordPath } from '../../state/resolve-record-path.js';
import { projectSubjectiveAge, computeOffsetFromArrival } from '../../temporal-kernel/project-subjective-age.js';

let _importing = false;

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

    let forwardHasData = false;
    for (let i = birthIdx + 1; i < dataRows.length; i++) {
        if (hasData(dataRows[i])) { forwardHasData = true; break; }
    }

    const birthRow = dataRows[birthIdx];
    if (forwardHasData) {
        return [birthRow, ...dataRows.slice(birthIdx + 1)];
    }

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
Wipes the entire lifeline and rebuilds it from CSV data in a single
batch write. This bypasses insertHistoryRow's compensation wave, which
is designed for interactive single-event insertion and corrupts ages
during batch operations by shifting previously-inserted nodes.

Instead, we pre-compute all ages and timestamps using the physics walk
(establishHistoryPhysics) and write everything in one actor.update().
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
        const cleanText = text.replace(/^\uFEFF/, '');
        const allRows = parseCsv(cleanText);
        if (allRows.length < 2) {
            _importing = false;
            return void ui.notifications.warn("CSV has no data rows.");
        }

        const rawHeaders = allRows[0].map(h => h.trim().toLowerCase());
        const dataRows   = _orientFromBirth(rawHeaders, allRows.slice(1));

        const titleAliases = ['eventtitle', 'title', 'name', 'event'];
        const hasTitleColumn = rawHeaders.some(h => titleAliases.includes(h));
        if (!hasTitleColumn) {
            _importing = false;
            const headerPreview = rawHeaders.slice(0, 10).join(', ');
            console.warn(`[CSV Import] Headers found: ${headerPreview}`);
            return void ui.notifications.error("CSV is missing a 'eventTitle' column. Download the template for the correct format.");
        }

        const titleIdx = rawHeaders.findIndex(h => titleAliases.includes(h));
        if (rawHeaders[titleIdx] !== 'eventtitle') {
            rawHeaders[titleIdx] = 'eventtitle';
        }

        const headers = rawHeaders.map(h => {
            const match = TEMPLATE_HEADERS.find(t => t.toLowerCase() === h);
            return match ?? h;
        });

        const actor = app.sheet.actor;

        // Resolve birth timestamp for age computation
        const dob = actor.system.personal?.dob || '1970-01-01';
        const birthCtx = resolveLocationContext([], 0, actor);
        const originTime = parseObjectiveTime(dob, '12:00:00', birthCtx);

        // WIPE: Remove all existing eras
        const existingEraIds = Object.keys(actor.system.eras || {});
        if (existingEraIds.length > 0) {
            const deletions = {};
            for (const eraId of existingEraIds) {
                deletions[`system.eras.-=${eraId}`] = null;
            }
            await actor.update(deletions);
        }

        // Create a default era
        const defaultEraId = foundry.utils.randomID();
        await actor.update({
            [`system.eras.${defaultEraId}.name`]: 'Imported Events',
            [`system.eras.${defaultEraId}.age`]: 0,
            [`system.eras.${defaultEraId}.dateFrom`]: actor.system.personal?.dob || '',
            [`system.eras.${defaultEraId}.sort`]: 0
        });

        // Pre-compute all events with correct ages using physics walk
        const events = [];
        let currentOffset = originTime;
        let lastTs = originTime;
        let lastAge = 0;
        let sortIndex = 1000;

        for (const cells of dataRows) {
            const fv = _rowToFormValues(headers, cells, actor);
            if (!fv.date && !fv.eventSpanFromDate) continue;
            if (!fv.eventTitle) continue;

            const isSpan = Boolean(fv.eventIsSpan);

            // Transfer level fields to span fields for spans
            if (isSpan && !fv.eventSpanFromDate && fv.date) fv.eventSpanFromDate = fv.date;
            if (isSpan && !fv.eventSpanFromTime && fv.time) fv.eventSpanFromTime = fv.time;
            if (isSpan && !fv.eventSpanFromLocation && fv.location) fv.eventSpanFromLocation = fv.location;

            // Resolve departure timestamp
            const depDate = isSpan ? (fv.eventSpanFromDate || fv.date) : fv.date;
            const depTime = isSpan ? (fv.eventSpanFromTime || fv.time || '12:00:00') : (fv.time || '12:00:00');
            const ts = parseObjectiveTime(depDate, depTime, birthCtx);

            // Resolve arrival timestamp for spans
            let arrivalTs = ts;
            if (isSpan && fv.eventSpanToDate) {
                arrivalTs = parseObjectiveTime(fv.eventSpanToDate, fv.eventSpanToTime || '12:00:00', birthCtx);
            }

            // Compute eventAge from physics: (ts - offset) / 1000
            const eventAge = projectSubjectiveAge(ts, currentOffset);

            // Update offset for spans: after arrival, the character's clock shifts
            if (isSpan) {
                currentOffset = computeOffsetFromArrival(arrivalTs, eventAge);
            }

            const eraId = resolveEventEra(actor.system.eras, eventAge) || defaultEraId;
            const eventId = foundry.utils.randomID();
            const expId = null;

            const record = {
                id: eventId,
                sort: sortIndex,
                eventTitle: fv.eventTitle || (isSpan ? 'New Span' : 'New Event'),
                eventNotes: fv.eventNotes || '',
                eventIsSpan: isSpan,
                eventIsRest: Boolean(fv.eventIsRest),
                eventAge,
                eventDate: fv.date || fv.eventSpanFromDate || '',
                eventTime: fv.time || '12:00:00',
                eventLocation: fv.location || '',
                eventSpanFromDate: fv.eventSpanFromDate || '',
                eventSpanFromTime: fv.eventSpanFromTime || '12:00:00',
                eventSpanFromLocation: fv.eventSpanFromLocation || '',
                eventSpanToDate: fv.eventSpanToDate || '',
                eventSpanToTime: fv.eventToTime || '12:00:00',
                eventSpanToLocation: fv.eventSpanToLocation || '',
                ts,
                arrivalTs,
                eraId,
                expId,
                startsExpId: null,
                endsExpId: null,
                createdAt: Date.now()
            };

            const path = resolveRecordPath(eventId, eraId, expId);
            events.push({ path, record });

            lastTs = isSpan ? arrivalTs : ts;
            lastAge = eventAge;
            sortIndex += 1000;
        }

        if (events.length === 0) {
            _importing = false;
            ui.notifications.warn("No valid events found in CSV.");
            return;
        }

        // Batch write all events in a single actor.update()
        const updates = {};
        for (const { path, record } of events) {
            updates[path] = record;
        }

        // Sync NOW to the last event's position
        if (lastTs || lastAge) {
            updates['system.personal.objectiveNow'] = lastTs;
            updates['system.personal.subjectiveNow'] = lastAge;
        }

        await actor.update(updates);
        processGraphData(app.sheet, getSheetContext(app.sheet).graphData);
        app.render(true);

        _importing = false;
        ui.notifications.info(`Import complete. ${events.length} event${events.length !== 1 ? 's' : ''} added.`);
    };

    input.click();
}
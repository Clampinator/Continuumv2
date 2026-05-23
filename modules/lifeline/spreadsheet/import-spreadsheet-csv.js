import { parseBool, normalizeDate, parseCsv } from './parse-csv.js';
import { TEMPLATE_HEADERS } from './download-csv-template.js';
import { processGraphData } from '../../span-graph-data-processor.js';
import { getSheetContext } from '../../span-graph-state.js';
import { parseObjectiveTime, normalizeDateInput } from '../../temporal-translator/coordinate-converter.js';
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
        eraName:          get('era'),
        startNewExp,
        newExpName,
        experienceAction,
        closeExperiences,
        reopenExperiences: '',
        subjectiveAge,
    };
}

/**
 * Pre-scans CSV rows for @era and @experience metadata sections.
 * Returns separated sections with parsed data.
 *
 * @param {string[][]} allRows - Raw parsed CSV rows (first = headers, rest = data)
 * @returns {{ eraRows: string[][], experienceRows: string[][], eventRows: string[][] }}
 */
function _extractSections(allRows) {
    const eraRows = [];
    const experienceRows = [];
    const eventRows = [];
    let currentSection = 'events';

    // The first row is always the event column headers (or @ section headers)
    // We detect sections by checking if the first cell starts with @
    for (const row of allRows) {
        const first = (row[0] ?? '').trim().toLowerCase();

        if (first === '@era') {
            currentSection = 'era';
            continue;
        }
        if (first === '@experience') {
            currentSection = 'experience';
            continue;
        }

        // Empty first cell or non-@ prefix: event data
        // A blank line (all empty) resets to events section
        const isBlank = row.every(c => !(c ?? '').trim());
        if (isBlank) {
            currentSection = 'events';
            continue;
        }

        // Known event column headers reset to events section.
        // 'type' is the first column of TEMPLATE_HEADERS and must be
        // detected here because parseCsv strips blank separator lines,
        // so sections transition without a blank-row reset.
        if (first === 'type' || first === 'date' || first === 'eventtitle' || first === 'title') {
            currentSection = 'events';
        }

        if (currentSection === 'era') {
            eraRows.push(row);
        } else if (currentSection === 'experience') {
            experienceRows.push(row);
        } else {
            eventRows.push(row);
        }
    }

    return { eraRows, experienceRows, eventRows };
}

/**
 * Parses @era rows into structured era descriptors.
 * Format: id,name,age,dateFrom,dateTo,sort
 *
 * @param {string[][]} eraRows - Raw CSV rows from the @era section
 * @returns {Array<{origId: string, name: string, age: number, dateFrom: string, dateTo: string, sort: number}>}
 */
function _parseEraRows(eraRows) {
    const eras = [];
    for (const row of eraRows) {
        if (row.length < 3) continue;
        const origId = (row[0] ?? '').trim();
        // Skip if this looks like a header row
        if (origId.toLowerCase() === 'id') continue;
        eras.push({
            origId,
            name: (row[1] ?? '').trim() || 'Imported Era',
            age: Number(row[2]) || 0,
            dateFrom: normalizeDateInput((row[3] ?? '').trim()),
            dateTo: normalizeDateInput((row[4] ?? '').trim()),
            sort: Number(row[5]) || 0
        });
    }
    return eras;
}

/**
 * Parses @experience rows into structured experience descriptors.
 * Format: id,name,eraId,dateFrom,dateTo,isOngoing,sort
 *
 * @param {string[][]} experienceRows - Raw CSV rows from the @experience section
 * @returns {Array<{origId: string, name: string, origEraId: string, dateFrom: string, dateTo: string, isOngoing: boolean, sort: number}>}
 */
function _parseExperienceRows(experienceRows) {
    const exps = [];
    for (const row of experienceRows) {
        if (row.length < 3) continue;
        const origId = (row[0] ?? '').trim();
        if (origId.toLowerCase() === 'id') continue;
        exps.push({
            origId,
            name: (row[1] ?? '').trim() || 'Imported Experience',
            origEraId: (row[2] ?? '').trim(),
            dateFrom: normalizeDateInput((row[3] ?? '').trim()),
            dateTo: normalizeDateInput((row[4] ?? '').trim()),
            isOngoing: parseBool((row[5] ?? '').trim()),
            sort: Number(row[6]) || 0
        });
    }
    return exps;
}

/*
Wipes the entire lifeline and rebuilds it from CSV data in a single
batch write. This bypasses insertHistoryRow's compensation wave, which
is designed for interactive single-event insertion and corrupts ages
during batch operations by shifting previously-inserted nodes.

Instead, we pre-compute all ages and timestamps using the physics walk
(establishHistoryPhysics) and write everything in one actor.update().

STRUCTURED IMPORT: If the CSV contains @era and @experience sections,
those are parsed first and used to rebuild the era/experience structure.
If no @era section exists, falls back to a single "Imported Events" era
(legacy behavior).
*/
export async function importFromCsv(app) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';

    input.onchange = async () => {
        if (_importing) return void ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.ImportAlreadyInProgress"));
        _importing = true;

        const file = input.files?.[0];
        if (!file) { _importing = false; return; }

        const text = await file.text();
        const cleanText = text.replace(/^\uFEFF/, '');
        const allRows = parseCsv(cleanText);
        if (allRows.length < 2) {
            _importing = false;
            return void ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CsvNoDataRows"));
        }

        // SEPARATE METADATA SECTIONS FROM EVENT ROWS
        const { eraRows, experienceRows, eventRows } = _extractSections(allRows);

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

        // ID MAPPINGS: origId -> newId for eras and experiences
        const eraIdMap = {};
        const expIdMap = {};
        // Name -> newId lookup for events that only have era name
        const eraNameToNewId = {};

        // CREATE ERAS from @era section (if present)
        const parsedEras = _parseEraRows(eraRows);
        const hasEraSection = parsedEras.length > 0;

        if (hasEraSection) {
            // Structured import: create eras from CSV metadata
            const eraUpdates = {};
            for (const era of parsedEras) {
                const newId = foundry.utils.randomID();
                eraIdMap[era.origId] = newId;
                eraNameToNewId[era.name.toLowerCase().trim()] = newId;
                eraUpdates[`system.eras.${newId}`] = {
                    id: newId,
                    name: era.name,
                    age: era.age,
                    dateFrom: era.dateFrom,
                    dateTo: era.dateTo,
                    sort: era.sort,
                    experiences: {},
                    events: {}
                };
            }
            await actor.update(eraUpdates);
        } else {
            // Legacy fallback: single "Imported Events" era
            const defaultEraId = foundry.utils.randomID();
            await actor.update({
                [`system.eras.${defaultEraId}.name`]: 'Imported Events',
                [`system.eras.${defaultEraId}.age`]: 0,
                [`system.eras.${defaultEraId}.dateFrom`]: normalizeDateInput(actor.system.personal?.dob || ''),
                [`system.eras.${defaultEraId}.sort`]: 0
            });
            // Map any lookups to the default era
            eraIdMap['default'] = defaultEraId;
            eraNameToNewId['imported events'] = defaultEraId;
        }

        // CREATE EXPERIENCES from @experience section (if present)
        const parsedExperiences = _parseExperienceRows(experienceRows);
        if (parsedExperiences.length > 0) {
            const expUpdates = {};
            for (const exp of parsedExperiences) {
                const newId = foundry.utils.randomID();
                expIdMap[exp.origId] = newId;
                // Map the experience's eraId through the era mapping
                const mappedEraId = eraIdMap[exp.origEraId] || eraNameToNewId[exp.origEraId.toLowerCase().trim()] || '';
                if (!mappedEraId) continue;
                expUpdates[`system.eras.${mappedEraId}.experiences.${newId}`] = {
                    id: newId,
                    name: exp.name,
                    dateFrom: exp.dateFrom,
                    dateTo: exp.dateTo,
                    isOngoing: exp.isOngoing,
                    sort: exp.sort,
                    events: {}
                };
            }
            if (Object.keys(expUpdates).length > 0) {
                await actor.update(expUpdates);
            }
        }

        // PARSE EVENT ROWS
        // The eventRows include the column header row + data rows
        const rawHeaders = eventRows.length > 0
            ? eventRows[0].map(h => h.trim().toLowerCase())
            : [];

        const titleAliases = ['eventtitle', 'title', 'name', 'event'];
        const hasTitleColumn = rawHeaders.some(h => titleAliases.includes(h));
        if (!hasTitleColumn && eventRows.length <= 1) {
            _importing = false;
            return void ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CsvNoEventTitleColumn"));
        }

        // Fix title column name for consistency
        if (hasTitleColumn) {
            const titleIdx = rawHeaders.findIndex(h => titleAliases.includes(h));
            if (rawHeaders[titleIdx] !== 'eventtitle') {
                rawHeaders[titleIdx] = 'eventtitle';
            }
        }

        const headers = rawHeaders.map(h => {
            const match = TEMPLATE_HEADERS.find(t => t.toLowerCase() === h);
            return match ?? h;
        });

        const dataRows = _orientFromBirth(headers, eventRows.slice(1));

        // Pre-compute all events with correct ages using physics walk
        const events = [];
        let currentOffset = originTime;
        let lastTs = originTime;
        let lastAge = 0;
        let sortIndex = 1000;

        // Get current era state for resolveEventEra
        const currentEras = actor.system.eras || {};
        const firstEraId = Object.keys(currentEras)[0] || '';

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

            // Resolve era: use Kernel resolveEventEra, falling back to
            // name lookup from the era column, then first era
            const eraId = resolveEventEra(currentEras, eventAge)
                || eraNameToNewId[(fv.eraName || '').toLowerCase().trim()]
                || firstEraId;

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
                eventSpanToTime: fv.eventSpanToTime || '12:00:00',
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
            ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.NoValidEventsInCsv"));
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
        const eraCount = Object.keys(currentEras).length;
        const expCount = parsedExperiences.length;
        ui.notifications.info(
            `Import complete. ${events.length} event${events.length !== 1 ? 's' : ''}` +
            `, ${eraCount} era${eraCount !== 1 ? 's' : ''}` +
            `, ${expCount} experience${expCount !== 1 ? 's' : ''} added.`
        );
    };

    input.click();
}
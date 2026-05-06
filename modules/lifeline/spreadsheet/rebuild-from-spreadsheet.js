import { getSpreadsheetRows } from './get-spreadsheet-rows.js';
import { submitNewRow } from './submit-spreadsheet-row.js';
import { processGraphData } from '../../span-graph-data-processor.js';
import { getSheetContext } from '../../span-graph-state.js';
import { normalizeDate } from './parse-csv.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

function _resolveExpByName(actor, name) {
    if (!name) return null;
    const t = name.toLowerCase().trim();
    for (const [aId, era] of Object.entries(actor.system.eras || {})) {
        for (const [eId, exp] of Object.entries(era.experiences || {})) {
            if ((exp.name || '').toLowerCase().trim() === t) return { eraId: aId, expId: eId };
        }
    }
    return null;
}

// Captures which event is the genesis of each experience, and each experience's
// close state. Must be called BEFORE the actor is cleared.
function _snapshotLifeline(actor) {
    const expMeta = {};
    const genesisOf = {};
    for (const [, era] of Object.entries(actor.system.eras || {})) {
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            expMeta[expId] = { name: exp.name || '', dateTo: exp.dateTo || '', isOngoing: !!exp.isOngoing };
        }
        const allEventMaps = [
            era.events || {},
            ...Object.values(era.experiences || {}).map(e => e.events || {})
        ];
        for (const evMap of allEventMaps) {
            for (const [evId, ev] of Object.entries(evMap)) {
                if (ev.startsExpId) genesisOf[evId] = ev.startsExpId;
            }
        }
    }
    return { expMeta, genesisOf };
}

// Convert a move:eraId:expId action string to the experience name using the actor
// state that exists BEFORE clearing. Returns null if not resolvable.
function _actionToExpName(actor, action) {
    if (!action) return null;
    const parts = String(action).split(':');
    if (parts[0] !== 'move' || !parts[1] || !parts[2]) return null;
    return actor.system.eras?.[parts[1]]?.experiences?.[parts[2]]?.name || null;
}

/*
Wipes the entire lifeline (all ages, experiences, events) and rebuilds it from the
current spreadsheet rows in their stored createdAt order, applying formEdits to the
specified event before rebuilding. Preserves experience structure and close dates.
*/
export async function rebuildFromSpreadsheet(sheet, editedEventId = null, formEdits = null) {
    const actor = sheet.actor;

    const { rows } = getSpreadsheetRows(actor);
    const { expMeta, genesisOf } = _snapshotLifeline(actor);

    // Resolve experience changes to names before IDs are destroyed by the clear.
    const editedExpName   = _actionToExpName(actor, formEdits?.experienceAction);
    const editedStartNew  = !!(formEdits?.startNewExp);
    const editedNewName   = formEdits?.newExpName || null;

    const deletions = {};
    for (const eraId of Object.keys(actor.system.eras || {})) {
        deletions[`system.eras.-=${eraId}`] = null;
    }
    await actor.update(deletions);

    let lastSpanToTs = null;
    for (const row of rows) {
        if (!row.eventTitle) continue;
        if (!row.date && !row.eventSpanFromDate) continue;

        const isTarget = !!(editedEventId && row.eventId === editedEventId);
        const r = isTarget ? { ...row, ...formEdits } : row;

        // Determine experience assignment for this row.
        let startNewExp = false, newExpName = '', experienceAction = '';

        if (isTarget && editedStartNew && editedNewName) {
            startNewExp = true;
            newExpName  = editedNewName;
        } else if (isTarget && editedExpName) {
            const found = _resolveExpByName(actor, editedExpName);
            if (found) experienceAction = `move:${found.eraId}:${found.expId}`;
        } else {
            const genesisExpId = genesisOf[row.eventId];
            if (genesisExpId) {
                startNewExp = true;
                newExpName  = expMeta[genesisExpId]?.name || row.expName || '';
            } else if (r.expId && r.expName) {
                const found = _resolveExpByName(actor, r.expName);
                if (found) experienceAction = `move:${found.eraId}:${found.expId}`;
            }
        }

        const fv = {
            date: r.date || '', time: r.time || '',
            eventTitle: r.eventTitle, eventNotes: r.eventNotes || '', location: r.location || '',
            lat: r.lat ?? null, lng: r.lng ?? null, zoom: r.zoom ?? null,
            eventIsSpan: r.eventIsSpan, eventIsRest: r.eventIsRest || false,
            eventSpanFromDate: r.eventSpanFromDate || '', eventSpanFromTime: r.eventSpanFromTime || '',
            eventSpanFromLocation: r.eventSpanFromLocation || '',
            eventSpanFromLat: r.eventSpanFromLat ?? null, eventSpanFromLng: r.eventSpanFromLng ?? null, eventSpanFromZoom: r.eventSpanFromZoom ?? null,
            eventSpanToDate: r.eventSpanToDate || '', eventSpanToTime: r.eventSpanToTime || '',
            eventSpanToLocation: r.eventSpanToLocation || '',
            eventSpanToLat: r.eventSpanToLat ?? null, eventSpanToLng: r.eventSpanToLng ?? null, eventSpanToZoom: r.eventSpanToZoom ?? null,
            startNewExp, newExpName, experienceAction,
            closeExperiences: '', reopenExperiences: '',
        };

        await submitNewRow(sheet, fv, { batchImport: true, lastSpanToTs, skipGeocode: true });

        const d = r.eventIsSpan && r.eventSpanToDate ? normalizeDate(r.eventSpanToDate) : null;
        // TTL: Use parseDateToObjectiveMs instead of new Date() to avoid
        // browser local timezone drift. Spans in character-local timezone
        // must parse consistently regardless of where the browser is.
        lastSpanToTs = (r.eventIsSpan && d)
            ? parseDateToObjectiveMs(d, r.eventSpanToTime || '12:00:00')
            : null;

        await Promise.resolve();
        processGraphData(sheet, getSheetContext(sheet).graphData);
    }

    // Restore close dates for experiences that were closed before the rebuild.
    const closeUpdates = {};
    for (const [, meta] of Object.entries(expMeta)) {
        if (!meta.isOngoing && meta.dateTo && meta.name) {
            const found = _resolveExpByName(actor, meta.name);
            if (found) {
                const base = `system.eras.${found.eraId}.experiences.${found.expId}`;
                closeUpdates[`${base}.dateTo`]    = meta.dateTo;
                closeUpdates[`${base}.isOngoing`] = false;
            }
        }
    }
    if (Object.keys(closeUpdates).length > 0) await actor.update(closeUpdates);
}

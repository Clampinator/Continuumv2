import { formatSubjectiveAge, parseDate } from '../../span-graph-utils/provide-span-graph-utils.js';
import { normalizeLifelineAges } from '../services/chronology/normalize-lifeline-ages.js';

function _getRowTimestamp(event) {
    const d = event.isSpan ? event.spanFromDate : event.date;
    const t = (event.isSpan ? event.spanFromTime : event.time) || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
}

function _eventToRow(eventId, eraId, expId, expName, event, computedAgeMap) {
    const ts = _getRowTimestamp(event);
    // Use the engine-derived age when available (correct for time-travel characters),
    // falling back to stored event.age. The naive (ts - dobTs)/1000 is wrong for
    // characters who have traversed spans, so we never use it here.
    const path = (expId && expId !== 'null')
        ? `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
        : `system.eras.${eraId}.events.${eventId}`;
    const storedAge = Number(event.age) || 0;
    const displayAge = computedAgeMap[`${path}.age`] ?? storedAge;
    return {
        eventId, eraId,
        expId: expId || null,
        expName: expName || null,
        date: event.isSpan ? (event.spanFromDate || '') : (event.date || ''),
        time: event.isSpan ? (event.spanFromTime || '') : (event.time || ''),
        title: event.title || '',
        notes: event.notes || event.description || '',
        location: event.isSpan ? (event.spanFromLocation || '') : (event.location || ''),
        lat: event.lat ?? null,
        lng: event.lng ?? null,
        zoom: event.zoom ?? null,
        ageFormatted: displayAge > 0 ? formatSubjectiveAge(displayAge) : '',
        isSpan: !!event.isSpan,
        isRest: !!event.isRest,
        spanFromDate: event.spanFromDate || '',
        spanFromTime: event.spanFromTime || '',
        spanFromLocation: event.spanFromLocation || '',
        spanFromLat: event.spanFromLat ?? null,
        spanFromLng: event.spanFromLng ?? null,
        spanFromZoom: event.spanFromZoom ?? null,
        spanToDate: event.spanToDate || '',
        spanToTime: event.spanToTime || '',
        spanToLocation: event.spanToLocation || '',
        spanToLat: event.spanToLat ?? null,
        spanToLng: event.spanToLng ?? null,
        spanToZoom: event.spanToZoom ?? null,
        age: displayAge,
        sort: Number(event.sort || 0),
        createdAt: event.createdAt || 0,
        ts
    };
}

/*
Reads actor.system.eras, flattens all events into a chronologically sorted row
array and builds the list of all experiences for dropdown rendering.
*/
export function getSpreadsheetRows(actor) {
    const rawEras = actor.system.eras || {};

    // Compute correct ages for all events using the same objectiveOffset walk
    // the engine performs. normUpdates maps "path.age" -> correct age value for
    // events that differ from stored; stored age is used for the rest.
    const { updates: computedAgeMap } = normalizeLifelineAges(actor);

    const allExperiences = [];
    const rows = [];

    Object.entries(rawEras).forEach(([eraId, era]) => {
        // Era-level events (not inside any experience)
        Object.entries(era.events || {}).forEach(([eventId, event]) => {
            rows.push(_eventToRow(eventId, eraId, null, null, event, computedAgeMap));
        });

        // Experience-level events
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            if (exp.name) {
                allExperiences.push({
                    eraId, expId,
                    name: exp.name,
                    isOpen: !exp.dateTo || !exp.dateTo.trim(),
                    sort: Number(era.sort || 0) * 10000 + Number(exp.sort || 0)
                });
            }
            Object.entries(exp.events || {}).forEach(([eventId, event]) => {
                rows.push(_eventToRow(eventId, eraId, expId, exp.name || null, event, computedAgeMap));
            });
        });
    });

    allExperiences.sort((a, b) => a.sort - b.sort);

    const allEras = Object.entries(rawEras)
        .map(([eraId, era]) => ({ eraId, name: era.name || eraId, sort: Number(era.sort || 0) }))
        .sort((a, b) => a.sort - b.sort);

    // Sort by sequence position (sort field) - matches the engine's processing order.
    // Age is derived from date in the engine; sort values reflect the order events
    // were placed on the timeline, which is the canonical sequence.
    rows.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return String(a.eventId).localeCompare(String(b.eventId));
    });

    return { rows, allExperiences, allEras };
}

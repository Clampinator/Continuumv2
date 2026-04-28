import { ReferenceResolver } from '../services/reference-resolver.js';
import { normalizeDateInput, parseDate } from '../../span-graph-utils/provide-span-graph-utils.js';
import { computeRailOffset } from '../services/chronology/compute-rail-offset.js';
import { reindexLifelineNodes } from '../services/chronology/reindex-lifeline-nodes.js';

function _parseTs(dateStr, timeStr) {
    const d = normalizeDateInput(dateStr);
    if (!d) return null;
    const dt = parseDate(`${d}T${timeStr || '12:00:00'}`);
    return dt ? dt.getTime() : null;
}

/*
Moves an existing non-span event to a new date/time position without
triggering a full lifeline rebuild. Only the event's date, time, age,
and sort (plus any sort-collision fixes for neighbors) are written.

Pass explicitAge when you already know the subjective age (e.g. from the
age-blur path where the user typed "5y 3d"). Omit it to derive age
from the date via two-pass rail-offset computation.

Returns true on success, false if inputs are invalid or the event is a
span (span repositioning still requires rebuild due to rail-shift effects).
*/
export async function saveEventPosition(actor, eraId, expId, eventId, { date, time, age: explicitAge = null }) {
    // Retrieve the raw event to check for isBirth and eventIsSpan.
    const eraData = actor.system.eras?.[eraId];
    if (!eraData) return false;
    const ev = (expId && expId !== 'null')
        ? eraData.experiences?.[expId]?.events?.[eventId]
        : eraData.events?.[eventId];
    if (!ev) return false;

    // isBirth changes DOB - full rebuild needed (all ages would shift).
    // eventIsSpan changes rail - full rebuild needed for downstream events.
    if (ev.isBirth || ev.eventIsSpan) return false;

    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (!dobTs || !date) return false;

    const normalizedDate = normalizeDateInput(date);
    if (!normalizedDate) return false;

    const ts = _parseTs(normalizedDate, time);
    if (!ts) return false;

    // Derive subjective age: use caller-supplied value when available,
    // otherwise run two-pass rail-offset computation.
    let newAge;
    if (explicitAge !== null && Number.isFinite(explicitAge) && explicitAge >= 0) {
        newAge = explicitAge;
    } else {
        const roughAge = Math.max(0, (ts - dobTs) / 1000);
        const railBase  = computeRailOffset(actor, roughAge);
        newAge = Math.max(0, (ts - railBase) / 1000);
    }

    // Compute correct sort value and any neighbor collision fixes.
    const reindexResult = reindexLifelineNodes(actor, eventId, 0, { age: newAge, time: ts }, {});

    const root = (expId && expId !== 'null')
        ? `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
        : `system.eras.${eraId}.events.${eventId}`;

    const payload = {};
    // Include any neighbor sort-collision patches from reindex.
    for (const [key, val] of Object.entries(reindexResult)) {
        if (key.startsWith('system.')) payload[key] = val;
    }
    payload[`${root}.date`] = normalizedDate;
    payload[`${root}.time`] = time || '12:00:00';
    payload[`${root}.age`]  = reindexResult.targetAge ?? newAge;
    payload[`${root}.sort`] = reindexResult.targetSortValue ?? 1000;

    await actor.update(payload);
    return true;
}

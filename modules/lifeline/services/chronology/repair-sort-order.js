
import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/*
Detects and corrects sort values that conflict with the age-based chronological order.
Also corrects subjectiveNow when it was auto-snapped to the last event's pre-repair age.
Run once per actor per session to fix data created before the max-prevSort algorithm fix.

Returns a dot-path updates object. Empty object means no repair needed.
*/
export function repairSortOrder(actor) {
    const rawEras = actor.system.eras || {};
    const entries = [];

    for (const [eraId, era] of Object.entries(rawEras)) {
        for (const [eventId, event] of Object.entries(era.events || {})) {
            entries.push({
                path: `system.eras.${eraId}.events.${eventId}`,
                sort: Number(event.sort) || 0,
                createdAt: Number(event.createdAt) || 0,
                age: Number(event.age) || 0,
                id: eventId,
                event
            });
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                entries.push({
                    path: `system.eras.${eraId}.experiences.${expId}.events.${eventId}`,
                    sort: Number(event.sort) || 0,
                    createdAt: Number(event.createdAt) || 0,
                    age: Number(event.age) || 0,
                    id: eventId,
                    event
                });
            }
        }
    }

    if (entries.length < 2) return {};

    // Age-first canonical order (matches the Diagonal Authority)
    const byAge = [...entries].sort((a, b) => {
        if (a.age !== b.age) return a.age - b.age;
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return a.id.localeCompare(b.id);
    });

    // Current engine order (sort -> createdAt -> id)
    const bySort = [...entries].sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return a.id.localeCompare(b.id);
    });

    // If the two orderings agree, nothing to repair
    const isBroken = byAge.some((e, i) => e.id !== bySort[i].id);
    if (!isBroken) return {};

    // Assign sort values in age order, spaced by DEFAULT_STEP
    const DEFAULT_STEP = 1000;
    const updates = {};
    byAge.forEach((entry, i) => {
        const newSort = (i + 1) * DEFAULT_STEP;
        if (entry.sort !== newSort) {
            updates[`${entry.path}.sort`] = newSort;
        }
    });

    // Walk events in the corrected order to find the last event's corrected age.
    // After the sort repair, the engine will compute ages from dates on the current rail.
    // If subjectiveNow was auto-snapped to the last event's old stored age, it is now
    // stale - update it to the last event's corrected position so NOW does not float.
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (dobTs) {
        const oldLastAge = byAge[byAge.length - 1].age;
        const subjectiveNow = Number(actor.system.personal?.subjectiveNow);

        // Only correct subjectiveNow if it was snapped to the old last-event age.
        // If the user manually moved NOW elsewhere, preserve their choice.
        if (Math.abs(subjectiveNow - oldLastAge) < 1.0) {
            let objectiveOffset = dobTs;
            let correctedAge = oldLastAge;
            let correctedTs = dobTs + (oldLastAge * 1000);

            for (const entry of byAge) {
                const ev = entry.event;
                if (ev.isBirth) continue;
                if (ev.isSpan) {
                    const fromTs = ev.spanFromDate
                        ? parseDate(`${ev.spanFromDate}T${ev.spanFromTime || '12:00:00'}`)?.getTime()
                        : null;
                    const toTs = ev.spanToDate
                        ? parseDate(`${ev.spanToDate}T${ev.spanToTime || '12:00:00'}`)?.getTime()
                        : null;
                    if (fromTs && toTs) {
                        const newAge = Math.max(0, (fromTs - objectiveOffset) / 1000);
                        objectiveOffset = toTs - (newAge * 1000);
                        correctedAge = newAge;
                        correctedTs = toTs;
                    }
                } else if (ev.date) {
                    const ts = parseDate(`${ev.date}T${ev.time || '12:00:00'}`)?.getTime();
                    if (ts) {
                        correctedAge = Math.max(0, (ts - objectiveOffset) / 1000);
                        correctedTs = ts;
                    }
                }
            }

            if (Math.abs(correctedAge - subjectiveNow) > 0.5) {
                updates['system.personal.subjectiveNow'] = correctedAge;
                updates['system.personal.objectiveNow'] = correctedTs;
            }
        }
    }

    return updates;
}

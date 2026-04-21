import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/*
Walks all events in sort order, accumulates objectiveOffset across spans, and
derives each event's subjective age from its objective date. This is the same
logic the engine uses at render time, made available as a write-back utility.

Returns:
  updates    - dot-path patches for events whose stored age differs by > 0.5s
  finalOffset - the rail offset after processing all events (used to compute the
                age of a new event appended at the end of the timeline)

pendingSpan: optional span not yet persisted to actor.system (e.g. a span being
             inserted this turn). It participates in the objectiveOffset walk so
             downstream events are reanchored correctly without a round-trip.
*/
export function normalizeLifelineAges(actor, { pendingSpan = null } = {}) {
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (!dobTs) return { updates: {}, finalOffset: 0 };

    const entries = [];
    const rawEras = actor.system.eras || {};

    for (const [eraId, era] of Object.entries(rawEras)) {
        for (const [eventId, event] of Object.entries(era.events || {})) {
            entries.push({
                eventId, event, isPending: false,
                sort: Number(event.sort) || 0,
                createdAt: event.createdAt || 0,
                path: `system.eras.${eraId}.events.${eventId}`
            });
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                entries.push({
                    eventId, event, isPending: false,
                    sort: Number(event.sort) || 0,
                    createdAt: event.createdAt || 0,
                    path: `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
                });
            }
        }
    }

    if (pendingSpan) {
        entries.push({
            eventId: pendingSpan.id, event: pendingSpan, isPending: true,
            sort: Number(pendingSpan.sort) || 0,
            createdAt: pendingSpan.createdAt || 0,
            path: null
        });
    }

    entries.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return String(a.eventId).localeCompare(String(b.eventId));
    });

    const updates = {};
    let objectiveOffset = dobTs;

    for (const entry of entries) {
        const ev = entry.event;
        if (ev.isSpan) {
            const fromTs = ev.spanFromDate
                ? parseDate(`${ev.spanFromDate}T${ev.spanFromTime || '12:00:00'}`)?.getTime()
                : null;
            const toTs = ev.spanToDate
                ? parseDate(`${ev.spanToDate}T${ev.spanToTime || '12:00:00'}`)?.getTime()
                : null;
            if (fromTs && toTs) {
                const newAge = Math.max(0, (fromTs - objectiveOffset) / 1000);
                if (!entry.isPending && Math.abs(newAge - Number(ev.age)) > 0.5) {
                    updates[`${entry.path}.age`] = newAge;
                }
                objectiveOffset = toTs - (newAge * 1000);
            }
        } else if (!ev.isBirth && ev.date) {
            const ts = parseDate(`${ev.date}T${ev.time || '12:00:00'}`)?.getTime();
            if (ts) {
                const newAge = Math.max(0, (ts - objectiveOffset) / 1000);
                if (!entry.isPending && Math.abs(newAge - Number(ev.age)) > 0.5) {
                    updates[`${entry.path}.age`] = newAge;
                }
            }
        }
    }

    return { updates, finalOffset: objectiveOffset };
}

import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/**
 * REINDEX LIFELINE AGES (Dynamic Compensation Wave)
 * Walks all events in sort order, accumulates objectiveOffset across spans, and
 * derives each event's subjective age from its objective physics coordinate (TS).
 * ADI REBUILT: Prioritizes .ts and .arrivalTs over fuzzy date strings.
 */
export function normalizeLifelineAges(actor, { pendingSpan = null, excludeNodeId = null } = {}) {
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (!dobTs) return { updates: {}, finalOffset: 0 };

    const entries = [];
    const rawEras = actor.system.eras || {};

    // 1. Gather all nodes (with ID exclusion to prevent collisions)
    for (const [eraId, era] of Object.entries(rawEras)) {
        for (const [eventId, event] of Object.entries(era.events || {})) {
            if (eventId === excludeNodeId) continue;
            entries.push({
                eventId, event, isPending: false,
                sort: Number(event.sort) || 0,
                createdAt: event.createdAt || 0,
                path: `system.eras.${eraId}.events.${eventId}`
            });
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                if (eventId === excludeNodeId) continue;
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

    // 2. Physical Sort (Sequence of character journey)
    entries.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return String(a.eventId).localeCompare(String(b.eventId));
    });

    const updates = {};
    let objectiveOffset = dobTs;

    // 3. Compensation Walk (The Physics Pass)
    for (const entry of entries) {
        const ev = entry.event;
        if (ev.isSpan) {
            // AUTHORITY: Use stored high-precision timestamps (Physics Layer)
            // Fallback to record strings only for legacy data
            const fromTs = (ev.ts !== undefined && ev.ts !== null) 
                ? Number(ev.ts) 
                : (ev.spanFromDate ? parseDate(`${ev.spanFromDate}T${ev.spanFromTime || '12:00:00'}`)?.getTime() : null);
            
            const toTs = (ev.arrivalTs !== undefined && ev.arrivalTs !== null)
                ? Number(ev.arrivalTs)
                : (ev.spanToDate ? parseDate(`${ev.spanToDate}T${ev.spanToTime || '12:00:00'}`)?.getTime() : null);

            if (fromTs !== null && toTs !== null) {
                const newAge = Math.max(0, (fromTs - objectiveOffset) / 1000);
                
                // Only commit if change is significant (> 0.1s to prevent jitter)
                if (!entry.isPending && Math.abs(newAge - (Number(ev.age) || 0)) > 0.1) {
                    updates[`${entry.path}.age`] = newAge;
                }
                objectiveOffset = toTs - (newAge * 1000);
            }
        } else if (!ev.isBirth) {
            const ts = (ev.ts !== undefined && ev.ts !== null)
                ? Number(ev.ts)
                : (ev.date ? parseDate(`${ev.date}T${ev.time || '12:00:00'}`)?.getTime() : null);

            if (ts !== null) {
                const newAge = Math.max(0, (ts - objectiveOffset) / 1000);
                if (!entry.isPending && Math.abs(newAge - (Number(ev.age) || 0)) > 0.1) {
                    updates[`${entry.path}.age`] = newAge;
                }
            }
        }
    }

    return { updates, finalOffset: objectiveOffset };
}

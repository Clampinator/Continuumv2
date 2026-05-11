import { resolveOrigin } from '/systems/continuum-v2/modules/lifeline/services/reference-resolver/resolve-origin.js';
import { parseDate } from '../span-graph-utils/provide-span-graph-utils.js';
import { normalizeLifelineAges } from '/systems/continuum-v2/modules/temporal-kernel/normalize-lifeline-ages.js';

/**
 * ENGINE: NORMALIZE LIFELINE AGES (Convenience Wrapper)
 * Extracts entries from a Foundry actor, pre-resolves timestamp strings
 * into millisecond numbers, and delegates to the pure Kernel function.
 *
 * This is the actor-facing entry point. The Kernel function handles only
 * pure math; this function handles all Foundry data extraction and TTL
 * conversion so Kernel stays testable.
 *
 * MIGRATED FROM modules/lifeline/services/chronology/normalize-lifeline-ages.js
 * as part of H7 (Trinity violation: Engine logic misplaced in UI layer).
 *
 * @param {object} actor - Foundry actor instance.
 * @param {{ pendingSpan?: object, excludeNodeId?: string }} [options]
 * @returns {{ updates: object, finalOffset: number }}
 */
export function normalizeLifelineAgesFromActor(actor, { pendingSpan = null, excludeNodeId = null } = {}) {
  const dobTs = resolveOrigin(actor);
  if (!dobTs) return { updates: {}, finalOffset: 0 };

  const entries = [];
  const rawEras = actor.system.eras || {};

  // 1. Gather all nodes (with ID exclusion to prevent collisions)
  for (const [eraId, era] of Object.entries(rawEras)) {
    for (const [eventId, event] of Object.entries(era.events || {})) {
      if (eventId === excludeNodeId) continue;
      const resolved = _resolveTimestamps({ ...event });
      entries.push({
        eventId, event: resolved, isPending: false,
        sort: Number(event.sort) || 0,
        createdAt: event.createdAt || 0,
        path: `system.eras.${eraId}.events.${eventId}`
      });
    }
    for (const [expId, exp] of Object.entries(era.experiences || {})) {
      for (const [eventId, event] of Object.entries(exp.events || {})) {
        if (eventId === excludeNodeId) continue;
        const resolved = _resolveTimestamps({ ...event });
        entries.push({
          eventId, event: resolved, isPending: false,
          sort: Number(event.sort) || 0,
          createdAt: event.createdAt || 0,
          path: `system.eras.${eraId}.experiences.${expId}.events.${eventId}`
        });
      }
    }
  }

  if (pendingSpan) {
    const resolved = _resolveTimestamps({ ...pendingSpan });
    entries.push({
      eventId: pendingSpan.id, event: resolved, isPending: true,
      sort: Number(pendingSpan.sort) || 0,
      createdAt: pendingSpan.createdAt || 0,
      path: null
    });
  }

  return normalizeLifelineAges(dobTs, entries);
}

/**
 * Resolves date/time strings in an event to millisecond timestamps (ts, arrivalTs).
 * Mutates the event object copy in place and returns it.
 */
function _resolveTimestamps(event) {
  if (event.eventIsSpan) {
    if ((event.ts === undefined || event.ts === null) && event.eventSpanFromDate) {
      const dt = parseDate(`${event.eventSpanFromDate}T${event.eventSpanFromTime || '12:00:00'}`);
      if (dt) event.ts = dt.getTime();
    }
    if ((event.arrivalTs === undefined || event.arrivalTs === null) && event.eventSpanToDate) {
      const dt = parseDate(`${event.eventSpanToDate}T${event.eventSpanToTime || '12:00:00'}`);
      if (dt) event.arrivalTs = dt.getTime();
    }
  } else {
    if ((event.ts === undefined || event.ts === null) && event.eventDate) {
      const dt = parseDate(`${event.eventDate}T${event.eventTime || '12:00:00'}`);
      if (dt) event.ts = dt.getTime();
    }
  }
  return event;
}
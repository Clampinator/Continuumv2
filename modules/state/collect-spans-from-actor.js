import { parseDate } from '../span-graph-utils/provide-span-graph-utils.js';

/**
 * STATE: COLLECT SPANS FROM ACTOR
 * Extracts span event data from a Foundry actor into the format the Kernel
 * expects: { age, fromTs, toTs } sorted by age.
 *
 * This is pure data extraction - reads the DB and produces an array.
 * No physics, no mutations.
 *
 * MIGRATED FROM modules/lifeline/services/chronology/compute-rail-offset.js
 * as part of H7 (Trinity violation: State logic misplaced in UI layer).
 *
 * @param {object} actor - Foundry actor instance.
 * @param {number} targetAge - Maximum subjective age to include (seconds).
 * @returns {Array<{age: number, fromTs: number, toTs: number}>}
 *   Spans with age <= targetAge, sorted by age ascending.
 */
export function collectSpansFromActor(actor, targetAge) {
  const spans = [];
  const rawEras = actor.system.eras || {};

  const collectFromEvents = (events) => {
    for (const event of Object.values(events || {})) {
      if (!event.eventIsSpan) continue;
      const eventAge = Number(event.eventAge);
      if (!Number.isFinite(eventAge)) continue;
      if (!event.eventSpanFromDate || !event.eventSpanToDate) continue;
      const fromTs = parseDate(
        `${event.eventSpanFromDate}T${event.eventSpanFromTime || '12:00:00'}`
      )?.getTime();
      const toTs = parseDate(
        `${event.eventSpanToDate}T${event.eventSpanToTime || '12:00:00'}`
      )?.getTime();
      if (fromTs && toTs && toTs !== fromTs) {
        spans.push({ age: eventAge, fromTs, toTs });
      }
    }
  };

  for (const era of Object.values(rawEras)) {
    collectFromEvents(era.events);
    for (const exp of Object.values(era.experiences || {})) {
      collectFromEvents(exp.events);
    }
  }

  spans.sort((a, b) => a.age - b.age);
  return spans;
}
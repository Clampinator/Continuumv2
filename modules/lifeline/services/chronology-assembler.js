import { ReferenceResolver } from './reference-resolver.js';
import { parseDate } from '../../span-graph-utils/provide-span-graph-utils.js';
import { computeRailOffset } from '/systems/continuum-v2/modules/temporal-engine/compute-rail-offset.js';
import { projectSubjectiveAge } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/*
Service to prepare actor data for the coordinate mapping engine.
Gathers all events regardless of creation order.
*/
export const ChronologyAssembler = {
  /*
  Extracts all events from the actor's hierarchical data.
  Includes a recovery pass for missing subjective ages based on objective dates.
  */
  assembleEventStream(actor) {
    const rawEras = actor.system.eras || {};
    const orderedEvents = [];

    // Resolve Origin for age calculation fallback
    const dobTs = ReferenceResolver.resolveOrigin(actor);

    /**
     * Recovery Helper: Ensures an event has a subjective 'age' coordinate.
     * If missing, solves for Age using the objective date relative to Birth.
     */
    const _ensureAge = (event) => {
        const val = event.eventAge;
        const hasAge = val !== undefined && val !== null && val !== "";
        if (hasAge) return event;

        // RECOVERY: age field is missing. Recover via two-pass rail-offset computation
        // using actor data alone - no graphData dependency.
        const dateStr = event.eventIsSpan ? event.eventSpanFromDate : event.eventDate;
        const timeStr = event.eventIsSpan ? event.eventSpanFromTime : event.eventTime;
        if (dobTs && dateStr) {
            const dateObj = parseDate(`${dateStr}T${timeStr || '12:00:00'}`);
            if (dateObj) {
                const roughAge = projectSubjectiveAge(dateObj.getTime(), dobTs);
                const railBase = computeRailOffset(actor, roughAge);
                event.eventAge = projectSubjectiveAge(dateObj.getTime(), railBase);
                return event;
            }
        }

        console.warn("Continuum | ChronologyAssembler | Cannot recover age for event:", event.id);
        event.eventAge = 0;
        return event;
    };

    // Convert to array and perform initial pass
    const eraList = Object.entries(rawEras)
      .map(([id, era]) => ({
        ...era,
        id,
        path: `system.eras.${id}`
      }))
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    eraList.forEach((era) => {
      // A) Collect direct events (Context-Free)
      Object.entries(era.events || {}).forEach(([id, event]) => {
        const processed = _ensureAge({ ...event });
        orderedEvents.push({
          ...processed,
          id,
          eraId: era.id,
          expId: null,
          eraSort: Number(era.sort) || 0,
          expSort: 0,
        });
      });

      // B) Collect events from nested experiences
      Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
        const expObj = { ...exp, id: expId };

        Object.entries(expObj.events || {}).forEach(([eventId, event]) => {
          const processed = _ensureAge({ ...event });
          orderedEvents.push({
            ...processed,
            id: eventId,
            eraId: era.id,
            expId: expId,
            eraSort: Number(era.sort) || 0,
            expSort: Number(expObj.sort) || 0,
          });
        });
      });
    });

    return {
      orderedEvents,
      sortedEras: eraList,
    };
  },
};

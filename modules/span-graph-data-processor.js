import { SECONDS_IN_YEAR, parseDate } from './span-graph-utils/provide-span-graph-utils.js';
import { ChronologyAssembler } from './lifeline/services/chronology-assembler.js';
import { ReferenceResolver } from './lifeline/services/reference-resolver.js';
import { computeRailOffset } from './lifeline/services/chronology/compute-rail-offset.js';

/**
 * Flattens the nested eras -> experiences -> events structure into a single sorted array.
 * REBUILT: Absolute Chronological Age Sort with legacy node recovery.
 */
export function flattenEvents(eras, actor = null) {
  if (!eras) return [];

  const allEvents = [];

  const _parseTime = (event) => {
    // AUTHORITY: Prefer stored high-precision timestamp
    if (event.ts !== undefined && event.ts !== null) return Number(event.ts);

    const d = event.isSpan ? event.spanFromDate : (event.date || event.dateTime?.split('T')[0]);
    const t = (event.isSpan ? event.spanFromTime : (event.time || event.dateTime?.split('T')[1]?.substring(0, 5))) || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  const _parseArrival = (event) => {
    // AUTHORITY: Prefer stored high-precision arrival timestamp
    if (event.arrivalTs !== undefined && event.arrivalTs !== null) return Number(event.arrivalTs);

    if (!event.isSpan) return 0;
    const d = event.spanToDate;
    const t = event.spanToTime || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  // 1. Gather all events
  Object.entries(eras).forEach(([eraId, era]) => {
    if (era.events) {
      Object.entries(era.events).forEach(([id, event]) => {
        allEvents.push({ 
            ...event, 
            id: id, eraId: eraId, expId: null,
            age: (event.age !== undefined && event.age !== null) ? Number(event.age) : null,
            time: _parseTime(event),
            arrivalTime: _parseArrival(event),
            sort: Number(event.sort) || 0
        });
      });
    }
    if (era.experiences) {
      Object.entries(era.experiences).forEach(([expId, exp]) => {
        if (exp.events) {
          Object.entries(exp.events).forEach(([id, event]) => {
            allEvents.push({ 
                ...event, 
                id: id, eraId: eraId, expId: expId,
                experienceName: exp.name || 'Unnamed Experience',
                age: (event.age !== undefined && event.age !== null) ? Number(event.age) : null,
                time: _parseTime(event),
                arrivalTime: _parseArrival(event),
                sort: Number(event.sort) || 0
            });
          });
        }
      });
    }
  });

  // 2. Recovery for Legacy Nodes
  const dobTs = actor ? ReferenceResolver.resolveOrigin(actor) : 0;
  allEvents.forEach(event => {
      if (event.age === null) {
          const roughAge = Math.max(0, (event.time - dobTs) / 1000);
          const railBase = actor ? computeRailOffset(actor, roughAge) : dobTs;
          event.age = Math.max(0, (event.time - railBase) / 1000);
      }
  });

  // 3. PHYSICAL SORT AUTHORITY (Age-First)
  allEvents.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    return a.sort - b.sort;
  });

  // 4. Link them for the Renderer
  allEvents.forEach((event, index) => {
      event.nextEventId = allEvents[index + 1]?.id || null;
  });

  return allEvents;
}

/**
 * Placeholder for original processGraphData logic - stripped to focus on core flatten logic.
 */
export function processGraphData(sheet, graphData) {
    const { orderedEvents } = ChronologyAssembler.assembleEventStream(sheet.actor);
    graphData.levelNodes = orderedEvents;
}

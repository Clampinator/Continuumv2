import { SECONDS_IN_YEAR, parseDate } from './span-graph-utils/provide-span-graph-utils.js';
import { ChronologyAssembler } from './lifeline/services/chronology-assembler.js';

/**
 * Flattens the nested eras -> experiences -> events structure into a single sorted array.
 * REBUILT: Establishes a strict linked list for authoritative sequential rendering.
 */
export function flattenEvents(eras) {
  if (!eras) return [];

  const allEvents = [];

  const _parse = (event) => {
    const d = event.isSpan ? event.spanFromDate : (event.date || event.dateTime?.split('T')[0]);
    const t = (event.isSpan ? event.spanFromTime : (event.time || event.dateTime?.split('T')[1]?.substring(0, 5))) || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  const _parseArrival = (event) => {
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
            time: _parse(event),
            arrivalTime: _parseArrival(event)
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
                time: _parse(event),
                arrivalTime: _parseArrival(event)
            });
          });
        }
      });
    }
  });

  // 2. Sort Authoritatively
  allEvents.sort((a, b) => {
    const ageA = Number(a.age) || 0;
    const ageB = Number(b.age) || 0;
    if (ageA !== ageB) return ageA - ageB;
    return (Number(a.sort) || 0) - (Number(b.sort) || 0);
  });

  // 3. Link them for the Renderer
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

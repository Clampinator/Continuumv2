import { SECONDS_IN_YEAR, parseDate } from './span-graph-utils/provide-span-graph-utils.js';
import { ChronologyAssembler } from './lifeline/services/chronology-assembler.js';
import { ReferenceResolver } from './lifeline/services/reference-resolver.js';
import { computeRailOffset } from './lifeline/services/chronology/compute-rail-offset.js';

/**
 * Flattens nested character history into authoritative RenderNode objects.
 * IMPLEMENTS: Authoritative Data Isolation (ADI).
 * 
 * @returns {Array} Array of RenderNodes: { id, x, y, arrivalY, record, path, ...meta }
 */
export function flattenEvents(eras, actor = null) {
  if (!eras) return [];

  const allNodes = [];

  const _calculateTimestamp = (event) => {
    if (event.ts !== undefined && event.ts !== null) return Number(event.ts);
    const d = event.eventIsSpan ? event.eventSpanFromDate : (eventDate || event.dateTime?.split('T')[0]);
    const t = (event.eventIsSpan ? event.eventSpanFromTime : (event.eventTime || event.dateTime?.split('T')[1]?.substring(0, 5))) || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  const _calculateArrival = (event) => {
    if (event.arrivalTs !== undefined && event.arrivalTs !== null) return Number(event.arrivalTs);
    if (!event.eventIsSpan) return 0;
    const d = event.eventSpanToDate;
    const t = event.eventSpanToTime || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  // 1. Gather all events as RenderNodes
  Object.entries(eras).forEach(([eraId, era]) => {
    if (era.events) {
      Object.entries(era.events).forEach(([id, event]) => {
        allNodes.push({ 
            id: id, eraId: eraId, expId: null,
            path: `system.eras.${eraId}.events.${id}`, // REQUIRED for re-indexing
            x: (event.eventAge !== undefined && event.eventAge !== null) ? Number(event.eventAge) : null,
            y: _calculateTimestamp(event),
            arrivalY: _calculateArrival(event),
            sort: Number(event.sort) || 0,
            eventIsSpan: !!event.eventIsSpan,
            eventTitle: event.eventTitle || "Event",
            record: foundry.utils.deepClone(event)
        });
      });
    }
    if (era.experiences) {
      Object.entries(era.experiences).forEach(([expId, exp]) => {
        if (exp.events) {
          Object.entries(exp.events).forEach(([id, event]) => {
            allNodes.push({ 
                id: id, eraId: eraId, expId: expId,
                path: `system.eras.${eraId}.experiences.${expId}.events.${id}`,
                experienceName: exp.name || 'Unnamed Experience',
                x: (event.eventAge !== undefined && event.eventAge !== null) ? Number(event.eventAge) : null,
                y: _calculateTimestamp(event),
                arrivalY: _calculateArrival(event),
                sort: Number(event.sort) || 0,
                eventIsSpan: !!event.eventIsSpan,
                eventTitle: event.eventTitle || "Event",
                record: foundry.utils.deepClone(event)
            });
          });
        }
      });
    }
  });

  // 2. Recovery for Legacy Nodes
  const dobTs = actor ? ReferenceResolver.resolveOrigin(actor) : 0;
  allNodes.forEach(node => {
      if (node.x === null) {
          const roughAge = Math.max(0, (node.y - dobTs) / 1000);
          const railBase = actor ? computeRailOffset(actor, roughAge) : dobTs;
          node.x = Math.max(0, (node.y - railBase) / 1000);
      }
  });

  // 3. PHYSICAL SORT AUTHORITY
  allNodes.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.sort - b.sort;
  });

  // 4. Sequence Linking
  allNodes.forEach((node, index) => {
      node.nextEventId = allNodes[index + 1]?.id || null;
  });

  return allNodes;
}

/**
 * Placeholder for original processGraphData logic - stripped to focus on core flatten logic.
 */
export function processGraphData(sheet, graphData) {
    const { orderedEvents } = ChronologyAssembler.assembleEventStream(sheet.actor);
    graphData.levelNodes = orderedEvents;
}

import { ChronologyAssembler } from './lifeline/services/chronology-assembler.js';

/*
 * DEPRECATED: This module violates Trinity boundaries by performing TTL
 * date parsing (_calculateTimestamp, _calculateArrival) and Kernel physics
 * recovery (projectSubjectiveAge, computeRailOffset) inside a data extraction
 * function. Use getActorHistory() + getTemporalState() instead.
 *
 * The canonical pipeline is:
 *   getActorHistory (State) -> recoverMissingAges (Engine) -> establishHistoryPhysics (Kernel)
 *
 * Span-graph viewport callers removed in H6. PointerMachine now uses
 * viewport.latestState directly. Remaining callers are in the legacy
 * lifeline module (being replaced by span-graph).
 */

/**
 * Flattens nested character history into RenderNode objects.
 *
 * TRINITY COMPLIANCE: This function now performs DATA EXTRACTION ONLY.
 * Timestamp computing (y, arrivalY) and physics recovery (x) have been
 * removed. Raw string fields are stored for the Engine pipeline to
 * resolve via resolveTimestamps and recoverMissingAges.
 *
 * @param {Object} eras - The actor.system.eras object.
 * @param {Object} [actor=null] - The Foundry actor (unused, kept for API compat).
 * @returns {Array} Array of RenderNodes with raw fields for Engine resolution.
 */
export function flattenEvents(eras, actor = null) {
  if (!eras) return [];

  const allNodes = [];

  // 1. Gather all events as RenderNodes with RAW fields only.
  // No TTL date parsing, no Kernel physics. The Engine pipeline's
  // resolveTimestamps and recoverMissingAges handle these in the
  // correct layer.
  Object.entries(eras).forEach(([eraId, era]) => {
    if (era.events) {
      Object.entries(era.events).forEach(([id, event]) => {
        allNodes.push({
            id, eraId, expId: null,
            path: `system.eras.${eraId}.events.${id}`,
            x: (event.eventAge !== undefined && event.eventAge !== null) ? Number(event.eventAge) : null,
            y: event.ts !== undefined && event.ts !== null ? Number(event.ts) : null,
            arrivalY: event.arrivalTs !== undefined && event.arrivalTs !== null ? Number(event.arrivalTs) : null,
            // Raw facts for TTL to resolve later
            rawDate: event.eventIsSpan ? event.eventSpanFromDate : (event.eventDate || event.dateTime?.split('T')[0]),
            rawTime: event.eventIsSpan ? event.eventSpanFromTime : (event.eventTime || '12:00:00'),
            rawArrivalDate: event.eventSpanToDate || null,
            rawArrivalTime: event.eventSpanToTime || null,
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
                id, eraId, expId,
                path: `system.eras.${eraId}.experiences.${expId}.events.${id}`,
                experienceName: exp.name || 'Unnamed Experience',
                x: (event.eventAge !== undefined && event.eventAge !== null) ? Number(event.eventAge) : null,
                y: event.ts !== undefined && event.ts !== null ? Number(event.ts) : null,
                arrivalY: event.arrivalTs !== undefined && event.arrivalTs !== null ? Number(event.arrivalTs) : null,
                // Raw facts for TTL to resolve later
                rawDate: event.eventIsSpan ? event.eventSpanFromDate : (event.eventDate || event.dateTime?.split('T')[0]),
                rawTime: event.eventIsSpan ? event.eventSpanFromTime : (event.eventTime || '12:00:00'),
                rawArrivalDate: event.eventSpanToDate || null,
                rawArrivalTime: event.eventSpanToTime || null,
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

  // 2. PHYSICAL SORT AUTHORITY
  // Nodes with null x (missing age) sort to the beginning;
  // the Engine pipeline's recoverMissingAges fills them in later.
  allNodes.sort((a, b) => {
    const xA = a.x !== null ? a.x : -Infinity;
    const xB = b.x !== null ? b.x : -Infinity;
    if (xA !== xB) return xA - xB;
    return a.sort - b.sort;
  });

  // 3. Sequence Linking
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
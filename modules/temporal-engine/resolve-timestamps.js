import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';
import { projectSubjectiveAge } from '../temporal-kernel/project-subjective-age.js';

/**
 * ENGINE: RESOLVE TIMESTAMPS
 * Resolves missing y (departure timestamp) and arrivalY (arrival timestamp)
 * from raw date/time string fields on RenderNodes produced by flattenEvents.
 *
 * This is the TTL conversion step that was formerly inline in
 * span-graph-data-processor.js (_calculateTimestamp, _calculateArrival).
 * Moving it here puts date parsing in the Engine layer where it belongs,
 * rather than in the data extraction layer.
 *
 * Nodes that already have numeric y/arrivalY (from stored ts/arrivalTs)
 * are left unchanged. Only nodes with null values get resolved from
 * rawDate/rawTime/rawArrivalDate/rawArrivalTime.
 *
 * After resolution, the raw string fields are removed to prevent stale
 * data from leaking into the render pipeline.
 *
 * @param {Array} nodes - Array of RenderNodes from flattenEvents.
 * @param {number} originTime - Birth timestamp in ms (fallback for missing dates).
 * @param {Object} [actor=null] - Foundry actor for location context resolution.
 * @returns {Array} Same nodes array with y, arrivalY resolved and raw fields removed.
 */
export function resolveTimestamps(nodes, originTime, actor = null) {
  if (!nodes || nodes.length === 0) return nodes;

  // Build running context history for location-aware parsing.
  // establishHistoryPhysics does its own location resolution, but
  // for pre-resolution we use a simple context from the actor.
  const context = resolveLocationContext([], 0, actor);

  for (const node of nodes) {
    // Skip NOW node - its timestamp comes from objectiveNow
    if (node.isNow || node.id === 'now') continue;

    const record = node.record || {};
    const isSpan = !!node.eventIsSpan;

    // Resolve departure timestamp (y)
    if (node.y === null || node.y === undefined) {
      const dateStr = isSpan
        ? (record.eventSpanFromDate || record.eventDate)
        : (record.eventDate || record.dateTime?.split('T')[0]);
      const timeStr = isSpan
        ? (record.eventSpanFromTime || record.eventTime)
        : (record.eventTime || '12:00:00');

      if (dateStr) {
        const resolved = parseObjectiveTime(dateStr, timeStr, context);
        node.y = resolved || originTime;
      } else {
        node.y = originTime;
      }
    }

    // Resolve arrival timestamp (arrivalY)
    if (isSpan && (node.arrivalY === null || node.arrivalY === undefined)) {
      const dateStr = record.eventSpanToDate || record.eventDate;
      const timeStr = record.eventSpanToTime || record.eventTime || '12:00:00';

      if (dateStr) {
        const resolved = parseObjectiveTime(dateStr, timeStr, context);
        node.arrivalY = resolved || node.y || originTime;
      } else {
        node.arrivalY = node.y || originTime;
      }
    }

    // Non-span events: arrivalY equals y (departure)
    if (!isSpan && (node.arrivalY === null || node.arrivalY === undefined)) {
      node.arrivalY = 0;
    }

    // Remove raw fields - they have served their purpose
    delete node.rawDate;
    delete node.rawTime;
    delete node.rawArrivalDate;
    delete node.rawArrivalTime;
  }

  return nodes;
}
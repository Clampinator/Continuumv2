/**
 * TEMPORAL KERNEL: CALCULATE SPAN POOL
 * Pure math: walks a sorted list of events computing cumulative span
 * consumption per cycle (resetting on rest events).
 *
 * AUTHORITY: This is the only function allowed to compute span pool
 * consumption for the character sheet. The UI must call this function
 * and use the TTL's formatDurationCompact for display strings.
 *
 * @param {Object} params
 * @param {number} params.spanLevel - Span rank (0-5).
 * @param {Array} params.events - Events sorted by narrative order (ascending sort).
 *   Each event must have:
 *     - {boolean} eventIsSpan - Whether this is a span event.
 *     - {boolean} eventIsRest - Whether this is a rest event (resets pool).
 *     - {number} ts - Departure objective time in milliseconds.
 *     - {number} arrivalTs - Arrival objective time in milliseconds (same as ts for level events).
 * @param {number} params.genesisTs - Birth timestamp in milliseconds.
 *   Used as the starting point for the first event's displacement calc.
 * @returns {Object} Pool statistics:
 *   - {number}   maxPoolSeconds - Maximum span pool for this rank, in seconds.
 *   - {number}   spentInCycleSeconds - Cumulative span spent in current cycle.
 *   - {number}   remainingSeconds - Pool remaining (can be negative if over-span).
 *   - {boolean}  isOverSpan - True if remainingSeconds < 0.
 *   - {string}   spanTimeRemainingFormatted - TTL-formatted remaining string.
 *   - {Array}    eventStats - Per-event stats, each with:
 *       {string} eventId, {number} spentSeconds, {string} spentFormatted,
 *       {number} remainingAfterEvent, {string} remainingFormatted,
 *       {boolean} isSpan, {boolean} isRest
 */

import { SECONDS_IN_YEAR } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';

const SPAN_POOL_SECONDS = {
  0: 0,
  1: SECONDS_IN_YEAR,
  2: SECONDS_IN_YEAR * 10,
  3: SECONDS_IN_YEAR * 100,
  4: SECONDS_IN_YEAR * 1000,
  5: SECONDS_IN_YEAR * 10000
};

const MS_PER_SECOND = 1000;

export function calculateSpanPool({ spanLevel, events, genesisTs }) {
  const maxPoolSeconds = SPAN_POOL_SECONDS[spanLevel] || 0;

  let cycleSpentSeconds = 0;
  let lastTs = genesisTs;
  const eventStats = [];

  for (const event of events) {
    const isSpan = Boolean(event.eventIsSpan);
    const isRest = Boolean(event.eventIsRest);
    const eventId = event.id || event._id || '';

    // Rest events reset the cycle counter
    if (isRest) {
      cycleSpentSeconds = 0;
    }

    // Arrival time: for spans, arrivalTs; for levels, ts.
    // Falls back to ts if arrivalTs is missing or zero.
    const departureTs = Number(event.ts) || 0;
    const arrivalTs = isSpan
      ? (Number(event.arrivalTs) || departureTs)
      : departureTs;

    // Displacement in seconds between this event and the last
    const displacementSeconds = Math.abs(arrivalTs - lastTs) / MS_PER_SECOND;

    // For span events, accumulate displacement in the cycle
    let spentSeconds = 0;
    if (isSpan && arrivalTs > 0) {
      cycleSpentSeconds += displacementSeconds;
      spentSeconds = displacementSeconds;
    }

    const remainingAfterEvent = maxPoolSeconds - cycleSpentSeconds;

    eventStats.push({
      eventId,
      isSpan,
      isRest,
      spentSeconds,
      spentFormatted: isSpan
        ? formatDurationCompact(spentSeconds)
        : '0s (Leveling)',
      remainingAfterEvent,
      remainingFormatted: formatDurationCompact(remainingAfterEvent)
    });

    // Update lastTs for the next delta calculation
    if (arrivalTs > 0) {
      lastTs = arrivalTs;
    }
  }

  const remainingSeconds = maxPoolSeconds - cycleSpentSeconds;

  return {
    maxPoolSeconds,
    spentInCycleSeconds: cycleSpentSeconds,
    remainingSeconds,
    isOverSpan: remainingSeconds < 0,
    spanTimeRemainingFormatted: formatDurationCompact(remainingSeconds),
    eventStats
  };
}
/**
 * TEMPORAL KERNEL: CALCULATE SPAN POOL
 * Pure math: walks a sorted list of events computing cumulative span
 * consumption per cycle (resetting on rest events).
 *
 * AUTHORITY: This is the only function allowed to compute span pool
 * consumption. The UI must call these functions and use the TTL's
 * formatDurationCompact for display strings.
 *
 * SPAN COST = |arrivalTs - ts| (arrival minus departure).
 * The cost is the OBJECTIVE TIME the span jumps, which is independent
 * of the character's subjective age or the position of prior events.
 * A span from year 2000 to year 2020 costs 20 years regardless of
 * whether the character arrived at year 2000 via leveling or spanning.
 *
 * PULLED SPANS: When isPulled is true, another spanner carried this
 * character through time. The span exists on the timeline (the
 * character DID travel) but it costs zero from their own pool. The
 * puller's pool pays instead. Pulled spans still show their displacement
 * for display but are excluded from cycleSpentSeconds and the
 * overspan check.
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

/**
 * Returns the maximum span pool capacity in seconds for a given rank.
 * @param {number} rank - Span rank (0-5).
 * @returns {number} Capacity in seconds.
 */
export function getCurrentSpanCapacity(rank) {
  return SPAN_POOL_SECONDS[Number(rank) || 0] || 0;
}

/**
 * Computes the span cost of a single span event in seconds.
 * The cost is the absolute objective time displaced by the span:
 * |arrivalTs - departureTs| / 1000.
 *
 * @param {Object} spanEvent - Event with {ts, arrivalTs} in milliseconds.
 * @returns {number} Span cost in seconds. 0 for invalid or non-span events.
 */
export function computeSpanCost(spanEvent) {
  if (!spanEvent) return 0;
  const dep = Number(spanEvent.ts) || 0;
  const arr = Number(spanEvent.arrivalTs) || dep;
  if (dep === 0 && arr === 0) return 0;
  return Math.abs(arr - dep) / MS_PER_SECOND;
}

/**
 * Projects pool state after a proposed span, without mutating any history.
 * Used by drag tooltips and validation to show "remaining after this span".
 *
 * @param {Object} params
 * @param {number} params.spanLevel - Span rank (0-5).
 * @param {Array}  params.events - Existing events (same format as calculateSpanPool).
 * @param {number} params.genesisTs - Birth timestamp in ms.
 * @param {number} params.proposedDepartureMs - Proposed departure timestamp in ms.
 * @param {number} params.proposedArrivalMs - Proposed arrival timestamp in ms.
 * @returns {Object} { remainingSeconds, isOverSpan, remainingFormatted, costSeconds }
 */
export function computePoolAfterSpan({ spanLevel, events, genesisTs, proposedDepartureMs, proposedArrivalMs }) {
  // First compute current pool state from existing events
  const current = calculateSpanPool({ spanLevel, events, genesisTs });

  // Cost of the proposed span
  const costSeconds = Math.abs(proposedArrivalMs - proposedDepartureMs) / MS_PER_SECOND;

  // Subtract from current remaining
  const remainingSeconds = current.remainingSeconds - costSeconds;

  return {
    costSeconds,
    remainingSeconds,
    isOverSpan: remainingSeconds < 0,
    remainingFormatted: formatDurationCompact(remainingSeconds)
  };
}

/**
 * Walks a sorted list of events computing cumulative span consumption
 * per cycle (resetting on rest events).
 *
 * SPAN COST = |arrivalTs - ts| / 1000 (arrival minus departure, in seconds).
 * This is the objective time the span jumps, NOT the gap from the previous
 * event. A span from 2000 to 2020 costs 20 years whether the character
 * arrived at 2000 by leveling or by a prior span.
 *
 * @param {Object} params
 * @param {number} params.spanLevel - Span rank (0-5).
 * @param {Array}  params.events - Events sorted by narrative order (ascending sort).
 *   Each event must have:
 *     - {boolean} eventIsSpan - Whether this is a span event.
 *     - {boolean} eventIsRest - Whether this is a rest event (resets pool).
 *     - {boolean} isPulled - Whether this span was caused by another spanner (no pool cost).
 *     - {number} ts - Departure objective time in milliseconds.
 *     - {number} arrivalTs - Arrival objective time in milliseconds (same as ts for level events).
 * @param {number} params.genesisTs - Birth timestamp in milliseconds.
 * @returns {Object} Pool statistics:
 *   - {number}   maxPoolSeconds - Maximum span pool for this rank, in seconds.
 *   - {number}   spentInCycleSeconds - Cumulative span spent in current cycle.
 *   - {number}   remainingSeconds - Pool remaining (can be negative if over-span).
 *   - {boolean}  isOverSpan - True if remainingSeconds < 0.
 *   - {string}   spanTimeRemainingFormatted - TTL-formatted remaining string.
 *   - {Array}    eventStats - Per-event stats
 */
export function calculateSpanPool({ spanLevel, events, genesisTs }) {
  const maxPoolSeconds = SPAN_POOL_SECONDS[spanLevel] || 0;

  let cycleSpentSeconds = 0;
  const eventStats = [];

  for (const event of events) {
    const isSpan = Boolean(event.eventIsSpan);
    const isRest = Boolean(event.eventIsRest);
    const isPulled = Boolean(event.isPulled);
    const eventId = event.id || event._id || '';

    // Rest events reset the cycle counter
    if (isRest) {
      cycleSpentSeconds = 0;
    }

    // SPAN COST: |arrivalTs - ts| / 1000 (objective time displaced by the span).
    // This is the span's own cost - how much objective time the character jumps
    // from departure to arrival. It is NOT the gap from the previous event.
    const departureTs = Number(event.ts) || 0;
    const arrivalTs = isSpan
      ? (Number(event.arrivalTs) || departureTs)
      : departureTs;

    let spentSeconds = 0;
    if (isSpan && departureTs > 0 && arrivalTs > 0) {
      spentSeconds = Math.abs(arrivalTs - departureTs) / MS_PER_SECOND;
      // PULLED SPANS: The character was carried by another spanner.
      // The displacement is real (it happened) but the pool cost is zero.
      // Only self-spanned events drain the cycle pool.
      if (!isPulled) {
        cycleSpentSeconds += spentSeconds;
      }
    }

    const remainingAfterEvent = maxPoolSeconds - cycleSpentSeconds;

    eventStats.push({
      eventId,
      isSpan,
      isPulled,
      isRest,
      spentSeconds,
      spentFormatted: isPulled
        ? `${formatDurationCompact(spentSeconds)} (PULLED)`
        : isSpan
          ? formatDurationCompact(spentSeconds)
          : '0s (Leveling)',
      remainingAfterEvent,
      remainingFormatted: formatDurationCompact(remainingAfterEvent)
    });
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
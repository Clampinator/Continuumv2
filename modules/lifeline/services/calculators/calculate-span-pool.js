import { SECONDS_IN_YEAR } from '../../../temporal-engine/constants.js';

/**
 * Calculates the character's total Span displacement capacity and current consumption.
 * 
 * @param {Actor} actor - The character actor.
 * @param {Array} history - Sorted history array.
 * @param {Object} currentSpan - Optional {departureTime, arrivalTime} for real-time calc.
 * @returns {Object} { total, consumed, remaining } in milliseconds.
 */
export function calculateSpanPool(actor, history, currentSpan = null) {
    const spanRank = actor.system.spanning?.span || 0;
    
    // 1. Calculate Total Capacity
    // 1 year per Span rank
    const total = spanRank * SECONDS_IN_YEAR * 1000;

    if (spanRank < 1) return { total: 0, consumed: 0, remaining: 0 };

    // 2. Identify the start of the current "Pool Cycle"
    // The cycle starts at the last rest event, or Birth (Age 0).
    const events = [...history].sort((a, b) => (Number(b.age) || 0) - (Number(a.age) || 0));
    const lastRest = events.find(e => e.eventIsRest || Number(e.age) === 0);
    const cycleStartAge = lastRest ? Number(lastRest.age) : 0;

    // 3. Sum consumption since the last rest
    const cycleEvents = history.filter(e => Number(e.age) >= cycleStartAge);
    let consumed = 0;

    cycleEvents.forEach(e => {
        if (e.eventIsSpan) {
            const dep = Number(e.ts || e.time);
            const arr = Number(e.arrivalTs || e.arrivalTime || e.time);
            consumed += Math.abs(arr - dep);
        }
    });

    // 4. Incorporate the active drag span if provided
    if (currentSpan) {
        consumed += Math.abs(currentSpan.arrivalTime - currentSpan.departureTime);
    }

    return {
        total,
        consumed,
        remaining: total - consumed
    };
}

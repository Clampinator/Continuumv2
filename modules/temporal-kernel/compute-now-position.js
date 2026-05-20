/**
 * KERNEL: COMPUTE NOW POSITION
 * Determines where the character's NOW indicator should be after
 * recording an event. The rule is simple:
 * - Level events: NOW advances to the event's objective time (ts)
 * - Span events: NOW advances to the arrival time (arrivalTs)
 *
 * This is a physics rule, not a state decision. The State layer must not
 * decide which timestamp to use for NOW based on eventIsSpan.
 *
 * @param {Object} atomic - Atomic record after TTL translation
 * @param {number} atomic.ts - Departure timestamp (epoch ms)
 * @param {number} atomic.arrivalTs - Arrival timestamp (epoch ms)
 * @param {boolean} atomic.eventIsSpan - Whether this is a span event
 * @param {number} atomic.eventAge - Subjective age (seconds since birth)
 * @returns {{ objectiveNow: number, subjectiveNow: number }}
 */
export function computeNowPosition(atomic) {
    const objectiveNow = atomic.eventIsSpan
        ? Number(atomic.arrivalTs)
        : Number(atomic.ts);
    const subjectiveNow = atomic.eventAge;
    return { objectiveNow, subjectiveNow };
}
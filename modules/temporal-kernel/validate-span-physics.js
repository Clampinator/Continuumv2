/**
 * TEMPORAL KERNEL: VALIDATE SPAN PHYSICS
 * Enforces the physical constraints of jumping through time.
 */
import { SECONDS_IN_YEAR, MS_PER_SECOND } from '../temporal-engine/constants.js';

/**
 * Returns the maximum allowable arrivalTs for an UP span being edited.
 * The arrival of an UP span cannot reach or pass the departure of the next
 * event in narrative sequence - that would overlap the following event's
 * position in objective time.
 *
 * Returns null when there is no following event (span is last in history)
 * or when the inputs are missing, in which case no ceiling is applied.
 *
 * @param {Array} history - flat history nodes from getActorHistory
 * @param {string} recordId - ID of the span being edited
 * @returns {number|null} ceiling timestamp (ms) or null
 */
export function computeArrivalCeiling(history, recordId) {
    if (!history || !recordId) return null;
    const sorted = [...history]
        .filter(n => !n.isNow && !n.isVirtual && !n.isBirth)
        .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    const idx = sorted.findIndex(n => n.id === recordId);
    if (idx < 0 || idx >= sorted.length - 1) return null;
    const next = sorted[idx + 1];
    return Number(next.record?.ts ?? next.y ?? 0) || null;
}

export function validateSpanPhysics(proposed, context, options = {}) {
    const { record } = proposed;
    const { lastEvent, spanRank } = context;

    // 1. Ability Gate: Span Rank 0 cannot Span
    if (record.eventIsSpan && (spanRank || 0) < 1) {
        return { isValid: false, error: "Characters with Span Rank 0 cannot perform time jumps." };
    }

    // 2. THE LEVEL BREATH: No consecutive spans.
    // Skipped for edits - the event already passed this check at creation time.
    // Re-validating against the globally-last node gives false positives when
    // editing a span that is not at the end of the narrative sequence.
    if (!options.skipLevelBreath && record.eventIsSpan && lastEvent && Boolean(lastEvent.record?.eventIsSpan)) {
        return {
            isValid: false,
            error: "THE LEVEL BREATH: You cannot span twice in a row. You must record level activity before jumping again."
        };
    }

    // 3. Displacement Pool: Check for Rank capacity (Warning only)
    if (record.eventIsSpan) {
        const arrivalY = proposed.arrivalY || proposed.y;
        const departureY = proposed.y;
        const displacement = Math.abs(arrivalY - departureY);
        const maxCapacity = (spanRank || 0) * SECONDS_IN_YEAR * MS_PER_SECOND;

        if ((context.currentPool + displacement) > maxCapacity) {
            return { isValid: true, warning: "Displacement exceeds character's current Rank capacity." };
        }
    }

    // 4. Arrival Ceiling: UP span arrival cannot reach or pass the next event in narrative order.
    // Only enforced during edits - options.history and options.recordId are provided by update-history-row.
    if (record.eventIsSpan && options.history && options.recordId) {
        const arrivalY = proposed.arrivalY ?? proposed.y;
        const departureY = proposed.y;
        if (arrivalY > departureY) {
            const ceiling = computeArrivalCeiling(options.history, options.recordId);
            if (ceiling !== null && arrivalY >= ceiling) {
                return {
                    isValid: false,
                    error: "Arrival cannot reach or pass the next event. Move the arrival to an earlier time."
                };
            }
        }
    }

    return { isValid: true, error: null };
}

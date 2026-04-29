/**
 * TEMPORAL KERNEL: VALIDATE SPAN PHYSICS
 * Enforces the physical constraints of jumping through time.
 */
import { SECONDS_IN_YEAR, MS_PER_SECOND } from '../temporal-engine/constants.js';

export function validateSpanPhysics(proposed, context) {
    const { record } = proposed;
    const { lastEvent, spanRank } = context;

    // 1. Ability Gate: Span Rank 0 cannot Span
    if (record.eventIsSpan && (spanRank || 0) < 1) {
        return { isValid: false, error: "Characters with Span Rank 0 cannot perform time jumps." };
    }

    // 2. THE LEVEL BREATH: No consecutive spans.
    if (record.eventIsSpan && lastEvent && Boolean(lastEvent.record?.eventIsSpan)) {
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

    return { isValid: true, error: null };
}

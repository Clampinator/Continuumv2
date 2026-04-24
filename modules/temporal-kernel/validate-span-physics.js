/**
 * TEMPORAL KERNEL: VALIDATE SPAN PHYSICS
 * Enforces the physical constraints of jumping through time.
 */
export function validateSpanPhysics(proposed, context) {
    const { record } = proposed;
    const { lastEvent, spanRank } = context;

    // 1. Ability Gate: Span Rank 0 cannot Span
    if (record.isSpan && (spanRank || 0) < 1) {
        return { isValid: false, error: "Characters with Span Rank 0 cannot perform time jumps." };
    }

    // 2. THE LEVEL BREATH: No consecutive spans.
    // If the proposed action is a span, we MUST check the previous action.
    if (record.isSpan && lastEvent && Boolean(lastEvent.record?.isSpan)) {
        return { 
            isValid: false, 
            error: "THE LEVEL BREATH: You cannot span twice in a row. You must record level activity before jumping again." 
        };
    }

    // 3. Displacement Pool: Check for Rank capacity (Warning only)
    if (record.isSpan) {
        const SECONDS_IN_YEAR = 31536000;
        const arrivalY = proposed.arrivalY || proposed.y;
        const departureY = proposed.y;
        const displacement = Math.abs(arrivalY - departureY);
        const maxCapacity = (spanRank || 0) * SECONDS_IN_YEAR * 1000;
        
        if ((context.currentPool + displacement) > maxCapacity) {
            return { isValid: true, warning: "Displacement exceeds character's current Rank capacity." };
        }
    }

    return { isValid: true, error: null };
}

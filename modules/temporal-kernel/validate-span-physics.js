import { SECONDS_IN_YEAR } from '../temporal-engine/constants.js';

/**
 * TEMPORAL KERNEL: VALIDATE SPAN PHYSICS
 * Enforces the physical constraints of jumping through time.
 * 
 * @param {Object} proposed - { x, y, arrivalY, record }
 * @param {Object} context - { lastEvent, spanRank, currentPool }
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateSpanPhysics(proposed, context) {
    const { x, y, arrivalY, record } = proposed;
    const { lastEvent, spanRank, currentPool } = context;

    // 1. Ability Gate: Span Rank 0 cannot Span
    if (record.isSpan && (spanRank || 0) < 1) {
        return { isValid: false, error: "Characters with Span Rank 0 cannot perform time jumps." };
    }

    // 2. The Level Breath: Consecutive Spans are illegal.
    // Departure Age must be > Arrival Age of previous jump.
    if (record.isSpan && lastEvent?.record?.isSpan) {
        if (x <= (lastEvent.x || 0)) {
            return { isValid: false, error: "The Level Breath: You must spend time at a Level before jumping again." };
        }
    }

    // 3. Displacement Pool: Check for Rank capacity
    if (record.isSpan) {
        const displacement = Math.abs(arrivalY - y);
        const maxCapacity = (spanRank || 0) * SECONDS_IN_YEAR * 1000;
        
        if ((currentPool + displacement) > maxCapacity) {
            // Note: Lore allows exceeding pool (The RED state), 
            // but we provide the warning for the interaction machine.
            return { isValid: true, warning: "Displacement exceeds character's current Rank capacity." };
        }
    }

    return { isValid: true, error: null };
}

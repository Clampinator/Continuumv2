/**
 * Calculates the current objectiveOffset for the rail an event sits on.
 * Required for solving the Age/Time diagonal.
 * Delegates to the canonical computeOffsetFromArrival from the kernel.
 */
import { computeOffsetFromArrival } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

export function calculateRailOffset(actor, targetAge, targetTime) {
    return computeOffsetFromArrival(targetTime, targetAge);
}
/**
 * Calculates the current objectiveOffset for the rail an event sits on.
 * Required for solving the Age/Time diagonal.
 * @param {Actor} actor
 * @param {number} targetAge
 * @param {number} targetTime
 * @returns {number}
 */
export function calculateRailOffset(actor, targetAge, targetTime) {
    // Offset = Time - (Age * 1000)
    return targetTime - (targetAge * 1000);
}

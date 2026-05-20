/**
 * TEMPORAL KERNEL: CALCULATE SPAN DISPLACEMENT
 * Pure math: Determines the objective time gap of a jump.
 * 
 * @param {number} departureTs - Start of the jump (ms).
 * @param {number} arrivalTs - End of the jump (ms).
 * @returns {number} The physical displacement in milliseconds.
 */
export function calculateSpanDisplacement(departureTs, arrivalTs) {
    if (departureTs === null || arrivalTs === null || departureTs === undefined || arrivalTs === undefined) return 0;
    return Number(arrivalTs) - Number(departureTs);
}

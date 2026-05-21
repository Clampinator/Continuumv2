/**
 * Speed penalty table for vehicles exceeding their top speed block.
 * Game rule: each speed block above top speed incurs an escalating penalty.
 * Index 0 = 1 block over, index 4 = 5+ blocks over.
 */
export const SPEED_PENALTIES = [0, -3, -6, -9, -15];

/**
 * Calculates the speed modifier for a vehicle at a given speed block.
 * Within top speed: positive bonus (topSpeed - selectedSpeed).
 * Above top speed: negative penalty from the SPEED_PENALTIES table.
 * @param {number} selectedSpeed - The current speed block (1-5).
 * @param {number} topSpeed - The vehicle's top speed block.
 * @returns {number} The modifier: positive bonus if within top speed,
 *   negative penalty if over.
 */
export function calculateSpeedModifier(selectedSpeed, topSpeed) {
    if (selectedSpeed <= topSpeed) {
        return topSpeed - selectedSpeed;
    }
    const penaltyIndex = selectedSpeed - topSpeed - 1;
    return SPEED_PENALTIES[penaltyIndex] ?? SPEED_PENALTIES[SPEED_PENALTIES.length - 1];
}
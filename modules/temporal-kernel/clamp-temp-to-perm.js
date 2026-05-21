/**
 * Clamps a temporary attribute value so it does not exceed its permanent counterpart.
 * Game rule: Temp Will, Temp IR, and Temp ER can never exceed their Perm values.
 * @param {number} tempValue - The proposed temporary value.
 * @param {number} permValue - The current permanent value (upper bound).
 * @returns {number} The clamped temporary value.
 */
export function clampTempToPerm(tempValue, permValue) {
  return Math.min(tempValue, permValue);
}
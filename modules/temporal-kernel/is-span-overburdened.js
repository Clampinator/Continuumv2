/**
 * TEMPORAL KERNEL: IS SPAN OVERBURDENED
 * Determines whether a spanner is overburdened by carried weight.
 * Game rule: Total encumbrance exceeding span weight limit prevents spanning.
 * Equality (encumbrance == limit) is NOT overburdened - the character is
 * at capacity but can still span.
 *
 * @param {number} totalEncumbrance - Combined weight of armor, gear, and weapons.
 * @param {number} spanWeightLimit - Maximum carry weight for the spanner's rank.
 * @returns {boolean} True if the character is overburdened.
 */
export function isSpanOverburdened(totalEncumbrance, spanWeightLimit) {
  return totalEncumbrance > spanWeightLimit;
}
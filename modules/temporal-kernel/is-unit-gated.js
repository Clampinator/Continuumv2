/**
 * Determines whether a unit is gated by External Reputation.
 * Pure rule: unitTier > externalReputation means the unit is inaccessible.
 * @param {number} unitTier - The tier number extracted from the unit's size.
 * @param {number} externalReputation - The org's External Reputation value.
 * @returns {boolean} True if the unit is gated.
 */
export function isUnitGated(unitTier, externalReputation) {
  return unitTier > externalReputation;
}
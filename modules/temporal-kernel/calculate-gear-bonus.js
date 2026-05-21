/**
 * Calculates the effective bonus of a gear item from its three aspect values.
 * Game rule: Bonus = floor(average of the three aspects).
 * Fallback: if all aspects are 0 and a legacy bonus exists, use that instead.
 * @param {number} aspect1 - First aspect value.
 * @param {number} aspect2 - Second aspect value.
 * @param {number} aspect3 - Third aspect value.
 * @param {number} [legacyBonus] - Optional pre-existing bonus for backward compat.
 * @returns {number} The computed gear bonus.
 */
export function calculateGearBonus(aspect1, aspect2, aspect3, legacyBonus) {
  const a1 = Number(aspect1) || 0;
  const a2 = Number(aspect2) || 0;
  const a3 = Number(aspect3) || 0;
  if (a1 === 0 && a2 === 0 && a3 === 0 && Number(legacyBonus) > 0) {
    return Number(legacyBonus);
  }
  return Math.floor((a1 + a2 + a3) / 3);
}
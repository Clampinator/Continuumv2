/**
 * TEMPORAL KERNEL: CALCULATE REACT PENALTY
 * Returns the React penalty from encumbrance exceeding Force.
 * Game rule: penalty = max(0, totalEncumbrance - forceValue).
 * @param {number} totalEncumbrance - Total carry weight from armor+gear+weapons.
 * @param {number} forceValue - The Force attribute value.
 * @returns {number} Non-negative penalty to React/Spanning.
 */
export function calculateQuickPenalty(totalEncumbrance, forceValue) {
  return Math.max(0, totalEncumbrance - forceValue);
}
/**
 * Clamps a metability value so it does not exceed its operant potential.
 * Game rule: Current metability rank cannot exceed the operant potential ceiling.
 * @param {number} value - The proposed metability rank.
 * @param {number} potential - The operant potential (upper bound).
 * @returns {number} The clamped metability rank.
 */
export function clampValueToPotential(value, potential) {
  return Math.min(value, potential);
}
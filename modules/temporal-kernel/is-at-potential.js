/**
 * TEMPORAL KERNEL: IS AT POTENTIAL
 * Determines whether a metability has reached its operant potential.
 * Game rule: A metability is "at potential" when current value >= potential.
 *
 * @param {number} currentValue - The current metability rank.
 * @param {number} potentialValue - The operant potential ceiling.
 * @returns {boolean} True if at or exceeding potential.
 */
export function isAtPotential(currentValue, potentialValue) {
  return currentValue >= potentialValue;
}
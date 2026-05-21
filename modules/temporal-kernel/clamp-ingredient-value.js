/**
 * TEMPORAL KERNEL: CLAMP INGREDIENT VALUE
 * Clamps an ingredient value against two game rule caps:
 * 1. Range: value is clamped to 0-5.
 * 2. Per-ingredient: cannot exceed the character's rank in that metability.
 * 3. Volume: this ingredient + other ingredients cannot exceed the volume limit.
 *
 * The clamp order is: range -> rank -> volume. Each step can only lower
 * the value further, never raise it.
 *
 * @param {number} value - The raw input value.
 * @param {number} metaRank - The character's rank in this ingredient's metability.
 * @param {number} otherTotal - Sum of all OTHER ingredient values in this application.
 * @param {number} volumeLimit - The application's maximum total volume.
 * @returns {number} The clamped value.
 */
export function clampIngredientValue(value, metaRank, otherTotal, volumeLimit) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  const rankClamped = Math.min(clamped, metaRank);
  const volumeClamped = Math.min(rankClamped, Math.max(0, volumeLimit - otherTotal));
  return volumeClamped;
}
/**
 * TEMPORAL KERNEL: GET DOMINANT INGREDIENT
 * Identifies the dominant (highest-valued) metability ingredient in an application.
 * Game rule: The dominant ingredient determines which metability roll to trigger.
 * Ties are broken by the canonical key order:
 * coercion, creativity, farsense, pk, redaction.
 *
 * @param {object} application - Application data with coercion, creativity,
 *   farsense, pk, redaction numeric fields.
 * @returns {string|null} The key of the dominant ingredient, or null if all are 0.
 */
export function getDominantIngredient(application) {
  const keys = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
  let best = null;
  let bestVal = 0;
  for (const key of keys) {
    const v = Number(application[key]) || 0;
    if (v > bestVal) { bestVal = v; best = key; }
  }
  return best;
}
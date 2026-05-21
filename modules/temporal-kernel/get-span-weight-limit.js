/**
 * TEMPORAL KERNEL: GET SPAN WEIGHT LIMIT
 * Returns the maximum weight (kg) a spanner can carry based on span rank.
 * Game rule table: Span 0=5kg, 1=10kg, 2=50kg, 3=100kg, 4=500kg, 5=1000kg.
 * Out-of-range ranks default to 5kg (the leveller baseline).
 *
 * @param {number} spanRank - The character's Span rank (0-5).
 * @returns {number} Maximum carry weight in kg.
 */
export function getSpanWeightLimit(spanRank) {
  const limits = [5, 10, 50, 100, 500, 1000];
  return limits[spanRank] ?? 5;
}
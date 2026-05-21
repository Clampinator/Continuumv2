/**
 * TEMPORAL KERNEL: IS LEVELLER
 * Determines whether a character is a Leveller (Span rank 0).
 * Game rule: Span 0 characters cannot span and are called Levellers.
 *
 * @param {number} spanRank - The character's Span rank.
 * @returns {boolean} True if the character is a Leveller.
 */
export function isLeveller(spanRank) {
  return spanRank === 0;
}
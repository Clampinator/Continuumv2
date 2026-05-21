/**
 * TEMPORAL KERNEL: GET APPLICATION VOLUME LIMIT
 * Returns the maximum total ingredient volume for a metability application.
 * Game rule: Volume = max(0, (Analyze * 3) - 6).
 * At Analyze 2: 0, Analyze 3: 3, Analyze 4: 6, Analyze 5: 9.
 *
 * @param {number} analyzeRank - The character's Analyze (Mind) attribute value.
 * @returns {number} Maximum ingredient volume.
 */
export function getApplicationVolumeLimit(analyzeRank) {
  return Math.max(0, (analyzeRank * 3) - 6);
}
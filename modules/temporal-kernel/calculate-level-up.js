/**
 * TEMPORAL KERNEL: CALCULATE LEVEL UP
 *
 * Determines which aspects (Attributes and operant Metabilities) are
 * eligible for level-up based on accumulated progression credit.
 *
 * Handles multi-level jumps: if a character has enough accumulated
 * years to skip a level, all eligible levels are returned.
 *
 * ENFORCES: Metability values cannot exceed their operant potential.
 * The caller must still clamp metability values using
 * clampValueToPotential() before persisting.
 *
 * @param {Object} progression - Output from calculateAspectProgression:
 *   { force: { currentLevel, totalLinkedYears, progressYears, canLevelUp, ... }, ... }
 * @param {Object} metabilityPotentials - Operant potential caps:
 *   { coercion: 3, creativity: 2, ... }. Only metabilities have potentials.
 *   Attributes have no cap (they can rise indefinitely).
 * @returns {Array} List of eligible level-ups:
 *   [{ aspect: 'react', currentLevel: 3, newLevel: 4 }, ...]
 */
export function calculateLevelUp(progression, metabilityPotentials = {}) {
  if (!progression) return [];

  const METABILITY_KEYS = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
  const levelUps = [];

  for (const [aspect, data] of Object.entries(progression)) {
    if (!data || data.currentLevel < 1) continue;

    // Compute how many levels the accumulated years can buy.
    // Start from currentLevel and check each subsequent level.
    const accumulated = data.totalLinkedYears;
    let level = data.currentLevel;

    // Each next level costs (currentLevel) additional years.
    // We check if accumulated >= cumulativeCost(level + 1).
    // T(n) = n*(n-1)/2
    while (_cumulativeCost(level + 1) <= accumulated) {
      // METABILITY CAP: Cannot exceed operant potential.
      if (METABILITY_KEYS.includes(aspect)) {
        const potential = metabilityPotentials[aspect] || 0;
        if (level + 1 > potential) break;
      }
      level++;
    }

    // Only report if at least one level was gained.
    if (level > data.currentLevel) {
      levelUps.push({
        aspect,
        currentLevel: data.currentLevel,
        newLevel: level
      });
    }
  }

  return levelUps;
}

/**
 * Cumulative progression cost to reach a given level from level 1.
 * Must match the same formula as in calculate-aspect-progression.js.
 * T(n) = n*(n-1)/2
 *
 * @param {number} level - Target level
 * @returns {number} Cumulative years needed
 */
function _cumulativeCost(level) {
  if (level <= 1) return 0;
  return level * (level - 1) / 2;
}
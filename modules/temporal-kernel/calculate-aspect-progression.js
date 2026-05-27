import { getAgeBandCredit } from '/systems/continuum-v2/modules/temporal-kernel/calculate-age-band-credit.js';

/**
 * TEMPORAL KERNEL: CALCULATE ASPECT PROGRESSION
 *
 * Computes progression data for all linkable aspects (Attributes and
 * operant Metabilities) based on accumulated subjective years in
 * linked Experiences.
 *
 * PROGRESSION RULE:
 *   To raise an aspect from level N to N+1, the character must have
 *   accumulated N credited years across all Experiences linked to
 *   that aspect. Levels are cumulative: reaching level 3 from level 1
 *   requires 1 + 2 = 3 total credited years.
 *
 * AGE-BAND CREDIT:
 *   Each credited year is multiplied by an age-band factor that models
 *   physical development. Force peaks young (age 25), React peaks
 *   earlier still (age 19), Analyze peaks mid-life (age 35), and
 *   Relate peaks late (age 45). After peaking, credit decays toward
 *   a floor value. Metabilities get full credit (1.0) at any age
 *   since they depend on potential and practice, not physical maturity.
 *
 * MULTI-LINKING:
 *   An Experience linked to multiple aspects contributes its full
 *   credited duration to EACH linked aspect. If a 5-year Experience
 *   is linked to both Force and React, both receive 5 years of
 *   credit (adjusted by their respective age-band factors).
 *
 * FORGETTING TOGGLE:
 *   When forgettingEnabled is true, each experience's contribution
 *   is further multiplied by its experience bonus (0-3) divided by 3,
 *   degrading the progression credit of old, short experiences.
 *   When false (default), only age-band credit applies.
 *
 * SPAN DECOUPLING:
 *   Duration is calculated in subjective age (seconds), not objective
 *   time. Spans move the character in objective time but do NOT age
 *   them, so spanning does not inflate progression credit.
 *
 * CREDIT FORMULA:
 *   creditedYears = rawDurationYears x ageBandCredit(midpointAge) x forgettingMultiplier
 *
 * @param {Object} eras - actor.system.eras (contains experiences with linkedAspects)
 * @param {number} levelingAge - Subjective age without span displacement (seconds)
 * @param {Object} currentLevels - Current aspect levels: { force: 4, analyze: 3, ... }
 * @param {boolean} forgettingEnabled - Whether The Forgetting reduces progression credit
 * @returns {Object} Progression map keyed by aspect
 */
export function calculateAspectProgression(eras, levelingAge, currentLevels, forgettingEnabled = false) {
  const SECONDS_PER_YEAR = 31536000;

  // ASPECT KEYS: The four Attributes and five operant Metabilities.
  // Willpower is excluded (it uses temp/perm and doesn't participate).
  const ASPECT_KEYS = [
    'force', 'analyze', 'relate', 'react',
    'coercion', 'creativity', 'farsense', 'pk', 'redaction'
  ];

  // Initialize accumulation map: each aspect starts at 0 credited years.
  const linkedYears = {};
  ASPECT_KEYS.forEach(key => { linkedYears[key] = 0; });

  // GUARD: No eras or invalid leveling age means no progression data.
  if (!eras || levelingAge === null || levelingAge === undefined) {
    return _buildProgressionMap(ASPECT_KEYS, linkedYears, currentLevels);
  }

  // ACCUMULATE: Walk every era's experiences and sum credited years
  // for each linked aspect. Only experiences with linkedAspects arrays
  // containing a given aspect key contribute to that aspect.
  const eraEntries = Object.values(eras || {});
  for (const era of eraEntries) {
    const expEntries = Object.values(era.experiences || {});
    for (const exp of expEntries) {
      // Skip experiences with no aspect links.
      const aspects = exp.linkedAspects;
      if (!aspects || !Array.isArray(aspects) || aspects.length === 0) continue;

      // Compute subjective duration in years.
      const durationYears = _experienceDurationYears(exp, levelingAge, SECONDS_PER_YEAR);

      // Skip zero or negative duration (malformed dates).
      if (durationYears <= 0) continue;

      // AGE-BAND CREDIT: How productive this age was for each aspect.
      // Computed at the midpoint age of the experience. A 5-year
      // experience from age 15-20 uses the credit at age 17.5.
      const startAgeSeconds = _startAge(exp, levelingAge, SECONDS_PER_YEAR);
      const midpointAgeYears = startAgeSeconds != null
        ? (startAgeSeconds / SECONDS_PER_YEAR) + (durationYears / 2)
        : null;

      // OPTIONAL FORGETTING: Reduce credit by experience bonus / 3.
      let forgettingMultiplier = 1.0;
      if (forgettingEnabled) {
        forgettingMultiplier = _forgettingMultiplier(exp, levelingAge, SECONDS_PER_YEAR);
      }

      // Apply credit to each linked aspect, adjusting by its age-band factor.
      for (const aspectKey of aspects) {
        if (linkedYears[aspectKey] === undefined) continue;

        // Age-band credit depends on the aspect and the midpoint age.
        // Metabilities always get 1.0; attributes follow their curve.
        const ageBandCredit = midpointAgeYears != null
          ? getAgeBandCredit(aspectKey, midpointAgeYears)
          : 1.0;

        const creditedYears = durationYears * ageBandCredit * forgettingMultiplier;
        linkedYears[aspectKey] += creditedYears;
      }
    }
  }

  return _buildProgressionMap(ASPECT_KEYS, linkedYears, currentLevels);
}

/**
 * Extracts the start age in seconds from an experience object.
 * Used to compute the midpoint age for age-band credit calculation.
 *
 * @param {Object} exp - The experience data object
 * @param {number} levelingAge - Current subjective age in seconds
 * @param {number} SECONDS_PER_YEAR - Seconds per year constant
 * @returns {number|null} Start age in seconds, or null if unavailable
 */
function _startAge(exp, levelingAge, SECONDS_PER_YEAR) {
  if (exp.startAgeSeconds !== undefined && exp.startAgeSeconds !== null) {
    return exp.startAgeSeconds;
  }
  // Without pre-computed startAge, we can't compute midpoint age.
  return null;
}

/**
 * Computes the subjective duration of an experience in years.
 * For ongoing experiences, uses levelingAge - startAge.
 * For closed experiences, uses endAge - startAge.
 *
 * @param {Object} exp - The experience data object
 * @param {number} levelingAge - Current subjective age in seconds
 * @param {number} SECONDS_PER_YEAR - Seconds per year constant
 * @returns {number} Duration in fractional years
 */
function _experienceDurationYears(exp, levelingAge, SECONDS_PER_YEAR) {
  // Prefer pre-computed ages (supplied by the engine pipeline).
  if (exp.startAgeSeconds !== undefined && exp.endAgeSeconds !== undefined) {
    const duration = (exp.endAgeSeconds - exp.startAgeSeconds) / SECONDS_PER_YEAR;
    return Math.max(0, duration);
  }

  // Ongoing: use levelingAge as end.
  if (exp.isOngoing || !exp.dateTo || String(exp.dateTo).trim() === '') {
    if (exp.startAgeSeconds !== undefined) {
      const duration = (levelingAge - exp.startAgeSeconds) / SECONDS_PER_YEAR;
      return Math.max(0, duration);
    }
    // Without startAgeSeconds, we can't compute duration accurately.
    return 0;
  }

  // Closed: use start/end age seconds if available.
  if (exp.startAgeSeconds !== undefined) {
    const endSeconds = exp.endAgeSeconds !== undefined
      ? exp.endAgeSeconds
      : levelingAge;
    const duration = (endSeconds - exp.startAgeSeconds) / SECONDS_PER_YEAR;
    return Math.max(0, duration);
  }

  // Fallback: no age data available, can't compute.
  return 0;
}

/**
 * FORGETTING MULTIPLIER: Reduces progression credit based on
 * how recently and how long the experience lasted.
 * Uses the same two-axis approach as calculateExperienceBonus,
 * normalized to 0-1: bonus / 3.
 *
 * @param {Object} exp - Experience data
 * @param {number} levelingAge - Current subjective age in seconds
 * @param {number} SECONDS_PER_YEAR - Seconds per year constant
 * @returns {number} Multiplier between 0 and 1
 */
function _forgettingMultiplier(exp, levelingAge, SECONDS_PER_YEAR) {
  const startAge = exp.startAgeSeconds || 0;
  const isOngoing = !!(exp.isOngoing || !exp.dateTo || String(exp.dateTo).trim() === '');
  const endAge = isOngoing
    ? levelingAge
    : (exp.endAgeSeconds || levelingAge);

  const durationYears = (endAge - startAge) / SECONDS_PER_YEAR;
  const distanceYears = isOngoing
    ? 0
    : Math.max(0, (levelingAge - endAge) / SECONDS_PER_YEAR);

  const durationBonus = durationYears < 0.5 ? 0
    : durationYears <= 2 ? 1
    : durationYears <= 4 ? 2
    : 3;

  const distanceBonus = distanceYears < 2 ? 3
    : distanceYears <= 5 ? 2
    : distanceYears <= 10 ? 1
    : 0;

  const bonus = Math.min(durationBonus, distanceBonus);
  return bonus / 3;
}

/**
 * Builds the final progression map from accumulated credited years
 * and current levels. Each entry shows how close the aspect is
 * to its next level-up.
 *
 * @param {string[]} aspectKeys - The aspect key names
 * @param {Object} linkedYears - Accumulated credited years per aspect
 * @param {Object} currentLevels - Current level per aspect
 * @returns {Object} Progression map
 */
function _buildProgressionMap(aspectKeys, linkedYears, currentLevels) {
  const result = {};
  for (const key of aspectKeys) {
    const currentLevel = currentLevels[key] || 0;
    const totalLinked = linkedYears[key] || 0;

    // Cumulative cost to reach (currentLevel + 1) from level 1.
    // Triangular number: T(n) = n*(n-1)/2 where n = targetLevel.
    // Level 1->2: T(2) = 1, Level 2->3: T(3) = 3, Level 3->4: T(4) = 6, etc.
    const targetLevel = currentLevel + 1;
    const cumulativeCost = _cumulativeCost(targetLevel);

    // Progress toward next level: how many credited years accumulated
    // beyond the cost of reaching the current level.
    const currentCost = _cumulativeCost(currentLevel);
    const progressYears = totalLinked - currentCost;

    // Years still needed to reach next level.
    const nextLevelCost = currentLevel;
    const remainingYears = Math.max(0, cumulativeCost - totalLinked);

    const canLevelUp = progressYears >= nextLevelCost && currentLevel > 0;

    result[key] = {
      currentLevel,
      totalLinkedYears: Math.round(totalLinked * 100) / 100,
      nextLevelCost,
      progressYears: Math.round(progressYears * 100) / 100,
      remainingYears: Math.round(remainingYears * 100) / 100,
      canLevelUp
    };
  }
  return result;
}

/**
 * Cumulative progression cost to reach a given level from level 1.
 * T(n) = n*(n-1)/2
 * T(1) = 0 (born at level 1, no cost)
 * T(2) = 1 (cost 1 year)
 * T(3) = 3 (1 + 2 years)
 * T(4) = 6 (1 + 2 + 3 years)
 * T(5) = 10 (1 + 2 + 3 + 4 years)
 *
 * @param {number} level - Target level
 * @returns {number} Cumulative years needed
 */
export function _cumulativeCost(level) {
  if (level <= 1) return 0;
  return level * (level - 1) / 2;
}
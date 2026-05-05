/**
 * TWO-AXIS EXPERIENCE BONUS CALCULATOR
 *
 * Computes the Continuum RPG resonance bonus for an experience by
 * combining two axes:
 *
 *   DURATION AXIS (how long the experience lasted):
 *     <6 months = 0, 6mo-2yr = +1, 2-4yr = +2, 4+yr = +3
 *
 *   DISTANCE AXIS (how long ago it ended, relative to NOW):
 *     <2yr = +3, 2-5yr = +2, 5-10yr = +1, >10yr = 0
 *
 *   Combined: duration + distance, hard-capped at +3.
 *   Ongoing experiences always get distance = +3.
 *
 * This is the authoritative bonus calculation used by both the span-graph
 * render pipeline (generate-experiences.js for The Forgetting opacity)
 * and the dice roller (calculate-resonance-bonuses.js for skill checks).
 *
 * SPAN DECOUPLING: Callers must pass levelingAge (subjective age WITHOUT
 * span displacement), not the raw NOW node age. Spans move the character
 * in objective time but do NOT age them.
 *
 * @param {boolean} isOngoing - True if experience is still active
 * @param {number} endAge - End subjective age in seconds
 * @param {number} startAge - Start subjective age in seconds
 * @param {number} nowAge - Current NOW subjective age in seconds (use levelingAge)
 * @returns {number} Capped bonus value (0-3)
 */
export function calculateExperienceBonus(isOngoing, endAge, startAge, nowAge) {
  const SECONDS_PER_YEAR = 31536000;

  // DURATION AXIS: How long the character was in this experience
  const durationSeconds = endAge - startAge;
  const durationYears = durationSeconds / SECONDS_PER_YEAR;

  const durationBonus = durationYears < 0.5 ? 0
    : durationYears <= 2 ? 1
    : durationYears <= 4 ? 2
    : 3;

  // DISTANCE AXIS: How far in the subjective past the experience ended.
  // Ongoing experiences are always "recent" -> distance = 0 years -> +3.
  const distanceYears = isOngoing ? 0 : Math.max(0, (nowAge - endAge) / SECONDS_PER_YEAR);
  const distanceBonus = distanceYears < 2 ? 3
    : distanceYears <= 5 ? 2
    : distanceYears <= 10 ? 1
    : 0;

  // Hard cap: no skill check bonus can exceed +3 in Continuum
  return Math.min(durationBonus + distanceBonus, 3);
}

/**
 * DISTANCE-ONLY BONUS (legacy single-axis)
 *
 * Maps time since an experience ended to a mechanical resonance bonus
 * using only the distance axis. Used for quick lookups where duration
 * information is unavailable.
 *
 * @param {number} diffYears - Years since the experience ended
 * @returns {number} Bonus value (0-3)
 */
export function calculateDistanceBonus(diffYears) {
  if (diffYears < 2) return 3;
  if (diffYears <= 5) return 2;
  if (diffYears <= 10) return 1;
  return 0;
}
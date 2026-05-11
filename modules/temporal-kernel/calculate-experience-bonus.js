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
 *   THE FORGETTING: Duration gives a maximum possible bonus, but
 *   distance determines what you actually remember. The bonus is
 *   the LOWER of the two axes - you can never resonate above how
 *   recently you used the skill, no matter how long you practiced.
 *
 *   Examples:
 *     5yr experience ended 1yr ago: duration=+3, distance=+3 -> +3
 *     5yr experience ended 7yr ago: duration=+3, distance=+1 -> +1
 *     5yr experience ended 15yr ago: duration=+3, distance=+0 -> +0
 *     6mo experience ended 6mo ago: duration=+1, distance=+3 -> +1
 *
 *   Ongoing experiences always get distance = +3 (still doing it).
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
 * @returns {number} Bonus value (0-3)
 */
export function calculateExperienceBonus(isOngoing, endAge, startAge, nowAge) {
  const SECONDS_PER_YEAR = 31536000;

  // DURATION AXIS: How long the character was in this experience.
  // This sets the maximum possible resonance.
  const durationSeconds = endAge - startAge;
  const durationYears = durationSeconds / SECONDS_PER_YEAR;

  const durationBonus = durationYears < 0.5 ? 0
    : durationYears <= 2 ? 1
    : durationYears <= 4 ? 2
    : 3;

  // DISTANCE AXIS: How far in the subjective past the experience ended.
  // This caps what you can actually remember. The Forgetting means
  // even a long-ago mastery fades if you haven't used it recently.
  // Ongoing experiences are always "recent" -> distance = 0 years -> +3.
  const distanceYears = isOngoing ? 0 : Math.max(0, (nowAge - endAge) / SECONDS_PER_YEAR);
  const distanceBonus = distanceYears < 2 ? 3
    : distanceYears <= 5 ? 2
    : distanceYears <= 10 ? 1
    : 0;

  // THE FORGETTING: You remember the LESSER of how long you did it
  // and how recently. A 5-year stint from 15 years ago is as good as
  // gone; a 6-month crash course from yesterday is a +1, not a +3.
  return Math.min(durationBonus, distanceBonus);
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
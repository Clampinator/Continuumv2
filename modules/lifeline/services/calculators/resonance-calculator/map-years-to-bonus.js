/**
 * Maps time since an experience ended to a mechanical resonance bonus.
 *
 * Continuum RPG distance-from-NOW bonus thresholds (authoritative from spec):
 *   <2 years  -> +3 (strong resonance, like yesterday)
 *   2-5 years -> +2 (firm resonance, still sharp)
 *   5-10 years -> +1 (slight resonance, fading)
 *   >10 years -> 0 (gone, beyond recall bonus)
 *
 * Note: This is the DISTANCE axis only. The full bonus also includes a
 * DURATION axis computed in generate-experiences.js/_calculateBonus().
 * This function is called separately by the dice roller interface
 * (calculate-resonance-bonuses.js) which uses the distance axis alone.
 *
 * @param {number} diffYears - Years since the experience ended
 * @returns {number} Bonus value (0-3)
 */
export function mapYearsToBonus(diffYears) {
    if (diffYears < 2) return 3;
    if (diffYears <= 5) return 2;
    if (diffYears <= 10) return 1;
    return 0;
}
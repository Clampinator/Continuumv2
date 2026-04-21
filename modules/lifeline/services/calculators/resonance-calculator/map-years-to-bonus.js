/**
 * Maps the time since an experience was active to a mechanical resonance bonus.
 * @param {number} diffYears 
 * @returns {number}
 */
export function mapYearsToBonus(diffYears) {
    if (diffYears < 2.0001) {
        return 3;
    } else if (diffYears <= 7) {
        return 2;
    } else if (diffYears <= 15) {
        return 1;
    }
    return 0;
}

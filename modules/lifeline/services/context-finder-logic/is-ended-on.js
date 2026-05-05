import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/**
 * Checks if an experience ended on a specific date.
 * @param {object} experience 
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isEndedOn(experience, dateStr) {
    if (!experience.dateTo) return false;
    return normalizeDateInput(experience.dateTo) === dateStr;
}


import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from './constants.js';
import { formatSubjectiveAge } from './format-subjective-age.js';

export function formatSubjectiveAgeSmart(seconds, range) {
    if (range > SECONDS_IN_YEAR * 5) return Math.floor(seconds / SECONDS_IN_YEAR) + "y";
    if (range > SECONDS_IN_DAY * 60) return (seconds / SECONDS_IN_YEAR).toFixed(1) + "y";
    return formatSubjectiveAge(seconds);
}

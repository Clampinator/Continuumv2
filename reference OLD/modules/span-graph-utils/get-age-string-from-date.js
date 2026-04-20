
import { formatSubjectiveAge } from './format-subjective-age.js';

export function getAgeStringFromDate(dateStr, dobTs) {
    if (!dateStr || !dobTs) return "0y";
    const ts = new Date(dateStr + (dateStr.includes('T') ? '' : "T00:00:00")).getTime();
    if (isNaN(ts)) return "0y";
    return formatSubjectiveAge((ts - dobTs) / 1000);
}

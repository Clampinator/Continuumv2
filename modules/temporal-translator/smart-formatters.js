import { formatSubjectiveAge } from './age-converter.js';
import { formatObjectiveTime } from './coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '../span-graph-utils/constants.js';

const MS_IN_YEAR = SECONDS_IN_YEAR * 1000;
const MS_IN_DAY = SECONDS_IN_DAY * 1000;

/**
 * TEMPORAL TRANSLATOR: SMART AGE FORMATTER
 * Adapts age label precision based on visible range.
 * Wide zoom shows just years; tight zoom shows full format.
 * @param {number} seconds - Subjective age in seconds.
 * @param {number} range - Visible age range in seconds.
 * @returns {string} Compact or full age string.
 */
export function formatSubjectiveAgeSmart(seconds, range) {
    if (range > SECONDS_IN_YEAR * 5) return Math.floor(seconds / SECONDS_IN_YEAR) + 'y';
    if (range > SECONDS_IN_DAY * 60) return (seconds / SECONDS_IN_YEAR).toFixed(1) + 'y';
    return formatSubjectiveAge(seconds);
}

/**
 * TEMPORAL TRANSLATOR: SMART DATE FORMATTER
 * Adapts date label precision based on visible time range.
 * Wide zoom shows just years; medium shows month+year; tight shows full date.
 * Uses TTL's formatObjectiveTime for consistent location-aware output.
 * @param {number} ts - Objective timestamp in milliseconds.
 * @param {number} range - Visible time range in milliseconds.
 * @param {Object} [context] - { timezone: string } for location-aware formatting.
 * @returns {string[]} Array of one or two label lines.
 */
export function formatObjectiveDateSmart(ts, range, context) {
    // Wide zoom: extract year component only
    if (range > MS_IN_YEAR * 10) {
        const dt = formatObjectiveTime(ts, context);
        return [dt.date.split('-')[0]];
    }
    // Medium zoom: month + year
    if (range > MS_IN_DAY * 90) {
        const d = new Date(ts);
        return [d.toLocaleString('default', { month: 'short', year: 'numeric' })];
    }
    // Tight zoom: full ISO date
    const dt = formatObjectiveTime(ts, context);
    return [dt.date];
}
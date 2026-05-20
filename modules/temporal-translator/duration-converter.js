/**
 * TEMPORAL TRANSLATOR: DURATION CONVERTER
 * Functions for computing and formatting time durations.
 */

import { formatDateOnly } from './coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY, SECONDS_IN_HOUR, SECONDS_IN_MINUTE } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * Computes the difference in seconds between two Date objects.
 * @param {Date} dateA - Start date.
 * @param {Date} dateB - End date.
 * @returns {number} Duration in seconds (positive if dateB is after dateA).
 */
export function diffSeconds(dateA, dateB) {
    return (dateB.getTime() - dateA.getTime()) / 1000;
}

/**
 * Converts a subjective age (seconds from birth) to a date string
 * by adding the age to the date-of-birth timestamp, then formatting
 * through the TTL's coordinate converter for location-aware output.
 * @param {number} seconds - Subjective age in seconds.
 * @param {number} dobTs - Date-of-birth timestamp in milliseconds.
 * @param {Object} [context] - { timezone: string } for location-aware formatting.
 * @returns {string} Date string "YYYY-MM-DD".
 */
export function convertSecondsToDateString(seconds, dobTs, context) {
    const ts = dobTs + (seconds * 1000);
    return formatDateOnly(ts, context || { timezone: 'UTC' });
}

/**
 * Formats a duration in seconds into a compact human-readable string.
 * Zero-suppressed format: "10y 23d 5h 30m 12s".
 * Negative values use a minus prefix: "-1y 0d 0h 0m 5s".
 * Falls back to "0s" for zero or NaN.
 *
 * This replaces the inline _formatSecondsToDuration that was duplicated
 * in prepare-data.js and sheet-data-preparation.js.
 *
 * @param {number} totalSeconds - Duration in seconds (can be negative).
 * @returns {string} Compact duration string.
 */
export function formatDurationCompact(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return '0s';
    const isNegative = totalSeconds < 0;
    let s = Math.abs(Math.floor(totalSeconds));

    const years = Math.floor(s / SECONDS_IN_YEAR);
    s %= SECONDS_IN_YEAR;
    const days = Math.floor(s / SECONDS_IN_DAY);
    s %= SECONDS_IN_DAY;
    const hours = Math.floor(s / SECONDS_IN_HOUR);
    s %= SECONDS_IN_HOUR;
    const minutes = Math.floor(s / SECONDS_IN_MINUTE);
    const seconds = s % SECONDS_IN_MINUTE;

    const sign = isNegative ? '-' : '';
    // Build components, filtering out zero values
    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    if (parts.length === 0) return '0s';
    return sign + parts.join(' ');
}
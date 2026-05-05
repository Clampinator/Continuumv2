/**
 * TEMPORAL TRANSLATOR: DURATION CONVERTER
 * Functions for computing and formatting time durations.
 */

import { formatDateOnly } from './coordinate-converter.js';

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
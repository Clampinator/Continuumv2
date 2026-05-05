import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * TEMPORAL TRANSLATOR: AGE CONVERTER
 * Authoritative module for translating Subjective Age (seconds)
 * to/from human-readable strings.
 */

const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

/**
 * Parses a human-readable age string into a pure integer (seconds).
 * @param {string|number} input - The raw input from the UI.
 * @returns {number} Integer seconds.
 */
export function parseSubjectiveAge(input) {
    if (input === null || input === undefined) return 0;
    
    // 1. Handle numeric input directly
    if (typeof input === 'number') return Math.floor(input);
    
    const str = String(input).trim();
    if (!str) return 0;

    // 2. Handle raw numeric strings (e.g. "1500")
    if (/^\d+$/.test(str)) return parseInt(str, 10);

    // 3. Regex-based shorthand parsing
    // Supports: 1y, 10.5y, 2d, 3h, 4m, 5s, etc.
    let totalSeconds = 0;

    // Parse Y (Years)
    const yMatch = str.match(/([\d.]+)\s*y/i);
    if (yMatch) totalSeconds += parseFloat(yMatch[1]) * SECONDS_IN_YEAR;

    // Parse D (Days)
    const dMatch = str.match(/([\d.]+)\s*d/i);
    if (dMatch) totalSeconds += parseFloat(dMatch[1]) * SECONDS_IN_DAY;

    // Parse H (Hours)
    const hMatch = str.match(/([\d.]+)\s*h/i);
    if (hMatch) totalSeconds += parseFloat(hMatch[1]) * SECONDS_IN_HOUR;

    // Parse M (Minutes)
    const mMatch = str.match(/([\d.]+)\s*m(?![a-z])/i); // Avoid matching "ms"
    if (mMatch) totalSeconds += parseFloat(mMatch[1]) * SECONDS_IN_MINUTE;

    // Parse S (Seconds)
    const sMatch = str.match(/([\d.]+)\s*s/i);
    if (sMatch) totalSeconds += parseFloat(sMatch[1]);

    // 4. Handle "03:04:05" clock format
    const clockMatch = str.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (clockMatch) {
        // If we already parsed shorthand, we only add the clock if it wasn't redundant.
        // But for TTL Purity, we assume standard UI strings might combine them: "1y 2d 03:04:05"
        // We only add if h/m/s matches weren't found to prevent double-counting?
        // Actually, let's just parse the clock and ignore h/m/s if clock is present.
        if (!hMatch && !mMatch && !sMatch) {
            totalSeconds += parseInt(clockMatch[1], 10) * SECONDS_IN_HOUR;
            totalSeconds += parseInt(clockMatch[2], 10) * SECONDS_IN_MINUTE;
            totalSeconds += parseInt(clockMatch[3], 10);
        }
    }

    return Math.floor(totalSeconds);
}

/**
 * Formats a pure integer (seconds) into the "Gold Standard" UI string.
 * Format: "Xy Yd HH:MM:SS"
 * @param {number} totalSeconds - Integer seconds.
 * @returns {string} Formatted age string.
 */
export function formatSubjectiveAge(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "0y 0d 00:00:00";
    
    const isNegative = totalSeconds < 0;
    let s = Math.abs(Math.floor(totalSeconds));

    const years = Math.floor(s / SECONDS_IN_YEAR);
    s %= SECONDS_IN_YEAR;

    const days = Math.floor(s / SECONDS_IN_DAY);
    s %= SECONDS_IN_DAY;

    const hours = Math.floor(s / SECONDS_IN_HOUR);
    s %= SECONDS_IN_HOUR;

    const mins = Math.floor(s / SECONDS_IN_MINUTE);
    const secs = s % SECONDS_IN_MINUTE;

    const pad = (n) => String(n).padStart(2, '0');
    
    const prefix = isNegative ? "-" : "";
    return `${prefix}${years}y ${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats a pure integer (seconds) into a short age string.
 * Format: "Xy Mm Dd" (years, months, remaining days).
 * Uses 30-day months consistent with org-graph convention.
 * Designed for spreadsheet readability - drops hours/minutes/seconds.
 * @param {number} totalSeconds - Integer seconds.
 * @returns {string} Formatted short age string.
 */
export function formatSubjectiveAgeShort(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return '0y 0m 0d';

    const isNegative = totalSeconds < 0;
    let s = Math.abs(Math.floor(totalSeconds));

    const years = Math.floor(s / SECONDS_IN_YEAR);
    s %= SECONDS_IN_YEAR;

    const totalDays = Math.floor(s / SECONDS_IN_DAY);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    const prefix = isNegative ? '-' : '';
    return `${prefix}${years}y ${months}m ${days}d`;
}

/**
 * Formats a duration in seconds using the same convention as subjective age.
 * Semantic alias: "duration" and "age" share the same human-readable format
 * but carry different meaning (elapsed time vs position on a lifeline).
 * @param {number} seconds - Duration in seconds.
 * @returns {string} Formatted duration string (same as formatSubjectiveAge).
 */
export function formatDuration(seconds) {
    return formatSubjectiveAge(seconds);
}

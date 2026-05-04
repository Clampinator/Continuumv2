/**
 * TEMPORAL TRANSLATOR: COORDINATE CONVERTER
 * Authoritative module for translating Objective Date/Time strings 
 * to/from pure mathematical coordinates (milliseconds).
 * 
 * ENFORCES: Location-Aware Local Chronology.
 * FORBIDDEN: UTC 'Z' appending or Player Clock referencing.
 */

/**
 * Parses a local Date/Time string into a pure integer (ms) based on location.
 * @param {string} dateString - "YYYY-MM-DD"
 * @param {string} timeString - "HH:MM:SS" (Optional, defaults to 12:00:00)
 * @param {Object} context - { timezone: string }
 * @returns {number} Integer milliseconds.
 */
export function parseObjectiveTime(dateString, timeString, context) {
    if (!dateString) return 0;
    const finalTime = timeString || "12:00:00";
    const tz = context?.timezone || 'UTC';

    try {
        // 1. Create a base date in UTC to get the components
        const isoString = `${_padYear(dateString)}T${finalTime}Z`;
        const baseDate = new Date(isoString);
        if (isNaN(baseDate.getTime())) return 0;

        if (tz === 'UTC') return baseDate.getTime();

        // 2. Resolve the timezone-specific offset for THIS specific point in time.
        // We use Intl.DateTimeFormat to see what the wall-clock would be in that TZ.
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });

        // We find the offset by comparing the TZ-localized components back to UTC
        const parts = formatter.formatToParts(baseDate);
        const partMap = {};
        parts.forEach(p => partMap[p.type] = p.value);

        // Construct a Date object as if those localized parts were UTC
        const localAsUTC = new Date(`${_padYear(partMap.year)}-${partMap.month.padStart(2, '0')}-${partMap.day.padStart(2, '0')}T${partMap.hour.padStart(2, '0')}:${partMap.minute.padStart(2, '0')}:${partMap.second.padStart(2, '0')}Z`);
        
        // The drift is the difference between the intended local time and the actual UTC time
        const drift = localAsUTC.getTime() - baseDate.getTime();
        
        // Final coordinate = Base (as UTC) - Drift
        return baseDate.getTime() - drift;
    } catch (e) {
        console.error("TTL | CoordinateConverter | Parsing failed:", e);
        return 0;
    }
}

/**
 * Formats a pure integer (ms) into localized human strings.
 * @param {number} timestamp - Integer milliseconds.
 * @param {Object} context - { timezone: string }
 * @returns {Object} { date: string, time: string }
 */
export function formatObjectiveTime(timestamp, context) {
    const ts = Number(timestamp) || 0;
    const tz = context?.timezone || 'UTC';

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(new Date(ts));
    const p = {};
    parts.forEach(part => p[part.type] = part.value);

    // Normalize Node.js "24:00:00" midnight anomaly
    let hour = p.hour;
    if (hour === '24') hour = '00';

    // Standardized ISO-like return
    return {
        date: `${_padYear(p.year)}-${p.month}-${p.day}`,
        time: `${hour}:${p.minute}:${p.second}`
    };
}

/**
 * Converts a timestamp (ms) to a { date, time } object.
 * Convenience wrapper around formatObjectiveTime for callers that need
 * both parts in one call. Defaults to UTC when no context is provided.
 * @param {number} ts - Integer milliseconds.
 * @param {Object} [context] - { timezone: string } (defaults to UTC)
 * @returns {Object} { date: string, time: string }
 */
export function timestampToDateString(ts, context) {
    return formatObjectiveTime(ts, context || { timezone: 'UTC' });
}

/**
 * Formats a timestamp (ms) to a date-only string "YYYY-MM-DD".
 * Defaults to UTC when no context is provided.
 * @param {number} ts - Integer milliseconds.
 * @param {Object} [context] - { timezone: string } (defaults to UTC)
 * @returns {string} Date string "YYYY-MM-DD", or "" for invalid input.
 */
export function formatDateOnly(ts, context) {
    if (!ts && ts !== 0) return '';
    const result = formatObjectiveTime(ts, context || { timezone: 'UTC' });
    return result.date;
}

/**
 * Formats a timestamp (ms) to a time-only string "HH:MM:SS".
 * Defaults to UTC when no context is provided.
 * @param {number} ts - Integer milliseconds.
 * @param {Object} [context] - { timezone: string } (defaults to UTC)
 * @returns {string} Time string "HH:MM:SS", or "00:00:00" for invalid input.
 */
export function formatTimeOnly(ts, context) {
    if (!ts && ts !== 0) return '00:00:00';
    const result = formatObjectiveTime(ts, context || { timezone: 'UTC' });
    return result.time;
}

/**
 * Normalizes a date input value to a clean "YYYY-MM-DD" string.
 * If already in that format, returns as-is. Otherwise parses through
 * a Date object using UTC getters to ensure the date parts match
 * the literal input string, preventing timezone drift.
 * @param {string|number} val - Raw date input (e.g. "2024-1-5", Date timestamp, etc.)
 * @returns {string} "YYYY-MM-DD" or "" for falsy input.
 */
export function normalizeDateInput(val) {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses a date+time input into epoch milliseconds, enforcing UTC interpretation.
 * Handles raw ISO strings, "YYYY-MM-DD" (defaults to 12:00:00 UTC),
 * and "YYYY-MM-DDTHH:MM:SS" formats. Appends 'Z' when no timezone is present
 * to prevent browser-local interpretation and biological age drift.
 * @param {string} dateString - "YYYY-MM-DD"
 * @param {string} [timeString] - "HH:MM:SS" (defaults to 12:00:00)
 * @returns {number} Epoch milliseconds, or 0 for invalid input.
 */
export function parseDateToObjectiveMs(dateString, timeString) {
    if (!dateString) return 0;
    const finalTime = timeString || '12:00:00';
    const isoString = `${_padYear(dateString)}T${finalTime}Z`;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 0;
    return d.getTime();
}

/**
 * Ensures years are padded to 4 digits for reliable Date parsing.
 * @private
 */
function _padYear(year) {
    const y = String(year);
    if (y.length >= 4) return y;
    return y.padStart(4, '0');
}

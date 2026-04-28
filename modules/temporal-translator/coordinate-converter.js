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
 * Ensures years are padded to 4 digits for reliable Date parsing.
 * @private
 */
function _padYear(year) {
    const y = String(year);
    if (y.length >= 4) return y;
    return y.padStart(4, '0');
}

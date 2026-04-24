/**
 * TEMPORAL KERNEL: PARSE OBJECTIVE TIMESTAMP
 * Pure physical law: Converts human fact strings into a mathematical coordinate (ms).
 * 
 * @param {string} dateString - "YYYY-MM-DD"
 * @param {string} timeString - "HH:MM:SS" (Optional, defaults to 12:00:00)
 * @param {Object} locationContext - { timezone: string } (Optional)
 * @returns {number} The objective timestamp in milliseconds.
 */
export function parseObjectiveTimestamp(dateString, timeString = "12:00:00", locationContext = {}) {
    if (!dateString) return 0;
    
    // 1. Resolve Time Fallback
    const finalTime = timeString || "12:00:00";
    
    // 2. Resolve Timezone Context
    // AUTHORITY: Location field defines the local timezone.
    const tz = locationContext.timezone || 'UTC';

    try {
        // Construct ISO-like string
        // If tz is UTC, we append Z. Otherwise we let Intl.DateTimeFormat or similar handle it.
        // For simplicity and high precision without external libraries:
        let ts;
        if (tz === 'UTC') {
            ts = new Date(`${dateString}T${finalTime}Z`).getTime();
        } else {
            // Use Intl.DateTimeFormat to resolve the timezone-specific timestamp
            // Note: Date.parse or new Date() with a timezone offset is the standard way.
            // However, browsers vary in their parsing of non-ISO strings.
            // We use a robust method: parse in UTC, then shift based on the timezone offset.
            
            const baseDate = new Date(`${dateString}T${finalTime}Z`);
            if (isNaN(baseDate.getTime())) return 0;

            // Get the offset for this specific date and timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            });

            const parts = formatter.formatToParts(baseDate);
            const partMap = {};
            parts.forEach(p => partMap[p.type] = p.value);

            // Reconstruct the date as if it were in UTC to find the drift
            const localAsUTC = new Date(`${partMap.year}-${partMap.month.padStart(2, '0')}-${partMap.day.padStart(2, '0')}T${partMap.hour.padStart(2, '0')}:${partMap.minute.padStart(2, '0')}:${partMap.second.padStart(2, '0')}Z`);
            
            const offset = localAsUTC.getTime() - baseDate.getTime();
            ts = baseDate.getTime() - offset;
        }

        return Number.isFinite(ts) ? ts : 0;
    } catch (e) {
        return 0;
    }
}


/**
 * STIME Standardized Parser.
 * Enforces UTC interpretation for all lifeline-related date strings
 * to prevent biological age drift across different client timezones.
 */
export function parseDate(input) {
    if (!input) return null;
    
    let normalized = input;
    if (typeof input === 'string') {
        // Replace spaces with 'T' for ISO compliance
        normalized = input.trim().replace(/\s+/, 'T');
        
        // If no timezone/offset is present, append 'Z' to force UTC
        if (!normalized.includes('Z') && !normalized.includes('+') && !/T.*[+-]\d{2}:?\d{2}$/.test(normalized)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
                normalized = `${normalized}T12:00:00Z`; // Default to high noon UTC
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(normalized)) {
                normalized = `${normalized}Z`;
            }
        }
    }
    
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return d;
}

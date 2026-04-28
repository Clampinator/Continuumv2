;import { formatObjectiveTime } from '../temporal-translator/coordinate-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/coordinate-converter.js instead.
 */
export function convertTimestampToDateString(ts) {
    // Note: Legacy caller didn't provide context, so we assume UTC.
    return formatObjectiveTime(ts, { timezone: 'UTC' });
}

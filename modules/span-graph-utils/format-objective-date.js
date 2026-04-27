import { formatObjectiveTime } from '../temporal-translator/coordinate-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/coordinate-converter.js instead.
 */
export function formatObjectiveDate(ts) {
    return formatObjectiveTime(ts, { timezone: 'UTC' }).date;
}

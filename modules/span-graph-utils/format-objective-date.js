import { formatObjectiveDateLines } from '../temporal-translator/coordinate-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/coordinate-converter.js instead.
 * Returns [date, time, weekday] array for tooltip/axis use.
 */
export function formatObjectiveDate(ts) {
    return formatObjectiveDateLines(ts, { timezone: 'UTC' });
}
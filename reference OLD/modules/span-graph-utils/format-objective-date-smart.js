
import { MS_IN_YEAR, MS_IN_DAY } from './constants.js';

export function formatObjectiveDateSmart(ts, range) {
    const d = new Date(ts);
    if (range > MS_IN_YEAR * 10) return [String(d.getFullYear())];
    if (range > MS_IN_DAY * 90) return [d.toLocaleString('default', { month: 'short', year: 'numeric' })];
    return [d.toISOString().split('T')[0]];
}

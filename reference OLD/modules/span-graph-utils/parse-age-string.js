
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from './constants.js';

export function parseAgeString(str) {
    if (!str) return 0;
    const regex = /(-?\d+)\s*([ymdhs])/g;
    let totalSeconds = 0;
    let match;
    while ((match = regex.exec(str.toLowerCase())) !== null) {
        const val = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'y': totalSeconds += val * SECONDS_IN_YEAR; break;
            case 'm': totalSeconds += val * (SECONDS_IN_YEAR / 12); break;
            case 'd': totalSeconds += val * SECONDS_IN_DAY; break;
            case 'h': totalSeconds += val * 3600; break;
            case 's': totalSeconds += val; break;
        }
    }
    return totalSeconds || parseInt(str) || 0;
}

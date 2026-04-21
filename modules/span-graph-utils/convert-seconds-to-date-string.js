
import { convertTimestampToDateString } from './convert-timestamp-to-date-string.js';

export function convertSecondsToDateString(seconds, dobTs) {
    const ts = dobTs + (seconds * 1000);
    return convertTimestampToDateString(ts).date;
}

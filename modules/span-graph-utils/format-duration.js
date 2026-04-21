
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from './constants.js';

export function formatDuration(totalSeconds) {
    if (isNaN(totalSeconds)) return "0s";
    const isNegative = totalSeconds < 0;
    let s = Math.abs(totalSeconds);
    const years = Math.floor(s / SECONDS_IN_YEAR);
    s %= SECONDS_IN_YEAR;
    const days = Math.floor(s / SECONDS_IN_DAY);
    s %= SECONDS_IN_DAY;
    const hours = Math.floor(s / 3600);
    s %= 3600;
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return (isNegative ? "-" : "") + parts.join(" ");
}


export function formatTime(d) {
    if (!d) return "00:00";
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return "00:00";
    return date.toISOString().split('T')[1].substring(0, 5);
}

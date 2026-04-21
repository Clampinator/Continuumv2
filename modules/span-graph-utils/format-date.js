
export function formatDate(d) {
    if (!d) return "";
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0];
}

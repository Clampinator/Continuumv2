
export function formatObjectiveDate(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ["Invalid", "Date", ""];
    const iso = d.toISOString();
    const ymd = iso.split('T')[0].replace(/-/g, '/');
    const hms = iso.split('T')[1].split('.')[0];
    const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
    return [ymd, hms, day];
}


export function convertTimestampToDateString(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return { date: "", time: "00:00:00" };
    
    // Extract both parts from ISO string (UTC) to prevent time-shifting relative to date
    const iso = d.toISOString(); // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    const date = iso.split('T')[0];
    const time = iso.split('T')[1].split('.')[0];
    
    return { date, time };
}

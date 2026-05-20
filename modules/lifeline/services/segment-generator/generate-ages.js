import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Calculates bounds for Era columns using the absolute Subjective Ages of nodes.
sortedEras - All eras from actor data.

TTL: Uses parseDateToObjectiveMs instead of new Date() to avoid browser
local timezone drift. Era duration is derived from dateFrom/dateTo via TTL,
not via new Date() which uses the browser's local clock.
*/
export function generateEras(sortedEras) {
    return sortedEras.map(era => {
        const startAge = Number(era.age) || 0;
        // TTL: Parse dates as UTC midnight. Era boundaries are date-only
        // so time zone is not critical here, but using TTL is consistent.
        const d1Ms = parseDateToObjectiveMs(era.dateFrom, '00:00:00');
        const d2Ms = era.dateTo ? parseDateToObjectiveMs(era.dateTo, '00:00:00') : NaN;
        let duration = 31536000; // 1 year fallback

        if (d1Ms && !isNaN(d2Ms)) {
            duration = Math.max(0, (d2Ms - d1Ms) / 1000);
        }

        return {
            id: era.id,
            path: era.path,
            name: era.name,
            startAgeSeconds: startAge,
            endAgeSeconds: startAge + duration
        };
    }).sort((a, b) => a.startAgeSeconds - b.startAgeSeconds);
}
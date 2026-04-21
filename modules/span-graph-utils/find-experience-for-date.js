
import { parseDate } from './parse-date.js';

export function findExperienceForDate(actor, dateObj) {
    if (!dateObj) return null;
    const targetTs = dateObj.getTime();
    const eras = actor.system.eras || {};

    for (const [eraId, era] of Object.entries(eras)) {
        if (!era.experiences) continue;
        for (const [expId, exp] of Object.entries(era.experiences)) {
            const start = parseDate(exp.dateFrom);
            const end = parseDate(exp.dateTo);
            if (start && targetTs >= start.getTime()) {
                if (!end || targetTs <= end.getTime()) {
                    return { eraId, expId, experience: exp };
                }
            }
        }
    }
    return null;
}

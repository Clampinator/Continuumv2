import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Finds all experiences overlapping a target timestamp.
TTL: Uses parseDateToObjectiveMs instead of new Date() to avoid browser
local timezone drift when computing experience date boundaries.
*/
export function findOverlappingExperiences(actor, targetTime) {
    const relevant = [];
    const allEras = actor.system.eras || {};

    Object.values(allEras).forEach(era => {
        Object.values(era.experiences || {}).forEach(exp => {
            const start = parseDateToObjectiveMs(exp.dateFrom, '00:00:00');
            let end = exp.dateTo ? parseDateToObjectiveMs(exp.dateTo, '00:00:00') : Infinity;

            if (start && start <= targetTime && targetTime <= end) {
                relevant.push({
                    eraId: era.id,
                    expId: exp.id,
                    name: exp.name,
                    eraName: era.name,
                    isOpen: end === Infinity
                });
            }
        });
    });
    return relevant;
}
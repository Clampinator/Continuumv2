/*
Finds all experiences overlapping a target timestamp.
*/
export function findOverlappingExperiences(actor, targetTime) {
    const relevant = [];
    const allEras = actor.system.eras || {};

    Object.values(allEras).forEach(era => {
        Object.values(era.experiences || {}).forEach(exp => {
            const start = new Date(exp.dateFrom + "T00:00:00").getTime();
            let end = exp.dateTo ? new Date(exp.dateTo + "T00:00:00").getTime() : Infinity;

            if (!isNaN(start) && start <= targetTime && targetTime <= end) {
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

import { MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/*
Heuristic fallback for experiences that have dates but no child events.
*/
export function applyDateFallback(expMap, actor, nodes) {
    Object.entries(actor.system.eras || {}).forEach(([eraId, eraData]) => {
        if (!eraData.experiences) return;

        Object.entries(eraData.experiences).forEach(([expId, expData]) => {
            if (!expData.name) return;

            const hasDateTo = expData.dateTo && expData.dateTo.trim() !== "";
            const existing = expMap.get(expId);

            // If it has no events AND no dates, we can't do anything
            if (!existing && !expData.dateFrom && !hasDateTo) return;

            const expEndStr = hasDateTo ? expData.dateTo : (expData.dateFrom || "");
            const expEndTs = new Date((expEndStr || "") + "T12:00:00").getTime();

            let subjectiveAgeAtExpEnd = -Infinity;
            if (!isNaN(expEndTs)) {
                const eraNodes = nodes.filter(n => n.eraId === eraId);
                if (eraNodes.length > 0) {
                    // Use the first available node in the era as a temporal anchor (1s subjective = 1000ms objective)
                    const refNode = eraNodes[0];
                    subjectiveAgeAtExpEnd = refNode.age + ((expEndTs - refNode.time) / MS_PER_SECOND);
                } else {
                    // Fallback to era start date if no nodes exist yet
                    const eraStartTs = new Date((eraData.dateFrom || "") + "T12:00:00").getTime();
                    if (!isNaN(eraStartTs)) {
                        subjectiveAgeAtExpEnd = (expEndTs - eraStartTs) / MS_PER_SECOND;
                    }
                }
            }

            // The "End Age" is the LATEST of:
            // 1. The subjective age calculated from dates
            // 2. The subjective age of the last event (if any)
            const finalAge = Math.max(subjectiveAgeAtExpEnd, existing?.age || -Infinity);

            if (finalAge !== -Infinity) {
                expMap.set(expId, {
                    age: finalAge,
                    name: expData.name,
                    isOngoing: !hasDateTo // If no end date, it's ongoing
                });
            }
        });
    });
}

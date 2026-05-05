import { MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Heuristic fallback for experiences that have dates but no child events.
Tracks both start and end subjective ages so the two-axis bonus
calculator can compute duration.
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
            const expEndTs = parseDateToObjectiveMs(expEndStr);
            const expStartTs = parseDateToObjectiveMs(expData.dateFrom || "");

            let subjectiveAgeAtExpEnd = -Infinity;
            let subjectiveAgeAtExpStart = Infinity;

            if (!isNaN(expEndTs)) {
                const eraNodes = nodes.filter(n => n.eraId === eraId);
                if (eraNodes.length > 0) {
                    // Use the first available node in the era as a temporal anchor
                    const refNode = eraNodes[0];
                    subjectiveAgeAtExpEnd = refNode.age + ((expEndTs - refNode.time) / MS_PER_SECOND);
                    if (!isNaN(expStartTs)) {
                        subjectiveAgeAtExpStart = refNode.age + ((expStartTs - refNode.time) / MS_PER_SECOND);
                    }
                } else {
                    // Fallback to era start date if no nodes exist yet
                    const eraStartTs = parseDateToObjectiveMs(eraData.dateFrom || "");
                    if (!isNaN(eraStartTs)) {
                        subjectiveAgeAtExpEnd = (expEndTs - eraStartTs) / MS_PER_SECOND;
                        if (!isNaN(expStartTs)) {
                            subjectiveAgeAtExpStart = (expStartTs - eraStartTs) / MS_PER_SECOND;
                        }
                    }
                }
            }

            // The "End Age" is the LATEST of:
            // 1. The subjective age calculated from dates
            // 2. The subjective age of the last event (if any)
            const finalEndAge = Math.max(subjectiveAgeAtExpEnd, existing?.age || -Infinity);
            const finalStartAge = Math.min(
                subjectiveAgeAtExpStart === Infinity ? (existing?.startAge || finalEndAge) : subjectiveAgeAtExpStart,
                existing?.startAge || Infinity
            );

            if (finalEndAge !== -Infinity) {
                expMap.set(expId, {
                    age: finalEndAge,
                    startAge: finalStartAge === Infinity ? finalEndAge : finalStartAge,
                    name: expData.name,
                    isOngoing: !hasDateTo
                });
            }
        });
    });
}

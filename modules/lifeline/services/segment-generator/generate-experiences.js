import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';
import { parseDate } from '../../../span-graph-utils/parse-date.js';

/**
 * ELASTIC RESONANCE FIELDS: Dynamic Experience Segment Generator.
 * REBUILT: Implements "The Forgetting" fade and authoritative state logic.
 */
export function generateExperiences(sortedEras, levelNodes, nowNode) {
    const experiences = [];
    const dobTs = levelNodes[0]?.time;
    if (!dobTs) return experiences;

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            if (!exp.name) return;

            // 1. Identify Bounds
            // Start Age is from dateFrom property
            const startAge = mapDateToSubjective(exp.dateFrom, levelNodes, dobTs);
            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            const isOngoing = !!exp.isOngoing || !isClosed;
            
            let endAge;
            if (isOngoing) {
                endAge = nowNode.age;
            } else {
                endAge = mapDateToSubjective(exp.dateTo, levelNodes, dobTs);
            }

            if (startAge === null || endAge === null) return;

            // 2. Calculate "The Forgetting" Fade
            // Logic: Fade over 15 subjective years beyond endAge.
            // Minimum opacity 10%.
            const yearsSince = Math.max(0, (nowNode.age - endAge) / 31536000);
            let opacity = 1.0;
            if (yearsSince > 0) {
                // Linear fade from 100% to 10% over 15 years
                opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9);
            }

            experiences.push({
                id: expId,
                name: exp.name,
                eraId: era.id,
                startAge,
                endAge,
                isOngoing,
                opacity
            });
        });
    });

    return experiences;
}

import { parseDate } from '../../../span-graph-utils/parse-date.js';
import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';

/**
 * ELASTIC RESONANCE FIELDS: Dynamic Experience Segment Generator.
 * REBUILT: Authoritative "Most Right" rule for total persistence.
 */
export function generateExperiences(sortedEras, levelNodes, nowNode) {
    const experiences = [];
    if (!levelNodes || levelNodes.length === 0) return experiences;

    const dobTs = levelNodes[0]?.time || levelNodes[0]?.projectedTime;

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            if (!exp.name) return;

            // 1. START BOUND: Date-Property first, then refine with nodes
            const startD = parseDate(exp.dateFrom);
            if (!startD) return;
            
            let startAge = mapDateToSubjective(exp.dateFrom, levelNodes, dobTs);
            let startTime = startD.getTime();

            const chain = levelNodes.filter(n => n.expId === expId || n.startsExpId === expId);
            if (chain.length > 0) {
                chain.sort((a, b) => (Number(a.age) || 0) - (Number(b.age) || 0));
                const firstNode = chain[0];
                // AUTHORITY: If nodes exist, the box MUST start at the earliest node's age/time
                startAge = Math.min(startAge ?? Infinity, firstNode.age);
                startTime = Math.min(startTime, firstNode.projectedTime || firstNode.time);
            }

            // 2. END BOUND: The "Most Right" Rule
            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            const isOngoing = !!exp.isOngoing || !isClosed;
            
            let endAge;
            let endTime;

            if (isOngoing) {
                endAge = nowNode.age;
                endTime = nowNode.projectedTime;
            } else {
                const endD = parseDate(exp.dateTo);
                let projectedEndAge = mapDateToSubjective(exp.dateTo, levelNodes, dobTs);
                let projectedEndTime = endD ? endD.getTime() : startTime;

                if (chain.length > 0) {
                    const lastNode = chain[chain.length - 1];
                    // THE LAW: Max(Physical Node, Projected Date)
                    endAge = Math.max(projectedEndAge || 0, lastNode.age);
                    endTime = projectedEndTime; // Date-property is authoritative for Time axis
                } else {
                    endAge = projectedEndAge || startAge;
                    endTime = projectedEndTime;
                }
            }

            if (startAge === null || endAge === null || startTime === null || endTime === null) return;

            // 3. AUTHORITY: "The Forgetting" Fade
            const yearsSince = Math.max(0, (nowNode.age - endAge) / 31536000);
            let opacity = 1.0;
            if (yearsSince > 0) {
                opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9);
            }

            experiences.push({
                id: expId,
                name: exp.name,
                eraId: era.id,
                startAge,
                endAge,
                startTime,
                endTime,
                isOngoing,
                opacity
            });
        });
    });

    return experiences;
}

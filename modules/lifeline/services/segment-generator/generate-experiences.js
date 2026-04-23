import { parseDate } from '../../../span-graph-utils/parse-date.js';
import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';

/**
 * ELASTIC RESONANCE FIELDS: Dynamic Experience Segment Generator.
 * ADI REBUILT: Uses isolated x (age) and y (ts) coordinates.
 */
export function generateExperiences(sortedEras, nodes, nowNode) {
    const experiences = [];
    if (!nodes || nodes.length === 0) return experiences;

    const dobTs = nodes[0]?.y;

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            if (!exp.name) return;

            const startD = parseDate(exp.dateFrom);
            if (!startD) return;
            
            // Derive Subjective Age (x) and Objective Time (y)
            // mapDateToSubjective needs to handle RenderNodes (x, y)
            let startX = mapDateToSubjective(exp.dateFrom, nodes, dobTs);
            let startY = startD.getTime();

            const chain = nodes.filter(n => n.expId === expId || n.record?.startsExpId === expId);
            if (chain.length > 0) {
                chain.sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0));
                const firstNode = chain[0];
                startX = Math.min(startX ?? Infinity, firstNode.x);
                startY = Math.min(startY, firstNode.y);
            }

            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            const isOngoing = !!exp.isOngoing || !isClosed;
            
            let endX;
            let endY;

            if (isOngoing) {
                endX = nowNode.x;
                endY = nowNode.y;
            } else {
                const endD = parseDate(exp.dateTo);
                let projectedEndX = mapDateToSubjective(exp.dateTo, nodes, dobTs);
                let projectedEndY = endD ? endD.getTime() : startY;

                if (chain.length > 0) {
                    const lastNode = chain[chain.length - 1];
                    endX = Math.max(projectedEndX || 0, lastNode.x);
                    endY = projectedEndY; 
                } else {
                    endX = projectedEndX || startX;
                    endY = projectedEndY;
                }
            }

            if (startX === null || endX === null || startY === null || endY === null) return;

            const yearsSince = Math.max(0, (nowNode.x - endX) / 31536000);
            let opacity = 1.0;
            if (yearsSince > 0) {
                opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9);
            }

            experiences.push({
                id: expId,
                name: exp.name,
                eraId: era.id,
                startX,
                endX,
                startY,
                endY,
                isOngoing,
                opacity
            });
        });
    });

    return experiences;
}

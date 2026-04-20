import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';
import { parseDate } from '../../../span-graph-utils/parse-date.js';

/**
 * ELASTIC RESONANCE FIELDS: Dynamic Experience Segment Generator.
 * Implementation: Authoritative End Date logic.
 * Visual boundaries hug physical nodes but respect dateFrom/dateTo properties as hard anchors.
 */
export function generateExperiences(sortedEras, levelNodes, nowNode) {
    const segments = [];

    // Safety check and Origin identification for map projection
    const dobTs = levelNodes[0]?.time;
    if (!dobTs) return segments;

    // Group authoritative nodes by their Experience ID for Hugging logic
    const nodesByExp = {};
    levelNodes.forEach(n => {
        if (n.expId) (nodesByExp[n.expId] = nodesByExp[n.expId] || []).push(n);
    });

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            const expNodes = nodesByExp[expId] || [];

            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            // Back-compat: Treat as ongoing if flag is set OR dateTo is missing
            const isOngoing = !!exp.isOngoing || !isClosed;

            // 1. BOUNDARY INITIALIZATION (Physical Nodes)
            let minA = Infinity, maxA = -Infinity, minT = Infinity, maxT = -Infinity;

            if (expNodes.length > 0) {
                expNodes.forEach(n => {
                    if (isNaN(n.age) || isNaN(n.time)) return;
                    minA = Math.min(minA, n.age); maxA = Math.max(maxA, n.age);
                    minT = Math.min(minT, n.time); maxT = Math.max(maxT, n.time);
                });
            }

            // 2. AUTHORITATIVE PROJECTION (Property-based Anchors)
            // Even if an experience has no nodes, it should draw from its dateFrom
            const projectedStartAge = mapDateToSubjective(exp.dateFrom, levelNodes, dobTs);
            const startD = parseDate(exp.dateFrom);
            
            if (projectedStartAge !== null) {
                // Ensure the block starts at least at the defined dateFrom
                minA = Math.min(minA, projectedStartAge);
                if (startD) minT = Math.min(minT, startD.getTime());
            }

            if (isOngoing) {
                // ELASTICITY: Anchor right edge to Subjective Now
                maxA = Math.max(maxA, nowNode.age);
                maxT = Math.max(maxT, nowNode.time);
            } else {
                // FIXED BOUNDARY: Project end date from data
                const projectedEndAge = mapDateToSubjective(exp.dateTo, levelNodes, dobTs);
                const endD = parseDate(exp.dateTo);
                
                // THE "MOST RIGHT" RULE: max(projected_dateTo_age, latest_physical_node_age)
                // This ensures physical history 'wins' over premature closure flags.
                if (projectedEndAge !== null) {
                    maxA = Math.max(maxA, projectedEndAge);
                    if (endD) maxT = Math.max(maxT, endD.getTime());
                }
            }

            // 3. FALLBACK: Empty Experiences (Chapter with no nodes yet)
            if (minA === Infinity) {
                minA = (projectedStartAge !== null) ? projectedStartAge : nowNode.age;
                minT = startD ? startD.getTime() : nowNode.time;
                
                const projectedEndAge = mapDateToSubjective(exp.dateTo, levelNodes, dobTs);
                const endD = parseDate(exp.dateTo);

                maxA = isOngoing ? nowNode.age : (projectedEndAge !== null ? projectedEndAge : minA);
                maxT = isOngoing ? nowNode.time : (endD ? endD.getTime() : minT);
            }

            // Final sanity check for NaN
            if (isNaN(minA) || isNaN(maxA)) return;

            segments.push({
                id: expId,
                expId: expId,
                eraId: era.id,
                name: exp.name || "Experience",
                startAge: minA,
                startTime: minT,
                endAge: maxA,
                endTime: maxT,
                isClosed: isClosed,
                isOngoing: isOngoing
            });
        });
    });

    return segments;
}

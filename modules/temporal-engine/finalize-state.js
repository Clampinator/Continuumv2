import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';

/**
 * ENGINE UNIT: FINALIZE STATE
 * Assembles the final temporal state object, including experience collation.
 * ENFORCES: Consistent output schema.
 */
export function finalizeState(segments, nodes, subjectiveNow, totalDisplacement = 0, eras = [], actor = null) {
    const nowNode = nodes.find(n => n.id === 'now');
    let experiences = [];

    if (actor) {
        const erasWithIds = Object.entries(actor.system.eras || {}).map(([id, era]) => ({ ...era, id: id }))
            .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

        // LEVELING AGE: The character's subjective age WITHOUT span displacement.
        // This is the age that matters for game mechanics like The Forgetting
        // (opacity decay) and experience bonus (distance from NOW). Spanning
        // moves the character in objective time but does NOT age them - a
        // character who spans from age 10 to year 2050 is still subjectively
        // age 10, not age 40.
        let levelingAge = null;
        if (nowNode) {
            if (nowNode.isSpanOrigin && segments.length > 1) {
                // NOW is mid-span: the leveling age is the departure age,
                // which is the exit point of the second-to-last segment
                // (the span origin that the NOW node is spanning from).
                const lastSegment = segments[segments.length - 1];
                levelingAge = lastSegment.startX;
            } else {
                // NOT spanning: NOW node's age IS the leveling age
                levelingAge = nowNode.x !== undefined ? nowNode.x : (nowNode.age !== undefined ? nowNode.age : null);
            }
        }

        experiences = generateExperiences(erasWithIds, nodes, nowNode, levelingAge);
    }

    return {
        segments,
        nodes,
        nowNode,
        experiences,
        eras,
        spanPool: { consumed: totalDisplacement, total: 0 }
    };
}

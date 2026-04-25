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
        experiences = generateExperiences(erasWithIds, nodes, nowNode);
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

import { calculateSegments } from './calculate-segments.js';
import { applyCollisionLaws } from '../temporal-kernel/apply-collision-laws.js';
import { extractEras } from './extract-eras.js';
import { projectNodes } from './project-nodes.js';
import { anchorSegments } from './anchor-segments.js';
import { finalizeState } from './finalize-state.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Orchestrates the conversion of character history into physical render nodes.
 * ENFORCES: Atomization Law (Delegates to single-purpose units).
 * ENFORCES: Singular Identity (No overlapping nodes).
 */
export function getTemporalState(history, subjectiveNow = 0, originTime = 0, actor = null) {
    // 1. DATA PREPARATION (ADI Enforcement)
    const eras = extractEras(actor);
    const segments = calculateSegments(history, originTime);

    if (segments.length === 0) {
        const birthNode = { id: 'birth', x: 0, y: originTime, record: { title: "Birth" }, isBirth: true };
        return finalizeState(
            [{ startX: 0, startY: originTime, nodes: [], arrivalNode: birthNode }],
            [birthNode], subjectiveNow, 0, eras, actor
        );
    }

    // 2. PHYSICAL PROJECTION
    const { nodes: nodesWithProjection, totalDisplacement } = projectNodes(history, segments);

    // 3. SEGMENT ANCHORING (Virtual Anchors)
    const projectedSegments = anchorSegments(segments, nodesWithProjection);

    // 4. COLLATING NODES (The Singular Identity Rule)
    const virtualAnchors = projectedSegments.map(seg => seg.arrivalNode);
    const allRenderNodes = applyCollisionLaws(nodesWithProjection, virtualAnchors);

    // 5. FINALIZATION
    return finalizeState(projectedSegments, allRenderNodes, subjectiveNow, totalDisplacement, eras, actor);
}

import { calculateSegments } from './calculate-segments.js';
import { applyCollisionLaws } from '../temporal-kernel/apply-collision-laws.js';
import { extractEras } from './extract-eras.js';
import { projectNodes } from './project-nodes.js';
import { anchorSegments } from './anchor-segments.js';
import { finalizeState } from './finalize-state.js';
import { establishHistoryPhysics } from '../temporal-kernel/establish-history-physics.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Orchestrates the conversion of character history into physical render nodes.
 * ENFORCES: Atomization Law (Delegates to single-purpose units).
 * ENFORCES: Singular Identity (No overlapping nodes).
 * ENFORCES: Umbilical Cord (Establishes physics from raw facts).
 */
export function getTemporalState(historyFacts, subjectiveNow = 0, originTime = 0, actor = null) {
    // 1. DATA PREPARATION (ADI Enforcement)
    const eras = extractEras(actor);
    
    // 2. PHYSICS ESTABLISHMENT (The Umbilical Cord)
    // AUTHORITY: The Engine establishes x, y, and arrivalY from raw database facts.
    const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

    const segments = calculateSegments(physicalNodes, originTime);

    if (segments.length === 0) {
        const birthNode = { id: 'birth', x: 0, y: originTime, record: { title: "Birth" }, isBirth: true };
        return finalizeState(
            [{ startX: 0, startY: originTime, nodes: [], arrivalNode: birthNode }],
            [birthNode], subjectiveNow, 0, eras, actor
        );
    }

    // 3. PHYSICAL PROJECTION
    // AUTHORITY: Ensures every node sits perfectly on its segment rail.
    const { nodes: nodesWithProjection, totalDisplacement } = projectNodes(physicalNodes, segments);

    // 4. SEGMENT ANCHORING (Virtual Anchors)
    const projectedSegments = anchorSegments(segments, nodesWithProjection);

    // 5. COLLATING NODES (The Singular Identity Rule)
    const virtualAnchors = projectedSegments.map(seg => seg.arrivalNode);
    const allRenderNodes = applyCollisionLaws(nodesWithProjection, virtualAnchors);

    // 6. FINALIZATION
    return finalizeState(projectedSegments, allRenderNodes, subjectiveNow, totalDisplacement, eras, actor);
}

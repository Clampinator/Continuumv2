import { calculateSegments } from './calculate-segments.js';
import { applyCollisionLaws } from '../temporal-kernel/apply-collision-laws.js';
import { extractEras } from './extract-eras.js';
import { projectNodes } from './project-nodes.js';
import { anchorSegments } from './anchor-segments.js';
import { finalizeState } from './finalize-state.js';
import { establishHistoryPhysics } from '../temporal-kernel/establish-history-physics.js';
import { recoverMissingAges } from './recover-missing-ages.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Orchestrates the conversion of character history into physical render nodes.
 * ENFORCES: Atomization Law (Delegates to single-purpose units).
 * ENFORCES: Singular Identity (No overlapping nodes).
 * ENFORCES: Umbilical Cord (Establishes physics from raw facts).
 *
 * REPLACES: The legacy lifeline-engine pipeline
 * (modules/lifeline/services/lifeline-engine/). That pipeline walks
 * events, accumulates offset, and projects ages - the same physics
 * this function orchestrates via establishHistoryPhysics. The Kernel
 * coordinate resolution is now in
 * modules/temporal-kernel/resolve-event-coordinates.js (H8).
 */
export function getTemporalState(historyFacts, subjectiveNow = null, originTime = 0, actor = null, isSpanIntent = false) {
    // 1. DATA PREPARATION (ADI Enforcement)
    const eras = extractEras(actor);
    
    // 1.5 AGE RECOVERY
    // Legacy data may have null eventAge. Recover via two-pass rail-offset
    // projection before the Kernel establishes physics. This ensures every
    // fact entering establishHistoryPhysics has a numeric eventAge.
    const recoveredFacts = recoverMissingAges(historyFacts, originTime);

    // 2. PHYSICS ESTABLISHMENT (The Umbilical Cord)
    // AUTHORITY: The Engine establishes x, y, and arrivalY from raw database facts.
    const physicalNodes = establishHistoryPhysics(recoveredFacts, originTime, subjectiveNow, actor, isSpanIntent);

    const segments = calculateSegments(physicalNodes, originTime);

    if (segments.length === 0) {
        const birthNode = { 
            id: 'birth', x: 0, y: originTime, 
            record: { 
                eventTitle: "Birth",
                eventLocation: actor?.system?.personal?.birthLocation || ""
            }, 
            isBirth: true 
        };
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

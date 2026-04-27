import { projectSubjectiveAge } from './project-subjective-age.js';
import { calculateSpanDisplacement } from './calculate-span-displacement.js';

/**
 * TEMPORAL KERNEL: SOLVE HISTORY PHYSICS
 * Orchestrator for the physical walk through a character's journey.
 * ENFORCES: Atomization Law (Delegates math to single-purpose files).
 * ENFORCES: Birth Node Authority (Age 0 = originTime).
 */
export function solveHistoryPhysics(history, originTime) {
    const shifts = {};
    
    // 1. Prepare history for the walk.
    // AUTHORITY: We EXCLUDE 'now' as it is a result, not a source of physics.
    // AUTHORITY: We INCLUDE 'isBirth' because it is the physical origin anchor.
    const sorted = [...history].filter(n => !n.isNow && !n.isVirtual)
                               .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    if (sorted.length === 0) return shifts;

    // 2. The Physical Anchor
    let objectiveOffset = Number(originTime) || 0;

    // 3. The Compensation Wave
    for (const node of sorted) {
        if (node.isBirth) {
            // Handshake: Birth establishes the FIRST offset
            objectiveOffset = Number(node.y);
            continue;
        }

        const ev = node.record || node;
        // AUTHORITY: Prefer raw timestamp from record if available.
        const fromTs = Number(ev.ts || node.y);
        const savedAge = Number(ev.eventAge || node.x);
        
        // DELEGATE: Age Projection
        const calculatedAge = projectSubjectiveAge(fromTs, objectiveOffset);

        // AUTHORITY: Only apply shift if drift is significant (> 100ms)
        if (Math.abs(calculatedAge - savedAge) > 0.1) {
            shifts[node.id] = calculatedAge;
        }

        // Arrival Physics (The "Offset" shift)
        if (ev.eventIsSpan) {
            // AUTHORITY: Prefer raw arrivalTs
            const arrivalTs = Number(ev.arrivalTs || node.arrivalY || fromTs); 
            
            // DELEGATE: Span Physics
            const displacement = calculateSpanDisplacement(fromTs, arrivalTs);
            
            // Shift the world clock for the next segment
            const ageAtJump = shifts[node.id] !== undefined ? shifts[node.id] : savedAge;
            objectiveOffset = arrivalTs - (ageAtJump * 1000);
        }
    }

    return shifts;
}

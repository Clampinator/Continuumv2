import { getActorHistory } from './get-actor-history.js';
import { establishHistoryPhysics } from '../temporal-kernel/establish-history-physics.js';
import { parseDate, normalizeDateInput } from '../span-graph-utils/provide-span-graph-utils.js';

/**
 * STATE: GET LORE CONTEXT
 * Extracts the current lore status for a character to use in validation.
 */
export function getLoreContext(actor) {
    const spanRank = Number(actor.system.spanning?.span) || 0;
    
    // AUTHORITY: Gather pure facts
    const facts = getActorHistory(actor).filter(n => n.id !== 'now' && !n.isVirtual && !n.isBirth);
    
    // 2. PHYSICS ESTABLISHMENT (The Umbilical Cord)
    // We need physics to calculate displacement and relative positions.
    const dobStr = actor.system.personal?.dob || "";
    const dobDate = parseDate(normalizeDateInput(dobStr) + "T12:00:00");
    const originTime = dobDate ? dobDate.getTime() : 0;

    const physicalNodes = establishHistoryPhysics(facts, originTime);
    
    // The last REAL narrative event defines the "Breath" state.
    const lastEvent = physicalNodes.length > 0 ? physicalNodes[physicalNodes.length - 1] : null;

    // Displacement Pool Calculation
    let currentPool = 0;
    for (let i = physicalNodes.length - 1; i >= 0; i--) {
        const node = physicalNodes[i];
        if (node.record.eventIsRest || node.eventIsRest) break;
        if (node.record.eventIsSpan || node.isSpanOrigin) {
            const displacement = Math.abs(node.arrivalY - node.y);
            currentPool += displacement;
        }
    }

    return {
        spanRank,
        currentPool,
        lastEvent
    };
}

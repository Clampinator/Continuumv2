import { getActorHistory } from './get-actor-history.js';
import { establishHistoryPhysics } from '../temporal-kernel/establish-history-physics.js';
import { calculateDisplacementPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-displacement-pool.js';
import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { parseDate } from '../span-graph-utils/provide-span-graph-utils.js';

/**
 * STATE: GET LORE CONTEXT
 * Extracts the current lore status for a character to use in validation.
 *
 * DELEGATE: Displacement pool calculation lives in
 * temporal-kernel/calculate-displacement-pool.js.
 * This function only extracts actor data and establishes physics.
 */
export function getLoreContext(actor) {
    const spanRank = Number(actor.system.spanning?.span) || 0;

    // AUTHORITY: Gather pure facts
    const facts = getActorHistory(actor).filter(n => n.id !== 'now' && !n.isVirtual && !n.isBirth);

    // 2. PHYSICS ESTABLISHMENT (The Umbilical Cord)
    const dobStr = actor.system.personal?.dob || '';
    const dobDate = parseDate(normalizeDateInput(dobStr) + 'T12:00:00');
    const originTime = dobDate ? dobDate.getTime() : 0;

    const physicalNodes = establishHistoryPhysics(facts, originTime);

    // The last REAL narrative event defines the "Breath" state.
    const lastEvent = physicalNodes.length > 0 ? physicalNodes[physicalNodes.length - 1] : null;

    // DELEGATE: Displacement pool calculation is pure physics math
    const currentPool = calculateDisplacementPool(physicalNodes);

    return {
        spanRank,
        currentPool,
        lastEvent
    };
}
import { getActorHistory } from './get-actor-history.js';

/**
 * STATE: GET LORE CONTEXT
 * Extracts the current lore status for a character to use in validation.
 */
export function getLoreContext(actor) {
    const spanRank = Number(actor.system.spanning?.span) || 0;
    
    // AUTHORITY: Only look at REAL history records.
    // We must filter out:
    // 1. The 'now' node (it's a dynamic pointer).
    // 2. Virtual nodes (like span destinations/semicircles).
    // 3. Birth nodes.
    const history = getActorHistory(actor).filter(n => 
        n.id !== 'now' && 
        !n.isVirtual && 
        !n.isBirth
    );
    
    // The last REAL narrative event defines the "Breath" state.
    const lastEvent = history.length > 0 ? history[history.length - 1] : null;

    // Displacement Pool Calculation
    let currentPool = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        const node = history[i];
        if (node.record.isRest) break;
        if (node.record.isSpan) {
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

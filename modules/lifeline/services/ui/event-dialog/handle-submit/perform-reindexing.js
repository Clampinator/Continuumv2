import { reindexLifelineNodes } from '/systems/continuum-v2/modules/state/reindex-lifeline-nodes.js';

/**
 * Reindexes the lifeline to determine the authoritative Age and Sort sequence.
 * @param {Actor} actor
 * @param {string} nodeId
 * @param {number} finalAge
 * @returns {object} { authoritativeAge, authoritativeSort, reindexUpdates }
 */
export function performReindexing(actor, nodeId, finalAge) {
    const reindexUpdates = reindexLifelineNodes(actor, nodeId, -1, { age: finalAge });
    
    const authoritativeAge = reindexUpdates.targetAge;
    const authoritativeSort = reindexUpdates.targetSortValue;
    
    delete reindexUpdates.targetAge;
    delete reindexUpdates.targetSortValue;

    return { authoritativeAge, authoritativeSort, reindexUpdates };
}

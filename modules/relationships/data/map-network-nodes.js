/**
 * Maps raw system network data into a list of node objects.
 * @param {Actor} actor 
 * @returns {Array}
 */
export function mapNetworkNodes(actor) {
    const rawNodes = Object.values(actor.system.network || {});
    const rootId = actor.id;
    
    return rawNodes
        .filter(n => n.id !== rootId)
        .map(n => ({
            ...n,
            // Normalise: old nodes stored a single group string; new nodes use groups[]
            groups: Array.isArray(n.groups) ? n.groups : [],
            hasFavor: !!(n.favor && n.favor.trim() !== "")
        }));
}

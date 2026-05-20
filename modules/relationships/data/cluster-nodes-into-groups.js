/**
 * Builds group objects from user-defined networkGroups and each node's groups[] array.
 * A node can belong to multiple groups, enabling Venn diagram overlap.
 * @param {Array} nodes
 * @param {object} networkGroups - actor.system.networkGroups keyed by group id
 * @returns {Array}
 */
export function clusterNodesIntoGroups(nodes, networkGroups = {}) {
    return Object.values(networkGroups)
        .map(group => ({
            id: group.id,
            name: group.name,
            color: group.color,
            members: nodes.filter(n => Array.isArray(n.groups) && n.groups.includes(group.id))
        }))
        .filter(g => g.members.length > 0);
}

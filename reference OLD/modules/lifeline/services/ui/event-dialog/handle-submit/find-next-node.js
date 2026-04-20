/**
 * Finds the next chronological node in the timeline.
 * @param {number} age
 * @param {object[]} nodes
 * @param {string} excludeId
 * @returns {object|null}
 */
export function findNextNode(age, nodes, excludeId) {
    if (!nodes || !nodes.length) return null;
    return nodes
        .filter(n => n.age > age && n.eventId !== excludeId)
        .sort((a, b) => a.age - b.age)[0] || null;
}

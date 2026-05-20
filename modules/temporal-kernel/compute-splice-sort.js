/**
 * TEMPORAL KERNEL: FIND SPLICE NEIGHBORS
 * Pure math: Given a target age and a set of physical nodes,
 * finds the events immediately before and after the target age.
 *
 * @param {number} targetAge - The subjective age to find neighbors for (seconds).
 * @param {Array} nodes - Physical nodes with { x, sort } properties.
 *   Must NOT contain virtual, birth, or now nodes (caller filters those).
 * @returns {Object} { beforeNode, afterNode } or nulls.
 */
export function findSpliceNeighbors(targetAge, nodes) {
  if (!nodes || nodes.length === 0) return { beforeNode: null, afterNode: null };

  const sorted = [...nodes].sort((a, b) => {
    const ax = Number(a.x || 0);
    const bx = Number(b.x || 0);
    if (ax !== bx) return ax - bx;
    return (Number(a.sort) || 0) - (Number(b.sort) || 0);
  });

  let beforeNode = null;
  let afterNode = null;

  for (const node of sorted) {
    const nodeAge = Number(node.x || 0);
    if (nodeAge <= targetAge) {
      beforeNode = node;
    } else {
      afterNode = afterNode || node;
    }
  }

  return { beforeNode, afterNode };
}

/**
 * TEMPORAL KERNEL: COMPUTE SPLICE SORT
 * Pure math: Computes an insertion sort value that places a new node
 * between two neighbors in narrative sequence.
 *
 * @param {number|null} beforeSort - Sort value of the preceding node.
 * @param {number|null} afterSort - Sort value of the following node.
 * @param {number} defaultStep - Sort spacing increment (default 1000).
 * @returns {number} The insertion sort value.
 */
export function computeSpliceSort(beforeSort, afterSort, defaultStep = 1000) {
  const b = beforeSort !== null ? Number(beforeSort) : null;
  const a = afterSort !== null ? Number(afterSort) : null;

  if (b !== null && a !== null) {
    return (b + a) / 2;
  }
  if (a !== null) {
    return a / 2;
  }
  if (b !== null) {
    return b + defaultStep;
  }
  return defaultStep;
}
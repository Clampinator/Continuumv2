/**
 * TEMPORAL KERNEL: CALCULATE DISPLACEMENT POOL
 * Pure math: Walks backward through physical nodes from the present,
 * summing the absolute displacement of each span event until hitting a rest.
 *
 * The displacement pool is the total objective time consumed by spans
 * since the last rest event. This is the basis for span-rank capacity checks.
 *
 * @param {Array} physicalNodes - Array of physics nodes with { y, arrivalY, isSpanOrigin, record }.
 *   Must be in narrative order (oldest first). Walked backward from the end.
 * @returns {number} Total displacement in milliseconds.
 */
export function calculateDisplacementPool(physicalNodes) {
  if (!physicalNodes || physicalNodes.length === 0) return 0;

  let currentPool = 0;
  for (let i = physicalNodes.length - 1; i >= 0; i--) {
    const node = physicalNodes[i];
    const record = node.record || {};
    if (record.eventIsRest || node.eventIsRest) break;
    if (record.eventIsSpan || node.isSpanOrigin) {
      const arrivalY = Number(node.arrivalY) || 0;
      const departureY = Number(node.y) || 0;
      const displacement = Math.abs(arrivalY - departureY);
      currentPool += displacement;
    }
  }

  return currentPool;
}
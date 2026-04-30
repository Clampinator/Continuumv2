/**
 * TEMPORAL KERNEL: APPLY INSERTION SHIFT
 * Pure math: Given a displacement from an interactive span insertion,
 * produces a shifted copy of the history array for live projection
 * during drag. This is a READ-ONLY projection - no database writes.
 *
 * All events after the insertion sort position have their Y
 * (objective time) shifted by the displacement amount. Events at or
 * before the insertion point are left untouched.
 *
 * @param {Array} history - Flat history array (physics nodes with x, y).
 * @param {number} insertionAge - Subjective age of the insertion point (seconds).
 * @param {number} displacement - Objective time shift to apply (ms).
 * @returns {Array} New array with shifted Y values for affected nodes.
 */
export function applyInsertionShift(history, insertionAge, displacement) {
  if (displacement === 0 || !history || history.length === 0) return history;

  const sorted = [...history].sort((a, b) => {
    const ax = Number(a.x || 0);
    const bx = Number(b.x || 0);
    if (ax !== bx) return ax - bx;
    return (Number(a.sort) || 0) - (Number(b.sort) || 0);
  });

  // Find the insertion index: first event with age > insertionAge
  // All events from this index forward receive the shift.
  const shiftStartIndex = sorted.findIndex(
    node => Number(node.x || 0) > insertionAge + 0.001
  );

  if (shiftStartIndex === -1) return history;

  return sorted.map((node, index) => {
    if (index >= shiftStartIndex) {
      return {
        ...node,
        y: Number(node.y || 0) + displacement,
        arrivalY: node.arrivalY != null
          ? Number(node.arrivalY) + displacement
          : undefined
      };
    }
    return node;
  });
}
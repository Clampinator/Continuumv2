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
  if (displacement === 0 || !history || history.length === 0) {
    // DEBUG: Early return with zero displacement or empty history
    console.warn('[INSERT-SHIFT] SKIP', JSON.stringify({
      displacement, historyLength: history?.length || 0,
      insertionAge
    }));
    return history;
  }

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

  if (shiftStartIndex === -1) {
    // DEBUG: No nodes found after insertion age
    console.warn('[INSERT-SHIFT] NO-NODES-AFTER', JSON.stringify({
      insertionAge, displacement,
      historyLength: history.length,
      sampleAges: sorted.slice(0, 5).map(n => Number(n.x || 0)),
      lastAge: sorted.length > 0 ? Number(sorted[sorted.length - 1].x || 0) : null
    }));
    return history;
  }

  // DEBUG: Shift applied
  const shiftedNodes = sorted.slice(shiftStartIndex, shiftStartIndex + 3).map(n => ({
    id: n.id, x: Number(n.x || 0), yBefore: Number(n.y || 0), yAfter: Number(n.y || 0) + displacement
  }));
  console.warn('[INSERT-SHIFT] APPLIED', JSON.stringify({
    insertionAge, displacement, shiftStartIndex,
    totalNodes: sorted.length, shiftedFrom: shiftStartIndex,
    sampleShifted: shiftedNodes
  }));

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
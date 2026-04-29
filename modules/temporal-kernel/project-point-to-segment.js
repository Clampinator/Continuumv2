/**
 * TEMPORAL KERNEL: PROJECT POINT TO SEGMENT
 * Pure math: Projects a point onto a line segment and returns the
 * nearest point on the segment, its distance, and the interpolation
 * factor t (0 = start, 1 = end).
 *
 * This is the canonical implementation - all other copies should be
 * replaced with calls to this function.
 *
 * @param {number} px - Point X coordinate.
 * @param {number} py - Point Y coordinate.
 * @param {number} x1 - Segment start X.
 * @param {number} y1 - Segment start Y.
 * @param {number} x2 - Segment end X.
 * @param {number} y2 - Segment end Y.
 * @returns {Object} { x, y, dist, t } where (x,y) is the nearest
 *   point on the segment, dist is the Euclidean distance, and t is
 *   the interpolation factor clamped to [0, 1].
 */
export function projectPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    return {
      x: x1,
      y: y1,
      dist: Math.hypot(px - x1, py - y1),
      t: 0
    };
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const x = x1 + t * dx;
  const y = y1 + t * dy;

  return {
    x,
    y,
    dist: Math.hypot(px - x, py - y),
    t
  };
}
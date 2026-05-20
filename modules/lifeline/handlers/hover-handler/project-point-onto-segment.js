import { projectPointToSegment } from '/systems/continuum-v2/modules/temporal-kernel/project-point-to-segment.js';

/**
 * Re-export of the canonical kernel projection function.
 * Projects a point (px, py) onto a line segment (x1, y1) -> (x2, y2).
 * @returns {object} { x, y, dist, t }
 */
export { projectPointToSegment as projectPointOntoSegment };
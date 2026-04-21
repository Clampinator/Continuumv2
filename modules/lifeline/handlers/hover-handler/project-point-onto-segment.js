/**
 * Projects a point (px, py) onto a line segment (x1, y1) -> (x2, y2).
 * Returns the nearest point and its distance.
 * @returns {object} { x, y, dist, t }
 */
export function projectPointOntoSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    
    if (l2 === 0) {
        return { x: x1, y: y1, dist: Math.hypot(px - x1, py - y1), t: 0 };
    }
    
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return {
        x: projX,
        y: projY,
        dist: Math.hypot(px - projX, py - projY),
        t: t
    };
}

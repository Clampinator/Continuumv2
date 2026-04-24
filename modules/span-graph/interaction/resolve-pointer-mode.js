/**
 * INTERACTION: RESOLVE POINTER MODE
 * Implements "Axis Dominance" to distinguish between Leveling and Spanning.
 * 
 * @param {Object} start - { x, y } screen coordinates of pointer down.
 * @param {Object} current - { x, y } current screen coordinates.
 * @param {number} threshold - Minimum pixels before mode locks (default 10).
 * @returns {string|null} 'level', 'span', or null if under threshold.
 */
export function resolvePointerMode(start, current, threshold = 10) {
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    const dist = Math.hypot(dx, dy);

    if (dist < threshold) return null;

    // Axis Dominance Law: 
    // If vertical movement is > 1.5x horizontal, it's a Span.
    if (dy > dx * 1.5) {
        return 'span';
    }

    return 'level';
}

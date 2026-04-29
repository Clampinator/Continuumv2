/**
 * TEMPORAL KERNEL: RESOLVE POINTER MODE
 * Implements "Axis Dominance" to distinguish between Leveling and Spanning.
 * When an insertion context exists (rail click for span insertion),
 * always returns 'insert-span' regardless of drag direction.
 *
 * This is the canonical location. The copy in span-graph/interaction/ re-exports
 * from here for backward compatibility.
 *
 * @param {Object} start - { x, y } screen coordinates of pointer down.
 * @param {Object} current - { x, y } current screen coordinates.
 * @param {number} threshold - Minimum pixels before mode locks (default 10).
 * @param {Object|null} insertionContext - If present, forces 'insert-span' mode.
 * @returns {string|null} 'level', 'span', 'insert-span', or null if under threshold.
 */
export function resolvePointerMode(start, current, threshold = 10, insertionContext = null) {
    if (insertionContext) return 'insert-span';

    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    const dist = Math.hypot(dx, dy);

    if (dist < threshold) return null;

    // MINIMUM VERTICAL DISTANCE: Require at least 30px of vertical movement
    // before considering span mode. Prevents accidental vertical triggers
    // from hand tremor during horizontal drags.
    const MIN_SPAN_VERTICAL = 30;

    // Axis Dominance Law:
    // If vertical movement clearly exceeds horizontal (ratio > 2.0),
    // AND exceeds the minimum vertical distance, it's a Span.
    if (dy >= MIN_SPAN_VERTICAL && dy > dx * 2.0) {
        return 'span';
    }

    return 'level';
}
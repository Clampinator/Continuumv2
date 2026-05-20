/**
 * Identifies the intended drag direction based on mouse delta.
 * Limits to Vertical (Span) or 30-degree Diagonal (Level).
 * @param {number} dx - Screen delta X
 * @param {number} dy - Screen delta Y
 * @returns {string|null}
 */
export function getDragMode(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // 1. NO LEFTWARD MOVEMENT
    if (dx < -2) return null;

    // 2. VERTICAL SPAN (Pure up or down)
    // Threshold: angle steeper than 60 degrees (absY > 1.73 * absX)
    if (absY > absX * 1.73) {
        return 'span';
    }

    // 3. DIAGONAL LEVEL (Up-Right at ~30 degrees)
    // Angle between 15 and 45 degrees
    if (dx > 2 && dy < 0) {
        const slope = Math.abs(dy) / dx;
        if (slope > 0.2 && slope < 1.2) {
            return 'level';
        }
    }

    return null;
}

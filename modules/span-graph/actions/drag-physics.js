import { MS_PER_SECOND } from '../../temporal-engine/constants.js';

/**
 * Identifies the intended drag direction based on pointer delta.
 * 
 * @param {number} dx - Pixel delta X.
 * @param {number} dy - Pixel delta Y.
 * @returns {string|null} 'level', 'span', or null.
 */
export function getDragMode(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // 1. NO LEFTWARD MOVEMENT (Age cannot decrease)
    if (dx < -2) return null;

    // 2. VERTICAL SPAN (Pure up or down)
    // Threshold: steeper than ~60 degrees
    if (absY > absX * 1.73) {
        return 'span';
    }

    // 3. DIAGONAL LEVEL (Up-Right at exactly 1:1 math ratio)
    // Threshold: committed horizontal move with upward-right vector
    if (dx > 5) {
        return 'level';
    }

    return null;
}

/**
 * Enforces the physical constraints of the Continuum.
 * 
 * @param {Object} currentWorld - Raw world coordinates from cursor.
 * @param {Object} startWorld - Coordinates at the start of drag.
 * @param {string} mode - 'level' or 'span'.
 * @returns {Object} Constrained world coordinates.
 */
export function constrainMovement(currentWorld, startWorld, mode) {
    if (mode === 'span') {
        // Fix Age, allow Time to shift
        return {
            age: startWorld.age,
            time: currentWorld.time
        };
    }

    if (mode === 'level') {
        // Enforce 1:1 Age-to-Time ratio (Diagonal Authority)
        const dAge = Math.max(0, currentWorld.age - startWorld.age);
        return {
            age: startWorld.age + dAge,
            time: startWorld.time + (dAge * MS_PER_SECOND)
        };
    }

    return { ...startWorld };
}

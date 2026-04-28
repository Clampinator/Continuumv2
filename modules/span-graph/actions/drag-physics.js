/**
 * AUTHORITATIVE TEMPORAL PHYSICS
 * This module is the sole source of truth for node placement.
 */
import { TARGET_RATIO } from '../../temporal-engine/constants.js';

/**
 * Determines the interaction mode based on the initial drag vector.
 * Favors Leveling for rightward intent.
 */
export function getDragMode(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // AUTHORITY: If vertical movement is greater than horizontal, it is ALWAYS a Span.
    // This prevents right-handed upward arcs (positive dx) from being falsely caught
    // by the leveling cone.
    if (absY > absX) {
        return 'span';
    }

    // If horizontal movement is dominant and rightward, it's a Level.
    if (dx > 0) {
        return 'level';
    }

    // Default to span for backward horizontal (illegal leveling) or perfectly ambiguous.
    return 'span';
}

/**
 * Constrains a world coordinate point based on the active drag mode.
 * LAW: Age is Subjective, Time is Objective.
 */
export function constrainMovement(currentWorld, startWorld, mode) {
    if (!startWorld) return currentWorld;

    if (mode === 'level') {
        // LOCK TO 30-DEGREE DIAGONAL (Up and Right)
        // Physics: 1 second of Age = 1000ms of Time.
        const ageDelta = Math.max(0, currentWorld.eventAge - startWorld.eventAge);
        const timeDelta = ageDelta * 1000; 
        
        return {
            eventAge: startWorld.eventAge + ageDelta,
            eventTime: startWorld.eventTime + timeDelta
        };
    }

    if (mode === 'span') {
        // AUTHORITY: PERFECT VERTICAL LOCK. 
        // Subjective Age remains absolutely identical to the departure point.
        return {
            eventAge: startWorld.eventAge, 
            eventTime: currentWorld.eventTime
        };
    }

    return currentWorld;
}

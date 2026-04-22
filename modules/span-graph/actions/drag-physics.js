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

    // 1. Rightward movement is almost always a LEVEL.
    if (dx > 2 && absX > (absY * 0.5)) {
        return 'level';
    }

    // 2. Strong vertical movement is a SPAN.
    if (absY > absX) {
        return 'span';
    }

    // 3. Fallback to Level for ambiguous rightward
    return dx > 0 ? 'level' : 'span';
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
        const ageDelta = Math.max(0, currentWorld.age - startWorld.age);
        const timeDelta = ageDelta * 1000; 
        
        return {
            age: startWorld.age + ageDelta,
            time: startWorld.time + timeDelta
        };
    }

    if (mode === 'span') {
        // AUTHORITY: PERFECT VERTICAL LOCK. 
        // Subjective Age remains absolutely identical to the departure point.
        return {
            age: startWorld.age, 
            time: currentWorld.time
        };
    }

    return currentWorld;
}

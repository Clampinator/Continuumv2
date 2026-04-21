/**
 * THE DIAGONAL AUTHORITY: Physical Constraint Engine.
 * Enforces the physical constant: 1 second subjective (Age) = 1000ms objective (Time).
 * 
 * @param {object} currentWorld - Raw world coordinates from pointer.
 * @param {object} startWorld - World coordinates at start of drag.
 * @param {string} mode - 'level' or 'span'
 * @returns {object} Constrained Spacetime coordinate.
 */
export function constrainMovement(currentWorld, startWorld, mode) {
    if (mode === 'span') {
        // PURE VERTICAL: Fix Age (X), allow Time (Y) to change freely.
        return {
            age: startWorld.age,
            time: currentWorld.time
        };
    }

    if (mode === 'level') {
        // 30-DEGREE DIAGONAL: 1s Subjective = 1000ms Objective.
        // ABSOLUTE STRICTURE: The angle cannot change. Time is a pure function of Age.
        const dAge = Math.max(0, currentWorld.age - startWorld.age);
        
        return {
            age: startWorld.age + dAge,
            time: startWorld.time + (dAge * 1000)
        };
    }

    // Default: Static Lock
    return { ...startWorld };
}

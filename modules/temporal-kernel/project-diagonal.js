/**
 * TEMPORAL KERNEL: PROJECT DIAGONAL
 * The fundamental physical law of the Continuum: 1s Subjective = 1000ms Objective.
 * 
 * @param {number} x - The Subjective Age (Physics X) to project.
 * @param {Object} anchor - The origin point { x, y }.
 * @param {number} anchor.x - Subjective Age (s).
 * @param {number} anchor.y - Objective Timestamp (ms).
 * @returns {number} The projected Objective Timestamp (ms).
 */
export function projectDiagonal(x, anchor) {
    const startX = Number(anchor.x) || 0;
    const startY = Number(anchor.y) || 0;
    const currentX = Number(x) || 0;

    const xDelta = currentX - startX;
    const yDelta = xDelta * 1000; // 1s = 1000ms
    
    const finalY = startY + yDelta;

    return Number.isFinite(finalY) ? finalY : startY;
}

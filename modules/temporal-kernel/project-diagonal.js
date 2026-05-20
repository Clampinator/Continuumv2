/**
 * TEMPORAL KERNEL: PROJECT DIAGONAL
 * The fundamental physical law of the Continuum: 1s Subjective = 1000ms Objective.
 * Given a target subjective age and an anchor point, projects the corresponding
 * objective timestamp along the 30-degree diagonal.
 *
 * @param {number} x - The Subjective Age (Physics X) to project.
 * @param {Object} anchor - The origin point { x, y }.
 * @param {number} anchor.x - Subjective Age (s).
 * @param {number} anchor.y - Objective Timestamp (ms).
 * @returns {number} The projected Objective Timestamp (ms).
 */
import { MS_PER_SECOND } from '../temporal-engine/constants.js';

export function projectDiagonal(x, anchor) {
    const startX = Number(anchor.x) || 0;
    const startY = Number(anchor.y) || 0;
    const currentX = Number(x) || 0;

    const xDelta = currentX - startX;
    const yDelta = xDelta * MS_PER_SECOND;

    const finalY = startY + yDelta;

    return Number.isFinite(finalY) ? finalY : startY;
}

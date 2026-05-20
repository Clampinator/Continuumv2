import { MS_PER_SECOND } from './constants.js';

/**
 * Resolves the Physics Y (Timestamp) for a given Physics X (Age) within a segment.
 * Follows the "Diagonal Authority" 1:1 Age-to-Time rule.
 * 
 * @param {number} x - The Subjective Age (Physics X) in seconds.
 * @param {Object} segment - The segment context.
 * @param {number} segment.startX - The origin age of the segment.
 * @param {number} segment.startY - The origin time of the segment in ms.
 * @returns {number} The calculated Physics Y (Timestamp) in milliseconds.
 */
export function resolveCoordinates(x, segment) {
  const startX = Number(segment.startX) || 0;
  const startY = Number(segment.startY) || 0;
  const currentX = Number(x) || 0;

  const xDelta = currentX - startX;
  const yDelta = xDelta * MS_PER_SECOND;
  
  const finalY = startY + yDelta;

  return Number.isFinite(finalY) ? finalY : startY;
}

import { MS_PER_SECOND } from './constants.js';

/**
 * Resolves the Objective Time for a given Subjective Age within a segment.
 * Follows the "Diagonal Authority" 1:1 Age-to-Time rule.
 * 
 * @param {number} age - The Subjective Age in seconds.
 * @param {Object} segment - The segment context.
 * @param {number} segment.startAge - The origin age of the segment.
 * @param {number} segment.startTime - The origin time of the segment in ms.
 * @returns {number} The calculated Objective Time in milliseconds.
 */
export function resolveCoordinates(age, segment) {
  const startAge = Number(segment.startAge) || 0;
  const startTime = Number(segment.startTime) || 0;
  const currentAge = Number(age) || 0;

  const ageDelta = currentAge - startAge;
  const timeDelta = ageDelta * MS_PER_SECOND;
  
  const finalTime = startTime + timeDelta;

  return Number.isFinite(finalTime) ? finalTime : startTime;
}

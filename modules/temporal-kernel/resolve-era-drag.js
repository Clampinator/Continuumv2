/*
resolve-era-drag.js
KERNEL: Validates an era drag gesture and computes the resulting
era boundaries.

Given the actor's eras, the start age (where the drag began),
and the current age (where the drag ended), determines:
- Whether the drag is valid (duration > 1 day)
- The start/end age in seconds
- Whether this is the first era (starts at age 0)

PURE: No side effects, no Foundry API calls.
*/

import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';

const SECONDS_IN_DAY = 86400;

/**
 * @param {Object} eras - Raw era object from actor.system.eras
 * @param {number} startAgeSeconds - Subjective age in seconds where drag started
 * @param {number} currentAgeSeconds - Subjective age in seconds where drag ended
 * @returns {{ isValid: boolean, durationSeconds: number, startAgeSeconds: number,
 *             isFirstEra: boolean, eraName: string }}
 */
export function resolveEraDrag(eras, startAgeSeconds, currentAgeSeconds) {
  const boundaries = computeEraBoundaries(eras);
  const isFirstEra = boundaries.length === 0;

  // First era always starts at age 0
  const effectiveStart = isFirstEra ? 0 : startAgeSeconds;
  const durationSeconds = Math.max(0, currentAgeSeconds - effectiveStart);

  // Determine name for the new era based on its position
  const eraName = isFirstEra
    ? 'Childhood'
    : `Era ${boundaries.length + 1}`;

  return {
    isValid: durationSeconds > SECONDS_IN_DAY,
    durationSeconds,
    startAgeSeconds: effectiveStart,
    isFirstEra,
    eraName
  };
}
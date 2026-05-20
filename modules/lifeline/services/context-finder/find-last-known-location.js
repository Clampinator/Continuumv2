/**
 * Finds the most recent location in the character's history relative to a starting point.
 * Delegates to the Kernel's resolveDefaultLocation for the canonical reverse-walk.
 *
 * This wrapper exists for backward compatibility - pointer-machine.js and other
 * consumers import this path. New code should import resolveDefaultLocation directly.
 *
 * @param {Array} history - Sorted array of fact objects from getActorHistory().
 * @param {number} startAge - The subjective age (seconds from birth) to look back from.
 * @returns {string} The name of the last known location or "Unknown".
 */
import { resolveDefaultLocation } from '../../../temporal-kernel/resolve-default-location.js';

export function findLastKnownLocation(history, startAge) {
    const result = resolveDefaultLocation(history, startAge);
    return result.location;
}
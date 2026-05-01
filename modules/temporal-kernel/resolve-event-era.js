import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';

/*
resolve-event-era.js
KERNEL: RESOLVE EVENT ERA
Determines which Era a given subjective age falls into.

AUTHORITY: Era boundaries are computed by computeEraBoundaries(),
the single source of truth. This function wraps the boundary
computation with a simple lookup.

@param {Object} eras - Raw era object from actor.system.eras (keyed by ID)
@param {number} targetAge - Subjective age in seconds to classify
@returns {string} The era ID, or 'default' if no era matches
*/
export function resolveEventEra(eras, targetAge) {
  if (!eras || typeof eras !== 'object') return 'default';

  const boundaries = computeEraBoundaries(eras);

  if (boundaries.length === 0) return 'default';

  for (const era of boundaries) {
    if (targetAge <= era.endAge) {
      return era.id;
    }
  }

  // Fallback: event is beyond all defined eras
  return boundaries[boundaries.length - 1].id;
}
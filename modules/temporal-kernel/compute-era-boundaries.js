/*
compute-era-boundaries.js
KERNEL: Computes sorted era boundary data from raw actor eras.

Takes the raw `actor.system.eras` object and returns an array of
{ id, name, startAge, endAge, computedDuration } sorted by startAge.
This is the single source of truth for "which era does age X fall into"
queries.

RULES:
1. Era start comes from era.age (subjective seconds from birth).
2. Era end with explicit dateTo: the user-set boundary is authoritative.
   Events/experiences beyond it belong to a different era, not this one.
3. Era end without dateTo: extends to cover all events, then fills from
   the next era's startAge to avoid gaps. This is auto-era behavior.
4. Downward propagation: after computing initial boundaries, any era whose
   startAge collides with its predecessor's endAge is shifted forward.
   Earlier eras own their time range.

TTL COMPLIANCE: Uses parseDateToObjectiveMs instead of raw Date constructor.

@returns {Array<{id: string, name: string, startAge: number, endAge: number, computedDuration: number}>}
*/

import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

export function computeEraBoundaries(eras) {
  if (!eras || typeof eras !== 'object') return [];

  const result = Object.entries(eras)
    .map(([id, era]) => {
      const name = era.name || 'Untitled';
      // AUTHORITY: Era start comes from era.age (subjective seconds from birth)
      const startAge = Number(era.age) || 0;

      // Era end: derive from dateTo via TTL, otherwise estimate from next era
      let endAge = Infinity;
      let noDateTo = true;

      if (era.dateTo) {
        const endMs = parseDateToObjectiveMs(era.dateTo);
        const startMs = era.dateFrom
          ? parseDateToObjectiveMs(era.dateFrom)
          : NaN;
        if (!isNaN(endMs) && !isNaN(startMs)) {
          endAge = startAge + ((endMs - startMs) / 1000);
          noDateTo = false;
        }
      }

      // Compute furthest event/experience age within this era.
      // Only extends the boundary for auto-eras (no dateTo). Eras with an
      // explicit dateTo use that as the hard boundary - events beyond it
      // belong to a different era and will be migrated by the caller.
      const maxEventAge = _furthestEventAge(era, startAge);

      if (noDateTo) {
        // Auto-era: boundary extends to cover events or falls through to next era
        endAge = maxEventAge > startAge ? maxEventAge : Infinity;
      }
      // else: user-set dateTo is authoritative, even if events exceed it

      const computedDuration = endAge === Infinity ? 0 : endAge - startAge;

      return { id, name, startAge, endAge, computedDuration, _noDateTo: noDateTo };
    })
    .sort((a, b) => a.startAge - b.startAge);

  // Fill in endAge from next era's startAge. This only applies to eras
  // that have no explicit dateTo. Eras with a user-set dateTo may have
  // intentional gaps before the next era - those gaps are preserved.
  for (let i = 0; i < result.length; i++) {
    if (result[i]._noDateTo) {
      if (result[i].endAge === Infinity && i + 1 < result.length) {
        // No dateTo and no events: fill entirely from next era
        result[i].endAge = result[i + 1].startAge;
      } else if (i + 1 < result.length && result[i].endAge < result[i + 1].startAge) {
        // Events didn't reach next era: extend to avoid gap
        result[i].endAge = result[i + 1].startAge;
      }
      result[i].computedDuration = result[i].endAge === Infinity
        ? 0
        : result[i].endAge - result[i].startAge;
    }
    // Remove internal flag before returning
    delete result[i]._noDateTo;
  }

  // Downward propagation: if an era's startAge is earlier than the previous
  // era's endAge (overlap), clamp it to the previous endAge. This enforces
  // sequential authority - earlier eras own their time range and later eras
  // must start where the previous one ended.
  for (let i = 1; i < result.length; i++) {
    const prevEnd = result[i - 1].endAge;
    if (result[i].startAge < prevEnd) {
      // The previous era extends past this era's stated start.
      // Propagate: shift this era's startAge forward to avoid overlap.
      const shift = prevEnd - result[i].startAge;
      result[i].startAge = prevEnd;
      if (result[i].endAge !== Infinity) {
        result[i].endAge += shift;
      }
      result[i].computedDuration = result[i].endAge === Infinity
        ? 0
        : result[i].endAge - result[i].startAge;
    }
  }

  return result;
}

/**
 * Find the furthest subjective age among all events and experiences in an era.
 * Used to ensure the era boundary extends to cover all its constituent content.
 * For events with span, the arrival age (where the character ends up) is used.
 *
 * @param {Object} era - An era data object from actor.system.eras
 * @param {number} startAge - The era's startAge in seconds
 * @returns {number} The furthest event/experience age, or startAge if no events
 */
function _furthestEventAge(era, startAge) {
  let maxAge = startAge;

  const checkEvent = (evt) => {
    // For level events, eventAge is the authoritative subjective age.
    // For span events, eventAge is the departure age. The character
    // arrives at eventAge + span displacement, but for era boundary
    // purposes we use eventAge (departure) since that's when the event
    // starts within the era.
    // Events with null/unknown age are skipped - they have no valid
    // position and must not anchor era boundaries at age-0.
    if (evt.eventAge === null || evt.eventAge === undefined) return;
    const age = Number(evt.eventAge);
    if (age > maxAge) maxAge = age;
  };

  // Era-level events
  Object.values(era.events || {}).forEach(checkEvent);

  // Experience-level events
  Object.values(era.experiences || {}).forEach(exp => {
    Object.values(exp.events || {}).forEach(checkEvent);
  });

  return maxAge;
}
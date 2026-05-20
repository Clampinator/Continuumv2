/**
 * KERNEL: COMPUTE ERA GAPS
 *
 * After era boundary changes, detects gaps between the last era's
 * endAge and any subsequent era or timeline events. Returns an
 * array of "follow-on era" descriptors that should be created
 * to ensure no events are left without an era bucket.
 *
 * A gap exists when:
 *   - An era has an explicit dateTo AND there are events beyond it
 *   - The next era doesn't start until after those events
 *   - Or it's the last era and there are events/NOW beyond its dateTo
 *
 * @param {Object} erasData - Raw actor.system.eras data
 * @param {Array} boundaries - Pre-computed era boundaries from computeEraBoundaries
 * @param {number} nowAge - Current subjective age in seconds (subjectiveNow)
 * @param {string} dobStr - Date of birth string for deriving dateFrom
 * @returns {Array<{age: number, dateFrom: string, name: string}>} Follow-on era descriptors
 */

import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';
import { resolveEventEra } from '/systems/continuum-v2/modules/temporal-kernel/resolve-event-era.js';
import { parseDateToObjectiveMs, formatDateOnly } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

export function computeEraGaps(erasData, boundaries, nowAge, dobStr) {
  if (!boundaries || boundaries.length === 0) return [];

  const gaps = [];
  const lastBoundary = boundaries[boundaries.length - 1];

  // Check if there's a gap after the last era ends.
  // Only relevant if the last era has an explicit dateTo (not Infinity).
  if (lastBoundary.endAge !== Infinity && nowAge > lastBoundary.endAge) {
    // There are events/NOW beyond the last era - create a follow-on era
    const gapStartAge = lastBoundary.endAge;
    const gapDateFrom = _deriveDateFrom(gapStartAge, dobStr);
    gaps.push({
      age: gapStartAge,
      dateFrom: gapDateFrom,
      name: 'New Era'
    });
  }

  // Check gaps between consecutive eras.
  // An era with explicit dateTo may end before the next era starts.
  // If there are events in the gap, create a follow-on era.
  for (let i = 0; i < boundaries.length - 1; i++) {
    const current = boundaries[i];
    const next = boundaries[i + 1];
    if (current.endAge < next.startAge) {
      // There's a gap between these eras. Check if there are events in it.
      const hasOrphans = _hasEventsInGap(erasData, current.endAge, next.startAge);
      if (hasOrphans) {
        const gapDateFrom = _deriveDateFrom(current.endAge, dobStr);
        gaps.push({
          age: current.endAge,
          dateFrom: gapDateFrom,
          name: 'New Era'
        });
      }
    }
  }

  return gaps;
}

/**
 * Derive a dateFrom string from a subjective age and DOB.
 * @param {number} ageSeconds - Subjective age in seconds
 * @param {string} dobStr - Date of birth string (YYYY-MM-DD)
 * @returns {string} Date string or empty string
 */
function _deriveDateFrom(ageSeconds, dobStr) {
  if (!dobStr) return '';
  const dobMs = parseDateToObjectiveMs(dobStr);
  if (isNaN(dobMs)) return '';
  const dateFromMs = dobMs + (ageSeconds * 1000);
  return formatDateOnly(dateFromMs);
}

/**
 * Check if any events across all eras have ages that fall within a gap range.
 * @param {Object} erasData - Raw eras data
 * @param {number} gapStart - Start of gap in seconds
 * @param {number} gapEnd - End of gap in seconds
 * @returns {boolean}
 */
function _hasEventsInGap(erasData, gapStart, gapEnd) {
  for (const era of Object.values(erasData || {})) {
    for (const evt of Object.values(era.events || {})) {
      const age = Number(evt.eventAge) || 0;
      if (age > gapStart && age < gapEnd) return true;
    }
    for (const exp of Object.values(era.experiences || {})) {
      for (const evt of Object.values(exp.events || {})) {
        const age = Number(evt.eventAge) || 0;
        if (age > gapStart && age < gapEnd) return true;
      }
    }
  }
  return false;
}
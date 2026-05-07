import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { resolveDefaultLocation } from '/systems/continuum-v2/modules/temporal-kernel/resolve-default-location.js';

/**
 * TEMPORAL KERNEL: RESOLVE LOCATION INHERITANCE
 * Pure function. Determines whether each location field on a submitted
 * event was inherited (auto-filled from the most recent upstream location)
 * or manually set by the user.
 *
 * Rules:
 *   NEW EVENT: location matches defaultLoc -> true (inherited)
 *              location differs from defaultLoc -> false (manual)
 *   EDIT EVENT: location unchanged from old record -> preserve old flag
 *               location changed from old record -> false (manual)
 *
 * The UI is a dumb pipe - it does not determine inheritance. This kernel
 * function is the sole authority.
 *
 * @param {Array} history - Sorted fact array from getActorHistory().
 * @param {Object} submitted - The submitted location values.
 *   { eventLocation, eventSpanFromLocation, eventSpanToLocation,
 *     eventAge (may be formatted string or number) }
 * @param {Object|null} oldRecord - The existing DB record for edit mode, null for new.
 * @param {Object} actor - Foundry Actor for birthLocation fallback.
 * @returns {{ locationInherited: boolean, spanFromLocationInherited: boolean,
 *             spanToLocationInherited: boolean, defaultLocation: string }}
 */
export function resolveLocationInheritance(history, submitted, oldRecord, actor) {
  // Parse eventAge: the form may submit a formatted string like
  // "30y 242d 05:24:02" or a raw number. parseSubjectiveAge handles both.
  const numericAge = parseSubjectiveAge(submitted.eventAge);
  const defaultLoc = resolveDefaultLocation(history, numericAge, actor);

  const eventLocation = submitted.eventLocation || '';
  const eventSpanFromLocation = submitted.eventSpanFromLocation || '';
  const eventSpanToLocation = submitted.eventSpanToLocation || '';

  // NEW EVENT: auto-filled value matches default -> inherited.
  // Empty string also counts as inherited (no override).
  // EDIT EVENT: value unchanged from old record -> preserve old flag.
  // Value changed -> manual (false).
  const locationInherited = oldRecord
    ? (eventLocation === (oldRecord.eventLocation || '')
      ? (oldRecord.locationInherited !== false)
      : false)
    : (eventLocation === defaultLoc.location || eventLocation === '');

  const spanFromLocationInherited = oldRecord
    ? (eventSpanFromLocation === (oldRecord.eventSpanFromLocation || oldRecord.eventLocation || '')
      ? (oldRecord.spanFromLocationInherited !== false)
      : false)
    : (eventSpanFromLocation === defaultLoc.location || eventSpanFromLocation === '');

  const spanToLocationInherited = oldRecord
    ? (eventSpanToLocation === (oldRecord.eventSpanToLocation || '')
      ? (oldRecord.spanToLocationInherited !== false)
      : false)
    : (eventSpanToLocation === defaultLoc.location || eventSpanToLocation === '');

  return {
    locationInherited,
    spanFromLocationInherited,
    spanToLocationInherited,
    defaultLocation: defaultLoc.location
  };
}
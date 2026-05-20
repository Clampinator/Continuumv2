import { projectSubjectiveAge, computeOffsetFromArrival } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/**
 * KERNEL: NORMALIZE LIFELINE AGES (Dynamic Compensation Wave)
 * Pure function: walks pre-extracted entries in sort order, accumulates
 * objectiveOffset across spans, and derives each event's subjective age
 * from its objective physics coordinate (TS).
 *
 * Accepts pre-resolved data to make it testable without Foundry.
 * The caller is responsible for extracting entries from actor.system.eras
 * and resolving dobTs and timestamp strings.
 *
 * MIGRATED FROM modules/lifeline/services/chronology/normalize-lifeline-ages.js
 * as part of H7 (Trinity violation: Kernel logic misplaced in UI layer).
 *
 * @param {number} dobTs - Birth timestamp in milliseconds.
 * @param {Array} entries - Pre-extracted and pre-sorted entries.
 *   Each entry: { eventId, event, isPending, sort, createdAt, path }.
 *   event.ts and event.arrivalTs must be pre-parsed to numbers (ms)
 *   by the caller. If null/undefined, the entry is skipped.
 * @returns {{ updates: object, finalOffset: number }}
 */
export function normalizeLifelineAges(dobTs, entries) {
  if (!dobTs) return { updates: {}, finalOffset: 0 };
  if (!entries || entries.length === 0) return { updates: {}, finalOffset: dobTs };

  const updates = {};
  let objectiveOffset = dobTs;

  // Compensation Walk (The Physics Pass)
  for (const entry of entries) {
    const ev = entry.event;
    if (ev.eventIsSpan) {
      // AUTHORITY: Use pre-parsed timestamps. Caller must resolve strings to ms.
      const fromTs = (ev.ts !== undefined && ev.ts !== null) ? Number(ev.ts) : null;
      const toTs = (ev.arrivalTs !== undefined && ev.arrivalTs !== null) ? Number(ev.arrivalTs) : null;

      if (fromTs !== null && toTs !== null) {
        const newAge = projectSubjectiveAge(fromTs, objectiveOffset);

        // Only commit if change is significant (> 0.1s to prevent jitter)
        if (!entry.isPending && Math.abs(newAge - (Number(ev.eventAge) || 0)) > 0.1) {
          updates[`${entry.path}.age`] = newAge;
        }
        objectiveOffset = computeOffsetFromArrival(toTs, newAge);
      }
    } else if (!ev.isBirth) {
      const ts = (ev.ts !== undefined && ev.ts !== null) ? Number(ev.ts) : null;

      if (ts !== null) {
        const newAge = projectSubjectiveAge(ts, objectiveOffset);
        if (!entry.isPending && Math.abs(newAge - (Number(ev.eventAge) || 0)) > 0.1) {
          updates[`${entry.path}.age`] = newAge;
        }
      }
    }
  }

  return { updates, finalOffset: objectiveOffset };
}
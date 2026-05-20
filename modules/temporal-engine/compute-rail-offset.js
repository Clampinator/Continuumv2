import { collectSpansFromActor } from '/systems/continuum-v2/modules/state/collect-spans-from-actor.js';
import { computeRailOffset as computeRailOffsetPhysics } from '/systems/continuum-v2/modules/temporal-kernel/compute-rail-offset.js';
import { resolveOrigin } from '/systems/continuum-v2/modules/lifeline/services/reference-resolver/resolve-origin.js';

/**
 * ENGINE: COMPUTE RAIL OFFSET
 * Orchestrates State extraction and Kernel physics to compute the rail base
 * timestamp (objective time origin) at a given subjective age.
 *
 * This is the Engine-layer bridge: it reads actor data (State), collects spans,
 * resolves DOB, then delegates the pure math to the Kernel.
 *
 * MIGRATED FROM modules/lifeline/services/chronology/compute-rail-offset.js
 * as part of H7 (Trinity violation: State/Engine logic misplaced in UI layer).
 *
 * @param {object} actor - Foundry actor instance.
 * @param {number} targetAge - Subjective age in seconds.
 * @returns {number} Rail base timestamp in milliseconds.
 */
export function computeRailOffset(actor, targetAge) {
  const dobTs = resolveOrigin(actor);
  if (!dobTs) return 0;

  const spans = collectSpansFromActor(actor, targetAge);

  return computeRailOffsetPhysics(dobTs, targetAge, spans);
}
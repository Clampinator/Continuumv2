/**
 * TEMPORAL KERNEL: COMPUTE RAIL OFFSET
 * Pure math: Computes the accumulated objective-time base (rail origin)
 * at a given subjective age by summing span displacements.
 *
 * Each span event where age <= targetAge contributes
 * (arrivalTs - departureTs) to the objective displacement.
 *
 * @param {number} dobTs - Birth timestamp in milliseconds.
 * @param {number} targetAge - Subjective age in seconds.
 * @param {Array} spans - Array of { age, fromTs, toTs } objects,
 *   sorted by age ascending. Only spans with age <= targetAge are summed.
 * @returns {number} The rail base timestamp in milliseconds.
 *   - No spans: returns dobTs
 *   - After N spans: returns dobTs + sum(toTs - fromTs for each)
 */
export function computeRailOffset(dobTs, targetAge, spans) {
  const origin = Number(dobTs) || 0;
  if (!Number.isFinite(targetAge) || !spans || spans.length === 0) {
    return origin;
  }

  let railBase = origin;
  for (const span of spans) {
    const age = Number(span.age);
    const fromTs = Number(span.fromTs);
    const toTs = Number(span.toTs);

    if (!Number.isFinite(age) || age > targetAge) continue;
    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs)) continue;
    if (toTs === fromTs) continue;

    railBase += (toTs - fromTs);
  }

  return railBase;
}
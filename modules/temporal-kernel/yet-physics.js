/**
 * KERNEL: YET PHYSICS
 * Pure functions computing Yet node positions and violation state.
 *
 * Stalking rules (determine where a Yet renders relative to NOW):
 *   age-locked only  -> x fixed at yet.age, y tracks nowTime  (stalks NOW vertically)
 *   date-locked only -> y fixed at yet.time, x tracks nowAge   (stalks NOW horizontally)
 *   both locked      -> fully static at (yet.age, yet.time)
 *   neither locked   -> drifts ahead of NOW with Brownian motion (CSS-animated)
 *
 * Violation rules (when the NOW node overtakes a locked axis):
 *   age-locked or both -> violated when nowAge > yet.age
 *   date-locked only   -> violated when nowTime > yetTime
 *   neither locked      -> never violated (nebulous - can always revisist a date later)
 */

const SECONDS_PER_YEAR = 31536000;

// World-space offset for drifting Yets so they appear ahead of NOW.
// This is in subjective-age units (seconds). The renderer converts
// this to screen pixels via viewport zoom, so the offset scales.
const DRIFT_AHEAD_SECONDS = 2 * SECONDS_PER_YEAR;

/**
 * Resolves all active (non-done) Yet entries into render data.
 *
 * @param {Object} theYet - actor.system.theYet (keyed by id)
 * @param {number} nowAge - NOW node's subjective age in seconds
 * @param {number} nowTime - NOW node's objective time in epoch ms
 * @returns {Array<YetRenderData>} Array of resolved Yet nodes for the manifest
 */
export function resolveYetNodes(theYet, nowAge, nowTime) {
  if (!theYet) return [];

  const yetNodes = [];

  for (const [id, yet] of Object.entries(theYet)) {
    if (yet.done) continue;

    const hasAge = yet.age != null && yet.age !== '' && Number(yet.age) > 0;
    const hasDate = !!(yet.date && String(yet.date).trim());
    const frag = yet.frag || 0;
    const isFragSuppressed = !!yet.isFragSuppressed;

    // Stalking: each axis uses its locked value if present, else tracks NOW.
    // Drifting Yets (neither locked) sit ahead of NOW by a fixed world offset.
    const worldAge = hasAge
      ? Number(yet.age) * SECONDS_PER_YEAR
      : (hasDate ? nowAge : nowAge + DRIFT_AHEAD_SECONDS);

    const worldTime = hasDate
      ? _parseYetTime(yet.date, yet.time)
      : nowTime;

    const isViolated = isYetViolated(
      { hasAge, hasDate, age: hasAge ? Number(yet.age) * SECONDS_PER_YEAR : null, time: hasDate ? worldTime : null },
      nowAge, nowTime
    );

    yetNodes.push({
      id,
      description: yet.description || '',
      hasAge,
      hasDate,
      worldAge,
      worldTime,
      isViolated: isViolated && !isFragSuppressed,
      frag,
      isFragSuppressed,
      isDragging: false
    });
  }

  return yetNodes;
}

/**
 * Determines whether a Yet is violated by the current NOW position.
 *
 * A Yet is violated when the character has aged past the Yet's locked age,
 * or when the character's objective time has passed the Yet's locked date.
 * "Neither locked" Yets are NEVER violated because they represent purely
 * nebulous future events that can always be revisited later.
 *
 * @param {Object} yet - { hasAge, hasDate, age (seconds), time (epoch ms) }
 * @param {number} nowAge - NOW's subjective age in seconds
 * @param {number} nowTime - NOW's objective time in epoch ms
 * @returns {boolean}
 */
export function isYetViolated(yet, nowAge, nowTime) {
  if (yet.hasAge) {
    // Age-locked or both-locked: violated when NOW is older than the Yet age
    return nowAge > yet.age;
  }
  if (yet.hasDate) {
    // Date-locked only: violated when NOW time exceeds the Yet time
    return nowTime > yet.time;
  }
  // Neither locked: never violated (nebulous)
  return false;
}

/**
 * Parses a Yet's date + time into an epoch ms timestamp.
 * Falls back to date-only parsing if time is missing.
 *
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} [time] - Time string (HH:MM:SS)
 * @returns {number} Epoch ms
 */
function _parseYetTime(date, time) {
  const timeStr = time || '12:00:00';
  const dt = new Date(`${date}T${timeStr}`);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}
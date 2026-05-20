/**
 * TEMPORAL KERNEL: INTERPOLATE WORLD COORDINATES
 * Pure math: Given two world-coordinate points and an interpolation
 * factor t (0 = start, 1 = end), returns the interpolated point.
 *
 * This is the canonical kernel function for t-factor world-coordinate
 * interpolation. All UI/Projector code should delegate to this rather
 * than computing inline.
 *
 * @param {Object} start - { age, time } start point in world coordinates.
 * @param {Object} end - { age, time } end point in world coordinates.
 * @param {number} t - Interpolation factor, clamped to [0, 1].
 * @returns {Object} { age, time } interpolated world coordinates.
 */
export function interpolateWorldCoordinates(start, end, t) {
  const startAge = Number(start.age) || 0;
  const startTime = Number(start.time) || 0;
  const endAge = Number(end.age) || 0;
  const endTime = Number(end.time) || 0;
  const clampedT = Math.max(0, Math.min(1, Number(t) || 0));

  return {
    age: startAge + clampedT * (endAge - startAge),
    time: startTime + clampedT * (endTime - startTime)
  };
}
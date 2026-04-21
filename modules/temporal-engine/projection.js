/**
 * Coordinate utilities for projecting between World Space and Screen Space.
 * Provides strict mathematical guards for stable rendering.
 */

/**
 * Projects world coordinates (Age, Time) to screen space (X, Y).
 * 
 * @param {number} age - Subjective Age in seconds.
 * @param {number} time - Objective Time in milliseconds.
 * @param {Object} viewState - Current viewport state.
 * @returns {Object} {x, y} screen coordinates.
 */
export function worldToScreen(age, time, viewState) {
  const zoom = Number(viewState.zoom) || 1;
  const panX = Number(viewState.panX) || 0;
  const panY = Number(viewState.panY) || 0;

  const x = (Number(age) || 0) * zoom + panX;
  const y = (Number(time) || 0) * zoom + panY;

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

/**
 * Projects screen coordinates (X, Y) back to world space (Age, Time).
 * 
 * @param {number} x - Screen X coordinate.
 * @param {number} y - Screen Y coordinate.
 * @param {Object} viewState - Current viewport state.
 * @returns {Object} {age, time} world coordinates.
 */
export function screenToWorld(x, y, viewState) {
  const zoom = Number(viewState.zoom) || 1;
  const panX = Number(viewState.panX) || 0;
  const panY = Number(viewState.panY) || 0;

  // Prevent division by zero
  const safeZoom = zoom === 0 ? 1 : zoom;

  const age = (Number(x) - panX) / safeZoom;
  const time = (Number(y) - panY) / safeZoom;

  return {
    age: Number.isFinite(age) ? age : 0,
    time: Number.isFinite(time) ? time : 0
  };
}

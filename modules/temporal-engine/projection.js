/**
 * Coordinate utilities for projecting between World Space and Screen Space.
 */

/**
 * Projects world coordinates (Age, Time) to screen space (X, Y).
 * 
 * @param {number} age - Subjective Age in seconds.
 * @param {number} time - Objective Time in milliseconds.
 * @param {Object} viewState - Current viewport state.
 * @param {number} viewState.x - Horizontal pan offset.
 * @param {number} viewState.y - Vertical pan offset.
 * @param {number} viewState.scaleX - Horizontal scale factor.
 * @param {number} viewState.scaleY - Vertical scale factor.
 * @returns {Object} {x, y} screen coordinates.
 */
export function worldToScreen(age, time, viewState) {
  return {
    x: viewState.x + age * viewState.scaleX,
    y: viewState.y + time * viewState.scaleY
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
  return {
    age: (x - viewState.x) / viewState.scaleX,
    time: (y - viewState.y) / viewState.scaleY
  };
}

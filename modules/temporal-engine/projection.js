import { TARGET_RATIO, SECONDS_IN_DECADE, SECONDS_IN_CENTURY, SECONDS_IN_MILLENNIUM } from './constants.js';

/**
 * Coordinate utilities for projecting between World Space and Screen Space.
 * USES 1:1 DIAGONAL AUTHORITY: Sweeps Up (smaller Y) and Right (larger X).
 */

/**
 * Projects world coordinates (Age s, Time ms) to screen space (X, Y).
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

  // X moves right with Age
  const x = (Number(age) || 0) * zoom + panX;
  
  // Y moves UP (smaller values) with Time
  // Formula: Y = (Time * TARGET_RATIO * Zoom) + PanY
  // TARGET_RATIO is negative (-0.00045), so larger Time = significantly smaller Y
  const y = (Number(time) || 0) * TARGET_RATIO * zoom + panY;

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

  // Inverse: Age = (X - PanX) / Zoom
  const age = (Number(x) - panX) / safeZoom;
  
  // Inverse: Time = (Y - PanY) / (TARGET_RATIO * Zoom)
  const time = (Number(y) - panY) / (TARGET_RATIO * safeZoom);

  return {
    age: Number.isFinite(age) ? age : 0,
    time: Number.isFinite(time) ? time : 0
  };
}

/**
 * Determines the appropriate grid step (in seconds) for the Age axis,
 * based on the current zoom level. Finer zoom = smaller steps.
 * Each band is 10x the previous, matching the 10x zoom-factor jump.
 *
 * @param {number} zoom - The current zoom factor from the view state.
 * @returns {number} Age grid step in seconds.
 */
export function calculateGridStep(zoom) {
    if (zoom > 0.001) return 3600;            // 1 hour
    if (zoom > 0.0001) return 86400;          // 1 day
    if (zoom > 0.00001) return 2592000;       // 30 days
    if (zoom > 0.000001) return 31536000;     // 1 year
    if (zoom > 0.0000001) return SECONDS_IN_DECADE;    // 1 decade
    if (zoom > 0.00000001) return SECONDS_IN_CENTURY;  // 1 century
    return SECONDS_IN_MILLENNIUM;             // 1 millennium
}

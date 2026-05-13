import { SECONDS_IN_YEAR } from './constants.js';

// The visual ratio for Y-axis scaling (tan(30 degrees) with sign).
// Passed as a parameter so the function remains pure and testable.
const DEFAULT_TARGET_RATIO = -0.00057735;

const BIRTH_ONLY_VISIBLE_YEARS = 25;
const CONTENT_PADDING = 0.15;

/**
 * ENGINE: CALCULATE AUTOFOCUS
 * Pure geometry function that computes viewport positioning from pre-computed
 * temporal state. Two cases:
 *
 * 1. Birth-only (no history nodes beyond birth+NOW): positions birth node in
 *    the lower-left quadrant at a fixed zoom showing 25 subjective years.
 * 2. Has history: fits all content with 15% padding and centers the midpoint.
 *
 * This function receives the viewport's cached latestState instead of
 * re-deriving from raw actor data. The bounding box is computed from node
 * X/Y coordinates which already incorporate the origin timestamp.
 *
 * @param {Object} latestState - Pre-computed temporal state with .nodes array.
 * @param {number} containerWidth - Viewport container width in pixels.
 * @param {number} containerHeight - Viewport container height in pixels.
 * @param {number} [targetRatio=DEFAULT_TARGET_RATIO] - Y-axis visual scaling ratio.
 * @returns {Object|null} { zoom, panX, panY, initialized } or null if invalid.
 */
export function calculateAutofocus(latestState, containerWidth, containerHeight, targetRatio = DEFAULT_TARGET_RATIO) {
  if (!containerWidth || containerWidth <= 0) return null;

  const nodes = latestState?.nodes || [];
  if (nodes.length === 0) return null;

  const birthNode = nodes.find(n => n.isBirth || n.id === 'birth');

  // Case 1: Birth-only characters have only birth + NOW nodes.
  // No lifeline events to fit, so use a fixed 25-year zoom.
  const isBirthOnly = nodes.filter(n => n.id !== 'birth' && n.id !== 'now').length === 0;

  if (isBirthOnly) {
    const targetX = birthNode?.x || 0;
    const targetY = birthNode?.y || 0;
    // Place birth at 25% from left, 75% from top (lower-left quadrant)
    const targetScreenX = containerWidth * 0.25;
    const targetScreenY = containerHeight * 0.75;
    const birthOnlyZoom = containerWidth / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);

    return {
      zoom: birthOnlyZoom,
      panX: targetScreenX - (targetX * birthOnlyZoom),
      panY: targetScreenY - (targetY * targetRatio * birthOnlyZoom),
      initialized: true
    };
  }

  // Case 2: Has history - fit all content with 15% padding on each side.
  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxY = Math.max(...nodes.map(n => n.y));

  const midpointX = (minX + maxX) / 2;
  const midpointY = (minY + maxY) / 2;

  // Zoom to fit bounding box with CONTENT_PADDING margin on each side.
  // The usable area leaves padding on all four edges.
  const usableWidth = containerWidth * (1 - 2 * CONTENT_PADDING);
  const usableHeight = containerHeight * (1 - 2 * CONTENT_PADDING);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const zoomX = usableWidth / rangeX;
  const zoomY = usableHeight / (rangeY * Math.abs(targetRatio));
  // Never zoom out past the birth-only default (25 years across X).
  const minZoom = containerWidth / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);
  const finalZoom = Math.max(Math.min(zoomX, zoomY), minZoom);

  // Center the midpoint on screen.
  const panX = (containerWidth / 2) - (midpointX * finalZoom);
  const panY = (containerHeight / 2) - (midpointY * targetRatio * finalZoom);

  return {
    zoom: finalZoom,
    panX,
    panY,
    initialized: true
  };
}
/**
 * Centers the viewport on a specific world coordinate.
 * 
 * @param {SpanGraphViewport} viewport - The viewport instance.
 * @param {Object} target - The world coordinate {age, time}.
 */
export function autoCenter(viewport, target) {
  const container = viewport.container;
  if (!container) return;

  const zoom = viewport.viewState.zoom;
  
  // Center of the container in screen pixels
  const centerX = (container.clientWidth || 0) / 2;
  const centerY = (container.clientHeight || 0) / 2;

  // We want: centerX = (target.eventAge * zoom) + newPanX
  // Therefore: newPanX = centerX - (target.eventAge * zoom)
  const newPanX = centerX - (target.eventAge * zoom);
  const newPanY = centerY - (target.eventTime * zoom);

  viewport.setViewState({
    panX: newPanX,
    panY: newPanY
  });
}

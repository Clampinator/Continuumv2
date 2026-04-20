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

  // We want: centerX = (target.age * zoom) + newPanX
  // Therefore: newPanX = centerX - (target.age * zoom)
  const newPanX = centerX - (target.age * zoom);
  const newPanY = centerY - (target.time * zoom);

  viewport.setViewState({
    panX: newPanX,
    panY: newPanY
  });
}

import { calculateAutofocus } from '/systems/continuum-v2/modules/temporal-engine/calculate-autofocus.js';
import { TARGET_RATIO } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * VIEWPORT ACTION: HANDLE AUTOFOCUS
 * Thin adapter between the viewport and the Engine's pure calculateAutofocus.
 *
 * Reads the viewport's cached latestState (populated by _render) instead of
 * re-deriving state from raw actor data. The viewport's render loop maintains
 * this cache; this function is a dumb consumer that passes dimensions and
 * delegates to the Engine.
 *
 * @param {SpanGraphViewport} viewport - The viewport instance.
 * @returns {Object|null} New viewState partial, or null if cannot autofocus.
 */
export function handleAutofocus(viewport) {
  if (!viewport) return null;

  const state = viewport.latestState;
  if (!state || !state.nodes || state.nodes.length === 0) return null;

  const rect = viewport.container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  return calculateAutofocus(state, rect.width, rect.height, TARGET_RATIO);
}
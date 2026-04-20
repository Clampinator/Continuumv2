import { SpanGraphViewport } from '../viewport.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { RailRenderer } from '../renderers/rail-renderer.js';

const viewports = new Map();

/**
 * Initializes or updates the Span Graph for a given actor and sheet.
 * 
 * @param {Actor} actor - The actor whose lifeline is being rendered.
 * @param {jQuery|HTMLElement} html - The sheet's HTML fragment.
 */
export function initializeSpanGraph(actor, html) {
  const container = html.find('.span-graph-container').get(0);
  if (!container) return;

  // 1. Cleanup old viewport for this actor if it exists
  if (viewports.has(actor.id)) {
     // Perform any necessary cleanup (e.g., removing listeners)
  }

  // 2. Instantiate new Viewport
  const viewport = new SpanGraphViewport(container);
  viewports.set(actor.id, viewport);

  // 3. Fetch Temporal State
  const history = actor.system.eras || []; // Simplified for now
  const state = getTemporalState(history);

  // 4. Render
  const railRenderer = new RailRenderer(viewport);
  railRenderer.render(state.segments);

  return viewport;
}

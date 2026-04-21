import { SpanGraphViewport } from '../viewport.js';

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

  let viewport = viewports.get(actor.id);

  if (!viewport || viewport.container !== container) {
    // Instantiate new Viewport if none exists or container changed
    viewport = new SpanGraphViewport(container, actor);
    viewports.set(actor.id, viewport);
  } else {
    // Update existing viewport
    viewport.updateActor(actor);
  }

  return viewport;
}

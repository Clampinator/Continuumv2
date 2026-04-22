import { SpanGraphViewport } from '../viewport.js';

const viewports = new Map();

/**
 * Initializes or updates the Span Graph for a given actor and sheet.
 */
export function initializeSpanGraph(actor, html, sheet) {
  const container = html.find('.span-graph-container').get(0);
  if (!container) return;

  let viewport = viewports.get(actor.id);

  if (!viewport) {
    // Instantiate new Viewport if none exists
    viewport = new SpanGraphViewport(container, actor);
    viewports.set(actor.id, viewport);
  } else {
    // AUTHORITY: Update the existing viewport with the new DOM container.
    // This prevents the "Leaky Listener" bug that caused stuttering and freezing.
    viewport.container = container;
    
    // Move the persistent SVG to the new container
    if (viewport.svg && !container.contains(viewport.svg)) {
        container.appendChild(viewport.svg);
    }
    
    viewport.updateActor(actor);
  }

  sheet._spanGraphViewport = viewport;
  return viewport;
}

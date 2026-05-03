import { SpanGraphViewport } from '../viewport.js';
import { attachGoalListeners, detachGoalListeners } from '../interaction/goal-listeners.js';

const viewports = new Map();

// Drive graph updates from actor data changes regardless of whether the owning
// sheet re-renders first (e.g. edits coming from the Lifeline Spreadsheet app).
Hooks.on('updateActor', (updatedActor) => {
    const viewport = viewports.get(updatedActor.id);
    if (viewport) viewport.updateActor(updatedActor);
});

// GATE: Check if the actor has birth/inc data required to render the lifeline.
// Without a birth date and location, the graph has no origin point and cannot
// display meaningful coordinates. Prevents viewport initialization and the
// associated window-level event listeners that would fire on every mouse move.
function hasOriginData(actor) {
  if (!actor) return false;
  const personal = actor.system.personal || {};
  const structure = actor.system.structure || {};
  const hasCharOrigin = personal.dob && personal.birthLocation;
  const hasOrgOrigin = structure.inceptionDate && structure.locality;
  return !!(hasCharOrigin || hasOrgOrigin);
}

/**
 * Initializes or updates the Span Graph for a given actor and sheet.
 * GATED: Will not create or update the viewport if the actor lacks birth
 * or inception data. When data is missing, any existing viewport is torn
 * down so it does not hold stale listeners.
 */
export function initializeSpanGraph(actor, html, sheet) {
  const container = html.find('.span-graph-container').get(0);
  if (!container) return;

  // GATE: No origin data means the graph cannot render. Tear down any
  // existing viewport so stale window listeners do not leak.
  if (!hasOriginData(actor)) {
    const existing = viewports.get(actor.id);
    if (existing) {
      existing.destroy();
      viewports.delete(actor.id);
    }
    sheet._spanGraphViewport = null;
    return;
  }

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

  // GOAL HUD: Attach goal chip listeners (hover, drag-to-link, click-to-edit)
  // Must be re-attached on every render since Foundry replaces the DOM.
  detachGoalListeners(html);
  if (actor.isOwner) {
    attachGoalListeners(html, viewport);
  }

  sheet._spanGraphViewport = viewport;
  return viewport;
}

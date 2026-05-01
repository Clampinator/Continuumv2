/**
 * DUMB PIPE: RENDER VIEWPORT
 * Executes the visual update based on an injected state and manifest.
 * FORBIDDEN from fetching database data or performing temporal math.
 * 
 * @param {Object} viewport - The viewport instance.
 * @param {Object} state - Pre-calculated TemporalState.
 * @param {Object} manifest - Pre-calculated RenderManifest.
 */
export function renderViewport(viewport, state, manifest) {
    if (!viewport.container || !state || !manifest) return;

    const rect = viewport.container.getBoundingClientRect();
    const height = rect.height;

    // 1. Bottom Layer (Background)
    viewport.gridRenderer.render(viewport.viewState);
    viewport.eraRenderer.render(manifest.eras, height);

    // 2. Content Layer (Physical path)
    viewport.experienceRenderer.render(manifest);
    viewport.railRenderer.render(manifest);
    viewport.nodeRenderer.render(manifest);

    // 2.5. Goal Layer (Dotted connection lines from hovered goal chip)
    // Only drawn when a goal chip is hovered in the HUD.
    viewport.goalRenderer.render(manifest, viewport._goalState);

    // 2.6. Yet Layer (Floating future events - rendered on top of rails but below HUD)
    viewport.yetRenderer.render(manifest);

    // 3. HUD Layer (Interface)
    viewport.axisRenderer.render();
    
    // AUTHORITY: Ghost Node rendering now flows through the Projector
    if (manifest.interaction?.ghost) {
        viewport.nodeRenderer.renderGhostNode(manifest.interaction.ghost);
    } else {
        viewport.nodeRenderer.renderGhostNode(null);
    }

    // Creation bar always renders (eras are for all characters, not just spanners)
    viewport.creationRenderer.render(manifest.hud.creationStartX, manifest.hud.creationDragRect || null);
}
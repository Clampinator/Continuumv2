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

    // 3. HUD Layer (Interface)
    viewport.axisRenderer.render();
    
    const spanRank = viewport.actor?.system.spanning?.span || 0;
    if (spanRank >= 1) {
        viewport.creationRenderer.render(manifest.hud.creationStartX);
    }
}

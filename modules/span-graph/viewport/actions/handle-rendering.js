/**
 * DUMB PIPE: RENDER VIEWPORT
 * Executes the visual update based on an injected state and manifest.
 * FORBIDDEN from fetching database data or performing temporal math.
 * Axis labels are pre-computed via computeAxisLabels (TTL calls happen there).
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
    const nowAge = state?.levelingAge ?? state?.nowNode?.x ?? null;
    viewport.experienceRenderer.render(manifest, nowAge);
    viewport.railRenderer.render(manifest);
    viewport.nodeRenderer.render(manifest);

    // 2.5. Goal Layer (Dotted connection lines from hovered goal chip)
    // Only drawn when a goal chip is hovered in the HUD.
    viewport.goalRenderer.render(manifest, viewport._goalState);

    // 2.6. Yet Layer (Floating future events - rendered on top of rails but below HUD)
    viewport.yetRenderer.render(manifest);

    // 3. HUD Layer (Interface)
    // Axis labels are pre-formatted in the projection layer so the
    // AxisRenderer stays truly dumb (no TTL calls)
    const axisData = viewport.computeAxisLabels ? viewport.computeAxisLabels() : null;
    viewport.axisRenderer.render(axisData);
    
    // AUTHORITY: Ghost Node rendering now flows through the Projector
    if (manifest.interaction?.ghost) {
        viewport.nodeRenderer.renderGhostNode(manifest.interaction.ghost);
    } else {
        viewport.nodeRenderer.renderGhostNode(null);
    }

    // Creation bar always renders (eras are for all characters, not just spanners)
    viewport.creationRenderer.render(manifest.hud.creationStartX, manifest.hud.creationDragRect || null);
}
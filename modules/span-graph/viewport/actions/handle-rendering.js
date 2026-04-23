import { flattenEvents } from '../../../span-graph-data-processor.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';
import { generateManifest } from '../projection/manifest-generator.js';

/**
 * Executes the authoritative render pass for the entire Span Graph.
 * DEEP DECIMATION REBUILT: Directs the Kernel -> Manifest -> Renderer pipeline.
 */
export function renderViewport(viewport) {
    if (!viewport.actor || !viewport.container) return;

    // 1. DATA KERNEL (Gather raw facts)
    const history = flattenEvents(viewport.actor.system.eras || {}, viewport.actor);
    const subjectiveNow = Number(viewport.actor.system.personal?.subjectiveNow) || 0;
    const originTime = viewport._getOriginTime();
    
    // 2. TEMPORAL ENGINE (Calculate physical state)
    const state = getTemporalState(history, subjectiveNow, originTime, viewport.actor);
    
    // 3. PROJECTION ENGINE (Convert state to pixels)
    // This is the "Brain" where node leaping is solved.
    const manifest = generateManifest(state, viewport);

    const rect = viewport.container.getBoundingClientRect();
    const height = rect.height;

    // 4. DUMB RENDERING (Draw the manifest)
    // Layer 1: Background
    viewport.gridRenderer.render(viewport.viewState);
    viewport.eraRenderer.render(manifest.eras, height);

    // Layer 2: Content
    viewport.experienceRenderer.render(manifest);
    viewport.railRenderer.render(manifest);
    viewport.nodeRenderer.render(manifest);

    // Layer 3: HUD
    viewport.axisRenderer.render();
    
    const spanRank = viewport.actor.system.spanning?.span || 0;
    if (spanRank >= 1) {
        viewport.creationRenderer.render(manifest.hud.creationStartX);
    }

    // Persistent state for interactions (Tooltips/Handlers)
    viewport.latestHistory = history;
    viewport.latestState = state;
    viewport.latestManifest = manifest;
}

import { flattenEvents } from '../../../span-graph-data-processor.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';

/**
 * Executes the authoritative render pass for the entire Span Graph.
 * ADI REBUILT: Processes RenderNodes through all visual layers.
 */
export function renderViewport(viewport) {
    if (!viewport.actor || !viewport.container) return;

    const history = flattenEvents(viewport.actor.system.eras || {}, viewport.actor);
    const subjectiveNow = Number(viewport.actor.system.personal?.subjectiveNow) || 0;
    const originTime = viewport._getOriginTime();
    
    const state = getTemporalState(history, subjectiveNow, originTime, viewport.actor);
    
    // 1. Bottom Layer (Background)
    viewport.gridRenderer.render(state, viewport.viewState);
    viewport.eraRenderer.render(state);

    // 2. Content Layer (Physical path)
    viewport.experienceRenderer.render(state);
    viewport.railRenderer.render(state, viewport._interaction);
    viewport.nodeRenderer.render(state, viewport.viewState, null, viewport._interaction);

    // 3. HUD Layer (Interface)
    viewport.axisRenderer.render();
    viewport.creationRenderer.render(state, viewport.viewState);
}

import { getActorHistory } from '../../../state/get-actor-history.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';
import { TARGET_RATIO } from '../../../temporal-engine/constants.js';

/**
 * HUD: CALCULATE AUTOFOCUS
 * Positions the NOW node in the Lower-Left Quadrant of the graph panel.
 * 
 * @param {Actor} actor - The character actor.
 * @param {HTMLElement} container - Viewport container.
 * @param {Function} getOriginTime - Callback to get character origin.
 * @returns {Object|null} New partial viewState.
 */
export function calculateAutofocus(actor, container, getOriginTime) {
    if (!actor || !container) return null;
    
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return null;
    
    // 1. Get Authoritative Physical State
    const history = getActorHistory(actor);
    const subjectiveNow = Number(actor.system.personal?.subjectiveNow) || 0;
    const originTime = getOriginTime();
    
    const state = getTemporalState(history, subjectiveNow, originTime, actor);
    const targetX = state.nowNode?.x || 0;
    const targetY = state.nowNode?.y || 0;

    // 2. Determine Viewport Scale
    // Fixed zoom for standard character view
    const finalZoom = 0.00000005; 

    // 3. TARGET: LOWER-LEFT QUADRANT
    // Lower means higher Y in screen space (e.g. 75% down)
    // Left means lower X in screen space (e.g. 25% across)
    const targetScreenX = rect.width * 0.25;
    const targetScreenY = rect.height * 0.75;

    return { 
        zoom: finalZoom, 
        panX: targetScreenX - (targetX * finalZoom), 
        panY: targetScreenY - (targetY * TARGET_RATIO * finalZoom), 
        initialized: true 
    };
}

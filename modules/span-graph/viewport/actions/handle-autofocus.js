import { flattenEvents } from '../../span-graph-data-processor.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { TARGET_RATIO } from '../../temporal-engine/constants.js';

/**
 * Calculates the autofocus viewState to center on the character's NOW position.
 * 
 * @param {Actor} actor - The character actor.
 * @param {HTMLElement} container - Viewport container.
 * @param {Function} getOriginTime - Callback to get character origin.
 * @returns {Object|null} New partial viewState or null if container not ready.
 */
export function calculateAutofocus(actor, container, getOriginTime) {
    if (!actor || !container) return null;
    
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return null;
    
    const history = flattenEvents(actor.system.eras || {}, actor);
    const subjectiveNow = Number(actor.system.personal?.subjectiveNow) || 0;
    const originTime = getOriginTime();
    
    const state = getTemporalState(history, subjectiveNow, originTime, actor);
    const targetX = state.nowNode?.x || 0;
    const targetY = state.nowNode?.y || 0;

    // Fixed zoom for standard display
    const finalZoom = Math.max(0.00000001, Math.min(rect.width / (50 * 31536000), 1));
    const centerX = rect.width * 0.8;
    const centerY = rect.height * 0.2;

    return { 
        zoom: finalZoom, 
        panX: centerX - (targetX * finalZoom), 
        panY: centerY - (targetY * TARGET_RATIO * finalZoom), 
        initialized: true 
    };
}

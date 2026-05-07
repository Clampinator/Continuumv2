import { getActorHistory } from '../../../state/get-actor-history.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';
import { TARGET_RATIO, SECONDS_IN_YEAR } from '../../../temporal-engine/constants.js';

const BIRTH_ONLY_VISIBLE_YEARS = 25;
const CONTENT_PADDING = 0.15;

/**
 * HUD: CALCULATE AUTOFOCUS
 * Two-case viewport positioning:
 * - Birth-only (no history nodes): birth node in lower-left quadrant at fixed zoom
 * - Has history: center all content with fit-to-view zoom and 15% padding
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
    const nodes = state.nodes || [];
    const birthNode = nodes.find(n => n.isBirth || n.id === 'birth');

    // 2. Detect case: birth-only characters have only birth + NOW nodes
    const isBirthOnly = nodes.filter(n => n.id !== 'birth' && n.id !== 'now').length === 0;

    if (isBirthOnly) {
        // CASE 1: Birth-only - show 25 subjective years across X-axis,
        // place birth node in lower-left quadrant
        const targetX = birthNode?.x || 0;
        const targetY = birthNode?.y || 0;
        const targetScreenX = rect.width * 0.25;
        const targetScreenY = rect.height * 0.75;
        const birthOnlyZoom = rect.width / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);

        return {
            zoom: birthOnlyZoom,
            panX: targetScreenX - (targetX * birthOnlyZoom),
            panY: targetScreenY - (targetY * TARGET_RATIO * birthOnlyZoom),
            initialized: true
        };
    }

    // CASE 2: Has history - fit all content with padding
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));

    const midpointX = (minX + maxX) / 2;
    const midpointY = (minY + maxY) / 2;

    // Zoom to fit bounding box with CONTENT_PADDING margin on each side
    const usableWidth = rect.width * (1 - 2 * CONTENT_PADDING);
    const usableHeight = rect.height * (1 - 2 * CONTENT_PADDING);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const zoomX = usableWidth / rangeX;
    const zoomY = usableHeight / (rangeY * Math.abs(TARGET_RATIO));
    // Never zoom out past the birth-only default (25 years across X)
    const minZoom = rect.width / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);
    const finalZoom = Math.max(Math.min(zoomX, zoomY), minZoom);

    // Center the midpoint on screen
    const panX = (rect.width / 2) - (midpointX * finalZoom);
    const panY = (rect.height / 2) - (midpointY * TARGET_RATIO * finalZoom);

    return {
        zoom: finalZoom,
        panX,
        panY,
        initialized: true
    };
}

import { flattenEvents } from '../../span-graph-data-processor.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { handleCreateEraClick } from '../actions/handle-create-era.js';

/**
 * Handles the pointerdown event for the Span Graph.
 */
export function onPointerDown(event, viewport) {
    const target = event.target;
    const rect = viewport.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (target.classList.contains('graph-creation-bar-era')) {
        handleCreateEraClick(viewport);
        return;
    }

    const node = target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
    const rail = target.closest('.span-graph-rail');
    
    const history = flattenEvents(viewport.actor.system.eras || {}, viewport.actor);
    const subjectiveNow = Number(viewport.actor.system.personal?.subjectiveNow) || 0;
    const originTime = viewport._getOriginTime();
    const state = getTemporalState(history, subjectiveNow, originTime, viewport.actor);

    let nodeWorld = null;
    if (node) {
        if (node.classList.contains('graph-node-now')) {
            nodeWorld = { age: state.nowNode.x, time: state.nowNode.y };
        } else {
            const eventId = node.dataset.eventId;
            const targetNode = state.nodes.find(n => n.id === eventId);
            if (targetNode) {
                nodeWorld = { age: targetNode.x, time: targetNode.y };
            }
        }
    }

    viewport._interaction = {
        isDragging: true,
        type: node ? 'node' : 'pan',
        isRailTarget: !!rail, 
        nodeElement: node,
        startX: x, startY: y,
        startPanX: viewport.viewState.panX, startPanY: viewport.viewState.panY,
        startWorld: nodeWorld || viewport.screenToWorld(x, y),
        currentWorld: nodeWorld || viewport.screenToWorld(x, y),
        hoverWorldPos: viewport._interaction.hoverWorldPos, 
        hasSignificantMovement: false, mode: null,
        cachedHistory: history,
        cachedNow: subjectiveNow,
        cachedOrigin: originTime
    };

    if (viewport.svg.setPointerCapture) viewport.svg.setPointerCapture(event.pointerId);
}

import { createNodeShape } from './create-node-shape.js';
import { updateNowNode } from './update-now-node.js';
import { updateInsertGhost } from './update-insert-ghost.js';
import { updateYetNodes } from './update-yet-nodes.js';

/**
 * Main render loop for all lifeline nodes.
 * @param {SVGElement} group - The target SVG container group.
 * @param {object} viewState - Current graph camera and interaction state.
 * @param {object} graphData - Prepared lifeline coordinates.
 */
export function updateNodes(group, viewState, graphData) {
    if (!group) return;
    const existing = group.querySelectorAll('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-fulfillment');
    existing.forEach(n => n.remove());

    graphData.levelNodes.forEach((node, index) => {
        // AUTHORITY: Use eventAge and eventTime standard for coordinate math.
        const age = node.eventAge !== undefined ? node.eventAge : node.age;
        const time = node.eventTime !== undefined ? node.eventTime : node.time;

        const cx = (age * viewState.scaleX) + viewState.x;
        const cy = (time * viewState.scaleY) + viewState.y;
        
        // NAN GUARD: Ignore invalid coordinates
        if (isNaN(cx) || isNaN(cy)) return;

        if (node.eventIsSpan) {
            // AUTHORITY: A Span requires TWO nodes - Origin and Destination.
            const arrivalY = node.arrivalY || node.arrivalTs || time;
            const arrivalCy = (arrivalY * viewState.scaleY) + viewState.y;
            const isUp = arrivalY > time;

            // 1. Span Origin (Departure)
            const originData = { ...node, type: isUp ? 'span-origin-up' : 'span-origin-down' };
            const origin = createNodeShape(originData, cx, cy);
            _attachMetadata(origin, node, index);
            group.appendChild(origin);

            // 2. Span Destination (Arrival)
            const destData = { ...node, type: isUp ? 'span-dest-up' : 'span-dest-down' };
            const dest = createNodeShape(destData, cx, arrivalCy);
            _attachMetadata(dest, node, index);
            group.appendChild(dest);
        } else {
            // Normal Level Node
            const shape = createNodeShape(node, cx, cy);
            _attachMetadata(shape, node, index);
            group.appendChild(shape);
        }
    });

    updateYetNodes(group, viewState, graphData);
    updateNowNode(group, viewState, graphData);  // always re-appended last so it stays on top
    updateInsertGhost(group, viewState);
}

/**
 * Helper to attach authoritative interaction metadata to a node element.
 */
function _attachMetadata(el, node, index) {
    if (!el) return;
    el.setAttribute('data-index', index);
    el.setAttribute('data-event-id', node.eventId || node.id || '');
    el.setAttribute('data-era-id', node.eraId || '');
    el.setAttribute('data-exp-id', node.expId || '');
    el.classList.add('graph-element-interactive');
}

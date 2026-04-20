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
    const existing = group.querySelectorAll('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-fulfillment');
    existing.forEach(n => n.remove());

    graphData.levelNodes.forEach((node, index) => {
        const cx = (node.age * viewState.scaleX) + viewState.x;
        const cy = (node.time * viewState.scaleY) + viewState.y;
        
        // NAN GUARD: Ignore invalid coordinates
        if (isNaN(cx) || isNaN(cy)) return;

        const shape = createNodeShape(node, cx, cy);
        shape.setAttribute('data-index', index);
        shape.setAttribute('data-event-id', node.eventId || '');
        shape.setAttribute('data-era-id', node.eraId || '');
        shape.setAttribute('data-exp-id', node.expId || '');
        shape.classList.add('graph-element-interactive');
        group.appendChild(shape);
    });

    updateYetNodes(group, viewState, graphData);
    updateNowNode(group, viewState, graphData);  // always re-appended last so it stays on top
    updateInsertGhost(group, viewState);
}
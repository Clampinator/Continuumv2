import { flattenEvents } from '../../span-graph-data-processor.js';
import { handleNodeEdit } from '../actions/handle-node-edit.js';

/**
 * Handles the contextmenu (right-click) event for the Span Graph.
 */
export function onContextMenu(event, viewport) {
    event.preventDefault();
    const target = event.target;
    const node = target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
    if (!node || node.classList.contains('graph-node-now')) return;

    const eventId = node.dataset.eventId;
    
    // Find the node in history to get full properties (record)
    const history = flattenEvents(viewport.actor.system.eras || {}, viewport.actor);
    const targetNode = history.find(n => n.id === eventId);
    
    if (targetNode) {
        handleNodeEdit(viewport.actor.sheet, targetNode);
    }
}

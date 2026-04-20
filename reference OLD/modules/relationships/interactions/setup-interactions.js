import { applyGraphZoom } from './apply-graph-zoom.js';
import { handleNodeAddition } from './handle-node-addition.js';
import { manageNodeDragging } from './manage-node-dragging.js';
import { manageLinkCreation } from './manage-link-creation.js';
import { handleNodeEdit } from './handle-node-edit.js';
import { handleLinkEdit } from './handle-link-edit.js';
import { handleZoomReset } from './handle-zoom-reset.js';
import { handleSidebarDrop } from './handle-sidebar-drop.js';
import { handleGroupManagement } from './handle-group-management.js';
import { handleNodeHighlight } from './handle-node-highlight.js';
import { handleGraphTooltip } from './handle-graph-tooltip.js';

/**
 * Orchestrates the activation of all interaction units for the graph.
 */
export function setupInteractions({ svg, g, container, sheet, simulation, data, renderRefs, state }) {
    const { nodeSel, linkHit, linkVisible, linkBadgeSel, groupSel } = renderRefs;

    // 1. Zoom and Viewport
    const zoom = applyGraphZoom(svg, g);
    handleZoomReset(svg, zoom, sheet);

    // 2. Element Management
    handleNodeAddition(sheet);
    manageNodeDragging(nodeSel, simulation);
    manageLinkCreation(svg, g, nodeSel, sheet);
    handleSidebarDrop(container, sheet);

    // 3. Editors
    handleNodeEdit(nodeSel, sheet);
    handleLinkEdit(linkHit, linkVisible, sheet);
    handleGroupManagement(svg, sheet);

    // 4. Highlight
    handleNodeHighlight({ svg, nodeSel, linkVisible, linkBadgeSel, groupSel, data, renderRefs, state });

    // 5. Tooltips
    handleGraphTooltip(container, nodeSel, linkHit);
}

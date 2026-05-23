import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { getNodeData, findSnapTarget, installGlowFilter, clearSnapGlow, applySnapGlow } from './link-snap-utils.js';

/**
 * Attaches the right-drag tool for creating new relationships.
 *
 * UX improvements:
 *  - Magnetic snap: within (nodeRadius + 40) px, the drag line snaps
 *    to the nearest valid target center.
 *  - Proximity glow: the snap target gains a cyan SVG filter halo.
 *  - Cursor feedback: SVG shows crosshair cursor during drag.
 *  - Cancel notification: releasing on empty space shows an info message.
 *  - Context menu suppression: right-click context menu is blocked during
 *    drag so the edit dialog does not steal focus.
 *
 * @param {object} svg  - D3 selection of the root SVG element.
 * @param {object} g    - D3 selection of the main content group.
 * @param {object} nodeSel - D3 selection of node groups.
 * @param {object} sheet - The Foundry ActorSheet instance.
 */
export function manageLinkCreation(svg, g, nodeSel, sheet) {
    let dragSource = null;
    let snapTarget = null;

    // Drag line - dashed coral line from source to cursor or snap target
    const dragLine = g.append('line')
        .attr('stroke', '#ff6b6b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .style('opacity', 0);

    installGlowFilter(svg);

    // Full cleanup of drag visual state
    function endDrag() {
        dragSource = null;
        snapTarget = clearSnapGlow(nodeSel, snapTarget);
        dragLine.style('opacity', 0);
        // Reset cursor - null removes the inline style, reverting to CSS default
        svg.style('cursor', null);
    }

    // Permanently-registered context menu blocker.
    // During a link drag, this fires BEFORE handle-node-edit's handler
    // (registered later in setup-interactions) because D3 dispatches
    // listeners in registration order. stopImmediatePropagation prevents
    // the edit dialog from opening mid-drag.
    nodeSel.on('contextmenu.linkcreate', (event) => {
        if (dragSource) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    });

    svg.on('contextmenu.linkcreate', (event) => {
        if (dragSource) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // BEGIN DRAG: right-click on a node
    nodeSel.on('mousedown.linkcreate', (event, d) => {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
            dragSource = d;
            dragLine.attr('x1', d.x).attr('y1', d.y)
                .attr('x2', d.x).attr('y2', d.y)
                .style('opacity', 1);
            // Crosshair cursor signals link-creation mode
            svg.style('cursor', 'crosshair');
        }
    });

    // DRAG MOVE: update line endpoint, snap to targets, glow the nearest
    svg.on('mousemove.linkcreate', (event) => {
        if (!dragSource) return;
        const [mx, my] = d3.pointer(event, g.node());
        const nodes = getNodeData(nodeSel);
        const target = findSnapTarget(mx, my, nodes, dragSource);

        if (target) {
            // Magnetic snap: line locks to target center
            snapTarget = clearSnapGlow(nodeSel, snapTarget);
            applySnapGlow(nodeSel, target);
            snapTarget = target;
            dragLine.attr('x2', target.x).attr('y2', target.y);
        } else {
            // Free drag: line follows cursor
            snapTarget = clearSnapGlow(nodeSel, snapTarget);
            dragLine.attr('x2', mx).attr('y2', my);
        }
    });

    // COMPLETE CONNECTION: release on a node
    nodeSel.on('mouseup.linkcreate', async (event, d) => {
        if (!dragSource || event.button !== 2) return;
        event.stopPropagation();

        // Prefer snap target over raw mouseup target - the user was
        // already aiming at the glowing node
        const targetNode = (snapTarget && snapTarget !== dragSource)
            ? snapTarget
            : d;

        // No self-connections
        if (dragSource === targetNode) {
            endDrag();
            return;
        }

        // Capture data before async - D3 bindings may shift during await
        const sourceName = dragSource.name;
        const targetName = targetNode.name;
        const sourceId = dragSource.id;
        const targetId = targetNode.id;
        const newId = foundry.utils.randomID();

        // Clear visual state immediately so the graph feels responsive
        endDrag();

        await sheet.actor.update({
            [`system.networkEdges.${newId}`]: {
                id: newId,
                source: sourceId,
                target: targetId,
                relationshipType: 'Connection',
                importance: 'Professional',
                eventNotes: ''
            }
        });

        ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.ConnectedNodes", {sourceName, targetName}));
    });

    // CANCEL: release on empty space
    svg.on('mouseup.linkcreate', (event) => {
        if (!dragSource) return;
        endDrag();
        // Inform the user the gesture was cancelled - no silent failure
        ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.LinkCancelled"));
    });
}
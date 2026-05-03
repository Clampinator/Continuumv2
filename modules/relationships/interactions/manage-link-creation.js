import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// SNAP_RADIUS - extra pixels beyond the node edge where snapping activates.
// Total snap distance from center = nodeRadius + SNAP_RADIUS.
const SNAP_RADIUS = 40;

// GLOW_FILTER_ID - shared ID for the SVG <defs> proximity glow filter.
const GLOW_FILTER_ID = 'link-drag-glow';

/**
 * Attaches the right-drag tool for creating new relationships.
 *
 * UX improvements:
 *  - Magnetic snap: within (nodeRadius + SNAP_RADIUS) px, the drag line
 *    snaps to the nearest valid target center.
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

    // Glow filter - soft cyan halo applied to snap-target nodes
    const defs = svg.select('defs').empty()
        ? svg.append('defs')
        : svg.select('defs');
    defs.append('filter')
        .attr('id', GLOW_FILTER_ID)
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%')
        .call(filter => {
            filter.append('feGaussianBlur')
                .attr('stdDeviation', '4')
                .attr('result', 'blur');
            filter.append('feMerge')
                .call(merge => {
                    merge.append('feMergeNode').attr('in', 'blur');
                    merge.append('feMergeNode').attr('in', 'SourceGraphic');
                });
        });

    // Collect all node datum for proximity checks on every mousemove
    function getNodeData() {
        const nodes = [];
        nodeSel.each(function(d) { nodes.push(d); });
        return nodes;
    }

    // Find the nearest non-source node whose edge is within SNAP_RADIUS
    function findSnapTarget(mx, my, nodes) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const node of nodes) {
            if (node === dragSource) continue;
            if (node.x == null || node.y == null) continue;
            const dx = mx - node.x;
            const dy = my - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nodeRadius = node.isRoot ? 35 : 25;
            // Snap activates when cursor enters the node circle + SNAP_RADIUS band
            const threshold = nodeRadius + SNAP_RADIUS;
            if (dist < threshold && dist < nearestDist) {
                nearest = node;
                nearestDist = dist;
            }
        }
        return nearest;
    }

    // Remove glow from the previous snap target
    function clearSnapGlow() {
        if (snapTarget) {
            nodeSel.filter(d => d === snapTarget)
                .select('circle')
                .style('filter', null);
            snapTarget = null;
        }
    }

    // Apply glow halo to a snap target node
    function applySnapGlow(target) {
        clearSnapGlow();
        snapTarget = target;
        nodeSel.filter(d => d === target)
            .select('circle')
            .style('filter', `url(#${GLOW_FILTER_ID})`);
    }

    // Full cleanup of drag visual state
    function endDrag() {
        dragSource = null;
        dragLine.style('opacity', 0);
        clearSnapGlow();
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
        const nodes = getNodeData();
        const target = findSnapTarget(mx, my, nodes);

        if (target) {
            // Magnetic snap: line locks to target center
            dragLine.attr('x2', target.x).attr('y2', target.y);
            applySnapGlow(target);
        } else {
            // Free drag: line follows cursor
            dragLine.attr('x2', mx).attr('y2', my);
            clearSnapGlow();
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

        ui.notifications.info(`Connected ${sourceName} and ${targetName}.`);
    });

    // CANCEL: release on empty space
    svg.on('mouseup.linkcreate', (event) => {
        if (!dragSource) return;
        endDrag();
        // Inform the user the gesture was cancelled - no silent failure
        ui.notifications.info('Link cancelled - release on a node to connect.');
    });
}
// SNAP_RADIUS - extra pixels beyond the node edge where snapping activates.
// Total snap distance from center = nodeRadius + SNAP_RADIUS.
const SNAP_RADIUS = 40;

// GLOW_FILTER_ID - shared ID for the SVG <defs> proximity glow filter.
const GLOW_FILTER_ID = 'link-drag-glow';

/**
 * Collects all node datum from a D3 selection for proximity checks.
 * @param {object} nodeSel - D3 selection of node groups.
 * @returns {object[]} Array of node datum objects.
 */
export function getNodeData(nodeSel) {
    const nodes = [];
    nodeSel.each(function(d) { nodes.push(d); });
    return nodes;
}

/**
 * Finds the nearest non-source node whose edge is within SNAP_RADIUS.
 * @param {number} mx - Cursor X in group coordinates.
 * @param {number} my - Cursor Y in group coordinates.
 * @param {object[]} nodes - Array of node datum objects.
 * @param {object} source - The source node to exclude.
 * @returns {object|null} The nearest valid snap target, or null.
 */
export function findSnapTarget(mx, my, nodes, source) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const node of nodes) {
        if (node === source) continue;
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

/**
 * Installs the SVG <defs> glow filter used for snap-target highlighting.
 * Reuses an existing <defs> if one is present.
 * @param {object} svg - D3 selection of the root SVG element.
 */
export function installGlowFilter(svg) {
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
}

/**
 * Removes the glow effect from the previous snap target.
 * @param {object} nodeSel - D3 selection of node groups.
 * @param {object|null} current - The current snap target (set to null after clearing).
 * @returns {null} Always returns null (new snapTarget value).
 */
export function clearSnapGlow(nodeSel, current) {
    if (current) {
        nodeSel.filter(d => d === current)
            .select('circle')
            .style('filter', null);
    }
    return null;
}

/**
 * Applies the glow filter to a target node circle.
 * @param {object} nodeSel - D3 selection of node groups.
 * @param {object} target - The node datum to glow.
 */
export function applySnapGlow(nodeSel, target) {
    nodeSel.filter(d => d === target)
        .select('circle')
        .style('filter', `url(#${GLOW_FILTER_ID})`);
}
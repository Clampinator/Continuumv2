import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Configures D3 drag behavior for nodes.
 */
export function manageNodeDragging(nodeSel, simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
        d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!d.isRoot) { d.fx = null; d.fy = null; }
    }

    nodeSel.call(d3.drag()
        .filter(event => event.button === 0)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
}

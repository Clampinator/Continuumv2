
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Sets up the base SVG structure.
 */
export function setupGraphView(container) {
    let width = container.node().clientWidth || 800;
    let height = container.node().clientHeight || 600;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [0, 0, width, height])
        .style("background-color", "#111");

    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 28)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#555");

    const g = svg.append("g"); 
    return { svg, g, width, height };
}

/**
 * Renders nodes, links, and groups into the graph group.
 */
export function renderElements(g, data) {
    const valueline = d3.line().curve(d3.curveCatmullRomClosed).x(d => d[0]).y(d => d[1]);

    const groupSel = g.append("g").attr("class", "groups")
        .selectAll("path").data(data.groups).join("path")
        .attr("fill", d => d.color).attr("stroke", d => d.color)
        .attr("stroke-width", 40).attr("stroke-linejoin", "round")
        .style("opacity", 0.15).style("pointer-events", "none");

    const linkWrapper = g.append("g").attr("class", "links")
        .selectAll("g").data(data.links).join("g").attr("class", "link-wrapper");

    // Hit Path (Invisible)
    const linkHit = linkWrapper.append("path").attr("class", "network-link-hit")
        .attr("stroke", "transparent").attr("stroke-width", 15).attr("fill", "none")
        .style("cursor", "pointer");

    // Visible Path
    const linkVisible = linkWrapper.append("path").attr("class", "network-link")
        .attr("marker-end", "url(#arrowhead)").attr("fill", "none")
        .style("stroke-width", d => (2 + (d.strength * 1.5)) + "px")
        .style("stroke", "#555").style("stroke-opacity", 0.6);

    const linkLabelGroup = linkWrapper.append("g");
    linkLabelGroup.append("rect").attr("class", "network-link-label-rect").attr("height", 14);
    linkLabelGroup.append("text").attr("class", "network-link-label-text").attr("dy", 3)
        .text(d => d.relationshipType || "Link");

    const nodeSel = g.append("g").attr("class", "nodes")
        .selectAll("g").data(data.nodes).join("g")
        .attr("class", "network-node").attr("data-node-id", d => d.id);

    const getRadius = (d) => d.isRoot ? 35 : 25;

    nodeSel.append("circle").attr("r", d => getRadius(d))
        .attr("class", "network-node-bg").attr("fill", "#222")
        .attr("stroke", d => d.isRoot ? "#ffd700" : "#4da6ff")
        .attr("stroke-width", d => d.isRoot ? 3 : 2)
        .style("pointer-events", "all");

    nodeSel.append("clipPath").attr("id", d => `clip-${d.id}`)
        .append("circle").attr("r", d => getRadius(d));

    nodeSel.append("image")
        .attr("href", d => d.img)
        .attr("x", d => -getRadius(d)).attr("y", d => -getRadius(d))
        .attr("width", d => getRadius(d) * 2).attr("height", d => getRadius(d) * 2)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("clip-path", d => `url(#clip-${d.id})`).style("pointer-events", "none");

    nodeSel.append("text").attr("class", "network-node-label")
        .attr("dy", d => d.isRoot ? 50 : 40).text(d => d.name).style("pointer-events", "none");

    nodeSel.filter(d => d.group).append("text").attr("class", "network-node-group-label")
        .attr("dy", d => d.isRoot ? 62 : 52).text(d => `[${d.group}]`)
        .attr("fill", "#aaa").attr("font-size", "10px").attr("text-anchor", "middle")
        .style("pointer-events", "none");

    return { 
        nodeSel, linkWrapper, linkVisible, linkHit, linkLabelGroup, groupSel, valueline, getRadius 
    };
}

/**
 * Updates simulation positions.
 */
export function tickSimulation(renderRefs) {
    const { nodeSel, linkVisible, linkHit, linkLabelGroup, groupSel, valueline, getRadius } = renderRefs;

    groupSel.attr("d", d => {
        let points = d.members.map(n => [n.x, n.y]);
        if (points.length < 3) {
            const r = 20;
            if (points.length === 2) {
                const [p1, p2] = points;
                const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                const dx = Math.sin(angle) * r;
                const dy = -Math.cos(angle) * r;
                points = [[p1[0]-dx, p1[1]-dy], [p1[0]+dx, p1[1]+dy], [p2[0]+dx, p2[1]+dy], [p2[0]-dx, p2[1]-dy]];
            } else if (points.length === 1) {
                const p = points[0];
                points = [[p[0]-r, p[1]], [p[0], p[1]-r], [p[0]+r, p[1]], [p[0], p[1]+r]];
            }
        }
        return valueline(d3.polygonHull(points) || points);
    });

    const updateLinkAttr = (sel) => {
        sel.attr("d", d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            const targetRadius = getRadius(d.target) + 2;
            if (dr === 0) return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
            const offX = (dx * targetRadius) / dr;
            const offY = (dy * targetRadius) / dr;
            return `M${d.source.x},${d.source.y}L${d.target.x - offX},${d.target.y - offY}`;
        });
    };

    updateLinkAttr(linkVisible);
    updateLinkAttr(linkHit);

    linkLabelGroup.attr("transform", d => `translate(${(d.source.x + d.target.x)/2}, ${(d.source.y + d.target.y)/2})`);
    
    // Efficient bounding box updates for labels
    linkLabelGroup.each(function(d) {
        const text = d3.select(this).select("text");
        const rect = d3.select(this).select("rect");
        if (text.node()) {
            try {
                const bbox = text.node().getBBox();
                rect.attr("x", bbox.x - 4).attr("y", bbox.y - 2)
                    .attr("width", bbox.width + 8).attr("height", bbox.height + 4);
            } catch(e) {}
        }
    });

    nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
}

/**
 * Updates opacity based on the current view time.
 */
export function updateTimeVisibility(renderRefs, time, rootId) {
    const { linkWrapper, nodeSel } = renderRefs;
    const activeNodeIds = new Set([rootId]);

    linkWrapper.transition().duration(100)
        .style("opacity", d => {
            const isActive = (time >= d.startTime && time <= d.endTime);
            if (isActive) {
                activeNodeIds.add(d.source.id || d.source);
                activeNodeIds.add(d.target.id || d.target);
                return 0.4 + (d.strength * 0.12);
            } 
            return 0;
        });
        
    nodeSel.transition().duration(100)
        .style("opacity", d => activeNodeIds.has(d.id) ? 1 : 0)
        .style("pointer-events", d => activeNodeIds.has(d.id) ? "all" : "none");
}

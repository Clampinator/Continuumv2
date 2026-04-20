/**
 * Renders the structural SVG group, background rect, and separator line for the timeline.
 * @param {object} svg - D3 selection of the SVG.
 * @param {number} width - Viewport width.
 * @param {number} height - Viewport height.
 * @param {number} y - Y-coordinate for the group.
 * @returns {object} D3 selection of the timeline group.
 */
export function drawTimelineBase(svg, width, height, y) {
    const group = svg.append("g")
        .attr("class", "network-timeline")
        .attr("transform", `translate(0, ${y})`);

    group.append("rect")
        .attr("width", width)
        .attr("height", 50)
        .attr("fill", "#111");

    group.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", width).attr("y2", 0)
        .attr("stroke", "#333");
        
    return group;
}
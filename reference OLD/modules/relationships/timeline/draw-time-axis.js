import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Draws the horizontal time axis and formats the tick labels.
 * @param {object} group - D3 selection of the timeline group.
 * @param {object} scale - D3 time scale.
 * @returns {object} D3 axis instance.
 */
export function drawTimeAxis(group, scale) {
    const xAxis = d3.axisBottom(scale)
        .ticks(5)
        .tickFormat(d3.timeFormat("%Y"));
    
    const axisGroup = group.append("g")
        .attr("class", "network-timeline-axis")
        .attr("transform", "translate(0, 10)")
        .call(xAxis);

    axisGroup.selectAll("text").attr("fill", "#888");
    
    return xAxis;
}
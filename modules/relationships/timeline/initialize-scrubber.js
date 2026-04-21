import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Initializes the interactive scrubber handle and wires the drag interaction.
 * @param {object} params - { group, scale, time, bounds, onDrag }
 * @returns {object} D3 selection of the scrubber group.
 */
export function initializeScrubber({ group, scale, time, bounds, onDrag }) {
    const { left, right } = bounds;
    const scrubX = scale(new Date(time));

    const scrubber = group.append("g")
        .attr("transform", `translate(${scrubX}, 0)`)
        .style("cursor", "ew-resize");

    scrubber.append("path")
        .attr("d", "M-6,0 L6,0 L6,10 L0,16 L-6,10 Z")
        .attr("fill", "#ffd700");

    const label = scrubber.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffd700")
        .style("font-size", "10px")
        .text(d3.timeFormat("%Y-%m-%d")(new Date(time)));

    scrubber.call(d3.drag().on("drag", (event) => {
        const x = Math.min(right, Math.max(left, event.x));
        const t = scale.invert(x);
        const newTime = t.getTime();
        
        scrubber.attr("transform", `translate(${x}, 0)`);
        label.text(d3.timeFormat("%Y-%m-%d")(t));
        
        onDrag(newTime);
    }));

    return scrubber;
}

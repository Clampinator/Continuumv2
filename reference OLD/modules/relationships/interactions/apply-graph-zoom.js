import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Applies D3 zoom behavior to the SVG element.
 * @param {object} svg - D3 selection of the SVG.
 * @param {object} g - D3 selection of the main content group.
 */
export function applyGraphZoom(svg, g) {
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));
    
    svg.call(zoom).on("dblclick.zoom", null);
    return zoom;
}

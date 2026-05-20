import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Applies D3 zoom behavior to the SVG element.
 * @param {object} svg - D3 selection of the SVG.
 * @param {object} g - D3 selection of the main content group.
 */
export function applyGraphZoom(svg, g) {
    const zoom = d3.zoom()
        // Right-click is reserved for link creation (manage-link-creation.js).
        // Without this filter, D3 zoom would also pan on right-drag, causing
        // the canvas to move while the user is trying to draw a link.
        .filter(event => {
            if (event.button === 2) return false;
            if (event.type === 'dblclick') return false;
            return true;
        })
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);
    return zoom;
}

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Binds the reset zoom UI button.
 */
export function handleZoomReset(svg, zoom, sheet) {
    $(sheet.element).find('.network-reset-zoom').off('click').on('click', () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
}

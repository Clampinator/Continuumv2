/**
 * Injects the HTML overlay container for timeline start/end date controls.
 * @param {object} container - D3 selection of the root container.
 * @returns {object} D3 selection of the controls div.
 */
export function injectBoundsControls(container) {
    return container.append("div")
        .attr("class", "network-timeline-controls")
        .style("position", "absolute")
        .style("bottom", "60px")
        .style("left", "10px")
        .style("right", "10px")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("pointer-events", "none");
}
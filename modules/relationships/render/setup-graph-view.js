
/**
 * Initializes the SVG and main group for the relationship graph.
 * @param {object} container - D3 selection of the container element.
 * @returns {object} { svg, g, width, height }
 */
export function setupGraphView(container) {
    let width = container.node().clientWidth || 800;
    let height = container.node().clientHeight || 500;

    const svg = container.append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", [0, 0, width, height])
        .style("background-color", "transparent");

    const g = svg.append("g"); 
    return { svg, g, width, height };
}

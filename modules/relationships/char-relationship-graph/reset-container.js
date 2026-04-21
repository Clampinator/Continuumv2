
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Selects the target container and removes any existing SVG elements to prepare for initialization.
 * @param {string} containerId - The CSS selector for the container.
 * @returns {Selection|null} The D3 selection of the container, or null if not found.
 */
export function resetContainer(containerId) {
    const container = d3.select(containerId);
    
    if (container.empty()) return null;

    container.selectAll("svg").remove();
    container.style("position", "relative");
    
    return container;
}

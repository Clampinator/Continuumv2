import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Creates a D3 scaleTime instance mapped to the provided date range and pixel bounds.
 * @param {number} minTime - Start timestamp.
 * @param {number} maxTime - End timestamp.
 * @param {Array<number>} range - Pixel [start, end] range.
 * @returns {object} D3 time scale.
 */
export function initializeTimeScale(minTime, maxTime, range) {
    return d3.scaleTime()
        .domain([new Date(minTime), new Date(maxTime)])
        .range(range);
}
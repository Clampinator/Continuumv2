import { convertTimestampToDateString } from '../../span-graph-utils.js';

/**
 * Appends a labeled date input block with map-integrated date picker support.
 * @param {object} container - D3 selection of the HTML overlay.
 * @param {number} dateTs - Initial timestamp.
 * @param {string} labelText - Display label.
 * @returns {object} D3 selection of the text input.
 */
export function createDateInput(container, dateTs, labelText) {
    const dt = convertTimestampToDateString(dateTs);
    const div = container.append("div")
        .style("pointer-events", "all")
        .style("background", "rgba(0,0,0,0.8)")
        .style("padding", "5px")
        .style("border-radius", "4px")
        .style("border", "1px solid #444");

    div.append("label")
        .text(labelText)
        .style("display", "block")
        .style("font-size", "9px")
        .style("color", "#aaa");

    const picker = div.append("div").attr("class", "date-picker-container");
    
    picker.append("input")
        .attr("class", "date-text-input")
        .attr("value", dt.date)
        .style("width", "80px");

    picker.append("i").attr("class", "fas fa-calendar-alt date-picker-icon");
    
    picker.append("input")
        .attr("type", "date")
        .attr("class", "date-picker-hidden")
        .style("opacity", 0);

    return picker.select(".date-text-input");
}

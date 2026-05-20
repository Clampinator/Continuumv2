
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { activateDatePickers } from '../date-picker.js';

export function setupTimeline({ container, svg, width, height, data, sheet, onTimeChange }) {
    const timelineHeight = 50;
    const timelineY = height - timelineHeight;
    const timelineMargin = { left: 140, right: 140 };
    
    const timelineGroup = svg.append("g")
        .attr("class", "network-timeline")
        .attr("transform", `translate(0, ${timelineY})`);

    timelineGroup.append("rect").attr("width", width).attr("height", timelineHeight)
        .attr("fill", "#111");
    timelineGroup.append("line").attr("x1", 0).attr("y1", 0).attr("x2", width).attr("y2", 0)
        .attr("stroke", "#333");

    const timeScale = d3.scaleTime()
        .domain([new Date(data.minTime), new Date(data.maxTime)])
        .range([timelineMargin.left, width - timelineMargin.right]);

    const xAxis = d3.axisBottom(timeScale).ticks(5).tickSize(5).tickFormat(d3.timeFormat("%Y"));
    const axisGroup = timelineGroup.append("g")
        .attr("class", "network-timeline-axis")
        .attr("transform", "translate(0, 10)")
        .call(xAxis);
    
    axisGroup.selectAll("text").attr("fill", "#888").style("font-family", "monospace");
    timelineGroup.selectAll("path, line").attr("stroke", "#444");

    // Scrubber
    let currentViewTime = data.currentViewTime;
    const initialScrubX = timeScale(new Date(currentViewTime));
    
    const scrubberGroup = timelineGroup.append("g")
        .attr("class", "network-scrubber")
        .attr("transform", `translate(${initialScrubX}, 0)`)
        .style("cursor", "ew-resize")
        .call(d3.drag().on("drag", scrubbed));

    scrubberGroup.append("path")
        .attr("d", "M-6,0 L6,0 L6,10 L0,16 L-6,10 Z")
        .attr("fill", "#ffd700").attr("stroke", "#000");
    
    const scrubberLabel = scrubberGroup.append("text")
        .attr("y", -10).attr("text-anchor", "middle").attr("fill", "#ffd700")
        .style("font-family", "monospace").style("font-size", "10px").style("font-weight", "bold")
        .text(d3.timeFormat("%Y-%m-%d")(new Date(currentViewTime)));

    // HTML Controls
    const controlsDiv = container.append("div").attr("class", "network-timeline-controls");
    const minDT = timestampToDateString(data.minTime);
    const maxDT = timestampToDateString(data.maxTime);

    function createControlGroup(cls, date, time) {
        return controlsDiv.append("div").attr("class", `network-control-group ${cls}`)
            .html(`
            <div class="date-picker-container">
                <input type="text" class="date-text-input" value="${date}" placeholder="YYYY-MM-DD" />
                <i class="fas fa-calendar-alt date-picker-icon"></i>
                <input type="date" class="date-picker-hidden" tabindex="-1" />
            </div>
            <input type="time" class="time-input" step="1" value="${time}" />
        `);
    }

    const startGroup = createControlGroup("start-group", minDT.date, minDT.time);
    const endGroup = createControlGroup("end-group", maxDT.date, maxDT.time);

    activateDatePickers($(container.node()));

    // Logic
    function scrubbed(event) {
        const rangeMin = timelineMargin.left;
        const rangeMax = width - timelineMargin.right;
        const x = Math.min(rangeMax, Math.max(rangeMin, event.x));
        const t = timeScale.invert(x);
        currentViewTime = t.getTime();
        
        scrubberGroup.attr("transform", `translate(${x}, 0)`);
        scrubberLabel.text(d3.timeFormat("%Y-%m-%d")(t));
        onTimeChange(currentViewTime);
    }

    let saveTimeout;
    function updateTimelineDomain() {
        const sDate = startGroup.select(".date-text-input").property("value");
        const eDate = endGroup.select(".date-text-input").property("value");
        const sTime = startGroup.select(".time-input").property("value") || "00:00:00";
        const eTime = endGroup.select(".time-input").property("value") || "23:59:59";

        const sTs = new Date(`${normalizeDateInput(sDate)}T${sTime}`).getTime();
        const eTs = new Date(`${normalizeDateInput(eDate)}T${eTime}`).getTime();

        if (!isNaN(sTs) && !isNaN(eTs) && sTs < eTs) {
            timeScale.domain([new Date(sTs), new Date(eTs)]);
            axisGroup.transition().duration(200).call(xAxis);
            
            if (currentViewTime < sTs) currentViewTime = sTs;
            if (currentViewTime > eTs) currentViewTime = eTs;

            const newScrubX = timeScale(new Date(currentViewTime));
            scrubberGroup.attr("transform", `translate(${newScrubX}, 0)`);
            scrubberLabel.text(d3.timeFormat("%Y-%m-%d")(new Date(currentViewTime)));
            
            onTimeChange(currentViewTime);
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                sheet.actor.setFlag('continuum-v2', 'networkTimeline', { start: sTs, end: eTs });
            }, 1000);
        }
    }

    $(controlsDiv.node()).find("input").on("change input", updateTimelineDomain);
    
    // Prevent event bubbling from UI
    timelineGroup.on("mousedown wheel", (e) => e.stopPropagation());
    controlsDiv.on("mousedown wheel", (e) => e.stopPropagation());

    // Initial Update
    onTimeChange(currentViewTime);
    
    return { currentViewTime };
}

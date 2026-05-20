import { initializeTimeScale } from './initialize-time-scale.js';
import { drawTimelineBase } from './draw-timeline-base.js';
import { drawTimeAxis } from './draw-time-axis.js';
import { initializeScrubber } from './initialize-scrubber.js';
import { createDateInput } from './create-date-input.js';
import { injectBoundsControls } from './inject-bounds-controls.js';
import { updateBoundsState } from './update-bounds-state.js';
import { activateDatePickers } from '../../date-picker.js';

/**
 * Sets up the timeline scrubber overlay for the Relationship Map.
 * Coordinates SVG rendering and HTML overlay controls.
 */
export function setupTimeline({ container, svg, width, height, data, sheet, onTimeChange }) {
    const timelineHeight = 50;
    const timelineY = height - timelineHeight;
    const margin = { left: 140, right: 140 };

    // 1. Draw Base structural elements
    const group = drawTimelineBase(svg, width, height, timelineY);

    // 2. Configure mathematical Time Scale
    const timeScale = initializeTimeScale(data.minTime, data.maxTime, [margin.left, width - margin.right]);

    // 3. Draw visual Axis
    const xAxis = drawTimeAxis(group, timeScale);
    const axisGroup = group.select(".network-timeline-axis");

    // 4. Initialize draggable Scrubber
    initializeScrubber({
        group,
        scale: timeScale,
        time: data.currentViewTime,
        bounds: { left: margin.left, right: width - margin.right },
        onDrag: onTimeChange
    });

    // 5. Inject HTML Controls for date bounds
    const controlsContainer = injectBoundsControls(container);
    const minInput = createDateInput(controlsContainer, data.minTime, "START");
    const maxInput = createDateInput(controlsContainer, data.maxTime, "END");

    // 6. Activate Foundry-specific Date Pickers
    activateDatePickers($(container.node()));

    // 7. Bind Logic for bounds updates
    const refreshBounds = () => updateBoundsState({ 
        minInput, maxInput, timeScale, axisGroup, xAxis, sheet 
    });

    minInput.on("change", refreshBounds);
    maxInput.on("change", refreshBounds);

    // 8. Initial trigger for application state
    onTimeChange(data.currentViewTime);
}

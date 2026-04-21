import { renderGraph } from '../../../span-graph-render.js';
import { projectPointOntoSegment } from './project-point-onto-segment.js';
import { SegmentHoverTooltip } from './segment-hover-tooltip.js';

/**
 * RETROSPECTIVE DISCOVERY: Precision Path Hover.
 * Modified for Milestone 4 to interpolate exact Spacetime coordinates on the lifeline path.
 */
export function processHoverState(event, svg, viewState, graphData) {
    // 1. Interactive Element Guard
    // EXEMPTION: The insert ghost itself must NOT trigger the guard, 
    // otherwise it clears the very data (hoveredSegment) needed for the insertion.
    if ((event.target.classList.contains('graph-element-interactive') && !event.target.classList.contains('graph-node-insert-ghost')) ||
        event.target.classList.contains('graph-node-now')) {
        SegmentHoverTooltip.hide();
        if (viewState.hoveredSegment) {
            viewState.hoveredSegment = null;
            requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
        }
        return;
    }

    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let bestSegment = null;
    let minDist = 15; // STRICTURE: Only discover within 15px of history
    let bestP1 = null;
    let bestP2 = null;

    // 2. Scan History Path
    for (let i = 0; i < graphData.levelNodes.length; i++) {
        const p1 = graphData.levelNodes[i];
        const p2 = graphData.levelNodes[i + 1] || graphData.nowNode;

        // Skip vertical jumps for "Discovering" normal events
        if (p1.outgoingType === 'span') continue;

        const x1 = (p1.age * viewState.scaleX) + viewState.x;
        const y1 = (p1.time * viewState.scaleY) + viewState.y;
        const x2 = (p2.age * viewState.scaleX) + viewState.x;
        const y2 = (p2.time * viewState.scaleY) + viewState.y;

        const projection = projectPointOntoSegment(mouseX, mouseY, x1, y1, x2, y2);

        if (projection.dist < minDist) {
            minDist = projection.dist;
            bestP1 = p1;
            bestP2 = p2;
            // Calculate interpolated World Coordinates (Precision Discovery)
            const worldAge = p1.age + (projection.t * (p2.age - p1.age));
            const worldTime = p1.time + (projection.t * (p2.time - p1.time));

            bestSegment = {
                precedingEventId: p1.eventId,
                worldAge,
                worldTime,
                screenX: projection.x,
                screenY: projection.y
            };
        }
    }

    // 3. Visual Feedback
    svg.style.cursor = bestSegment ? 'pointer' : '';

    if (bestSegment && bestP1 && bestP2) {
        const fromTitle = bestP1.eventTitle || 'Birth';
        const toTitle = bestP2.type === 'current' ? 'Subjective Now' : (bestP2.eventTitle || 'Event');
        SegmentHoverTooltip.show(event, fromTitle, bestP1.time, toTitle, bestP2.time);
    } else {
        SegmentHoverTooltip.hide();
    }

    if (JSON.stringify(bestSegment) !== JSON.stringify(viewState.hoveredSegment)) {
        viewState.hoveredSegment = bestSegment;
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
    }
}

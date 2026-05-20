import { openEventNodeDialog } from '../../../span-graph-ui-dialogs.js';

/**
 * Transitions to dialog mode and opens the unified insertion interface.
 * @param {object} viewState 
 * @param {object} graphData 
 * @param {ActorSheet} sheet 
 * @param {SVGElement} svg 
 */
export function handleEventInsertion(viewState, graphData, sheet, svg) {
    const params = { mode: 'insert' };
    
    // AUTHORITY: Use the captured insertion point if available, 
    // falling back to the current hover state.
    const point = viewState.insertionPoint || viewState.hoveredSegment;

    if (point) {
        params.ageRaw = point.worldAge;
        params.timeRaw = point.worldTime;
        params.precedingEventId = point.precedingEventId;
    }

    // Cleanup the capture state
    viewState.insertionPoint = null;

    openEventNodeDialog(sheet, params);
}

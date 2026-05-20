import { renderGraph } from '../../../span-graph-render.js';
import { ClickHandler } from '../../handlers/click-handler.js';

/**
 * Logic for concluding a pan or performing map center transitions on click.
 * @param {PointerEvent} event 
 * @param {SVGElement} svg 
 * @param {ActorSheet} sheet 
 * @param {object} viewState 
 * @param {object} graphData 
 */
export function handlePanningCleanup(event, svg, sheet, viewState, graphData) {
    viewState.interactionMode = 'pan';
    if (!viewState.hasMovedSignificantDistance) {
        ClickHandler.handle(viewState.pointerDownTarget, sheet, false);
    } else {
        renderGraph(svg, viewState, graphData);
    }
}

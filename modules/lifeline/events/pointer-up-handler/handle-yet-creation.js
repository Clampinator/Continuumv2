import { showYetDialog } from '../../../span-graph-ui-dialogs.js';

/**
 * Transitions to dialog mode and opens the Yet creation interface.
 * @param {object} viewState 
 * @param {object} graphData 
 * @param {ActorSheet} sheet 
 * @param {SVGElement} svg 
 */
export function handleYetCreation(viewState, graphData, sheet, svg) {
    viewState.interactionMode = 'dialog-open';
    try {
        showYetDialog(viewState, graphData, sheet, svg);
    } catch (err) {
        console.error("Continuum | showYetDialog (creation) failed:", err);
        viewState.interactionMode = 'pan';
    }
}

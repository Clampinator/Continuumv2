import { getSheetContext } from '../../../span-graph-state.js';
import { processAgeClick } from './process-age-click.js';
import { processExperienceClick } from './process-experience-click.js';
import { processNodeClick } from './process-node-click.js';

/**
 * Top-level click event handler for the Lifeline graph.
 * Routes clicks to specialized processing units.
 */
export function handleClick(target, sheet, isEditRequest = false) {
    if (!target) return;
    const { viewState, graphData } = getSheetContext(sheet);
    
    if (viewState.interactionMode === 'dialog-open') return;

    if (processAgeClick(target, sheet, isEditRequest)) return;
    if (processExperienceClick(target, sheet)) return;
    processNodeClick(target, sheet, isEditRequest, graphData);
}
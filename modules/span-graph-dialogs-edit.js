// continuum/modules/span-graph-dialogs-edit.js
import { getSheetContext } from './span-graph-state.js';
import { openEraEditDialog } from './span-graph-dialog-age.js';
import { openExperienceEditDialog } from './span-graph-dialog-experience.js';
import { openEventDialog } from './lifeline/services/ui/event-dialog/open-event-dialog.js';
import { openGoalEditDialog } from './span-graph-dialog-goal.js';

/*
High-level router to show edit dialog for graph items.
Dispatches to atomic logic modules based on type.
*/
export function openEditDialog(type, data, sheet) {
    const { viewState, graphData } = getSheetContext(sheet);

    // Safety check to prevent recursive dialog spawning
    if (viewState.interactionMode === 'dialog-open') return;

    switch (type) {
        case 'era':
            viewState.interactionMode = 'dialog-open';
            try {
                openEraEditDialog(data, sheet, viewState);
            } catch (err) {
                console.error("Continuum | openEditDialog (era) failed:", err);
                viewState.interactionMode = 'pan';
            }
            break;
        case 'experience':
            viewState.interactionMode = 'dialog-open';
            try {
                openExperienceEditDialog(data, sheet, viewState);
            } catch (err) {
                console.error("Continuum | openEditDialog (experience) failed:", err);
                viewState.interactionMode = 'pan';
            }
            break;
        case 'event':
            // The unified openEventDialog handles its own interactionMode state
            openEventDialog(sheet, {
                mode: 'edit',
                existingData: data
            });
            break;
        default:
            console.error(`Continuum | Unknown dialog type: ${type}`);
            viewState.interactionMode = 'pan';
            break;
    }
}

export function showEditGoalDialog(sheet, goalId, goalData) {
    const { viewState } = getSheetContext(sheet);

    if (viewState.interactionMode === 'dialog-open') return;
    viewState.interactionMode = 'dialog-open';

    try {
        openGoalEditDialog(sheet, goalId, goalData, viewState);
    } catch (err) {
        console.error("Continuum | showEditGoalDialog failed:", err);
        viewState.interactionMode = 'pan';
    }
}

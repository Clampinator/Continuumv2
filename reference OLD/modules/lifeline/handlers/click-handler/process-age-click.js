import { openEditDialog } from '../../../span-graph-dialogs-edit.js';

/*
Processes a click on an Era label.
Returns true if handled.
*/
export function processAgeClick(target, sheet, isEditRequest) {
    if (!target.classList.contains('graph-era-label')) return false;

    // RESTRICTION: Only allow editing if it was a right-click (isEditRequest)
    if (!isEditRequest) return true;

    const eraId = target.getAttribute('data-id');
    const era = sheet.actor.system.eras[eraId];
    if (era) openEditDialog('era', { id: eraId, ...era }, sheet);
    return true;
}
import { openEditDialog } from '../../../span-graph-dialogs-edit.js';

/**
 * Processes a click on an Experience label.
 * @param {HTMLElement} target 
 * @param {ActorSheet} sheet 
 * @returns {boolean} True if handled.
 */
export function processExperienceClick(target, sheet) {
    if (!target.classList.contains('graph-exp-label')) return false;

    const expId = target.getAttribute('data-id');
    const eraId = target.getAttribute('data-era-id');
    const exp = sheet.actor.system.eras[eraId]?.experiences[expId];
    if (exp) openEditDialog('experience', { id: expId, eraId, ...exp }, sheet);
    return true;
}
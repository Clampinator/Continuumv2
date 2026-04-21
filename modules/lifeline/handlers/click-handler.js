import { handleClick } from './click-handler/handle-click.js';

/**
 * Logic for processing clicks on graph elements and routing to the correct action.
 * Decimated into atomic units per ALF Protocol.
 */
export const ClickHandler = {
    /**
     * Identifies the clicked element and performs the appropriate action.
     * @param {HTMLElement} target - The event target.
     * @param {ActorSheet} sheet - The actor sheet instance.
     * @param {boolean} isEditRequest - If true, triggers the edit dialog (Right Click).
     */
    handle(target, sheet, isEditRequest = false) {
        return handleClick(target, sheet, isEditRequest);
    }
};

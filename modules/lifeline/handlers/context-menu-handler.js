
// continuum/modules/lifeline/handlers/context-menu-handler.js
import { ClickHandler } from './click-handler.js';

/**
 * Logic for handling the right-click (context menu) on graph nodes/elements.
 */
export const ContextMenuHandler = {
    /**
     * Executes the context menu logic, preventing browser default and routing to edit handler.
     * @param {Event} event - The contextmenu event.
     * @param {ActorSheet} sheet - The actor sheet instance.
     * @param {object} viewState - The graph's view state.
     */
    handle(event, sheet, viewState) {
        // PREVENTION: Standard browser menu
        event.preventDefault();
        event.stopPropagation();

        // PREVENTION: Do not open if a dialog is already active
        if (viewState.interactionMode === 'dialog-open') return;

        // PREVENTION: Suppress context menu if the user was dragging/panning the map
        if (viewState.hasMovedSignificantDistance) return;
        
        // Route to the shared router with isEditRequest = true
        ClickHandler.handle(event.target, sheet, true);
    }
};

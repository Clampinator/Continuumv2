import { DragTooltipService } from '../../services/ui/drag-tooltip-service.js';

/**
 * Removes global drag tooltips and clears the active reference in viewState.
 * @param {ActorSheet} sheet 
 * @param {object} viewState 
 */
export function cleanupDragTooltips(sheet, viewState) {
    DragTooltipService.destroy(sheet.actor.id);
    viewState.activeTooltipElement = null;
}

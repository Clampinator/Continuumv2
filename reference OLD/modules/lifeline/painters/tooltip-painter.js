/**
 * Handles the rendering of the active drag tooltip during node movement.
 * Note: This painter's logic for the drag-tooltip-group is now bypassed
 * in favor of the HTML-based tooltip defined in _tooltip.md to resolve
 * clipping and z-index issues in Foundry sheets.
 */
export const TooltipPainter = {
    drawDragTooltip(svg, viewState) {
        const group = svg.querySelector('.graph-drag-tooltip-group');
        if (!group) return;

        // Force hide the legacy SVG group
        group.style.display = 'none';
        group.setAttribute('display', 'none');
    }
};
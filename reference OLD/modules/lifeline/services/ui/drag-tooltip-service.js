/**
 * Isolated service for managing the ephemeral HTML drag tooltip.
 * This element is attached directly to document.body to bypass Foundry sheet 
 * overflow clipping and Z-index constraints.
 */
export const DragTooltipService = {
    /**
     * Creates and attaches the tooltip element to the DOM.
     * @param {string} actorId - Unique ID to prevent element collisions.
     * @param {MouseEvent} event - Initial pointer event for positioning.
     * @returns {HTMLElement} The created tooltip element.
     */
    create(actorId, event) {
        // Cleanup existing if any (safety)
        this.destroy(actorId);

        const tooltip = document.createElement('div');
        tooltip.className = 'graph-drag-tooltip-html';
        tooltip.id = `drag-tooltip-${actorId}`;
        
        // Initial positioning
        const offset = 15;
        tooltip.style.left = `${event.clientX + offset}px`;
        tooltip.style.top = `${event.clientY + offset}px`;
        
        document.body.appendChild(tooltip);
        
        // Trigger entrance animation
        requestAnimationFrame(() => tooltip.classList.add('active'));
        
        return tooltip;
    },

    /**
     * Updates the content and position of the tooltip.
     * @param {HTMLElement} el - The tooltip element.
     * @param {MouseEvent} event - The current pointer event.
     * @param {object} data - Data containing lines and warning state.
     */
    update(el, event, data) {
        if (!el || !data || !data.lines) return;

        // 1. Update Position
        const offset = 15;
        el.style.left = `${event.clientX + offset}px`;
        el.style.top = `${event.clientY + offset}px`;

        // 2. Update Content
        el.innerHTML = data.lines.join('<br>');

        // 3. Update Warning State
        if (data.isWarning) el.classList.add('warning');
        else el.classList.remove('warning');
    },

    /**
     * Removes the tooltip from the DOM.
     * @param {string} actorId 
     */
    destroy(actorId) {
        const el = document.getElementById(`drag-tooltip-${actorId}`);
        if (el) el.remove();
    }
};
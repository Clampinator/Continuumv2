/**
 * Handles the logic for dropping a node (Event or Span creation).
 * 
 * @param {Object} viewport - Viewport instance.
 * @param {Object} worldPos - Calculated world {age, time}.
 * @param {string} mode - 'level' or 'span'.
 * @param {boolean} isNow - Whether the NOW node was dragged.
 */
export async function handleNodeDrop(viewport, worldPos, mode, isNow) {
    if (mode === 'span') {
        const { openSpanDialog } = await import('../../../lifeline/services/ui/span-dialog/open-span-dialog.js');
        await openSpanDialog(viewport.actor.sheet, {
            departure: viewport._interaction.startWorld,
            arrival: worldPos
        });
    } else {
        if (!isNow) return; 
        const { openEventDialog } = await import('../../../lifeline/services/ui/event-dialog/open-event-dialog.js'); 
        await openEventDialog(viewport.actor.sheet, { mode: 'log', ageRaw: worldPos.age, timeRaw: worldPos.time });
    }
}

/**
 * Handles opening the Event Edit dialog for a specific node.
 * 
 * @param {Object} sheet - The actor sheet instance.
 * @param {Object} node - The RenderNode being edited.
 */
export async function handleNodeEdit(sheet, node) {
    const { openEventDialog } = await import('../../lifeline/services/ui/event-dialog/open-event-dialog.js');
    await openEventDialog(sheet, { 
        mode: 'edit', 
        existingData: node,
        ageRaw: node.x,
        timeRaw: node.y
    });
}

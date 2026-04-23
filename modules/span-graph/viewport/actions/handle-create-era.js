/**
 * Handles opening the Create Era dialog.
 * 
 * @param {Object} viewport - Viewport instance.
 */
export async function handleCreateEraClick(viewport) {
    const { showCreateEraDialog } = await import('../../span-graph-ui-dialogs.js');
    const duration = 31536000; // 1 year default
    showCreateEraDialog(
        viewport.viewState, 
        {}, 
        viewport.actor.sheet, 
        viewport.svg, 
        duration, 
        Object.values(viewport.actor.system.eras || {})
    );
}

/*
HANDLE CREATE ERA
Dumb pipe: receives drag values from PointerMachine, validates via kernel,
then opens the create era dialog. No business logic here.
*/

import { resolveEraDrag } from '/systems/continuum-v2/modules/temporal-kernel/resolve-era-drag.js';

/**
 * Opens the Create Era dialog with pre-computed drag values.
 * @param {Object} viewport - Viewport instance
 */
export async function handleCreateEraFromDrag(viewport) {
    const interaction = viewport._interaction;
    const startAge = interaction?.startWorld?.eventAge || 0;
    const currentAge = interaction?.currentWorld?.eventAge || 0;

    const result = resolveEraDrag(viewport.actor.system.eras, startAge, currentAge);

    if (!result.isValid) return;

    viewport.viewState.interactionMode = 'dialog-open';
    viewport.viewState.creationStartAgeSeconds = result.startAgeSeconds;
    viewport.viewState.creationCurrentAgeSeconds = currentAge;

    const { showCreateEraDialog } = await import('../../../span-graph-ui-dialogs.js');
    showCreateEraDialog(
        viewport.viewState,
        {},
        viewport.actor.sheet,
        viewport.svg,
        result.durationSeconds,
        Object.values(viewport.actor.system.eras || {}),
        result.isFirstEra
    );
}

/**
 * Legacy handler for simple click on creation bar (no drag).
 * Opens dialog with default 1-year duration.
 */
export async function handleCreateEraClick(viewport) {
    const { showCreateEraDialog } = await import('../../../span-graph-ui-dialogs.js');
    const duration = 31536000;
    showCreateEraDialog(
        viewport.viewState, 
        {}, 
        viewport.actor.sheet, 
        viewport.svg, 
        duration, 
        Object.values(viewport.actor.system.eras || {})
    );
}
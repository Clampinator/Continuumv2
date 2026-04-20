import { showCreateEraDialog } from '../../../span-graph-ui-dialogs.js';
import { SECONDS_IN_DAY } from '../../../span-graph-utils.js';

export function handleEraCreation(viewState, graphData, sheet, svg) {
    const dur = viewState.creationCurrentAgeSeconds - viewState.creationStartAgeSeconds;
    if (dur > SECONDS_IN_DAY) {
        viewState.interactionMode = 'dialog-open';
        try {
            showCreateEraDialog(viewState, graphData, sheet, svg, dur, Object.values(sheet.actor.system.eras || {}));
        } catch (err) {
            console.error("Continuum | showCreateEraDialog failed:", err);
            viewState.interactionMode = 'pan';
        }
    }
}
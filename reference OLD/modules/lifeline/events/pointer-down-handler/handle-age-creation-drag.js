import { Sound } from '/systems/continuum/modules/sound-manager.js';

/*
Initializes Era creation mode from the bottom UI bar.
Returns true if the event was handled.
*/
export function handleEraCreationDrag(event, svg, viewState, graphData) {
    if (event.target.classList.contains('creation-bar-era')) {
        Sound.click();
        viewState.isDragging = true;
        viewState.interactionMode = 'create-era';
        const lastEra = graphData.eras[graphData.eras.length - 1];
        viewState.creationStartAgeSeconds = lastEra ? lastEra.endAgeSeconds : 0;
        viewState.creationCurrentAgeSeconds = viewState.creationStartAgeSeconds;
        if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
        return true;
    }
    return false;
}

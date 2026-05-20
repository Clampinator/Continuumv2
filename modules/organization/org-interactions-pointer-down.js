import { renderOrgGraph } from './org-render.js';
import { Sound } from '../sound-manager.js';

export function handleOrgPointerDown(event, svg, viewState, graphData, sheet) {
    if (viewState.interactionMode === 'dialog-open') return;
    if (!viewState.initialized || (viewState.x === 0 && viewState.y === 0)) return;

    const target = event.target;
    const rect = svg.getBoundingClientRect();

    viewState.pointerDownX = event.clientX;
    viewState.pointerDownY = event.clientY;
    viewState.hasMovedSignificantDistance = false;

    if (target.classList.contains('graph-node-insert-ghost')) {
        Sound.click();
        event.stopPropagation();
        viewState.interactionMode = 'insert-event';
        viewState.isDragging = true;
        svg.setPointerCapture(event.pointerId);
        return;
    }

    if (target.classList.contains('creation-bar-era')) {
        event.stopPropagation();
        viewState.isDragging = true;
        viewState.interactionMode = 'create-phase';
        const lastPhase = graphData.eras.length > 0 ? graphData.eras[graphData.eras.length - 1] : null;
        const startAge = lastPhase ? lastPhase.endAgeSeconds : 0;
        viewState.creationStartAgeSeconds = startAge;
        viewState.creationCurrentAgeSeconds = startAge;
        renderOrgGraph(svg, viewState, graphData);
        svg.setPointerCapture(event.pointerId);
        return;
    }

    if (target.classList.contains('graph-node-yet')) {
        Sound.click();
        event.stopPropagation();
        viewState.isDragging = true;
        viewState.interactionMode = 'drag-yet';
        viewState.activeDragType = 'yet';
        viewState.draggedYetId = target.getAttribute('data-id');
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        viewState.dragCurrentX = pointerX;
        viewState.dragCurrentY = pointerY;
        svg.setPointerCapture(event.pointerId);
        return;
    }

    if (target.closest('.graph-node-now')) {
        if (event.button === 0) {
            Sound.click();
            event.stopPropagation();
            viewState.isDragging = true;
            viewState.interactionMode = 'drag-node';
            viewState.isDragValid = true;

            const activeHead = graphData.nowNode;
            const currentScreenX = (activeHead.age * viewState.scaleX) + viewState.x;
            const currentScreenY = (activeHead.time * viewState.scaleY) + viewState.y;
            viewState.dragStartScreenX = currentScreenX;
            viewState.dragStartScreenY = currentScreenY;
            viewState.dragStartWorld = { ...activeHead };

            renderOrgGraph(svg, viewState, graphData);
            svg.setPointerCapture(event.pointerId);
            return;
        }
    }

    viewState.interactionMode = 'pan';
    viewState.isDragging = true;
    viewState.lastPointerX = event.clientX;
    viewState.lastPointerY = event.clientY;
    viewState.pointerDownTarget = target;
    svg.setPointerCapture(event.pointerId);
    svg.style.cursor = 'grabbing';
}

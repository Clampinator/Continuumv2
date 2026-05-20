import { renderOrgGraph } from './org-render.js';
import { handleOrgHoverLogic } from './org-interactions-hover.js';
import { handleOrgNodeDrag } from './org-interactions-drag.js';

export function handleOrgPointerMove(event, svg, viewState, graphData) {
    if (!viewState.initialized) return;

    const rect = svg.getBoundingClientRect();
    const currentPointerX = event.clientX - rect.left;
    const currentPointerY = event.clientY - rect.top;

    if (!viewState.isDragging) {
        handleOrgHoverLogic(event, svg, viewState, graphData);
        return;
    }

    if (viewState.interactionMode === 'pan' || viewState.interactionMode === 'insert-event') {
        const dx = event.clientX - viewState.lastPointerX;
        const dy = event.clientY - viewState.lastPointerY;

        if (!viewState.hasMovedSignificantDistance) {
            const totalDist = Math.sqrt(Math.pow(event.clientX - viewState.pointerDownX, 2) + Math.pow(event.clientY - viewState.pointerDownY, 2));
            if (totalDist > 5) {
                viewState.hasMovedSignificantDistance = true;
                if (viewState.interactionMode !== 'pan') viewState.interactionMode = 'pan';
            }
        }

        if (viewState.hasMovedSignificantDistance) {
            viewState.x += dx;
            viewState.y += dy;
            viewState.lastPointerX = event.clientX;
            viewState.lastPointerY = event.clientY;
            requestAnimationFrame(() => renderOrgGraph(svg, viewState, graphData));
        }
    } else if (viewState.interactionMode === 'create-phase') {
        const worldAge = (currentPointerX - viewState.x) / viewState.scaleX;
        viewState.creationCurrentAgeSeconds = Math.max(viewState.creationStartAgeSeconds, worldAge);
        requestAnimationFrame(() => renderOrgGraph(svg, viewState, graphData));
    } else if (viewState.interactionMode === 'drag-node') {
        handleOrgNodeDrag(event, rect, svg, viewState, graphData);
    } else if (viewState.interactionMode === 'drag-yet') {
        viewState.dragCurrentX = currentPointerX;
        viewState.dragCurrentY = currentPointerY;
        requestAnimationFrame(() => renderOrgGraph(svg, viewState, graphData));
    }
}

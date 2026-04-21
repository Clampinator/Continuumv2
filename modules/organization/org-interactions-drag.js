import { renderOrgGraph } from './org-render.js';

export function handleOrgNodeDrag(event, rect, svg, viewState, graphData) {
    if (!viewState.initialized) return;

    const currentPointerX = event.clientX - rect.left;
    const currentPointerY = event.clientY - rect.top;
    const dx = currentPointerX - viewState.dragStartScreenX;
    const dy = currentPointerY - viewState.dragStartScreenY;

    const newDragType = Math.abs(dy) > Math.abs(dx) ? 'span' : 'level';
    viewState.activeDragType = newDragType;

    if (viewState.activeDragType === 'span') {
        viewState.dragDirection = (dy < 0) ? 'span-up' : 'span-down';
        const newWorldTime = (currentPointerY - viewState.y) / viewState.scaleY;
        graphData.nowNode.age = viewState.dragStartWorld.age;
        graphData.nowNode.time = newWorldTime;
    } else {
        viewState.dragDirection = 'level';
        let tentativeAge = (currentPointerX - viewState.x) / viewState.scaleX;
        tentativeAge = Math.max(viewState.dragStartWorld.age, tentativeAge);
        const tentativeTime = viewState.dragStartWorld.time + ((tentativeAge - viewState.dragStartWorld.age) * 1000);
        graphData.nowNode.age = tentativeAge;
        graphData.nowNode.time = tentativeTime;
    }

    svg.style.cursor = 'grabbing';
    requestAnimationFrame(() => renderOrgGraph(svg, viewState, graphData));
}

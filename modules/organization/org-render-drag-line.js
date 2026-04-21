export function updateDragLine(svg, viewState, graphData) {
    const dragLine = svg.querySelector('.graph-drag-line');
    if (!dragLine) return;

    if (viewState.isDragging && viewState.interactionMode === 'drag-node') {
        const startX = (viewState.dragStartWorld.age * viewState.scaleX) + viewState.x;
        const startY = (viewState.dragStartWorld.time * viewState.scaleY) + viewState.y;
        const endX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
        const endY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;

        if (Number.isFinite(startX) && Number.isFinite(startY) && Number.isFinite(endX) && Number.isFinite(endY)) {
            dragLine.setAttribute('x1', startX); dragLine.setAttribute('y1', startY);
            dragLine.setAttribute('x2', endX); dragLine.setAttribute('y2', endY);

            const activeTrack = graphData.tracks[viewState.activeUnitId];
            if (activeTrack) dragLine.setAttribute('stroke', activeTrack.color);

            dragLine.style.display = 'block';
        } else {
            dragLine.style.display = 'none';
        }
    } else {
        dragLine.style.display = 'none';
    }
}

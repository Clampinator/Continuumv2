const svgNS = "http://www.w3.org/2000/svg";

/**
 * Manages the visibility and position of the ghost node for event insertion.
 * @param {SVGElement} group - Target SVG container.
 * @param {object} viewState - Current interaction state.
 */
export function updateInsertGhost(group, viewState) {
    const existing = group.querySelector('.graph-node-insert-ghost');
    if (existing) existing.remove();

    if (viewState.hoveredSegment && !viewState.isDragging && viewState.interactionMode !== 'dialog-open') {
        const { screenX, screenY } = viewState.hoveredSegment;
        const ghost = document.createElementNS(svgNS, 'circle');
        ghost.classList.add('graph-node-insert-ghost', 'graph-element-interactive');
        ghost.setAttribute('cx', screenX);
        ghost.setAttribute('cy', screenY);
        ghost.setAttribute('r', 5);
        ghost.setAttribute('fill', 'rgba(255, 255, 255, 0.6)');
        ghost.setAttribute('stroke', '#fff');
        ghost.setAttribute('stroke-width', '1');
        ghost.style.pointerEvents = 'auto'; 
        group.insertBefore(ghost, group.firstChild);
    }
}
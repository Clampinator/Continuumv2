const svgNS = "http://www.w3.org/2000/svg";

/**
 * Updates or creates the lead NOW node representing the character's subjective leading edge.
 * @param {SVGElement} group - The target SVG container group.
 * @param {object} viewState - Current graph camera and interaction state.
 * @param {object} graphData - Prepared lifeline coordinates.
 */
export function updateNowNode(group, viewState, graphData) {
    if (!graphData.nowNode) return;

    const screenX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
    const screenY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
    
    // NaN GUARD: Prevent SVG attribute errors if coordinates are invalid
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return;

    let nowNode = group.querySelector('.graph-node-now');
    if (!nowNode) {
        nowNode = document.createElementNS(svgNS, 'circle');
        nowNode.classList.add('graph-node-now');
        nowNode.setAttribute('r', 6);
        group.appendChild(nowNode);
    }

    // Z-ORDER RESTORATION: Ensure head is always on top by re-appending
    group.appendChild(nowNode);

    // Milestone 5: Visual Collision Feedback
    const isFulfillmentTarget = viewState.isYetFulfillmentTarget;
    const isFulfilling = !!graphData.nowNode.activeYetId && !viewState.isDragging;

    // Change shape or visual intensity during fulfillment hover
    if ((isFulfilling || isFulfillmentTarget) && nowNode.tagName !== 'rect') {
        const newRect = document.createElementNS(svgNS, 'rect');
        newRect.classList.add('graph-node-now', 'square');
        newRect.setAttribute('width', 14);
        newRect.setAttribute('height', 14);
        nowNode.replaceWith(newRect);
        nowNode = newRect;
    } else if (!isFulfilling && !isFulfillmentTarget && nowNode.tagName !== 'circle') {
        const newCircle = document.createElementNS(svgNS, 'circle');
        newCircle.classList.add('graph-node-now');
        newCircle.setAttribute('r', 6);
        nowNode.replaceWith(newCircle);
        nowNode = newCircle;
    }

    // Visual highlights for fulfillment target state
    if (isFulfillmentTarget) {
        nowNode.setAttribute('stroke', '#00f2ff');
        nowNode.setAttribute('stroke-width', '3');
    } else {
        nowNode.setAttribute('stroke', '#fff');
        nowNode.setAttribute('stroke-width', '2');
    }

    const lastLevelNode = graphData.levelNodes[graphData.levelNodes.length - 1];
    if (lastLevelNode) {
        nowNode.setAttribute('data-event-id', lastLevelNode.eventId || '');
        nowNode.setAttribute('data-era-id', lastLevelNode.eraId || '');
        nowNode.setAttribute('data-exp-id', lastLevelNode.expId || '');
        nowNode.classList.add('graph-element-interactive');
    }

    if (nowNode.tagName === 'rect') {
        const size = isFulfillmentTarget ? 14 : 12;
        nowNode.setAttribute('width', size);
        nowNode.setAttribute('height', size);
        nowNode.setAttribute('x', screenX - (size / 2));
        nowNode.setAttribute('y', screenY - (size / 2));
    } else {
        nowNode.setAttribute('cx', screenX);
        nowNode.setAttribute('cy', screenY);
    }
}
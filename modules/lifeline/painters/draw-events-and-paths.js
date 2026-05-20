/**
 * Renders the interactive hit zones for the timeline path and specialized event markers.
 */
export function drawEventsAndPaths(svg, viewState, graphData, hitLayer) {
    if (!hitLayer) return;
    const svgNS = "http://www.w3.org/2000/svg";
    hitLayer.innerHTML = '';

    const points = graphData.levelNodes;
    if (points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1] || graphData.nowNode;

        const x1 = (p1.age * viewState.scaleX) + viewState.x;
        const y1 = (p1.time * viewState.scaleY) + viewState.y;
        const x2 = (p2.age * viewState.scaleX) + viewState.x;
        const y2 = (p2.time * viewState.scaleY) + viewState.y;

        // NAN GUARD
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) continue;

        if (p1.outgoingType !== 'span') {
            const hitLine = document.createElementNS(svgNS, 'line');
            hitLine.setAttribute('x1', x1);
            hitLine.setAttribute('y1', y1);
            hitLine.setAttribute('x2', x2);
            hitLine.setAttribute('y2', y2);
            hitLine.classList.add('graph-hit-path');
            hitLayer.appendChild(hitLine);
        }
    }
}

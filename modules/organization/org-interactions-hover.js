export function handleOrgHoverLogic(event, svg, viewState, graphData) {
    if (!viewState.initialized) return;

    const activeTrackId = viewState.activeUnitId || 'hq';
    const track = graphData.tracks[activeTrackId];
    if (!track || track.nodes.length < 2) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    let closestSegment = null;
    let minDistance = 15;
    const nodes = track.nodes;

    for (let i = 0; i < nodes.length - 1; i++) {
        const nodeA = nodes[i];
        const nodeB = nodes[i + 1];

        const ax = (nodeA.age * viewState.scaleX) + viewState.x;
        const ay = (nodeA.time * viewState.scaleY) + viewState.y;
        const bx = (nodeB.age * viewState.scaleX) + viewState.x;
        const by = (nodeB.time * viewState.scaleY) + viewState.y;

        const dx = bx - ax;
        const dy = by - ay;
        const l2 = dx * dx + dy * dy;
        if (l2 === 0) continue;

        let t = ((pointerX - ax) * dx + (pointerY - ay) * dy) / l2;
        t = Math.max(0, Math.min(1, t));

        const projX = ax + t * dx;
        const projY = ay + t * dy;
        const dist = Math.sqrt(Math.pow(pointerX - projX, 2) + Math.pow(pointerY - projY, 2));

        if (dist < minDistance) {
            minDistance = dist;
            closestSegment = {
                index: graphData.levelNodes.indexOf(nodeA),
                worldAge: nodeA.age + (t * (nodeB.age - nodeA.age)),
                worldTime: nodeA.time + (t * (nodeB.time - nodeA.time)),
                screenX: projX,
                screenY: projY
            };
        }
    }

    viewState.hoveredSegment = closestSegment;

    const ghost = svg.querySelector('.graph-node-insert-ghost');
    if (closestSegment) {
        if (!ghost) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
            g.classList.add('graph-node-insert-ghost');
            g.setAttribute('r', 6);
            svg.querySelector('.graph-nodes-group').appendChild(g);
        }
        svg.querySelector('.graph-node-insert-ghost').setAttribute('cx', closestSegment.screenX);
        svg.querySelector('.graph-node-insert-ghost').setAttribute('cy', closestSegment.screenY);
    } else if (ghost) {
        ghost.remove();
    }
}

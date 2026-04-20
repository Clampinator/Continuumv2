const svgNS = "http://www.w3.org/2000/svg";

export function drawUnitHeads(nodesGroup, viewState, graphData, track, points, isActive) {
    let headAge = track.head.age;
    let headTime = track.head.time;

    if (isActive && viewState.isDragging && viewState.interactionMode === 'drag-node') {
        headAge = graphData.nowNode.age;
        headTime = graphData.nowNode.time;
    }

    const hx = (headAge * viewState.scaleX) + viewState.x;
    const hy = (headTime * viewState.scaleY) + viewState.y;

    if (!Number.isFinite(hx) || !Number.isFinite(hy)) return;

    const headBg = document.createElementNS(svgNS, 'circle');
    headBg.setAttribute('cx', hx);
    headBg.setAttribute('cy', hy);
    headBg.setAttribute('r', isActive ? 14 : 7);
    headBg.setAttribute('fill', track.color);
    headBg.setAttribute('stroke', '#fff');
    headBg.setAttribute('stroke-width', isActive ? 2 : 1);
    if (isActive) headBg.classList.add('graph-node-now');
    nodesGroup.appendChild(headBg);

    if (isActive) {
        let iconCode = "\uf1ad";
        switch(track.type) {
            case 'physical': iconCode = "\uf6de"; break;
            case 'espionage': iconCode = "\uf21b"; break;
            case 'online': iconCode = "\uf5fc"; break;
            case 'psyops': iconCode = "\uf61f"; break;
        }

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', hx);
        text.setAttribute('y', hy + 1);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-family', '"Font Awesome 5 Free", "Font Awesome 6 Free"');
        text.setAttribute('font-weight', '900');
        text.setAttribute('font-size', '14px');
        text.style.pointerEvents = 'none';
        text.textContent = iconCode;
        nodesGroup.appendChild(text);
    }
}

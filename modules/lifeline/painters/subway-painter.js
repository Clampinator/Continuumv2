const svgNS = "http://www.w3.org/2000/svg";

/**
 * Ensures a circular <clipPath> for a given unit ID exists in the SVG <defs>.
 * The clipPath is a unit circle at the origin — the caller translates via a <g>.
 */
function ensureClipPath(svg, unitId) {
    const clipId = `unit-logo-clip-${unitId}`;
    if (svg.querySelector(`#${clipId}`)) return clipId;

    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(svgNS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    const clip = document.createElementNS(svgNS, 'clipPath');
    clip.setAttribute('id', clipId);
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', '0'); c.setAttribute('cy', '0'); c.setAttribute('r', '14');
    clip.appendChild(c);
    defs.appendChild(clip);
    return clipId;
}

export const SubwayPainter = {
    render(pathLayer, nodesGroup, viewState, graphData) {
        pathLayer.innerHTML = '';
        const existingNodes = nodesGroup.querySelectorAll('.subway-node');
        existingNodes.forEach(n => n.remove());

        const svg = nodesGroup.closest('svg');
        const tracks = graphData.tracks || {};

        Object.values(tracks).forEach(track => {
            const isActive = track.id === viewState.activeUnitId;
            // When no activeUnitId is set (e.g. org lifeline), treat all tracks as active.
            const opacityClass = isActive ? 'active' : (viewState.activeUnitId ? 'dimmed' : 'active');
            // Node interactivity follows the same rule as path opacity.
            const nodeIsActive = opacityClass === 'active';

            const allPoints = [...track.nodes];
            if (track.headNode) allPoints.push(track.headNode);

            // ── Track paths ──────────────────────────────────────────────────
            for (let i = 0; i < allPoints.length - 1; i++) {
                const p1 = allPoints[i], p2 = allPoints[i+1];
                const x1 = (p1.age * viewState.scaleX) + viewState.x;
                const y1 = (p1.time * viewState.scaleY) + viewState.y;
                const x2 = (p2.age * viewState.scaleX) + viewState.x;
                const y2 = (p2.time * viewState.scaleY) + viewState.y;

                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
                path.classList.add('subway-path', opacityClass);
                path.style.stroke = track.color;
                if (p1.outgoingType === 'span') path.classList.add('is-span');
                pathLayer.appendChild(path);
            }

            // ── Nodes ────────────────────────────────────────────────────────
            allPoints.forEach((node, idx) => {
                const cx = (node.age * viewState.scaleX) + viewState.x;
                const cy = (node.time * viewState.scaleY) + viewState.y;
                const isHead = (idx === allPoints.length - 1);

                if (isHead && track.logo && svg) {
                    // ── Logo head node ────────────────────────────────────────
                    const clipId = ensureClipPath(svg, track.id);

                    // Colored ring behind the image
                    const ring = document.createElementNS(svgNS, 'circle');
                    ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
                    ring.setAttribute('r', '16');
                    ring.setAttribute('data-unit-id', track.id);
                    if (node.engId) ring.setAttribute('data-eng-id', node.engId);
                    ring.classList.add('subway-node');
                    ring.style.fill   = track.color;
                    ring.style.stroke = '#fff';
                    ring.style.strokeWidth = '2';
                    if (nodeIsActive) ring.classList.add('active', 'active-head', 'graph-node-now');
                    else              ring.classList.add('dimmed');
                    nodesGroup.appendChild(ring);

                    // Logo image clipped to a circle
                    const img = document.createElementNS(svgNS, 'image');
                    img.setAttribute('href', track.logo);
                    img.setAttribute('x',  cx - 14);
                    img.setAttribute('y',  cy - 14);
                    img.setAttribute('width',  '28');
                    img.setAttribute('height', '28');
                    img.setAttribute('clip-path', `url(#${clipId})`);
                    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
                    img.setAttribute('data-unit-id', track.id);
                    if (node.engId) img.setAttribute('data-eng-id', node.engId);
                    img.classList.add('subway-node');
                    if (!nodeIsActive) img.classList.add('dimmed');
                    nodesGroup.appendChild(img);

                } else {
                    // ── Default circle node ───────────────────────────────────
                    const station = document.createElementNS(svgNS, 'circle');
                    station.setAttribute('cx', cx); station.setAttribute('cy', cy);
                    station.setAttribute('data-unit-id', track.id);
                    if (node.engId) station.setAttribute('data-eng-id', node.engId);
                    station.classList.add('subway-node');
                    station.style.stroke = track.color;

                    if (nodeIsActive) {
                        station.classList.add('active');
                        // Head nodes get white fill so they read as distinct from
                        // regular engagement nodes (CSS active-head handles the rest).
                        station.style.fill = isHead ? '#fff' : track.color;
                        if (isHead) station.classList.add('active-head', 'graph-node-now');
                    } else {
                        station.style.fill = '#fff';
                        station.classList.add('dimmed');
                    }
                    nodesGroup.appendChild(station);
                }
            });
        });
    }
};

import { drawUnitHeads } from './org-render-unit-heads.js';

const svgNS = "http://www.w3.org/2000/svg";

export function updateSubwayPaths(svg, viewState, graphData) {
    const pathLayer = svg.querySelector('.graph-path-layer');
    const nodesGroup = svg.querySelector('.graph-nodes-group');
    if (!pathLayer || !nodesGroup) return;

    while (pathLayer.firstChild) pathLayer.removeChild(pathLayer.firstChild);
    while (nodesGroup.firstChild) nodesGroup.removeChild(nodesGroup.firstChild);

    const activeId = viewState.activeUnitId;

    Object.values(graphData.tracks).forEach(track => {
        const isActive = (track.id === activeId);
        const points = [];

        track.nodes.forEach(node => {
            const px = (node.age * viewState.scaleX) + viewState.x;
            const py = (node.time * viewState.scaleY) + viewState.y;
            points.push({ x: px, y: py, data: node });
        });

        let headAge = track.head.age;
        let headTime = track.head.time;
        if (isActive && viewState.isDragging && viewState.interactionMode === 'drag-node') {
            headAge = graphData.nowNode.age;
            headTime = graphData.nowNode.time;
        }
        const hx = (headAge * viewState.scaleX) + viewState.x;
        const hy = (headTime * viewState.scaleY) + viewState.y;
        points.push({ x: hx, y: hy, isHead: true });

        // Draw path
        if (points.length > 1) {
            let d = "";
            let valid = 0;
            points.forEach(p => {
                if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
                    d += (valid === 0) ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
                    valid++;
                }
            });
            if (valid > 1) {
                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', d);
                path.setAttribute('stroke', track.color);
                path.classList.add('subway-path');
                if (isActive) path.classList.add('active');
                else path.classList.add('dimmed');
                pathLayer.appendChild(path);
            }
        }

        // Draw history nodes
        points.forEach(p => {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
            if (p.isHead) return;

            if (p.data && p.data.eventId && viewState.highlightedNodeIds && viewState.highlightedNodeIds.has(p.data.eventId)) {
                const h = document.createElementNS(svgNS, 'rect');
                h.setAttribute('x', p.x - 12); h.setAttribute('y', p.y - 12);
                h.setAttribute('width', 24); h.setAttribute('height', 24);
                h.setAttribute('rx', 4);
                h.classList.add('node-sync-highlight');
                nodesGroup.appendChild(h);
            }

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.classList.add('subway-node');

            if (isActive) {
                circle.classList.add('active');
                circle.setAttribute('fill', track.color);
                circle.classList.add('graph-element-interactive');
                if (p.data) {
                    circle.setAttribute('data-track-id', track.id);
                    circle.setAttribute('data-event-id', p.data.eventId || '');
                    circle.setAttribute('data-era-id', p.data.eraId || '');
                    circle.setAttribute('data-exp-id', p.data.expId || '');
                }
            } else {
                circle.classList.add('dimmed');
                circle.setAttribute('fill', track.color);
            }
            nodesGroup.appendChild(circle);
        });

        drawUnitHeads(nodesGroup, viewState, graphData, track, points, isActive);
    });
}

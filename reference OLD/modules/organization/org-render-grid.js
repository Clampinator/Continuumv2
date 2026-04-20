import { SECONDS_IN_YEAR, MS_IN_YEAR } from '../span-graph-utils.js';

const svgNS = "http://www.w3.org/2000/svg";

export function drawGrid(group, width, height, viewState) {
    group.innerHTML = '';

    // X-Axis Grid (Age)
    const pixelsPerGridX = SECONDS_IN_YEAR * viewState.scaleX;
    if (pixelsPerGridX > 5) {
        const startX = Math.floor(-viewState.x / (SECONDS_IN_YEAR * viewState.scaleX));
        const endX = Math.ceil((width - viewState.x) / (SECONDS_IN_YEAR * viewState.scaleX));

        for (let i = startX; i <= endX; i++) {
            const x = (i * SECONDS_IN_YEAR * viewState.scaleX) + viewState.x;
            if (x < -1 || x > width + 1) continue;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x); line.setAttribute('y1', 0);
            line.setAttribute('x2', x); line.setAttribute('y2', height);
            const isMajor = (i % 10 === 0);
            line.setAttribute('stroke', isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)');
            line.setAttribute('stroke-width', 1);
            group.appendChild(line);
        }
    }

    // Y-Axis Grid (Time)
    const pixelsPerGridY = MS_IN_YEAR * Math.abs(viewState.scaleY);
    if (pixelsPerGridY > 5) {
        const gridOffsetY = viewState.y % pixelsPerGridY;

        for (let y = gridOffsetY; y < height; y += pixelsPerGridY) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', 0); line.setAttribute('y1', y);
            line.setAttribute('x2', width); line.setAttribute('y2', y);

            const worldY = (y - viewState.y) / viewState.scaleY;
            const approxYear = Math.round(worldY / MS_IN_YEAR);
            const isMajor = (approxYear % 10 === 0);

            line.setAttribute('stroke', isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)');
            line.setAttribute('stroke-width', 1);
            group.appendChild(line);
        }
    }
}

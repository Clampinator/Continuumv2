import { SECONDS_IN_YEAR, MS_IN_YEAR } from '../../../span-graph-utils.js';

const svgNS = "http://www.w3.org/2000/svg";

/**
 * Renders the background grid lines for both Age and Time axes.
 * @param {SVGElement} group 
 * @param {number} width 
 * @param {number} height 
 * @param {object} viewState 
 */
export function drawGridLines(group, width, height, viewState) {
    group.innerHTML = '';
    const pixelsPerGridX = SECONDS_IN_YEAR * viewState.scaleX;
    if (pixelsPerGridX > 0.1) {
        const gridOffsetX = viewState.x > 0 ? (viewState.x % pixelsPerGridX) - pixelsPerGridX : (viewState.x % pixelsPerGridX);
        for (let x = gridOffsetX; x < width; x += pixelsPerGridX) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x); line.setAttribute('y1', 0);
            line.setAttribute('x2', x); line.setAttribute('y2', height);
            const worldX = (x - viewState.x) / viewState.scaleX;
            const years = Math.round(worldX / SECONDS_IN_YEAR);
            const isMajor = years % 10 === 0;
            line.setAttribute('stroke-opacity', isMajor ? '0.3' : '0.1');
            group.appendChild(line);
        }
    }

    const pixelsPerGridY = MS_IN_YEAR * Math.abs(viewState.scaleY);
    if (pixelsPerGridY > 0.1) {
        const gridOffsetY = viewState.y > 0 ? (viewState.y % pixelsPerGridY) - pixelsPerGridY : (viewState.y % pixelsPerGridY);
        for (let y = gridOffsetY; y < height; y += pixelsPerGridY) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', 0); line.setAttribute('y1', y);
            line.setAttribute('x2', width); line.setAttribute('y2', y);
            const worldY = (y - viewState.y) / viewState.scaleY;
            const years = Math.round(worldY / MS_IN_YEAR);
            const isMajor = years % 10 === 0;
            line.setAttribute('stroke-opacity', isMajor ? '0.3' : '0.1');
            group.appendChild(line);
        }
    }
}
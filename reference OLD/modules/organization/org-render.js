import { drawGrid } from './org-render-grid.js';
import { updateAxisLabels } from './org-render-axis.js';
import { updateUnitSelector } from './org-render-unit-selector.js';
import { updateSubwayPaths } from './org-render-subway.js';
import { updateDragLine } from './org-render-drag-line.js';
import { drawPhases } from './org-render-phases.js';
import { drawOperations } from './org-render-operations.js';

const svgNS = "http://www.w3.org/2000/svg";

function drawGuides(guidesGroup, svg, width, height, viewState, graphData) {
    guidesGroup.innerHTML = '';
    if (!graphData.nowNode) return;

    const sx = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
    const sy = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;

    const v = document.createElementNS(svgNS, 'line');
    v.setAttribute('x1', sx); v.setAttribute('y1', 0); v.setAttribute('x2', sx); v.setAttribute('y2', height);
    v.classList.add('graph-guide-line');
    guidesGroup.appendChild(v);

    const h = document.createElementNS(svgNS, 'line');
    h.setAttribute('x1', 0); h.setAttribute('y1', sy); h.setAttribute('x2', width); h.setAttribute('y2', sy);
    h.classList.add('graph-guide-line');
    guidesGroup.appendChild(h);
}

export function renderOrgGraph(svg, viewState, graphData) {
    if (!svg || !viewState || !graphData) return;

    const rect = svg.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    if (!Number.isFinite(viewState.x) || (viewState.x === 0 && !viewState.initialized)) viewState.x = width / 2;
    if (!Number.isFinite(viewState.y) || (viewState.y === 0 && !viewState.initialized)) viewState.y = height / 2;
    if (!Number.isFinite(viewState.scaleX) || viewState.scaleX === 0) viewState.scaleX = 0.000005;
    if (!Number.isFinite(viewState.scaleY) || viewState.scaleY === 0) viewState.scaleY = -0.00000000288;

    const gridGroup = svg.querySelector('.graph-grid-lines');
    if (gridGroup) drawGrid(gridGroup, width, height, viewState);

    const labelGroup = svg.querySelector('.graph-labels-group');
    if (labelGroup) {
        labelGroup.innerHTML = '';
        drawPhases(svg, width, height, viewState, graphData, labelGroup);
        drawOperations(svg, width, height, viewState, graphData, labelGroup);
    }

    const axisGroup = svg.querySelector('.graph-axis-labels');
    if (axisGroup) updateAxisLabels(axisGroup, width, height, viewState);

    const guidesGroup = svg.querySelector('.graph-guides-group');
    if (guidesGroup) drawGuides(guidesGroup, svg, width, height, viewState, graphData);

    updateSubwayPaths(svg, viewState, graphData);
    updateDragLine(svg, viewState, graphData);

    if (typeof $ !== 'undefined') {
        const sheetEl = $(svg).closest('.organization-sheet-form');
        if (sheetEl.length) updateUnitSelector({ element: sheetEl }, graphData, viewState);
    }
}

import { renderOrgGraph } from './org-render.js';
import { attachMandateListeners } from './org-graph-interactions-mandates.js';
import { attachTooltipListeners } from '../span-graph-interactions-tooltips.js';
import { handleOrgPointerDown } from './org-interactions-pointer-down.js';
import { handleOrgPointerMove } from './org-interactions-pointer-move.js';
import { handleOrgPointerUp } from './org-interactions-pointer-up.js';
import { attachOrgKeyboardAndMapListeners } from './org-interactions-keyboard.js';

export function attachOrgListeners(svg, sheet, viewState, graphData) {
    const html = sheet.element;

    attachMandateListeners(html, svg, sheet, viewState, graphData);
    attachTooltipListeners(svg, graphData);
    attachOrgKeyboardAndMapListeners(svg, sheet, viewState, graphData);

    html.find('#org-unit-selector-container').on('click', '.unit-selector-chip', (e) => {
        const unitId = e.currentTarget.dataset.unitId;
        if (unitId && graphData.tracks[unitId]) {
            viewState.activeUnitId = unitId;
            graphData.nowNode = graphData.tracks[unitId].head;
            renderOrgGraph(svg, viewState, graphData);
        }
    });

    svg.addEventListener('wheel', (event) => {
        const wrapper = html.find('.span-graph-wrapper');
        if (wrapper.hasClass('map-mode')) return;
        event.preventDefault();
        if (!viewState.initialized) return;

        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

        const worldX = (mouseX - viewState.x) / viewState.scaleX;
        const worldY = (mouseY - viewState.y) / viewState.scaleY;

        viewState.scaleX *= zoomFactor;
        viewState.scaleY *= zoomFactor;
        viewState.x = mouseX - (worldX * viewState.scaleX);
        viewState.y = mouseY - (worldY * viewState.scaleY);

        requestAnimationFrame(() => renderOrgGraph(svg, viewState, graphData));
    });

    svg.addEventListener('pointerdown', (event) => handleOrgPointerDown(event, svg, viewState, graphData, sheet));
    svg.addEventListener('pointermove', (event) => handleOrgPointerMove(event, svg, viewState, graphData));
    svg.addEventListener('pointerup', (event) => handleOrgPointerUp(event, svg, viewState, graphData, sheet));
}

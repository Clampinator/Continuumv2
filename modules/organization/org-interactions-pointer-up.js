import { renderOrgGraph } from './org-render.js';
import { panToCoordinates } from '../map-manager.js';
import { SECONDS_IN_DAY } from '../span-graph-utils.js';
import { showCreatePhaseDialog, showInsertEngagementDialog, showLogEngagementDialog, showYetDialog, openEditDialog } from './org-graph-dialogs.js';

export function handleOrgPointerUp(event, svg, viewState, graphData, sheet) {
    if (event.pointerId) svg.releasePointerCapture(event.pointerId);

    const mode = viewState.interactionMode;
    viewState.isDragging = false;
    svg.style.cursor = viewState.interactionMode === 'dialog-open' ? 'default' : 'grab';

    if (mode === 'insert-event' && !viewState.hasMovedSignificantDistance && viewState.hoveredSegment) {
        showInsertEngagementDialog(viewState, graphData, sheet, svg);
        return;
    }

    if (mode === 'create-phase') {
        const durationSeconds = viewState.creationCurrentAgeSeconds - viewState.creationStartAgeSeconds;
        if (durationSeconds > SECONDS_IN_DAY) {
            const sortedPhases = Object.values(sheet.actor.system.phases || {}).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
            showCreatePhaseDialog(viewState, graphData, sheet, svg, durationSeconds, sortedPhases);
            return;
        }
    }

    if (mode === 'drag-node') {
        const currentScreenX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
        const currentScreenY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
        const movedDist = Math.abs(currentScreenX - viewState.dragStartScreenX) + Math.abs(currentScreenY - viewState.dragStartScreenY);

        if (movedDist > 5) {
            showLogEngagementDialog(viewState, graphData, sheet, svg);
        } else {
            graphData.nowNode = { ...viewState.dragStartWorld };
            const lastNode = graphData.tracks[viewState.activeUnitId || 'hq'].nodes.slice(-1)[0];
            if (lastNode && lastNode.lat && lastNode.lng) {
                panToCoordinates(lastNode.lat, lastNode.lng, lastNode.zoom);
            }
            viewState.interactionMode = 'pan';
            renderOrgGraph(svg, viewState, graphData);
        }
        return;
    }

    if (mode === 'drag-yet') {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (graphData.nowNode) {
            const nx = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
            const ny = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
            const dist = Math.sqrt(Math.pow(mouseX - nx, 2) + Math.pow(mouseY - ny, 2));

            if (dist < 25) {
                const yetId = viewState.draggedYetId;
                sheet.actor.update({ [`system.theYet.${yetId}.done`]: true });
                ui.notifications.info("Yet Fulfilled!");
                sheet.render();
                return;
            }
        }

        const dragDist = Math.sqrt(Math.pow(event.clientX - viewState.pointerDownX, 2) + Math.pow(event.clientY - viewState.pointerDownY, 2));
        if (dragDist < 5) {
            const yetId = viewState.draggedYetId;
            const yetData = sheet.actor.system.theYet[yetId];
            showYetDialog(viewState, graphData, sheet, svg, { id: yetId, ...yetData });
        }

        viewState.interactionMode = 'pan';
        viewState.draggedYetId = null;
        renderOrgGraph(svg, viewState, graphData);
        return;
    }

    if (mode === 'pan' && !viewState.hasMovedSignificantDistance && viewState.pointerDownTarget) {
        const target = viewState.pointerDownTarget;
        if (target.closest('.graph-node-level') && event.button === 2) {
            const node = target.closest('.graph-node-level');
            const eventId = node.getAttribute('data-event-id');
            const phaseId = node.getAttribute('data-era-id');
            const opId = node.getAttribute('data-exp-id');
            if (eventId) {
                const engagement = sheet.actor.system.phases[phaseId]?.operations[opId]?.engagements[eventId];
                if (engagement) {
                    openEditDialog('engagement', { ...engagement, id: eventId, phaseId, opId }, sheet);
                }
            }
        }
    }

    viewState.interactionMode = 'pan';
    viewState.creationStartAgeSeconds = 0;
    viewState.creationCurrentAgeSeconds = 0;
    renderOrgGraph(svg, viewState, graphData);
}

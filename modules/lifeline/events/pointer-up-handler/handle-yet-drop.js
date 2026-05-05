import { insertHistoryRow } from '/systems/continuum-v2/modules/state/insert-history-row.js';
import { markYetFulfilled } from '/systems/continuum-v2/modules/state/mark-yet-fulfilled.js';
import { Sound } from '../../../sound-manager.js';
import { showYetDialog } from '../../../span-graph-ui-dialogs.js';

export async function handleYetDrop(event, svg, sheet, viewState, graphData) {
    const rect = svg.getBoundingClientRect();
    const mx = event.clientX - rect.left, my = event.clientY - rect.top;
    let targetNode = null, minDist = 25;

    // 1. Collision Check: Is the Yet node being dropped on the "Now" head?
    if (graphData.nowNode) {
        const nx = (graphData.nowNode.age * viewState.scaleX) + viewState.x, ny = (graphData.nowNode.time * viewState.scaleY) + viewState.y;
        if (Math.hypot(mx-nx, my-ny) < minDist) targetNode = { ...graphData.nowNode, isNow: true };
    }

    // Reset collision state immediately
    viewState.isYetFulfillmentTarget = false;

    if (targetNode) {
        // MILESTONE 5: FULFILLMENT LOOP
        const yetId = viewState.draggedYetId;
        const yetData = sheet.actor.system.theYet[yetId];
        const now = graphData.nowNode;

        // Identify context for era/expId via the last node
        const lastNode = graphData.levelNodes[graphData.levelNodes.length - 1];
        const targetEraId = lastNode?.eraId || Object.keys(sheet.actor.system.eras || {})[0];
        const targetExpId = lastNode?.expId || null;

        // Create the fulfillment event via State layer
        const record = {
            eventTitle: `Fulfillment: ${yetData.description}`,
            eventNotes: 'Closed the spacetime loop by fulfilling the Yet.',
            eventAge: now.age,
            eventIsSpan: false,
            eraId: targetEraId,
            expId: targetExpId,
            isYetFulfillment: true
        };

        await insertHistoryRow(sheet.actor, record);
        await markYetFulfilled(sheet.actor, yetId);

        Sound.confirm();
        ui.notifications.info(`Loop Closed: "${yetData.description}" fulfilled.`);

        viewState.interactionMode = 'pan';
        sheet.render();
    } else if (!viewState.hasMovedSignificantDistance) {
        // Standard Edit Dialog if not dropped on Now and not a drag
        viewState.interactionMode = 'dialog-open';
        try {
            showYetDialog(viewState, graphData, sheet, svg, { id: viewState.draggedYetId, ...sheet.actor.system.theYet[viewState.draggedYetId] });
        } catch (err) {
            console.error("Continuum | showYetDialog (drop) failed:", err);
            viewState.interactionMode = 'pan';
        }
    }
}
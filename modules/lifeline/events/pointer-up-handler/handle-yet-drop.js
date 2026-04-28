import { Sound } from '../../../sound-manager.js';
import { showYetDialog } from '../../../span-graph-ui-dialogs.js';
import { reindexLifelineNodes } from '../../services/chronology/reindex-lifeline-nodes.js';
import { convertTimestampToDateString } from '../../../span-graph-utils.js';

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
        // --- MILESTONE 5: FULFILLMENT LOOP ---
        const yetId = viewState.draggedYetId;
        const yetData = sheet.actor.system.theYet[yetId];
        const newEventId = foundry.utils.randomID();
        const now = graphData.nowNode;
        const dt = convertTimestampToDateString(now.time);

        // A. Resolve Address for the new fulfillment node
        const reindex = reindexLifelineNodes(sheet.actor, newEventId, -1, { age: now.age, time: now.time });
        const finalSort = reindex.targetSortValue;
        delete reindex.targetSortValue;

        // B. Prepare Fulfillment Event
        const newEvent = {
            id: newEventId,
            eventTitle: `Fulfillment: ${yetData.description}`,
            eventNotes: "Closed the spacetime loop by fulfilling the Yet.",
            age: now.age,
            date: dt.date,
            time: dt.time,
            isYetFulfillment: true,
            sort: finalSort
        };

        // C. Identify context for historical record
        // Fallback to the latest era if no specific experience is active
        const lastNode = graphData.levelNodes[graphData.levelNodes.length - 1];
        const targetEraId = lastNode?.eraId || Object.keys(sheet.actor.system.eras || {})[0];
        const targetExpId = lastNode?.expId || null;

        const path = targetExpId
            ? `system.eras.${targetEraId}.experiences.${targetExpId}.events.${newEventId}`
            : `system.eras.${targetEraId}.events.${newEventId}`;

        const updates = {
            ...reindex,
            [path]: newEvent,
            [`system.theYet.${yetId}.done`]: true
        };

        await sheet.actor.update(updates);
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

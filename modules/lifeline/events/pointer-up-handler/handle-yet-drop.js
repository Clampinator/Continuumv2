import { fulfillYetCommand } from '/systems/continuum-v2/modules/temporal-engine/commands/fulfill-yet.js';
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
        const yetId = viewState.draggedYetId;
        const yetData = sheet.actor.system.theYet?.[yetId];
        if (!yetData) return;

        // Build nowNode in legacy {age, time} format; the Engine command
        // normalizes via x ?? age so both shapes work
        const lastNode = graphData.levelNodes[graphData.levelNodes.length - 1];
        const nowNode = {
            age: graphData.nowNode.age,
            time: graphData.nowNode.time,
            eraId: lastNode?.eraId || Object.keys(sheet.actor.system.eras || {})[0],
            expId: lastNode?.expId || null
        };

        await fulfillYetCommand(sheet.actor, yetId, nowNode);

        Sound.confirm();
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
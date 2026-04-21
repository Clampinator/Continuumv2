import { renderGraph } from '../../../span-graph-render.js';
import { ClickHandler } from '../../handlers/click-handler.js';

// IMPORTANT: Use the project's *actual* unified dialog pipeline.
// This is the one that calls handleSubmit() which writes the event node.
import { openEventDialog } from '../../services/ui/event-dialog/open-event-dialog.js';

/**
 * Handles the logic when the NOW node is released.
 * Persists manual drafting coordinates and opens the log dialog.
 *
 * FIX:
 * - Do NOT attempt to create the event node here.
 * - The event node is created by the dialog submit handler (handleSubmit).
 * - We MUST pass the dropped coordinates into the dialog as ageRaw/timeRaw
 *   so the committed node appears exactly where you dropped it.
 */
export async function handleNodeDrop(event, svg, sheet, viewState, graphData) {
    const currentScreenX = (graphData.nowNode.age * viewState.scaleX) + viewState.x;
    const currentScreenY = (graphData.nowNode.time * viewState.scaleY) + viewState.y;

    const movedDist = Math.hypot(
        currentScreenX - viewState.dragStartScreenX,
        currentScreenY - viewState.dragStartScreenY
    );

    // VALID DROP
    if (movedDist > 5 && viewState.isDragValid) {
        // 1) Open dialog that *creates* the node on save.
        //    The critical part: pass the dropped coordinates so handleSubmit uses them.
        await openEventDialog(sheet, {
            mode: 'log',
            ageRaw: graphData.nowNode.age,
            timeRaw: graphData.nowNode.time,
            graphData
        });

        // Return without forcing re-render; dialog pipeline will re-render on submit.
        return;
    }

    // INVALID / TOO SMALL: revert
    graphData.nowNode.age = viewState.dragStartWorld.age;
    graphData.nowNode.time = viewState.dragStartWorld.time;

    if (movedDist <= 5) {
        ClickHandler.handle(viewState.pointerDownTarget, sheet, false);
    }

    viewState.interactionMode = 'pan';
    renderGraph(svg, viewState, graphData);
}

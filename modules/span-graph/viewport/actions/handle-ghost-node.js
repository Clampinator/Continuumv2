import { flattenEvents } from '../../../span-graph-data-processor.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';
import { projectPointToSegment } from '/systems/continuum-v2/modules/temporal-kernel/project-point-to-segment.js';
import { interpolateWorldCoordinates } from '/systems/continuum-v2/modules/temporal-kernel/interpolate-world-coordinates.js';

/**
 * Updates the ghost node position based on the nearest rail segment.
 */
export function updateGhostNodeHover(viewport, mouseX, mouseY) {
    const history = flattenEvents(viewport.actor.system.eras || {}, viewport.actor);
    const subjectiveNow = Number(viewport.actor.system.personal?.subjectiveNow) || 0;
    const originTime = viewport._getOriginTime();
    const state = getTemporalState(history, subjectiveNow, originTime, viewport.actor);
    
    let nearest = null;
    let minDist = 20;

    for (const segment of state.segments) {
        const w1 = { age: segment.startX, time: segment.startY };
        let w2;
        if (segment.exitPoint) {
            w2 = { age: segment.exitPoint.x, time: segment.exitPoint.y };
        } else {
            w2 = { age: state.nowNode.x, time: state.nowNode.y };
        }

        const p1 = viewport.worldToScreen(w1.age, w1.time);
        const p2 = viewport.worldToScreen(w2.age, w2.time);
        
        const proj = projectPointToSegment(mouseX, mouseY, p1.x, p1.y, p2.x, p2.y);
        if (proj.dist < minDist) {
            minDist = proj.dist;
            const interp = interpolateWorldCoordinates(
                { age: w1.age, time: w1.time },
                { age: w2.age, time: w2.time },
                proj.t
            );
            nearest = { age: interp.age, time: interp.time };
        }
    }

    viewport._interaction.hoverWorldPos = nearest;
    viewport.nodeRenderer.renderGhostNode(nearest);
}

/**
 * Handles clicking a ghost node (Insertion).
 */
export async function handleGhostNodeClick(viewport) {
    if (!viewport._interaction.hoverWorldPos) return;
    const pos = viewport._interaction.hoverWorldPos;
    const { openEventDialog } = await import('../../../lifeline/services/ui/event-dialog/open-event-dialog.js');
    await openEventDialog(viewport.actor.sheet, { mode: 'insert', ageRaw: pos.age, timeRaw: pos.time });
}
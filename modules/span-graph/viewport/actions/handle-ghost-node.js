import { flattenEvents } from '../../../span-graph-data-processor.js';
import { getTemporalState } from '../../../temporal-engine/get-temporal-state.js';

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
        
        const proj = getProjectionOnSegment({x: mouseX, y: mouseY}, p1, p2);
        if (proj.dist < minDist) {
            minDist = proj.dist;
            nearest = {
                age: w1.age + proj.t * (w2.age - w1.age),
                time: w1.time + proj.t * (w2.time - w1.time)
            };
        }
    }

    viewport._interaction.hoverWorldPos = nearest;
    viewport.nodeRenderer.renderGhostNode(nearest);
}

/**
 * Helper: Project point onto line segment.
 */
function getProjectionOnSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return { dist: Math.hypot(p.x - v.x, p.y - v.y), t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return { dist: Math.hypot(p.x - proj.x, p.y - proj.y), t: t };
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

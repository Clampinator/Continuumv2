/**
 * ENGINE COMMAND: FULFILL YET
 * Closes a spacetime loop by inserting a permanent history event at the
 * NOW position and marking the Yet as done. All domain decisions (record
 * structure, era resolution, ordering) live here - the UI only passes
 * the yetId and the NOW node position.
 *
 * Accepts nowNode in two shapes:
 *   span-graph: { x, y, eraId, expId }
 *   legacy:      { age, time, eraId, expId }
 * Normalizes internally via ?? so callers never need to convert.
 */
import { insertHistoryRow } from '/systems/continuum-v2/modules/state/insert-history-row.js';
import { markYetFulfilled } from '/systems/continuum-v2/modules/state/mark-yet-fulfilled.js';
import { pushSnapshot } from '/systems/continuum-v2/modules/lifeline/undo-manager.js';

/**
 * Fulfills a Yet: inserts a permanent history row at the NOW position
 * and marks the Yet as done. The dual-write is atomic for undo because
 * pushSnapshot captures state before both writes.
 *
 * @param {Actor} actor - The Foundry actor
 * @param {string} yetId - The ID of the Yet to fulfill
 * @param {Object} nowNode - NOW node position. Accepts {x,y,eraId,expId}
 *   (span-graph) or {age,time,eraId,expId} (legacy lifeline).
 * @returns {Promise<void>}
 */
export async function fulfillYetCommand(actor, yetId, nowNode) {
    const yetData = actor.system.theYet?.[yetId];
    if (!yetData) {
        console.warn('Continuum | Yet fulfillment failed: Yet not found', yetId);
        return;
    }

    if (!nowNode) {
        console.warn('Continuum | Yet fulfillment failed: no NOW node');
        return;
    }

    // Normalize span-graph {x} vs legacy {age} coordinate shapes
    const eventAge = nowNode.x ?? nowNode.age;

    // Derive era/exp context from the NOW node, with safe fallbacks
    const targetEraId = nowNode.eraId || Object.keys(actor.system.eras || {})[0];
    const targetExpId = nowNode.expId || null;

    const record = {
        eventTitle: `Fulfillment: ${yetData.description || 'Yet event'}`,
        eventNotes: 'Closed the spacetime loop by fulfilling the Yet.',
        eventAge,
        eventIsSpan: false,
        eraId: targetEraId,
        expId: targetExpId,
        isYetFulfillment: true
    };

    // Capture state before the dual write (history row + yet done flag)
    // so the entire fulfillment can be undone as one operation
    pushSnapshot(actor);

    await insertHistoryRow(actor, record);
    await markYetFulfilled(actor, yetId);

    ui.notifications.info(
        `Loop Closed: "${yetData.description || 'Yet event'}" fulfilled.`
    );
}